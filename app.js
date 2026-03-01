// app.js — Gerador de Orçamentos SoftPrime
// Sistema completo com localStorage, validações e exportações
// ATUALIZADO: Permite números duplicados para CNPJ diferentes + edição de número

const STORE_KEY = "softprime_quotes_v2";

function uid(){ return Math.random().toString(36).slice(2,9); }
const money = v => Number(v||0).toFixed(2);

// ========== STORAGE ==========
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
  s.issuers = s.issuers || [];
  s.clients = s.clients || [];
  s.quotes = s.quotes || [];
  return s;
}

function saveStore(s){ 
  localStorage.setItem(STORE_KEY, JSON.stringify(s)); 
}

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

// ========== DOM ELEMENTS ==========
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
const quoteDate = document.getElementById("quoteDate");
const notes = document.getElementById("notes");

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

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(str){
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateISOtoLocal(iso){
  if (!iso) return "";
  return new Date(iso).toLocaleDateString('pt-BR');
}

function setDefaultQuoteFields(){
  if (!quoteNumber || !quoteDate) return;
  if (editingQuoteId) return;

  const next = store.nextQuoteNumber || computeNextQuoteNumberFromQuotes(store.quotes || []);
  quoteNumber.value = formatQuoteNumber(next);
  quoteDate.value = new Date().toLocaleDateString('pt-BR');
  if (notes) notes.value = "";
}

function showNotification(message, type = 'success'){
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  alert(`${icon} ${message}`);
}

// ========== RENDER FUNCTIONS ==========
function renderIssuers(){
  if (!selectIssuer) return;
  
  if (issuerList) issuerList.innerHTML = "";
  selectIssuer.innerHTML = "<option value=''>-- selecione o emissor --</option>";
  
  (store.issuers || []).forEach(i=>{
    if (issuerList) {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(i.name)}</strong>
          <div class="meta">${escapeHtml(i.cnpjCpf||'')} ${i.phone ? '• ' + escapeHtml(i.phone) : ''}</div>
          <div class="meta">${escapeHtml(i.address||'')}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline edit-issuer" data-id="${i.id}">✏️ Editar</button>
          <button class="btn btn-outline del-issuer" data-id="${i.id}" style="color:#dc2626;border-color:#fecaca;">🗑️ Excluir</button>
        </div>`;
      issuerList.appendChild(li);
    }

    const opt = document.createElement("option");
    opt.value = i.id; 
    opt.textContent = `${i.name} ${i.cnpjCpf ? '— ' + i.cnpjCpf : ''}`;
    selectIssuer.appendChild(opt);
  });
}

function renderClients(){
  if (!selectClient) return;
  
  if (clientList) clientList.innerHTML = "";
  selectClient.innerHTML = "<option value=''>-- selecione o cliente --</option>";
  
  (store.clients || []).forEach(c=>{
    if (clientList) {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(c.name)}</strong>
          <div class="meta">${escapeHtml(c.cnpjCpf||'')} ${c.phone ? '• ' + escapeHtml(c.phone) : ''}</div>
          <div class="meta">${escapeHtml(c.address||'')}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-outline edit-client" data-id="${c.id}">✏️ Editar</button>
          <button class="btn btn-outline del-client" data-id="${c.id}" style="color:#dc2626;border-color:#fecaca;">🗑️ Excluir</button>
        </div>`;
      clientList.appendChild(li);
    }

    const opt = document.createElement("option");
    opt.value = c.id; 
    opt.textContent = `${c.name} ${c.cnpjCpf ? '— ' + c.cnpjCpf : ''}`;
    selectClient.appendChild(opt);
  });
}

