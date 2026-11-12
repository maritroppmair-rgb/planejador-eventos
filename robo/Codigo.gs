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
  PROJETO: 'planejador-de-eventos-261df',
  API_KEY: 'AIzaSyDjV_CFtFYSXvyrT25ybt3v8vuGFNnumm8', // a mesma do config.js do site (não é senha)
  MODELO_FORM_ID: '1HVmot9qs1QoAu9vt_P_zWy7MzOyQsfcaL8QtDnw9Uy8', // reserva: o que vale é o link salvo em Parâmetros no site
  MODELO_FEEDBACK_ID: '1JL7d0tw2OxW8aV8q-rr_t8oE16r7nm1s0vzzJqxFSfg', // reserva: o que vale é o link salvo em Parâmetros no site
  FEEDBACK_DIAS: 30,        // o Forms de feedback recebe respostas até X dias depois do evento (e o robô lê até lá)
  PASTA: 'Feashion · Inscrições',
  PASTA_FEEDBACK: 'Feashion · Feedbacks', // Forms de feedback e planilhas de respostas (mesmo acesso de edição da pasta das inscrições)
  PASTA_FOTOS: 'Feashion · Fotos de eventos', // uma subpasta por evento, criada pelo botão da Ficha
  REMETENTE: 'Feashion · Diretoria de Eventos',
  SITE: 'https://maritroppmair-rgb.github.io/planejador-eventos/', // link dos e-mails de etapas (abre em Pendências)
  HORAS_AVISO: 48,          // lembrete por e-mail a partir de X horas antes
  FECHAR_HORAS_ANTES: 36,   // inscrições fecham X horas antes do início
  CARGOS_QUE_EDITAM: ['DEV', 'Presidente', 'Vice-presidente', 'Diretor(a)', 'Coordenador(a)', 'Membro(a)', 'Trainee'],
  IA_MODELO: 'gemini-3.5-flash-lite', // rápido e com pouca fila; troque se o AI Studio tirar do ar
  IA_RESERVA: ['gemini-3.1-flash-lite', 'gemini-3.5-flash'], // tentados na hora, sem espera, se o principal falhar
  IA_LIMITE_DIA: 30              // pedidos de proposta por pessoa por dia
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
    else if (b.acao === 'mailingAtualizar') { atualizarMailing(); out = {}; }
    else if (b.acao === 'ideia') out = ideia(b, u);
    else {
      if (b.acao === 'mailingPrevia') out = mailingPrevia(b.evento, b.texto, null);
      else if (b.acao === 'mailingTeste') out = mailingPrevia(b.evento, b.texto, u.email);
      else if (!b.evento) throw new Error('Evento não informado.');
      else if (b.acao === 'criarForm') out = criarForm(b.evento, u);
      else if (b.acao === 'criarPastaFotos') out = criarPastaFotos(b.evento);
      else if (b.acao === 'criarFeedback') out = criarFeedback(b.evento, u);
      else if (b.acao === 'sincronizarFeedback') out = sincronizarFeedback(b.evento);
      else if (b.acao === 'sincronizar') out = sincronizarEvento(b.evento);
      else if (b.acao === 'atualizarForm') out = sincronizarEvento(b.evento, null, true);
      else if (b.acao === 'enviarAviso') out = enviarTipo(b.evento, 'lembrete');
      else if (b.acao === 'enviar') out = enviarManual(b.evento, b.tipo);
      else if (b.acao === 'previa') out = previa(b.evento, b.tipo, b.texto, null);
      else if (b.acao === 'teste') out = previa(b.evento, b.tipo, b.texto, u.email);
      else if (b.acao === 'mailingAgora') out = mailingEnviarAgora(b.evento, b.envio);
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
  if (p.c) return clique(p);
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
  return { email: email, uid: u.localId, cargo: ehDev ? 'DEV' : cargoEventos(m) };
}
/* o mesmo critério do site: presidência vale em todas as áreas; senão, o cargo na área Eventos.
   Perfis antigos (sem áreas) guardavam o cargo de Eventos em `cargo`. Diretoria de outra área não edita Eventos. */
function cargoEventos(m) {
  if (!m) return '';
  if (m.cargo === 'DEV') return 'DEV';
  if (m.presidencia === 'Presidente' || m.presidencia === 'Vice-presidente') return m.presidencia;
  if (m.areas && typeof m.areas === 'object') return String(m.areas.Eventos || '');
  return String(m.cargo || '');
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
    var copia = DriveApp.getFileById(modeloFormId()).makeCopy('Inscrição · ' + nomeArq, pasta), planilha = null;
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
function pastaFeedbacks() {
  var it = DriveApp.getFoldersByName(CFG.PASTA_FEEDBACK);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.PASTA_FEEDBACK);
}

/* ---------- Forms de feedback de um evento ----------
   Igual à inscrição: o robô copia o Forms padrão de feedback (Parâmetros no site) para a pasta "Feashion · Feedbacks", troca título, descrição
   e mensagens pelos dados do evento e cria a planilha de respostas. Nas perguntas, {evento}, {convidado}, {data} e {sala}
   viram os dados do evento. Nasce quando alguém marca "Forms de feedback" nos avisos do evento; o botão "Avaliar o evento"
   do agradecimento passa a abrir este Forms. eventos/{id}.feedback = {formId, url, editUrl, planilhaUrl, ligado, total,
   satisfacao (parte das notas que foram as duas mais altas), perguntas: [{t, min, max, rot, n, media, dist}], comentarios: [{p, txt, em}]} */
