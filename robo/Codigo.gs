/**
 * Robô de inscrições · Planejador de Eventos · Feashion
 *
 * O que faz:
 *  1. criarForm   – copia o Forms modelo para um evento, ajusta título, descrição e confirmação,
 *                   liga uma planilha de respostas e grava o link no evento (eventos/{id}.inscricao).
 *  2. rotina      – a cada 10 min: lê as respostas de cada Forms aberto, grava em inscricoes/{id}
 *                   e atualiza o total no evento; fecha o Forms quando o evento começa;
 *                   manda o lembrete por e-mail para quem se inscreveu, a partir de HORAS_AVISO antes.
 *  3. enviarAviso – mesmo lembrete, na hora, pelo botão do app (só para quem ainda não recebeu).
 *
 * Roda na conta Google dona do projeto Firebase. Os e-mails saem dessa conta,
 * com o nome REMETENTE. Passo a passo de instalação: robo/LEIAME.md
 */

// ====================== CONFIGURAÇÃO ======================
var CFG = {
  PROJETO: 'feashion-eventos-teste',
  API_KEY: 'AIzaSyCz5Jf_-IAoXQbuU2oDq7TKyrBLw_5hap0', // a mesma do config.js do site (não é senha)
  MODELO_FORM_ID: 'COLE_AQUI_O_ID_DO_FORMS_MODELO',
  PASTA: 'Feashion · Inscrições',
  REMETENTE: 'Feashion · Diretoria de Eventos',
  HORAS_AVISO: 48,
  CARGOS_QUE_EDITAM: ['DEV', 'Diretor(a)', 'Coordenador(a)', 'Membro(a)', 'Trainee']
};
// ==========================================================

var FS = 'https://firestore.googleapis.com/v1/projects/' + CFG.PROJETO + '/databases/(default)/documents/';

/* ---------- chamadas do app ---------- */
function doPost(e) {
  var out;
  try {
    var b = JSON.parse(e.postData.contents);
    var u = quemChama(b.idToken);
    if (CFG.CARGOS_QUE_EDITAM.indexOf(u.cargo) < 0) throw new Error('Seu cargo não permite usar as inscrições.');
    if (!b.evento) throw new Error('Evento não informado.');
    if (b.acao === 'criarForm') out = criarForm(b.evento, u);
    else if (b.acao === 'sincronizar') out = sincronizarEvento(b.evento);
    else if (b.acao === 'enviarAviso') out = enviarAviso(b.evento);
    else throw new Error('Ação desconhecida.');
    out.ok = true;
  } catch (err) {
    console.error(err);
    out = { ok: false, erro: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('Robô de inscrições da Feashion no ar.');
}

/** Confere o login do Firebase de quem chamou e devolve e-mail e cargo. */
function quemChama(idToken) {
  if (!idToken) throw new Error('Faça login no app.');
  var r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + CFG.API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) throw new Error('Login expirado. Recarregue o app e tente de novo.');
  var u = (JSON.parse(r.getContentText()).users || [])[0];
  if (!u || !u.email || !u.emailVerified) throw new Error('Login sem e-mail verificado.');
  var email = String(u.email).toLowerCase();
  var dev = fsGet('config/dev');
  var ehDev = !!(dev && String(dev.email || '').toLowerCase() === email);
  if (!ehDev && !fsGet('permitidos/' + encodeURIComponent(email))) throw new Error('Seu e-mail não está liberado no app.');
  var m = fsGet('membros/' + u.localId);
  return { email: email, uid: u.localId, cargo: ehDev ? 'DEV' : (m && m.cargo) || '' };
}

/* ---------- criar o Forms de um evento ---------- */
function criarForm(eid, u) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ev = fsGet('eventos/' + eid);
    if (!ev) throw new Error('Evento não encontrado.');
    if (ev.inscricao && ev.inscricao.formId) return { inscricao: ev.inscricao, jaExistia: true };
    if (!ev.data) throw new Error('O evento precisa ter data antes de abrir inscrições.');
    var pasta = pastaInscricoes();
    var nomeArq = ev.nome + ' · ' + dataCurta(ev.data);
    var copia = DriveApp.getFileById(CFG.MODELO_FORM_ID).makeCopy('Inscrição · ' + nomeArq, pasta), planilha = null;
    try {
      var form = FormApp.openById(copia.getId());
      aplicarTextos(form, ev);
      publicar(form); // cópias nascem "não publicadas" no Forms novo
      form.setAcceptingResponses(true);
      planilha = SpreadsheetApp.create('Respostas · ' + nomeArq);
      DriveApp.getFileById(planilha.getId()).moveTo(pasta);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());
      var url = form.getPublishedUrl(), curta = url;
      try { curta = form.shortenFormUrl(url); } catch (e) { }
    } catch (err) {
      // não deixa cópia pela metade na pasta
      try { copia.setTrashed(true); } catch (e) { }
      try { if (planilha) DriveApp.getFileById(planilha.getId()).setTrashed(true); } catch (e) { }
      throw err;
    }
    var agora = new Date().toISOString();
    var insc = {
      formId: form.getId(), url: curta, editUrl: form.getEditUrl(), planilhaUrl: planilha.getUrl(),
      criadoEm: agora, criadoPor: u.email, total: 0, novidades: 0, sincronizadoEm: agora,
      aberto: true, avisoEnviados: 0, avisoPendentes: 0, avisoEm: null
    };
    fsPatch('eventos/' + eid, { inscricao: insc });
    return { inscricao: insc };
  } finally {
    lock.releaseLock();
  }
}

