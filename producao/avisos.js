/* Avisos da agenda: três vezes ao dia (08:00, 12:30 e 18:00, horário de Brasília) por e-mail e WhatsApp.
   E-mail: SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS, AVISO_EMAIL (destino; vários separados por vírgula)
   WhatsApp (API oficial da Meta): WA_TOKEN, WA_PHONE_ID e AVISO_WHATSAPP (ou o envio próprio da plataforma) */
'use strict';
const HORAS = [[8, 0], [12, 30], [18, 0]];
const TZ = -3; // Brasília
const pad = n => String(n).padStart(2, '0');
function hojeBR(d) { const x = new Date((d || Date.now()) + TZ * 3600e3); return x.toISOString().slice(0, 10); }
function somaDias(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function fmtData(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + '/' + m; }
function proximo() {
  const now = Date.now();
  for (let k = 0; k < 2; k++) for (const [h, mi] of HORAS) {
    const base = new Date(now + TZ * 3600e3); base.setUTCDate(base.getUTCDate() + k); base.setUTCHours(h, mi, 0, 0);
    const t = base.getTime() - TZ * 3600e3; if (t > now + 5000) return t;
  }
  return now + 6 * 3600e3;
}
const TIPO = { reuniao: '🤝 Reunião', compromisso: '📌 Compromisso', financeiro: '💰 Fechamento financeiro', prazo: '⚖️ Prazo de processo', evento: '🎤 Evento', tarefa: '✅ Tarefa', outro: '🗓️ Agenda' };
const ST = { agendado: '', concluido: ' ✔ concluído', remarcado: ' ↻ remarcado', cancelado: ' ✖ cancelado' };
/* monta o resumo: o que teremos e não teremos hoje, importantes dos próximos dias, atrasos e vencimentos */
function resumo({ plataforma, ia, eventos, extras, url, turno }) {
  const hoje = hojeBR(), amanha = somaDias(hoje, 1), lim = somaDias(hoje, 3);
  const E = (eventos || []).filter(e => e && e.data);
  const linha = e => '• ' + (e.hora ? e.hora + ' ' : '') + (TIPO[e.tipo] || '🗓️') + ': ' + e.titulo + (e.local ? ' (' + e.local + ')' : '') + (e.importante ? ' ⭐' : '') + (ST[e.status] || '');
  const doDia = E.filter(e => e.data === hoje).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const teremos = doDia.filter(e => e.status !== 'cancelado' && e.status !== 'remarcado');
  const naoTeremos = doDia.filter(e => e.status === 'cancelado' || e.status === 'remarcado');
  const prox = E.filter(e => e.data > hoje && e.data <= lim && e.status !== 'cancelado' && (e.importante || e.data === amanha)).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  const atras = E.filter(e => e.data < hoje && e.status === 'agendado' && e.importante).slice(0, 10);
  const L = [];
  L.push('✨ ' + ia + ' · ' + plataforma + ' — ' + (turno || 'Agenda') + ' de ' + fmtData(hoje));
  L.push('');
  L.push('📅 HOJE TEREMOS (' + teremos.length + ')'); L.push(teremos.length ? teremos.map(linha).join('\n') : '• Nenhum compromisso marcado para hoje.');
  if (naoTeremos.length) { L.push(''); L.push('🚫 HOJE NÃO TEREMOS'); L.push(naoTeremos.map(linha).join('\n')); }
  if (prox.length) { L.push(''); L.push('⏭️ PRÓXIMOS DIAS (importantes e amanhã)'); L.push(prox.map(e => '• ' + fmtData(e.data) + ' ' + linha(e).slice(2)).join('\n')); }
  if (atras.length) { L.push(''); L.push('⚠️ IMPORTANTES EM ATRASO (marque concluído, remarcado ou cancelado)'); L.push(atras.map(e => '• ' + fmtData(e.data) + ' ' + linha(e).slice(2)).join('\n')); }
  (extras || []).filter(x => x && x.itens && x.itens.length).forEach(x => { L.push(''); L.push(x.titulo); L.push(x.itens.slice(0, 12).map(i => '• ' + i).join('\n') + (x.itens.length > 12 ? '\n… e mais ' + (x.itens.length - 12) : '')); });
  L.push(''); L.push('Abrir a agenda: ' + url);
  const importantes = teremos.filter(e => e.importante).length + prox.length + atras.length + (extras || []).reduce((s, x) => s + ((x && x.itens && x.itens.length) || 0), 0);
  return { texto: L.join('\n'), hoje: teremos.length, importantes };
}
let mailer = null;
function smtpOn() { return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.AVISO_EMAIL); }
async function email(assunto, texto) {
  if (!smtpOn()) throw new Error('e-mail não configurado');
  if (!mailer) { const nm = require('nodemailer'); mailer = nm.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 465), secure: +(process.env.SMTP_PORT || 465) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }); }
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">' + String(texto).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/(https:\/\/\S+)/g, '<a href="$1">$1</a>') + '</div>';
  await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.AVISO_EMAIL, subject: assunto, text: texto, html });
}
function waOn() { return !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID && (process.env.AVISO_WHATSAPP || process.env.OWNER_WHATSAPP)); }
async function whatsapp(texto) {
  if (!waOn()) throw new Error('WhatsApp não configurado');
  const to = String(process.env.AVISO_WHATSAPP || process.env.OWNER_WHATSAPP).replace(/\D/g, '');
  const r = await fetch('https://graph.facebook.com/v21.0/' + process.env.WA_PHONE_ID + '/messages', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.WA_TOKEN }, body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: String(texto).slice(0, 4000) } }) });
  if (!r.ok) { let j = {}; try { j = await r.json(); } catch (e) {} throw new Error((j.error && j.error.message) || 'falha no WhatsApp'); }
}
/* agenda os três avisos diários; montar(turno) devolve {texto, importantes}; enviar só quando houver algo importante ou agenda no dia */
function agendar({ montar, registrar, waSend, log }) {
  const lg = log || ((...a) => console.log('[avisos]', ...a));
  async function disparar(motivo, forcar) {
    const turno = motivo || 'Agenda';
    const r = await montar(turno);
    const out = { t: Date.now(), turno, texto: r.texto, importantes: r.importantes, hoje: r.hoje, canais: [] };
    if (forcar || r.importantes || r.hoje) {
      const assunto = r.titulo || ('Agenda · ' + turno);
      try { if (waSend) { await waSend(r.texto); out.canais.push('whatsapp'); } else if (waOn()) { await whatsapp(r.texto); out.canais.push('whatsapp'); } } catch (e) { out.erroWa = e.message; }
      try { if (smtpOn()) { await email(assunto, r.texto); out.canais.push('e-mail'); } } catch (e) { out.erroEmail = e.message; }
    } else out.semEnvio = 'nada importante neste turno';
    try { await registrar(out); } catch (e) {}
    lg(turno, out.canais.join('+') || out.semEnvio || out.erroWa || out.erroEmail || 'registrado');
    return out;
  }
  const S = { proximo: 0 };
  function loop() { const t = proximo(); S.proximo = t; const h = new Date(t + TZ * 3600e3).getUTCHours(); const turno = h < 11 ? 'Bom dia · agenda da manhã' : h < 15 ? 'Meio do dia · agenda da tarde' : 'Fim do dia · fechamento e amanhã'; const tm = setTimeout(() => { disparar(turno).catch(() => {}).finally(loop); }, t - Date.now()); tm.unref && tm.unref(); }
  loop();
  return { disparar, proximo: () => S.proximo, canais: () => ({ email: smtpOn(), whatsapp: !!waSend || waOn(), destinoEmail: smtpOn() ? String(process.env.AVISO_EMAIL).replace(/(.).+(@.+)/, '$1•••$2') : '' }) };
}
module.exports = { resumo, agendar, hojeBR, somaDias, email, whatsapp, smtpOn, waOn, TIPO };