function modeloFeedbackId() {
  var d = null;
  try { d = fsGet('parametros/feedback'); } catch (err) { console.error('Parâmetros: ' + err); }
  return (d && d.modeloFormId) || CFG.MODELO_FEEDBACK_ID;
}
function criarFeedback(eid, u) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ev = fsGet('eventos/' + eid);
    if (!ev) throw new Error('Evento não encontrado.');
    if (ev.feedback && ev.feedback.formId) {
      if (ev.feedback.ligado === false) { ev.feedback.ligado = true; fsPatch('eventos/' + eid, { feedback: ev.feedback }); }
      return { feedback: ev.feedback, jaExistia: true };
    }
    if (!ev.data) throw new Error('O evento precisa ter data antes do Forms de feedback.');
    var pasta = pastaFeedbacks(), nomeArq = ev.nome + ' · ' + dataCurta(ev.data);
    var copia = DriveApp.getFileById(modeloFeedbackId()).makeCopy('Feedback · ' + nomeArq, pasta), planilha = null;
    try {
      var form = FormApp.openById(copia.getId());
      trocarCampos(form, ev);
      aplicarTextosFeedback(form, ev);
      publicar(form);
      form.setAcceptingResponses(true);
      planilha = SpreadsheetApp.create('Respostas feedback · ' + nomeArq);
      DriveApp.getFileById(planilha.getId()).moveTo(pasta);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());
      var url = form.getPublishedUrl(), curta = url;
      try { curta = form.shortenFormUrl(url); } catch (e) { }
    } catch (err) {
      try { copia.setTrashed(true); } catch (e) { }
      try { if (planilha) DriveApp.getFileById(planilha.getId()).setTrashed(true); } catch (e) { }
      throw err;
    }
    var agora = new Date().toISOString();
    var fb = {
      formId: form.getId(), url: curta, editUrl: form.getEditUrl(), planilhaUrl: planilha.getUrl(), assinatura: assinatura(ev),
      criadoEm: agora, criadoPor: u.email, ligado: true, total: 0, satisfacao: null, perguntas: [], comentarios: [], sincronizadoEm: agora, aberto: true
    };
    fsPatch('eventos/' + eid, { feedback: fb });
    return { feedback: fb };
  } finally {
    lock.releaseLock();
  }
}
/** {evento}, {convidado}, {data} e {sala} nas perguntas do Forms padrão viram os dados do evento (só na criação). */
function trocarCampos(form, ev) {
  var v = { evento: ev.nome || '', convidado: ev.convidado || 'o convidado', data: ev.data ? dataCurta(ev.data) : '', sala: ev.sala || '' };
  var re = /\{(evento|convidado|data|sala)\}/g, tr = function (s) { return String(s || '').replace(re, function (m, k) { return v[k]; }); };
  form.getItems().forEach(function (it) {
    var t = it.getTitle(), h = it.getHelpText();
    if (t && t.indexOf('{') >= 0) it.setTitle(tr(t));
    if (h && h.indexOf('{') >= 0) it.setHelpText(tr(h));
  });
}
function aplicarTextosFeedback(form, ev) {
  form.setTitle('Feedback · ' + ev.nome);
  form.setDescription('Obrigado por ter vindo ao evento ' + ev.nome + ' (' + quando(ev) + (ev.convidado ? ', com ' + ev.convidado : '') + ').\n\n' +
    'Sua opinião ajuda a gente a fazer eventos cada vez melhores. Leva menos de 2 minutos.');
  try { form.setCustomClosedFormMessage('O feedback de ' + ev.nome + ' já foi encerrado. Obrigado! Fique de olho no Instagram da Feashion para os próximos eventos.'); } catch (e) { }
  form.setConfirmationMessage('Obrigado pelo feedback! Fique de olho no Instagram da Feashion para os próximos eventos.');
}
/** Lê as respostas: perguntas de escala (escala linear ou classificação) viram média e distribuição; as abertas, comentários. */
function sincronizarFeedback(eid, ev) {
  ev = ev || fsGet('eventos/' + eid);
  if (!ev || !ev.feedback || !ev.feedback.formId) throw new Error('Esse evento ainda não tem Forms de feedback.');
  var fb = ev.feedback, form = FormApp.openById(fb.formId), agora = new Date(), T = FormApp.ItemType;
  if (fb.assinatura !== assinatura(ev)) {
    aplicarTextosFeedback(form, ev);
    try { DriveApp.getFileById(fb.formId).setName('Feedback · ' + ev.nome + ' · ' + dataCurta(ev.data)); } catch (e) { }
    fb.assinatura = assinatura(ev);
  }
  var esc1 = [], porId = {}, abId = {};
  form.getItems().forEach(function (it) {
    var tp = it.getType(), q = null;
    if (tp === T.SCALE) { var s = it.asScaleItem(); q = { min: s.getLowerBound(), max: s.getUpperBound(), rot: [s.getLeftLabel() || '', s.getRightLabel() || ''] }; }
    else if (T.RATING && tp === T.RATING) { try { q = { min: 1, max: it.asRatingItem().getRatingScaleLevel(), rot: ['', ''] }; } catch (e) { } }
    else if (tp === T.PARAGRAPH_TEXT || tp === T.TEXT) abId[it.getId()] = it.getTitle();
    if (q) { q.t = it.getTitle(); q.soma = 0; q.n = 0; q.dist = {}; porId[it.getId()] = q; esc1.push(q); }
  });
  var n = 0, top = 0, tot = 0, coment = [];
  form.getResponses().forEach(function (r) {
    n++;
    r.getItemResponses().forEach(function (ir) {
      var id = ir.getItem().getId(), v = ir.getResponse(), q = porId[id];
      if (q) { var x = +v; if (!isNaN(x) && String(v) !== '') { q.soma += x; q.n++; q.dist[x] = (q.dist[x] || 0) + 1; tot++; if (x >= q.max - 1) top++; } }
      else if (abId[id] != null) { var s = String(v == null ? '' : v).trim(); if (s) coment.push({ p: String(abId[id]).slice(0, 200), txt: s.slice(0, 800), em: r.getTimestamp().toISOString() }); }
    });
  });
  fb.total = n;
  fb.satisfacao = tot ? Math.round(top / tot * 1000) / 1000 : null;
  fb.perguntas = esc1.map(function (q) {
    var d = []; for (var k = q.min; k <= q.max; k++) d.push(q.dist[k] || 0);
    return { t: String(q.t).slice(0, 300), min: q.min, max: q.max, rot: q.rot, n: q.n, media: q.n ? Math.round(q.soma / q.n * 100) / 100 : null, dist: d };
  });
  fb.comentarios = coment.slice(-150);
  fb.sincronizadoEm = agora.toISOString();
  if (ev.data && agora >= new Date(inicio(ev).getTime() + CFG.FEEDBACK_DIAS * 864e5) && form.isAcceptingResponses()) form.setAcceptingResponses(false);
  fb.aberto = form.isAcceptingResponses();
  fsPatch('eventos/' + eid, { feedback: fb });
  return { feedback: fb };
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
  // público USP: quantos inscritos são alunos da USP e de qual instituto (relatório final e Analytics do site)
  insc.usp = lista.filter(function (x) { return x.usp === true; }).length;
  insc.naoUsp = lista.filter(function (x) { return x.usp === false; }).length;
  var inst = {};
  lista.forEach(function (x) { if (x.usp !== false && x.instituto) { var k = String(x.instituto).trim().slice(0, 40); inst[k] = (inst[k] || 0) + 1; } });
  insc.institutos = inst;
  insc.sincronizadoEm = agora.toISOString();
  // fecha sozinho FECHAR_HORAS_ANTES antes do início (não reabre um Forms fechado à mão)
  if (agora >= fechamento(ev) && form.isAcceptingResponses()) form.setAcceptingResponses(false);
  insc.aberto = form.isAcceptingResponses();
  insc.fechaEm = fechamento(ev).toISOString();
  fsPatch('eventos/' + eid, { inscricao: insc });
  return { inscricao: insc };
}

