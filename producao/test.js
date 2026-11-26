'use strict';
/* Teste de ponta a ponta do servidor Elos: node test.js (com o servidor rodando em BASE) */
const BASE = process.env.BASE || 'http://localhost:10111';
const OWNER = process.env.OWNER || 'coord@elos.test';
let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
function client() {
  let cookie = '';
  return async (m, p, b, h = {}) => {
    const r = await fetch(BASE + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Elos': '1', cookie }, h), body: b === undefined ? undefined : JSON.stringify(b) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch {}
    return { s: r.status, j };
  };
}
(async () => {
  const sfx = Date.now().toString(36);
  const anon = client(), coord = client(), membro = client();
  ok((await anon('GET', '/api/me')).j.level === 'anon', 'visitante sem login é anônimo');
  ok((await anon('GET', '/api/c/r_fin')).s === 401, 'visitante não lê o financeiro');
  ok((await anon('GET', '/api/c/evt')).s === 401, 'visitante não lê os registros de eventos');
  ok((await anon('PUT', '/api/d/evt/x1', { nome: 'x' })).s === 401, 'visitante não grava eventos');
  ok((await anon('PUT', '/api/d/evt/x1', { nome: 'x' }, { 'X-Elos': '' })).s === 403, 'escrita sem cabeçalho anti-CSRF é bloqueada');

  const r = await coord('POST', '/api/login', { email: OWNER, pass: process.env.OWNER_PASS || 'senha-muito-forte-1' });
  ok(r.s === 200, 'proprietária previamente provisionada entra');
  const me = (await coord('GET', '/api/me')).j;
  ok(me.level === 'owner' && me.isOwner, 'coordenadora tem acesso total');
  ok((await coord('PUT', '/api/d/r_fin/f1', { 'Descrição': 'Teste', Tipo: 'receber' })).s === 200, 'coordenadora grava no financeiro');

  const email = `m${sfx}@elos.test`, pass = 'senha-do-membro-1';
  ok((await membro('POST', '/api/register', { name: 'Membro Equipe', email, pass: 'curta' })).s === 400, 'senha curta é recusada');
  ok((await membro('POST', '/api/register', { name: 'Membro Equipe', email, pass })).s === 202, 'cadastro entra em revisão');
  ok((await membro('GET', '/api/me')).j.level === 'anon', 'cadastro não abre sessão');
  ok((await membro('POST', '/api/login', { email, pass })).s === 403, 'cadastro pendente não consegue entrar');
  const mid = (await coord('GET', '/api/users?q=' + encodeURIComponent(email))).j[0].id;
  ok((await membro('PUT', '/api/d/perm/' + mid, { ativo: true })).s === 401, 'cadastro não se aprova sozinho');
  ok((await coord('PUT', '/api/d/perm/' + mid, { setores: ['fin', 'prev', 'pnj'], ativo: true })).s === 200, 'proprietária aprova o cadastro');
  ok((await membro('POST', '/api/login', { email, pass })).s === 200, 'membro aprovado consegue entrar');
  ok((await membro('GET', '/api/d/perm/' + mid)).j.data.ativo === true, 'membro consegue ler sua própria aprovação');
  for (const route of ['/api/c/r_fin', '/api/d/r_fin/f1', '/api/meuprev', '/api/c/ped', '/api/c/prj', '/api/c/expo26', '/api/c/perfil', '/api/stream', '/api/agenda/home']) {
    ok((await membro('GET', route)).s === 403, 'membro aprovado não acessa ' + route);
  }
  ok((await membro('PATCH', '/api/d/r_fin/f1', { Status: 'pago' })).s === 403, 'membro não altera financeiro');
  ok((await membro('POST', '/api/profiles', { ids: [me.id] })).s === 403, 'membro não consulta perfis de terceiros');
  ok((await membro('PUT', '/api/d/leads/' + mid, { nome: 'Membro Equipe' })).s === 200, 'membro aprovado grava o próprio cadastro');
  ok((await coord('PATCH', '/api/d/perm/' + mid, { ativo: false })).s === 200, 'proprietária bloqueia a conta');
  ok((await membro('GET', '/api/me')).j.level === 'anon', 'bloqueio invalida sessão existente');
  ok((await membro('GET', '/api/d/leads/' + mid)).s === 401, 'conta bloqueada perde acesso a seus registros');
  const shared = await fetch(BASE + '/projeto/testeprivado', { redirect: 'manual' });
  ok(shared.status === 303 && shared.headers.get('location') === '/sistema#network', 'link antigo abre apenas a área informativa');
  ok((await fetch(BASE + '/programas/futuro-sem-fronteiras.html')).status === 401, 'arquivo do projeto exige sessão da proprietária');
  ok((await anon('GET', '/api/c/' + encodeURIComponent('../x'))).s >= 400, 'nomes de coleção inválidos são recusados');
  ok((await anon('POST', '/api/login', { email: OWNER, pass: 'errada' })).s === 401, 'senha errada é recusada');
  ok((await anon('GET', '/api/c/projetos')).s === 401, 'projetos do programa protegidos');
  ok((await coord('GET', '/api/c/projetos')).j.length >= 5, 'dados iniciais dos 5 projetos globais carregados');
  const h = await fetch(BASE + '/sistema');
  ok(h.status === 200 && (await h.text()).includes('elos-shim.js'), 'sistema Elos servido com o adaptador');
  ok(!!h.headers.get('content-security-policy'), 'cabeçalhos de segurança presentes');
  ok((await coord('DELETE', '/api/d/r_fin/f1')).s === 200, 'coordenadora exclui registro');
  console.log(fails ? `\n${fails} falha(s)` : '\nTodos os testes passaram');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
