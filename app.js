// app.js — movido: Visualizar/Imprimir para cada orçamento; adicionada exportação Word e PDF por orçamento
const STORE_KEY = "simple_quotes_v2";

function uid(){ return Math.random().toString(36).slice(2,9); }
const money = v => Number(v||0).toFixed(2);

function loadStore(){
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw){
    const seed = { issuers: [], clients: [], quotes: [], nextQuoteNumber: 1 };
    localStorage.setItem(STORE_KEY, JSON.stringify(seed));
    return seed;
  }
  const s = JSON.parse(raw);
  if (!s.nextQuoteNumber) {
    s.nextQuoteNumber = computeNextQuoteNumberFromQuotes(s.quotes || []);
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }
  // ensure arrays exist (defensive)
  s.issuers = s.issuers || [];
  s.clients = s.clients || [];
  s.quotes = s.quotes || [];
  return s;
}
function saveStore(s){ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

function computeNextQuoteNumberFromQuotes(quotes){
  if (!quotes || !quotes.length) return 1;
  let max = 0;
  for (const q of quotes){
    if (!q.numero) continue;
    const m = String(q.numero).match(/(\d+)(?!.*\d)/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}
function formatQuoteNumber(n){
  const year = new Date().getFullYear();
  return `${year}-${String(n).padStart(4,'0')}`;
}

let store = loadStore();

// DOM refs
const issuerForm = document.getElementById("issuerForm");
const issuerList = document.getElementById("issuerList");
const issuerName = document.getElementById("issuerName");
const issuerCnpjCpf = document.getElementById("issuerCnpjCpf");
const issuerAddress = document.getElementById("issuerAddress");
const issuerPhone = document.getElementById("issuerPhone");
const issuerSubmitBtn = document.getElementById("issuerSubmitBtn");
const issuerCancelBtn = document.getElementById("issuerCancelBtn");

const clientForm = document.getElementById("clientForm");
const clientList = document.getElementById("clientList");
const clientName = document.getElementById("clientName");
const clientCnpjCpf = document.getElementById("clientCnpjCpf");
const clientAddress = document.getElementById("clientAddress");
const clientPhone = document.getElementById("clientPhone");
const clientSubmitBtn = document.getElementById("clientSubmitBtn");
const clientCancelBtn = document.getElementById("clientCancelBtn");

const selectIssuer = document.getElementById("selectIssuer");
const selectClient = document.getElementById("selectClient");
const quoteNumber = document.getElementById("quoteNumber");
const quoteDate = document.getElementById("quoteDate");   // auto-filled date
const notes = document.getElementById("notes");           // observações

const itemsBody = document.getElementById("itemsBody");
const addItemBtn = document.getElementById("addItemBtn");
const subtotalEl = document.getElementById("subtotal");
const grandTotalEl = document.getElementById("grandTotal");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const quotesList = document.getElementById("quotesList");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportDocBtn = document.getElementById("exportDocBtn");

const previewModal = document.getElementById("previewModal");
const previewArea = document.getElementById("previewArea");
const closePreview = document.getElementById("closePreview");
const printBtn = document.getElementById("printBtn");

let currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
let editingQuoteId = null;
let editingIssuerId = null;
let editingClientId = null;
let lastPreviewHtml = "";

// --- Auto-fill helpers for Quotes (number + date) ---
function formatDateISOtoLocal(iso){
  if (!iso) return "";
  return new Date(iso).toLocaleDateString('pt-BR');
}

function setDefaultQuoteFields(){
  if (!quoteNumber || !quoteDate) return;
  if (editingQuoteId) return; // don't overwrite when editing

  const next = store.nextQuoteNumber || computeNextQuoteNumberFromQuotes(store.quotes || []);
  quoteNumber.value = formatQuoteNumber(next);
  quoteDate.value = new Date().toLocaleDateString('pt-BR');
  if (notes) notes.value = "";
}

// render lists
function renderIssuers(){
  if (!selectIssuer) return;
  // issuerList is optional in UI; if present, keep it updated
  if (issuerList) issuerList.innerHTML = "";
  selectIssuer.innerHTML = "<option value=''>-- selecione --</option>";
  (store.issuers || []).forEach(i=>{
    if (issuerList) {
      const li = document.createElement("li");
      li.innerHTML = `<div>
        <strong>${escapeHtml(i.name)}</strong>
        <div class="meta">${escapeHtml(i.cnpjCpf||'')} ${i.phone ? '• ' + escapeHtml(i.phone) : ''}</div>
        <div class="meta">${escapeHtml(i.address||'')}</div>
      </div>
      <div>
        <button class="edit-issuer" data-id="${i.id}">Editar</button>
        <button class="del-issuer" data-id="${i.id}">Excluir</button>
      </div>`;
      issuerList.appendChild(li);
    }

    const opt = document.createElement("option");
    opt.value = i.id; opt.textContent = `${i.name} — ${i.cnpjCpf||""}`;
    selectIssuer.appendChild(opt);
  });
}

function renderClients(){
  if (!selectClient) return;
  if (clientList) clientList.innerHTML = "";
  selectClient.innerHTML = "<option value=''>-- selecione --</option>";
  (store.clients || []).forEach(c=>{
    if (clientList) {
      const li = document.createElement("li");
      li.innerHTML = `<div>
        <strong>${escapeHtml(c.name)}</strong>
        <div class="meta">${escapeHtml(c.cnpjCpf||'')} ${c.phone ? '• ' + escapeHtml(c.phone) : ''}</div>
        <div class="meta">${escapeHtml(c.address||'')}</div>
      </div>
      <div>
        <button class="edit-client" data-id="${c.id}">Editar</button>
        <button class="del-client" data-id="${c.id}">Excluir</button>
      </div>`;
      clientList.appendChild(li);
    }

    const opt = document.createElement("option");
    opt.value = c.id; opt.textContent = `${c.name} — ${c.cnpjCpf||""}`;
    selectClient.appendChild(opt);
  });
}

function renderQuotes(){
  if (!quotesList) return;
  quotesList.innerHTML = "";
  if (!store.quotes.length) { quotesList.innerHTML = "<li>Nenhum orçamento salvo</li>"; return; }
  store.quotes.slice().reverse().forEach(q=>{
    const issuer = store.issuers.find(i=>i.id===q.issuerId) || {};
    const client = store.clients.find(c=>c.id===q.clientId) || {};
    const li = document.createElement("li");
    li.innerHTML = `<div style="max-width:70%">
        <strong>Orçamento ${escapeHtml(q.numero||q.id)}</strong>
        <div style="color:var(--muted);font-size:13px">${escapeHtml(issuer.name||'—')} → ${escapeHtml(client.name||'—')} • ${new Date(q.createdAt).toLocaleDateString()}</div>
      </div>
      <div class="quote-actions">
        <button class="view-quote" data-id="${q.id}">Visualizar / Imprimir</button>
        <button class="export-quote" data-id="${q.id}">Exportar Word</button>
        <button class="export-pdf" data-id="${q.id}">Exportar PDF</button>
        <button class="edit-quote" data-id="${q.id}">Editar</button>
        <button class="del-quote" data-id="${q.id}">Excluir</button>
      </div>`;
    quotesList.appendChild(li);
  });
  attachQuoteListListeners();
}

function renderItems(items=[]){
  if (!itemsBody) return;
  itemsBody.innerHTML = "";
  items.forEach((it, idx)=>{
    const tr = document.createElement("tr");
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td><input data-idx="${idx}" data-field="descricao" value="${escapeHtml(it.descricao||'')}" placeholder="Descrição do item" /></td>
      <td><input data-idx="${idx}" data-field="quantidade" type="number" min="0" step="1" value="${it.quantidade||1}" /></td>
      <td><input data-idx="${idx}" data-field="valorUnitario" type="number" min="0" step="0.01" value="${it.valorUnitario||0}" /></td>
      <td class="item-total">R$ ${money((it.quantidade||1)*(it.valorUnitario||0))}</td>
      <td><button class="del-item" data-idx="${idx}">x</button></td>
    `;
    itemsBody.appendChild(tr);

    const inputs = tr.querySelectorAll("input");
    inputs.forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx = +e.target.dataset.idx;
        const field = e.target.dataset.field;
        let val = e.target.value;
        if (["quantidade","valorUnitario"].includes(field)) val = Number(val || 0);
        currentItems[idx][field] = val;

        const it = currentItems[idx];
        const total = (Number(it.quantidade||0) * Number(it.valorUnitario||0));
        const td = tr.querySelector(".item-total");
        if (td) td.textContent = `R$ ${money(total)}`;
        recalcTotals();
      });
    });

    const delBtn = tr.querySelector(".del-item");
    delBtn && delBtn.addEventListener("click", () => {
      currentItems.splice(idx, 1);
      if (!currentItems.length) currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
      renderItems(currentItems);
    });
  });

  recalcTotals();
}

function recalcTotals(){
  const subtotal = currentItems.reduce((s,it)=> s + (Number(it.quantidade||0) * Number(it.valorUnitario||0)), 0);
  const total = subtotal;
  if (subtotalEl) subtotalEl.textContent = money(subtotal);
  if (grandTotalEl) grandTotalEl.textContent = money(total);
  return {subtotal,total};
}

// ISSUER handler (robust)
if (issuerForm) {
  issuerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      console.log("[DEBUG] issuerForm submit fired");
      const name = (issuerName && issuerName.value || "").trim();
      const cnpjCpf = (issuerCnpjCpf && issuerCnpjCpf.value || "").trim();
      const address = (issuerAddress && issuerAddress.value || "").trim();
      const phone = (issuerPhone && issuerPhone.value || "").trim();
      console.log("[DEBUG] issuer values:", { name, cnpjCpf, address, phone });

      if (!name) {
        alert("Preencha a razão social");
        return;
      }

      // ensure arrays exist
      store.issuers = store.issuers || [];

      if (editingIssuerId) {
        const item = store.issuers.find(x => x.id === editingIssuerId);
        if (item) {
          item.name = name; item.cnpjCpf = cnpjCpf; item.address = address; item.phone = phone;
          saveStore(store);
          editingIssuerId = null;
          if (issuerSubmitBtn) issuerSubmitBtn.textContent = "Adicionar emissor";
          if (issuerCancelBtn) issuerCancelBtn.style.display = "none";
          issuerForm.reset();
          renderIssuers(); renderQuotes();
          console.log("[DEBUG] issuer updated");
          return;
        } else {
          console.warn("[WARN] editingIssuerId set but item not found:", editingIssuerId);
        }
      }

      // create new
      const newItem = { id: uid(), name, cnpjCpf, address, phone };
      store.issuers.push(newItem);
      saveStore(store);
      issuerForm.reset();
      renderIssuers(); renderQuotes();
      console.log("[DEBUG] issuer added", newItem);
    } catch (err) {
      console.error("[ERROR] issuerForm handler failed:", err);
      alert("Ocorreu um erro ao adicionar o emissor. Veja o console para detalhes.");
    }
  });
}

// CLIENT handler (robust)
if (clientForm) {
  clientForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      console.log("[DEBUG] clientForm submit fired");
      const name = (clientName && clientName.value || "").trim();
      const cnpjCpf = (clientCnpjCpf && clientCnpjCpf.value || "").trim();
      const address = (clientAddress && clientAddress.value || "").trim();
      const phone = (clientPhone && clientPhone.value || "").trim();
      console.log("[DEBUG] client values:", { name, cnpjCpf, address, phone });

      if (!name) {
        alert("Preencha o nome do cliente");
        return;
      }

      store.clients = store.clients || [];

      if (editingClientId) {
        const item = store.clients.find(x => x.id === editingClientId);
        if (item) {
          item.name = name; item.cnpjCpf = cnpjCpf; item.address = address; item.phone = phone;
          saveStore(store);
          editingClientId = null;
          if (clientSubmitBtn) clientSubmitBtn.textContent = "Adicionar cliente";
          if (clientCancelBtn) clientCancelBtn.style.display = "none";
          clientForm.reset();
          renderClients(); renderQuotes(); 
          console.log("[DEBUG] client updated");
          return;
        } else {
          console.warn("[WARN] editingClientId set but item not found:", editingClientId);
        }
      }

      const newItem = { id: uid(), name, cnpjCpf, address, phone };
      store.clients.push(newItem);
      saveStore(store);
      clientForm.reset();
      renderClients(); renderQuotes();
      console.log("[DEBUG] client added", newItem);
    } catch (err) {
      console.error("[ERROR] clientForm handler failed:", err);
      alert("Ocorreu um erro ao adicionar o cliente. Veja o console para detalhes.");
    }
  });
}

// lists: edit/delete handlers (issuer)
if (issuerList) {
  issuerList.addEventListener("click", (e) => {
    try {
      if (e.target.classList.contains("del-issuer")) {
        const id = e.target.dataset.id;
        if (!confirm("Excluir emissor?")) return;
        store.issuers = store.issuers.filter(x => x.id !== id);
        saveStore(store); renderIssuers(); renderQuotes(); renderClients();
      } else if (e.target.classList.contains("edit-issuer")) {
        const id = e.target.dataset.id;
        const it = store.issuers.find(x => x.id === id);
        if (!it) return;
        editingIssuerId = id;
        if (issuerName) issuerName.value = it.name || "";
        if (issuerCnpjCpf) issuerCnpjCpf.value = it.cnpjCpf || "";
        if (issuerAddress) issuerAddress.value = it.address || "";
        if (issuerPhone) issuerPhone.value = it.phone || "";
        if (issuerSubmitBtn) issuerSubmitBtn.textContent = "Atualizar emissor";
        if (issuerCancelBtn) issuerCancelBtn.style.display = "inline-block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("[ERROR] issuerList click handler:", err);
    }
  });
}

// lists: edit/delete handlers (client)
if (clientList) {
  clientList.addEventListener("click", (e) => {
    try {
      if (e.target.classList.contains("del-client")) {
        const id = e.target.dataset.id;
        if (!confirm("Excluir cliente?")) return;
        store.clients = store.clients.filter(x => x.id !== id);
        saveStore(store); renderClients(); renderQuotes(); renderIssuers();
      } else if (e.target.classList.contains("edit-client")) {
        const id = e.target.dataset.id;
        const it = store.clients.find(x => x.id === id);
        if (!it) return;
        editingClientId = id;
        if (clientName) clientName.value = it.name || "";
        if (clientCnpjCpf) clientCnpjCpf.value = it.cnpjCpf || "";
        if (clientAddress) clientAddress.value = it.address || "";
        if (clientPhone) clientPhone.value = it.phone || "";
        if (clientSubmitBtn) clientSubmitBtn.textContent = "Atualizar cliente";
        if (clientCancelBtn) clientCancelBtn.style.display = "inline-block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("[ERROR] clientList click handler:", err);
    }
  });
}

if (issuerCancelBtn) {
  issuerCancelBtn.addEventListener("click", () => {
    editingIssuerId = null; issuerForm && issuerForm.reset();
    if (issuerSubmitBtn) issuerSubmitBtn.textContent = "Adicionar emissor";
    issuerCancelBtn.style.display = "none";
  });
}
if (clientCancelBtn) {
  clientCancelBtn.addEventListener("click", () => {
    editingClientId = null; clientForm && clientForm.reset();
    if (clientSubmitBtn) clientSubmitBtn.textContent = "Adicionar cliente";
    clientCancelBtn.style.display = "none";
  });
}

// add item
if (addItemBtn) {
  addItemBtn.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      currentItems.push({descricao:"",quantidade:1,valorUnitario:0});
      renderItems(currentItems);
      setTimeout(() => {
        const lastIdx = currentItems.length - 1;
        const newInput = itemsBody.querySelector(`input[data-idx="${lastIdx}"][data-field="descricao"]`);
        if (newInput) newInput.focus();
      }, 0);
    } catch (err) {
      console.error("[ERROR] addItemBtn handler:", err);
    }
  });
}

// helper: check duplicate numero for same issuer
function existsSameNumberForIssuer(numero, issuerId, excludeQuoteId = null){
  if (!numero) return false;
  return (store.quotes || []).some(q => q.numero === numero && q.issuerId === issuerId && q.id !== excludeQuoteId);
}

// save/update quote
if (saveQuoteBtn) {
  saveQuoteBtn.addEventListener("click", ()=>{
    try {
      const issuerId = selectIssuer && selectIssuer.value;
      const clientId = selectClient && selectClient.value;
      if (!issuerId || !clientId) return alert("Selecione emissor e cliente.");
      const totals = recalcTotals();

      let numeroValue = (quoteNumber && quoteNumber.value || "").trim();
      let generatedNumber = false;
      if (!numeroValue) {
        numeroValue = formatQuoteNumber(store.nextQuoteNumber || computeNextQuoteNumberFromQuotes(store.quotes));
        generatedNumber = true;
      }

      // VALIDATION: block only when same numero AND same issuer
      if (editingQuoteId) {
        if (existsSameNumberForIssuer(numeroValue, issuerId, editingQuoteId)) {
          return alert("Já existe um orçamento com esse número para o mesmo emissor. Escolha outro número ou altere o emissor.");
        }
      } else {
        if (existsSameNumberForIssuer(numeroValue, issuerId, null)) {
          return alert("Já existe um orçamento com esse número para o mesmo emissor. Escolha outro número ou altere o emissor.");
        }
      }

      const notesVal = (notes && notes.value || "").trim();

      if (editingQuoteId) {
        const q = store.quotes.find(x => x.id === editingQuoteId);
        if (!q) return alert("Orçamento não encontrado para atualizar.");
        q.issuerId = issuerId;
        q.clientId = clientId;
        q.numero = numeroValue || null;
        q.items = JSON.parse(JSON.stringify(currentItems));
        q.subtotal = totals.subtotal;
        q.total = totals.total;
        q.notes = notesVal;
        q.updatedAt = new Date().toISOString();
        saveStore(store);
        alert(`Orçamento atualizado! Nº: ${q.numero}`);
        endEditMode();
        renderQuotes();
        currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
        renderItems(currentItems);
        return;
      }

      const q = {
        id: uid(),
        issuerId, clientId,
        numero: numeroValue || null,
        items: JSON.parse(JSON.stringify(currentItems)),
        subtotal: totals.subtotal, total: totals.total,
        notes: notesVal,
        createdAt: new Date().toISOString()
      };
      store.quotes.push(q);
      if (generatedNumber) store.nextQuoteNumber = (store.nextQuoteNumber || 1) + 1;
      saveStore(store);
      currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
      // reset form items
      renderItems(currentItems); renderQuotes();
      // set defaults for next quote
      setDefaultQuoteFields();
      alert(`Orçamento salvo! Nº: ${q.numero}`);
    } catch (err) {
      console.error("[ERROR] saveQuoteBtn handler:", err);
      alert("Ocorreu um erro ao salvar o orçamento. Veja o console para detalhes.");
    }
  });
}

// edit / end edit
function startEditMode(quoteId) {
  const q = store.quotes.find(x => x.id === quoteId);
  if (!q) return alert("Orçamento não encontrado.");
  editingQuoteId = quoteId;
  if (selectIssuer) selectIssuer.value = q.issuerId || "";
  if (selectClient) selectClient.value = q.clientId || "";
  if (quoteNumber) quoteNumber.value = q.numero || "";
  // show the quote date for editing (from createdAt)
  if (quoteDate) quoteDate.value = formatDateISOtoLocal(q.createdAt || q.updatedAt || new Date().toISOString());
  if (notes) notes.value = q.notes || "";
  currentItems = JSON.parse(JSON.stringify(q.items || [{descricao:"",quantidade:1,valorUnitario:0}]));
  renderItems(currentItems);
  if (saveQuoteBtn) saveQuoteBtn.textContent = "Atualizar Orçamento";
  if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
  window.scrollTo({ top: 200, behavior: 'smooth' });
}
function endEditMode() {
  editingQuoteId = null;
  if (saveQuoteBtn) saveQuoteBtn.textContent = "Salvar Orçamento";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  // restore defaults for new quote
  setDefaultQuoteFields();
  if (notes) notes.value = "";
}
if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    if (!confirm("Cancelar edição e limpar formulário?")) return;
    endEditMode();
    currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
    renderItems(currentItems);
  });
}

// preview / print now per-quote (openPreview called from quote list)
function openPreview(id){
  const q = store.quotes.find(x=>x.id===id); if (!q) return alert("Orçamento não encontrado");
  const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
  const client = store.clients.find(c=>c.id===q.clientId)||{};
  const html = renderQuoteHtml(q, issuer, client);
  previewArea && (previewArea.innerHTML = html);
  lastPreviewHtml = html;
  previewModal && previewModal.classList.remove("hidden");
}
if (closePreview) closePreview.addEventListener("click", ()=> previewModal && previewModal.classList.add("hidden"));
if (printBtn) printBtn.addEventListener("click", ()=>{
  try {
    const content = previewArea ? previewArea.innerHTML : "";
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Orçamento</title><style>
      body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#f7f7f7}
      .signature{margin-top:200px;display:flex;flex-direction:column;align-items:center;gap:6px}
      .signature .sig-line{width:60%;border-top:2px solid #000;height:0}
      .signature .sig-name{font-weight:600;font-size:0.95rem;color:#222}
      .print-footer{margin-top:18px;font-size:0.85rem;color:#666;position:fixed;left:20px;bottom:18px}
      </style></head><body>${content}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(), 300);
  } catch (err) {
    console.error("[ERROR] printBtn handler:", err);
    alert("Erro ao imprimir. Veja o console para detalhes.");
  }
});

// export CSV (all quotes)
if (exportCsvBtn) exportCsvBtn.addEventListener("click", ()=>{
  try {
    if (!store.quotes.length) return alert("Nenhum orçamento salvo para exportar.");
    const rows = [];
    const header = ["numero","issuer_name","issuer_cnpjcpf","client_name","client_cnpjcpf","created_at","subtotal","total","items_json","notes"];
    rows.push(header.join(","));
    store.quotes.forEach(q => {
      const issuer = store.issuers.find(i=>i.id===q.issuerId) || {};
      const client = store.clients.find(c=>c.id===q.clientId) || {};
      const itemsJson = JSON.stringify(q.items || []);
      const row = [
        `"${(q.numero||"")}"`,
        `"${(issuer.name||"")}"`,
        `"${(issuer.cnpjCpf||"")}"`,
        `"${(client.name||"")}"`,
        `"${(client.cnpjCpf||"")}"`,
        `"${(q.createdAt||"")}"`,
        `"${money(q.subtotal||0)}"`,
        `"${money(q.total||0)}"`,
        `"${itemsJson.replace(/"/g,'""')}"`,
        `"${(q.notes||"").replace(/"/g,'""')}"`
      ];
      rows.push(row.join(","));
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orcamentos.csv'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[ERROR] exportCsvBtn handler:", err);
    alert("Erro ao exportar CSV. Veja o console para detalhes.");
  }
});

