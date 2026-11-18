// ════════════════════════════════════════════════════════════════════
// AULA 1 — SOLUÇÃO (frontend)
// ════════════════════════════════════════════════════════════════════

// const = variável que nunca é reatribuída. API guarda o endereço base do backend
// (Express a correr na porta 3001). Fica numa só constante para, se o servidor mudar
// de sítio, bastar alterar esta linha.
const API = "http://localhost:3001";

// Etapas do funil: chave (guardada na base) → nome e cor (mostrados no ecrã)
// Um objecto { chave: valor }. A chave (novo_lead...) é o que a base de dados guarda e
// tem de ser igual à lista ETAPAS do backend; "nome" é o texto bonito; "cor" é um hexadecimal.
const ETAPAS = {
  // Etapa inicial: lead acabado de entrar. Cor âmbar.
  novo_lead:  { nome: "Novo Lead",  cor: "#f59e0b" },
  // Cliente pediu preço. Cor ciano.
  cotacao:    { nome: "Cotação",    cor: "#06b6d4" },
  // Em conversa para fechar. Cor violeta.
  negociacao: { nome: "Negociação", cor: "#8b5cf6" },
  // Venda feita. Cor verde.
  comprado:   { nome: "Comprado",   cor: "#10b981" },
  // Perdido. Cor vermelha.
  cancelado:  { nome: "Cancelado",  cor: "#ef4444" },
};

// getElementById(id) — recebe 1 argumento: o texto do atributo id de um elemento do HTML.
// Devolve o elemento (ou null se não existir). Guardamos as referências uma vez
// para não ter de procurar no HTML a cada uso.
// O formulário de novo cliente (<form id="form-cliente">).
const form = document.getElementById("form-cliente");
// O <p> onde se mostram mensagens de sucesso ou erro.
const mensagem = document.getElementById("mensagem");
// O <tbody> onde as linhas dos clientes serão inseridas.
const tabela = document.getElementById("tabela-clientes");
// O <select> que filtra a lista por etapa.
const filtro = document.getElementById("filtro-status");

