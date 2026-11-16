// ════════════════════════════════════════════════════════════════════
// AULA 1 — SOLUÇÃO (frontend)
// ════════════════════════════════════════════════════════════════════
const API = "http://localhost:3001";

// Etapas do funil: chave (guardada na base) → nome e cor (mostrados no ecrã)
const ETAPAS = {
  novo_lead:  { nome: "Novo Lead",  cor: "#f59e0b" },
  cotacao:    { nome: "Cotação",    cor: "#06b6d4" },
  negociacao: { nome: "Negociação", cor: "#8b5cf6" },
  comprado:   { nome: "Comprado",   cor: "#10b981" },
  cancelado:  { nome: "Cancelado",  cor: "#ef4444" },
};

const form = document.getElementById("form-cliente");
const mensagem = document.getElementById("mensagem");
const tabela = document.getElementById("tabela-clientes");
const filtro = document.getElementById("filtro-status");

const fmtKz = (v) => `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
const fmtData = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

// Preenche o filtro com as etapas
for (const [chave, etapa] of Object.entries(ETAPAS)) {
  filtro.innerHTML += `<option value="${chave}">${etapa.nome}</option>`;
}
filtro.addEventListener("change", carregarClientes);


// ── LISTAR ───────────────────────────────────────────────────────────
async function carregarClientes() {
  try {
    const status = filtro.value;
    const url = status ? `${API}/api/clientes?status=${status}` : `${API}/api/clientes`;
    const res = await fetch(url);
    const clientes = await res.json();

    tabela.innerHTML = "";
    if (clientes.length === 0) {
      tabela.innerHTML = `<tr><td colspan="7" class="vazio">Sem clientes.</td></tr>`;
      return;
    }
    for (const c of clientes) tabela.appendChild(linhaCliente(c));
  } catch (e) {
    tabela.innerHTML = `<tr><td colspan="7" class="vazio erro">Não foi possível ligar ao servidor.</td></tr>`;
  }
}

// Cria a <tr> de um cliente. A etapa é um <select> que grava logo ao mudar.
function linhaCliente(c) {
  const tr = document.createElement("tr");
  const opcoes = Object.entries(ETAPAS)
    .map(([chave, e]) => `<option value="${chave}" ${chave === c.status ? "selected" : ""}>${e.nome}</option>`)
    .join("");
  const cor = ETAPAS[c.status]?.cor || "#6b7280";

  tr.innerHTML = `
    <td>${c.nomeCliente}</td>
    <td>${c.contacto}</td>
    <td><select class="etapa" style="color:${cor}; border-color:${cor}">${opcoes}</select></td>
    <td>${c.funcionario || "—"}</td>
    <td class="num">${fmtKz(c.valorEstimado)}</td>
    <td>${fmtData(c.dataEntrada)}</td>
    <td><button class="apagar" title="Apagar">Apagar</button></td>
  `;
  tr.querySelector(".etapa").addEventListener("change", (e) => mudarEtapa(c.id, e.target.value));
  tr.querySelector(".apagar").addEventListener("click", () => apagarCliente(c));
  return tr;
}


// ── CRIAR ────────────────────────────────────────────────────────────
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    const res = await fetch(`${API}/api/clientes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeCliente: document.getElementById("nome").value.trim(),
        contacto: document.getElementById("contacto").value.trim(),
        email: document.getElementById("email").value.trim(),
        funcionario: document.getElementById("funcionario").value.trim(),
        valorEstimado: document.getElementById("valor").value,
      }),
    });
    const dados = await res.json();
    if (!res.ok) {
      mensagem.textContent = dados.erro;
      mensagem.className = "erro";
      return;
    }
    mensagem.textContent = `Cliente "${dados.nomeCliente}" adicionado!`;
    mensagem.className = "sucesso";
    form.reset();
    carregarClientes();
  } catch (e) {
    mensagem.textContent = "Não foi possível ligar ao servidor.";
    mensagem.className = "erro";
  }
});


// ── ACTUALIZAR (só a etapa) ──────────────────────────────────────────
async function mudarEtapa(id, status) {
  const res = await fetch(`${API}/api/clientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),   // só manda o campo que mudou
  });
  if (!res.ok) alert((await res.json()).erro);
  carregarClientes();
}


// ── APAGAR ───────────────────────────────────────────────────────────
async function apagarCliente(c) {
  if (!confirm(`Apagar o cliente "${c.nomeCliente}"?`)) return;
  const res = await fetch(`${API}/api/clientes/${c.id}`, { method: "DELETE" });
  if (!res.ok) alert((await res.json()).erro);
  carregarClientes();
}


carregarClientes();