function lerResposta(r) {
  var x = { em: r.getTimestamp().toISOString(), email: '', nome: '', telefone: '', comoSoube: '', imagem: null, novidades: null, usp: null, instituto: '', extras: {} };
  try { x.email = String(r.getRespondentEmail() || '').toLowerCase().trim(); } catch (e) { }
  r.getItemResponses().forEach(function (ir) {
    var t = ir.getItem().getTitle(), tl = semAcento(t), v = ir.getResponse();
    var txt = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    if (/aluno/.test(tl) && /usp/.test(tl)) x.usp = /^sim/i.test(txt); // "Aluno USP" (Sim/Não)
    else if (/instituto|unidade/.test(tl)) x.instituto = txt.trim(); // "Se sim, qual instituto?" (sigla)
    else if (/nome/.test(tl) && !x.nome) x.nome = txt;
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
  mailing:       { nome: 'Mailing de eventos',       auto: false, quando: 'programado na aba Mailing' }
};
var MODELOS = {
  confirmacao:   { assunto: 'Inscrição confirmada: {evento}', corpo: 'Oi, {nome}!\n\nSua inscrição no evento {evento} está confirmada. Anota aí:\n\n{detalhes}\n\nPerto do dia a gente manda um lembrete. Até lá!' },
  lembrete:      { assunto: 'Lembrete: {evento} · {data_curta}', corpo: 'Oi, {nome}!\n\nPassando para lembrar do evento {evento}. Sua inscrição está confirmada.\n\n{detalhes}\n\nChegue uns minutinhos antes para o check-in. Se não puder ir, não precisa fazer nada.' },
  dia:           { assunto: 'É hoje: {evento} às {hora}', corpo: 'Oi, {nome}!\n\nHoje tem {evento}, e a gente te espera.\n\n{detalhes}\n\nChegue uns minutinhos antes para o check-in.' },
  agradecimento: { assunto: 'Obrigado por participar: {evento}', corpo: 'Oi, {nome}!\n\nObrigado por ter se inscrito no evento {evento}. Sua opinião ajuda a gente a fazer eventos cada vez melhores:\n\n{link_avaliacao}\n\nAté o próximo!' },
  mudanca:       { assunto: 'Mudança no evento: {evento}', corpo: 'Oi, {nome}!\n\nO evento {evento} mudou: {mudanca}.\n\nComo fica agora:\n\n{detalhes}\n\nSua inscrição continua valendo. Se não puder mais ir, não precisa fazer nada.' },
  mailing:       { assunto: 'Novo evento da Feashion: {evento}', corpo: 'Oi, {nome}!\n\nVocê pediu para receber os próximos eventos da Feashion, então aqui vai o convite:\n\n{detalhes}\n\nAs vagas são limitadas e as inscrições fecham {fechamento}. Garanta a sua:\n\n{link_inscricao}' }
};

/** Monta assunto e HTML de um e-mail para uma pessoa. `txt` = texto em edição no app (opcional). */
function render(tipo, ev, r, txt, extra) {
  extra = extra || {};
  var base = MODELOS[tipo], prop = extra.texto || (ev.emails && ev.emails[tipo]) || {};
  var t = { assunto: (txt && txt.assunto) || prop.assunto || base.assunto, corpo: (txt && txt.corpo) || prop.corpo || base.corpo };
  var insc = ev.inscricao || {};
  var fbUrl = ev.feedback && ev.feedback.formId && ev.feedback.ligado !== false ? ev.feedback.url : ''; // Forms de feedback do app ligado: vale ele
  var linkAval = fbUrl || ((txt && txt.linkAvaliacao != null) ? txt.linkAvaliacao : (ev.linkAvaliacao || ''));
  var v = {
    nome: String((r && r.nome) || '').trim().split(/\s+/)[0] || 'pessoal', evento: ev.nome || '', data_curta: ev.data ? dataCurta(ev.data) : '',
    hora: ev.hora ? horaBR(ev.hora) : '', quando: quando(ev), sala: ev.sala || 'a confirmar', convidado: ev.convidado || '',
    mudanca: (insc.mudanca && insc.mudanca.texto) || 'algumas informações mudaram', link_inscricao: extra.link || insc.url || '', link_avaliacao: linkAval,
    fechamento: ev.data ? dataHoraBR(fechamento(ev)) : ''
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
  var rodape = tipo === 'mailing'
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
  return rs;
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
    var cota = MailApp.getRemainingDailyQuota(), reserva = 0, n = 0;
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
    insc.cota = MailApp.getRemainingDailyQuota(); insc.cotaEm = agora;
    fsPatch('eventos/' + eid, { inscricao: insc });
    return { enviados: n, pendentes: pend, inscricao: insc };
  } finally {
    lock.releaseLock();
  }
}

/** Envio pedido pelo botão do app. O aviso de mudança continua sozinho nos dias seguintes se a cota acabar. */
function enviarManual(eid, tipo) {
  if (tipo === 'mudanca') { var ev = fsGet('eventos/' + eid); if (ev && ev.inscricao && ev.inscricao.mudanca) { ev.inscricao.mudanca.enviar = true; fsPatch('eventos/' + eid, { inscricao: ev.inscricao }); } }
  return enviarTipo(eid, tipo);
}

/** Prévia (ou teste para o próprio e-mail) com o texto que está sendo editado no app. */
function mailingPrevia(eid, texto, para) {
  var cfg = fsGet('mailingConfig/geral') || {}, ev = eid ? fsGet('eventos/' + eid) : null;
  if (!ev) { var fut = fsList('eventos').filter(function (x) { return x.data && inicio(x) > new Date(); }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }); ev = fut[0] || { nome: 'Evento de exemplo', data: Utilities.formatDate(new Date(Date.now() + 7 * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd'), hora: '19:00', sala: 'Sala G2', inscricao: { url: 'https://forms.gle/exemplo' } }; }
  var t = texto || { assunto: cfg.assunto, corpo: cfg.corpo };
  var m = render('mailing', ev, { nome: 'Fulana de Tal', email: para || 'exemplo@usp.br' }, null, { texto: { assunto: t.assunto || MODELOS.mailing.assunto, corpo: t.corpo || MODELOS.mailing.corpo } });
  if (para) { MailApp.sendEmail({ to: para, subject: '[TESTE] ' + m.assunto, htmlBody: m.html, name: CFG.REMETENTE }); return { enviadoPara: para }; }
  return { assunto: m.assunto, html: m.html, evento: ev.nome };
}

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

/* ---------- MAILING DE EVENTOS ----------
 * mailing/{hash}          pessoas que marcaram "quero receber novidades" (uma por e-mail)
 * descadastros/{hash}     quem saiu (pelo link) ou foi tirado pela equipe
 * mailingConfig/geral     texto base, hora padrão, intervalo mínimo entre envios, último envio
 * eventos/{id}.mailing    { excluido, padraoCriado, envios:[{id, quando, status, assunto?, corpo?, enviados, pendentes, cliques}] }
 * mailingEnvios/{id}_{n}  quem recebeu cada envio e os cliques (com hora)
 */
function atualizarMailing() {
  var fora = {};
  fsList('descadastros').forEach(function (d) { if (d.email) fora[String(d.email).toLowerCase()] = d.em || ''; });
  var lista = {}; fsList('mailing').forEach(function (m) { lista[m._id] = m; });
  fsList('inscricoes').forEach(function (i) {
    (i.respostas || []).forEach(function (r) {
      if (!r.email || r.novidades !== true) return;
      var h = hashEmail(r.email);
      if (fora[r.email] != null) { if (!(r.em > fora[r.email])) return; fsDel('descadastros/' + h); delete fora[r.email]; } // marcou de novo depois de sair: volta
      var m = lista[h], ev = i._id;
      if (!m) { m = { email: r.email, nome: r.nome || '', desde: r.em, eventos: [ev], atualizadoEm: new Date().toISOString() }; lista[h] = m; fsPatch('mailing/' + h, m); }
      else if ((m.eventos || []).indexOf(ev) < 0) { m.eventos = (m.eventos || []).concat([ev]); if (r.nome) m.nome = r.nome; fsPatch('mailing/' + h, { eventos: m.eventos, nome: m.nome || '', atualizadoEm: new Date().toISOString() }); }
    });
  });
}

function mailingCfg() {
  var c = fsGet('mailingConfig/geral') || {};
  if (!c.desde) { c.desde = new Date().toISOString(); fsPatch('mailingConfig/geral', { desde: c.desde }); }
  c.hora = /^\d{1,2}:\d{2}$/.test(c.hora || '') ? c.hora : '08:00';
  c.intervaloDias = c.intervaloDias != null && c.intervaloDias !== '' ? +c.intervaloDias : 2;
  return c;
}
/** O mailing só sai de segunda a sexta. */
function fimDeSemana(d) { return +Utilities.formatDate(d, Session.getScriptTimeZone(), 'u') >= 6; }
/** Primeiro dia útil a partir de `d` (inclusive), na hora indicada. */
function diaUtil(d, hora) {
  var tz = Session.getScriptTimeZone(), x = new Date(d.getTime());
  while (fimDeSemana(x)) x = new Date(x.getTime() + 864e5);
  var p = partes(Utilities.formatDate(x, tz, 'yyyy-MM-dd')), h = hora.split(':');
  return new Date(p.a, p.m - 1, p.d, +h[0], +h[1]);
}
/** Dia seguinte à criação; se cair no sábado ou domingo, vai para a segunda. */
function diaSeguinte(iso, hora) { return diaUtil(new Date(new Date(iso).getTime() + 864e5), hora); }

/** Cria o envio padrão (dia seguinte à criação do evento, na hora configurada) e manda o que estiver na hora. */
function rotinaMailing() {
  var cfg = mailingCfg(), agora = new Date();
  fsList('eventos').forEach(function (ev) {
    if (!ev.data || inicio(ev) <= agora) return;
    var ml = ev.mailing || {};
    if (ml.excluido) return;
    if (!ml.padraoCriado && ev.criadoEm && ev.criadoEm >= cfg.desde) {
      ml.envios = (ml.envios || []).concat([{ id: 'p' + Date.now(), padrao: true, quando: diaSeguinte(ev.criadoEm, cfg.hora).toISOString(), status: 'agendado' }]);
      ml.padraoCriado = true; fsPatch('eventos/' + ev._id, { mailing: ml }); ev.mailing = ml;
    }
    (ml.envios || []).forEach(function (en) {
      if ((en.status === 'agendado' || en.status === 'enviando' || en.status === 'aguardando') && new Date(en.quando) <= agora) {
        try { enviarMailing(ev._id, en.id, false); } catch (e) { console.error('Mailing ' + ev._id + ' ' + en.id + ': ' + e); }
      }
    });
  });
}

function mailingEnviarAgora(eid, envioId) { return enviarMailing(eid, envioId, true); }

/** Manda um envio do mailing para quem está na lista e ainda não recebeu (fora quem já se inscreveu no evento). */
function enviarMailing(eid, envioId, agoraMesmo) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ev = fsGet('eventos/' + eid), cfg = mailingCfg(), agora = new Date();
    if (!ev || !ev.mailing) throw new Error('Envio não encontrado.');
    var ml = ev.mailing, en = (ml.envios || []).filter(function (x) { return x.id === envioId; })[0];
    if (!en) throw new Error('Envio não encontrado.');
    if (en.status === 'enviado' || en.status === 'pulado') return { envio: en };
    var salvar = function () { fsPatch('eventos/' + eid, { mailing: ml }); };
    var insc = ev.inscricao || {};
    if (agora >= fechamento(ev) || insc.aberto === false && insc.formId) { en.status = 'cancelado'; en.motivo = 'inscrições fechadas'; salvar(); return { envio: en }; }
    if (!insc.formId || !insc.url) { en.status = 'aguardando'; en.motivo = 'esperando o Forms de inscrição'; salvar(); if (agoraMesmo) throw new Error('Crie o Forms de inscrição antes de mandar o mailing.'); return { envio: en }; }
    // só de segunda a sexta (o botão "Enviar agora" ignora)
    if (!agoraMesmo && fimDeSemana(agora)) {
      var seg = diaUtil(agora, cfg.hora);
      if (seg < fechamento(ev)) { en.quando = seg.toISOString(); if (en.status !== 'enviando') en.status = 'agendado'; en.motivo = 'fim de semana: sai na segunda'; salvar(); return { envio: en }; }
      en.status = 'cancelado'; en.motivo = 'as inscrições fecham antes da segunda'; salvar(); return { envio: en };
    }
    // intervalo mínimo entre envios (só antes de começar este envio)
    if (!agoraMesmo && en.status !== 'enviando' && cfg.ultimoEnvio && cfg.intervaloDias > 0) {
      var prox = new Date(new Date(cfg.ultimoEnvio).getTime() + cfg.intervaloDias * 864e5);
      if (fimDeSemana(prox)) prox = diaUtil(prox, cfg.hora);
      if (prox > agora && prox < new Date(fechamento(ev).getTime() - 12 * 3600e3)) { en.quando = prox.toISOString(); en.status = 'agendado'; en.motivo = 'adiado pelo intervalo mínimo de ' + cfg.intervaloDias + ' dia(s)'; salvar(); return { envio: en }; }
    }
    if (!insc.urlMailing) { try { insc.urlMailing = linkPreenchido(insc.formId); fsPatch('eventos/' + eid, { inscricao: insc }); } catch (e) { insc.urlMailing = insc.url; } }
    var chave = 'mailingEnvios/' + eid + '_' + en.id, reg = fsGet(chave) || { evento: eid, envio: en.id, emails: [], cliques: [] };
    var ja = {}; (reg.emails || []).forEach(function (m) { ja[m] = 1; });
    var inscritos = {}; ((fsGet('inscricoes/' + eid) || {}).respostas || []).forEach(function (r) { if (r.email) inscritos[r.email] = 1; });
    var fora = {}; fsList('descadastros').forEach(function (d) { if (d.email) fora[String(d.email).toLowerCase()] = 1; });
    var lista = fsList('mailing').filter(function (m) { return m.email && !fora[m.email] && !inscritos[m.email]; });
    var fila = lista.filter(function (m) { return !ja[m.email]; });
    if (en.status !== 'enviando') { cfg.ultimoEnvio = agora.toISOString(); fsPatch('mailingConfig/geral', { ultimoEnvio: cfg.ultimoEnvio }); reg.inicio = agora.toISOString(); }
    var texto = { assunto: en.assunto || cfg.assunto || MODELOS.mailing.assunto, corpo: en.corpo || cfg.corpo || MODELOS.mailing.corpo };
    var cota = MailApp.getRemainingDailyQuota(), n = 0;
    for (var i = 0; i < fila.length && cota > 10; i++) { // 10 de reserva para confirmações e lembretes
      var m = fila[i];
      try {
        var r = render('mailing', ev, { nome: m.nome, email: m.email }, null, { texto: texto, link: linkClique(eid, en.id, m.email) });
        MailApp.sendEmail({ to: m.email, subject: r.assunto, htmlBody: r.html, name: CFG.REMETENTE });
        reg.emails.push(m.email); n++;
      } catch (e) { console.error('Mailing para ' + m.email + ': ' + e); }
      cota--;
    }
    var pend = fila.length - n;
    reg.fim = agora.toISOString(); fsPatch(chave, reg);
    en.enviados = reg.emails.length; en.pendentes = pend; en.cliques = (reg.cliques || []).length; en.ultimoEm = agora.toISOString();
    en.status = pend > 0 ? 'enviando' : 'enviado'; if (pend > 0) en.motivo = 'cota do dia acabou; continua amanhã'; else delete en.motivo;
    if (agoraMesmo) en.quando = en.quando && new Date(en.quando) < agora ? en.quando : agora.toISOString();
    salvar();
    return { envio: en, enviados: n, pendentes: pend };
  } finally {
    lock.releaseLock();
  }
}

/** Link do Forms com "Mailing Feashion" já marcado em "como ficou sabendo". */
function linkPreenchido(formId) {
  var f = FormApp.openById(formId), alvo = null, opc = null;
  f.getItems().forEach(function (it) {
    if (alvo || !/sabendo|soube/.test(semAcento(it.getTitle()))) return;
    var t = it.getType(), ch = t === FormApp.ItemType.MULTIPLE_CHOICE ? it.asMultipleChoiceItem() : t === FormApp.ItemType.CHECKBOX ? it.asCheckboxItem() : t === FormApp.ItemType.LIST ? it.asListItem() : null;
    if (!ch) return;
    ch.getChoices().forEach(function (c) { if (!opc && /mailing/i.test(c.getValue())) opc = c.getValue(); });
    if (opc) alvo = { it: ch, t: t };
  });
  if (!alvo) return f.getPublishedUrl();
  var resp = alvo.t === FormApp.ItemType.CHECKBOX ? alvo.it.createResponse([opc]) : alvo.it.createResponse(opc);
  return f.createResponse().withItemResponse(resp).toPrefilledUrl();
}

/** Link rastreado: passa pelo robô, guarda a hora do clique e abre o Forms. */
function linkClique(eid, envioId, email) {
  var u = ''; try { u = ScriptApp.getService().getUrl(); } catch (e) { }
  var h = hashEmail(email);
  return u + '?c=1&e=' + encodeURIComponent(eid) + '&v=' + encodeURIComponent(envioId) + '&p=' + h + '&t=' + assinar(eid + '|' + envioId + '|' + h);
}
function clique(p) {
  var ev = null;
  try { ev = fsGet('eventos/' + p.e); } catch (e) { }
  var destino = ev && ev.inscricao ? (ev.inscricao.urlMailing || ev.inscricao.url) : '';
  if (ev && p.t === assinar(p.e + '|' + p.v + '|' + p.p)) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      var chave = 'mailingEnvios/' + p.e + '_' + p.v, reg = fsGet(chave) || { evento: p.e, envio: p.v, emails: [], cliques: [] };
      reg.cliques = (reg.cliques || []).concat([{ p: p.p, em: new Date().toISOString() }]);
      fsPatch(chave, { cliques: reg.cliques });
      var ml = ev.mailing || {}; (ml.envios || []).forEach(function (x) { if (x.id === p.v) x.cliques = reg.cliques.length; });
      fsPatch('eventos/' + p.e, { mailing: ml });
    } catch (e) { console.error('Clique: ' + e); } finally { try { lock.releaseLock(); } catch (e) { } }
  }
  if (!destino) return pagina('Link expirado', 'Não encontramos esse evento. Fique de olho no Instagram da Feashion!');
  var out = HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top"><div style="font-family:Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;text-align:center"><p>Abrindo o formulário de inscrição…</p><p><a href="' + esc(destino) + '" style="display:inline-block;background:#7f0606;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Ir para a inscrição</a></p></div><script>try{window.top.location.replace(' + JSON.stringify(destino) + ');}catch(e){}</script>').setTitle('Feashion');
  try { out.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); } catch (e) { }
  return out;
}

