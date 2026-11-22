/* Elos 360° Global — Elora (inteligência da Elos), abertura, conexões entre janelas,
   links interativos e acesso às redes sociais. Responsável: Coordenadora PSP. */
(function () {
  'use strict';
  if (window.__elora) return; window.__elora = 1;

  /* ---------- configuração ---------- */
  var WA_NUM = '5511981653110';                       // WhatsApp de cadastro: (11) 98165-3110
  var WA_TXT = 'Olá! Quero me cadastrar na Elos 360° Global.';
  var EMAIL = 'contato@elos360global.com.br';
  // perfis oficiais: preencha quando as páginas estiverem criadas (deixe '' para usar o compartilhamento)
  var PERFIS = { instagram: 'https://www.instagram.com/elos360global/', facebook: '', linkedin: '', tiktok: '', youtube: '', x: '', threads: '' };

  var D0 = document, W = window, IS_SYS = !!D0.getElementById('m') && typeof W.route === 'function';
  var SITE_URL = location.origin + (IS_SYS ? '/sistema' : '/');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(h) { var d = D0.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function safe(f, d) { try { return f(); } catch (e) { return d; } }

  /* ---------- catálogo de janelas (vem do próprio sistema) ---------- */
  var WIN = {};
  function addWin(id, i, n, d) { if (id && !WIN[id]) WIN[id] = { id: id, i: i || '•', n: n || id, d: d || '' }; }
  function buildWin() {
    if (!IS_SYS) return;
    safe(function () { mapItems().forEach(function (x) { addWin(x[0], x[1], x[2], x[3]); }); });
    safe(function () { M.forEach(function (m) { addWin(m.id, m.i, m.n, 'Módulo de gestão integrado'); }); });
    safe(function () { SET.forEach(function (s) { addWin('s-' + s[0], s[2], s[1], 'Setor: tarefas, módulos e equipe'); }); });
    [['', '🏠', 'Início', 'Banner com todos os setores e caminhos rápidos'], ['mapa', '🗺️', 'Mapa do sistema', 'Todas as janelas por objetivo'], ['eventos', '🌍', 'Eventos Globais', 'Congressos, feiras, exposições e simpósios'], ['medicina', '🩺', 'Congressos médicos', 'Todas as especialidades no mundo'], ['rastreamento', '🚚', 'Transportadoras e logística', 'Rastreamento de frotas em todo o Brasil'], ['comunidade', '🌎', 'Comunidade Profissional', 'Áreas profissionais do mundo em conexão'], ['oport', '💼', 'Mural de Oportunidades', 'Negócios, parcerias e investimentos'], ['one', '🌐', 'Elos One System 360°', 'Todos os setores numa visão integrada'], ['terras', '🧲', 'Terras raras no Brasil', 'Projetos e negociações'], ['pasta-andamento', '🔄', 'Projetos em andamento', 'Pasta integrada de projetos'], ['pasta-novo', '🆕', 'Novos projetos', 'Pasta integrada de projetos'], ['evminhas', '📌', 'Meus eventos', 'Interesses e contratações em eventos'], ['ti', '💻', 'TI & Dados', 'Servidor, segurança e dados']].forEach(function (x) { addWin(x[0], x[1], x[2], x[3]); });
  }

  /* ---------- conexões entre janelas e módulos ---------- */
  var REL = {
    '': ['network', 'eventos', 'fiscal', 'oport', 'previdencia', 'programas', 'comunidade'],
    mapa: ['', 'bemvindo', 'network', 'eventos', 'fiscal', 'contato'],
    network: ['pasta-andamento', 'pasta-novo', 'novo', 'central', 'comunidade', 'oport', 'crm'],
    pasta: ['network', 'novo', 'central', 'setores', 'painel'], novo: ['network', 'setores', 'central', 'fin', 'con'],
    p: ['network', 'central', 'setores', 'fin', 'con', 'doc', 'painel'],
    central: ['network', 'setores', 'painel', 'one'], painel: ['fin', 'cob', 'ban', 'central', 'network', 'one'],
    one: ['setores', 'painel', 'fiscal', 'cad', 'log', 'programas'], setores: ['central', 'network', 'painel', 'one'],
    fiscal: ['fis', 'previdencia', 'paises', 'mercados', 'banco', 'pais'], fis: ['fiscal', 'fin', 'ban', 'doc'],
    previdencia: ['fiscal', 'rh', 'jur', 'documentos', 'contato'], banco: ['cobranca', 'mercados', 'fin', 'fis'], ban: ['cob', 'fin', 'mercados', 'fis'],
    cobranca: ['banco', 'fin', 'jur', 'con', 'crm'], cob: ['ban', 'fin', 'jur', 'con', 'crm'], mercados: ['banco', 'fiscal', 'paises', 'oport'],
    fin: ['ban', 'cob', 'con', 'fis', 'painel'], con: ['jur', 'doc', 'for', 'fin'], for: ['con', 'est', 'log'],
    crm: ['network', 'oport', 'contato', 'leads', 'comunidade'], rh: ['previdencia', 'jur', 'doc'], est: ['for', 'log', 'ati'],
    jur: ['con', 'doc', 'previdencia', 's-adm'], doc: ['documentos', 'jur', 'con'], cad: ['terras', 'terrasafrica', 'prog-min', 'log', 'fis'],
    log: ['rastreamento', 'cad', 'est', 'for'], eve: ['s-soc', 'social', 'eventos'], ati: ['est', 'cad', 'for'],
    eventos: ['medicina', 'festas', 'oport', 'contato', 'evminhas'], ev: ['eventos', 'evminhas', 'contato'], evnovo: ['eventos', 'evminhas'], evminhas: ['eventos', 'medicina', 'oport'],
    medicina: ['eventos', 'oport', 'contato'], rastreamento: ['log', 'contato', 'oport', 'con'],
    contato: ['leads', 'crm', 'convite', 'bemvindo'], leads: ['crm', 'contato', 'network'],
    oport: ['comunidade', 'network', 'crm', 'mercados'], comunidade: ['oport', 'perfil', 'network'], g: ['comunidade', 'oport', 'perfil'], area: ['comunidade', 'oport', 'perfil'],
    perfil: ['comunidade', 'bemvindo', 'oport'], bemvindo: ['perfil', 'mapa', 'contato'],
    programas: ['prog-min', 'prog-mul', 'social', 'terras', 's-soc', 'one'], 'prog-min': ['cad', 'terras', 'terrasafrica', 'mulheres', 'programas'],
    'prog-mul': ['mulheres', 's-edu', 's-soc', 'programas'], mulheres: ['prog-mul', 'prog-min', 'social'],
    terras: ['terrasafrica', 'cad', 'prog-min', 'mercados'], terrasafrica: ['terras', 'cad', 'paises'],
    social: ['s-soc', 'eve', 'eventos', 'programas'], festas: ['eventos', 'for', 'contato'],
    engenharia: ['energia', 'for', 'con', 'oport'], energia: ['engenharia', 'paises', 'oport'],
    documentos: ['doc', 'previdencia', 'contato'], paises: ['pais', 'fiscal', 'mercados', 'social'], pais: ['fiscal', 'mercados', 'paises', 'oport'],
    acessos: ['perfil', 'leads', 'ti'], convite: ['contato', 'app'], app: ['convite', 'contato'], ti: ['acessos', 'central']
  };
  function curKey() { var h = decodeURIComponent(location.hash.slice(1)); if (REL[h] || WIN[h]) return h; var i = h.indexOf('-'); return i < 0 ? h : h.slice(0, i); }
  function relOf(k) {
    var h = decodeURIComponent(location.hash.slice(1));
    var r = REL[h] || REL[k];
    if (!r && /^s-/.test(h)) { var s = h.slice(2); r = (safe(function () { return SMOD[s]; }, []) || []).slice(0, 5).concat(['network', 'central']); }
    return (r || ['', 'mapa', 'network']).filter(function (x) { return WIN[x] && x !== h; }).slice(0, 7);
  }
  function countOf(id) {
    return safe(function () {
      if (id === 'network' || id === 'pasta-andamento' || id === 'pasta-novo') return X.prj.filter(function (p) { return id === 'network' || p.pasta === id.slice(6); }).length;
      if (id === 'central') return X.msg.length; if (id === 'setores') return X.tsk.filter(function (t) { return t.status !== 'feita'; }).length;
      if (id === 'oport') return X.forum.filter(function (p) { return p.tipo !== 'conv'; }).length;
      if (id === 'comunidade') return allAreas().length;
      if (M.some(function (m) { return m.id === id; })) return D(id).length;
      return null;
    }, null);
  }
  function title() { var h = D0.querySelector('#m h2'); return (h ? h.textContent : (WIN[curKey()] || {}).n || D0.title).trim().slice(0, 90); }

  /* ---------- redes sociais ---------- */
  function waLink(t) { return 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(t || WA_TXT); }
  function nets() {
    var u = encodeURIComponent(SITE_URL), tx = encodeURIComponent('Elos 360° Global — Conexões que transformam vidas');
    return [
      ['wa', 'WhatsApp · Cadastro', '#25D366', waLink(), 'wa'],
      ['ig', 'Instagram @elos360global', 'linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)', PERFIS.instagram || 'https://www.instagram.com/', PERFIS.instagram ? '' : 'copy'],
      ['fb', 'Facebook', '#1877F2', PERFIS.facebook || 'https://www.facebook.com/sharer/sharer.php?u=' + u, ''],
      ['in', 'LinkedIn', '#0A66C2', PERFIS.linkedin || 'https://www.linkedin.com/sharing/share-offsite/?url=' + u, ''],
      ['x', 'X (Twitter)', '#000', PERFIS.x || 'https://twitter.com/intent/tweet?url=' + u + '&text=' + tx, ''],
      ['tg', 'Telegram', '#229ED9', 'https://t.me/share/url?url=' + u + '&text=' + tx, ''],
      ['tt', 'TikTok', '#111', PERFIS.tiktok || 'https://www.tiktok.com/', PERFIS.tiktok ? '' : 'copy'],
      ['yt', 'YouTube', '#FF0000', PERFIS.youtube || 'https://www.youtube.com/', PERFIS.youtube ? '' : 'copy'],
      ['th', 'Threads', '#000', PERFIS.threads || 'https://www.threads.net/intent/post?text=' + tx + '%20' + u, ''],
      ['wsh', 'Compartilhar no WhatsApp', '#128C7E', 'https://wa.me/?text=' + tx + '%20' + u, ''],
      ['em', 'E-mail', '#0b3a82', 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Cadastro na Elos 360° Global'), ''],
      ['cp', 'Copiar link', '#5b6b82', '#', 'copylink']
    ];
  }
  var ICO = {
    wa: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/>',
    ig: '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM21 7.1c-.1-1.6-.4-3-1.6-4.2S16.6 1.4 15 1.3C13.3 1.2 10.7 1.2 9 1.3c-1.6.1-3 .4-4.2 1.6S3.2 5.6 3.1 7.2C3 8.9 3 15.1 3.1 16.8c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.7.1 6.9.1 8.6 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.7.1-8 0-9.7Zm-2.2 11.6c-.4.9-1 1.5-1.9 1.9-1.3.5-4.4.4-5.9.4s-4.6.1-5.9-.4a3.4 3.4 0 0 1-1.9-1.9C2.7 17.4 2.8 14.3 2.8 12.8s-.1-4.6.4-5.9c.4-.9 1-1.5 1.9-1.9 1.3-.5 4.4-.4 5.9-.4s4.6-.1 5.9.4c.9.4 1.5 1 1.9 1.9.5 1.3.4 4.4.4 5.9s.1 4.6-.4 5.9Z"/>',
    fb: '<path d="M14 8V6.2c0-.8.5-1 .9-1H17V1.5h-3.1C10.6 1.5 10 4 10 5.6V8H8v3.8h2V22h4V11.8h2.8L17.2 8H14Z"/>',
    in: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm7 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-4.95c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-4V9.75Z"/>',
    x: '<path d="M17.8 2.5h3.1l-6.8 7.8 8 10.6h-6.3l-4.9-6.4-5.6 6.4H2.2l7.3-8.3L1.8 2.5h6.4l4.4 5.9 5.2-5.9Zm-1.1 16.5h1.7L7.4 4.3H5.5L16.7 19Z"/>',
    tg: '<path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2 1.8 11.7c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3Z"/>',
    tt: '<path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.2v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.6a5.8 5.8 0 1 0 5 5.8V9.1a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z"/>',
    yt: '<path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-4.8.5-4.8s0-3.2-.5-4.8ZM9.8 15V9l5.8 3-5.8 3Z"/>',
    th: '<path d="M16.7 11.1c-.1 0-.2-.1-.3-.1-.2-3-1.8-4.7-4.6-4.7-1.6 0-3 .7-3.9 2l1.5 1.1c.6-.9 1.6-1.1 2.4-1.1 1 0 1.7.3 2.2.9.3.4.6 1 .7 1.8a12 12 0 0 0-2.8-.1c-2.8.2-4.6 1.8-4.5 4.1.1 1.2.7 2.2 1.7 2.8.8.6 1.9.8 3 .8 1.5-.1 2.6-.6 3.4-1.6.6-.8 1-1.8 1.2-3 .7.4 1.2 1 1.5 1.6.5 1.2.5 3.1-1.1 4.7-1.4 1.4-3 2-5.6 2-2.8 0-5-.9-6.4-2.7C3.8 17.9 3.1 15.4 3 12c.1-3.4.8-5.9 2.2-7.6C6.6 2.6 8.8 1.7 11.6 1.7s5 .9 6.5 2.7c.7.9 1.3 2 1.6 3.3l1.8-.5c-.4-1.6-1.1-3-2-4.1C17.7 1 15 0 11.6 0 8.2 0 5.5 1 3.8 3.1 2.2 5.1 1.3 8 1.3 12c0 4 .9 6.9 2.5 8.9C5.5 23 8.2 24 11.6 24c3 0 5.1-.8 6.9-2.6 2.3-2.3 2.2-5.2 1.5-6.9-.5-1.2-1.5-2.2-3.3-3.4Zm-5 4.6c-1.2.1-2.5-.5-2.5-1.6-.1-.8.6-1.8 2.7-1.9h.7c.8 0 1.5.1 2.2.2-.3 2.5-1.6 3.2-3.1 3.3Z"/>',
    wsh: '<path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z"/>',
    em: '<path d="M2 5h20v14H2V5Zm2 2v.5l8 5 8-5V7H4Zm16 2.8-8 5-8-5V17h16V9.8Z"/>',
    cp: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 1 1 4.2 4.2l-2 2-1.4-1.4 2-2a1 1 0 0 0-1.4-1.4l-3.5 3.5a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 1 1-4.2-4.2l2-2 1.4 1.4-2 2a1 1 0 0 0 1.4 1.4l3.5-3.5a1 1 0 0 1 1.4 0Z"/>'
  };
  function svg(k, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="currentColor" aria-hidden="true">' + (ICO[k] || '') + '</svg>'; }

  /* ---------- estilos das redes, toast e prévia de links ---------- */
  var CSS2 = '#el-soc{position:fixed;right:12px;bottom:calc(66px + env(safe-area-inset-bottom,0px));z-index:2147482400;display:flex;flex-direction:column-reverse;align-items:flex-end;gap:8px;font:600 13px system-ui,sans-serif}' +
    '.el-sfab{width:54px;height:54px;border-radius:50%;border:0;cursor:pointer;color:#fff;background:#25D366;box-shadow:0 10px 26px #0006,0 0 0 0 #25D36688;display:grid;place-items:center;animation:el-wa 2.8s infinite;transition:transform .3s}' +
    '.el-sfab:hover{transform:scale(1.08) rotate(-6deg)}@keyframes el-wa{0%{box-shadow:0 10px 26px #0006,0 0 0 0 #25D36688}70%{box-shadow:0 10px 26px #0006,0 0 0 14px #25D36600}100%{box-shadow:0 10px 26px #0006,0 0 0 0 #25D36600}}' +
    '#el-soc{pointer-events:none}#el-soc .el-sfab{pointer-events:auto}#el-soc .lst{display:flex;flex-direction:column-reverse;gap:7px;align-items:flex-end;pointer-events:none}' +
    '#el-soc .it{display:flex;align-items:center;gap:9px;text-decoration:none;color:#0b1f3a;background:#fff;border-radius:999px;padding:5px 6px 5px 13px;box-shadow:0 6px 18px #0004;opacity:0;transform:translateX(20px) scale(.8);pointer-events:none;transition:all .3s var(--el-ease);white-space:nowrap;cursor:pointer;border:0;font:inherit}' +
    '#el-soc .it i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:#fff;font-style:normal}' +
    '#el-soc .it:hover{transform:translateX(-4px) scale(1.04)!important}' +
    '#el-soc.on .it{opacity:1;transform:none;pointer-events:auto}' +
    '#el-soc.on .el-sfab{background:#0b1f3a;animation:none}' +
    '#el-soc .tip{background:#0b1f3a;color:#fff;border-radius:12px;padding:6px 11px;font-size:12px;box-shadow:0 6px 18px #0004;max-width:220px;text-align:right;transition:opacity .3s}' +
    '#el-soc.on .tip{opacity:0;pointer-events:none}' +
    '.el-toast{position:fixed;left:50%;top:calc(16px + env(safe-area-inset-top,0px));transform:translate(-50%,-30px);opacity:0;z-index:2147483100;background:#0b1f3a;color:#fff;border:1px solid #e8b84a88;border-radius:999px;padding:10px 18px;font:600 13px system-ui,sans-serif;box-shadow:0 10px 30px #0006;transition:all .35s var(--el-ease);pointer-events:none}' +
    '.el-toast.on{transform:translate(-50%,0);opacity:1}' +
    '.el-pv{position:fixed;z-index:2147482600;max-width:270px;background:linear-gradient(150deg,#0b2a6b,#071a40);color:#eaf2ff;border:1px solid #e8b84a66;border-radius:14px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 16px 40px #0007;opacity:0;transform:translateY(6px) scale(.97);transition:opacity .18s,transform .18s;pointer-events:none}' +
    '.el-pv.on{opacity:1;transform:none}.el-pv b{display:flex;gap:7px;align-items:center;font-size:14px}.el-pv b i{font-style:normal;font-size:18px}.el-pv small{display:block;color:#b9cdf0;margin-top:3px}.el-pv em{display:block;font-style:normal;margin-top:6px;color:#e8b84a;font-size:11px;letter-spacing:.1em;text-transform:uppercase}' +
    'body.e3-sys main a:not(.tile):not(.btn):not(.card):not(.chip):not(.hs):not(.el-go):not(.pc):not(.who):not(.nl){background:linear-gradient(90deg,var(--gd),var(--ac)) 0 100%/0 2px no-repeat;text-decoration:none;transition:background-size .35s var(--el-ease),color .2s;padding-bottom:1px}' +
    'body.e3-sys main a:not(.tile):not(.btn):not(.card):not(.chip):not(.hs):not(.el-go):not(.pc):not(.who):not(.nl):hover{background-size:100% 2px;color:var(--ac2)}' +
    'body.e3-sys .chip{transition:all .2s;text-decoration:none}body.e3-sys a.chip:hover{border-color:var(--gd);background:color-mix(in srgb,var(--gd) 18%,var(--bg));transform:translateY(-1px)}' +
    'a.el-ext::after{content:"↗";display:inline-block;margin-left:3px;font-size:.85em;transition:transform .2s}a.el-ext:hover::after{transform:translate(2px,-2px)}' +
    '@media(max-width:560px){#el-soc{right:10px}.el-sfab{width:50px;height:50px}#el-soc .tip{display:none}}';

  var toastT;
  function toast(t) { var x = D0.querySelector('.el-toast'); if (!x) { x = el('<div class="el-toast" role="status" aria-live="polite"></div>'); D0.body.appendChild(x); } x.textContent = t; x.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { x.classList.remove('on'); }, 2600); }
  function copy(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('🔗 Link copiado — é só colar'); }).catch(function () { prompt('Copie o link:', t); }); }

  function socialDock() {
    var w = el('<div id="el-soc"><button class="el-sfab" type="button" aria-label="WhatsApp e redes sociais da Elos" aria-expanded="false">' + svg('wa', 28) + '</button><div class="tip">Cadastre-se pelo WhatsApp<br>(11) 98165-3110</div><div class="lst"></div></div>');
    var l = w.querySelector('.lst');
    l.innerHTML = nets().map(function (n) {
      return '<a class="it" href="' + esc(n[3]) + '" data-k="' + n[0] + '" data-m="' + n[4] + '"' + (n[3].charAt(0) === '#' || n[3].indexOf('mailto:') === 0 ? '' : ' target="_blank" rel="noopener"') + '>' + esc(n[1]) + '<i style="background:' + n[2] + '">' + svg(n[0]) + '</i></a>';
    }).join('');
    D0.body.appendChild(w);
    var fab = w.querySelector('.el-sfab');
    fab.onclick = function (e) { e.stopPropagation(); var on = !w.classList.contains('on'); w.classList.toggle('on', on); fab.setAttribute('aria-expanded', on); fab.innerHTML = on ? '<span style="font-size:24px">✕</span>' : svg('wa', 28); };
    l.addEventListener('click', function (e) {
      var a = e.target.closest('a.it'); if (!a) return;
      var m = a.getAttribute('data-m');
      if (m === 'copylink') { e.preventDefault(); if (navigator.share) navigator.share({ title: 'Elos 360° Global', text: 'Conexões que transformam vidas', url: SITE_URL }).catch(function () {}); else copy(SITE_URL); }
      else if (m === 'copy') { copy(SITE_URL); }
      else if (m === 'wa') toast('💬 Abrindo o WhatsApp de cadastro da Elos');
    });
    D0.addEventListener('click', function (e) { if (w.classList.contains('on') && e.target.isConnected && !w.contains(e.target)) fab.click(); });
    setTimeout(function () { var t = w.querySelector('.tip'); if (t) { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 400); } }, 9000);
  }

  /* ---------- abertura ---------- */
  function splash(done) {
    if (ss.get('el-sp') || reduce || W.ELORA_NO_SPLASH) { done(); return; }
    ss.set('el-sp', '1');
    var T = 'ELOS 360°'.split('').map(function (c, i) { return '<span style="animation-delay:' + (0.55 + i * 0.07).toFixed(2) + 's">' + (c === ' ' ? '&nbsp;' : c) + '</span>'; }).join('').replace(/<span ([^>]*)>(3|6|0|°)<\/span>/g, '<span class="g" $1>$2</span>');
    var s = el('<div id="el-splash" role="dialog" aria-label="Abertura Elos 360° Global"><canvas></canvas><div class="el-sp-in">' +
      '<div class="el-sp-logo"><svg viewBox="0 0 200 200"><defs><linearGradient id="el-g1" x1="0" x2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#e8b84a"/></linearGradient></defs>' +
      '<path id="el-inf" class="el-orbit a" d="M100 100C70 55 18 62 18 100s52 45 82 0 82-45 82 0-52 38-82 0"/><circle class="el-orbit b" cx="100" cy="100" r="92"/>' +
      '<circle class="el-comet" r="3.4"><animateMotion dur="3.2s" repeatCount="indefinite" begin="1.2s"><mpath href="#el-inf"/></animateMotion></circle></svg>' +
      '<img src="/logo-circular.png" alt=""></div>' +
      '<h1 class="el-sp-t">' + T + '</h1><p class="el-sp-g">GLOBAL</p><p class="el-sp-tag">Conexões que transformam vidas</p>' +
      '<div class="el-sp-elora"><span class="el-orb sm"></span><span class="tw"></span></div><div class="el-sp-bar"><i></i></div></div>' +
      '<button class="el-sp-skip" type="button">Pular ›</button></div>');
    D0.body.appendChild(s);
    D0.documentElement.style.overflow = 'hidden';
    // céu de estrelas e conexões
    var cv = s.querySelector('canvas'), cx = cv.getContext('2d'), P = [], run = true, dpr = Math.min(2, W.devicePixelRatio || 1);
    function size() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    size(); W.addEventListener('resize', size);
    for (var i = 0; i < Math.min(110, Math.floor(innerWidth / 9)); i++) P.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .0007, vy: (Math.random() - .5) * .0007, r: Math.random() * 1.6 + .4, g: Math.random() < .18 });
    (function draw() {
      if (!run) return; var w = cv.width, h = cv.height; cx.clearRect(0, 0, w, h);
      for (var a = 0; a < P.length; a++) {
        var p = P[a]; p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
        for (var b = a + 1; b < P.length; b++) { var q = P[b], dx = (p.x - q.x) * w, dy = (p.y - q.y) * h, d = dx * dx + dy * dy, m = 130 * dpr; if (d < m * m) { cx.strokeStyle = 'rgba(124,196,255,' + (0.16 * (1 - Math.sqrt(d) / m)) + ')'; cx.lineWidth = dpr * .6; cx.beginPath(); cx.moveTo(p.x * w, p.y * h); cx.lineTo(q.x * w, q.y * h); cx.stroke(); } }
        cx.fillStyle = p.g ? 'rgba(255,217,138,.95)' : 'rgba(220,235,255,.85)'; cx.beginPath(); cx.arc(p.x * w, p.y * h, p.r * dpr, 0, 6.3); cx.fill();
      }
      requestAnimationFrame(draw);
    })();
    // a Elora se apresenta
    var tw = s.querySelector('.tw'), msg = 'Olá! Eu sou a Elora, a inteligência da Elos 360° Global.', k = 0;
    setTimeout(function typ() { if (k <= msg.length) { tw.textContent = msg.slice(0, k++); setTimeout(typ, 26); } }, 2000);
    var closed = false;
    function close() { if (closed) return; closed = true; s.classList.add('out'); D0.documentElement.style.overflow = ''; setTimeout(function () { run = false; s.remove(); }, 900); done(); }
    s.querySelector('.el-sp-skip').onclick = close;
    setTimeout(close, 4300);
  }

  /* ---------- Elora: conversa ---------- */
  var H = []; try { H = JSON.parse(ss.get('el-h') || '[]'); } catch (e) { H = []; }
  var BUSY = false, VOICE = ls.get('el-voz') === '1', AI_ON = null;
  function saveH() { ss.set('el-h', JSON.stringify(H.slice(-24))); }
  function md(t) {
    var acts = [];
    t = String(t || '').replace(/\[\[(abrir|whatsapp)(?::([^\]|]*))?(?:\|([^\]]*))?\]\]/g, function (_, k, id, lab) { acts.push([k, id || '', lab || '']); return ''; });
    var h = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    var out = '', inL = false;
    h.split(/\n/).forEach(function (ln) {
      var m = ln.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
      if (m) { if (!inL) { out += '<ul>'; inL = true; } out += '<li>' + m[1] + '</li>'; }
      else { if (inL) { out += '</ul>'; inL = false; } if (ln.trim()) out += '<p>' + ln + '</p>'; }
    });
    if (inL) out += '</ul>';
    if (acts.length) out += '<div class="acts">' + acts.map(actBtn).join('') + '</div>';
    return out;
  }
  function actBtn(a) {
    if (a[0] === 'whatsapp') return '<a class="el-go" href="' + waLink() + '" target="_blank" rel="noopener">' + svg('wa', 14) + ' ' + esc(a[2] || 'Cadastrar pelo WhatsApp') + '</a>';
    var id = a[1].replace(/^#/, ''), w = WIN[id] || WIN[id.split('-')[0]];
    var lab = a[2] || (w ? w.n : id) || 'Início';
    return '<button type="button" class="el-go" data-go="' + esc(id) + '">' + (w ? w.i + ' ' : '→ ') + esc(lab) + '</button>';
  }
  function go(id) {
    if (!IS_SYS) { location.href = '/sistema#' + id; return; }
    location.hash = id; if (innerWidth < 560) openP(false);
  }

  var wR, bodyR, sgR, inR, ctxR;
  function widget() {
    wR = el('<div id="el-w"><button type="button" class="el-fab" aria-label="Falar com a Elora"><span class="el-orb"></span><span><b>Elora</b><small>Inteligência Elos</small></span></button>' +
      '<section class="el-pn" role="dialog" aria-label="Elora — inteligência da Elos 360° Global">' +
      '<div class="el-hd"><span class="el-orb"></span><div><b>Elora</b><small><span class="live"></span>Inteligência Elos 360° Global</small></div><div class="tools">' +
      '<button type="button" class="el-ib" data-a="voz" title="Elora fala as respostas" aria-label="Voz da Elora">🔈</button>' +
      '<button type="button" class="el-ib" data-a="max" title="Ampliar" aria-label="Ampliar">⤢</button>' +
      '<button type="button" class="el-ib" data-a="novo" title="Nova conversa" aria-label="Nova conversa">↺</button>' +
      '<button type="button" class="el-ib" data-a="x" title="Fechar" aria-label="Fechar">✕</button></div></div>' +
      '<div class="el-ctx">📍 Nesta janela: <b></b></div><div class="el-bd" aria-live="polite" data-no-tr></div><div class="el-sg"></div>' +
      '<form class="el-ft"><button type="button" class="el-ib el-mic" title="Falar com a Elora" aria-label="Falar por voz">🎙️</button><input placeholder="Pergunte à Elora ou peça para abrir uma janela…" aria-label="Mensagem para a Elora" autocomplete="off"><button class="el-send" aria-label="Enviar">➤</button></form>' +
      '</section></div>');
    D0.body.appendChild(wR);
    bodyR = wR.querySelector('.el-bd'); sgR = wR.querySelector('.el-sg'); inR = wR.querySelector('input'); ctxR = wR.querySelector('.el-ctx b');
    wR.querySelector('.el-fab').onclick = function () { openP(true); };
    var vb = wR.querySelector('[data-a="voz"]'); vb.classList.toggle('on', VOICE); vb.textContent = VOICE ? '🔊' : '🔈';
    wR.querySelector('.tools').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (a === 'x') openP(false);
      if (a === 'max') wR.classList.toggle('max');
      if (a === 'novo') { H = []; saveH(); greet(); paint(); }
      if (a === 'voz') { VOICE = !VOICE; ls.set('el-voz', VOICE ? '1' : '0'); b.classList.toggle('on', VOICE); b.textContent = VOICE ? '🔊' : '🔈'; if (!VOICE && W.speechSynthesis) speechSynthesis.cancel(); toast(VOICE ? '🔊 A Elora vai falar as respostas' : '🔈 Voz da Elora desligada'); }
    };
    wR.querySelector('form').onsubmit = function (e) { e.preventDefault(); var v = inR.value.trim(); inR.value = ''; if (v) ask(v); };
    bodyR.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(b.getAttribute('data-go')); });
    sgR.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ask(b.textContent); });
    mic(wR.querySelector('.el-mic'));
    D0.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wR.classList.contains('on')) openP(false); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); openP(!wR.classList.contains('on')); } });
  }
  function openP(on) { greet(); wR.classList.toggle('on', on !== false); if (on !== false) { paint(); setTimeout(function () { try { inR.focus({ preventScroll: true }); } catch (e) {} }, 200); } }
  function greet() {
    if (H.length) return;
    var n = safe(function () { return (MYNAME || '').split(' ')[0]; }, '');
    H.push({ r: 'a', t: 'Olá' + (n ? ', ' + n : '') + '! Eu sou a **Elora**, a inteligência da Elos 360° Global. Estou em todas as janelas e conecto os setores, módulos e projetos entre si.\nPosso explicar esta janela, cruzar informações com os módulos ligados a ela ou abrir qualquer área para você. Por onde começamos?\n[[abrir:mapa|Mapa do sistema]] [[whatsapp]]' });
    saveH();
  }
  function paint() {
    if (!bodyR) return;
    bodyR.innerHTML = H.map(function (m) { return '<div class="el-m ' + (m.r === 'u' ? 'u' : 'a') + '">' + (m.r === 'u' ? esc(m.t) : (m.html || md(m.t))) + '</div>'; }).join('') + (BUSY ? '<div class="el-m a"><span class="el-typing"><i></i><i></i><i></i></span></div>' : '');
    bodyR.scrollTop = bodyR.scrollHeight;
    ctxR.textContent = title();
    sgR.innerHTML = sugs().map(function (s) { return '<button type="button">' + esc(s) + '</button>'; }).join('');
    wR.querySelectorAll('.el-hd .el-orb').forEach(function (o) { o.classList.toggle('think', BUSY); });
  }
  var SUG = {
    '': ['Por onde começo?', 'Quero me cadastrar', 'Quais serviços a Elos oferece?'],
    fiscal: ['Compare os tributos de dois países', 'Como lanço um tributo?'], fis: ['Confira meus lançamentos fiscais', 'Ligue com o Financeiro'],
    eventos: ['Quais eventos combinam comigo?', 'Como contrato um serviço num evento?'], medicina: ['Congressos de cardiologia', 'Como participar?'],
    network: ['Como crio um projeto?', 'Quais projetos estão atrasados?'], p: ['Analise este projeto', 'Quais setores estão travando?'],
    previdencia: ['Como funciona a aposentadoria no exterior?', 'Quais documentos preciso?'], rastreamento: ['Como peço rastreamento para minha frota?'],
    painel: ['Resumo executivo de hoje', 'Quais alertas exigem ação?'], central: ['O que mudou nos setores hoje?'],
    oport: ['Como publico uma oportunidade?', 'Quero investir'], comunidade: ['Qual grupo é o meu?', 'Como faço parcerias?'],
    programas: ['Resuma os programas da Elos'], contato: ['Quero ser cliente', 'Falar no WhatsApp']
  };
  function sugs() {
    var k = curKey(), b = (SUG[decodeURIComponent(location.hash.slice(1))] || SUG[k] || []).slice();
    b.push('Explique esta janela', 'Cruze esta janela com os módulos ligados', 'Próximo passo recomendado');
    return b.slice(0, 5);
  }

  /* contexto enviado à Elora: a janela atual, as conexões e um retrato dos módulos */
  function ctx() {
    var m = D0.getElementById('m');
    var txt = m ? (m.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500) : (D0.body.innerText || '').slice(0, 2500);
    var rel = relOf(curKey()).map(function (id) { var c = countOf(id); return id + ' (' + WIN[id].n + (c != null ? ', ' + c + ' registro(s)' : '') + ')'; });
    var dados = safe(function () {
      if (!hasAny()) return null;
      var o = { projetos: X.prj.length, emAndamento: X.prj.filter(function (p) { return p.pasta === 'andamento'; }).length, tarefasAbertas: X.tsk.filter(function (t) { return t.status !== 'feita'; }).length, paisesAtivos: S.act.length, modulos: {} };
      M.forEach(function (x) { var n = D(x.id).length; if (n) o.modulos[x.n] = n; });
      return o;
    }, null);
    var jan = Object.keys(WIN).map(function (id) { return (id || 'inicio') + ':' + WIN[id].n; }).join('; ');
    return { janela: location.hash.slice(1) || 'inicio', titulo: title(), texto: txt, conexoes: rel, dados: dados, janelas: jan.slice(0, 5000), pagina: IS_SYS ? 'sistema' : 'site', idioma: langNow() };
  }

  function ask(q) {
    if (BUSY) return;
    openP(true);
    H.push({ r: 'u', t: q }); BUSY = true; saveH(); paint();
    var msgs = H.filter(function (m) { return m.t; }).slice(-12).map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: m.t }; });
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    var done = function (t) { BUSY = false; H.push({ r: 'a', t: t }); saveH(); paint(); speak(t); };
    if (AI_ON === false) { done(local(q)); return; }
    fetch('/api/elora', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Elos': '1' }, body: JSON.stringify({ messages: msgs, ctx: ctx() }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, s: r.status, j: j }; }); })
      .then(function (x) {
        if (x.ok && x.j.text) { AI_ON = true; done(x.j.text); return; }
        if (x.s === 503) AI_ON = false;
        done((x.s === 429 ? '⏳ Muitas perguntas nesta hora — enquanto isso, respondo pelo guia da Elos.\n\n' : '') + local(q));
      })
      .catch(function () { done(local(q)); });
  }

  /* respostas locais (sem internet ou sem IA): guia por todas as janelas */
  function local(q) {
    var t = norm(q), k = curKey(), w = WIN[decodeURIComponent(location.hash.slice(1))] || WIN[k] || WIN[''];
    if (/whats|cadastr|inscrev|registr/.test(t)) return 'Para se cadastrar na Elos 360° Global, fale com a nossa equipe pelo WhatsApp **(11) 98165-3110** — a mensagem já vai pronta. Se preferir, preencha o formulário de contato.\n[[whatsapp]] [[abrir:contato|Formulário de contato]] [[abrir:bemvindo|Escolher meus interesses]]';
    var rel = relOf(k);
    if (/explique|janela|o que (e|posso)|aqui/.test(t)) return 'Você está em **' + title() + '**' + (w && w.d ? ': ' + w.d + '.' : '.') + '\nEsta janela está conectada a:\n' + rel.map(function (id) { var c = countOf(id); return '- ' + WIN[id].i + ' ' + WIN[id].n + (c != null ? ' (' + c + ')' : ''); }).join('\n') + '\n' + rel.slice(0, 4).map(function (id) { return '[[abrir:' + id + ']]'; }).join(' ');
    if (/cruz|conect|modulo|integr/.test(t)) return 'Cruzando **' + title() + '** com as janelas ligadas:\n' + rel.map(function (id) { var c = countOf(id); return '- ' + WIN[id].n + (c != null ? ': ' + c + ' registro(s)' : ': ' + (WIN[id].d || 'janela integrada')); }).join('\n') + '\nTudo o que você lança aqui aparece na Central Integrada e nos setores envolvidos, ao vivo.\n[[abrir:central]] ' + rel.slice(0, 3).map(function (id) { return '[[abrir:' + id + ']]'; }).join(' ');
    if (/proximo|comec|inicio|onde/.test(t)) return 'Sugestão de caminho:\n1. Complete o seu perfil profissional\n2. Escolha os seus interesses para eu abrir as janelas certas\n3. Explore projetos, eventos e oportunidades\n[[abrir:perfil]] [[abrir:bemvindo]] [[abrir:mapa]]';
    var words = t.split(/\W+/).filter(function (x) { return x.length > 2; });
    var sc = Object.keys(WIN).map(function (id) { var x = WIN[id], s = norm(x.n + ' ' + x.d + ' ' + id), p = 0; words.forEach(function (wd) { if (s.indexOf(wd) >= 0) p += 2; else if (s.indexOf(wd.slice(0, 5)) >= 0) p++; }); return [p, id]; }).filter(function (x) { return x[0] > 0; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 4);
    if (sc.length) return 'Encontrei estas janelas para você:\n' + sc.map(function (x) { return '- ' + WIN[x[1]].i + ' **' + WIN[x[1]].n + '** — ' + (WIN[x[1]].d || 'janela integrada'); }).join('\n') + '\n' + sc.map(function (x) { return '[[abrir:' + x[1] + ']]'; }).join(' ');
    return 'Posso te levar a qualquer área da Elos. Veja o mapa completo do sistema ou fale com a nossa equipe pelo WhatsApp.\n[[abrir:mapa|Mapa do sistema]] [[whatsapp]]';
  }

  /* voz: ouvir e falar */
  function langNow() { var l = W.ELOS_LANG || 'pt'; return l === 'pt' ? 'pt-BR' : l; }
  function speak(t) {
    if (!VOICE || !W.speechSynthesis) return;
    var s = String(t).replace(/\[\[[^\]]*\]\]/g, '').replace(/[*#_>`]/g, '').slice(0, 900);
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(s); var L = langNow(), lb = L.split('-')[0]; u.lang = L; u.rate = 1.03; u.pitch = 1.05;
    var v = speechSynthesis.getVoices().filter(function (x) { return x.lang && x.lang.toLowerCase().indexOf(lb) === 0; });
    u.voice = v.find(function (x) { return /female|feminina|luciana|francisca|maria|vit[oó]ria|google portugu/i.test(x.name); }) || v[0] || null;
    speechSynthesis.speak(u);
  }
  function mic(b) {
    var SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { b.style.display = 'none'; return; }
    var r = null;
    b.onclick = function () {
      if (r) { r.stop(); return; }
      r = new SR(); r.lang = langNow(); r.interimResults = true;
      b.classList.add('rec'); inR.placeholder = 'Ouvindo… pode falar';
      r.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; inR.value = s; if (e.results[e.results.length - 1].isFinal) { var v = inR.value.trim(); inR.value = ''; if (v) ask(v); } };
      r.onend = r.onerror = function () { b.classList.remove('rec'); inR.placeholder = 'Pergunte à Elora ou peça para abrir uma janela…'; r = null; };
      r.start();
    };
  }

  /* ---------- barra da Elora + conexões em todas as janelas ---------- */
  function bar() {
    var m = D0.getElementById('m'); if (!m || m.querySelector(':scope > .el-bar')) return;
    var k = curKey(), rel = relOf(k), w = WIN[decodeURIComponent(location.hash.slice(1))] || WIN[k];
    var ch = sugs().slice(0, 3);
    var b = el('<div class="el-bar" data-k="' + esc(location.hash) + '"><span class="el-orb sm"></span><div class="tx"><b>Elora nesta janela</b><small>' + esc(w && w.d ? w.d : 'Converse comigo ou cruze esta janela com os módulos ligados.') + '</small></div>' +
      '<div class="ch">' + ch.map(function (s, i) { return '<button type="button"' + (i === 0 ? ' class="k"' : '') + '>' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="el-cx"><span>Conectado a</span>' + rel.map(function (id) { var c = countOf(id); return '<a href="#' + esc(id) + '"><i>' + WIN[id].i + '</i>' + esc(WIN[id].n) + (c ? ' <em>' + c + '</em>' : '') + '</a>'; }).join('') + '</div></div>');
    b.querySelector('.ch').onclick = function (e) { var x = e.target.closest('button'); if (x) ask(x.textContent); };
    b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%'); });
    var first = m.firstElementChild;
    if (first && first.classList.contains('ban')) first.after(b);
    else if (first && first.tagName === 'P' && first.querySelector('a') && first.nextElementSibling) first.after(b);
    else m.prepend(b);
  }

  /* ---------- interação: transições, inclinação 3D, ondas, progresso, prévia de links ---------- */
  var prog;
  function progress() { if (!prog) { prog = el('<div class="el-prog"></div>'); D0.body.appendChild(prog); } prog.style.opacity = '1'; prog.style.width = '0'; requestAnimationFrame(function () { prog.style.width = '72%'; setTimeout(function () { prog.style.width = '100%'; setTimeout(function () { prog.style.opacity = '0'; }, 280); }, 260); }); }
  function enter() { var m = D0.getElementById('m'); if (!m || reduce) return; m.classList.remove('el-enter'); void m.offsetWidth; m.classList.add('el-enter'); clearTimeout(enter.t); enter.t = setTimeout(function () { m.classList.remove('el-enter'); }, 1300); }
  function interact() {
    var fine = W.matchMedia('(hover:hover) and (pointer:fine)').matches;
    D0.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.tile,a.card'); if (!t) return;
      var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      t.style.setProperty('--mx', (x * 100) + '%'); t.style.setProperty('--my', (y * 100) + '%');
      if (fine && t.classList.contains('tile') && !reduce) t.style.transform = 'perspective(700px) rotateX(' + ((.5 - y) * 10).toFixed(2) + 'deg) rotateY(' + ((x - .5) * 12).toFixed(2) + 'deg) translateY(-4px)';
    }, { passive: true });
    D0.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('.tile'); if (t && !t.contains(e.relatedTarget)) t.style.transform = ''; }, { passive: true });
    D0.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('button.p,a.btn,.tile,.el-go,.el-bar .ch button,.el-fab'); if (!b || reduce) return;
      var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = D0.createElement('span');
      s.className = 'el-rip'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
      if (getComputedStyle(b).position === 'static') b.style.position = 'relative'; b.style.overflow = 'hidden';
      b.appendChild(s); setTimeout(function () { s.remove(); }, 650);
    }, { passive: true });
    // links externos ganham indicador ↗ e aviso ao abrir
    function mark(root) { (root || D0).querySelectorAll('a[href^="http"]:not(.el-ext):not(.it):not(.el-go)').forEach(function (a) { try { if (new URL(a.href).origin !== location.origin && !a.querySelector('img') && !a.classList.contains('btn') && !a.classList.contains('tile')) a.classList.add('el-ext'); } catch (e) {} }); }
    mark(); new MutationObserver(function () { mark(D0.getElementById('m') || D0.body); }).observe(D0.getElementById('m') || D0.body, { childList: true, subtree: true });
    D0.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[target="_blank"]'); if (a && !a.closest('#el-soc')) { try { toast('↗ Abrindo ' + new URL(a.href).hostname.replace(/^www\./, '')); } catch (x) {} } });
    // prévia das janelas ao passar sobre qualquer link interno
    if (!fine || !IS_SYS) return;
    var pv = el('<div class="el-pv" role="tooltip"></div>'), pt;
    D0.body.appendChild(pv);
    D0.addEventListener('pointerover', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || a.closest('#el-w') || a.closest('header')) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1)), w = WIN[id] || WIN[id.split('-')[0]]; if (!w || id === (location.hash.slice(1))) return;
      clearTimeout(pt); pt = setTimeout(function () {
        var c = countOf(id), r = a.getBoundingClientRect();
        pv.innerHTML = '<b><i>' + w.i + '</i>' + esc(w.n) + '</b><small>' + esc(w.d || 'Janela integrada da Elos') + (c != null ? ' · ' + c + ' registro(s)' : '') + '</small><em>Toque para abrir · Elora acompanha</em>';
        var x = Math.min(innerWidth - 285, Math.max(8, r.left)), y = r.bottom + 8; if (y + 110 > innerHeight) y = r.top - 98;
        pv.style.left = x + 'px'; pv.style.top = y + 'px'; pv.classList.add('on');
      }, 260);
    });
    D0.addEventListener('pointerout', function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a && !a.contains(e.relatedTarget)) { clearTimeout(pt); pv.classList.remove('on'); } });
    W.addEventListener('scroll', function () { pv.classList.remove('on'); }, { passive: true });
  }


  /* ---------- Elora no WhatsApp (coordenação) ---------- */
  var OWNER = false;
  function api(m, u, b) { return fetch(u, { method: m, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Elos': '1' }, body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); }); }
  function ownerUI() {
    var t = wR.querySelector('.tools');
    var b = el('<button type="button" class="el-ib" title="Elora no meu WhatsApp" aria-label="Elora no WhatsApp" style="color:#25D366">' + svg('wa', 16) + '</button>');
    b.onclick = waPanel; t.insertBefore(b, t.firstChild);
    SUG[''] = ['Elora no meu WhatsApp'].concat(SUG[''] || []);
  }
  function waPanel() {
    openP(true);
    api('GET', '/api/elora/whatsapp').then(function (s) {
      var st = s.configurado ? (s.avisos ? '🟢 Ativa: a Elora avisa você a cada ' + s.minutos + ' min sobre toda movimentação e responde no WhatsApp.' : '⏸️ Avisos pausados.') : '🟡 Falta ligar a conta oficial do WhatsApp Business (Meta) no servidor. Enquanto isso, use o resumo por toque abaixo.';
      var h = '<p><strong>Elora no seu WhatsApp</strong></p><p>' + esc(st) + '</p>' + (s.numero ? '<p>Número que recebe os avisos: <strong>' + esc(s.numeroFmt) + '</strong></p>' : '') +
        '<div class="acts">' + (s.configurado ? '<button type="button" class="el-go" data-wa="' + (s.avisos ? 'pausar' : 'ativar') + '">' + (s.avisos ? '⏸️ Pausar avisos' : '▶️ Ativar avisos') + '</button><button type="button" class="el-go" data-wa="teste">📨 Enviar teste agora</button>' : '') +
        '<button type="button" class="el-go" data-wa="resumo">' + svg('wa', 14) + ' Resumo agora no meu WhatsApp</button></div>';
      H.push({ r: 'a', t: '' , html: h }); saveH(); paint();
    }).catch(function () { toast('Entre com o seu login de coordenação para configurar.'); });
  }
  D0.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-wa]'); if (!b) return;
    var a = b.getAttribute('data-wa');
    if (a === 'resumo') {
      api('GET', '/api/elora/resumo').then(function (r) { W.open('https://wa.me/' + r.numero + '?text=' + encodeURIComponent(r.texto), '_blank', 'noopener'); }).catch(function () { toast('Não foi possível gerar o resumo agora.'); });
      return;
    }
    api('POST', '/api/elora/whatsapp', { acao: a }).then(function (r) { toast(r.msg || 'Pronto'); if (a !== 'teste') { H.pop(); waPanel(); } }).catch(function (x) { toast('⚠️ ' + x.message); });
  });

  /* ---------- WhatsApp em cada projeto: encaminhar para parceiros ---------- */
  var PJSTYLE = '.el-pj{border:2px solid #25D36655!important;background:linear-gradient(160deg,color-mix(in srgb,#25D366 7%,var(--card)),var(--card))!important}.el-pj h3{display:flex;align-items:center;gap:8px}.el-pj .pl{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}' +
    '.el-pj .pl span{display:inline-flex;align-items:center;gap:0;border-radius:999px;overflow:hidden;border:1px solid #25D36688}.el-pj .pl a{display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;text-decoration:none;padding:7px 12px;font-weight:700;font-size:13px}.el-pj .pl a:hover{background:#1ebe5b}.el-pj .pl button{border:0;background:var(--bg);color:var(--bad);padding:7px 10px;cursor:pointer}' +
    '.el-pj textarea{min-height:150px;font-size:14px}.el-pj .wab{background:#25D366!important;box-shadow:0 6px 18px #25D36655!important}.el-pj .lk{font-size:12.5px;word-break:break-all}';
  function projWA() {
    var st = D0.createElement('style'); st.textContent = PJSTYLE; D0.head.appendChild(st);
    var m = D0.getElementById('m');
    new MutationObserver(function () { pjCard(); }).observe(m, { childList: true });
    W.addEventListener('hashchange', function () { setTimeout(pjCard, 30); });
    pjCard();
  }
  var PJMSG = {};
  function pjText(p) {
    var v = safe(function () { return pct(p._id); }, 0), base = location.origin.indexOf('localhost') >= 0 ? 'https://elo360global.com.br' : location.origin;
    var set = (p.setores || []).map(function (s) { return safe(function () { return SX[s][1]; }, s); }).join(', ');
    return '✨ *' + p.nome + '*\n' + (p.desc ? p.desc + '\n' : '') + '\n' + (p.pais ? '📍 ' + p.pais + '\n' : '') + (p.prazo ? '⏳ Prazo: ' + p.prazo.split('-').reverse().join('/') + '\n' : '') + (set ? '🏢 Setores: ' + set + '\n' : '') + '📊 Andamento: ' + v + '%\n' +
      (p.pub ? '\n🔗 Conheça o projeto: ' + base + '/projeto/' + p.pub + '\n' : '') + '\nCoordenadora PSP · Elos 360° Global\n' + base;
  }
  function telOk(t) { t = String(t || '').replace(/\D/g, ''); if (t.length === 10 || t.length === 11) t = '55' + t; return t.length >= 11 && t.length <= 15 ? t : ''; }
  function pjCard() {
    var h = decodeURIComponent(location.hash.slice(1)); if (h.indexOf('p-') !== 0) return;
    var id = h.slice(2), m = D0.getElementById('m'), p = safe(function () { return prj(id); }, null);
    if (!p || m.querySelector('#el-pj')) return;
    var two = m.querySelector('.two > div:last-child') || m;
    var parc = Array.isArray(p.parceirosWA) ? p.parceirosWA : [];
    var msg = PJMSG[id] || pjText(p);
    var c = el('<div class="card el-pj" id="el-pj"><h3>' + svg('wa', 20) + ' Encaminhar projeto pelo WhatsApp</h3>' +
      '<p class="mut" style="margin:0 0 6px">Envie este projeto direto para os parceiros. A mensagem abaixo pode ser editada antes de enviar.</p>' +
      '<div class="pl">' + (parc.length ? parc.map(function (x, i) { return '<span><a class="nl" href="https://wa.me/' + x.tel + '?text=__T__" target="_blank" rel="noopener" data-pi="' + i + '">' + svg('wa', 14) + ' ' + esc(x.n) + '</a><button type="button" data-rm="' + i + '" title="Remover parceiro" aria-label="Remover ' + esc(x.n) + '">✕</button></span>'; }).join('') : '<small class="mut">Nenhum parceiro salvo neste projeto ainda.</small>') + '</div>' +
      '<form class="pf" style="margin-bottom:10px"><label>Nome do parceiro<input name="n" required></label><label>WhatsApp com DDD (e código do país, se for do exterior)<input name="t" inputmode="tel" required placeholder="11 98765-4321"></label><button class="p">＋ Salvar parceiro</button></form>' +
      '<label class="full">Mensagem<textarea class="tx">' + esc(msg) + '</textarea></label>' +
      '<div class="row" style="margin-top:8px"><a class="btn wab" target="_blank" rel="noopener" data-any>' + svg('wa', 16) + ' Escolher contato no WhatsApp</a>' +
      '<button type="button" class="s" data-ia><span class="el-orb xs" style="vertical-align:middle"></span> Elora escreve a apresentação</button>' +
      '<button type="button" class="s" data-pub>' + (p.pub ? '🔒 Desativar link público' : '🔗 Criar link público do projeto') + '</button></div>' +
      (p.pub ? '<p class="lk mut">Link público (só o resumo, sem dados internos): <a href="/projeto/' + esc(p.pub) + '" target="_blank" rel="noopener">' + esc(location.origin + '/projeto/' + p.pub) + '</a></p>' : '') +
      '</div>');
    two.insertBefore(c, two.firstChild);
    var tx = c.querySelector('.tx');
    function links() { var t = encodeURIComponent(tx.value); c.querySelectorAll('[data-pi]').forEach(function (a) { a.href = a.href.split('?')[0] + '?text=' + t; }); c.querySelector('[data-any]').href = 'https://wa.me/?text=' + t; }
    links(); tx.oninput = function () { PJMSG[id] = tx.value; links(); };
    c.addEventListener('click', function (e) {
      var a = e.target.closest('[data-pi],[data-any]'); if (a) { links(); toast('💬 Abrindo o WhatsApp' + (a.dataset.pi != null ? ' de ' + parc[a.dataset.pi].n : '')); safe(function () { log(id, 'encaminhou o projeto pelo WhatsApp' + (a.dataset.pi != null ? ' para ' + parc[a.dataset.pi].n : '')); }); }
      var r = e.target.closest('[data-rm]'); if (r) { var np = parc.slice(); np.splice(+r.dataset.rm, 1); upd('prj', id, { parceirosWA: np }); }
      if (e.target.closest('[data-pub]')) {
        var tok = p.pub ? '' : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
        upd('prj', id, { pub: tok }); delete PJMSG[id];
        toast(tok ? '🔗 Link público criado' : '🔒 Link público desativado');
      }
      if (e.target.closest('[data-ia]')) {
        var b = e.target.closest('[data-ia]'); b.disabled = true; tx.value = 'A Elora está escrevendo…';
        fetch('/api/elora', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Elos': '1' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Escreva uma mensagem de WhatsApp, elegante e de nível internacional, apresentando este projeto a um parceiro estratégico e convidando para uma conversa. Até 900 caracteres, com negrito no estilo do WhatsApp (*texto*) e poucos emojis. Não use botões [[...]]. Termine com a assinatura "Coordenadora PSP · Elos 360° Global" e, se houver, o link público. Dados: ' + pjText(p) }], ctx: ctx() }) })
          .then(function (r) { return r.json(); }).then(function (j) { tx.value = (j.text || pjText(p)).replace(/\[\[[^\]]*\]\]/g, '').trim(); }).catch(function () { tx.value = pjText(p); })
          .then(function () { PJMSG[id] = tx.value; links(); b.disabled = false; });
      }
    });
    c.querySelector('.pf').onsubmit = function (e) {
      e.preventDefault(); var f = new FormData(e.target), t = telOk(f.get('t')), n = String(f.get('n') || '').trim().slice(0, 60);
      if (!t) { toast('⚠️ Confira o número: DDD + número, ou código do país + número.'); return; }
      upd('prj', id, { parceirosWA: parc.concat([{ n: n, tel: t }]) }); toast('✓ ' + n + ' salvo neste projeto');
    };
  }

  /* ---------- botões de IA já existentes passam a ser da Elora ---------- */
  function rename(root) {
    (root || D0).querySelectorAll('button').forEach(function (b) {
      if (b.__el) return; var t = b.textContent;
      if (/🤖|com IA|com a IA/.test(t)) { b.__el = 1; b.innerHTML = '<span class="el-orb xs" style="vertical-align:middle;margin-right:6px"></span>' + esc(t.replace('🤖', '').replace(/com a IA|com IA/, 'com a Elora').trim()); }
    });
  }

  /* ---------- inicialização ---------- */
  function start() {
    var st = D0.createElement('style'); st.textContent = CSS2; D0.head.appendChild(st);
    buildWin();
    if (IS_SYS) D0.body.classList.add('e3-sys');
    socialDock(); widget(); interact();
    if (IS_SYS) {
      var m = D0.getElementById('m');
      bar(); rename(m);
      new MutationObserver(function () { if (!m.querySelector(':scope > .el-bar')) bar(); rename(m); }).observe(m, { childList: true });
      W.addEventListener('hashchange', function () { progress(); var old = m.querySelector(':scope > .el-bar'); if (old) old.remove(); bar(); enter(); if (wR.classList.contains('on')) paint(); });
      enter();
    }
    fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.elora === false) AI_ON = false; }).catch(function () {});
    fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (u) { if (u && u.isOwner) { OWNER = true; ownerUI(); } }).catch(function () {});
    if (IS_SYS) projWA();
    W.elora = { abrir: openP, perguntar: ask, ir: go, whatsapp: waPanel };
  }
  function boot() { splash(function () {}); start(); }
  if (D0.readyState === 'loading') D0.addEventListener('DOMContentLoaded', boot); else boot();
})();
