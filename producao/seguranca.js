/* Varredura diária de segurança (antivírus da plataforma)
   - integridade dos arquivos publicados (SHA-256 contra a versão que entrou no ar)
   - conteúdo malicioso gravado no banco (scripts, executáveis, mineradores, assinaturas de vírus)
   - dependências com vulnerabilidades conhecidas (base pública de avisos do npm)
   - configuração: segredos, cabeçalhos de proteção, tentativas de invasão bloqueadas
   Roda todo dia às 03:00 (horário de Brasília) e quando a administração pede. */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SKIP_DIR = new Set(['node_modules', '.git', 'data', 'tmp', '.cache']);
const SKIP_FILE = /(^|\/)(data\.json|.*\.log)$/;

function walk(dir, base, out) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of list) {
    const p = path.join(dir, e.name), rel = path.relative(base, p).split(path.sep).join('/');
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(p, base, out); }
    else if (e.isFile() && !SKIP_FILE.test(rel)) out.push(rel);
  }
  return out;
}
function hashFiles(base) {
  const m = {};
  for (const rel of walk(base, base, [])) { try { m[rel] = crypto.createHash('sha256').update(fs.readFileSync(path.join(base, rel))).digest('hex'); } catch (e) {} }
  return m;
}

/* assinaturas: cada uma com nível e descrição em português */
const SIG = [
  [/X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR/, 'critico', 'assinatura de teste de antivírus (EICAR)'],
  [/<script[\s>]/i, 'alto', 'código <script> gravado em dados'],
  [/javascript:\s*[a-z(]/i, 'alto', 'link javascript: (execução de código)'],
  [/\son(error|load|mouseover|focus|click)\s*=/i, 'alto', 'atributo de evento HTML (onerror/onload...)'],
  [/<iframe[\s>]|<object[\s>]|<embed[\s>]/i, 'alto', 'quadro ou objeto embutido'],
  [/\b(eval|Function)\s*\(\s*(atob|unescape|String\.fromCharCode)/i, 'critico', 'código ofuscado (eval + decodificação)'],
  [/document\.cookie|localStorage\.(get|set)Item\(['"](dmps_admin|elos)/i, 'critico', 'tentativa de roubo de sessão'],
  [/\b(coinhive|cryptonight|xmrig|minero\.cc|coin-hive|webminepool)\b/i, 'critico', 'minerador de criptomoeda'],
  [/(^|[^A-Za-z0-9+/])TVqQAAMAAAAEAAAA/, 'critico', 'programa executável do Windows escondido (base64)'],
  [/(^|[^A-Za-z0-9+/])f0VMRgIBAQ/, 'critico', 'programa executável Linux escondido (base64)'],
  [/\b(union\s+select|drop\s+table|insert\s+into\s+\w+\s+values|;\s*shutdown\b|xp_cmdshell)\b/i, 'medio', 'tentativa de injeção SQL'],
  [/\$\{jndi:|\{\{\s*constructor|__proto__\s*[:=]/i, 'alto', 'tentativa de exploração (JNDI / protótipo)'],
  [/data:text\/html|data:application\/(x-)?javascript/i, 'alto', 'página ou script embutido em data:'],
  [/\b(bit\.ly|tinyurl\.com|is\.gd|t\.ly|cutt\.ly)\/[A-Za-z0-9]+.*\b(senha|password|login|pix|banco|bank)\b/i, 'medio', 'link encurtado pedindo senha/pagamento (golpe)']
];

function scanValue(v, hits, where, depth) {
  if (depth > 8 || hits.length > 400) return;
  if (typeof v === 'string') {
    if (v.length > 400000) { hits.push({ nivel: 'medio', motivo: 'texto muito grande gravado (' + Math.round(v.length / 1024) + ' KB)', onde: where }); return; }
    for (const [re, nivel, motivo] of SIG) if (re.test(v)) { hits.push({ nivel, motivo, onde: where, trecho: v.slice(Math.max(0, v.search(re) - 20), v.search(re) + 60).replace(/[<>]/g, ' ') }); break; }
  } else if (Array.isArray(v)) v.forEach((x, i) => scanValue(x, hits, where + '[' + i + ']', depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) scanValue(v[k], hits, where + '.' + k, depth + 1);
}

async function auditDeps(base) {
  let pkg = {}; try { pkg = JSON.parse(fs.readFileSync(path.join(base, 'package.json'), 'utf8')); } catch (e) { return { ok: false, erro: 'package.json não encontrado' }; }
  const names = Object.keys(Object.assign({}, pkg.dependencies || {}));
  const q = {};
  const seen = new Set();
  const addPkg = (dir) => {
    let list = []; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of list) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('@')) { addPkg(path.join(dir, e.name)); continue; }
      try { const j = JSON.parse(fs.readFileSync(path.join(dir, e.name, 'package.json'), 'utf8')); if (j.name && j.version && !seen.has(j.name + '@' + j.version)) { seen.add(j.name + '@' + j.version); (q[j.name] = q[j.name] || []).push(j.version); } } catch (x) {}
    }
  };
  addPkg(path.join(base, 'node_modules'));
  const total = Object.keys(q).length;
  if (!total) return { ok: true, pacotes: 0, vulneraveis: [], nota: 'sem pacotes instalados para verificar', diretas: names };
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q), signal: ctl.signal });
    clearTimeout(tm);
    if (!r.ok) return { ok: false, pacotes: total, erro: 'base de avisos indisponível (HTTP ' + r.status + ')' };
    const j = await r.json();
    const vul = [];
    for (const [name, arr] of Object.entries(j || {})) for (const a of arr || []) vul.push({ pacote: name, gravidade: a.severity || '', titulo: String(a.title || '').slice(0, 160), faixa: a.vulnerable_versions || '', url: a.url || '' });
    const ord = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
    vul.sort((a, b) => (ord[a.gravidade] ?? 5) - (ord[b.gravidade] ?? 5));
    return { ok: true, pacotes: total, vulneraveis: vul.slice(0, 60) };
  } catch (e) { return { ok: false, pacotes: total, erro: 'não foi possível consultar a base de avisos agora' }; }
}

/* opts: { nome, base, listDocs: async()=>[{col,id,data}], load: async()=>obj|null, save: async(obj)=>void,
           config: ()=>[{item,ok,nota}], escudo: ()=>({bloqueios,...}), log } */
function create(opts) {
  const S = { baseline: null, at: null, running: null, last: null };
  const log = opts.log || ((...a) => console.log('[seguranca]', ...a));
  setTimeout(() => { try { S.baseline = hashFiles(opts.base); S.at = new Date().toISOString(); } catch (e) {} }, 1500).unref?.();

  async function run(motivo) {
    if (S.running) return S.running;
    S.running = (async () => {
      const t0 = Date.now(), res = { plataforma: opts.nome, inicio: new Date(t0).toISOString(), motivo: motivo || 'agendada', achados: [] };
      // 1) integridade dos arquivos
      try {
        if (!S.baseline) { S.baseline = hashFiles(opts.base); S.at = new Date().toISOString(); }
        const now = hashFiles(opts.base), mod = [], novo = [], fora = [];
        for (const [f, h] of Object.entries(now)) { if (!(f in S.baseline)) novo.push(f); else if (S.baseline[f] !== h) mod.push(f); }
        for (const f of Object.keys(S.baseline)) if (!(f in now)) fora.push(f);
        res.arquivos = { verificados: Object.keys(now).length, alterados: mod, novos: novo, removidos: fora, referencia: S.at };
        mod.forEach(f => res.achados.push({ nivel: 'critico', area: 'Arquivos', motivo: 'arquivo publicado foi alterado depois de entrar no ar', onde: f }));
        novo.forEach(f => res.achados.push({ nivel: 'alto', area: 'Arquivos', motivo: 'arquivo novo apareceu no servidor', onde: f }));
        fora.forEach(f => res.achados.push({ nivel: 'medio', area: 'Arquivos', motivo: 'arquivo publicado sumiu', onde: f }));
      } catch (e) { res.arquivos = { erro: 'falha na verificação de arquivos' }; }
      // 2) banco de dados
      try {
        const docs = await opts.listDocs(); let n = 0; const hits = [];
        for (const d of docs) { n++; const h = []; scanValue(d.data, h, d.col + '/' + d.id, 0); h.forEach(x => hits.push(Object.assign({ area: 'Banco de dados' }, x))); if (hits.length > 400) break; }
        res.banco = { registros: n, suspeitos: hits.length };
        hits.slice(0, 120).forEach(x => res.achados.push(x));
      } catch (e) { res.banco = { erro: 'falha ao ler o banco' }; }
      // 3) dependências
      res.dependencias = await auditDeps(opts.base);
      (res.dependencias.vulneraveis || []).forEach(v => res.achados.push({ nivel: v.gravidade === 'critical' ? 'critico' : v.gravidade === 'high' ? 'alto' : v.gravidade === 'moderate' ? 'medio' : 'baixo', area: 'Dependências', motivo: v.titulo, onde: v.pacote + ' ' + v.faixa, url: v.url }));
      // 4) configuração e escudo
      try { res.config = opts.config ? opts.config() : []; res.config.filter(c => !c.ok).forEach(c => res.achados.push({ nivel: c.nivel || 'medio', area: 'Configuração', motivo: c.item, onde: c.nota || '' })); } catch (e) { res.config = []; }
      try { res.escudo = opts.escudo ? opts.escudo() : null; } catch (e) { res.escudo = null; }
      const c = { critico: 0, alto: 0, medio: 0, baixo: 0 }; res.achados.forEach(a => { c[a.nivel] = (c[a.nivel] || 0) + 1; });
      res.contagem = c;
      res.situacao = c.critico ? 'critico' : c.alto ? 'atencao' : c.medio ? 'observar' : 'protegido';
      res.fim = new Date().toISOString(); res.duracao_ms = Date.now() - t0;
      let hist = [];
      try { const prev = await opts.load(); hist = (prev && prev.historico) || []; } catch (e) {}
      hist.unshift({ data: res.fim, situacao: res.situacao, contagem: c, motivo: res.motivo });
      const doc = { ultima: res, historico: hist.slice(0, 60) };
      try { await opts.save(doc); } catch (e) {}
      S.last = doc;
      log('varredura concluída:', res.situacao, JSON.stringify(c));
      return doc;
    })().finally(() => { S.running = null; });
    return S.running;
  }

  function msAteProxima() { // 03:00 em Brasília = 06:00 UTC
    const n = new Date(), t = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 6, 0, 0));
    if (t <= n) t.setUTCDate(t.getUTCDate() + 1);
    return t - n;
  }
  function agenda() { const ms = msAteProxima(); S.proxima = new Date(Date.now() + ms).toISOString(); const tm = setTimeout(() => { run('agendada (diária)').catch(() => {}).finally(agenda); }, ms); tm.unref?.(); }
  agenda();
  // ao subir: se a última varredura tem mais de 24 h, faz uma depois de 3 minutos
  const boot = setTimeout(async () => { try { const p = await opts.load(); const d = p && p.ultima && Date.parse(p.ultima.fim); if (!d || Date.now() - d > 24 * 3600e3) run('ao iniciar o servidor'); else S.last = p; } catch (e) { run('ao iniciar o servidor'); } }, 180000); boot.unref?.();

  async function status() { let d = S.last; if (!d) { try { d = await opts.load(); } catch (e) {} } return Object.assign({ executando: !!S.running, proxima: S.proxima, referencia_arquivos: S.at }, d || { ultima: null, historico: [] }); }
  return { run, status };
}
module.exports = { create, scanValue, hashFiles };
