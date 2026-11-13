/* ============ FICHA DO EVENTO (seções 01 e 02 da Ficha de Evento Feashion) ============
   Fica no painel do evento (Base). O que o Planejar já calcula entra sozinho; o resto se preenche aqui.
   eventos/{id}.ficha = {equipe:[nomes], objetivo, metaSatisfacao, publico:[...], semConvidado, salaReservada:'sim'|'nao'|'',
                         reservaNum, linkExterno, levar:[{item, quem}], brindes:[{item, quem, gasto}], planoB, fotos}
   (fichas antigas guardavam brindes como texto: vira o primeiro item da lista)
   eventos/{id}.convConfirmados = {idDoConvidado: {em, por}}: convidado confirmado por escrito NESTE evento (marcado na ficha,
   grava na hora); o ponto "Convidado confirmado" do checklist só fica verde com todos os convidados do evento marcados.
   No Planejar: o convidado é escolhido por segmento (mesma lista da tela Convidados), ordenado pela nota. */
(function(){
"use strict";
function fblk(t,h,cls){return '<div class="tp-blk'+(cls?' '+cls:'')+'">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function fpode(){return document.body.classList.contains('pode-editar');}
var PUBLICOS=['Membros','Trainees','Alunos FEA','Aberto'];
var NEED_SALA={'n-proj':'projetor','n-som':'som','n-ar':'arCondicionado','n-tom':'tomadas','n-mesas':'mesas','n-acess':'acessibilidade'};
function evDe(id){return events.filter(function(x){return x.id===id;})[0];}
/* "confirmado por escrito" de um convidado neste evento */
function confHtml(e,g,ed){var c=(e.convConfirmados||{})[g.id],q=c&&c.em?' em '+c.em.slice(8,10)+'/'+c.em.slice(5,7)+(c.por?' por '+esc(String(c.por).split(' ')[0]):''):'';
  if(!ed)return '<span class="fi-cf'+(c?' on':'')+'">'+(c?'✓ Confirmado por escrito'+q:'Aguardando confirmação por escrito')+'</span>';
  return '<label class="fi-cf'+(c?' on':'')+'"><input type="checkbox" data-fi-conf="'+esc(g.id)+'"'+(c?' checked':'')+'><span>Confirmado por escrito'+(q?'<small>'+q.slice(1)+'</small>':'')+'</span></label>';}
/* convidados do evento: ids da base (eventos antigos tinham um só, ou só o nome) */
function convIds(e){return Array.isArray(e.convidadoIds)&&e.convidadoIds.length?e.convidadoIds:(e.convidadoId?[e.convidadoId]:[]);}
function convsDe(e){var l=convIds(e).map(function(i){return guests.filter(function(x){return x.id===i;})[0];}).filter(Boolean);
  if(!l.length&&e.convidado){var n=String(e.convidado).trim().toLowerCase(),g=guests.filter(function(x){return String(x.nome||'').trim().toLowerCase()===n;})[0];if(g)l=[g];}return l;}
function salaDe(e){if(!e.sala)return null;return salas.filter(function(x){return x.nome===e.sala;})[0]||null;}
function dias(e){if(!e.data)return null;return Math.round((D(e.data)-D(iso(new Date())))/864e5);}

/* rascunho por evento: o painel se redesenha com dados novos sem perder o que a pessoa digitou */
var RASC={},SUJO={},MSG={},FOC={},FMSG={};
function base(e){var f=e.ficha||{};return {equipe:(f.equipe||(e.responsavel?[e.responsavel]:[])).slice(),objetivo:f.objetivo||'',metaSatisfacao:f.metaSatisfacao!=null?f.metaSatisfacao:80,
  publico:(f.publico||[]).slice(),semConvidado:!!f.semConvidado,salaReservada:f.salaReservada||'',reservaNum:f.reservaNum||'',levar:(f.levar||[]).map(function(x){return {item:x.item||'',quem:x.quem||''};}),
  brindes:(Array.isArray(f.brindes)?f.brindes:String(f.brindes||'').trim()?[{item:String(f.brindes).trim()}]:[]).map(function(x){return {item:x.item||'',quem:x.quem||'',gasto:!!x.gasto};}),planoB:f.planoB||'',fotos:f.fotos||'',linkExterno:f.linkExterno||''};}
function rasc(e){if(!RASC[e.id]||!SUJO[e.id])RASC[e.id]=base(e);return RASC[e.id];}

/* ----- o que conta para a ficha estar completa ----- */
function itens(e,r){var i=e.inscricao;return [
  ['Responsável',!!e.responsavel],['Equipe envolvida',r.equipe.length>0],['Objetivo',!!String(r.objetivo).trim()],['Meta de satisfação',r.metaSatisfacao!=null&&r.metaSatisfacao!==''],
  ['Público-alvo',r.publico.length>0],['Inscrição',!!(i&&i.formId)||!!safeUrl(r.linkExterno)],['Convidado',r.semConvidado||convIds(e).length>0||!!String(e.convidado||'').trim()],
  ['Plano B',!!String(r.planoB).trim()]];} /* a reserva da sala vem depois da aprovação: fica no checklist (06) */
function situacao(e,r){var l=itens(e,r||base(e)),ok=l.filter(function(x){return x[1];}).length,d=dias(e);
  return {ok:ok,total:l.length,faltam:l.filter(function(x){return !x[1];}).map(function(x){return x[0];}),atrasada:ok<l.length&&d!=null&&d<30};}
window.__fichaCompleta=function(e){var s=situacao(e);return s.ok===s.total;};
window.__fichaSelo=function(e){if(e.status==='realizado')return '';var s=situacao(e);
  if(s.ok===s.total)return ' <span class="chip ok">ficha completa</span>';
  return ' <span class="chip '+(s.atrasada?'bad':'neutral')+'" title="Falta: '+esc(s.faltam.join(', '))+'">'+(s.atrasada?'ficha atrasada':'ficha: faltam '+(s.total-s.ok))+'</span>';};

/* ----- painel ----- */
function v(x){return esc(x==null?'':x);}
function ro(l,h){return '<div class="fi-ro"><span>'+l+'</span><b>'+h+'</b></div>';}
window.__fichaBlk=function(e){var r=rasc(e),ed=fpode()&&!(window.__travado&&__travado(e)),id=esc(e.id),dn=e.status==='realizado',s=situacao(e,r),d=dias(e),h='';
  /* progresso */
  if(!dn)h+='<div class="fi-prog'+(s.atrasada?' late':'')+'"><div class="fi-pt"><b>Ficha '+s.ok+' de '+s.total+'</b>'+(s.ok===s.total?' · completa':'')+(d!=null&&d>=0?' <span class="note">· evento em '+d+' dia'+(d===1?'':'s')+'</span>':'')+'</div><span class="tbar"><i style="width:'+Math.round(s.ok/s.total*100)+'%"></i></span>'+
    (s.faltam.length?'<div class="note">'+(s.atrasada?'<b>Faltam menos de 30 dias.</b> ':'')+'Falta: '+esc(s.faltam.join(', '))+'.</div>':'')+'</div>';
  /* 01 identificação */
  var q=e.data?D(e.data).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}):'sem data';
  var a=ro('Evento',esc(e.nome||'—')+' <span class="note">· '+esc(e.tipo||'')+'</span>')+ro('Data e horário',esc(q)+(e.hora?' · '+esc(e.hora):''))+ro('Local',e.sala?esc(e.sala)+(e.capacidade?' ('+e.capacidade+' lugares)':''):'—');
  a='<div class="fi-grp">'+a+'<p class="note fi-pl">Nome, tipo, data e local vêm do Planejar; para mudar, use “Abrir no Planejar”.</p></div>';
  a+=ed?'<label class="tresp"><span>Responsável</span><select data-tresp="'+id+'"></select></label>':ro('Responsável',esc(e.responsavel||'—'));
  var eq=r.equipe.map(function(n,k){return '<span class="fi-chip">'+esc(n)+(ed?'<button type="button" data-fi-eqx="'+k+'" aria-label="Tirar '+esc(n)+'">&times;</button>':'')+'</span>';}).join('');
  a+='<div class="field"><label>Equipe envolvida</label><div class="fi-chips">'+(eq||'<span class="note">ninguém ainda</span>')+(ed?'<select data-fi-eqadd aria-label="Adicionar pessoa à equipe"><option value="">+ adicionar pessoa</option>'+(window.__membros||[]).filter(function(m){return r.equipe.indexOf(m.nome)<0;}).map(function(m){return '<option>'+esc(m.nome)+'</option>';}).join('')+'</select>':'')+'</div></div>';
  a+=ed?'<div class="field"><label for="fi-obj">Objetivo em uma frase</label><input id="fi-obj" data-fi="objetivo" maxlength="200" value="'+v(r.objetivo)+'" placeholder="ex.: aproximar os alunos do mercado de luxo"></div>':ro('Objetivo',esc(r.objetivo||'—'));
  var meta=(e.inscritosMeta?e.inscritosMeta+' inscritos':'—');
  a+=ed?'<div class="fi-row"><div class="field"><label>Meta de participantes</label><div class="fi-val">'+meta+' <span class="note">do Planejar</span></div></div><div class="field"><label for="fi-sat">Meta de satisfação (%)</label><input id="fi-sat" data-fi="metaSatisfacao" type="number" min="0" max="100" step="5" value="'+v(r.metaSatisfacao)+'"></div></div>':ro('Meta',meta+' · '+esc(r.metaSatisfacao)+'% de satisfação');
  h+=fblk('01 · Identificação',a,'fi-sec');
  /* 02 público e logística */
  var b=ed?'<fieldset class="fi-pub"><legend>Público-alvo</legend><div class="fi-cks">'+PUBLICOS.map(function(p){return '<label class="check"><input type="checkbox" data-fi-pub="'+p+'"'+(r.publico.indexOf(p)>=0?' checked':'')+'>'+p+'</label>';}).join('')+'</div></fieldset>':ro('Público-alvo',esc(r.publico.join(', ')||'—'));
  b+=ro('Pessoas esperadas / capacidade',(e.presentesPrev!=null?e.presentesPrev+' previstos':'—')+(e.capacidade?' · sala de '+e.capacidade:''));
  /* sem o Forms do robô, dá para colar o link de outra plataforma (Sympla, site...), mas sem coleta automática */
  var temForm=!!(e.inscricao&&e.inscricao.formId),lx=safeUrl(r.linkExterno),ext='';
  if(!temForm)ext=ed?'<div class="fi-ext"><label for="fi-lext">Ou cole um link externo de inscrição <span class="rq opt">Sympla, site etc.</span></label><input id="fi-lext" data-fi="linkExterno" type="url" maxlength="400" value="'+v(r.linkExterno)+'" placeholder="https://...">'+
      (lx?'<a href="'+esc(lx)+'" target="_blank" rel="noopener" class="fi-link">Abrir link de inscrição ↗</a>':'')+
      '<p class="note fi-alerta">Com link externo, o app não recebe os inscritos: a contagem, os e-mails automáticos e o mailing só funcionam com o Google Forms criado pelo botão acima.</p></div>'
    :(lx?'<div class="fi-ext">'+ro('Link externo','<a href="'+esc(lx)+'" target="_blank" rel="noopener">Abrir ↗</a>')+'</div>':'');
  b+='<div class="field"><label>Inscrição e link</label>'+inscHtml(e)+ext+'</div>';
  /* convidado */
  var gl=convsDe(e),cv='';
  if(gl.length)cv=gl.map(function(g){return '<div class="fi-conv"><div><b>'+esc(g.nome)+'</b><span class="tsub">'+esc([g.cargo,g.empresa].filter(Boolean).join(' · ')||'sem cargo e empresa no cadastro')+'</span></div>'+
    (ed?'<label class="fi-st"><span>Status do convite</span><select data-fi-gst="'+esc(g.id)+'">'+STATUS.concat(STATUS.indexOf(g.status)<0&&g.status?[g.status]:[]).map(function(x){return '<option'+(x===g.status?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></label>':'<span class="chip neutral">'+esc(g.status||'—')+'</span>')+confHtml(e,g,ed)+'</div>';}).join('');
  else if(e.convidado)cv='<div class="fi-conv"><div><b>'+esc(e.convidado)+'</b><span class="tsub">fora da base de Convidados: escolha pelo Planejar, entre os convidados da base</span></div></div>';
  else cv='<p class="note" style="margin:0">'+(r.semConvidado?'Evento sem convidado.':'Nenhum convidado escolhido. Escolha pelo segmento no Planejar (dá para escolher mais de um).')+'</p>';
  if(ed&&!gl.length&&!e.convidado)cv+='<label class="check"><input type="checkbox" data-fi-semconv'+(r.semConvidado?' checked':'')+'>Este evento não tem convidado</label>';
  b+='<div class="field"><label>Convidado'+(gl.length>1?'s':'')+' (nome, cargo, empresa)</label>'+cv+(e.equipeConvidado?'<span class="note">vem com equipe de '+e.equipeConvidado+'</span>':'')+'</div>';
  /* sala e equipamentos */
  b+=ed?'<div class="fi-row"><div class="field"><label for="fi-res">Sala reservada?</label><select id="fi-res" data-fi="salaReservada"><option value="">—</option><option value="sim"'+(r.salaReservada==='sim'?' selected':'')+'>Sim</option><option value="nao"'+(r.salaReservada==='nao'?' selected':'')+'>Ainda não</option></select></div><div class="field"><label for="fi-num">Nº da reserva</label><input id="fi-num" data-fi="reservaNum" maxlength="60" value="'+v(r.reservaNum)+'"></div></div>':ro('Sala reservada?',r.salaReservada==='sim'?'sim'+(r.reservaNum?' · nº '+esc(r.reservaNum):''):r.salaReservada==='nao'?'ainda não':'—');
  var sl=salaDe(e),fm=e.form||{},faltas=[];
  var eqs=sl?SRECS.map(function(x){var val=sl[x[0]]||'?';var precisa=Object.keys(NEED_SALA).some(function(k){return NEED_SALA[k]===x[0]&&fm[k];});if(precisa&&val==='nao')faltas.push(x[2]);
    return '<span class="fi-eq '+(val==='sim'?'sim':val==='nao'?'nao':'ns')+'" title="'+(val==='sim'?'a sala tem':val==='nao'?'a sala não tem':'não sabemos')+(precisa?' · o evento precisa':'')+'">'+(val==='sim'?'✓':val==='nao'?'✗':'?')+' '+esc(x[2])+'</span>';}).join(''):'';
  b+='<div class="field"><label>Equipamentos da sala</label>'+(sl?'<div class="fi-eqs">'+eqs+'</div><span class="note">Do cadastro da sala '+esc(sl.nome)+'.</span>':'<span class="note">'+(e.sala?'A sala '+esc(e.sala)+' não está no cadastro de Salas.':'Sem sala definida.')+'</span>')+'</div>';
  var lv=faltas.filter(function(f){return !r.levar.some(function(x){return x.item.toLowerCase()===f.toLowerCase();});}).map(function(f){return '<tr class="fi-auto"><td>'+esc(f)+' <span class="chip warn">falta na sala</span></td><td class="note">'+(ed?'<button type="button" class="btn small ghost" data-fi-lauto="'+esc(f)+'">Definir quem leva</button>':'—')+'</td><td></td></tr>';}).join('');
  lv+=r.levar.map(function(x,k){return '<tr><td>'+esc(x.item)+'</td><td>'+(ed?'<input data-fi-lquem="'+k+'" value="'+v(x.quem)+'" placeholder="quem leva" aria-label="Quem leva '+esc(x.item)+'">':esc(x.quem||'—'))+'</td><td class="r">'+(ed?'<button type="button" class="cf-x" data-fi-lx="'+k+'" aria-label="Tirar '+esc(x.item)+'">&times;</button>':'')+'</td></tr>';}).join('');
  b+='<div class="field"><label>Levar para o evento <span class="rq opt">o que não é da sala</span></label>'+(lv?'<table class="g-tab fi-levar"><tbody>'+lv+'</tbody></table>':'<p class="note" style="margin:0">Nada a levar.</p>')+
    (ed?'<div class="fi-add"><input id="fi-litem" placeholder="ex.: passador, extensão, banner" aria-label="Item a levar"><input id="fi-lquem" placeholder="quem leva" aria-label="Quem leva"><button type="button" class="btn small ghost" data-fi-ladd>Adicionar</button></div>':'')+'</div>';
  /* alimentação, plano B, fotos */
  var cf=fm['f-coffee'],por=e.custoPrevItens&&e.custoPrevItens.porcoes;
  var cof=cf===true?'<span class="fi-yn sim" aria-hidden="true">✓</span> Coffee'+(por?' · '+por+' porções':''):cf===false?'<span class="fi-yn nao" aria-hidden="true">✗</span> Sem coffee':'<span class="fi-yn ns" aria-hidden="true">?</span> Coffee não definido';
  b+='<div class="field"><label>Alimentação</label><div class="fi-val">'+cof+' <span class="note">do Planejar</span></div></div>';
  var bl=r.brindes.map(function(x,k){return '<tr><td>'+esc(x.item)+'</td><td>'+(ed?'<input data-fi-bquem="'+k+'" value="'+v(x.quem)+'" placeholder="responsável" aria-label="Responsável por '+esc(x.item)+'">':esc(x.quem||'—'))+'</td>'+
    '<td class="fi-bg">'+(ed?'<label class="check"><input type="checkbox" data-fi-bg="'+k+'"'+(x.gasto?' checked':'')+'>gasto registrado</label>':(x.gasto?'<span class="chip ok">gasto registrado</span>':'<span class="chip warn">gasto não registrado</span>'))+'</td>'+
    '<td class="r">'+(ed?'<button type="button" class="cf-x" data-fi-bx="'+k+'" aria-label="Tirar '+esc(x.item)+'">&times;</button>':'')+'</td></tr>';}).join('');
  b+='<div class="field"><label>Brindes</label>'+(bl?'<table class="g-tab fi-levar fi-brindes"><tbody>'+bl+'</tbody></table>':'<p class="note" style="margin:0">Nenhum brinde.</p>')+
    (ed?'<div class="fi-add"><input id="fi-bitem" placeholder="ex.: ecobags do patrocinador" aria-label="Brinde"><input id="fi-bquem" placeholder="responsável" aria-label="Responsável pelo brinde"><button type="button" class="btn small ghost" data-fi-badd>Adicionar</button></div>':'')+'</div>';
  var risco=(e.climaAvisos&&e.climaAvisos.length)||(e.notaData!=null&&e.notaData<60);
  b+=ed?'<div class="field"><label for="fi-pb">Plano B</label>'+(risco&&!r.planoB?'<p class="note fi-alerta">A nota de clima desta data está baixa: vale pensar no plano B.</p>':'')+'<textarea id="fi-pb" data-fi="planoB" rows="3" maxlength="800" placeholder="ex.: se o convidado cancelar, quem substitui; se chover, outra sala">'+v(r.planoB)+'</textarea></div>':ro('Plano B',esc(r.planoB||'—'));
  /* pasta de fotos: o robô cria no Drive da diretoria (e.pastaFotos); quem já tem uma pasta pode colar o link */
  var pf=e.pastaFotos&&safeUrl(e.pastaFotos.url),fu=pf||safeUrl(r.fotos),abre=fu?'<a href="'+esc(fu)+'" target="_blank" rel="noopener" class="fi-link">Abrir pasta de fotos ↗</a>':'';
  if(!ed)b+=ro('Fotos',fu?'<a href="'+esc(fu)+'" target="_blank" rel="noopener">Abrir pasta ↗</a>':'—');
  else if(pf)b+='<div class="field"><label>Pasta de fotos</label>'+abre+'<span class="note">Criada no Drive da diretoria. Todos os membros do app podem ver e subir as fotos.</span></div>';
  else{var oc=FOC[e.id],fm2=FMSG[e.id];
    b+='<div class="field"><label for="fi-fotos">Pasta de fotos</label>'+
      (window.ROBO_URL&&!r.fotos?'<div class="btns" style="margin:0 0 6px"><button type="button" class="btn small" data-fi-pasta="'+id+'"'+(oc?' disabled':'')+'>'+(oc?'Criando a pasta…':'Criar pasta de fotos')+'</button>'+(fm2?'<span class="msg">'+esc(fm2)+'</span>':'')+'</div><span class="note">O robô cria a pasta no Drive da diretoria, com o nome e a data do evento. Já tem uma pasta? Cole o link:</span>':'')+
      '<input id="fi-fotos" data-fi="fotos" type="url" value="'+v(r.fotos)+'" placeholder="https://drive.google.com/...">'+abre+'</div>';}
  h+=fblk('02 · Público e logística',b,'fi-sec');
  /* salvar e, ao lado, a aprovação da Presidência */
  if(ed)h+='<div class="btns fi-salvar"><button type="button" class="btn" data-fi-salvar="'+id+'"'+(SUJO[e.id]?'':' disabled')+'>Salvar ficha</button><span class="msg" role="status">'+(SUJO[e.id]?'Alterações não salvas.':(MSG[e.id]||''))+'</span>'+(window.__fichaAprovHtml?window.__fichaAprovHtml(e):'')+'</div>';
  return h;};

/* ----- interação (delegada na seção da Base) ----- */
function sujar(id){if(!SUJO[id]){SUJO[id]=1;var dr=document.querySelector('#view-base .tpanel');var bt=dr&&dr.querySelector('[data-fi-salvar]');if(bt){bt.disabled=false;var m=bt.parentNode.querySelector('.msg');if(m)m.textContent='Alterações não salvas.';}}}
function redesenha(){var a=document.activeElement;if(a&&a.blur&&a.closest&&a.closest('#view-base .tpanel'))a.blur();painelAtualizar('view-base');}
function atual(){var dr=document.querySelector('#view-base .tpanel');var b=dr&&!dr.hidden&&dr.querySelector('[data-fi-salvar],[data-tresp]');if(!b)return null;var id=b.dataset.fiSalvar||b.dataset.tresp;return evDe(id)?id:null;}
var sec=$('view-base');
sec.addEventListener('input',function(ev){var t=ev.target,id;if(!t.dataset)return;
  if(t.dataset.fi!=null&&(id=atual())){var e=evDe(id),r=rasc(e),k=t.dataset.fi;r[k]=k==='metaSatisfacao'?(t.value===''?'':Math.max(0,Math.min(100,+t.value))):t.value;sujar(id);}
  else if(t.dataset.fiLquem!=null&&(id=atual())){rasc(evDe(id)).levar[+t.dataset.fiLquem].quem=t.value;sujar(id);}
  else if(t.dataset.fiBquem!=null&&(id=atual())){rasc(evDe(id)).brindes[+t.dataset.fiBquem].quem=t.value;sujar(id);}});
sec.addEventListener('change',function(ev){var t=ev.target,id=atual();if(!id)return;var e=evDe(id),r=rasc(e);
  if(t.dataset.fi==='salaReservada'){r.salaReservada=t.value;sujar(id);}
  else if(t.dataset.fiPub){var p=t.dataset.fiPub;r.publico=r.publico.filter(function(x){return x!==p;});if(t.checked)r.publico.push(p);r.publico.sort(function(a,b){return PUBLICOS.indexOf(a)-PUBLICOS.indexOf(b);});sujar(id);}
  else if(t.dataset.fiBg!=null){r.brindes[+t.dataset.fiBg].gasto=t.checked;sujar(id);}
  else if(t.hasAttribute('data-fi-semconv')){r.semConvidado=t.checked;sujar(id);redesenha();}
  else if(t.hasAttribute('data-fi-eqadd')&&t.value){r.equipe.push(t.value);sujar(id);redesenha();}
  else if(t.dataset.fiConf&&db){var up={};up['convConfirmados.'+t.dataset.fiConf]=t.checked?{em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80)}:null;
    db.doc('eventos/'+id).update(up).catch(function(){t.checked=!t.checked;alertMsg('Não foi possível salvar a confirmação do convidado.');});}
  else if(t.dataset.fiGst&&db){var gid=t.dataset.fiGst;db.doc('convidados/'+gid).update({status:t.value}).catch(function(){alertMsg('Não foi possível mudar o status do convidado.');});}});
sec.addEventListener('click',function(ev){var b=ev.target.closest('[data-fi-eqx],[data-fi-lx],[data-fi-ladd],[data-fi-lauto],[data-fi-bx],[data-fi-badd],[data-fi-pasta],[data-fi-salvar]');if(!b)return;var id=atual();if(!id)return;var e=evDe(id),r=rasc(e);
  if(b.dataset.fiEqx!=null){r.equipe.splice(+b.dataset.fiEqx,1);sujar(id);redesenha();}
  else if(b.dataset.fiLx!=null){r.levar.splice(+b.dataset.fiLx,1);sujar(id);redesenha();}
  else if(b.dataset.fiLauto){r.levar.push({item:b.dataset.fiLauto,quem:''});sujar(id);redesenha();var q=document.querySelector('#view-base .tpanel [data-fi-lquem="'+(r.levar.length-1)+'"]');if(q)q.focus();}
  else if(b.hasAttribute('data-fi-ladd')){var it=$('fi-litem'),qm=$('fi-lquem');if(!it.value.trim()){it.focus();return;}r.levar.push({item:it.value.trim().slice(0,80),quem:qm.value.trim().slice(0,80)});sujar(id);redesenha();var n=$('fi-litem');if(n)n.focus();}
  else if(b.dataset.fiPasta){if(FOC[id])return;FOC[id]=1;delete FMSG[id];redesenha();
    robo('criarPastaFotos',id).then(function(j){var x=evDe(id);if(x&&j.pastaFotos)x.pastaFotos=j.pastaFotos;},function(err){FMSG[id]=err.message||'Não foi possível criar a pasta.';})
      .then(function(){delete FOC[id];redesenha();});}
  else if(b.dataset.fiBx!=null){r.brindes.splice(+b.dataset.fiBx,1);sujar(id);redesenha();}
  else if(b.hasAttribute('data-fi-badd')){var bi=$('fi-bitem'),bq=$('fi-bquem');if(!bi.value.trim()){bi.focus();return;}r.brindes.push({item:bi.value.trim().slice(0,80),quem:bq.value.trim().slice(0,80),gasto:false});sujar(id);redesenha();var nb=$('fi-bitem');if(nb)nb.focus();}
  else if(b.dataset.fiSalvar){if(!db)return;var fu=String(r.fotos||'').trim(),lxs=String(r.linkExterno||'').trim();if(fu&&!safeUrl(fu)){var m0=b.parentNode.querySelector('.msg');if(m0)m0.textContent='O link das fotos precisa começar com https://';return;}
    if(lxs&&!safeUrl(lxs)){var m1=b.parentNode.querySelector('.msg');if(m1)m1.textContent='O link de inscrição precisa começar com https://';return;}
    var f={equipe:r.equipe,objetivo:String(r.objetivo).trim().slice(0,200),metaSatisfacao:r.metaSatisfacao===''?null:+r.metaSatisfacao,publico:r.publico,semConvidado:!!r.semConvidado,salaReservada:r.salaReservada,reservaNum:String(r.reservaNum).trim().slice(0,60),
      levar:r.levar.filter(function(x){return x.item;}),brindes:r.brindes.filter(function(x){return x.item;}),planoB:String(r.planoB).trim().slice(0,800),fotos:fu,linkExterno:lxs};
    b.disabled=true;var m=b.parentNode.querySelector('.msg');if(m)m.textContent='Salvando…';
    var up={ficha:f},sc=situacao(e,r);if(sc.ok===sc.total&&!(e.etapas&&e.etapas.ficha&&e.etapas.ficha.em))up['etapas.ficha']={em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80)}; /* Andamento: ficha concluída */
    db.doc('eventos/'+id).update(up).then(function(){delete SUJO[id];delete RASC[id];MSG[id]='Ficha salva.';redesenha();},function(){b.disabled=false;if(m)m.textContent='Não foi possível salvar a ficha.';});}});
/* Enter num campo de texto da ficha não fecha nada nem envia */
sec.addEventListener('keydown',function(ev){if(ev.key!=='Enter')return;var k=ev.target.id;
  if(k==='fi-litem'||k==='fi-lquem'||k==='fi-bitem'||k==='fi-bquem'){ev.preventDefault();var b=sec.querySelector(k.charAt(3)==='l'?'[data-fi-ladd]':'[data-fi-badd]');if(b)b.click();}});
window.__fichaFechou=function(id){if(id&&!SUJO[id])delete MSG[id];};

/* ============ PLANEJAR: convidados escolhidos da base, por segmento ============
   Um evento pode ter vários convidados, de segmentos diferentes. Só entram convidados da base.
   #f-convid guarda os ids separados por vírgula; #f-conv (escondido) guarda os nomes, para os e-mails e a busca. */
/* trava de agenda: um convidado da base não fica em dois compromissos (evento ou capacitação do C&D) que se sobrepõem no mesmo dia.
   Sem horário em um dos dois, vale o dia inteiro. Duração padrão: 120 min no evento, 90 na capacitação. ign = id do evento ou 'cap:'+id */
function hmC(h){var m=/^(\d{1,2}):(\d{2})/.exec(h||'');return m?+m[1]*60+ +m[2]:null;}
window.__convConflito=function(gid,data,hora,dur,ign){if(!gid||!data)return null;var a=hmC(hora),fa=a==null?null:a+(+dur||120),out=null;
  function bate(h,d){var b=hmC(h);return a==null||b==null||(a<b+d&&b<fa);}
  events.forEach(function(e){if(out||e.id===ign||e.data!==data)return;var ids=e.convidadoIds&&e.convidadoIds.length?e.convidadoIds:e.convidadoId?[e.convidadoId]:[];
    if(ids.indexOf(gid)>=0&&bate(e.hora,+e.duracao||120))out={tipo:'evento',id:e.id,nome:e.nome||'evento',data:e.data,hora:e.hora||''};});
  (window.__cdCaps||[]).forEach(function(c){if(out||'cap:'+c.id===ign||c.data!==data)return;var q=c.quem||{};
    if(q.convidadoId===gid&&bate(c.hora,+c.duracao||90))out={tipo:'capacitacao',id:c.id,nome:c.nome||'capacitação',data:c.data,hora:c.hora||''};});
  return out;};
window.__convConflitoTxt=function(x){return (x.tipo==='evento'?'no evento “':'na capacitação “')+x.nome+'”'+(x.hora?' das '+x.hora:'')+' no mesmo dia';};
function ocupado(gid){return window.__convConflito(gid,$('f-data').value,$('f-hora').value,$('f-dur').value,editingId||savedId);}
function guestPorSeg(seg){return guests.filter(function(g){return !seg||gS(g).indexOf(seg)>=0;}).sort(function(a,b){return gscore(b)-gscore(a)||String(a.nome).localeCompare(String(b.nome),'pt-BR');});}
function gDe(id){return guests.filter(function(x){return x.id===id;})[0]||null;}
function idsSel(){var v=$('f-convid')?$('f-convid').value:'';return String(v||'').split(',').map(function(x){return x.trim();}).filter(Boolean);}
function juntaNomes(l){return l.length<2?(l[0]||''):l.slice(0,-1).join(', ')+' e '+l[l.length-1];}
function definir(ids){ids=ids.filter(function(x,i){return ids.indexOf(x)===i;});$('f-convid').value=ids.join(',');
  $('f-conv').value=juntaNomes(ids.map(function(i){var g=gDe(i);return g?g.nome:'';}).filter(Boolean));
  $('f-convid').dispatchEvent(new Event('change'));planChips();planSug();}
function planSegs(){var s=$('f-seg');if(!s)return;var cur=s.value,segs=allSegs().sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  s.innerHTML='<option value="">Todos os segmentos</option>'+segs.map(function(x){return '<option'+(x===cur?' selected':'')+'>'+esc(x)+'</option>';}).join('')+(fpode()?'<option value="__novo">+ Criar segmento…</option>':'');
  if(cur&&cur!=='__novo'&&segs.indexOf(cur)<0)s.value='';}
function planChips(){var box=$('f-convchips');if(!box)return;var ids=idsSel(),leg=!ids.length&&String($('f-conv').value||'').trim();
  var h=ids.map(function(i){var g=gDe(i),oc=ocupado(i);return '<span class="fi-chip cchip'+(oc?' cocup':'')+'"><b>'+esc(g?g.nome:'convidado removido da base')+'</b>'+(oc?'<span class="cocup-t"> · ocupado '+esc(window.__convConflitoTxt(oc))+'</span>':g&&(g.cargo||g.empresa)?'<span class="note"> · '+esc([g.cargo,g.empresa].filter(Boolean).join(' · '))+'</span>':'')+'<button type="button" data-cdel="'+esc(i)+'" aria-label="Tirar '+esc(g?g.nome:'convidado')+'">&times;</button></span>';}).join('');
  if(leg)h='<span class="fi-chip cchip"><b>'+esc(leg)+'</b><span class="note"> · fora da base</span><button type="button" data-cdel="__texto" aria-label="Tirar '+esc(leg)+'">&times;</button></span>';
  box.innerHTML=h?h:'<span class="note">Nenhum convidado escolhido. Escolha um segmento e clique nos convidados abaixo; dá para escolher mais de um, de segmentos diferentes.</span>';}
function planSug(){var box=$('f-sug');if(!box)return;var seg=$('f-seg').value==='__novo'?'':$('f-seg').value,sel=idsSel(),l=guestPorSeg(seg);
  if(!guests.length){box.innerHTML='<p class="note">Nenhum convidado na base ainda. Cadastre na tela Convidados.</p>';return;}
  if(!l.length){box.innerHTML='<p class="note">Nenhum convidado deste segmento na base. Cadastre na tela Convidados.</p>';return;}
  var mostra=l.slice(0,6);
  box.innerHTML='<p class="note" style="margin:0 0 6px">'+(seg?'Convidados de '+esc(seg):'Convidados da base')+', pela nota (potencial, conexão, abertura e histórico). Clique para adicionar ou tirar:</p>'+
    mostra.map(function(g){var on=sel.indexOf(g.id)>=0,oc=!on&&ocupado(g.id);return '<button type="button" class="csug'+(on?' on':'')+(oc?' cocup':'')+'" data-csug="'+esc(g.id)+'" aria-pressed="'+on+'"'+(oc?' disabled':'')+'><span class="csn">'+gscore(g)+'</span><span class="cst"><b>'+(on?'✓ ':'')+esc(g.nome)+'</b><span class="tsub">'+(oc?'Ocupado '+esc(window.__convConflitoTxt(oc)):esc([g.cargo,g.empresa].filter(Boolean).join(' · ')||'—'))+'</span></span><span class="chip neutral">'+esc(g.status||'—')+'</span></button>';}).join('')+
    (l.length>6?'<p class="note" style="margin:6px 0 0">Mostrando os 6 com maior nota de '+l.length+'.</p>':'');}
function montarPlan(){var c=$('f-conv');if(!c||$('f-seg'))return;
  var fs=document.createElement('fieldset');fs.className='convsel';
  fs.innerHTML='<legend>Convidados <span class="rq opt">opcional</span></legend><div class="fi-chips" id="f-convchips"></div>'+
    '<div class="field"><label for="f-seg">Escolher por segmento</label><select id="f-seg"></select></div>'+
    '<div class="fi-add" id="f-segnovo" hidden><input id="f-segnome" placeholder="nome do novo segmento" aria-label="Nome do novo segmento"><button type="button" class="btn small ghost" id="f-segok">Criar</button><span class="msg" id="f-segmsg"></span></div>'+
    '<input type="hidden" id="f-convid"><div id="f-sug" class="convsug"></div>';
  var fld=c.closest('.field'),row=fld.parentNode;row.parentNode.insertBefore(fs,row.nextSibling);
  c.type='hidden';fs.appendChild(c);fld.remove();
  planSegs();planChips();planSug();
  $('f-seg').addEventListener('change',function(){var nv=this.value==='__novo';$('f-segnovo').hidden=!nv;if(nv){$('f-segnome').focus();return;}planSug();});
  $('f-segok').addEventListener('click',criarSeg);$('f-segnome').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();criarSeg();}});
  $('f-sug').addEventListener('click',function(e){var b=e.target.closest('[data-csug]');if(!b)return;var ids=idsSel(),i=ids.indexOf(b.dataset.csug);
    if(i>=0)ids.splice(i,1);else ids.push(b.dataset.csug);definir(ids);});
  $('f-convchips').addEventListener('click',function(e){var b=e.target.closest('[data-cdel]');if(!b)return;
    if(b.dataset.cdel==='__texto'){$('f-conv').value='';definir([]);return;}definir(idsSel().filter(function(x){return x!==b.dataset.cdel;}));});}
function criarSeg(){var inp=$('f-segnome'),v0=inp.value.trim(),msg=$('f-segmsg');if(!v0){inp.focus();return;}
  var ja=allSegs().filter(function(x){return x.toLowerCase()===v0.toLowerCase();})[0];
  if(!ja){listas.segmentos=(listas.segmentos||[]).concat([{nome:v0,peso:SEGNOVO}]);if(db)db.doc('listas/convidados').set({temas:listas.temas||[],segmentos:listas.segmentos||[]}).catch(function(){msg.textContent='Não foi possível salvar o segmento.';});renderChks();}
  inp.value='';$('f-segnovo').hidden=true;planSegs();$('f-seg').value=ja||v0;planSug();msg.textContent='';}
/* quando a lista de convidados ou de segmentos muda (aqui ou na tela Convidados), o Planejar acompanha */
var _rc=renderChks;renderChks=function(){_rc();planSegs();planChips();planSug();};
window.__planConvSync=function(){planSegs();planChips();planSug();};
/* a Ideia de evento sugere um convidado pelo nome: entra só se estiver na base */
window.__planConvNome=function(nome){var n=String(nome||'').trim().toLowerCase(),g=n?guests.filter(function(x){return String(x.nome||'').trim().toLowerCase()===n;})[0]:null;
  $('f-convid').value=g?g.id:'';$('f-conv').value=g?g.nome:'';planChips();planSug();};
montarPlan();
$('f-convid').addEventListener('change',function(){markStale();});
['f-data','f-hora','f-dur'].forEach(function(k){var x=$(k);if(x)x.addEventListener('change',function(){planChips();planSug();});});
window.__planConvOcupado=function(){var l=idsSel();for(var i=0;i<l.length;i++){var oc=ocupado(l[i]);if(oc){var g=gDe(l[i]);return (g?g.nome:'Um convidado')+' já está '+window.__convConflitoTxt(oc);}}return '';};
document.addEventListener('permissoes',function(){planSegs();});
})();
