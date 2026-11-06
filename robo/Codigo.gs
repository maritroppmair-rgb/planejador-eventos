/**
 * Robô de inscrições · Planejador de Eventos · Feashion
 *
 * O que faz:
 *  1. criarForm – copia o Forms modelo para um evento, ajusta título, descrição e confirmação,
 *                 liga uma planilha de respostas e grava o link no evento (eventos/{id}.inscricao).
 *  2. rotina    – a cada 10 min: lê as respostas, grava em inscricoes/{id}, fecha o Forms no prazo
 *                 e manda os e-mails automáticos (confirmação, lembrete, aviso no dia, agradecimento)
 *                 e os que ficaram na fila (aviso de mudança, convite para a lista de novidades).
 *  3. e-mails   – textos padrão em MODELOS; cada evento pode ter o próprio texto (eventos/{id}.emails).
 *                 Quem recebeu cada tipo fica em inscricoes/{id}.envios.
 *
 * Roda na conta Google dona do projeto Firebase. Os e-mails saem dessa conta,
 * com o nome REMETENTE. Passo a passo de instalação: robo/LEIAME.md
 */

// ====================== CONFIGURAÇÃO ======================
var CFG = {
  PROJETO: 'feashion-eventos-teste',
  API_KEY: 'AIzaSyCz5Jf_-IAoXQbuU2oDq7TKyrBLw_5hap0', // a mesma do config.js do site (não é senha)
  MODELO_FORM_ID: '1tqsmAgRnyKDn-5tbWg-9pkhDfekBQcMe2BolOvCpjjQ',
  PASTA: 'Feashion · Inscrições',
  REMETENTE: 'Feashion · Diretoria de Eventos',
  HORAS_AVISO: 48,          // lembrete por e-mail a partir de X horas antes
  FECHAR_HORAS_ANTES: 36,   // inscrições fecham X horas antes do início
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
    if (b.acao === 'modelos') out = { modelos: MODELOS, tipos: TIPOS };
    else {
      if (!b.evento) throw new Error('Evento não informado.');
      if (b.acao === 'criarForm') out = criarForm(b.evento, u);
      else if (b.acao === 'sincronizar') out = sincronizarEvento(b.evento);
      else if (b.acao === 'atualizarForm') out = sincronizarEvento(b.evento, null, true);
      else if (b.acao === 'enviarAviso') out = enviarTipo(b.evento, 'lembrete');
      else if (b.acao === 'enviar') out = enviarManual(b.evento, b.tipo);
      else if (b.acao === 'previa') out = previa(b.evento, b.tipo, b.texto, null);
      else if (b.acao === 'teste') out = previa(b.evento, b.tipo, b.texto, u.email);
      else if (b.acao === 'alcance') out = { alcance: listaNovidades(fsGet('eventos/' + b.evento) || {}).length };
      else throw new Error('Ação desconhecida.');
    }
    out.ok = true;
  } catch (err) {
    console.error(err);
    out = { ok: false, erro: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.sair) {
    var email = '';
    try { email = Utilities.newBlob(Utilities.base64DecodeWebSafe(p.sair)).getDataAsString(); } catch (x) { }
    if (!email || p.t !== assinar(email)) return pagina('Link inválido', 'Esse link de descadastro não é válido.');
    fsPatch('descadastros/' + hashEmail(email), { email: email, em: new Date().toISOString() });
    return pagina('Pronto', 'Você não vai mais receber convites de novos eventos da Feashion. Se mudar de ideia, é só marcar a opção de novidades na próxima inscrição.');
  }
  return ContentService.createTextOutput('Robô de inscrições da Feashion no ar.');
}
function pagina(t, m) {
  return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><div style="font-family:Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;color:#1a1714"><div style="background:#7f0606;color:#fff;padding:18px 20px;font-family:Georgia,serif;font-size:26px">Feashion</div><h2 style="font-family:Georgia,serif">' + esc(t) + '</h2><p style="line-height:1.5">' + esc(m) + '</p></div>').setTitle('Feashion');
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
    if (new Date() >= fechamento(ev)) throw new Error('As inscrições fecham ' + CFG.FECHAR_HORAS_ANTES + ' h antes do evento, e esse prazo já passou.');
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
      assinatura: assinatura(ev), criadoEm: agora, criadoPor: u.email, total: 0, novidades: 0, sincronizadoEm: agora,
      aberto: true, fechaEm: fechamento(ev).toISOString(), emailsDesde: agora, resumo: resumo(ev), emails: {}
    };
    fsPatch('eventos/' + eid, { inscricao: insc });
    return { inscricao: insc };
  } finally {
    lock.releaseLock();
  }
}