/* ---------- rotina automática (gatilho a cada 10 min) ---------- */
function rotina() {
  try { sincronizarEquipe(); } catch (err) { console.error('Equipe: ' + err); }
  var agora = new Date(), H = 3600e3;
  fsList('eventos').forEach(function (ev) {
    if (!ev.inscricao || !ev.inscricao.formId || !ev.data) return;
    var ini = inicio(ev), fim = new Date(ini.getTime() + (+ev.duracao || 120) * 60e3);
    /* feedback: lê as respostas até FEEDBACK_DIAS depois do evento (e fecha o Forms nessa hora) */
    if (ev.feedback && ev.feedback.formId && agora < new Date(ini.getTime() + (CFG.FEEDBACK_DIAS + 1) * 864e5)) {
      try { ev.feedback = sincronizarFeedback(ev._id, ev).feedback; } catch (e) { console.error(ev._id + ' feedback: ' + e); }
    }
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
    } catch (err) {
      console.error('Evento ' + ev._id + ': ' + err);
    }
  });
  /* depois de buscar as respostas: quem pediu novidades entra no mailing já nesta rodada */
  try { atualizarMailing(); } catch (err) { console.error('Lista do mailing: ' + err); }
  try { rotinaMailing(); } catch (err) { console.error('Envios do mailing: ' + err); }
  try { avisosEtapas(); } catch (err) { console.error('Etapas: ' + err); }
}