function renderQuotes(){
  if (!quotesList) return;
  quotesList.innerHTML = "";
  
  if (!store.quotes.length) { 
    quotesList.innerHTML = "<li style='text-align:center;color:#9ca3af;'>📭 Nenhum orçamento salvo ainda</li>"; 
    return; 
  }
  
  store.quotes.slice().reverse().forEach(q=>{
    const issuer = store.issuers.find(i=>i.id===q.issuerId) || {};
    const client = store.clients.find(c=>c.id===q.clientId) || {};
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="flex:1;">
        <strong>📄 Orçamento ${escapeHtml(q.numero||q.id)}</strong>
        <div class="meta">
          <span style="color:#0d7de0;">De:</span> ${escapeHtml(issuer.name||'—')} 
          <span style="margin:0 8px;">→</span> 
          <span style="color:#0d7de0;">Para:</span> ${escapeHtml(client.name||'—')}
        </div>
        <div class="meta">
          📅 ${formatDateISOtoLocal(q.createdAt)} • 
          💰 R$ ${money(q.total)}
        </div>
      </div>
      <div class="quote-actions">
        <button class="btn btn-outline view-quote" data-id="${q.id}">����️ Visualizar</button>
        <button class="btn btn-outline export-quote" data-id="${q.id}">📄 Word</button>
        <button class="btn btn-outline export-pdf" data-id="${q.id}">📑 PDF</button>
        <button class="btn btn-outline edit-quote" data-id="${q.id}">✏️ Editar</button>
        <button class="btn btn-outline del-quote" data-id="${q.id}" style="color:#dc2626;border-color:#fecaca;">🗑️ Excluir</button>
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
      <td>
        <input 
          data-idx="${idx}" 
          data-field="descricao" 
          value="${escapeHtml(it.descricao||'')}" 
          placeholder="Descrição do item" 
          aria-label="Descrição do item ${idx + 1}"
        />
      </td>
      <td>
        <input 
          data-idx="${idx}" 
          data-field="quantidade" 
          type="number" 
          min="0" 
          step="1" 
          value="${it.quantidade||1}" 
          aria-label="Quantidade do item ${idx + 1}"
        />
      </td>
      <td>
        <input 
          data-idx="${idx}" 
          data-field="valorUnitario" 
          type="number" 
          min="0" 
          step="0.01" 
          value="${it.valorUnitario||0}" 
          aria-label="Valor unitário do item ${idx + 1}"
        />
      </td>
      <td class="item-total">R$ ${money((it.quantidade||1)*(it.valorUnitario||0))}</td>
      <td>
        <button class="del-item" data-idx="${idx}" aria-label="Remover item ${idx + 1}">×</button>
      </td>
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
      if (currentItems.length === 1) {
        showNotification("Deve haver pelo menos um item no orçamento", "info");
        return;
      }
      currentItems.splice(idx, 1);
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

// ========== ISSUER HANDLERS ==========
if (issuerForm) {
  issuerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const name = (issuerName && issuerName.value || "").trim();
      const cnpjCpf = (issuerCnpjCpf && issuerCnpjCpf.value || "").trim();
      const address = (issuerAddress && issuerAddress.value || "").trim();
      const phone = (issuerPhone && issuerPhone.value || "").trim();

      if (!name) {
        showNotification("Preencha o nome do emissor", "error");
        return;
      }

      store.issuers = store.issuers || [];

      if (editingIssuerId) {
        const item = store.issuers.find(x => x.id === editingIssuerId);
        if (item) {
          item.name = name; 
          item.cnpjCpf = cnpjCpf; 
          item.address = address; 
          item.phone = phone;
          saveStore(store);
          editingIssuerId = null;
          if (issuerSubmitBtn) issuerSubmitBtn.textContent = "Adicionar Emissor";
          if (issuerCancelBtn) issuerCancelBtn.style.display = "none";
          issuerForm.reset();
          renderIssuers(); 
          renderQuotes();
          showNotification("Emissor atualizado com sucesso!", "success");
          return;
        }
      }

      const newItem = { id: uid(), name, cnpjCpf, address, phone };
      store.issuers.push(newItem);
      saveStore(store);
      issuerForm.reset();
      renderIssuers(); 
      renderQuotes();
      showNotification("Emissor adicionado com sucesso!", "success");
    } catch (err) {
      console.error("[ERROR] issuerForm handler:", err);
      showNotification("Erro ao adicionar emissor. Tente novamente.", "error");
    }
  });
}

