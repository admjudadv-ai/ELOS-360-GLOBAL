/* Elos 360° Global — liga as telas do sistema ao servidor próprio (banco PostgreSQL no Render). */
(function () {
  'use strict';
  if (window.claude) return;
  var H = { 'Content-Type': 'application/json', 'X-Elos': '1' };
  function api(m, u, b) {
    return fetch(u, { method: m, headers: H, credentials: 'same-origin', body: b === undefined ? undefined : JSON.stringify(b) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || ('erro ' + r.status)); e.status = r.status; if (r.status === 401 && m !== 'GET') askLogin(); throw e; }
          return j;
        });
      });
  }
  var ME = { id: null, level: 'anon' };
  var meP = fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).catch(function () { return ME; }).then(function (m) { ME = m || ME; return ME; });

  /* tempo real */
  var subs = {}, es = null;
  function ensureES() {
    if (es || !window.EventSource) return;
    es = new EventSource('/api/stream');
    es.onmessage = function (e) { try { var c = JSON.parse(e.data).col; (subs[c] || []).slice().forEach(function (f) { f(); }); } catch (_) {} };
  }
  function listen(col, f) {
    ensureES();
    var t = null, g = function () { clearTimeout(t); t = setTimeout(f, 120); };
    (subs[col] = subs[col] || []).push(g);
    return function () { subs[col] = (subs[col] || []).filter(function (x) { return x !== g; }); };
  }
  function newId() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }
  function clean(o) { return JSON.parse(JSON.stringify(o == null ? {} : o)); }
  function snap(id, r) { return { id: id, exists: !!r.exists, data: function () { return r.data; } }; }

  function docRef(col, id) {
    id = id || newId();
    var ref = {
      id: id,
      get: function () { return api('GET', '/api/d/' + col + '/' + encodeURIComponent(id)).then(function (r) { return snap(id, r); }); },
      set: function (o) { return api('PUT', '/api/d/' + col + '/' + encodeURIComponent(id), clean(o)); },
      update: function (o) { return api('PATCH', '/api/d/' + col + '/' + encodeURIComponent(id), clean(o)); },
      delete: function () { return api('DELETE', '/api/d/' + col + '/' + encodeURIComponent(id)); },
      onSnapshot: function (cb, err) {
        var alive = true;
        var run = function () { ref.get().then(function (s) { if (alive) cb(s); }).catch(function (e) { if (err) err(e); }); };
        run();
        var un = listen(col, run);
        return function () { alive = false; un(); };
      }
    };
    return ref;
  }
  function colRef(col) {
    var ref = {
      doc: function (id) { return docRef(col, id); },
      add: function (o) { var d = docRef(col); return d.set(o).then(function () { return d; }); },
      get: function () {
        return api('GET', '/api/c/' + col).then(function (rows) {
          var docs = rows.map(function (x) { return { id: x.id, exists: true, data: function () { return x.data; } }; });
          return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); } };
        });
      },
      onSnapshot: function (cb, err) {
        var alive = true;
        var run = function () { ref.get().then(function (s) { if (alive) cb(s); }).catch(function (e) { if (err) err(e); }); };
        run();
        var un = listen(col, run);
        return function () { alive = false; un(); };
      }
    };
    return ref;
  }
  var DB = {
    collection: colRef,
    doc: function (p) { var a = String(p).split('/'); return docRef(a[0], a[1]); }
  };
  var USER = {
    id: function () { return Promise.resolve(ME.id); },
    me: function () { return Promise.resolve({ name: ME.name || '', email: ME.email || '' }); },
    isOwner: function () { return !!ME.isOwner; },
    canEdit: function () { return ME.level === 'interact' || ME.level === 'owner'; },
    profiles: function (ids) { return api('POST', '/api/profiles', { ids: ids }); },
    search: function (q) { return api('GET', '/api/users?q=' + encodeURIComponent(q || '')); }
  };
  var SAMPLE = function (prompt) { return api('POST', '/api/ai', { prompt: String(prompt) }); };
  var DOWNLOADS = {
    save: function (o) {
      try {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([o.data], { type: 'text/csv;charset=utf-8' }));
        a.download = o.filename || 'elos.csv';
        document.body.appendChild(a); a.click(); a.remove();
        return Promise.resolve();
      } catch (e) { return Promise.reject(e); }
    }
  };
  window.claude = {
    use: function (name) {
      return meP.then(function () {
        if (name === 'db') return DB;
        if (name === 'user') return ME.id ? USER : null;
        if (name === 'sample') return ME.ai ? SAMPLE : null;
        if (name === 'downloads') return DOWNLOADS;
        return null;
      });
    }
  };

  /* entrar / criar conta */
  var CSS = '#elosauth{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9998;font:600 13px system-ui,sans-serif}' +
    '#elosauth button{border:0;border-radius:999px;padding:10px 16px;background:#0b1f3a;color:#fff;box-shadow:0 6px 20px #0004;cursor:pointer;font:inherit}' +
    '#elosauth button .g{color:#e8b84a}' +
    '#elosm{position:fixed;inset:0;background:#07142acc;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#elosm form{background:#fff;color:#0b1f3a;border-radius:18px;max-width:380px;width:100%;padding:22px;display:grid;gap:10px;font:15px system-ui,sans-serif}' +
    '#elosm h3{margin:0;font-size:20px}#elosm .eb{margin:0;letter-spacing:.2em;font-size:11px;font-weight:700;color:#b8892a}' +
    '#elosm label{display:grid;gap:4px;font-size:12px;color:#5b6b82}#elosm input{font:inherit;padding:10px;border:1px solid #d9e2ee;border-radius:10px}' +
    '#elosm .p{background:#1565d8;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font:inherit}' +
    '#elosm .lnk{background:none;border:0;color:#1565d8;cursor:pointer;font:inherit;text-decoration:underline}' +
    '#elosm .err{color:#d33;font-size:13px;min-height:1em;margin:0}#elosm .mut{font-size:12px;color:#5b6b82;margin:0}';
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function askLogin(mode) {
    if (document.getElementById('elosm')) return;
    var reg = mode === 'reg';
    var m = el('<div id="elosm" role="dialog" aria-modal="true" aria-labelledby="elosmt"><form>' +
      '<p class="eb">ELOS 360° GLOBAL</p><h3 id="elosmt">' + (reg ? 'Criar conta' : 'Entrar') + '</h3>' +
      (reg ? '<label>Nome completo<input name="name" autocomplete="name" required></label>' : '') +
      '<label>E-mail<input name="email" type="email" autocomplete="email" required></label>' +
      '<label>Senha' + (reg ? ' (mínimo 10 caracteres)' : '') + '<input name="pass" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" minlength="' + (reg ? 10 : 1) + '" required></label>' +
      '<p class="err" aria-live="polite"></p><button class="p">' + (reg ? 'Criar conta' : 'Entrar') + '</button>' +
      '<p class="mut">' + (reg ? 'Já tem conta? ' : 'Ainda não tem conta? ') + '<button type="button" class="lnk" data-sw>' + (reg ? 'Entrar' : 'Criar conta') + '</button> · <button type="button" class="lnk" data-x>Fechar</button></p>' +
      (reg ? '<p class="mut">Após criar a conta, a coordenação libera os setores do seu acesso.</p>' : '') +
      '</form></div>');
    document.body.appendChild(m);
    var f = m.querySelector('form');
    m.querySelector('[data-x]').onclick = function () { m.remove(); };
    m.querySelector('[data-sw]').onclick = function () { m.remove(); askLogin(reg ? 'login' : 'reg'); };
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    f.onsubmit = function (e) {
      e.preventDefault();
      var fd = new FormData(f), b = f.querySelector('.p'), er = f.querySelector('.err');
      b.disabled = true; er.textContent = '';
      api('POST', reg ? '/api/register' : '/api/login', { name: fd.get('name') || '', email: fd.get('email'), pass: fd.get('pass') })
        .then(function () { location.reload(); })
        .catch(function (x) { er.textContent = x.message; b.disabled = false; });
    };
    setTimeout(function () { var i = f.querySelector('input'); if (i) i.focus(); }, 30);
  }
  window.elosLogin = askLogin;
  function mountBtn() {
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    var w = document.createElement('div'); w.id = 'elosauth';
    if (ME.id) {
      w.innerHTML = '<button type="button" title="Sair da conta">Sair · <span class="g">' + String(ME.name || ME.email || '').replace(/[<>&"]/g, '').slice(0, 24) + '</span></button>';
      w.firstChild.onclick = function () { api('POST', '/api/logout', {}).finally(function () { location.reload(); }); };
    } else {
      w.innerHTML = '<button type="button">Entrar · <span class="g">Criar conta</span></button>';
      w.firstChild.onclick = function () { askLogin(); };
    }
    document.body.appendChild(w);
  }
  meP.then(function () { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBtn); else mountBtn(); });
})();
