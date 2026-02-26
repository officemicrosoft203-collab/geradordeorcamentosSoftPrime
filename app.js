// app.js — Ajustado: permite duplicação de número se o emissor for diferente
// Mantém edição de orçamentos, edição de emissor/cliente, export CSV/DOC, assinatura e rodapé
const STORE_KEY = "simple_quotes_v2";

function uid(){ return Math.random().toString(36).slice(2,9); }
const money = v => Number(v||0).toFixed(2);

// ---------- store ----------
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

// ---------- initial ----------
let store = loadStore();

// ---------- DOM refs ----------
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

const itemsBody = document.getElementById("itemsBody");
const addItemBtn = document.getElementById("addItemBtn");
const subtotalEl = document.getElementById("subtotal");
const grandTotalEl = document.getElementById("grandTotal");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");
const previewBtn = document.getElementById("previewBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const quotesList = document.getElementById("quotesList");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportDocBtn = document.getElementById("exportDocBtn");

const previewModal = document.getElementById("previewModal");
const previewArea = document.getElementById("previewArea");
const closePreview = document.getElementById("closePreview");
const printBtn = document.getElementById("printBtn");

// ---------- state ----------
let currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
let editingQuoteId = null;
let editingIssuerId = null;
let editingClientId = null;
let lastPreviewHtml = "";

// ---------- render lists ----------
function renderIssuers(){
  if (!issuerList || !selectIssuer) return;
  issuerList.innerHTML = "";
  selectIssuer.innerHTML = "<option value=''>-- selecione --</option>";
  store.issuers.forEach(i=>{
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

    const opt = document.createElement("option");
    opt.value = i.id; opt.textContent = `${i.name} — ${i.cnpjCpf||""}`;
    selectIssuer.appendChild(opt);
  });
}

function renderClients(){
  if (!clientList || !selectClient) return;
  clientList.innerHTML = "";
  selectClient.innerHTML = "<option value=''>-- selecione --</option>";
  store.clients.forEach(c=>{
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
        <button class="view-quote" data-id="${q.id}">Abrir</button>
        <button class="edit-quote" data-id="${q.id}">Editar</button>
        <button class="del-quote" data-id="${q.id}">Excluir</button>
      </div>`;
    quotesList.appendChild(li);
  });
  attachQuoteListListeners();
}

// ---------- items rendering ----------
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

    // per-row listeners
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

// ---------- Issuer / Client submit (create or update) ----------
issuerForm && issuerForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const name = (issuerName && issuerName.value || "").trim();
  const cnpjCpf = (issuerCnpjCpf && issuerCnpjCpf.value || "").trim();
  const address = (issuerAddress && issuerAddress.value || "").trim();
  const phone = (issuerPhone && issuerPhone.value || "").trim();
  if (!name) return alert("Preencha a razão social");

  if (editingIssuerId) {
    const item = store.issuers.find(x => x.id === editingIssuerId);
    if (item) {
      item.name = name; item.cnpjCpf = cnpjCpf; item.address = address; item.phone = phone;
      saveStore(store);
      editingIssuerId = null;
      issuerSubmitBtn.textContent = "Adicionar emissor";
      issuerCancelBtn.style.display = "none";
      issuerForm.reset();
      renderIssuers(); renderQuotes(); return;
    }
  }

  store.issuers.push({id:uid(), name, cnpjCpf, address, phone});
  saveStore(store);
  issuerForm.reset();
  renderIssuers(); renderQuotes();
});

clientForm && clientForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const name = (clientName && clientName.value || "").trim();
  const cnpjCpf = (clientCnpjCpf && clientCnpjCpf.value || "").trim();
  const address = (clientAddress && clientAddress.value || "").trim();
  const phone = (clientPhone && clientPhone.value || "").trim();
  if (!name) return alert("Preencha o nome do cliente");

  if (editingClientId) {
    const item = store.clients.find(x => x.id === editingClientId);
    if (item) {
      item.name = name; item.cnpjCpf = cnpjCpf; item.address = address; item.phone = phone;
      saveStore(store);
      editingClientId = null;
      clientSubmitBtn.textContent = "Adicionar cliente";
      clientCancelBtn.style.display = "none";
      clientForm.reset();
      renderClients(); renderQuotes(); return;
    }
  }

  store.clients.push({id:uid(), name, cnpjCpf, address, phone});
  saveStore(store);
  clientForm.reset();
  renderClients(); renderQuotes();
});

// ---------- lists: edit/delete handlers ----------
issuerList && issuerList.addEventListener("click", (e) => {
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
    issuerName.value = it.name || "";
    issuerCnpjCpf.value = it.cnpjCpf || "";
    issuerAddress.value = it.address || "";
    issuerPhone.value = it.phone || "";
    issuerSubmitBtn.textContent = "Atualizar emissor";
    issuerCancelBtn.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

clientList && clientList.addEventListener("click", (e) => {
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
    clientName.value = it.name || "";
    clientCnpjCpf.value = it.cnpjCpf || "";
    clientAddress.value = it.address || "";
    clientPhone.value = it.phone || "";
    clientSubmitBtn.textContent = "Atualizar cliente";
    clientCancelBtn.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// cancel issuer/client edit
issuerCancelBtn && issuerCancelBtn.addEventListener("click", () => {
  editingIssuerId = null; issuerForm.reset();
  issuerSubmitBtn.textContent = "Adicionar emissor";
  issuerCancelBtn.style.display = "none";
});
clientCancelBtn && clientCancelBtn.addEventListener("click", () => {
  editingClientId = null; clientForm.reset();
  clientSubmitBtn.textContent = "Adicionar cliente";
  clientCancelBtn.style.display = "none";
});

// ---------- ADD ITEM ----------
if (addItemBtn) {
  addItemBtn.addEventListener("click", (e) => {
    e.preventDefault();
    currentItems.push({descricao:"",quantidade:1,valorUnitario:0});
    renderItems(currentItems);
    setTimeout(() => {
      const lastIdx = currentItems.length - 1;
      const newInput = itemsBody.querySelector(`input[data-idx="${lastIdx}"][data-field="descricao"]`);
      if (newInput) newInput.focus();
    }, 0);
  });
}

// ---------- helper: check duplicate numero for same issuer ----------
function existsSameNumberForIssuer(numero, issuerId, excludeQuoteId = null){
  if (!numero) return false;
  return store.quotes.some(q => q.numero === numero && q.issuerId === issuerId && q.id !== excludeQuoteId);
}

// ---------- create/update quote ----------
saveQuoteBtn && saveQuoteBtn.addEventListener("click", ()=>{
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
    // updating: if another quote (different id) has same numero + same issuer -> block
    if (existsSameNumberForIssuer(numeroValue, issuerId, editingQuoteId)) {
      return alert("Já existe um orçamento com esse número para o mesmo emissor. Escolha outro número ou altere o emissor.");
    }
  } else {
    // creating: if any existing quote has same numero + same issuer -> block
    if (existsSameNumberForIssuer(numeroValue, issuerId, null)) {
      return alert("Já existe um orçamento com esse número para o mesmo emissor. Escolha outro número ou altere o emissor.");
    }
  }

  if (editingQuoteId) {
    const q = store.quotes.find(x => x.id === editingQuoteId);
    if (!q) return alert("Orçamento não encontrado para atualizar.");
    q.issuerId = issuerId;
    q.clientId = clientId;
    q.numero = numeroValue || null;
    q.items = JSON.parse(JSON.stringify(currentItems));
    q.subtotal = totals.subtotal;
    q.total = totals.total;
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
    createdAt: new Date().toISOString()
  };
  store.quotes.push(q);
  if (generatedNumber) store.nextQuoteNumber = (store.nextQuoteNumber || 1) + 1;
  saveStore(store);
  currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
  if (quoteNumber) quoteNumber.value = "";
  renderItems(currentItems); renderQuotes();
  alert(`Orçamento salvo! Nº: ${q.numero}`);
});

// editing helpers for quotes
function startEditMode(quoteId) {
  const q = store.quotes.find(x => x.id === quoteId);
  if (!q) return alert("Orçamento não encontrado.");
  editingQuoteId = quoteId;
  selectIssuer.value = q.issuerId || "";
  selectClient.value = q.clientId || "";
  quoteNumber.value = q.numero || "";
  currentItems = JSON.parse(JSON.stringify(q.items || [{descricao:"",quantidade:1,valorUnitario:0}]));
  renderItems(currentItems);
  saveQuoteBtn.textContent = "Atualizar Orçamento";
  cancelEditBtn.style.display = "inline-block";
  window.scrollTo({ top: 200, behavior: 'smooth' });
}
function endEditMode() {
  editingQuoteId = null;
  saveQuoteBtn.textContent = "Salvar Orçamento";
  cancelEditBtn.style.display = "none";
  quoteNumber && (quoteNumber.value = "");
}
cancelEditBtn && cancelEditBtn.addEventListener("click", (e)=>{
  e.preventDefault();
  if (!confirm("Cancelar edição e limpar formulário?")) return;
  endEditMode();
  currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
  renderItems(currentItems);
});

// ---------- preview / print ----------
previewBtn && previewBtn.addEventListener("click", ()=>{
  const last = store.quotes[store.quotes.length-1];
  if (!last) return alert("Nenhum orçamento salvo ainda. Salve primeiro.");
  openPreview(last.id);
});
function openPreview(id){
  const q = store.quotes.find(x=>x.id===id); if (!q) return alert("Orçamento não encontrado");
  const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
  const client = store.clients.find(c=>c.id===q.clientId)||{};
  const html = renderQuoteHtml(q, issuer, client);
  previewArea && (previewArea.innerHTML = html);
  lastPreviewHtml = html;
  previewModal && previewModal.classList.remove("hidden");
}
closePreview && closePreview.addEventListener("click", ()=> previewModal && previewModal.classList.add("hidden"));
printBtn && printBtn.addEventListener("click", ()=>{
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
});

// ---------- export CSV (Excel) - exports ALL quotes ----------
exportCsvBtn && exportCsvBtn.addEventListener("click", ()=>{
  if (!store.quotes.length) return alert("Nenhum orçamento salvo para exportar.");
  const rows = [];
  const header = ["numero","issuer_name","issuer_cnpjcpf","client_name","client_cnpjcpf","created_at","subtotal","total","items_json"];
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
      `"${itemsJson.replace(/"/g,'""')}"`
    ];
    rows.push(row.join(","));
  });
  const csv = rows.join("\n");
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'orcamentos.csv'; a.click();
  URL.revokeObjectURL(url);
});