if (issuerList) {
  issuerList.addEventListener("click", (e) => {
    try {
      if (e.target.classList.contains("del-issuer")) {
        const id = e.target.dataset.id;
        if (!confirm("❓ Excluir este emissor?")) return;
        store.issuers = store.issuers.filter(x => x.id !== id);
        saveStore(store); 
        renderIssuers(); 
        renderQuotes();
        showNotification("Emissor excluído", "success");
      } else if (e.target.classList.contains("edit-issuer")) {
        const id = e.target.dataset.id;
        const it = store.issuers.find(x => x.id === id);
        if (!it) return;
        editingIssuerId = id;
        if (issuerName) issuerName.value = it.name || "";
        if (issuerCnpjCpf) issuerCnpjCpf.value = it.cnpjCpf || "";
        if (issuerAddress) issuerAddress.value = it.address || "";
        if (issuerPhone) issuerPhone.value = it.phone || "";
        if (issuerSubmitBtn) issuerSubmitBtn.textContent = "Atualizar Emissor";
        if (issuerCancelBtn) issuerCancelBtn.style.display = "inline-block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("[ERROR] issuerList click:", err);
    }
  });
}

if (issuerCancelBtn) {
  issuerCancelBtn.addEventListener("click", () => {
    editingIssuerId = null; 
    issuerForm && issuerForm.reset();
    if (issuerSubmitBtn) issuerSubmitBtn.textContent = "Adicionar Emissor";
    issuerCancelBtn.style.display = "none";
  });
}

// ========== CLIENT HANDLERS ==========
if (clientForm) {
  clientForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const name = (clientName && clientName.value || "").trim();
      const cnpjCpf = (clientCnpjCpf && clientCnpjCpf.value || "").trim();
      const address = (clientAddress && clientAddress.value || "").trim();
      const phone = (clientPhone && clientPhone.value || "").trim();

      if (!name) {
        showNotification("Preencha o nome do cliente", "error");
        return;
      }

      store.clients = store.clients || [];

      if (editingClientId) {
        const item = store.clients.find(x => x.id === editingClientId);
        if (item) {
          item.name = name; 
          item.cnpjCpf = cnpjCpf; 
          item.address = address; 
          item.phone = phone;
          saveStore(store);
          editingClientId = null;
          if (clientSubmitBtn) clientSubmitBtn.textContent = "Adicionar Cliente";
          if (clientCancelBtn) clientCancelBtn.style.display = "none";
          clientForm.reset();
          renderClients(); 
          renderQuotes();
          showNotification("Cliente atualizado com sucesso!", "success");
          return;
        }
      }

      const newItem = { id: uid(), name, cnpjCpf, address, phone };
      store.clients.push(newItem);
      saveStore(store);
      clientForm.reset();
      renderClients(); 
      renderQuotes();
      showNotification("Cliente adicionado com sucesso!", "success");
    } catch (err) {
      console.error("[ERROR] clientForm handler:", err);
      showNotification("Erro ao adicionar cliente. Tente novamente.", "error");
    }
  });
}

if (clientList) {
  clientList.addEventListener("click", (e) => {
    try {
      if (e.target.classList.contains("del-client")) {
        const id = e.target.dataset.id;
        if (!confirm("❓ Excluir este cliente?")) return;
        store.clients = store.clients.filter(x => x.id !== id);
        saveStore(store); 
        renderClients(); 
        renderQuotes();
        showNotification("Cliente excluído", "success");
      } else if (e.target.classList.contains("edit-client")) {
        const id = e.target.dataset.id;
        const it = store.clients.find(x => x.id === id);
        if (!it) return;
        editingClientId = id;
        if (clientName) clientName.value = it.name || "";
        if (clientCnpjCpf) clientCnpjCpf.value = it.cnpjCpf || "";
        if (clientAddress) clientAddress.value = it.address || "";
        if (clientPhone) clientPhone.value = it.phone || "";
        if (clientSubmitBtn) clientSubmitBtn.textContent = "Atualizar Cliente";
        if (clientCancelBtn) clientCancelBtn.style.display = "inline-block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("[ERROR] clientList click:", err);
    }
  });
}

if (clientCancelBtn) {
  clientCancelBtn.addEventListener("click", () => {
    editingClientId = null; 
    clientForm && clientForm.reset();
    if (clientSubmitBtn) clientSubmitBtn.textContent = "Adicionar Cliente";
    clientCancelBtn.style.display = "none";
  });
}

// ========== ITEM HANDLERS ==========
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
      }, 100);
    } catch (err) {
      console.error("[ERROR] addItemBtn:", err);
    }
  });
}

