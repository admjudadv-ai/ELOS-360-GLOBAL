/* Elora · acompanhamento de eventos: todo dia, ao meio-dia (horário de Brasília), lê os sites oficiais dos eventos
   que a Elos quer participar como "parceira e network" e detecta quando o credenciamento / inscrição de 2027 abre.
   Quando abre: cria compromisso importante na agenda ("Cadastrar a Elos em …") e entra nos avisos da Elora
   (WhatsApp/e-mail, 3 vezes ao dia) até a CEO marcar que a Elos foi cadastrada.
   A Elora não envia formulários sozinha: cadastro com aceite de termos, CAPTCHA ou dados pessoais fica com a CEO. */
'use strict';
const AVISOS = require('./avisos');

const LISTA = [
  { id: 'fr-autocom', nome: 'Autocom 2027', data: '2027-03-30', fim: '2027-04-01', local: 'Expo Center Norte · São Paulo/SP', org: 'Francal', url: 'https://www.feiraautocom.com.br/' },
  { id: 'fr-abrin', nome: 'Abrin 2027', data: '2027-04-04', fim: '2027-04-07', local: 'Expo Center Norte · São Paulo/SP', org: 'Francal', url: 'https://abrin.com.br/', extra: ['credenciamento/'] },
  { id: 'fr-biobrazil', nome: 'Bio Brazil Fair · Biofach América Latina 2027', data: '2027-06-09', fim: '2027-06-12', local: 'Distrito Anhembi · São Paulo/SP', org: 'Francal', url: 'https://biobrazilfair.com.br/' },
  { id: 'fr-naturaltech', nome: 'Naturaltech 2027', data: '2027-06-09', fim: '2027-06-12', local: 'Distrito Anhembi · São Paulo/SP', org: 'Francal', url: 'https://naturaltech.com.br/' },
  { id: 'fr-escolaroffice', nome: 'Escolar Office Brasil 2027', data: '2027-08-01', fim: '2027-08-04', local: 'Expo Center Norte · São Paulo/SP', org: 'Francal', url: 'https://escolarofficebrasil.com.br/' },
  { id: 'fr-brazilconf', nome: 'The Brazil Conference 2027', data: '2027-08-03', fim: '2027-08-04', local: 'Distrito Anhembi · São Paulo/SP', org: 'Francal', url: 'https://www.freshproduce.com/events/the-brazil-conference/' },
  { id: 'fr-construmetal', nome: 'Construmetal 2027', data: '2027-09-22', fim: '2027-09-23', local: 'Distrito Anhembi · São Paulo/SP', org: 'Francal', url: 'https://francal.com.br/calendario-de-eventos/' },
  { id: 'fr-seafood', nome: 'Seafood Show Latin America 2027', data: '2027-10-19', fim: '2027-10-21', local: 'Distrito Anhembi · São Paulo/SP', org: 'Francal', url: 'https://seafoodshow.com.br/' },
  { id: 'fr-expobor', nome: 'Expobor', data: '', local: 'São Paulo/SP', org: 'Francal', url: 'https://expobor.com.br/' },
  { id: 'fr-pneushow', nome: 'Pneushow', data: '', local: 'São Paulo/SP', org: 'Francal', url: 'https://pneushow.com.br/' },
  { id: 'fr-expolazer', nome: 'Expolazer', data: '', local: 'São Paulo/SP', org: 'Francal', url: 'https://expolazer.com.br/' },
  { id: 'fr-mcs', nome: 'Modern Construction Show', data: '', local: 'São Paulo/SP', org: 'Francal', url: 'https://modernconstructionshow.com.br/' }
];

const ABERTO = /(credenciamento|credencie-se|inscri[çc][õo]es|pr[ée]-?credenciamento|pr[ée]-?registro|registro de visitante|garanta (já )?sua credencial)[^.\n]{0,70}(abert|dispon[íi]ve|liberad|já pode|clique)|(abert[oa]s?|liberad[oa]s?)[^.\n]{0,25}(o )?(credenciamento|inscri[çc][õo]es|pr[ée]-?registro)/i;
const txt = h => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