function aplicarTextos(form, ev) {
  var quando = dataLonga(ev.data) + (ev.hora ? ', às ' + horaBR(ev.hora) : '');
  form.setTitle('Inscrição · ' + ev.nome);
  var linhas = ['Quando: ' + quando];
  if (ev.sala) linhas.push('Onde: ' + ev.sala);
  if (ev.convidado) linhas.push('Com: ' + ev.convidado);
  linhas.push('', 'Inscrições abertas até o início do evento. Vamos mandar um lembrete por e-mail antes.');
  form.setDescription(linhas.join('\n'));
  form.setConfirmationMessage('Inscrição confirmada! Te esperamos ' + quando + (ev.sala ? ', na ' + ev.sala : '') +
    '. Você vai receber um lembrete por e-mail antes do evento.');
}

/** Publica o Forms (no Forms novo, cópias nascem como rascunho e não aceitam respostas). */
function publicar(form) {
  if (typeof form.setPublished !== 'function') return; // Forms antigo: já nasce publicado
  if (!form.isPublished()) form.setPublished(true);
}

function pastaInscricoes() {
  var it = DriveApp.getFoldersByName(CFG.PASTA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.PASTA);
}

/* ---------- ler respostas ---------- */
function sincronizarEvento(eid, ev) {
  ev = ev || fsGet('eventos/' + eid);
  if (!ev || !ev.inscricao || !ev.inscricao.formId) throw new Error('Esse evento ainda não tem Forms de inscrição.');
  var insc = ev.inscricao, form = FormApp.openById(insc.formId), agora = new Date();
  var porEmail = {}, semEmail = [];
  form.getResponses().forEach(function (r) {
    var x = lerResposta(r);
    if (x.email) porEmail[x.email] = x; else semEmail.push(x); // a última resposta de cada e-mail vale
  });
  var lista = Object.keys(porEmail).map(function (k) { return porEmail[k]; }).concat(semEmail);
  fsPatch('inscricoes/' + eid, { evento: eid, respostas: lista, atualizadoEm: agora.toISOString() });
  insc.total = lista.length;
  insc.novidades = lista.filter(function (x) { return x.novidades === true; }).length;
  insc.sincronizadoEm = agora.toISOString();
  if (inicio(ev) <= agora && form.isAcceptingResponses()) form.setAcceptingResponses(false);
  else if (inicio(ev) > agora) publicar(form);
  insc.aberto = form.isAcceptingResponses();
  fsPatch('eventos/' + eid, { inscricao: insc });
  return { inscricao: insc };
}