/* ---------- checklist do evento: e-mail para a área quando chega a vez dela e quando um ponto atrasa ----------
   Os mesmos 15 pontos e prazos do site (etapas.js; o último, Relatório final gerado, é 7 dias depois do evento). Cada aviso sai uma vez só: eventos/{id}.etapasAvisos = {orc_vez: data, ...}.
   "Sua vez" vai só para as outras áreas, quando o ponto anterior fica pronto: Presidência quando a ficha fica pronta,
   Financeiro quando a ficha é aprovada, Marketing quando o briefing é feito, responsável AEX quando começa o bloco de 7 dias.
   "Atrasado" vai para a área do ponto, juntando num e-mail só os pontos que atrasaram na mesma rodada.
   Quem recebe: Diretor(a) e Coordenador(a) da área; na Presidência, Presidente e Vice; na AEX, o responsável escolhido no evento
   (sem responsável, a diretoria de Eventos). */
var PONTOS = [
  { k: 'ficha', n: 'Ficha do evento pronta', a: 'Eventos', d: 40 },
  { k: 'aprov', n: 'Ficha aprovada pela Presidência', a: 'Presidência', d: 38, c: 'aprovacao', vez: function (ok, ev) { return ok.ficha; } },
  { k: 'conv', n: 'Convidado confirmado por escrito', a: 'Eventos', d: 33 },
  { k: 'sala', n: 'Sala reservada', a: 'Eventos', d: 33 },
  { k: 'orc', n: 'Orçamento validado', a: 'Financeiro', d: 33, c: 'orcamento', vez: function (ok, ev) { return ok.aprov; } },
  { k: 'brief', n: 'Briefing ao Marketing', a: 'Eventos', d: 30 },
  { k: 'forn', n: 'Fornecedores confirmados', a: 'Eventos', d: 14 },
  { k: 'aexform', n: 'Formulário da AEX pronto', a: 'AEX', d: 12, c: 'aex', vez: function (ok, ev) { return hojeIso() >= somaDiasIso(ev.data, -30); } },
  { k: 'divulg', n: 'Divulgação feita', a: 'Marketing', d: 10, c: 'divulgacao', vez: function (ok, ev) { return ok.brief; } },
  { k: 'funcoes', n: 'Funções do dia definidas', a: 'Eventos', d: 7 },
  { k: 'reconf', n: 'Reconfirmar convidado e sala', a: 'Eventos', d: 5 },
  { k: 'roteiro', n: 'Roteiro enviado à equipe', a: 'Eventos', d: 4 },
  { k: 'planob', n: 'Plano B revisado', a: 'Eventos', d: 3 },
  { k: 'lembrete', n: 'Lembrete aos inscritos', a: 'Eventos', d: 2 },
  // depois do evento: o relatório final (botão Finalizar evento no site), 7 dias depois; "Sua vez" no dia seguinte ao evento
  { k: 'pos', n: 'Relatório final gerado', a: 'Eventos', d: -7, vez: function (ok, ev) { return hojeIso() > ev.data; } }
];
function hojeIso() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function somaDiasIso(iso, n) { var p = partes(iso), d = new Date(p.a, p.m - 1, p.d + n); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
/* a ficha está pronta? (os mesmos itens do site: ficha.js; a reserva da sala fica no checklist) */
function fichaCompleta(ev) {
  var f = ev.ficha || {}, i = ev.inscricao || {};
  var temConv = (ev.convidadoIds && ev.convidadoIds.length) || ev.convidadoId || String(ev.convidado || '').trim();
  return !!ev.responsavel && (f.equipe ? f.equipe.length > 0 : true) && !!String(f.objetivo || '').trim()
    && f.metaSatisfacao !== '' && (f.publico || []).length > 0 && (!!i.formId || /^https:\/\//.test(String(f.linkExterno || '')))
    && (!!f.semConvidado || !!temConv) && !!String(f.planoB || '').trim();
}
/* quais pontos estão feitos (os automáticos são calculados como no site) */
function pontosFeitos(ev, convidados) {
  var et = ev.etapas || {}, ck = ev.checklist || {}, f = ev.ficha || {}, ok = {};
  var marcado = function (v) { return !!v && (v.s === 'ok' || (!!v.em && !v.s)); };
  PONTOS.forEach(function (p) {
    if (p.k === 'ficha') ok.ficha = fichaCompleta(ev);
    else if (p.k === 'sala') ok.sala = f.salaReservada === 'sim' && !!String(f.reservaNum || '').trim();
    else if (p.k === 'conv') {
      var ids = (ev.convidadoIds && ev.convidadoIds.length) ? ev.convidadoIds : ev.convidadoId ? [ev.convidadoId] : [];
      if (!ids.length && f.semConvidado) ok.conv = marcado(ck.conv);
      else { var cf = ev.convConfirmados || {}; ok.conv = ids.length > 0 && ids.every(function (i) { return !!cf[i]; }); } // check "Confirmado por escrito" da ficha
    }
    else if (p.k === 'pos') ok.pos = !!(ev.relatorio && ev.relatorio.em); // botão Gerar relatório final (pós-evento)
    else if (p.k === 'brief') ok.brief = !!(ev.briefing && ev.briefing.enviadoEm); // botão Enviar briefing (linha do evento)
    else if (p.k === 'lembrete' && ev.inscricao && ev.inscricao.formId) { var x = (ev.inscricao.emails || {}).lembrete; ok.lembrete = !!(x && x.enviados > 0); }
    else ok[p.k] = marcado(p.c ? et[p.c] : ck[p.k]);
  });
  return ok;
}
function emailsDaArea(area, ev, membros) {
  var dir = ['Diretor(a)', 'Coordenador(a)'], out = {};
  var cargoNa = function (m, a) { if (m.areas && typeof m.areas === 'object') return String(m.areas[a] || ''); return a === 'Eventos' ? String(m.cargo || '') : ''; };
  membros.forEach(function (m) {
    var e = String(m.email || '').toLowerCase().trim(); if (!e) return;
    if (area === 'Presidência') { if (m.presidencia === 'Presidente' || m.presidencia === 'Vice-presidente') out[e] = 1; }
    else if (area === 'AEX') { if (ev.responsavelAex && ev.responsavelAex.uid === m._id) out[e] = 1; }
    else if (dir.indexOf(cargoNa(m, area)) >= 0) out[e] = 1;
  });
  if (area === 'AEX' && !Object.keys(out).length) return emailsDaArea('Eventos', ev, membros);
  return Object.keys(out);
}
function avisosEtapas() {
  var hoje = hojeIso(), membros = null, convidados = null;
  fsList('eventos').forEach(function (ev) {
    try {
      if (!ev.data || ev.status === 'realizado' || /\[teste\]/i.test(ev.nome || '')) return;
      var passou = ev.data < hoje; // evento que já aconteceu: só o ponto de depois (relatório final), por até 30 dias
      if (passou && somaDiasIso(ev.data, 30) < hoje) return;
      if (!convidados) { convidados = {}; fsList('convidados').forEach(function (g) { convidados[g._id] = g; }); }
      var ok = pontosFeitos(ev, convidados), av = ev.etapasAvisos || {}, novo = false, atrasos = {};
      PONTOS.forEach(function (p) {
        if (ok[p.k] || (passou && p.d >= 0)) return;
        if (p.vez && !av[p.k + '_vez'] && p.vez(ok, ev)) {
          if (!membros) membros = fsList('membros');
          if (!mandar(emailsDaArea(p.a, ev, membros), emailVez(ev, p))) return;
          av[p.k + '_vez'] = new Date().toISOString(); novo = true;
        }
        var prazo = somaDiasIso(ev.data, -p.d);
        if (prazo < hoje && !av[p.k + '_atraso']) (atrasos[p.a] = atrasos[p.a] || []).push(p);
      });
      Object.keys(atrasos).forEach(function (a) {
        if (!membros) membros = fsList('membros');
        if (!mandar(emailsDaArea(a, ev, membros), emailAtraso(ev, a, atrasos[a]))) return;
        atrasos[a].forEach(function (p) { av[p.k + '_atraso'] = new Date().toISOString(); }); novo = true;
      });
      if (novo) fsPatch('eventos/' + ev._id, { etapasAvisos: av });
    } catch (err) { console.error('Etapas ' + ev._id + ': ' + err); }
  });
}
/* manda (ou, sem destinatário, só marca como avisado); sem cota, deixa para a próxima rodada */
function mandar(para, m) {
  if (!para.length) return true;
  if (MailApp.getRemainingDailyQuota() < para.length + 5) return false;
  MailApp.sendEmail({ to: para.join(','), subject: m.assunto, htmlBody: m.html, name: CFG.REMETENTE });
  return true;
}
function diaCurto(ev) { return dataCurta(ev.data) + '/' + String(ev.data).slice(2, 4); }
/* o botão abre as Pendências; no orçamento e na divulgação, abre direto o evento na tela do Financeiro ou do Marketing */
function moldura(txt, p, ev) {
  var orc = p && p.k === 'orc' && ev, dv = p && p.k === 'divulg' && ev, ps = p && p.k === 'pos' && ev;
  var link = orc ? CFG.SITE + '#orcamento=' + encodeURIComponent(ev._id) : dv ? CFG.SITE + '#divulgacao=' + encodeURIComponent(ev._id) : ps ? CFG.SITE + '#posevento=' + encodeURIComponent(ev._id) : CFG.SITE + '#pendencias';
  return '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:560px">' + txt +
    '<p>' + (orc ? 'O ponto fica verde quando a diretoria do Financeiro clicar em <b>Validar orçamento</b> no Planejador.' : dv ? 'O briefing completo e o plano de divulgação estão no Planejador. O ponto fica verde quando a diretoria do Marketing clicar em <b>Divulgação feita</b>.' : ps ? 'Registre o resultado e o pós-evento e clique em <b>Gerar relatório final</b>: o PDF vai para a pasta do evento em Documentos e o evento passa para Realizados.' : 'Quando terminar, marque o ponto como concluído no Planejador (tela Pendências).') + '</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#8a0d10;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold">' + (orc ? 'Abrir o orçamento' : dv ? 'Abrir a divulgação' : ps ? 'Abrir o pós-evento' : 'Abrir as pendências') + '</a></p>' +
    '<p style="color:#777;font-size:12px">Aviso automático do Planejador de Eventos da Feashion.</p></div>';
}
function emailVez(ev, p) {
  return { assunto: 'Sua vez: ' + p.n + ' · ' + (ev.nome || 'Evento') + ' (' + diaCurto(ev) + ')',
    html: moldura('<p>Chegou a vez da área <b>' + esc(p.a) + '</b> no evento <b>' + esc(ev.nome || '') + '</b> (' + esc(quando(ev)) + '): <b>' + esc(p.n) + '</b>, até ' + dataCurta(somaDiasIso(ev.data, -p.d)) + '.</p>', p, ev) };
}
function emailAtraso(ev, area, ps) {
  var lista = '<ul>' + ps.map(function (p) { return '<li><b>' + esc(p.n) + '</b>: prazo ' + dataCurta(somaDiasIso(ev.data, -p.d)) + '</li>'; }).join('') + '</ul>';
  return { assunto: 'Atrasado: ' + (ps.length === 1 ? ps[0].n : ps.length + ' pontos do checklist') + ' · ' + (ev.nome || 'Evento') + ' (' + diaCurto(ev) + ')',
    html: moldura('<p>No evento <b>' + esc(ev.nome || '') + '</b> (' + esc(quando(ev)) + '), ' + (ps.length === 1 ? 'este ponto da área ' : 'estes pontos da área ') + '<b>' + esc(area) + '</b> passaram do prazo:</p>' + lista, ps.length === 1 ? ps[0] : null, ev) };
}

/* ---------- equipe: quem tem cargo no app edita a pasta (Forms e planilhas herdam) ---------- */
function sincronizarEquipe() {
  var pasta = pastaInscricoes(), id = pasta.getId(), dono = Session.getEffectiveUser().getEmail().toLowerCase();
  var querem = {};
  fsList('membros').forEach(function (m) {
    var e = String(m.email || '').toLowerCase().trim();
    if (e && CFG.CARGOS_QUE_EDITAM.indexOf(cargoEventos(m)) >= 0) querem[e] = 1;
  });
  delete querem[dono];
  /* inscrições (todos os Forms e planilhas criados herdam) e o Forms padrão: quem tem cargo em Eventos edita */
  permissoesPasta(id, querem);
  try { permissoesPasta(pastaFeedbacks().getId(), querem); } catch (err) { console.error('Pasta de feedbacks: ' + err); }
  try { permissoesPasta(modeloFormId(), querem); } catch (err) { console.error('Forms padrão: ' + err); }
  try { permissoesPasta(modeloFeedbackId(), querem); } catch (err) { console.error('Forms padrão de feedback: ' + err); }
  /* fotos: todo membro cadastrado no app, de qualquer área, pode ver e subir fotos */
  var fotos = DriveApp.getFoldersByName(CFG.PASTA_FOTOS);
  if (fotos.hasNext()) {
    var todos = {};
    fsList('membros').forEach(function (m) { var e = String(m.email || '').toLowerCase().trim(); if (e) todos[e] = 1; });
    delete todos[dono];
    try { permissoesPasta(fotos.next().getId(), todos); } catch (err) { console.error('Fotos: ' + err); }
  }
  return Object.keys(querem);
}
/* o Forms que o robô copia: o link salvo em Parâmetros (parametros/inscricoes) ou, sem ele, o do CFG */
function modeloFormId() {
  var d = null;
  try { d = fsGet('parametros/inscricoes'); } catch (err) { console.error('Parâmetros: ' + err); }
  return (d && d.modeloFormId) || CFG.MODELO_FORM_ID;
}
/* deixa na pasta (ou arquivo) exatamente quem está na lista, como editor (as subpastas herdam) */
function permissoesPasta(id, querem) {
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
}

/* ---------- pasta de fotos do evento (botão da Ficha) ---------- */
function criarPastaFotos(eid) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ev = fsGet('eventos/' + eid);
    if (!ev) throw new Error('Evento não encontrado.');
    if (ev.pastaFotos && ev.pastaFotos.id) {
      try { var f0 = DriveApp.getFolderById(ev.pastaFotos.id); if (!f0.isTrashed()) return { pastaFotos: ev.pastaFotos, jaExistia: true }; } catch (e) { }
    }
    var it = DriveApp.getFoldersByName(CFG.PASTA_FOTOS), nova = !it.hasNext();
    var mae = nova ? DriveApp.createFolder(CFG.PASTA_FOTOS) : it.next();
    if (nova) try { sincronizarEquipe(); } catch (e) { console.error('Equipe: ' + e); }
    var nome = String(ev.nome || 'Evento') + (ev.data ? ' · ' + dataCurta(ev.data) + '/' + String(ev.data).slice(2, 4) : '');
    var pasta = mae.createFolder(nome);
    var pf = { id: pasta.getId(), url: pasta.getUrl(), nome: nome, criadaEm: new Date().toISOString() };
    fsPatch('eventos/' + eid, { pastaFotos: pf });
    return { pastaFotos: pf };
  } finally { lock.releaseLock(); }
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
  var f = FormApp.openById(modeloFormId());
  console.log('Modelo encontrado: ' + f.getTitle());
  try { console.log('Modelo de feedback: ' + FormApp.openById(modeloFeedbackId()).getTitle()); } catch (err) { console.error('Forms padrão de feedback: ' + err); }
  console.log('Pasta: ' + pastaInscricoes().getUrl());
  console.log('Pasta de feedbacks: ' + pastaFeedbacks().getUrl());
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
function fsDel(path) {
  var r = UrlFetchApp.fetch(FS + path, { method: 'delete', headers: cab(), muteHttpExceptions: true });
  if (r.getResponseCode() >= 300 && r.getResponseCode() !== 404) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
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


/* ---------- IA: ideia de evento (Gemini, plano gratuito) ---------- */
var IA_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tipoProposta: { type: 'STRING', enum: ['evento', 'serie'] },
    titulo: { type: 'STRING' },
    resumo: { type: 'STRING' },
    eventos: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      nome: { type: 'STRING' }, tipo: { type: 'STRING' }, tema: { type: 'STRING' }, formato: { type: 'STRING' },
      papelNaSerie: { type: 'STRING' }, porque: { type: 'STRING' },
      duracaoMin: { type: 'INTEGER' }, horario: { type: 'STRING' }, inscricoesEsperadas: { type: 'INTEGER' },
      datas: { type: 'ARRAY', items: { type: 'OBJECT', properties: { data: { type: 'STRING' }, motivo: { type: 'STRING' } }, required: ['data', 'motivo'] } },
      convidados: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, motivo: { type: 'STRING' } }, required: ['id', 'motivo'] } },
      perfilProcurar: { type: 'STRING' },
      riscos: { type: 'ARRAY', items: { type: 'STRING' } },
      divulgacao: { type: 'STRING' }
    }, required: ['nome', 'tipo', 'tema', 'formato', 'porque', 'duracaoMin', 'horario', 'inscricoesEsperadas', 'datas', 'convidados', 'riscos'] } }
  },
  required: ['tipoProposta', 'titulo', 'resumo', 'eventos']
};