/** O que vai no texto do Forms; se mudar no app, o Forms é atualizado. */
function assinatura(ev) {
  return [ev.nome, ev.data, ev.hora, ev.sala, ev.convidado].map(function (x) { return x == null ? '' : String(x); }).join('|');
}

function aplicarTextos(form, ev) {
  var quando = dataLonga(ev.data) + (ev.hora ? ', às ' + horaBR(ev.hora) : '');
  form.setTitle('Inscrição · ' + ev.nome);
  var linhas = ['Quando: ' + quando];
  if (ev.sala) linhas.push('Onde: ' + ev.sala);
  if (ev.convidado) linhas.push('Com: ' + ev.convidado);
  linhas.push('', 'Inscrições abertas até ' + dataHoraBR(fechamento(ev)) + '. Vamos mandar um lembrete por e-mail antes do evento.');
  form.setDescription(linhas.join('\n'));
  try { form.setCustomClosedFormMessage('As inscrições para ' + ev.nome + ' estão encerradas. Fique de olho no Instagram da Feashion para os próximos eventos!'); } catch (e) { }
  form.setConfirmationMessage('Inscrição confirmada! Te esperamos ' + quando + (ev.sala ? ', na ' + ev.sala : '') +
    '. Você vai receber um lembrete por e-mail antes do evento.');
}

/** Publica o Forms (no Forms novo, cópias nascem como rascunho e não aceitam respostas). */
function publicar(form) {
  if (typeof form.setPublished === 'function' && !form.isPublished()) form.setPublished(true);
  liberarRespostas(form.getId());
}

/** No Forms novo, quem pode responder é definido por uma permissão do Drive: "qualquer pessoa com o link". */
function liberarRespostas(id) {
  var r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '/permissions?sendNotificationEmail=false', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ type: 'anyone', role: 'reader', view: 'published' })
  });
  if (r.getResponseCode() >= 300) console.warn('Permissão de resposta: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
}

/** Rode pelo editor para conferir e consertar os Forms já criados (publica, libera "qualquer pessoa com o link" e reabre). */
function consertarForms() {
  var agora = new Date();
  fsList('eventos').forEach(function (ev) {
    if (!ev.inscricao || !ev.inscricao.formId) return;
    var form = FormApp.openById(ev.inscricao.formId);
    var antes = 'publicado=' + (typeof form.isPublished === 'function' ? form.isPublished() : '(n/a)') + ' aceitando=' + form.isAcceptingResponses();
    if (agora < fechamento(ev)) { publicar(form); form.setAcceptingResponses(true); }
    console.log(ev.nome + ' | antes: ' + antes + ' | agora: publicado=' + (typeof form.isPublished === 'function' ? form.isPublished() : '(n/a)') +
      ' aceitando=' + form.isAcceptingResponses() + ' | ' + form.getPublishedUrl());
  });
}

function pastaInscricoes() {
  var it = DriveApp.getFoldersByName(CFG.PASTA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.PASTA);
}