// Função de seta que formata dinheiro. Parâmetro v = o valor numérico (pode vir vazio/null).
// "v || 0" troca null/undefined/"" por 0; Number() converte para número;
// toLocaleString("pt-AO") recebe o código do idioma/país (português de Angola) e
// devolve o número com separadores de milhares (ex.: 1 500 000). O resultado é "Kz 1 500 000".
const fmtKz = (v) => `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
// Função de seta que converte a data. Parâmetro iso = texto "AAAA-MM-DD" vindo do backend.
// Se iso existir: split("-") parte-o em ["AAAA","MM","DD"] (argumento "-" = separador),
// reverse() inverte para ["DD","MM","AAAA"], join("/") junta com barras (argumento "/" = o que
// vai entre as partes) → "DD/MM/AAAA". Se estiver vazio, devolve um travessão.
const fmtData = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

// Preenche o filtro com as etapas
// Object.entries(ETAPAS) devolve uma lista de pares [chave, valor]. O for...of percorre-a e
// a desestruturação [chave, etapa] separa cada par em duas variáveis.
for (const [chave, etapa] of Object.entries(ETAPAS)) {
  // += acrescenta HTML ao fim do conteúdo do <select>: uma <option> por etapa, onde
  // value = chave (o que é enviado à API) e o texto visível = nome.
  filtro.innerHTML += `<option value="${chave}">${etapa.nome}</option>`;
}
// addEventListener(tipo, funcao) — 1.º argumento: o evento a ouvir ("change" dispara quando o
// utilizador escolhe outra opção); 2.º: a função a executar nesse momento. Passamos carregarClientes
// SEM parênteses, porque queremos entregar a função, não executá-la já.
filtro.addEventListener("change", carregarClientes);


// ── LISTAR ───────────────────────────────────────────────────────────
// async permite usar await lá dentro: esperar por operações lentas (rede) sem bloquear a página.
// Não recebe parâmetros: lê o filtro directamente do ecrã.
async function carregarClientes() {
  // try/catch: se algo falhar (ex.: servidor desligado), o código salta para o catch.
  try {
    // Lê a etapa escolhida no filtro: "" (todas) ou uma chave como "cotacao".
    const status = filtro.value;
    // Operador ternário (condição ? se_verdadeiro : se_falso). Com filtro, junta o parâmetro de
    // pesquisa ?status=...; sem filtro, pede a lista completa.
    const url = status ? `${API}/api/clientes?status=${status}` : `${API}/api/clientes`;
    // fetch(url) — 1 argumento: o endereço. Sem 2.º argumento, faz um GET. await espera a resposta.
    const res = await fetch(url);
    // res.json() lê o corpo da resposta e converte o JSON em array de objectos JavaScript.
    const clientes = await res.json();

    // Esvazia o corpo da tabela, para não duplicar linhas antigas.
    tabela.innerHTML = "";
    // Se a lista vier vazia...
    if (clientes.length === 0) {
      // ...mostra uma linha única. colspan="7" faz a célula ocupar as 7 colunas.
      tabela.innerHTML = `<tr><td colspan="7" class="vazio">Sem clientes.</td></tr>`;
      // return termina a função aqui: não há nada para desenhar.
      return;
    }
    // Para cada cliente c: linhaCliente(c) cria a <tr>; appendChild(no) recebe esse elemento
    // e coloca-o no fim do <tbody>.
    for (const c of clientes) tabela.appendChild(linhaCliente(c));
  // Se qualquer linha acima lançar erro, e guarda o erro (aqui não é usado).
  } catch (e) {
    // Mostra ao utilizador que o servidor está inacessível.
    tabela.innerHTML = `<tr><td colspan="7" class="vazio erro">Não foi possível ligar ao servidor.</td></tr>`;
  }
}

// Cria a <tr> de um cliente. A etapa é um <select> que grava logo ao mudar.
// Parâmetro c = objecto do cliente: { id, nomeCliente, contacto, status, funcionario, valorEstimado, dataEntrada }.
function linhaCliente(c) {
  // createElement(nome_da_tag) — 1 argumento: a tag a criar. Cria uma <tr> vazia, ainda fora da página.
  const tr = document.createElement("tr");
  // Constrói as <option> do <select> da etapa. Começa pelas entradas de ETAPAS...
  const opcoes = Object.entries(ETAPAS)
    // map(funcao) transforma cada par [chave, e] numa string HTML. "selected" só é escrito
    // na opção cuja chave é igual ao status actual do cliente, para o select mostrar a etapa certa.
    .map(([chave, e]) => `<option value="${chave}" ${chave === c.status ? "selected" : ""}>${e.nome}</option>`)
    // join("") une todas as strings num só texto (argumento "" = sem separador).
    .join("");
  // ?. (encadeamento opcional) evita erro se o status não existir em ETAPAS; || usa cinzento como cor de reserva.
  const cor = ETAPAS[c.status]?.cor || "#6b7280";

  // Define o HTML interior da linha: uma <td> por coluna, pela mesma ordem do cabeçalho.
  tr.innerHTML = `
    <td>${c.nomeCliente}</td>
    <td>${c.contacto}</td>
    <td><select class="etapa" style="color:${cor}; border-color:${cor}">${opcoes}</select></td>
    <td>${c.funcionario || "—"}</td>
    <td class="num">${fmtKz(c.valorEstimado)}</td>
    <td>${fmtData(c.dataEntrada)}</td>
    <td><button class="apagar" title="Apagar">Apagar</button></td>
  `;
  // querySelector(seletor_css) — 1 argumento: um seletor CSS; devolve o primeiro elemento que corresponda
  // dentro desta linha. No "change", a função de seta recebe e (o evento); e.target é o <select> e
  // e.target.value a etapa escolhida. mudarEtapa(id, novaEtapa) grava-a no servidor.
  tr.querySelector(".etapa").addEventListener("change", (e) => mudarEtapa(c.id, e.target.value));
  // No "click" do botão, chama apagarCliente com o cliente desta linha. A seta sem parâmetros
  // () => ... só corre quando o clique acontece.
  tr.querySelector(".apagar").addEventListener("click", () => apagarCliente(c));
  // Devolve a linha pronta, para carregarClientes a inserir na tabela.
  return tr;
}


// ── CRIAR ────────────────────────────────────────────────────────────
// "submit" dispara ao enviar o formulário (botão ou Enter). A função recebe evento (o objecto do evento).
form.addEventListener("submit", async (evento) => {
  // preventDefault() cancela o comportamento normal do formulário (recarregar a página).
  evento.preventDefault();
  try {
    // fetch(url, opcoes) — 2 argumentos. 1.º: endereço de criação. 2.º: objecto de opções.
    const res = await fetch(`${API}/api/clientes`, {
      // method: o verbo HTTP. POST = criar um registo novo.
      method: "POST",
      // headers: cabeçalhos do pedido. Content-Type avisa o servidor de que o corpo é JSON,
      // para o express.json() o conseguir ler.
      headers: { "Content-Type": "application/json" },
      // body: os dados enviados. JSON.stringify(objecto) converte o objecto em texto JSON (1 argumento).
      body: JSON.stringify({
        // .value lê o que está escrito no campo; trim() retira espaços do início e do fim.
        nomeCliente: document.getElementById("nome").value.trim(),
        // Telefone do cliente (obrigatório, como o nome).
        contacto: document.getElementById("contacto").value.trim(),
        // Email (opcional).
        email: document.getElementById("email").value.trim(),
        // Quem atende o cliente (opcional).
        funcionario: document.getElementById("funcionario").value.trim(),
        // Sem trim(): o campo é type="number"; o backend converte com Number().
        valorEstimado: document.getElementById("valor").value,
      }),
    });
    // Lê a resposta (o cliente criado, ou { erro: "..." }).
    const dados = await res.json();
    // res.ok é false se o código HTTP não for 2xx (ex.: 400 por faltar nome).
    if (!res.ok) {
      // Mostra a mensagem de erro enviada pelo backend...
      mensagem.textContent = dados.erro;
      // ...e a classe "erro" pinta-a de vermelho (ver style.css).
      mensagem.className = "erro";
      // Sai sem limpar o formulário, para o utilizador corrigir.
      return;
    }
    // Sucesso: confirma com o nome devolvido pelo servidor.
    mensagem.textContent = `Cliente "${dados.nomeCliente}" adicionado!`;
    // A classe "sucesso" pinta a mensagem de verde.
    mensagem.className = "sucesso";
    // reset() esvazia todos os campos do formulário.
    form.reset();
    // Recarrega a tabela para o novo cliente aparecer.
    carregarClientes();
  } catch (e) {
    // Rede em baixo ou servidor desligado.
    mensagem.textContent = "Não foi possível ligar ao servidor.";
    // Pinta de vermelho.
    mensagem.className = "erro";
  }
});


// ── ACTUALIZAR (só a etapa) ──────────────────────────────────────────
// Parâmetros: id = número do cliente a alterar; status = chave da nova etapa (ex.: "comprado").
async function mudarEtapa(id, status) {
  // O id vai no endereço (/api/clientes/7) para dizer qual registo mudar.
  const res = await fetch(`${API}/api/clientes/${id}`, {
    // PUT = actualizar um registo existente.
    method: "PUT",
    // Avisa que o corpo é JSON.
    headers: { "Content-Type": "application/json" },
    // { status } é abreviatura de { status: status }.
    body: JSON.stringify({ status }),   // só manda o campo que mudou
  });
  // Se o servidor recusou, lê o JSON do erro e mostra-o num alerta. Os parênteses em
  // volta de await ... fazem a leitura acontecer antes de aceder a .erro.
  if (!res.ok) alert((await res.json()).erro);
  // Recarrega a tabela, mostrando o estado real da base (também repõe o select em caso de erro).
  carregarClientes();
}


// ── APAGAR ───────────────────────────────────────────────────────────
// Parâmetro c = objecto do cliente a apagar (precisa do id e do nome).
async function apagarCliente(c) {
  // confirm(mensagem) — 1 argumento: o texto da pergunta. Abre uma caixa OK/Cancelar e devolve
  // true/false. Se for cancelado (!), return sai e nada é apagado.
  if (!confirm(`Apagar o cliente "${c.nomeCliente}"?`)) return;
  // fetch com 2.º argumento só com method: "DELETE" = remover. Não há corpo, o id vai no endereço.
  const res = await fetch(`${API}/api/clientes/${c.id}`, { method: "DELETE" });
  // Mostra o erro do servidor, se o houver (ex.: cliente já não existe).
  if (!res.ok) alert((await res.json()).erro);
  // Actualiza a tabela, já sem o cliente apagado.
  carregarClientes();
}


// Chamada inicial: ao abrir a página, carrega e mostra os clientes.
carregarClientes();
