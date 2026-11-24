/* Dossiê Elos 360° Global — tela exclusiva da CEO (o servidor confere a conta e a verificação em duas etapas). */
(function () {
  const D = { st: null, docs: null, pend: null, aud: null, mfa: '', aba: 'docs', busy: false, cat: '' };
  try { D.mfa = sessionStorage.getItem('dossie_mfa') || ''; } catch (e) {}
  const H = () => { const h = { 'X-Elos': '1' }; if (D.mfa) h['x-mfa'] = D.mfa; return h; };
  const api = (u, o) => fetch(u, Object.assign({ credentials: 'same-origin' }, o || {}, { headers: Object.assign(H(), (o && o.body) ? { 'content-type': 'application/json' } : {}) })).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.erro || j.error || 'falha'); e.code = j.code; e.status = r.status; throw e; } return j; });
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const dt = t => { try { return new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
  const kb = n => n ? (n / 1024).toFixed(0) + ' KB' : '';
  const CATS = ['Constituição da empresa', 'Propriedade intelectual (INPI)', 'Guias e pagamentos', 'Declarações', 'Bancário', 'Fiscal e tributário', 'Contratos', 'Outros'];
  const SIT = { 'Vigente': '#1f8a4c', 'Arquivado': '#475569', 'A pagar': '#b45309', 'Pago': '#1f8a4c', 'Pendente de assinatura': '#b45309', 'Protocolado': '#1d4ed8', 'Duplicado (via extra)': '#64748b' };
  const out = h => { if (location.hash === '#dossie') m$.innerHTML = h; };
  const head = '<h2>🗂️ Dossiê Elos 360° Global</h2><p class="mut" style="margin-top:-6px">🔒 Acesso exclusivo da CEO · documentos criptografados · cada acesso fica registrado</p>';

  function carregar(force) {
    if (D.busy) return; D.busy = true;
    api('/api/dossie/estado').then(st => {
      D.st = st;
      if (!st.sessao) { D.busy = false; return render(); }
      return Promise.all([api('/api/dossie/docs'), api('/api/dossie/pendencias'), api('/api/dossie/auditoria')]).then(([d, p, a]) => { D.docs = d; D.pend = p; D.aud = a; D.busy = false; render(); });
    }).catch(e => { D.busy = false; if (e.code === 'mfa') { D.mfa = ''; try { sessionStorage.removeItem('dossie_mfa'); } catch (x) {} D.st = Object.assign(D.st || {}, { sessao: false, mfa: 'ativo' }); return render(); } D.err = e.message; render(); });
  }

  function telaMfa() {
    const st = D.st || {};
    let h = head;
    if (st.mfa === 'ativo') {
      h += '<div class="card" style="max-width:460px"><h3>🔐 Confirme que é você</h3><p>Digite o código de 6 dígitos do aplicativo autenticador.</p><input id="dmc" inputmode="numeric" maxlength="6" placeholder="000000" style="font-size:22px;letter-spacing:.3em;width:160px"> <button class="btn" onclick="dossieMfa()">Entrar</button></div>';
    }
    return out(h);
  }

  function barra() {
    const st = D.st || {};
    if (st.mfa === 'ativo') return '<div class="card" style="border-left:4px solid #1f8a4c;padding:10px 14px"><b>✓ Verificação em duas etapas ativa.</b> <small class="mut">Conta: ' + E(st.email) + '</small></div>';
    if (D.mfaIni) return '<div class="card" style="border-left:4px solid #b45309"><h3 style="margin-top:0">🔐 Ativar verificação em duas etapas</h3><ol><li>Abra o Google Authenticator ou Microsoft Authenticator no celular.</li><li>Toque em <b>+</b> → <b>Inserir chave de configuração</b>.</li><li>Nome: <b>Elos Dossiê</b> · Chave: <code style="font-size:15px;user-select:all">' + E(D.mfaIni.secret.replace(/(.{4})/g, '$1 ').trim()) + '</code> · Tipo: baseado no tempo.</li><li>Digite abaixo o código de 6 dígitos que aparecer.</li></ol><input id="dmc" inputmode="numeric" maxlength="6" placeholder="000000" style="font-size:20px;letter-spacing:.3em;width:150px"> <button class="btn" onclick="dossieMfa()">Confirmar e ativar</button><p class="mut"><small>Guarde essa chave num lugar seguro: se trocar de celular, ela é necessária para cadastrar de novo.</small></p></div>';
    return '<div class="card" style="border-left:4px solid #b45309;padding:10px 14px"><b>⚠️ Proteja o dossiê:</b> ative a verificação em duas etapas. Depois de ativada, só entra quem tiver o seu login <u>e</u> o código do seu celular. <button class="btn" style="margin-left:8px" onclick="dossieMfaIni()">Ativar agora</button><br><small class="mut">Conta com acesso: ' + E(st.email) + '</small></div>';
  }

  function abaDocs() {
    const docs = (D.docs || []).filter(d => !D.cat || d.categoria === D.cat);
    const porCat = {}; for (const d of docs) (porCat[d.categoria || 'Outros'] = porCat[d.categoria || 'Outros'] || []).push(d);
    let h = '<div class="row" style="gap:8px;flex-wrap:wrap;margin:8px 0"><select id="dcat" onchange="dossieCat(this.value)"><option value="">Todas as categorias (' + (D.docs || []).length + ')</option>' + CATS.map(c => '<option' + (c === D.cat ? ' selected' : '') + '>' + c + '</option>').join('') + '</select><button class="btn" onclick="dossieNovo()">＋ Incluir documento</button></div>';
    if (!docs.length) h += '<p class="mut">Nenhum documento nesta categoria.</p>';
    for (const c of CATS) { const L = porCat[c]; if (!L) continue;
      h += '<h3 style="margin:18px 0 6px">' + E(c) + ' <small class="mut">(' + L.length + ')</small></h3>';
      h += L.map(d => '<div class="card" style="padding:12px 14px;margin:6px 0"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:240px"><b>' + E(d.titulo) + '</b>' + (d.situacao ? ' <span style="background:' + (SIT[d.situacao] || '#475569') + ';color:#fff;border-radius:10px;padding:1px 8px;font-size:11px">' + E(d.situacao) + '</span>' : '') + '<br><small class="mut">' + [d.orgao, d.numero && ('Nº ' + d.numero), d.valor && ('R$ ' + d.valor), d.emissao && ('emissão ' + d.emissao), d.vencimento && ('vence ' + d.vencimento)].filter(Boolean).map(E).join(' · ') + '</small>' + (d.obs ? '<p style="margin:6px 0 0;font-size:13px">' + E(d.obs) + '</p>' : '') + (d.sha256 ? '<small class="mut" style="font-size:10px;word-break:break-all">SHA-256 ' + E(d.sha256) + ' · ' + kb(d.tamanho) + '</small>' : '') + '</div><div class="row" style="gap:6px">' + (d.temArquivo ? '<button class="btn" onclick="dossieAbrir(\'' + d.id + '\')">📄 Abrir</button>' : '') + '<button class="btn sec" onclick="dossieSit(\'' + d.id + '\')">✏️ Situação</button></div></div></div>').join('');
    }
    return h;
  }
  function abaPend() {
    const P = D.pend || [];
    let h = '<p class="mut">Próximos documentos e providências. Marque conforme for concluindo.</p>';
    h += P.map((p, i) => '<div class="card" style="padding:10px 14px;margin:6px 0;' + (p.ok ? 'opacity:.6' : '') + '"><label class="row" style="gap:10px;align-items:flex-start"><input type="checkbox" ' + (p.ok ? 'checked' : '') + ' onchange="dossiePend(' + i + ',this.checked)" style="margin-top:4px"><span><b' + (p.ok ? ' style="text-decoration:line-through"' : '') + '>' + E(p.t) + '</b>' + (p.prazo ? ' <span style="background:#b45309;color:#fff;border-radius:10px;padding:1px 8px;font-size:11px">' + E(p.prazo) + '</span>' : '') + '<br><small>' + E(p.d) + '</small></span></label></div>').join('');
    return h || '<p class="mut">Sem pendências.</p>';
  }
  function abaAud() {
    return '<p class="mut">Últimos 100 acessos e ações no dossiê.</p><div class="card" style="padding:8px 14px">' + (D.aud || []).map(a => '<div style="font-size:13px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.06)">' + E(dt(a.t)) + ' · <b>' + E(a.acao) + '</b>' + (a.doc ? ' <small class="mut">' + E(a.doc) + '</small>' : '') + '</div>').join('') + '</div>';
  }

  function render() {
    if (location.hash !== '#dossie') return;
    if (D.err) { const e = D.err; D.err = null; return out(head + '<div class="card lock"><b>🔒</b><h2>Acesso restrito</h2><p class="mut">' + E(e) + '</p><p><a class="btn" href="#">Voltar ao início</a></p></div>'); }
    if (!D.st) { out(head + '<p class="mut">Carregando…</p>'); return carregar(); }
    if (!D.st.sessao) return telaMfa();
    if (!D.docs) { out(head + '<p class="mut">Carregando…</p>'); return carregar(); }
    const np = (D.pend || []).filter(p => !p.ok).length;
    let h = head + barra();
    h += '<div class="row" style="gap:6px;margin:12px 0;flex-wrap:wrap">' + [['docs', '📁 Documentos (' + D.docs.length + ')'], ['pend', '📌 Próximos documentos (' + np + ')'], ['aud', '🧾 Registro de acessos']].map(x => '<button class="btn' + (D.aba === x[0] ? '' : ' sec') + '" onclick="dossieAba(\'' + x[0] + '\')">' + x[1] + '</button>').join('') + '</div>';
    h += D.aba === 'pend' ? abaPend() : D.aba === 'aud' ? abaAud() : abaDocs();
    out(h);
  }

  window.dossie = function () {
    if (typeof OWN !== 'undefined' && !OWN) return locked('Acesso exclusivo da CEO da Elos 360° Global.');
    render();
  };
  window.dossieAba = a => { D.aba = a; render(); };
  window.dossieCat = c => { D.cat = c; render(); };
  window.dossieMfaIni = () => api('/api/dossie/mfa/iniciar', { method: 'POST', body: '{}' }).then(j => { D.mfaIni = j; render(); }).catch(e => toast(e.message));
  window.dossieMfa = () => { const c = (document.getElementById('dmc') || {}).value || ''; api('/api/dossie/mfa/verificar', { method: 'POST', body: JSON.stringify({ code: c }) }).then(j => { D.mfa = j.mfa; try { sessionStorage.setItem('dossie_mfa', j.mfa); } catch (e) {} D.mfaIni = null; D.st = null; D.docs = null; toast('Verificação confirmada.'); render(); }).catch(e => toast(e.message)); };
  window.dossieAbrir = id => { const w = window.open('', '_blank'); api('/api/dossie/link/' + id, { method: 'POST', body: '{}' }).then(j => { if (w) w.location = j.url; else location.href = j.url; }).catch(e => { if (w) w.close(); toast(e.message); }); };
  window.dossieSit = id => { const d = (D.docs || []).find(x => x.id === id); if (!d) return; const s = prompt('Situação (ex.: Vigente, A pagar, Pago, Protocolado, Pendente de assinatura, Arquivado):', d.situacao || ''); if (s == null) return; const o = prompt('Observação:', d.obs || ''); api('/api/dossie/docs/' + id, { method: 'PATCH', body: JSON.stringify({ situacao: s, obs: o == null ? d.obs : o }) }).then(() => { D.docs = null; toast('Atualizado.'); render(); }).catch(e => toast(e.message)); };
  window.dossiePend = (i, ok) => { const P = (D.pend || []).slice(); if (!P[i]) return; P[i] = Object.assign({}, P[i], { ok }); api('/api/dossie/pendencias', { method: 'PUT', body: JSON.stringify(P) }).then(() => { D.pend = P; render(); }).catch(e => toast(e.message)); };
  window.dossieNovo = () => {
    out(head + '<div class="card" style="max-width:640px"><h3 style="margin-top:0">＋ Incluir documento</h3><form id="dnf" class="px-g" style="display:grid;gap:8px"><input name="titulo" placeholder="Título *" required><select name="categoria">' + CATS.map(c => '<option>' + c + '</option>').join('') + '</select><input name="orgao" placeholder="Órgão / emissor"><input name="numero" placeholder="Número (protocolo, GRU, CNPJ…)"><input name="valor" placeholder="Valor (R$)"><input name="emissao" placeholder="Data de emissão"><input name="vencimento" placeholder="Vencimento / prazo"><input name="situacao" placeholder="Situação (Vigente, A pagar…)"><textarea name="obs" rows="3" placeholder="Observações"></textarea><label>Arquivo PDF (até 12 MB): <input type="file" name="f" accept="application/pdf"></label><div class="row" style="gap:8px"><button class="btn" type="submit">Salvar no dossiê</button><button class="btn sec" type="button" onclick="D_v()">Cancelar</button></div></form></div>');
    window.D_v = () => render();
    document.getElementById('dnf').onsubmit = ev => { ev.preventDefault(); const f = ev.target, b = {}; for (const k of ['titulo', 'categoria', 'orgao', 'numero', 'valor', 'emissao', 'vencimento', 'situacao', 'obs']) b[k] = f[k].value; const file = f.f.files[0];
      const send = () => api('/api/dossie/docs', { method: 'POST', body: JSON.stringify(b) }).then(() => { D.docs = null; toast('Documento incluído no dossiê.'); render(); }).catch(e => toast(e.message));
      if (!file) return send(); if (file.size > 12 * 1024 * 1024) return toast('Arquivo maior que 12 MB.'); b.arquivo = file.name; const r = new FileReader(); r.onload = () => { b.pdf = r.result; send(); }; r.readAsDataURL(file); };
  };
})();