/* ---------- ler respostas ---------- */
function sincronizarEvento(eid, ev, forcarTextos) {
  ev = ev || fsGet('eventos/' + eid);
  if (!ev || !ev.inscricao || !ev.inscricao.formId) throw new Error('Esse evento ainda não tem Forms de inscrição.');
  var insc = ev.inscricao, form = FormApp.openById(insc.formId), agora = new Date();
  // evento mudou no app (nome, data, hora, sala, convidado): atualiza o mesmo Forms, sem criar outro
  if (!insc.emailsDesde) insc.emailsDesde = agora.toISOString(); // quem se inscreveu antes do recurso não recebe confirmação atrasada
  var novoResumo = resumo(ev);
  if (insc.resumo && ev.data && inicio(ev) > agora && (+insc.total || 0) > 0) {
    var mud = descreverMudanca(insc.resumo, novoResumo);
    if (mud) insc.mudanca = { pendente: true, enviar: false, texto: mud, em: agora.toISOString() };
  }
  insc.resumo = novoResumo;
  if (forcarTextos || insc.assinatura !== assinatura(ev)) {
    aplicarTextos(form, ev);
    var nomeArq = ev.nome + ' · ' + dataCurta(ev.data);
    try { DriveApp.getFileById(insc.formId).setName('Inscrição · ' + nomeArq); } catch (e) { }
    try { if (insc.planilhaUrl) SpreadsheetApp.openByUrl(insc.planilhaUrl).rename('Respostas · ' + nomeArq); } catch (e) { }
    insc.assinatura = assinatura(ev);
    insc.textoEm = agora.toISOString();
    if (agora < fechamento(ev) && !form.isAcceptingResponses()) { publicar(form); form.setAcceptingResponses(true); } // data mudou para frente: reabre
  }
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
  // fecha sozinho FECHAR_HORAS_ANTES antes do início (não reabre um Forms fechado à mão)
  if (agora >= fechamento(ev) && form.isAcceptingResponses()) form.setAcceptingResponses(false);
  insc.aberto = form.isAcceptingResponses();
  insc.fechaEm = fechamento(ev).toISOString();
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

/* ---------- e-mails ---------- */
var TIPOS = {
  confirmacao:   { nome: 'Confirmação de inscrição', auto: true,  quando: 'até 10 min depois de cada inscrição' },
  lembrete:      { nome: 'Lembrete',                 auto: true,  quando: 'a partir de ' + CFG.HORAS_AVISO + ' h antes' },
  dia:           { nome: 'Aviso no dia',             auto: false, quando: '3 h antes do início' },
  agradecimento: { nome: 'Agradecimento',            auto: true,  quando: 'no dia seguinte ao evento' },
  mudanca:       { nome: 'Aviso de mudança',         auto: false, quando: 'quando data, horário, sala ou nome mudam (você confirma)' },
  divulgacao:    { nome: 'Convite para a lista de novidades', auto: false, quando: 'quando você mandar' }
};
var MODELOS = {
  confirmacao:   { assunto: 'Inscrição confirmada: {evento}', corpo: 'Oi, {nome}!\n\nSua inscrição no evento {evento} está confirmada. Anota aí:\n\n{detalhes}\n\nPerto do dia a gente manda um lembrete. Até lá!' },
  lembrete:      { assunto: 'Lembrete: {evento} · {data_curta}', corpo: 'Oi, {nome}!\n\nPassando para lembrar do evento {evento}. Sua inscrição está confirmada.\n\n{detalhes}\n\nChegue uns minutinhos antes para o check-in. Se não puder ir, não precisa fazer nada.' },
  dia:           { assunto: 'É hoje: {evento} às {hora}', corpo: 'Oi, {nome}!\n\nHoje tem {evento}, e a gente te espera.\n\n{detalhes}\n\nChegue uns minutinhos antes para o check-in.' },
  agradecimento: { assunto: 'Obrigado por participar: {evento}', corpo: 'Oi, {nome}!\n\nObrigado por ter se inscrito no evento {evento}. Sua opinião ajuda a gente a fazer eventos cada vez melhores:\n\n{link_avaliacao}\n\nAté o próximo!' },
  mudanca:       { assunto: 'Mudança no evento: {evento}', corpo: 'Oi, {nome}!\n\nO evento {evento} mudou: {mudanca}.\n\nComo fica agora:\n\n{detalhes}\n\nSua inscrição continua valendo. Se não puder mais ir, não precisa fazer nada.' },
  divulgacao:    { assunto: 'Novo evento da Feashion: {evento}', corpo: 'Oi, {nome}!\n\nVocê pediu para receber os próximos eventos da Feashion, então aqui vai o convite:\n\n{detalhes}\n\nAs vagas são limitadas. Inscreva-se pelo link:\n\n{link_inscricao}' }
};

/** Monta assunto e HTML de um e-mail para uma pessoa. `txt` = texto em edição no app (opcional). */
function render(tipo, ev, r, txt) {
  var base = MODELOS[tipo], prop = (ev.emails && ev.emails[tipo]) || {};
  var t = { assunto: (txt && txt.assunto) || prop.assunto || base.assunto, corpo: (txt && txt.corpo) || prop.corpo || base.corpo };
  var insc = ev.inscricao || {}, linkAval = (txt && txt.linkAvaliacao != null) ? txt.linkAvaliacao : (ev.linkAvaliacao || '');
  var v = {
    nome: String((r && r.nome) || '').trim().split(/\s+/)[0] || 'pessoal', evento: ev.nome || '', data_curta: ev.data ? dataCurta(ev.data) : '',
    hora: ev.hora ? horaBR(ev.hora) : '', quando: quando(ev), sala: ev.sala || 'a confirmar', convidado: ev.convidado || '',
    mudanca: (insc.mudanca && insc.mudanca.texto) || 'algumas informações mudaram', link_inscricao: insc.url || '', link_avaliacao: linkAval
  };
  var troca = function (s, html) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return k in v ? (html ? esc(v[k]) : v[k]) : m; }); };
  var linha = function (k, x) { return x ? '<tr><td style="padding:4px 14px 4px 0;color:#6b6259;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">' + k + '</td><td style="padding:4px 0;font-size:15px;color:#1a1714"><b>' + esc(x) + '</b></td></tr>' : ''; };
  var botao = function (url, rot) { return url ? '<p style="margin:0 0 16px"><a href="' + esc(url) + '" style="display:inline-block;background:#7f0606;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:14px">' + rot + '</a></p>' : ''; };
  var corpo = String(t.corpo).replace(/\r/g, '').split(/\n\s*\n/).map(function (par) {
    var p = par.trim();
    if (!p) return '';
    if (p === '{detalhes}') return '<table style="border-collapse:collapse;margin:0 0 16px">' + linha('Quando', v.quando) + linha('Onde', ev.sala) + linha('Com', ev.convidado) + '</table>';
    if (p === '{link_inscricao}') return botao(v.link_inscricao, 'Quero me inscrever');
    if (p === '{link_avaliacao}') return botao(v.link_avaliacao, 'Avaliar o evento');
    var h = troca(esc(p).replace(/\{(\w+)\}/g, '{$1}'), true).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#7f0606">$1</a>');
    return '<p style="font-size:15px;color:#1a1714;line-height:1.55;margin:0 0 14px">' + h + '</p>';
  }).join('');
  var rodape = tipo === 'divulgacao'
    ? 'Você recebeu porque pediu novidades da Feashion numa inscrição. <a href="' + esc(linkSair(r && r.email)) + '" style="color:#8a8178">Não quero mais receber convites</a>'
    : 'Você recebeu porque se inscreveu em ' + esc(ev.nome || 'um evento da Feashion') + '.';
  var html = '<div style="background:#f3efe8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3dccf">' +
    '<div style="background:#7f0606;color:#ffffff;padding:22px 24px"><div style="font-family:Georgia,serif;font-size:28px">Feashion</div>' +
    '<div style="font-size:10px;letter-spacing:.22em">LIGA DE FASHION BUSINESS FEA-USP</div></div>' +
    '<div style="padding:24px 24px 10px">' + corpo + '</div>' +
    '<div style="border-top:1px solid #e3dccf;padding:14px 24px;font-size:12px;color:#8a8178;line-height:1.5">Diretoria de Eventos · Feashion · Moda | Gestão | Inovação<br>' + rodape + '</div>' +
    '</div></div>';
  return { assunto: troca(t.assunto, false), html: html };
}