module.exports = function ({ app, pool, onlyOwner, limited, broadcast, agdCriar }) {
  const ok = () => !!pool;
  const get = async id => { const r = await pool.query("SELECT data FROM elos_docs WHERE col='evmon' AND id=$1", [id]); return r.rows[0] ? r.rows[0].data : null; };
  const put = (id, d) => pool.query("INSERT INTO elos_docs(col,id,data,updated) VALUES('evmon',$1,$2,$3) ON CONFLICT (col,id) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated", [id, d, Date.now()]);

  async function ler(url) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try { const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Elora · Elos 360 Global)', 'accept-language': 'pt-BR' } }); if (!r.ok) return { erro: 'HTTP ' + r.status }; return { texto: txt(await r.text()).slice(0, 400000) }; }
    catch (e) { return { erro: e.name === 'AbortError' ? 'tempo esgotado' : 'sem acesso' }; } finally { clearTimeout(t); }
  }

  async function verificar(ev) {
    const atual = (await get(ev.id)) || { status: 'acompanhando', desde: Date.now() };
    if (atual.cadastrado) return atual;
    let achou = null, erro = null;
    for (const u of [ev.url].concat((ev.extra || []).map(p => ev.url + p))) {
      const r = await ler(u); if (r.erro) { erro = r.erro; continue; }
      const m = r.texto.match(ABERTO);
      const janela = m ? r.texto.slice(Math.max(0, m.index - 250), m.index + m[0].length + 250) : '';
      if (m && /2027/.test(r.texto) && !/202[0-6]/.test(janela)) { const i = Math.max(0, m.index - 80); achou = { url: u, trecho: r.texto.slice(i, m.index + m[0].length + 80).trim() }; break; }
    }
    const novo = Object.assign({}, atual, { visto: Date.now(), erro: achou ? null : erro });
    if (achou && atual.status !== 'aberto') {
      Object.assign(novo, { status: 'aberto', aberto: Date.now(), url: achou.url, trecho: achou.trecho });
      try { await agdCriar({ titulo: 'Cadastrar a Elos 360° Global · ' + ev.nome + ' (credenciamento aberto)', tipo: 'tarefa', data: AVISOS.hojeBR(), hora: '10:00', local: achou.url, descricao: 'A Elora detectou que o credenciamento/inscrição abriu no site oficial. Participação: parceira e network. Trecho: “' + achou.trecho.slice(0, 220) + '”', importante: true, home: false }, 'Elora'); } catch (e) {}
    }
    await put(ev.id, novo); return novo;
  }

  let rodando = false;
  async function rodar() {
    if (!ok() || rodando) return; rodando = true;
    try { for (const ev of LISTA) { try { await verificar(ev); } catch (e) {} await new Promise(r => setTimeout(r, 1500)); } broadcast && broadcast('evmon'); }
    finally { rodando = false; }
  }
  async function estado() {
    const { rows } = await pool.query("SELECT id,data FROM elos_docs WHERE col='evmon'"); const M = Object.fromEntries(rows.map(r => [r.id, r.data]));
    return LISTA.map(ev => Object.assign({ id: ev.id, nome: ev.nome, data: ev.data, local: ev.local, org: ev.org, site: ev.url }, M[ev.id] || { status: 'acompanhando' }));
  }
  /* uma vez por dia, a partir do meio-dia de Brasília; e 2 minutos depois de ligar o servidor */
  let ultimo = '';
  setInterval(() => { const h = new Date(Date.now() - 3 * 3600e3), dia = h.toISOString().slice(0, 10); if (h.getUTCHours() >= 12 && ultimo !== dia) { ultimo = dia; rodar(); } }, 10 * 60e3).unref();
  setTimeout(rodar, 120e3).unref();

  app.get('/api/eventos/acompanhamento', onlyOwner, async (req, res) => { try { res.json({ eventos: await estado(), rodando }); } catch (e) { res.status(500).json({ error: 'falha' }); } });
  app.post('/api/eventos/acompanhamento/verificar', onlyOwner, (req, res) => { if (limited('evmon:' + req.user.id, 6, 36e5)) return res.status(429).json({ error: 'Aguarde um pouco.' }); rodar(); res.json({ ok: true }); });
  app.post('/api/eventos/acompanhamento/:id', onlyOwner, async (req, res) => {
    const ev = LISTA.find(x => x.id === req.params.id); if (!ev) return res.status(404).json({ error: 'evento não acompanhado' });
    const d = (await get(ev.id)) || { status: 'acompanhando' }; const b = req.body || {};
    if ('cadastrado' in b) { d.cadastrado = !!b.cadastrado; d.status = b.cadastrado ? 'cadastrado' : (d.aberto ? 'aberto' : 'acompanhando'); d.quando = Date.now(); }
    await put(ev.id, d); broadcast && broadcast('evmon'); res.json({ ok: true });
  });

  return {
    estado,
    /* bloco para os avisos da Elora (3 vezes ao dia) */
    extras: async () => {
      if (!ok()) return [];
      const E = await estado(), ab = E.filter(e => e.status === 'aberto');
      return ab.length ? [{ titulo: '🎟️ ELORA · CREDENCIAMENTO ABERTO — CADASTRAR A ELOS (' + ab.length + ')', itens: ab.map(e => e.nome + ' · ' + (e.url || e.site)) }] : [];
    }
  };
};
