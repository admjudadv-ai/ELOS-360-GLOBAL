/* Dossiê institucional da Elos 360° Global — acesso exclusivo da CEO (Coordenadora PSP).
   Proteções:
   - só a conta da CEO entra (CEO_EMAIL, ou a conta de coordenação quando CEO_EMAIL não estiver definido);
   - verificação em duas etapas (TOTP, RFC 6238) assim que a CEO ativar no aplicativo autenticador;
   - cada documento (ficha e arquivo PDF) é criptografado com AES-256-GCM antes de ir ao banco;
   - as coleções 'dossie', 'dossiearq' e 'dossiecfg' ficam fora da API genérica (/api/c, /api/d) e do tempo real;
   - trilha de auditoria de cada ação (elos_audit). */
const crypto = require('crypto');
const express = require('express');

module.exports = function (app, { pool, audit, limited, ownerEmails }) {
  const SECRET = process.env.DOSSIE_KEY || process.env.SESSION_SECRET || '';
  const KEY = SECRET ? Buffer.from(crypto.hkdfSync('sha256', SECRET, 'elos-dossie-v1', 'documentos-ceo', 32)) : null;
  const CEO = String(process.env.CEO_EMAIL || '').trim().toLowerCase();
  const MAXB = 12 * 1024 * 1024;

  const enc = (buf) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', KEY, iv); const ct = Buffer.concat([c.update(buf), c.final()]); return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') }; };
  const dec = (o) => { const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(o.iv, 'base64')); d.setAuthTag(Buffer.from(o.tag, 'base64')); return Buffer.concat([d.update(Buffer.from(o.ct, 'base64')), d.final()]); };
  const encJ = (obj) => enc(Buffer.from(JSON.stringify(obj), 'utf8'));
  const decJ = (o) => JSON.parse(dec(o).toString('utf8'));
  const sign = (s) => crypto.createHmac('sha256', KEY).update(s).digest('base64url');
  const get = async (col, id) => { const r = await pool.query('SELECT data FROM elos_docs WHERE col=$1 AND id=$2', [col, id]); return r.rows[0] ? r.rows[0].data : null; };
  const put = (col, id, data) => pool.query('INSERT INTO elos_docs(col,id,data,updated) VALUES($1,$2,$3,$4) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated', [col, id, data, Date.now()]);
  const log = (req, acao, doc) => audit(req.user && req.user.id, 'dossie:' + acao, 'dossie', doc || null);

  /* ---------- verificação em duas etapas ---------- */
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const b32enc = (buf) => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]; return out; };
  const b32dec = (s) => { let bits = ''; for (const ch of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(ch); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
  const hotp = (key, ctr) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(ctr)); const h = crypto.createHmac('sha1', key).update(b).digest(); const off = h[h.length - 1] & 15; return String(((h.readUInt32BE(off) & 0x7fffffff) % 1e6)).padStart(6, '0'); };
  const totpOk = (secret, code) => { const k = b32dec(secret), c = Math.floor(Date.now() / 30000); code = String(code || '').replace(/\D/g, ''); if (code.length !== 6) return false; for (let w = -1; w <= 1; w++) if (crypto.timingSafeEqual(Buffer.from(hotp(k, c + w)), Buffer.from(code))) return true; return false; };
  const mfaGet = async () => { const d = await get('dossiecfg', 'mfa'); return d && d.enc ? decJ(d.enc) : {}; };
  const mfaSet = (o) => put('dossiecfg', 'mfa', { enc: encJ(o) });
  const mfaToken = (uid) => { const exp = Date.now() + 4 * 3600e3; return exp + '.' + sign('mfa-dossie.' + uid + '.' + exp); };
  const mfaValid = (req) => { const [exp, sig] = String(req.get('x-mfa') || '').split('.'); if (!exp || !sig || +exp < Date.now()) return false; const good = sign('mfa-dossie.' + req.user.id + '.' + exp); return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)); };

  const isCEO = (u) => !!(u && u.email && (CEO ? u.email.toLowerCase() === CEO : (ownerEmails.includes(u.email.toLowerCase()) && u.isOwner)));
  const ceo = (req, res, next) => {
    if (!KEY || !pool) return res.status(503).json({ erro: 'Dossiê indisponível: chave de criptografia não configurada.' });
    if (!isCEO(req.user)) { if (req.user) log(req, 'acesso-negado'); return res.status(req.user ? 403 : 401).json({ erro: 'Acesso exclusivo da CEO.' }); }
    res.set('Cache-Control', 'no-store'); next();
  };
  const ceoMfa = (req, res, next) => ceo(req, res, async () => {
    try { const m = await mfaGet(); if (m.ok && !mfaValid(req)) return res.status(401).json({ code: 'mfa', erro: 'Confirme o código do aplicativo autenticador.' }); next(); } catch (e) { next(e); }
  });

  const limpa = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n || 300);
  const CAMPOS = ['titulo', 'categoria', 'tipo', 'orgao', 'numero', 'valor', 'emissao', 'vencimento', 'situacao', 'obs', 'arquivo'];
  const ficha = (b) => { const o = {}; for (const k of CAMPOS) o[k] = limpa(b[k], k === 'obs' ? 2000 : 300); return o; };

  app.get('/api/dossie/estado', ceo, async (req, res) => {
    const m = await mfaGet();
    res.json({ ok: true, email: req.user.email, mfa: m.ok ? 'ativo' : (m.pend ? 'pendente' : 'nao'), sessao: !m.ok || mfaValid(req) });
  });
  app.post('/api/dossie/mfa/iniciar', express.json({ limit: '4kb' }), ceo, async (req, res) => {
    if (limited('dossiemfa:' + req.user.id, 10, 36e5)) return res.status(429).json({ erro: 'Aguarde um pouco.' });
    const m = await mfaGet(); if (m.ok) return res.status(409).json({ erro: 'A verificação em duas etapas já está ativa.' });
    const sec = b32enc(crypto.randomBytes(20)); await mfaSet({ pend: sec }); log(req, 'mfa-iniciado');
    res.json({ otpauth: 'otpauth://totp/Elos%20360%20Global:Dossie?secret=' + sec + '&issuer=Elos%20360%20Global&digits=6&period=30', secret: sec });
  });
  app.post('/api/dossie/mfa/verificar', express.json({ limit: '4kb' }), ceo, async (req, res) => {
    if (limited('dossiemfav:' + req.user.id, 12, 15 * 60e3)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
    const m = await mfaGet(), code = (req.body || {}).code;
    if (m.ok && totpOk(m.ok, code)) { log(req, 'mfa-entrada'); return res.json({ mfa: mfaToken(req.user.id) }); }
    if (!m.ok && m.pend && totpOk(m.pend, code)) { await mfaSet({ ok: m.pend, desde: Date.now() }); log(req, 'mfa-ativado'); return res.json({ mfa: mfaToken(req.user.id) }); }
    log(req, 'mfa-codigo-invalido'); res.status(401).json({ erro: 'Código inválido. Confira o horário do celular e tente de novo.' });
  });

  app.get('/api/dossie/docs', ceoMfa, async (req, res) => {
    const { rows } = await pool.query("SELECT id,data,updated FROM elos_docs WHERE col='dossie' ORDER BY updated");
    const out = []; for (const r of rows) { try { out.push(Object.assign({ id: r.id, atualizado: r.updated }, decJ(r.data.enc))); } catch (e) { out.push({ id: r.id, titulo: '(não foi possível abrir este registro)', erro: true }); } }
    log(req, 'listar'); res.json(out);
  });
  /* novo documento: ficha + PDF em base64 (até 12 MB) */
  app.post('/api/dossie/docs', express.json({ limit: '18mb' }), ceoMfa, async (req, res) => {
    if (limited('dossieup:' + req.user.id, 60, 36e5)) return res.status(429).json({ erro: 'Aguarde um pouco.' });
    const b = req.body || {}, f = ficha(b);
    if (!f.titulo) return res.status(400).json({ erro: 'Informe o título do documento.' });
    let meta = Object.assign(f, { criado: Date.now(), por: req.user.email });
    if (b.pdf) {
      const buf = Buffer.from(String(b.pdf).replace(/^data:[^,]*,/, ''), 'base64');
      if (!buf.length || buf.length > MAXB) return res.status(400).json({ erro: 'Arquivo vazio ou maior que 12 MB.' });
      if (buf.slice(0, 5).toString() !== '%PDF-') return res.status(400).json({ erro: 'Envie o documento em PDF.' });
      meta.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      meta.tamanho = buf.length;
      const dup = (await pool.query("SELECT id,data FROM elos_docs WHERE col='dossie'")).rows.find(r => { try { return decJ(r.data.enc).sha256 === meta.sha256; } catch { return false; } });
      if (dup) return res.status(409).json({ erro: 'Este mesmo arquivo já está no dossiê.', id: dup.id });
      meta.temArquivo = true;
      const id = 'd' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      await put('dossiearq', id, { enc: enc(buf) });
      await put('dossie', id, { enc: encJ(meta) });
      log(req, 'incluir', id); return res.json({ ok: true, id });
    }
    const id = 'd' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    await put('dossie', id, { enc: encJ(meta) }); log(req, 'incluir-ficha', id); res.json({ ok: true, id });
  });
  app.patch('/api/dossie/docs/:id', express.json({ limit: '64kb' }), ceoMfa, async (req, res) => {
    const id = String(req.params.id); if (!/^[a-z0-9]{6,40}$/.test(id)) return res.status(400).json({ erro: 'id inválido' });
    const d = await get('dossie', id); if (!d) return res.status(404).json({ erro: 'não encontrado' });
    const cur = decJ(d.enc), b = req.body || {};
    for (const k of CAMPOS) if (k in b) cur[k] = limpa(b[k], k === 'obs' ? 2000 : 300);
    cur.alterado = Date.now(); await put('dossie', id, { enc: encJ(cur) }); log(req, 'alterar', id); res.json({ ok: true });
  });
  /* abrir o PDF numa aba: link de 60 segundos, válido só para a sessão da CEO que o pediu */
  const arqSig = (uid, id, exp) => sign('arq.' + uid + '.' + id + '.' + exp);
  app.post('/api/dossie/link/:id', express.json({ limit: '1kb' }), ceoMfa, (req, res) => {
    const id = String(req.params.id); if (!/^[a-z0-9]{6,40}$/.test(id)) return res.status(400).json({ erro: 'id inválido' });
    const exp = Date.now() + 60e3; res.json({ url: '/api/dossie/arquivo/' + id + '?e=' + exp + '&s=' + arqSig(req.user.id, id, exp) });
  });
  app.get('/api/dossie/arquivo/:id', ceo, async (req, res) => {
    const id = String(req.params.id); if (!/^[a-z0-9]{6,40}$/.test(id)) return res.status(400).json({ erro: 'id inválido' });
    const exp = +req.query.e || 0, s = String(req.query.s || ''), good = arqSig(req.user.id, id, exp);
    if (exp < Date.now() || s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return res.status(401).type('text').send('Link expirado. Volte ao Dossiê e clique em Abrir de novo.');
    const [d, a] = [await get('dossie', id), await get('dossiearq', id)]; if (!d || !a) return res.status(404).json({ erro: 'arquivo não encontrado' });
    const meta = decJ(d.enc), buf = dec(a.enc);
    log(req, 'abrir-arquivo', id);
    res.removeHeader('Content-Security-Policy');
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="' + (meta.arquivo || id).replace(/[^\w.\-]/g, '_') + '"', 'Content-Security-Policy': "frame-ancestors 'none'", 'Cache-Control': 'no-store, private' });
    res.send(buf);
  });
  app.get('/api/dossie/auditoria', ceoMfa, async (req, res) => {
    const { rows } = await pool.query("SELECT t,action,doc FROM elos_audit WHERE action LIKE 'dossie:%' ORDER BY t DESC LIMIT 100");
    res.json(rows.map(r => ({ t: +r.t, acao: r.action.slice(7), doc: r.doc })));
  });
  /* próximos documentos: lista de pendências da CEO (criptografada) */
  app.get('/api/dossie/pendencias', ceoMfa, async (req, res) => { const d = await get('dossiecfg', 'pend'); res.json(d && d.enc ? decJ(d.enc) : []); });
  app.put('/api/dossie/pendencias', express.json({ limit: '64kb' }), ceoMfa, async (req, res) => {
    const arr = Array.isArray(req.body) ? req.body.slice(0, 80).map(x => ({ t: limpa(x.t, 300), d: limpa(x.d, 800), prazo: limpa(x.prazo, 40), ok: !!x.ok })) : null;
    if (!arr) return res.status(400).json({ erro: 'lista inválida' });
    await put('dossiecfg', 'pend', { enc: encJ(arr) }); log(req, 'pendencias'); res.json({ ok: true });
  });
};