/** Quem recebe cada tipo. */
function destinatarios(tipo, ev, ins) {
  var rs = (ins.respostas || []).filter(function (r) { return r.email; });
  if (tipo === 'confirmacao') { var desde = (ev.inscricao && ev.inscricao.emailsDesde) || ''; return rs.filter(function (r) { return !desde || r.em >= desde; }); }
  if (tipo === 'divulgacao') return listaNovidades(ev, rs);
  return rs;
}
/** Quem marcou "quero receber novidades" em qualquer inscrição, menos quem já está inscrito neste evento e quem saiu da lista. */
function listaNovidades(ev, inscritos) {
  var fora = {};
  (inscritos || (fsGet('inscricoes/' + ev._id) || {}).respostas || []).forEach(function (r) { if (r.email) fora[r.email] = 1; });
  fsList('descadastros').forEach(function (d) { if (d.email) fora[String(d.email).toLowerCase()] = 1; });
  var out = {};
  fsList('inscricoes').forEach(function (i) {
    (i.respostas || []).forEach(function (r) { if (r.email && r.novidades === true && !fora[r.email]) out[r.email] = r; });
  });
  return Object.keys(out).map(function (k) { return out[k]; });
}

/** Envia um tipo de e-mail para quem ainda não recebeu, respeitando a cota diária. */
function enviarTipo(eid, tipo) {
  if (!MODELOS[tipo]) throw new Error('Tipo de e-mail desconhecido.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ev = fsGet('eventos/' + eid);
    if (!ev || !ev.inscricao || !ev.inscricao.formId) throw new Error('Esse evento ainda não tem Forms de inscrição.');
    var ins = fsGet('inscricoes/' + eid) || {}, envios = ins.envios || {}, agora = new Date().toISOString();
    var e = envios[tipo] || { emails: [], erros: [] };
    e.emails = e.emails || []; e.erros = e.erros || [];
    if (tipo === 'lembrete' && ins.avisados) ins.avisados.forEach(function (m) { if (e.emails.indexOf(m) < 0) e.emails.push(m); });
    if (tipo === 'mudanca') { var chave = (ev.inscricao.mudanca && ev.inscricao.mudanca.em) || ''; if (e.chave !== chave) e = { emails: [], erros: [], chave: chave }; }
    var ja = {}; e.emails.forEach(function (m) { ja[m] = 1; });
    var falhas = {}; e.erros.forEach(function (x) { falhas[x.email] = (falhas[x.email] || 0) + 1; });
    var fila = destinatarios(tipo, ev, ins).filter(function (r) { return !ja[r.email] && (falhas[r.email] || 0) < 2; });
    var cota = MailApp.getRemainingDailyQuota(), reserva = tipo === 'divulgacao' ? 10 : 0, n = 0;
    for (var i = 0; i < fila.length && cota > reserva; i++) {
      var r = fila[i];
      try {
        var m = render(tipo, ev, r);
        MailApp.sendEmail({ to: r.email, subject: m.assunto, htmlBody: m.html, name: CFG.REMETENTE });
        e.emails.push(r.email); n++;
      } catch (err) {
        e.erros.push({ email: r.email, erro: String(err && err.message || err).slice(0, 200), em: agora });
      }
      cota--;
    }
    if (n) e.em = agora;
    envios[tipo] = e;
    fsPatch('inscricoes/' + eid, { envios: envios });
    var pend = destinatarios(tipo, ev, ins).filter(function (r) { return e.emails.indexOf(r.email) < 0; }).length;
    var insc = ev.inscricao;
    insc.emails = insc.emails || {};
    insc.emails[tipo] = { enviados: e.emails.length, pendentes: pend, erros: e.erros.length, em: e.em || null };
    if (tipo === 'mudanca' && insc.mudanca) { insc.mudanca.pendente = false; insc.mudanca.enviar = pend > 0; }
    if (tipo === 'divulgacao') insc.divulgacaoAtiva = pend > 0;
    insc.cota = MailApp.getRemainingDailyQuota(); insc.cotaEm = agora;
    fsPatch('eventos/' + eid, { inscricao: insc });
    return { enviados: n, pendentes: pend, inscricao: insc };
  } finally {
    lock.releaseLock();
  }
}