// ========== QUOTE HANDLERS ==========
// ATUALIZADO: Verifica duplicatas apenas para o MESMO emissor
function existsSameNumberForIssuer(numero, issuerId, excludeQuoteId = null){
  if (!numero) return false;
  return (store.quotes || []).some(q => 
    q.numero === numero && 
    q.issuerId === issuerId && 
    q.id !== excludeQuoteId
  );
}

if (saveQuoteBtn) {
  saveQuoteBtn.addEventListener("click", ()=>{
    try {
      const issuerId = selectIssuer && selectIssuer.value;
      const clientId = selectClient && selectClient.value;
      
      if (!issuerId || !clientId) {
        showNotification("Selecione emissor e cliente", "error");
        return;
      }

      // Validar se há pelo menos um item com descrição
      const validItems = currentItems.filter(it => (it.descricao || "").trim() !== "");
      if (validItems.length === 0) {
        showNotification("Adicione pelo menos um item com descrição", "error");
        return;
      }

      const totals = recalcTotals();

      let numeroValue = (quoteNumber && quoteNumber.value || "").trim();
      let generatedNumber = false;
      
      // Se não houver número ou estiver em branco, gera automaticamente
      if (!numeroValue) {
        numeroValue = formatQuoteNumber(store.nextQuoteNumber || computeNextQuoteNumberFromQuotes(store.quotes));
        generatedNumber = true;
      }

      // IMPORTANTE: Verifica duplicata apenas para o MESMO emissor
      if (editingQuoteId) {
        if (existsSameNumberForIssuer(numeroValue, issuerId, editingQuoteId)) {
          showNotification("Já existe um orçamento com esse número para o mesmo emissor", "error");
          return;
        }
      } else {
        if (existsSameNumberForIssuer(numeroValue, issuerId, null)) {
          showNotification("Já existe um orçamento com esse número para o mesmo emissor", "error");
          return;
        }
      }

      const notesVal = (notes && notes.value || "").trim();

      if (editingQuoteId) {
        const q = store.quotes.find(x => x.id === editingQuoteId);
        if (!q) {
          showNotification("Orçamento não encontrado", "error");
          return;
        }
        q.issuerId = issuerId;
        q.clientId = clientId;
        q.numero = numeroValue || null;
        q.items = JSON.parse(JSON.stringify(validItems));
        q.subtotal = totals.subtotal;
        q.total = totals.total;
        q.notes = notesVal;
        q.updatedAt = new Date().toISOString();
        saveStore(store);
        showNotification(`✅ Orçamento ${q.numero} atualizado!`, "success");
        endEditMode();
        renderQuotes();
        currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
        renderItems(currentItems);
        return;
      }

      const q = {
        id: uid(),
        issuerId, 
        clientId,
        numero: numeroValue || null,
        items: JSON.parse(JSON.stringify(validItems)),
        subtotal: totals.subtotal, 
        total: totals.total,
        notes: notesVal,
        createdAt: new Date().toISOString()
      };
      
      store.quotes.push(q);
      
      // Só incrementa se foi gerado automaticamente
      if (generatedNumber) {
        store.nextQuoteNumber = (store.nextQuoteNumber || 1) + 1;
      }
      
      saveStore(store);
      
      currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
      renderItems(currentItems); 
      renderQuotes();
      setDefaultQuoteFields();
      
      showNotification(`✅ Orçamento ${q.numero} salvo com sucesso!`, "success");
      
      setTimeout(() => {
        quotesList && quotesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      
    } catch (err) {
      console.error("[ERROR] saveQuoteBtn:", err);
      showNotification("Erro ao salvar orçamento. Tente novamente.", "error");
    }
  });
}

function startEditMode(quoteId) {
  const q = store.quotes.find(x => x.id === quoteId);
  if (!q) {
    showNotification("Orçamento não encontrado", "error");
    return;
  }
  
  editingQuoteId = quoteId;
  if (selectIssuer) selectIssuer.value = q.issuerId || "";
  if (selectClient) selectClient.value = q.clientId || "";
  
  // IMPORTANTE: Permite edição do número do orçamento
  if (quoteNumber) {
    quoteNumber.value = q.numero || "";
    quoteNumber.removeAttribute("readonly"); // Remove o readonly para permitir edição
  }
  
  if (quoteDate) quoteDate.value = formatDateISOtoLocal(q.createdAt || q.updatedAt || new Date().toISOString());
  if (notes) notes.value = q.notes || "";
  
  currentItems = JSON.parse(JSON.stringify(q.items || [{descricao:"",quantidade:1,valorUnitario:0}]));
  renderItems(currentItems);
  
  if (saveQuoteBtn) saveQuoteBtn.textContent = "💾 Atualizar Orçamento";
  if (cancelEditBtn) cancelEditBtn.style.display = "block";
  
  window.scrollTo({ top: 300, behavior: 'smooth' });
  showNotification("Modo de edição ativado. Você pode editar o número do orçamento!", "info");
}

function endEditMode() {
  editingQuoteId = null;
  if (saveQuoteBtn) saveQuoteBtn.textContent = "📄 Gerar Orçamento";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";
  
  // Restaura o readonly no campo de número
  if (quoteNumber) quoteNumber.setAttribute("readonly", "true");
  
  setDefaultQuoteFields();
  if (notes) notes.value = "";
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    if (!confirm("❓ Cancelar edição e limpar formulário?")) return;
    endEditMode();
    currentItems = [{descricao:"",quantidade:1,valorUnitario:0}];
    renderItems(currentItems);
    showNotification("Edição cancelada", "info");
  });
}

