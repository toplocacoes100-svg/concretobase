const path = require("path");
const express = require("express");
const { db, proximoId } = require("./db/database");
const { senhaConfere, criarSessao, destruirSessao, lerCookies, middlewareAuth, permitirPerfis } = require("./auth");
const { calcularProgramacao } = require("./programacao");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- LOGIN / LOGOUT / SESSÃO ATUAL ----------
app.post("/api/login", (req, res) => {
  const { usuario, senha } = req.body;
  const linha = db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario || "");

  if (!linha || !senhaConfere(senha || "", linha.senha_hash, linha.senha_salt)) {
    return res.status(401).json({ erro: "Usuário ou senha inválidos." });
  }

  const sessionId = criarSessao(linha);
  res.setHeader(
    "Set-Cookie",
    `cb_session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${8 * 60 * 60}`
  );
  res.json({ nome: linha.nome, usuario: linha.usuario, role: linha.role });
});

app.post("/api/logout", (req, res) => {
  const cookies = lerCookies(req);
  if (cookies["cb_session"]) destruirSessao(cookies["cb_session"]);
  res.setHeader("Set-Cookie", "cb_session=; HttpOnly; Path=/; Max-Age=0");
  res.json({ ok: true });
});

app.get("/api/me", middlewareAuth, (req, res) => {
  res.json(req.usuarioLogado);
});

// A partir daqui, tudo exige login
app.use("/api", middlewareAuth);

// ---------- DASHBOARD (qualquer perfil logado) ----------
app.get("/api/dashboard", (req, res) => {
  const volumeMes = db.prepare("SELECT SUM(volume) AS total FROM vendas").get().total || 0;
  const emRota = db.prepare("SELECT COUNT(*) AS total FROM vendas WHERE status = 'Em rota'").get().total;
  const receberTotal = db.prepare("SELECT SUM(valor) AS total FROM financeiro_receber").get().total || 0;
  const clientesAtraso = db.prepare("SELECT COUNT(*) AS total FROM financeiro_receber WHERE status = 'Atrasado'").get().total;
  res.json({ volumeMes, emRota, receberTotal, clientesAtraso });
});

// ---------- VENDAS ----------
app.get("/api/vendas", permitirPerfis("vendas", "logistica"), (req, res) => {
  res.json(db.prepare("SELECT * FROM vendas ORDER BY rowid DESC").all());
});

app.post("/api/vendas", permitirPerfis("vendas"), (req, res) => {
  const { cliente, traco, volume, entrega } = req.body;
  if (!cliente || !volume) return res.status(400).json({ erro: "Informe ao menos cliente e volume." });

  const id = proximoId("vendas", "PV");
  const pedido = {
    id, cliente, traco: traco || "fck 25 MPa", volume: Number(volume),
    entrega: entrega || new Date().toISOString().slice(0, 10), status: "Novo"
  };
  db.prepare(
    "INSERT INTO vendas (id, cliente, traco, volume, entrega, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(pedido.id, pedido.cliente, pedido.traco, pedido.volume, pedido.entrega, pedido.status);
  res.status(201).json(pedido);
});

// ---------- COMPRAS ----------
app.get("/api/compras", permitirPerfis("compras"), (req, res) => {
  res.json(db.prepare("SELECT * FROM compras ORDER BY rowid DESC").all());
});

app.post("/api/compras", permitirPerfis("compras"), (req, res) => {
  const { fornecedor, insumo, quantidade } = req.body;
  if (!fornecedor || !insumo) return res.status(400).json({ erro: "Informe fornecedor e insumo." });

  const id = proximoId("compras", "PC");
  db.prepare(
    "INSERT INTO compras (id, fornecedor, insumo, quantidade, status) VALUES (?, ?, ?, ?, ?)"
  ).run(id, fornecedor, insumo, quantidade || "", "Aguardando aprovação");
  res.status(201).json({ id, fornecedor, insumo, quantidade, status: "Aguardando aprovação" });
});

app.get("/api/fornecedores", permitirPerfis("compras"), (req, res) => {
  res.json(db.prepare("SELECT * FROM fornecedores").all());
});

app.get("/api/estoque", permitirPerfis("compras", "logistica"), (req, res) => {
  res.json(db.prepare("SELECT * FROM estoque").all());
});

// ---------- LOGÍSTICA / FROTA / PROGRAMAÇÃO ----------
app.get("/api/frota", permitirPerfis("logistica"), (req, res) => {
  res.json(db.prepare("SELECT * FROM frota").all());
});

app.post("/api/programacao", permitirPerfis("logistica"), (req, res) => {
  try {
    res.json(calcularProgramacao(req.body));
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.get("/api/programacao/hoje", permitirPerfis("logistica"), (req, res) => {
  const volumeTotal = db.prepare("SELECT SUM(volume) AS total FROM vendas").get().total || 0;
  const caminhoesDisponiveis = db.prepare("SELECT COUNT(*) AS total FROM frota WHERE status != 'Manutenção'").get().total;
  const capacidadeCaminhao = db.prepare("SELECT capacidade_m3 FROM frota LIMIT 1").get()?.capacidade_m3 || 8;
  res.json(calcularProgramacao({ volumeTotal, capacidadeCaminhao, caminhoesDisponiveis }));
});

// ---------- NOTAS ----------
app.get("/api/notas", permitirPerfis("vendas", "logistica"), (req, res) => {
  res.json(db.prepare("SELECT * FROM notas ORDER BY rowid DESC").all());
});

// ---------- FINANCEIRO ----------
app.get("/api/financeiro", permitirPerfis("financeiro"), (req, res) => {
  res.json({
    receber: db.prepare("SELECT * FROM financeiro_receber").all(),
    pagar: db.prepare("SELECT * FROM financeiro_pagar").all()
  });
});

// ---------- FUNCIONÁRIOS ----------
app.get("/api/funcionarios", permitirPerfis("rh"), (req, res) => {
  res.json(db.prepare("SELECT * FROM funcionarios").all());
});

const PORTA = process.env.PORT || 3001;
app.listen(PORTA, () => {
  console.log(`ConcretoBase rodando em http://localhost:${PORTA}`);
});