/** Envio pedido pelo botão do app. Mudança e convite continuam sozinhos nos dias seguintes se a cota acabar. */
function enviarManual(eid, tipo) {
  if (tipo === 'divulgacao') {
    var ev = fsGet('eventos/' + eid);
    if (!ev || !ev.inscricao || !ev.inscricao.formId) throw new Error('Crie o Forms de inscrição antes de convidar a lista.');
    if (ev.inscricao.aberto === false || new Date() >= fechamento(ev)) throw new Error('As inscrições desse evento já fecharam.');
  }
  return enviarTipo(eid, tipo);
}

/** Prévia (ou teste para o próprio e-mail) com o texto que está sendo editado no app. */
function previa(eid, tipo, texto, para) {
  var ev = fsGet('eventos/' + eid);
  if (!ev) throw new Error('Evento não encontrado.');
  if (!MODELOS[tipo]) throw new Error('Tipo de e-mail desconhecido.');
  var r = { nome: 'Fulana de Tal', email: para || 'exemplo@usp.br' };
  var m = render(tipo, ev, r, texto || null);
  if (para) { MailApp.sendEmail({ to: para, subject: '[TESTE] ' + m.assunto, htmlBody: m.html, name: CFG.REMETENTE }); return { enviadoPara: para, cota: MailApp.getRemainingDailyQuota() }; }
  return { assunto: m.assunto, html: m.html };
}