function lerResposta(r) {
  var x = { em: r.getTimestamp().toISOString(), email: '', nome: '', telefone: '', comoSoube: '', imagem: null, novidades: null, extras: {} };
  try { x.email = String(r.getRespondentEmail() || '').toLowerCase().trim(); } catch (e) { }
  r.getItemResponses().forEach(function (ir) {
    var t = ir.getItem().getTitle(), tl = semAcento(t), v = ir.getResponse();
    var txt = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    if (/nome/.test(tl) && !x.nome) x.nome = txt;
    else if (/telefone|celular|whats/.test(tl) && !/sabendo/.test(tl)) x.telefone = txt;
    else if (/sabendo|soube/.test(tl)) x.comoSoube = txt;
    else if (/imagem/.test(tl)) x.imagem = /^sim/i.test(txt);
    else if (/e-?mail/.test(tl) && /(proximos|novos|novidades|eventos)/.test(tl)) x.novidades = /^sim/i.test(txt);
    else if (/e-?mail/.test(tl) && /@/.test(txt) && !x.email) x.email = txt.toLowerCase().trim();
    else x.extras[t] = txt;
  });
  return x;
}

/* ---------- lembrete por e-mail ---------- */
function enviarAviso(eid) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    sincronizarEvento(eid);
    var ev = fsGet('eventos/' + eid), ins = fsGet('inscricoes/' + eid) || {};
    var ja = {}; (ins.avisados || []).forEach(function (m) { ja[m] = 1; });
    var fila = (ins.respostas || []).filter(function (r) { return r.email && !ja[r.email]; });
    var cota = MailApp.getRemainingDailyQuota(), n = 0;
    for (var i = 0; i < fila.length && cota > 0; i++) {
      var r = fila[i];
      MailApp.sendEmail({ to: r.email, subject: assunto(ev), htmlBody: corpoEmail(ev, r), name: CFG.REMETENTE });
      ja[r.email] = 1; n++; cota--;
    }
    var insc = ev.inscricao;
    insc.avisoEnviados = Object.keys(ja).length;
    insc.avisoPendentes = fila.length - n;
    if (n) insc.avisoEm = new Date().toISOString();
    fsPatch('inscricoes/' + eid, { avisados: Object.keys(ja) });
    fsPatch('eventos/' + eid, { inscricao: insc });
    return { enviados: n, pendentes: fila.length - n, inscricao: insc };
  } finally {
    lock.releaseLock();
  }
}

function assunto(ev) {
  return 'Lembrete: ' + ev.nome + ' · ' + dataCurta(ev.data) + (ev.hora ? ' às ' + horaBR(ev.hora) : '');
}

function corpoEmail(ev, r) {
  var nome = (r.nome || '').split(' ')[0];
  var linha = function (k, v) { return v ? '<tr><td style="padding:4px 12px 4px 0;color:#6b6259;font-size:13px;text-transform:uppercase;letter-spacing:.08em">' + k + '</td><td style="padding:4px 0;font-size:15px;color:#1a1714"><b>' + esc(v) + '</b></td></tr>' : ''; };
  return '<div style="background:#f3efe8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3dccf">' +
    '<div style="background:#7f0606;color:#ffffff;padding:22px 24px"><div style="font-family:Georgia,serif;font-size:28px">Feashion</div>' +
    '<div style="font-size:10px;letter-spacing:.22em">LIGA DE FASHION BUSINESS FEA-USP</div></div>' +
    '<div style="padding:24px">' +
    '<p style="font-size:16px;color:#1a1714;margin:0 0 12px">' + (nome ? 'Oi, ' + esc(nome) + '!' : 'Oi!') + '</p>' +
    '<p style="font-size:15px;color:#1a1714;line-height:1.5;margin:0 0 16px">Passando para lembrar do evento <b>' + esc(ev.nome) + '</b>. Sua inscrição está confirmada.</p>' +
    '<table style="border-collapse:collapse;margin:0 0 18px">' +
    linha('Quando', dataLonga(ev.data) + (ev.hora ? ', às ' + horaBR(ev.hora) : '')) +
    linha('Onde', ev.sala) + linha('Com', ev.convidado) + '</table>' +
    '<p style="font-size:14px;color:#6b6259;line-height:1.5;margin:0">Chegue uns minutinhos antes para o check-in. Se não puder ir, não precisa fazer nada.</p>' +
    '</div><div style="border-top:1px solid #e3dccf;padding:14px 24px;font-size:12px;color:#8a8178">Diretoria de Eventos · Feashion · Moda | Gestão | Inovação</div>' +
    '</div></div>';
}