// ---------- export Word (DOC) - exports current preview ----------
exportDocBtn && exportDocBtn.addEventListener("click", ()=>{
  if (!lastPreviewHtml) return alert("Abra um orçamento (Abrir) primeiro para exportar para Word.");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento</title></head><body>${lastPreviewHtml}</body></html>`;
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'orcamento.doc'; a.click();
  URL.revokeObjectURL(url);
});

// ---------- quote HTML (preview) ----------
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

      <div class="signature" style="margin-top:200px;display:flex;flex-direction:column;align-items:center;gap:6px">
        <div class="sig-line" style="width:60%;border-top:2px solid #000;height:0"></div>
        <div class="sig-name" style="font-weight:600;font-size:0.95rem;color:#222">${escapeHtml(issuer.name || '')}</div>
      </div>

      <div class="print-footer" style="margin-top:18px;font-size:0.85rem;color:#666;position:fixed;left:20px;bottom:20px">Gerado em: ${escapeHtml(dateOnly)}</div>
    </div>
  `;
}

// ---------- quote list actions ----------
function attachQuoteListListeners(){
  if (!quotesList) return;
  quotesList.querySelectorAll(".view-quote").forEach(btn=>{
    btn.addEventListener("click",(e)=> openPreview(e.target.dataset.id));
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

// ---------- initial render ----------
function renderAll(){ renderIssuers(); renderClients(); renderQuotes(); renderItems(currentItems); }
renderAll();

// ---------- helpers ----------
function escapeHtml(str){
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}