var IA_REGRAS = [
  'Você ajuda a Diretoria de Eventos da Feashion, liga de fashion business da FEA-USP, a transformar uma ideia escrita em texto corrido em uma proposta de evento.',
  'Responda sempre em português do Brasil, em JSON no formato pedido, com textos curtos e diretos.',
  'Se a ideia tiver vários momentos (por exemplo atrair, praticar e visitar) ou for grande, proponha uma série de 2 a 5 eventos ligados (tipoProposta "serie"); se for algo simples, um evento só (tipoProposta "evento").',
  'O campo tipo de cada evento precisa ser exatamente um dos tipos da lista "tipos" do contexto. Respeite as regras de fim de semana de cada tipo.',
  'Convidados: use somente ids que existem na lista "convidados" do contexto, no máximo 3 por evento, preferindo nota alta e tema compatível. Nunca invente nomes de pessoas ou empresas. Se ninguém da lista servir, deixe convidados vazio e descreva em perfilProcurar o perfil a buscar.',
  'Datas: proponha de 2 a 3 datas no formato AAAA-MM-DD, todas depois de "hoje", até 4 meses à frente. Evite os períodos do calendário (feriados, férias, provas, bloqueios), sextas-feiras e o mesmo dia de outros eventos já marcados. Numa série, espace os eventos e ponha em ordem.',
  'horario no formato HH:MM. Eventos na FEA costumam caber na janela do contexto; visitas e desfiles podem ser em outro horário.',
  'inscricoesEsperadas: estime com base nas médias de inscrições por tipo do contexto; não invente público presente, sala nem custos, porque o app calcula isso.',
  'Riscos: 1 ou 2 frases práticas por evento (data, convidado, material, prazo).',
  'Não cite nomes de outras entidades estudantis.'
].join('\n');