// export Word: exports current preview (keeps existing button behavior)
if (exportDocBtn) exportDocBtn.addEventListener("click", ()=>{
  try {
    if (!lastPreviewHtml) return alert("Abra um orçamento (Visualizar / Imprimir) primeiro para exportar para Word.");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento</title></head><body>${lastPreviewHtml}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orcamento.doc'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[ERROR] exportDocBtn handler:", err);
    alert("Erro ao exportar Word. Veja o console para detalhes.");
  }
});

// export a specific quote to Word (called from list)
function exportQuoteDoc(quoteId){
  try {
    const q = store.quotes.find(x=>x.id===quoteId); if (!q) return alert("Orçamento não encontrado");
    const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
    const client = store.clients.find(c=>c.id===q.clientId)||{};
    const html = renderQuoteHtml(q, issuer, client);
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento</title></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `orcamento-${q.numero || q.id}.doc`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[ERROR] exportQuoteDoc:", err);
    alert("Erro ao exportar o documento. Veja o console para detalhes.");
  }
}

// export a specific quote to PDF (opens preview in new window and triggers print)
function exportQuotePdf(quoteId){
  try {
    const q = store.quotes.find(x=>x.id===quoteId); if (!q) return alert("Orçamento não encontrado");
    const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
    const client = store.clients.find(c=>c.id===q.clientId)||{};
    const html = renderQuoteHtml(q, issuer, client);
    const w = window.open("", "_blank");
    w.document.write(`<html><head><meta charset="utf-8"><title>Orçamento</title><style>
      body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#f7f7f7}
      .signature{margin-top:200px;display:flex;flex-direction:column;align-items:center;gap:6px}
      .signature .sig-line{width:60%;border-top:2px solid #000;height:0}
      .signature .sig-name{font-weight:600;font-size:0.95rem;color:#222}
      .print-footer{margin-top:18px;font-size:0.85rem;color:#666;position:fixed;left:20px;bottom:18px}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(()=> {
      w.print();
    }, 300);
  } catch (err) {
    console.error("[ERROR] exportQuotePdf:", err);
    alert("Erro ao exportar PDF. Veja o console para detalhes.");
  }
}

// quote HTML (preview)
function renderQuoteHtml(q, issuer, client){
  const dateOnly = new Date(q.createdAt).toLocaleDateString('pt-BR');
  const issuerContact = `${issuer.address ? escapeHtml(issuer.address) + '<br/>' : ''}${issuer.phone ? 'Tel: ' + escapeHtml(issuer.phone) : ''}`;
  const clientContact = `${client.address ? escapeHtml(client.address) + '<br/>' : ''}${client.phone ? 'Tel: ' + escapeHtml(client.phone) : ''}`;

  return `
    <div style="max-width:800px;margin:0 auto;min-height:1120px">
      <h2>Orçamento ${escapeHtml(q.numero || q.id)}</h2>
      <div style="display:flex;justify-content:space-between;gap:20px">
        <div>
          <strong>${escapeHtml(issuer.name||'')}</strong><br/>
          ${issuer.cnpjCpf? 'CNPJ/CPF: ' + escapeHtml(issuer.cnpjCpf) + '<br/>':''}
          <div style="font-size:0.95rem;color:#444;margin-top:6px">${issuerContact}</div>
        </div>
        <div style="text-align:right">
          <strong>Destinatário</strong><br/>
          ${escapeHtml(client.name||'')}<br/>
          ${client.cnpjCpf? 'CNPJ/CPF: ' + escapeHtml(client.cnpjCpf) + '<br/>':''}
          <div style="font-size:0.95rem;color:#444;margin-top:6px">${clientContact}</div>
        </div>
      </div>
      <hr/>
      <table>
        <thead><tr><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
        <tbody>
          ${q.items.map(it=>`<tr>
            <td>${escapeHtml(it.descricao||'')}</td>
            <td style="text-align:right">${it.quantidade}</td>
            <td style="text-align:right">R$ ${money(it.valorUnitario)}</td>
            <td style="text-align:right">R$ ${money((it.quantidade||0)*(it.valorUnitario||0))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <hr/>
      <div style="text-align:right">
        <div>Subtotal: R$ ${money(q.subtotal)}</div>
        <div style="font-weight:700;font-size:1.1em">Total: R$ ${money(q.total)}</div>
      </div>

      ${q.notes ? `<div style="margin-top:18px;"><strong>Observações:</strong><div style="margin-top:6px">${escapeHtml(q.notes)}</div></div>` : ''}

      <div class="signature" style="margin-top:200px;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div class="sig-line" style="width:60%;border-top:2px solid #000;height:0"></div>
        <div class="sig-name" style="font-weight:600;font-size:0.95rem;color:#222">${escapeHtml(issuer.name || '')}</div>
      </div>

      <div class="print-footer" style="margin-top:18px;font-size:0.85rem;color:#666;position:fixed;left:20px;bottom:20px">Gerado em: ${escapeHtml(dateOnly)}</div>
    </div>
  `;
}

// attach quote list listeners (view/export/edit/delete)
function attachQuoteListListeners(){
  if (!quotesList) return;
  quotesList.querySelectorAll(".view-quote").forEach(btn=>{
    btn.addEventListener("click",(e)=> openPreview(e.target.dataset.id));
  });
  quotesList.querySelectorAll(".export-quote").forEach(btn=>{
    btn.addEventListener("click",(e)=> exportQuoteDoc(e.target.dataset.id));
  });
  quotesList.querySelectorAll(".export-pdf").forEach(btn=>{
    btn.addEventListener("click",(e)=> exportQuotePdf(e.target.dataset.id));
  });
  quotesList.querySelectorAll(".edit-quote").forEach(btn=>{
    btn.addEventListener("click",(e)=> startEditMode(e.target.dataset.id) );
  });
  quotesList.querySelectorAll(".del-quote").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const id = e.target.dataset.id;
      if (!confirm("Excluir orçamento?")) return;
      store.quotes = store.quotes.filter(q=>q.id!==id); saveStore(store); renderQuotes();
    });
  });
}

// initial render
function renderAll(){ renderIssuers(); renderClients(); renderQuotes(); renderItems(currentItems); }
renderAll();
setDefaultQuoteFields();

function escapeHtml(str){
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}