'use strict';
/*
 * Elos 360° Global — servidor de produção
 * Responsável: Coordenadora Patrícia Santos Pereira
 *
 * - Banco PostgreSQL (DATABASE_URL), um armazém de documentos por coleção.
 * - Login próprio: senha com Argon2id, sessão em cookie assinado (HttpOnly, SameSite=Lax).
 * - Regras de acesso por coleção, iguais às do sistema integrado.
 * - Tempo real por Server-Sent Events.
 * - Serve o sistema Elos (pasta public/).
 */
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const argon2 = require('argon2');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 10000);
const OWNER_EMAILS = String(process.env.OWNER_EMAILS || process.env.OWNER_EMAIL || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SECRET = process.env.SESSION_SECRET || '';
const AI_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
const SESSION_DAYS = 14;

if (!SECRET || SECRET.length < 32) {
  console.warn('[elos] SESSION_SECRET ausente ou curto: defina um segredo com 32+ caracteres.');
}

/* ---------- banco ---------- */
function sslFor(url) {
  if (process.env.PGSSL === 'off') return false;
  if (process.env.PGSSL === 'on') return { rejectUnauthorized: false };
  try {
    const h = new URL(url).hostname;
    if (!h || h === 'localhost' || h === '127.0.0.1' || !h.includes('.')) return false; // rede interna do Render ou local
  } catch { return false; }
  return { rejectUnauthorized: false };
}
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslFor(process.env.DATABASE_URL),
      max: 10,
    })
  : null;
let dbReady = false;

