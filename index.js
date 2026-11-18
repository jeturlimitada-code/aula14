/* ════════════════════════════════════════════════════════════════════
 *
 * Correr:  1. criar o ficheiro .env com a DATABASE_URL da base de TREINO
 *             (copiar o de teste/back/.env; o .env.exemplo é só um modelo)
 *          2. npm install   (só a primeira vez)
 *          3. npm run dev
 * A tabela "clientes" antiga (com nome/email obrigatórios) tem de ser apagada
 * ════════════════════════════════════════════════════════════════════ */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Etapas do funil — as mesmas chaves do CRM real (Configurações → Status).
const ETAPAS = ["novo_lead", "cotacao", "negociacao", "comprado", "cancelado"];


/* ─────────────────────────────────────────────────────────────────────
 * 1. TABELA
 * CREATE TABLE IF NOT EXISTS cria a tabela só na primeira vez.
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS acrescenta colunas novas a uma
 * tabela que já existe — é assim que o CRM real evolui sem apagar dados.
 * ───────────────────────────────────────────────────────────────────── */
async function criarTabela() {
  await sql`
    CREATE TABLE IF NOT EXISTS clientes (
      id            SERIAL PRIMARY KEY,
      nome_cliente  TEXT NOT NULL,
      contacto      TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email          TEXT DEFAULT ''`;
  await sql`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'novo_lead'`;
  await sql`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS funcionario    TEXT DEFAULT ''`;
  await sql`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC(14,2) DEFAULT 0`;
  await sql`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_entrada   DATE DEFAULT CURRENT_DATE`;
}


/* ─────────────────────────────────────────────────────────────────────
 * 2. toJS — converte uma linha da base de dados num objecto para o frontend
 * A base usa snake_case (nome_cliente); o JavaScript usa camelCase
 * (nomeCliente). Converter num só sítio evita confusões no resto do código.
 * ───────────────────────────────────────────────────────────────────── */
// Data (YYYY-MM-DD) SEM passar por UTC. Atenção: toISOString() converte para
// UTC e, em Angola (UTC+1), a meia-noite de hoje vira 23:00 de ontem — a data
// apareceria com um dia a menos.
function dataLocal(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  const dois = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}



function toJS(r) {
  return {
    id:            r.id,
    nomeCliente:   r.nome_cliente,
    contacto:      r.contacto,
    email:         r.email || "",
    status:        r.status || "novo_lead",
    funcionario:   r.funcionario || "",
    valorEstimado: Number(r.valor_estimado) || 0,   // NUMERIC chega como texto
    dataEntrada:   dataLocal(r.data_entrada),
  };
}


/* ─────────────────────────────────────────────────────────────────────
 * 3. ROTAS
 * ───────────────────────────────────────────────────────────────────── */

// READ — listar (com filtro opcional: /api/clientes?status=cotacao)
app.get("/api/clientes", async (req, res) => {
  try {
    const status = req.query.status || "";
    const rows = await sql`
      SELECT * FROM clientes
      WHERE (${status} = '' OR status = ${status})
      ORDER BY id DESC
    `;
    res.json(rows.map(toJS));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// READ — um só cliente pelo id: /api/clientes/7
app.get("/api/clientes/:id", async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM clientes WHERE id = ${req.params.id}`;
    if (rows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado" });
    res.json(toJS(rows[0]));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// CREATE
app.post("/api/clientes", async (req, res) => {
  const d = req.body;
  if (!d.nomeCliente || !d.contacto) {
    return res.status(400).json({ erro: "O nome e o contacto são obrigatórios" });
  }
  if (d.status && !ETAPAS.includes(d.status)) {
    return res.status(400).json({ erro: "Etapa inválida" });
  }
  try {
    const rows = await sql`
      INSERT INTO clientes (nome_cliente, contacto, email, status, funcionario, valor_estimado, data_entrada)
      VALUES (${d.nomeCliente}, ${d.contacto}, ${d.email || ""}, ${d.status || "novo_lead"},
              ${d.funcionario || ""}, ${Number(d.valorEstimado) || 0}, ${dataLocal(new Date())})
      RETURNING *
    `;
    res.status(201).json(toJS(rows[0]));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// UPDATE — só muda os campos que vierem no corpo do pedido.
// Mesmo padrão do dbAtualizar() do CRM real: lê o cliente actual e, para cada
// campo, usa o valor novo se vier, senão mantém o antigo.
app.put("/api/clientes/:id", async (req, res) => {
  const d = req.body;
  if (d.status !== undefined && !ETAPAS.includes(d.status)) {
    return res.status(400).json({ erro: "Etapa inválida" });
  }
  try {
    const atual = await sql`SELECT * FROM clientes WHERE id = ${req.params.id}`;
    if (atual.length === 0) return res.status(404).json({ erro: "Cliente não encontrado" });
    const c = toJS(atual[0]);
    const v = (novo, antigo) => (novo !== undefined ? novo : antigo);

    const rows = await sql`
      UPDATE clientes SET
        nome_cliente   = ${v(d.nomeCliente, c.nomeCliente)},
        contacto       = ${v(d.contacto, c.contacto)},
        email          = ${v(d.email, c.email)},
        status         = ${v(d.status, c.status)},
        funcionario    = ${v(d.funcionario, c.funcionario)},
        valor_estimado = ${Number(v(d.valorEstimado, c.valorEstimado)) || 0}
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    res.json(toJS(rows[0]));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE
app.delete("/api/clientes/:id", async (req, res) => {
  try {
    const rows = await sql`DELETE FROM clientes WHERE id = ${req.params.id} RETURNING id`;
    if (rows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});


await criarTabela();
app.listen(PORT, () => console.log(`Servidor a correr em http://localhost:${PORT}`));