function ideia(b, u) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  if (!key) throw new Error('A IA ainda não foi ligada: falta a chave GEMINI_KEY nas propriedades do robô.');
  var texto = String(b.texto || '').trim().slice(0, 3000);
  if (texto.length < 15) throw new Error('Escreva a ideia com um pouco mais de detalhe.');
  // limite por pessoa por dia
  var pr = PropertiesService.getScriptProperties(), dia = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var ck = 'ia_' + u.uid + '_' + dia, usados = +(pr.getProperty(ck) || 0);
  if (usados >= CFG.IA_LIMITE_DIA) throw new Error('Você chegou ao limite de ' + CFG.IA_LIMITE_DIA + ' propostas por dia. Tente amanhã.');
  pr.setProperty(ck, String(usados + 1));
  var ctx = JSON.stringify(b.contexto || {});
  if (ctx.length > 120000) ctx = ctx.slice(0, 120000);
  var partes = [{ text: 'CONTEXTO (dados do app, em JSON):\n' + ctx }, { text: 'IDEIA:\n' + texto }];
  if (b.anterior && b.ajuste) {
    partes.push({ text: 'PROPOSTA ANTERIOR:\n' + JSON.stringify(b.anterior).slice(0, 20000) });
    partes.push({ text: 'AJUSTE PEDIDO (refaça a proposta aplicando isto e mantendo o resto quando fizer sentido):\n' + String(b.ajuste).slice(0, 1000) });
  }
  var corpo = {
    systemInstruction: { parts: [{ text: IA_REGRAS }] },
    contents: [{ role: 'user', parts: partes }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: IA_SCHEMA, temperature: 0.7 }
  };
  var r = chamarModelos(key, corpo).r;
  var code = r.getResponseCode();
  if (code === 429) throw new Error('A IA gratuita está no limite agora. Espere um minuto e tente de novo.');
  if (code === 404) throw new Error('O modelo ' + CFG.IA_MODELO + ' não está disponível. Troque IA_MODELO no robô.');
  if (code === 400 || code === 403) throw new Error('A chave da IA foi recusada (' + code + '). Confira a GEMINI_KEY.');
  if (code === 503) throw new Error('A IA do Google está sobrecarregada agora. Tente de novo em alguns minutos.');
  if (code !== 200) throw new Error('A IA não respondeu (erro ' + code + '). Tente de novo.');
  var j = JSON.parse(r.getContentText()), cand = (j.candidates || [])[0];
  var txt = cand && cand.content && cand.content.parts && cand.content.parts.map(function (p) { return p.text || ''; }).join('');
  if (!txt) throw new Error('A IA não devolveu proposta' + (cand && cand.finishReason ? ' (' + cand.finishReason + ')' : '') + '. Tente reescrever a ideia.');
  var prop;
  try { prop = JSON.parse(txt); } catch (e) { throw new Error('A resposta da IA veio incompleta. Tente de novo.'); }
  if (!prop.eventos || !prop.eventos.length) throw new Error('A IA não montou nenhum evento. Tente detalhar mais a ideia.');
  return { proposta: prop, restantes: CFG.IA_LIMITE_DIA - usados - 1 };
}