async function migrate() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS elos_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      pass_hash TEXT NOT NULL,
      created BIGINT NOT NULL,
      last_login BIGINT
    );
    CREATE TABLE IF NOT EXISTS elos_docs (
      col TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated BIGINT NOT NULL,
      PRIMARY KEY (col, id)
    );
    CREATE TABLE IF NOT EXISTS elos_audit (
      t BIGINT NOT NULL,
      uid TEXT,
      action TEXT NOT NULL,
      col TEXT,
      doc TEXT
    );
  `);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM elos_docs');
  if (rows[0].n === 0) {
    const seedFile = path.join(__dirname, 'seed.json');
    if (fs.existsSync(seedFile)) {
      const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
      for (const d of seed) {
        await pool.query('INSERT INTO elos_docs(col,id,data,updated) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [d.col, d.id, d.data, Date.now()]);
      }
      console.log('[elos] dados iniciais carregados:', seed.length);
    }
  }
  dbReady = true;
}

/* ---------- regras de acesso (iguais às do sistema integrado) ---------- */
const LV = { anon: 0, view: 1, interact: 2, admin: 3, owner: 4 };
const DEFAULT_RULE = { read: 'view', write: 'interact' };
const RULES = {
  perm: { read: 'view', write: 'admin' },
  pedidos: { read: 'admin', write: 'admin' },
  'pedidos/{self}': { read: 'view', write: 'view' },
  perfil: { read: 'view', write: 'admin' },
  'perfil/{self}': { read: 'view', write: 'view' },
  leads: { read: 'admin', write: 'admin' },
  'leads/{self}': { read: 'view', write: 'view' },
  evt: { read: 'anon', write: 'interact' },
  cfg: { read: 'anon', write: 'interact' },
  forum: { read: 'view', write: 'interact' },
  resp: { read: 'view', write: 'interact' },
  areas: { read: 'view', write: 'interact' },
};
for (const c of ['prj', 'tsk', 'msg', 'evp', 'parceiros', 'jovens', 'empresas', 'vagas', 'projetos', 'avaliacoes', 'atividade', 'paises']) {
  RULES[c] = { read: 'interact', write: 'interact' };
}
for (const m of ['fin', 'con', 'for', 'crm', 'rh', 'est', 'jur', 'doc', 'fis', 'cad', 'log', 'ati', 'eve']) {
  RULES['r_' + m] = { read: 'interact', write: 'interact' };
}
const NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
const ruleFor = (col, id, uid) => (uid && id === uid && RULES[col + '/{self}']) || RULES[col] || DEFAULT_RULE;
const can = (lvl, need) => LV[lvl] >= LV[need];

/* ---------- sessão ---------- */
const b64u = b => Buffer.from(b).toString('base64url');
const sign = s => crypto.createHmac('sha256', SECRET || 'dev-only').update(s).digest('base64url');
function makeToken(uid) {
  const p = b64u(JSON.stringify({ uid, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return p + '.' + sign(p);
}
function readToken(t) {
  if (!t || typeof t !== 'string') return null;
  const [p, s] = t.split('.');
  if (!p || !s) return null;
  const a = Buffer.from(sign(p)), b = Buffer.from(s);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString());
    return o.exp > Date.now() ? o.uid : null;
  } catch { return null; }
}
const cookieOf = (req, n) => {
  const m = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(n + '='));
  return m ? decodeURIComponent(m.slice(n.length + 1)) : '';
};
const secureReq = req => req.secure || req.headers['x-forwarded-proto'] === 'https';
function setSession(req, res, uid) {
  const v = uid ? makeToken(uid) : '';
  res.setHeader('Set-Cookie', `elos_s=${encodeURIComponent(v)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${uid ? SESSION_DAYS * 86400 : 0}${secureReq(req) ? '; Secure' : ''}`);
}

async function currentUser(req) {
  const uid = readToken(cookieOf(req, 'elos_s'));
  if (!uid || !pool) return null;
  const { rows } = await pool.query('SELECT id,email,name FROM elos_users WHERE id=$1', [uid]);
  if (!rows[0]) return null;
  const u = rows[0];
  u.isOwner = OWNER_EMAILS.includes(u.email.toLowerCase());
  if (u.isOwner) u.level = 'owner';
  else {
    const p = await pool.query("SELECT data FROM elos_docs WHERE col='perm' AND id=$1", [u.id]);
    u.level = p.rows[0] && p.rows[0].data && p.rows[0].data.ativo !== false ? 'interact' : 'view';
  }
  return u;
}

/* ---------- tempo real ---------- */
const clients = new Set();
function broadcast(col) {
  const msg = `data: ${JSON.stringify({ col })}\n\n`;
  for (const c of clients) if (!c.cols || c.cols.has(col)) c.res.write(msg);
}

/* ---------- limite de tentativas ---------- */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(), h = (hits.get(key) || []).filter(t => now - t < windowMs);
  h.push(now); hits.set(key, h);
  return h.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (!h.some(t => now - t < 36e5)) hits.delete(k); }, 6e5).unref();

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (secureReq(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' mailto:");
  next();
});
app.use(express.json({ limit: '1mb' }));

/* CSRF: toda escrita exige o cabeçalho X-Elos (navegadores não o enviam entre sites sem CORS) */
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('X-Elos') !== '1') return res.status(403).json({ error: 'csrf' });
  next();
});
app.use('/api', async (req, res, next) => {
  try { req.user = await currentUser(req); req.level = req.user ? req.user.level : 'anon'; next(); }
  catch (e) { next(e); }
});
const needDb = (req, res, next) => (pool && dbReady ? next() : res.status(503).json({ error: 'banco indisponível' }));
const audit = (uid, action, col, doc) => pool && pool.query('INSERT INTO elos_audit(t,uid,action,col,doc) VALUES($1,$2,$3,$4,$5)', [Date.now(), uid || null, action, col || null, doc || null]).catch(() => {});

app.get('/health', async (req, res) => {
  if (req.query.contas !== undefined && pool && dbReady) { try { const r = await pool.query('SELECT count(*)::int n FROM elos_users'); return res.json({ ok: true, contas: r.rows[0].n }); } catch {} }
  let db = 'não configurado';
  if (pool) { try { await pool.query('SELECT 1'); db = dbReady ? 'ok' : 'iniciando'; } catch { db = 'erro'; } }
  res.json({ ok: true, sistema: 'Elos 360° Global', db });
});

app.get('/api/me', (req, res) => {
  const u = req.user;
  res.json(u ? { id: u.id, email: u.email, name: u.name, level: u.level, isOwner: u.isOwner, ai: !!AI_KEY } : { id: null, level: 'anon', ai: false });
});

const validEmail = e => typeof e === 'string' && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
app.post('/api/register', needDb, async (req, res) => {
  const ip = req.ip;
  if (limited('reg:' + ip, 10, 36e5)) return res.status(429).json({ error: 'Muitas tentativas. Tente mais tarde.' });
  const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim().slice(0, 120), pass = String(req.body.pass || '');
  if (!validEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });
  if (pass.length < 10) return res.status(400).json({ error: 'A senha precisa ter pelo menos 10 caracteres.' });
  const hash = await argon2.hash(pass, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const id = 'u_' + crypto.randomBytes(12).toString('base64url');
  try {
    await pool.query('INSERT INTO elos_users(id,email,name,pass_hash,created) VALUES($1,$2,$3,$4,$5)', [id, email, name, hash, Date.now()]);
  } catch (e) {
    return res.status(409).json({ error: 'Este e-mail já tem conta. Use Entrar.' });
  }
  audit(id, 'register');
  console.log(`[elos] novo cadastro (${OWNER_EMAILS.includes(email) ? 'coordenação' : 'membro'})`);
  setSession(req, res, id);
  res.json({ ok: true });
});

app.post('/api/login', needDb, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(), pass = String(req.body.pass || '');
  if (limited('login:' + req.ip, 20, 9e5) || limited('login:' + email, 8, 9e5)) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
  const { rows } = await pool.query('SELECT id,pass_hash FROM elos_users WHERE email=$1', [email]);
  const ok = rows[0] ? await argon2.verify(rows[0].pass_hash, pass).catch(() => false) : (await argon2.hash(pass || 'x').catch(() => 0), false);
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  await pool.query('UPDATE elos_users SET last_login=$2 WHERE id=$1', [rows[0].id, Date.now()]);
  audit(rows[0].id, 'login');
  console.log(`[elos] entrada na conta (${OWNER_EMAILS.includes(email) ? 'coordenação' : 'membro'})`);
  setSession(req, res, rows[0].id);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => { setSession(req, res, null); res.json({ ok: true }); });

app.post('/api/password', needDb, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Entre primeiro.' });
  const { rows } = await pool.query('SELECT pass_hash FROM elos_users WHERE id=$1', [req.user.id]);
  const ok = await argon2.verify(rows[0].pass_hash, String(req.body.old || '')).catch(() => false);
  if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });
  const np = String(req.body.pass || '');
  if (np.length < 10) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 10 caracteres.' });
  await pool.query('UPDATE elos_users SET pass_hash=$2 WHERE id=$1', [req.user.id, await argon2.hash(np, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })]);
  audit(req.user.id, 'password');
  res.json({ ok: true });
});

/* perfis: nomes para todos os membros; e-mail só para a coordenação */
app.post('/api/profiles', needDb, async (req, res) => {
  if (!can(req.level, 'view')) return res.status(401).json({});
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter(x => typeof x === 'string').slice(0, 200);
  if (!ids.length) return res.json({});
  const { rows } = await pool.query('SELECT id,name,email FROM elos_users WHERE id = ANY($1)', [ids]);
  const out = {};
  for (const r of rows) out[r.id] = req.level === 'owner' ? { name: r.name, email: r.email } : { name: r.name };
  res.json(out);
});
app.get('/api/users', needDb, async (req, res) => {
  if (req.level !== 'owner') return res.status(403).json([]);
  const q = '%' + String(req.query.q || '').toLowerCase().replace(/[%_]/g, '') + '%';
  const { rows } = await pool.query('SELECT id,name,email FROM elos_users WHERE lower(email) LIKE $1 OR lower(name) LIKE $1 ORDER BY created DESC LIMIT 50', [q]);
  res.json(rows);
});

/* documentos */
function checkName(req, res, next) {
  if (!NAME_RE.test(req.params.col) || (req.params.id !== undefined && !NAME_RE.test(req.params.id))) return res.status(400).json({ error: 'nome inválido' });
  next();
}
app.get('/api/c/:col', needDb, checkName, async (req, res) => {
  const col = req.params.col, uid = req.user && req.user.id;
  const r = ruleFor(col, null, uid);
  if (can(req.level, r.read)) {
    const { rows } = await pool.query('SELECT id,data FROM elos_docs WHERE col=$1 ORDER BY updated', [col]);
    return res.json(rows);
  }
  const self = RULES[col + '/{self}'];
  if (uid && self && can(req.level, self.read)) {
    const { rows } = await pool.query('SELECT id,data FROM elos_docs WHERE col=$1 AND id=$2', [col, uid]);
    return res.json(rows);
  }
  res.status(req.user ? 403 : 401).json({ error: 'sem acesso' });
});
app.get('/api/d/:col/:id', needDb, checkName, async (req, res) => {
  const { col, id } = req.params;
  if (!can(req.level, ruleFor(col, id, req.user && req.user.id).read)) return res.status(req.user ? 403 : 401).json({ error: 'sem acesso' });
  const { rows } = await pool.query('SELECT data FROM elos_docs WHERE col=$1 AND id=$2', [col, id]);
  res.json(rows[0] ? { exists: true, data: rows[0].data } : { exists: false });
});
async function write(req, res, mode) {
  const { col, id } = req.params;
  if (!can(req.level, ruleFor(col, id, req.user && req.user.id).write)) return res.status(req.user ? 403 : 401).json({ error: 'sem permissão' });
  if (mode !== 'delete' && (typeof req.body !== 'object' || Array.isArray(req.body) || req.body === null)) return res.status(400).json({ error: 'dados inválidos' });
  const now = Date.now();
  if (mode === 'delete') await pool.query('DELETE FROM elos_docs WHERE col=$1 AND id=$2', [col, id]);
  else if (mode === 'set') await pool.query('INSERT INTO elos_docs(col,id,data,updated) VALUES($1,$2,$3,$4) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated', [col, id, req.body, now]);
  else {
    const r = await pool.query('UPDATE elos_docs SET data = data || $3::jsonb, updated=$4 WHERE col=$1 AND id=$2', [col, id, req.body, now]);
    if (!r.rowCount) return res.status(404).json({ error: 'não encontrado' });
  }
  audit(req.user && req.user.id, mode, col, id);
  broadcast(col);
  res.json({ ok: true });
}
app.put('/api/d/:col/:id', needDb, checkName, (req, res, next) => write(req, res, 'set').catch(next));
app.patch('/api/d/:col/:id', needDb, checkName, (req, res, next) => write(req, res, 'update').catch(next));
app.delete('/api/d/:col/:id', needDb, checkName, (req, res, next) => write(req, res, 'delete').catch(next));

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  const cols = req.query.cols ? new Set(String(req.query.cols).split(',').filter(c => NAME_RE.test(c))) : null;
  const c = { res, cols };
  clients.add(c);
  res.write('retry: 3000\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(c); });
});

/* inteligência artificial (opcional: só com ANTHROPIC_API_KEY) */
app.post('/api/ai', async (req, res) => {
  if (!AI_KEY) return res.status(503).json({ error: 'IA não configurada' });
  if (!can(req.level, 'interact')) return res.status(403).json({ error: 'sem permissão' });
  if (limited('ai:' + req.user.id, 30, 36e5)) return res.status(429).json({ error: 'Limite de uso da IA atingido nesta hora.' });
  const prompt = String(req.body.prompt || '').slice(0, 12000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    const text = (j.content || []).map(b => b.text || '').join('').trim();
    if (!r.ok || !text) return res.status(502).json({ error: 'IA indisponível' });
    res.json({ text });
  } catch { res.status(502).json({ error: 'IA indisponível' }); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'não encontrado' }));

/* sistema Elos */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'site.html')));
app.get('/sistema', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '5m', index: false }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error('[elos] erro:', err && err.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'erro interno' });
});

app.listen(PORT, () => console.log(`[elos] Elos 360° Global no ar na porta ${PORT}`));
(async function connectDb(attempt = 1) {
  if (!pool) return console.log('[elos] banco: não configurado');
  try {
    await migrate();
    console.log('[elos] banco: ok');
  } catch (e) {
    const wait = Math.min(60, 5 * attempt);
    console.error(`[elos] banco indisponível (${e.message}); nova tentativa em ${wait}s`);
    setTimeout(() => connectDb(attempt + 1), wait * 1000);
  }
})();

module.exports = app;