// ========== PREVIEW & PRINT ==========
function openPreview(id){
  const q = store.quotes.find(x=>x.id===id); 
  if (!q) {
    showNotification("Orçamento não encontrado", "error");
    return;
  }
  
  const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
  const client = store.clients.find(c=>c.id===q.clientId)||{};
  const html = renderQuoteHtml(q, issuer, client);
  
  previewArea && (previewArea.innerHTML = html);
  lastPreviewHtml = html;
  previewModal && previewModal.classList.remove("hidden");
}

if (closePreview) {
  closePreview.addEventListener("click", ()=> {
    previewModal && previewModal.classList.add("hidden");
  });
}

if (printBtn) {
  printBtn.addEventListener("click", ()=>{
    try {
      const content = previewArea ? previewArea.innerHTML : "";
      const w = window.open("", "_blank");
      w.document.write(`
        <html>
        <head>
          <meta charset="utf-8">
          <title>Orçamento - SoftPrime</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;padding:30px;color:#1a1a1a;max-width:800px;margin:0 auto}
            table{width:100%;border-collapse:collapse;margin-top:16px}
            th,td{border:1px solid #e5e7eb;padding:10px;text-align:left}
            th{background:#f9fafb;font-weight:600}
            .signature{margin-top:200px;display:flex;flex-direction:column;align-items:center;gap:8px}
            .signature .sig-line{width:60%;border-top:2px solid #1a1a1a;height:0}
            .signature .sig-name{font-weight:600;font-size:0.95rem;color:#1a1a1a}
            .print-footer{margin-top:24px;font-size:0.85rem;color:#6b7280;text-align:center}
            @media print {
              .print-footer{position:fixed;bottom:20px;left:0;right:0}
            }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `);
      w.document.close(); 
      w.focus(); 
      setTimeout(()=>w.print(), 400);
    } catch (err) {
      console.error("[ERROR] printBtn:", err);
      showNotification("Erro ao imprimir. Tente novamente.", "error");
    }
  });
}