/** Descadastro da lista de novidades (só vale para os convites). */
function segredo() {
  var pr = PropertiesService.getScriptProperties(), s = pr.getProperty('SEGREDO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('SEGREDO', s); }
  return s;
}
function assinar(email) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(email), segredo())).slice(0, 22); }
function hashEmail(email) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(email)).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 32); }
function linkSair(email) { if (!email) return '#'; var u = ''; try { u = ScriptApp.getService().getUrl(); } catch (e) { } return u + '?sair=' + Utilities.base64EncodeWebSafe(String(email)) + '&t=' + assinar(email); }

/** Resumo do evento para detectar mudanças que valem aviso. */
function resumo(ev) { return { nome: ev.nome || '', quando: ev.data ? quando(ev) : '', sala: ev.sala || '' }; }
function descreverMudanca(a, b) {
  var p = [];
  if (a.quando !== b.quando) p.push('agora é ' + b.quando + ' (antes: ' + a.quando + ')');
  if (a.sala !== b.sala) p.push('o local agora é ' + (b.sala || 'a confirmar') + (a.sala ? ' (antes: ' + a.sala + ')' : ''));
  if (a.nome !== b.nome) p.push('o nome agora é ' + b.nome);
  return p.join('; ');
}
function quando(ev) { return ev.data ? dataLonga(ev.data) + (ev.hora ? ', às ' + horaBR(ev.hora) : '') : ''; }
function autoLigado(ev, tipo) { var c = (ev.emails || {})[tipo]; return c && c.auto != null ? !!c.auto : TIPOS[tipo].auto; }