/* ---------- rotina automática (gatilho a cada 10 min) ---------- */
function rotina() {
  var agora = new Date(), limite = new Date(agora.getTime() + CFG.HORAS_AVISO * 3600e3);
  var ontem = new Date(agora.getTime() - 36 * 3600e3);
  fsList('eventos').forEach(function (ev) {
    if (!ev.inscricao || !ev.inscricao.formId || !ev.data || ev.status === 'realizado') return;
    var ini = inicio(ev);
    if (ini < ontem) return;
    try {
      sincronizarEvento(ev._id, ev);
      if (ini > agora && ini <= limite) {
        var ins = fsGet('inscricoes/' + ev._id) || {}, ja = {};
        (ins.avisados || []).forEach(function (m) { ja[m] = 1; });
        var falta = (ins.respostas || []).some(function (r) { return r.email && !ja[r.email]; });
        if (falta) enviarAviso(ev._id);
      }
    } catch (err) {
      console.error('Evento ' + ev._id + ': ' + err);
    }
  });
}

/* ---------- instalação: rode uma vez pelo editor ---------- */
function instalar() {
  var f = FormApp.openById(CFG.MODELO_FORM_ID);
  console.log('Modelo encontrado: ' + f.getTitle());
  console.log('Pasta: ' + pastaInscricoes().getUrl());
  console.log('Firestore ok, DEV: ' + ((fsGet('config/dev') || {}).email || '(ninguém ainda)'));
  console.log('Cota de e-mails hoje: ' + MailApp.getRemainingDailyQuota());
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'rotina') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rotina').timeBased().everyMinutes(10).create();
  console.log('Pronto: rotina agendada a cada 10 minutos.');
}

/* ---------- Firestore (REST, com o login do dono do script) ---------- */
function cab() {
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': CFG.PROJETO };
}
function fsGet(path) {
  var r = UrlFetchApp.fetch(FS + path, { headers: cab(), muteHttpExceptions: true });
  if (r.getResponseCode() === 404) return null;
  if (r.getResponseCode() !== 200) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return dec(JSON.parse(r.getContentText()));
}
function fsList(col) {
  var out = [], tok = '';
  do {
    var r = UrlFetchApp.fetch(FS + col + '?pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''), { headers: cab(), muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
    var j = JSON.parse(r.getContentText());
    (j.documents || []).forEach(function (d) { out.push(dec(d)); });
    tok = j.nextPageToken || '';
  } while (tok);
  return out;
}
/** Grava só os campos de `obj` (os outros campos do documento ficam como estão). */
function fsPatch(path, obj) {
  var q = Object.keys(obj).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  var r = UrlFetchApp.fetch(FS + path + '?' + q, {
    method: 'patch', contentType: 'application/json', headers: cab(), muteHttpExceptions: true,
    payload: JSON.stringify({ fields: encFields(obj) })
  });
  if (r.getResponseCode() !== 200) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
}
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (v instanceof Date) return { stringValue: v.toISOString() };
  switch (typeof v) {
    case 'boolean': return { booleanValue: v };
    case 'number': return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    case 'string': return { stringValue: v };
    case 'object': return { mapValue: { fields: encFields(v) } };
  }
  return { stringValue: String(v) };
}
function encFields(o) { var f = {}; Object.keys(o).forEach(function (k) { f[k] = enc(o[k]); }); return f; }
function dec(doc) { var o = decFields(doc.fields || {}); o._id = doc.name.split('/').pop(); return o; }
function decFields(f) { var o = {}; Object.keys(f).forEach(function (k) { o[k] = decV(f[k]); }); return o; }
function decV(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decV);
  return null;
}

/* ---------- datas e textos ---------- */
var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function partes(iso) { var p = String(iso).split('-'); return { a: +p[0], m: +p[1], d: +p[2] }; }
function dataCurta(iso) { var p = partes(iso); return ('0' + p.d).slice(-2) + '/' + ('0' + p.m).slice(-2); }
function dataLonga(iso) { var p = partes(iso), dt = new Date(p.a, p.m - 1, p.d); return DIAS[dt.getDay()] + ', ' + p.d + ' de ' + MESES[p.m - 1]; }
function horaBR(h) { var p = String(h).split(':'); return +p[0] + 'h' + (p[1] && p[1] !== '00' ? p[1] : ''); }
/** Início do evento no fuso do script (America/Sao_Paulo). */
function inicio(ev) { var p = partes(ev.data), h = String(ev.hora || '00:00').split(':'); return new Date(p.a, p.m - 1, p.d, +h[0] || 0, +h[1] || 0); }
function semAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
