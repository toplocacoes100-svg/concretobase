// auth.js
// Autenticação simples por sessão (cookie httpOnly) — sem depender de pacotes externos.

const crypto = require("crypto");

const sessoes = new Map(); // sessionId -> { userId, usuario, nome, role, expira }
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000; // 8 horas

function hashSenha(senhaTexto) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(senhaTexto, salt, 64).toString("hex");
  return { hash, salt };
}

function senhaConfere(senhaTexto, hash, salt) {
  const tentativa = crypto.scryptSync(senhaTexto, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(tentativa, "hex"), Buffer.from(hash, "hex"));
}

function criarSessao(usuario) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  sessoes.set(sessionId, {
    userId: usuario.id,
    usuario: usuario.usuario,
    nome: usuario.nome,
    role: usuario.role,
    expira: Date.now() + DURACAO_SESSAO_MS
  });
  return sessionId;
}

function destruirSessao(sessionId) {
  sessoes.delete(sessionId);
}

function lerCookies(req) {
  const cabecalho = req.headers.cookie;
  const cookies = {};
  if (!cabecalho) return cookies;
  cabecalho.split(";").forEach(par => {
    const [k, ...v] = par.trim().split("=");
    cookies[k] = decodeURIComponent(v.join("="));
  });
  return cookies;
}

function middlewareAuth(req, res, next) {
  const cookies = lerCookies(req);
  const sessionId = cookies["cb_session"];
  const sessao = sessionId ? sessoes.get(sessionId) : null;

  if (!sessao || sessao.expira < Date.now()) {
    if (sessao) sessoes.delete(sessionId);
    return res.status(401).json({ erro: "Sessão inválida ou expirada. Faça login novamente." });
  }
  req.usuarioLogado = sessao;
  req.sessionId = sessionId;
  next();
}

// Permite a rota se o usuário for admin OU tiver um dos perfis listados
function permitirPerfis(...perfis) {
  return (req, res, next) => {
    if (req.usuarioLogado.role === "admin" || perfis.includes(req.usuarioLogado.role)) {
      return next();
    }
    return res.status(403).json({ erro: "Seu perfil não tem acesso a este módulo." });
  };
}

module.exports = { hashSenha, senhaConfere, criarSessao, destruirSessao, lerCookies, middlewareAuth, permitirPerfis };