/* ---------- rotina automática (gatilho a cada 10 min) ---------- */
function rotina() {
  try { sincronizarEquipe(); } catch (err) { console.error('Equipe: ' + err); }
  var agora = new Date(), H = 3600e3;
  fsList('eventos').forEach(function (ev) {
    if (!ev.inscricao || !ev.inscricao.formId || !ev.data) return;
    var ini = inicio(ev), fim = new Date(ini.getTime() + (+ev.duracao || 120) * 60e3);
    if (agora > new Date(fim.getTime() + 6 * 24 * H)) return; // evento antigo: nada a fazer
    try {
      if (agora < new Date(ini.getTime() + 36 * H) && ev.status !== 'realizado') ev.inscricao = sincronizarEvento(ev._id, ev).inscricao;
      var faz = function (tipo) { try { enviarTipo(ev._id, tipo); } catch (e) { console.error(ev._id + ' ' + tipo + ': ' + e); } };
      var pend = function (tipo) { var x = (ev.inscricao.emails || {})[tipo]; return !x || x.pendentes !== 0 || (+ev.inscricao.total || 0) > (x.enviados || 0); };
      if (agora < ini && autoLigado(ev, 'confirmacao') && pend('confirmacao')) faz('confirmacao');
      if (agora < ini && agora >= new Date(ini.getTime() - CFG.HORAS_AVISO * H) && autoLigado(ev, 'lembrete') && pend('lembrete')) faz('lembrete');
      if (agora < ini && agora >= new Date(ini.getTime() - 3 * H) && autoLigado(ev, 'dia') && pend('dia')) faz('dia');
      if (agora >= new Date(fim.getTime() + 14 * H) && autoLigado(ev, 'agradecimento') && pend('agradecimento')) faz('agradecimento');
      if (agora < ini && ev.inscricao.mudanca && ev.inscricao.mudanca.enviar) faz('mudanca');
      if (agora < fechamento(ev) && ev.inscricao.divulgacaoAtiva) faz('divulgacao');
    } catch (err) {
      console.error('Evento ' + ev._id + ': ' + err);
    }
  });
}

/* ---------- equipe: quem tem cargo no app edita a pasta (Forms e planilhas herdam) ---------- */
function sincronizarEquipe() {
  var pasta = pastaInscricoes(), id = pasta.getId(), dono = Session.getEffectiveUser().getEmail().toLowerCase();
  var querem = {};
  fsList('membros').forEach(function (m) {
    var e = String(m.email || '').toLowerCase().trim();
    if (e && CFG.CARGOS_QUE_EDITAM.indexOf(m.cargo || '') >= 0) querem[e] = 1;
  });
  delete querem[dono];
  var j = drive('get', id + '/permissions?fields=permissions(id,emailAddress,role,type)');
  var tem = {};
  (j.permissions || []).forEach(function (p) {
    if (p.type !== 'user' || p.role === 'owner') return;
    var e = String(p.emailAddress || '').toLowerCase();
    if (querem[e]) tem[e] = 1;
    else drive('delete', id + '/permissions/' + p.id); // perdeu o cargo ou saiu da equipe
  });
  Object.keys(querem).forEach(function (e) {
    if (!tem[e]) drive('post', id + '/permissions?sendNotificationEmail=false', { type: 'user', role: 'writer', emailAddress: e });
  });
  return Object.keys(querem);
}
function drive(metodo, caminho, corpo) {
  var o = { method: metodo, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
  if (corpo) { o.contentType = 'application/json'; o.payload = JSON.stringify(corpo); }
  var r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + caminho, o);
  if (r.getResponseCode() >= 300) throw new Error('Drive ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  var t = r.getContentText();
  return t ? JSON.parse(t) : {};
}

/* ---------- instalação: rode uma vez pelo editor ---------- */
function instalar() {
  var f = FormApp.openById(CFG.MODELO_FORM_ID);
  console.log('Modelo encontrado: ' + f.getTitle());
  console.log('Pasta: ' + pastaInscricoes().getUrl());
  console.log('Equipe com acesso de edição: ' + sincronizarEquipe().join(', '));
  console.log('Firestore ok, DEV: ' + ((fsGet('config/dev') || {}).email || '(ninguém ainda)'));
  console.log('Cota de e-mails hoje: ' + MailApp.getRemainingDailyQuota());
  segredo();
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
/** Quando as inscrições fecham. */
function fechamento(ev) { return new Date(inicio(ev).getTime() - CFG.FECHAR_HORAS_ANTES * 3600e3); }
function dataHoraBR(d) {
  var tz = Session.getScriptTimeZone();
  return dataLonga(Utilities.formatDate(d, tz, 'yyyy-MM-dd')) + ', às ' + horaBR(Utilities.formatDate(d, tz, 'HH:mm'));
}
function inicio(ev) { var p = partes(ev.data), h = String(ev.hora || '00:00').split(':'); return new Date(p.a, p.m - 1, p.d, +h[0] || 0, +h[1] || 0); }
function semAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
