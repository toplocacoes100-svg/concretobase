// db/database.js
// Banco de dados persistente em arquivo, usando o módulo nativo node:sqlite (Node 22+).
// Não exige instalar nenhum pacote de banco de dados.

const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { hashSenha } = require("../auth");

const arquivoDb = path.join(__dirname, "..", "concretobase.db");
const db = new DatabaseSync(arquivoDb);

function migrar() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      role TEXT NOT NULL,
      senha_hash TEXT NOT NULL,
      senha_salt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id TEXT PRIMARY KEY,
      cliente TEXT NOT NULL,
      traco TEXT,
      volume REAL NOT NULL,
      entrega TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS compras (
      id TEXT PRIMARY KEY,
      fornecedor TEXT NOT NULL,
      insumo TEXT NOT NULL,
      quantidade TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      nome TEXT PRIMARY KEY,
      insumo TEXT,
      ultimo_preco REAL,
      unidade TEXT,
      prazo_dias INTEGER
    );

    CREATE TABLE IF NOT EXISTS estoque (
      insumo TEXT PRIMARY KEY,
      nivel INTEGER
    );

    CREATE TABLE IF NOT EXISTS frota (
      placa TEXT PRIMARY KEY,
      motorista TEXT,
      capacidade_m3 REAL,
      status TEXT,
      destino TEXT
    );

    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      pedido TEXT,
      cliente TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS financeiro_receber (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT,
      valor REAL,
      vencimento TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS financeiro_pagar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fornecedor TEXT,
      valor REAL,
      vencimento TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      funcao TEXT,
      cnh_vencimento TEXT,
      situacao TEXT
    );

    CREATE TABLE IF NOT EXISTS contadores (
      chave TEXT PRIMARY KEY,
      valor INTEGER
    );
  `);

  semear();
}

function tabelaVazia(nomeTabela) {
  const linha = db.prepare(`SELECT COUNT(*) AS total FROM ${nomeTabela}`).get();
  return linha.total === 0;
}

function semear() {
  if (tabelaVazia("usuarios")) {
    const perfis = [
      { usuario: "admin", nome: "Administrador", role: "admin", senha: "admin123" },
      { usuario: "vendas", nome: "Equipe Comercial", role: "vendas", senha: "vendas123" },
      { usuario: "compras", nome: "Equipe de Compras", role: "compras", senha: "compras123" },
      { usuario: "logistica", nome: "Equipe de Logística", role: "logistica", senha: "logistica123" },
      { usuario: "financeiro", nome: "Equipe Financeira", role: "financeiro", senha: "financeiro123" },
      { usuario: "rh", nome: "Recursos Humanos", role: "rh", senha: "rh123" }
    ];
    const inserir = db.prepare(
      "INSERT INTO usuarios (usuario, nome, role, senha_hash, senha_salt) VALUES (?, ?, ?, ?, ?)"
    );
    perfis.forEach(p => {
      const { hash, salt } = hashSenha(p.senha);
      inserir.run(p.usuario, p.nome, p.role, hash, salt);
    });
  }

  if (tabelaVazia("vendas")) {
    const inserir = db.prepare(
      "INSERT INTO vendas (id, cliente, traco, volume, entrega, status) VALUES (?, ?, ?, ?, ?, ?)"
    );
    inserir.run("PV-1042", "Construtora Alvorada", "fck 30 MPa", 32, "2026-09-04", "Em rota");
    inserir.run("PV-1041", "Obra Jardim Sul", "fck 25 MPa", 18, "2026-09-04", "Entregue");
    inserir.run("PV-1040", "Residencial Terra Nova", "fck 25 MPa", 45, "2026-09-03", "Entregue");
    inserir.run("PV-1039", "Construtora Alvorada", "fck 20 MPa", 24, "2026-09-03", "Atrasado");
    db.prepare("INSERT INTO contadores (chave, valor) VALUES ('vendas', 1043)").run();
  }

  if (tabelaVazia("compras")) {
    const inserir = db.prepare(
      "INSERT INTO compras (id, fornecedor, insumo, quantidade, status) VALUES (?, ?, ?, ?, ?)"
    );
    inserir.run("PC-330", "Cimentos Rio Verde", "Cimento CP-V", "600 sc", "Aguardando aprovação");
    inserir.run("PC-329", "Mineração Bela Vista", "Areia média", "40 m³", "Recebido");
    inserir.run("PC-328", "Aditivos Sul Química", "Plastificante", "200 L", "Em trânsito");
    db.prepare("INSERT INTO contadores (chave, valor) VALUES ('compras', 331)").run();
  }

  if (tabelaVazia("fornecedores")) {
    const inserir = db.prepare(
      "INSERT INTO fornecedores (nome, insumo, ultimo_preco, unidade, prazo_dias) VALUES (?, ?, ?, ?, ?)"
    );
    inserir.run("Cimentos Rio Verde", "Cimento CP-V", 34.9, "sc", 3);
    inserir.run("Mineração Bela Vista", "Areia / Brita", 78.0, "m³", 1);
    inserir.run("Aditivos Sul Química", "Aditivos", 12.4, "L", 5);
  }

  if (tabelaVazia("estoque")) {
    const inserir = db.prepare("INSERT INTO estoque (insumo, nivel) VALUES (?, ?)");
    inserir.run("Cimento CP-V", 18);
    inserir.run("Areia média", 64);
    inserir.run("Brita 1", 81);
    inserir.run("Aditivo plastificante", 40);
  }

  if (tabelaVazia("frota")) {
    const inserir = db.prepare(
      "INSERT INTO frota (placa, motorista, capacidade_m3, status, destino) VALUES (?, ?, ?, ?, ?)"
    );
    inserir.run("BTA-4C12", "José R.", 8, "Em rota", "Alvorada");
    inserir.run("BTA-7F90", "Marcos S.", 8, "Retornando", null);
    inserir.run("BTA-1D33", "Elias P.", 8, "Carregando", null);
    inserir.run("BTA-9K21", "Fábio T.", 8, "Manutenção", null);
    inserir.run("BTA-2M77", "Renato A.", 8, "Disponível", null);
  }

  if (tabelaVazia("notas")) {
    const inserir = db.prepare(
      "INSERT INTO notas (id, tipo, pedido, cliente, status) VALUES (?, ?, ?, ?, ?)"
    );
    inserir.run("NF-8821", "Venda", "PV-1042", "Construtora Alvorada", "Emitida");
    inserir.run("NT-2214", "Transporte", "PV-1042", "Construtora Alvorada", "Aguardando canhoto");
    inserir.run("NF-8820", "Venda", "PV-1041", "Obra Jardim Sul", "Emitida");
    inserir.run("NT-2213", "Transporte", "PV-1041", "Obra Jardim Sul", "Canhoto assinado");
  }

  if (tabelaVazia("financeiro_receber")) {
    const inserir = db.prepare(
      "INSERT INTO financeiro_receber (cliente, valor, vencimento, status) VALUES (?, ?, ?, ?)"
    );
    inserir.run("Construtora Alvorada", 48200, "2026-09-10", "A vencer");
    inserir.run("Obra Jardim Sul", 21600, "2026-09-02", "Atrasado");
    inserir.run("Residencial Terra Nova", 63000, "2026-09-15", "A vencer");
  }

  if (tabelaVazia("financeiro_pagar")) {
    const inserir = db.prepare(
      "INSERT INTO financeiro_pagar (fornecedor, valor, vencimento, status) VALUES (?, ?, ?, ?)"
    );
    inserir.run("Cimentos Rio Verde", 20940, "2026-09-08", "A vencer");
    inserir.run("Posto Estrada Nova (diesel)", 7300, "2026-09-05", "Atrasado");
  }

  if (tabelaVazia("funcionarios")) {
    const inserir = db.prepare(
      "INSERT INTO funcionarios (nome, funcao, cnh_vencimento, situacao) VALUES (?, ?, ?, ?)"
    );
    inserir.run("José R.", "Motorista betoneira", "2026-11-01", "Regular");
    inserir.run("Marcos S.", "Motorista betoneira", "2026-09-24", "Vence em breve");
    inserir.run("Elias P.", "Operador de central", null, "Regular");
    inserir.run("Fábio T.", "Motorista betoneira", "2026-06-10", "Vencida");
  }
}

function proximoId(chave, prefixo) {
  const linha = db.prepare("SELECT valor FROM contadores WHERE chave = ?").get(chave);
  const atual = linha ? linha.valor : 1;
  db.prepare(
    "INSERT INTO contadores (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = ?"
  ).run(chave, atual + 1, atual + 1);
  return `${prefixo}-${atual}`;
}

migrar();

module.exports = { db, proximoId };