// ========== EXPORT FUNCTIONS ==========
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", ()=>{
    try {
      if (!store.quotes.length) {
        showNotification("Nenhum orçamento para exportar", "info");
        return;
      }
      
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
      const blob = new Blob(["\uFEFF" + csv], {type: 'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `orcamentos_${new Date().getTime()}.csv`; 
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification("✅ Excel exportado com sucesso!", "success");
    } catch (err) {
      console.error("[ERROR] exportCsvBtn:", err);
      showNotification("Erro ao exportar Excel", "error");
    }
  });
}

if (exportDocBtn) {
  exportDocBtn.addEventListener("click", ()=>{
    try {
      if (!lastPreviewHtml) {
        showNotification("Abra um orçamento primeiro para exportar", "info");
        return;
      }
      
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento</title></head><body>${lastPreviewHtml}</body></html>`;
      const blob = new Blob([html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `orcamento_${new Date().getTime()}.doc`; 
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification("✅ Word exportado com sucesso!", "success");
    } catch (err) {
      console.error("[ERROR] exportDocBtn:", err);
      showNotification("Erro ao exportar Word", "error");
    }
  });
}

function exportQuoteDoc(quoteId){
  try {
    const q = store.quotes.find(x=>x.id===quoteId); 
    if (!q) {
      showNotification("Orçamento não encontrado", "error");
      return;
    }
    
    const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
    const client = store.clients.find(c=>c.id===q.clientId)||{};
    const html = renderQuoteHtml(q, issuer, client);
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Orçamento</title></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `orcamento-${q.numero || q.id}.doc`; 
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification("✅ Word exportado!", "success");
  } catch (err) {
    console.error("[ERROR] exportQuoteDoc:", err);
    showNotification("Erro ao exportar documento", "error");
  }
}

function exportQuotePdf(quoteId){
  try {
    const q = store.quotes.find(x=>x.id===quoteId); 
    if (!q) {
      showNotification("Orçamento não encontrado", "error");
      return;
    }
    
    const issuer = store.issuers.find(i=>i.id===q.issuerId)||{};
    const client = store.clients.find(c=>c.id===q.clientId)||{};
    const html = renderQuoteHtml(q, issuer, client);
    const w = window.open("", "_blank");
    w.document.write(`
      <html>
      <head>
        <meta charset="utf-8">
        <title>Orçamento ${escapeHtml(q.numero || q.id)}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:30px;color:#1a1a1a;max-width:800px;margin:0 auto}
          table{width:100%;border-collapse:collapse;margin-top:16px}
          th,td{border:1px solid #e5e7eb;padding:10px}
          th{background:#f9fafb;font-weight:600}
          .signature{margin-top:200px;display:flex;flex-direction:column;align-items:center;gap:8px}
          .signature .sig-line{width:60%;border-top:2px solid #1a1a1a;height:0}
          .signature .sig-name{font-weight:600;font-size:0.95rem;color:#1a1a1a}
          .print-footer{margin-top:24px;font-size:0.85rem;color:#6b7280;text-align:center}
          @media print {
            .print-footer{position:fixed;bottom:20px;left:0;right:0}
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(()=> w.print(), 400);
  } catch (err) {
    console.error("[ERROR] exportQuotePdf:", err);
    showNotification("Erro ao exportar PDF", "error");
  }
}

function renderQuoteHtml(q, issuer, client){
  const dateOnly = formatDateISOtoLocal(q.createdAt);
  const issuerContact = `${issuer.address ? escapeHtml(issuer.address) + '<br/>' : ''}${issuer.phone ? '📞 ' + escapeHtml(issuer.phone) : ''}`;
  const clientContact = `${client.address ? escapeHtml(client.address) + '<br/>' : ''}${client.phone ? '📞 ' + escapeHtml(client.phone) : ''}`;

  return `
    <div style="max-width:800px;margin:0 auto;padding:20px;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#0d7de0;margin:0;font-size:28px;">📄 ORÇAMENTO</h1>
        <h2 style="margin:8px 0;font-size:22px;">${escapeHtml(q.numero || q.id)}</h2>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:30px;">
        <div style="padding:16px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin:0 0 12px 0;color:#0d7de0;font-size:16px;">📤 EMISSOR</h3>
          <strong style="font-size:16px;">${escapeHtml(issuer.name||'—')}</strong><br/>
          ${issuer.cnpjCpf? '<span style="color:#6b7280;">CNPJ/CPF:</span> ' + escapeHtml(issuer.cnpjCpf) + '<br/>':''}
          <div style="font-size:14px;color:#4b5563;margin-top:8px;">${issuerContact}</div>
        </div>
        
        <div style="padding:16px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin:0 0 12px 0;color:#0d7de0;font-size:16px;">📥 DESTINATÁRIO</h3>
          <strong style="font-size:16px;">${escapeHtml(client.name||'—')}</strong><br/>
          ${client.cnpjCpf? '<span style="color:#6b7280;">CNPJ/CPF:</span> ' + escapeHtml(client.cnpjCpf) + '<br/>':''}
          <div style="font-size:14px;color:#4b5563;margin-top:8px;">${clientContact}</div>
        </div>
      </div>
      
      <table style="margin-top:24px;">
        <thead>
          <tr>
            <th style="text-align:left;">Descrição</th>
            <th style="text-align:center;width:80px;">Qtd</th>
            <th style="text-align:right;width:120px;">Valor Unit.</th>
            <th style="text-align:right;width:120px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${q.items.map(it=>`<tr>
            <td>${escapeHtml(it.descricao||'')}</td>
            <td style="text-align:center">${it.quantidade}</td>
            <td style="text-align:right">R$ ${money(it.valorUnitario)}</td>
            <td style="text-align:right"><strong>R$ ${money((it.quantidade||0)*(it.valorUnitario||0))}</strong></td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right;font-weight:600;">Subtotal:</td>
            <td style="text-align:right;font-weight:600;">R$ ${money(q.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align:right;font-weight:700;font-size:18px;color:#0d7de0;">TOTAL:</td>
            <td style="text-align:right;font-weight:700;font-size:18px;color:#0d7de0;">R$ ${money(q.total)}</td>
          </tr>
        </tfoot>
      </table>

      ${q.notes ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;">
        <strong style="color:#92400e;">📌 Observações:</strong>
        <div style="margin-top:8px;color:#78350f;white-space:pre-wrap;">${escapeHtml(q.notes)}</div>
      </div>` : ''}

      <div class="signature">
        <div class="sig-line"></div>
        <div class="sig-name">${escapeHtml(issuer.name || '')}</div>
      </div>

      <div class="print-footer">
        Orçamento gerado em: ${escapeHtml(dateOnly)} | SoftPrime - Gerador de Orçamentos
      </div>
    </div>
  `;
}

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
    btn.addEventListener("click",(e)=> startEditMode(e.target.dataset.id));
  });
  
  quotesList.querySelectorAll(".del-quote").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const id = e.target.dataset.id;
      if (!confirm("❓ Excluir este orçamento permanentemente?")) return;
      store.quotes = store.quotes.filter(q=>q.id!==id); 
      saveStore(store); 
      renderQuotes();
      showNotification("Orçamento excluído", "success");
    });
  });
}

// ========== INITIALIZATION ==========
function renderAll(){ 
  renderIssuers(); 
  renderClients(); 
  renderQuotes(); 
  renderItems(currentItems); 
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  setDefaultQuoteFields();
  console.log("✅ SoftPrime Gerador de Orçamentos iniciado!");
});