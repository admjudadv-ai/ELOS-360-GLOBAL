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
  const anon = client(), coord = client(), membro = client(), cliente = client();
  ok((await anon('GET', '/api/me')).j.level === 'anon', 'visitante sem login é anônimo');
  ok((await anon('GET', '/api/c/r_fin')).s === 401, 'visitante não lê o financeiro');
  ok((await anon('GET', '/api/c/evt')).s === 200, 'visitante vê os Eventos Globais');
  ok((await anon('PUT', '/api/d/evt/x1', { nome: 'x' })).s === 401, 'visitante não grava eventos');
  ok((await anon('PUT', '/api/d/evt/x1', { nome: 'x' }, { 'X-Elos': '' })).s === 403, 'escrita sem cabeçalho anti-CSRF é bloqueada');

  let r = await coord('POST', '/api/register', { name: 'Coordenadora Patrícia Santos Pereira', email: OWNER, pass: 'senha-muito-forte-1' });
  if (r.s === 409) r = await coord('POST', '/api/login', { email: OWNER, pass: 'senha-muito-forte-1' });
  ok(r.s === 200, 'coordenadora entra');
  const me = (await coord('GET', '/api/me')).j;
  ok(me.level === 'owner' && me.isOwner, 'coordenadora tem acesso total');
  ok((await coord('PUT', '/api/d/r_fin/f1', { 'Descrição': 'Teste', Tipo: 'receber' })).s === 200, 'coordenadora grava no financeiro');

  ok((await membro('POST', '/api/register', { name: 'Membro', email: `m${sfx}@elos.test`, pass: 'curta' })).s === 400, 'senha curta é recusada');
  ok((await membro('POST', '/api/register', { name: 'Membro Equipe', email: `m${sfx}@elos.test`, pass: 'senha-do-membro-1' })).s === 200, 'membro cria conta');
  const mid = (await membro('GET', '/api/me')).j.id;
  ok((await membro('GET', '/api/me')).j.level === 'view', 'membro novo começa sem setores liberados');
  ok((await membro('GET', '/api/c/r_fin')).s === 403, 'membro sem liberação não lê o financeiro');
  ok((await membro('PUT', '/api/d/pedidos/' + mid, { t: 1 })).s === 200, 'membro envia pedido de acesso');
  ok((await membro('PUT', '/api/d/perm/' + mid, { ativo: true })).s === 403, 'membro não se libera sozinho');
  ok((await coord('PUT', '/api/d/perm/' + mid, { setores: ['fin'], ativo: true })).s === 200, 'coordenadora libera o membro');
  ok((await membro('GET', '/api/me')).j.level === 'interact', 'membro liberado passa a contribuir');
  ok((await membro('GET', '/api/c/r_fin')).j.length >= 1, 'membro liberado lê o financeiro');
  ok((await membro('PATCH', '/api/d/r_fin/f1', { Status: 'pago' })).s === 200, 'membro liberado atualiza registro');
  ok((await coord('GET', '/api/d/r_fin/f1')).j.data.Status === 'pago' && (await coord('GET', '/api/d/r_fin/f1')).j.data.Tipo === 'receber', 'atualização mescla os campos');
  r = await membro('GET', '/api/c/leads');
  ok(r.s === 403 || (Array.isArray(r.j) && r.j.every(l => l.id === mid)), 'membro não vê os futuros clientes de outras pessoas');

  ok((await cliente('POST', '/api/register', { name: 'Cliente Futuro', email: `c${sfx}@elos.test`, pass: 'senha-do-cliente-1' })).s === 200, 'futuro cliente cria conta');
  const cid = (await cliente('GET', '/api/me')).j.id;
  ok((await cliente('PUT', '/api/d/leads/' + cid, { nome: 'Cliente Futuro', int: 'Licenciamento' })).s === 200, 'futuro cliente envia interesse');
  ok((await cliente('PUT', '/api/d/leads/outro', { nome: 'x' })).s === 403, 'cliente não grava no interesse de outra pessoa');
  ok((await cliente('GET', '/api/c/leads')).j.length === 1, 'cliente vê só o próprio interesse');
  ok((await coord('GET', '/api/c/leads')).j.some(l => l.id === cid), 'coordenadora vê o interesse do cliente');
  ok((await cliente('GET', '/api/c/prj')).s === 403, 'cliente não vê projetos internos');
  ok((await cliente('GET', '/api/users?q=')).s === 403, 'cliente não lista usuários');
  const pf = (await membro('POST', '/api/profiles', { ids: [cid] })).j;
  ok(pf[cid] && pf[cid].name && !pf[cid].email, 'nomes visíveis, e-mail oculto para não coordenação');

  ok((await anon('GET', '/api/c/' + encodeURIComponent('../x'))).s >= 400, 'nomes de coleção inválidos são recusados');
  ok((await anon('POST', '/api/login', { email: OWNER, pass: 'errada' })).s === 401, 'senha errada é recusada');
  ok((await anon('GET', '/api/c/projetos')).s === 401, 'projetos do programa protegidos');
  ok((await coord('GET', '/api/c/projetos')).j.length >= 5, 'dados iniciais dos 5 projetos globais carregados');
  const h = await fetch(BASE + '/');
  ok(h.status === 200 && (await h.text()).includes('elos-shim.js'), 'sistema Elos servido com o adaptador');
  ok(!!h.headers.get('content-security-policy'), 'cabeçalhos de segurança presentes');
  ok((await coord('DELETE', '/api/d/r_fin/f1')).s === 200, 'coordenadora exclui registro');
  console.log(fails ? `\n${fails} falha(s)` : '\nTodos os testes passaram');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