/* Modelos "flash" que a chave pode usar, os mais leves (lite) primeiro. Só para o testarIA mostrar a lista. */
function modelosReserva(key) {
  var cache = CacheService.getScriptCache(), c = cache.get('ia_modelos');
  if (c) return JSON.parse(c);
  var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return [];
  var ver = function (n) { var m = /gemini-(\d+(?:\.\d+)?)/.exec(n); return m ? +m[1] : 0; };
  var l = (JSON.parse(r.getContentText()).models || []).filter(function (m) {
    var n = m.name.replace('models/', '');
    return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0 && /^gemini-.*flash/.test(n)
      && !/image|tts|audio|live|thinking|embed|exp/.test(n);
  }).map(function (m) { return m.name.replace('models/', ''); });
  l.sort(function (a, b) { var la = /lite/.test(a) ? 0 : 1, lb = /lite/.test(b) ? 0 : 1; if (la !== lb) return la - lb; var pa = /preview/.test(a) ? 1 : 0, pb = /preview/.test(b) ? 1 : 0; if (pa !== pb) return pa - pb; return ver(b) - ver(a); });
  cache.put('ia_modelos', JSON.stringify(l), 21600);
  return l;
}
/* Tenta o modelo principal; se estiver sobrecarregado ou fora do ar, passa na hora para os de reserva. */
function chamarModelos(key, corpo) {
  var fila = [CFG.IA_MODELO].concat(CFG.IA_RESERVA || []), r = null;
  for (var i = 0; i < fila.length; i++) {
    var m = fila[i];
    r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(corpo), muteHttpExceptions: true });
    var c = r.getResponseCode();
    if (c === 200 || c === 400 || c === 403) return { r: r, modelo: m };
  }
  return { r: r, modelo: '' };
}

/** Rode pelo editor para conferir se a chave funciona: mostra os modelos disponíveis e qual respondeu. */
function testarIA() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  CacheService.getScriptCache().remove('ia_modelos');
  Logger.log('Modelos de reserva: ' + modelosReserva(key).join(', '));
  var x = chamarModelos(key, { contents: [{ parts: [{ text: 'Sugira em uma frase um tema de evento sobre moda circular para universitários.' }] }] });
  Logger.log(x.r.getResponseCode() + (x.modelo ? ' (respondeu: ' + x.modelo + ')' : '') + ' ' + x.r.getContentText().slice(0, 600));
}
