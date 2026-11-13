/* ============================== C&D · TRILHA DO TRAINEE ==============================
   Roda dentro do script principal (mesmo escopo de docs, db, esc, D, iso, $, painelAbrir, painelAtualizar, adiar...).
   A trilha tem uma base comum (todos os trainees) e etapas de cada área (o trainee segue as das áreas em que é Trainee).
   cd_trilha/{id} = {nome, descricao, area ('' = base comum), tipo, ordem, criadoEm}
     tipo 'cap': cumprida quando o trainee está na presença de uma capacitação ligada a esta etapa (cd_capacitacoes.etapa)
     tipo 'tarefa': o C&D marca como feita
     tipo 'entrega': o trainee manda um arquivo ou link (cd_entregas) e o C&D aprova ou pede ajuste
   cd_trilha_prog/{uid} = {etapas:{etapaId:{status:'feita'|'aprovada'|'refazer'|null, obs, em, por, porNome}}} (grava o C&D)
   cd_entregas/{etapaId}_{uid} = {etapa, uid, nome, link, docId, obs, em} (grava só o próprio trainee; regras)
   O arquivo da entrega vira um documento em Documentos, na pasta "Trilha do trainee" (documentos.trilha = uid). */
(function(){
"use strict";
var etapas=[],prog={},entregas={},lig=false,RT={};
var AREAS_T=['Eventos','Financeiro','Marketing','C&D','RH'];
var TIPOS=[['cap','Ir a uma capacitação'],['tarefa','Tarefa marcada pelo C&D'],['entrega','Entrega com arquivo ou link']];
function eu(){var u=window.__euId;return (window.__membros||[]).filter(function(m){return m.id===u;})[0]||null;}
/* vê todas as trilhas: acesso total, ou cargo em C&D que não seja Trainee. Trainee (de qualquer área, C&D inclusive) vê só as dele e não edita. */
function visaoToda(){var p=window.__perm;if(!p||!p.carregado())return false;if(p.dev()||p.geral())return true;var c=p.cargoEm('C&D');return !!p.podeEm('C&D').ver&&!!c&&c!=='Trainee';}
function pode(k){var p=window.__perm;return visaoToda()&&!!p.podeEm('C&D')[k];}
function blk(t,h){return '<div class="tp-blk">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function confirma(b,txt,fn){if(b.dataset.sure){fn();return;}var o=b.textContent;b.dataset.sure='1';b.textContent=txt;setTimeout(function(){delete b.dataset.sure;b.textContent=o;},5000);}
function dataBR(s){s=String(s||'').slice(0,10);return s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4):'';}
function tipoNome(t){return (TIPOS.filter(function(x){return x[0]===t;})[0]||['',''])[1];}
function quem(){return {em:new Date().toISOString(),por:window.__euId||'',porNome:String(window.__meuNome||'').slice(0,80)};}
function ordenadas(){return etapas.slice().sort(function(a,b){return (a.area?1:0)-(b.area?1:0)||String(a.area||'').localeCompare(String(b.area||''))||(+a.ordem||0)-(+b.ordem||0)||String(a.nome).localeCompare(String(b.nome),'pt-BR');});}
window.__trilhaEtapas=function(){return ordenadas();};
window.__trilhaEtapa=function(id){return etapas.filter(function(x){return x.id===id;})[0]||null;};
function areasTrainee(m){var a=m&&m.areas||{};return Object.keys(a).filter(function(k){return a[k]==='Trainee';});}
function trainees(){return (window.__membros||[]).filter(function(m){return areasTrainee(m).length;});}
function trilhasDe(m){return [''].concat(areasTrainee(m));}
function etapasK(k){return ordenadas().filter(function(x){return (x.area||'')===k;});}
function capsDe(eid){return (window.__cdCaps||[]).filter(function(c){return c.etapa===eid;});}
/* situação de uma etapa para um trainee: {s:'feita'|'enviada'|'refazer'|'pendente', em, txt} */
function sit(m,x){var p=((prog[m.id]||{}).etapas||{})[x.id]||{},en=entregas[x.id+'_'+m.id]||null;
  if(x.tipo==='cap'){var c=capsDe(x.id).filter(function(c){return (c.presentes||[]).indexOf(m.id)>=0;}).sort(function(a,b){return String(a.data).localeCompare(String(b.data));})[0];
    if(c)return {s:'feita',em:c.data,txt:'Foi a “'+c.nome+'” em '+dataBR(c.data)};
    if(p.status==='feita')return {s:'feita',em:p.em,txt:'Marcada pelo C&D em '+dataBR(p.em)+(p.obs?' · '+p.obs:'')};
    return {s:'pendente',txt:capsDe(x.id).length?'Ainda não esteve numa capacitação desta etapa':'Nenhuma capacitação ligada a esta etapa ainda'};}
  if(x.tipo==='tarefa'){return p.status==='feita'?{s:'feita',em:p.em,txt:'Marcada por '+(p.porNome||'C&D')+' em '+dataBR(p.em)+(p.obs?' · '+p.obs:'')}:{s:'pendente',txt:'Aguardando o C&D marcar'};}
  if(p.status==='aprovada'&&(!en||String(p.em)>=String(en.em)))return {s:'feita',em:p.em,txt:'Aprovada por '+(p.porNome||'C&D')+' em '+dataBR(p.em)+(p.obs?' · '+p.obs:'')};
  if(p.status==='refazer'&&(!en||String(p.em)>=String(en.em)))return {s:'refazer',em:p.em,txt:'Ajuste pedido em '+dataBR(p.em)+(p.obs?': '+p.obs:'')};
  if(en)return {s:'enviada',em:en.em,txt:'Enviada em '+dataBR(en.em)+', aguardando o C&D'};
  return {s:'pendente',txt:'Ainda não enviada'};}
var CHIP={feita:['Cumprida','ok'],enviada:['Aguardando aprovação','warn'],refazer:['Ajustar','bad'],pendente:['Pendente','neutral']};
function chip(s){var c=CHIP[s]||CHIP.pendente;return '<span class="chip '+c[1]+'">'+c[0]+'</span>';}
function prg(m,k){var l=etapasK(k),f=0,ag=0;l.forEach(function(x){var s=sit(m,x).s;if(s==='feita')f++;if(s==='enviada')ag++;});return {n:l.length,f:f,ag:ag};}
function barra(f,n){var pc=n?Math.round(f/n*100):0;return '<span class="cd-bar"><i style="width:'+pc+'%"></i></span><b>'+f+' de '+n+'</b>';}

/* ---------------- tela ---------------- */
/* Cada trilha é uma caixinha: Base comum ('') e uma por área. O trainee vê só as dele (base + áreas em que é Trainee);
   quem tem outro cargo em C&D (ou acesso total) vê todas. Trainee de C&D não edita nada aqui. */
var main=document.querySelector('main');
var sec=document.createElement('section');sec.id='view-cd-trilha';sec.hidden=true;sec.setAttribute('aria-labelledby','cd-trilha-title');
sec.innerHTML='<div class="section-head"><div><h2 id="cd-trilha-title">Trilha do trainee</h2><p class="note" id="tr-nota"></p></div>'+
  '<div class="btns"><span class="msg" id="cd-trilha-ok" aria-live="polite"></span><button class="btn cd-ed" type="button" id="tr-nova">+ Nova etapa</button></div></div>'+
  '<div id="tr-corpo" class="tr-boxes"></div>';
main.appendChild(sec);

function linhaEtapa(m,x,eu){var t=sit(m,x);
  return '<li class="tr-et"><span class="tr-et-n"><b>'+esc(x.nome)+'</b><span class="tsub">'+esc(tipoNome(x.tipo))+' · '+esc(t.txt)+'</span></span>'+chip(t.s)+
    (eu&&x.tipo==='entrega'&&t.s!=='feita'?'<button type="button" class="btn small" data-trenv="'+esc(x.id)+'">'+(t.s==='pendente'?'Enviar entrega':'Enviar de novo')+'</button>':'')+'</li>';}
function linhaDef(x){var nc=x.tipo==='cap'?capsDe(x.id).length:null;
  return '<li class="tr-et" data-tretapa="'+esc(x.id)+'" tabindex="0"><span class="tr-et-n"><b>'+esc(x.nome)+'</b><span class="tsub">'+esc(tipoNome(x.tipo))+(nc!=null?' · '+(nc?nc+(nc===1?' capacitação ligada':' capacitações ligadas'):'nenhuma capacitação ligada ainda'):'')+(x.descricao?' · '+esc(x.descricao):'')+'</span></span></li>';}
function caixa(cab,lado,corpo){return '<div class="tr-box"><div class="tr-mh"><h3 class="cd-h" style="margin:0">'+esc(cab)+'</h3>'+lado+'</div>'+corpo+'</div>';}
function render(){
  var me=eu(),todo=visaoToda(),h='';
  $('tr-nova').hidden=!pode('editar');
  $('tr-nota').textContent=todo?'Uma caixinha para cada trilha: a base comum (todos os trainees) e a de cada área. Cada etapa se cumpre indo a uma capacitação, por uma tarefa que o C&D marca ou com uma entrega que o C&D aprova.'
    :'Suas trilhas: a base comum e a de cada área em que você é trainee. Cada etapa se cumpre indo a uma capacitação, por uma tarefa que o C&D marca ou com uma entrega que você manda e o C&D aprova.';
  if(!todo){
    if(!me||!areasTrainee(me).length){$('tr-corpo').innerHTML='<p class="empty">A Trilha do trainee aparece aqui para quem tem o cargo Trainee em alguma área.</p>';return;}
    trilhasDe(me).forEach(function(k){var l=etapasK(k),p=prg(me,k);
      h+=caixa(k?'Trilha de '+k:'Base comum','<span class="tr-prog">'+barra(p.f,p.n)+'</span>',
        l.length?'<ul class="tr-lista">'+l.map(function(x){return linhaEtapa(me,x,true);}).join('')+'</ul>':'<p class="note" style="margin:0">O C&amp;D ainda não montou as etapas desta trilha.</p>');});
    $('tr-corpo').innerHTML=h;return;}
  [''].concat(AREAS_T).forEach(function(k){
    var ts=trainees().filter(function(m){return !k||areasTrainee(m).indexOf(k)>=0;}).sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');}),l=etapasK(k);
    var t='<div class="tablewrap"><table class="tlist"><thead><tr><th>Trainee</th>'+(k?'':'<th>Área</th>')+'<th class="r">Progresso</th><th class="r">Aguardando aprovação</th></tr></thead><tbody>';
    if(!ts.length)t+='<tr><td colspan="'+(k?3:4)+'" class="empty">'+(k?'Nenhum trainee em '+esc(k)+'.':'Nenhum trainee ainda. Quem tem o cargo Trainee em alguma área aparece aqui.')+'</td></tr>';
    ts.forEach(function(m){var p=prg(m,k);t+='<tr data-tropen="'+esc(m.id+'|'+k)+'" tabindex="0"'+(m.id===window.__euId?' class="cd-eu"':'')+'><td><span class="tn">'+esc(m.nome)+'</span></td>'+
      (k?'':'<td>'+areasTrainee(m).map(function(a){return '<span class="ttag">'+esc(a)+'</span>';}).join('')+'</td>')+
      '<td class="r num">'+(p.n?barra(p.f,p.n):'<span class="note">sem etapas</span>')+'</td><td class="r num">'+(p.ag?'<span class="chip warn">'+p.ag+(p.ag===1?' entrega':' entregas')+'</span>':'<span class="note">—</span>')+'</td></tr>';});
    t+='</tbody></table></div>';
    var e=l.length?'<h5 class="cd-h5">Etapas</h5><ul class="tr-lista">'+l.map(linhaDef).join('')+'</ul>':'<p class="note" style="margin:8px 0 0">Nenhuma etapa'+(k?' de '+esc(k):' na base comum')+' ainda.'+(pode('editar')?' Clique em “+ Nova etapa”.':'')+'</p>';
    h+=caixa(k?'Trilha de '+k:'Base comum','<span class="note">'+ts.length+(ts.length===1?' trainee':' trainees')+' · '+l.length+(l.length===1?' etapa':' etapas')+'</span>',t+e);});
  $('tr-corpo').innerHTML=h;
}
function tudo(){adiar('view-cd-trilha',render);painelAtualizar('view-cd-trilha');}
window.__trilhaMudou=tudo;

/* ---------------- painel: etapa (C&D) ---------------- */
function montarEtapa(id){var x=id?window.__trilhaEtapa(id):{tipo:'tarefa',area:''};if(id&&!x)return null;var ed=pode('editar');
  if(!ed)return {titulo:x.nome,sub:esc((x.area||'Base comum')+' · '+tipoNome(x.tipo)),corpo:blk('',(x.descricao?'<p style="margin:0;white-space:pre-wrap">'+esc(x.descricao)+'</p>':'<p class="note" style="margin:0">Sem descrição.</p>')+
    (x.tipo==='cap'?'<p class="note" style="margin:8px 0 0">Capacitações ligadas: '+(capsDe(x.id).map(function(c){return esc(c.nome+' ('+dataBR(c.data)+')');}).join(', ')||'nenhuma ainda')+'.</p>':''))};
  var corpo=blk('','<div class="fin-grid"><div class="field ffull"><label for="tr-nome">Nome da etapa <span class="rq">obrigatório</span></label><input id="tr-nome" maxlength="120" value="'+esc(x.nome||'')+'" placeholder="ex.: Apresentação do projeto da área"></div>'+
    '<div class="field"><label for="tr-area">Para quem</label><select id="tr-area"><option value="">Base comum (todos os trainees)</option>'+AREAS_T.map(function(a){return '<option'+(a===x.area?' selected':'')+'>'+esc(a)+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label for="tr-ordem">Ordem</label><input id="tr-ordem" type="number" min="0" step="1" inputmode="numeric" value="'+esc(x.ordem==null?'':x.ordem)+'"></div>'+
    '<div class="field ffull"><label for="tr-tipo">Como se cumpre</label><select id="tr-tipo">'+TIPOS.map(function(t){return '<option value="'+t[0]+'"'+(t[0]===x.tipo?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select>'+
      '<span class="note" id="tr-tipo-n"></span></div>'+
    '<div class="field ffull"><label for="tr-desc">O que o trainee precisa fazer <span class="rq opt">opcional</span></label><textarea id="tr-desc" rows="3" maxlength="1000">'+esc(x.descricao||'')+'</textarea></div></div>');
  var rod='<div class="btns"><button type="button" class="btn" id="tr-salvar">'+(id?'Salvar alterações':'Criar etapa')+'</button>'+(id&&pode('excluir')?'<button type="button" class="btn small ghost tdanger" id="tr-del">Excluir</button>':'')+'<span class="msg" id="tr-msg" role="status"></span></div>';
  return {titulo:id?x.nome:'Nova etapa da trilha',sub:id?esc((x.area||'Base comum')+' · '+tipoNome(x.tipo)):'',corpo:corpo,rodape:rod};}
var NTIPO={cap:'Ligue esta etapa às capacitações (no campo “Conta para a Trilha do trainee” da capacitação). Quem estiver na presença cumpre a etapa sozinho.',tarefa:'Alguém do C&D marca a etapa como feita no painel do trainee.',entrega:'O trainee manda um arquivo ou link nesta tela, e o C&D aprova ou pede ajuste.'};
function abrirEtapa(id){painelAbrir({sec:'view-cd-trilha',chave:'e'+(id||'nova'),montar:function(){return montarEtapa(id);},foco:id?null:'#tr-nome',depois:function(dr){
  var tp=dr.querySelector('#tr-tipo');if(tp){var nt=function(){dr.querySelector('#tr-tipo-n').textContent=NTIPO[tp.value]||'';};tp.addEventListener('change',nt);nt();}
  var sv=dr.querySelector('#tr-salvar');if(sv)sv.addEventListener('click',function(){var m=dr.querySelector('#tr-msg'),nome=dr.querySelector('#tr-nome').value.trim();if(!db){m.textContent='Sem conexão com a base.';return;}
    if(!nome){m.textContent='Dê um nome à etapa.';dr.querySelector('#tr-nome').focus();return;}
    var o=dr.querySelector('#tr-ordem').value,d={nome:nome.slice(0,120),area:dr.querySelector('#tr-area').value,tipo:tp.value,ordem:o===''?null:Math.max(0,Math.round(+o)||0),descricao:dr.querySelector('#tr-desc').value.trim().slice(0,1000),editadoEm:new Date().toISOString()};
    m.textContent='Salvando…';ligar();(id?db.doc('cd_trilha/'+id).update(d):db.collection('cd_trilha').add(Object.assign({criadoEm:d.editadoEm},d)))
      .then(function(r){var x=id?window.__trilhaEtapa(id):null;if(x)Object.assign(x,d);else if(r&&r.id&&!window.__trilhaEtapa(r.id))etapas.push(Object.assign({id:r.id},d));
        painelFechar();render();$('cd-trilha-ok').textContent=id?'Etapa salva.':'Etapa criada.';},
        function(err){console.error('cd_trilha',err);m.textContent=err&&err.code==='permission-denied'?'O banco recusou: só quem tem cargo em C&D (ou acesso total) cria etapas.':'Não foi possível salvar ('+(err&&(err.code||err.message)||'erro')+').';});});
  var dl=dr.querySelector('#tr-del');if(dl)dl.addEventListener('click',function(){confirma(dl,'Confirmar exclusão',function(){db.doc('cd_trilha/'+id).delete().then(function(){painelFechar();$('cd-trilha-ok').textContent='Etapa excluída (fica 30 dias na Lixeira).';},function(){dr.querySelector('#tr-msg').textContent='Não foi possível excluir.';});});});
}});}

/* ---------------- painel: trainee ---------------- */
function montarTrainee(uid,k){var m=(window.__membros||[]).filter(function(x){return x.id===uid;})[0];if(!m)return null;
  if(!visaoToda()&&uid!==window.__euId)return null;
  var ed=pode('editar'),eu=uid===window.__euId,l=etapasK(k),p=prg(m,k);
  var corpo=blk('','<p style="margin:0">'+barra(p.f,p.n)+' <span class="note">etapas cumpridas'+(p.ag?' · '+p.ag+' aguardando aprovação':'')+'</span></p>');
  if(!l.length)corpo+=blk('','<p class="note" style="margin:0">Nenhuma etapa '+(k?'de '+esc(k):'na base comum')+' ainda.</p>');
  var cur=null;
  l.forEach(function(x){var g=x.area||'Base comum',t=sit(m,x),en=entregas[x.id+'_'+uid]||null,pp=((prog[uid]||{}).etapas||{})[x.id]||{},r=RT[x.id+'_'+uid]=RT[x.id+'_'+uid]||{obs:''};
    var h='<div class="tr-pet"><div class="tr-pet-h"><span><b>'+esc(x.nome)+'</b><span class="tsub">'+esc(g+' · '+tipoNome(x.tipo))+'</span></span>'+chip(t.s)+'</div>'+
      (x.descricao?'<p class="note" style="margin:4px 0 0;white-space:pre-wrap">'+esc(x.descricao)+'</p>':'')+'<p style="margin:6px 0 0;font-size:13.5px">'+esc(t.txt)+'</p>';
    if(en){var u=safeUrl(en.link)||'',dd=en.docId?(typeof docs!=='undefined'?docs:[]).filter(function(d){return d.id===en.docId;})[0]:null;if(dd){var f=dFontes(dd);u=dPrincipal(dd.tipo,f.link,f.arquivo)||u;}
      h+='<p style="margin:6px 0 0;font-size:13.5px">Entrega: '+(u?'<a class="fi-link" href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(en.nome||'abrir')+' ↗</a>':esc(en.nome||'—'))+' <span class="note">· '+dataBR(en.em)+'</span>'+(en.obs?'<br><span class="note">“'+esc(en.obs)+'”</span>':'')+'</p>';}
    if(ed&&x.tipo!=='cap'||ed&&x.tipo==='cap'&&t.s!=='feita'||ed&&x.tipo==='cap'&&pp.status==='feita'){
      var acts='';
      if(x.tipo==='tarefa'||x.tipo==='cap')acts=pp.status==='feita'?'<button type="button" class="btn small ghost" data-trst="'+esc(x.id)+'|">Desmarcar</button>':'<button type="button" class="btn small" data-trst="'+esc(x.id)+'|feita">'+(x.tipo==='cap'?'Marcar como cumprida mesmo assim':'Marcar como feita')+'</button>';
      else if(en&&t.s==='enviada')acts='<button type="button" class="btn small" data-trst="'+esc(x.id)+'|aprovada">Aprovar</button><button type="button" class="btn small ghost" data-trst="'+esc(x.id)+'|refazer">Pedir ajuste</button>';
      else if(t.s==='feita'||t.s==='refazer')acts='<button type="button" class="btn small ghost" data-trst="'+esc(x.id)+'|">Desfazer</button>';
      if(acts)h+='<div class="tr-acts"><div class="field" style="margin:0"><input data-trobs="'+esc(x.id)+'" maxlength="300" placeholder="Comentário para o trainee (opcional)" aria-label="Comentário para o trainee" value="'+esc(r.obs)+'"></div><div class="btns">'+acts+'</div></div>';}
    if(eu&&x.tipo==='entrega'&&t.s!=='feita')h+='<div class="btns" style="margin-top:6px"><button type="button" class="btn small" data-trenv="'+esc(x.id)+'">'+(en?'Enviar de novo':'Enviar entrega')+'</button></div>';
    if(g!==cur){corpo+=(cur!==null?'</div>':'')+'<div class="tp-blk"><h4>'+esc(g)+'</h4>';cur=g;}
    corpo+=h+'</div>';});
  if(cur!==null)corpo+='</div>';
  return {titulo:m.nome,sub:esc(k?'Trilha de '+k:'Base comum'),corpo:corpo,rodape:'<div class="btns"><span class="msg" id="tr-pmsg" role="status"></span></div>'};}
function abrirTrainee(uid,k){painelAbrir({sec:'view-cd-trilha',chave:'t'+uid+'|'+k,montar:function(){return montarTrainee(uid,k);},depois:function(dr){
  dr.addEventListener('input',function(e){var o=e.target.closest('[data-trobs]');if(o)RT[o.dataset.trobs+'_'+uid].obs=o.value;});
  dr.addEventListener('click',function(e){var b=e.target.closest('[data-trst]');if(b){var p=b.dataset.trst.split('|'),eid=p[0],st=p[1]||null,m=dr.querySelector('#tr-pmsg'),r=RT[eid+'_'+uid];
      if(!db){m.textContent='Sem conexão com a base.';return;}if(st==='refazer'&&!String(r.obs||'').trim()){m.textContent='Escreva no comentário o que o trainee precisa ajustar.';var i=dr.querySelector('[data-trobs="'+eid+'"]');if(i)i.focus();return;}
      var v=Object.assign({status:st,obs:st?String(r.obs||'').trim().slice(0,300):''},quem()),up={etapas:Object.assign({},(prog[uid]||{}).etapas||{})};up.etapas[eid]=v;b.disabled=true;m.textContent='Salvando…';
      db.doc('cd_trilha_prog/'+uid).set(up,{merge:true}).then(function(){var x=prog[uid]=prog[uid]||{etapas:{}};x.etapas=x.etapas||{};x.etapas[eid]=v;r.obs='';m.textContent='Salvo.';painelAtualizar('view-cd-trilha');render();},function(){b.disabled=false;m.textContent='Não foi possível salvar: só quem tem cargo em C&D marca.';});return;}
    var ev=e.target.closest('[data-trenv]');if(ev)abrirEntrega(ev.dataset.trenv);});
}});}

/* ---------------- painel: entrega (o próprio trainee) ---------------- */
function abrirEntrega(eid){var x=window.__trilhaEtapa(eid),uid=window.__euId;if(!x||!uid)return;
  painelAbrir({sec:'view-cd-trilha',chave:'n'+eid,montar:function(){var en=entregas[eid+'_'+uid]||null,pp=((prog[uid]||{}).etapas||{})[eid]||{};
      return {titulo:'Entrega · '+x.nome,sub:esc((x.area||'Base comum')),corpo:(x.descricao?blk('O que fazer','<p style="margin:0;white-space:pre-wrap">'+esc(x.descricao)+'</p>'):'')+
        (pp.status==='refazer'?blk('Ajuste pedido pelo C&amp;D','<p style="margin:0">'+esc(pp.obs||'')+'</p>'):'')+
        blk(en?'Enviar de novo':'Sua entrega','<div class="field"><label for="tn-nome">Nome <span class="rq">obrigatório</span></label><input id="tn-nome" maxlength="120" value="'+esc(en?en.nome:x.nome)+'"></div>'+
          '<div class="field"><label for="tn-arq">Arquivo <span class="rq opt">PDF ou imagem, até 10 MB</span></label><input id="tn-arq" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"><input id="tn-link" type="url" placeholder="ou cole um link (Drive, apresentação)" aria-label="Link da entrega" style="margin-top:6px;width:100%"></div>'+
          '<div class="field"><label for="tn-obs">Recado para o C&amp;D <span class="rq opt">opcional</span></label><textarea id="tn-obs" rows="2" maxlength="300"></textarea></div>'+
          '<p class="note" style="margin:0">O arquivo fica em Documentos, na pasta Trilha do trainee.</p>'),
        rodape:'<div class="btns"><button type="button" class="btn" id="tn-env">Enviar</button><span class="msg" id="tn-msg" role="status"></span></div>'};},
    foco:'#tn-arq',depois:function(dr){dr.querySelector('#tn-env').addEventListener('click',function(){enviar(eid,dr,this);});}});}
function enviar(eid,dr,b){var m=dr.querySelector('#tn-msg'),x=window.__trilhaEtapa(eid),uid=window.__euId;if(!db||!uid||!x){m.textContent='Sem conexão com a base.';return;}
  var nome=dr.querySelector('#tn-nome').value.trim(),file=dr.querySelector('#tn-arq').files[0],link=dr.querySelector('#tn-link').value.trim(),obs=dr.querySelector('#tn-obs').value.trim();
  if(!nome){m.textContent='Dê um nome à entrega.';return;}if(!file&&!link){m.textContent='Escolha um arquivo ou cole um link.';return;}
  if(!file&&!safeUrl(link)){m.textContent='O link precisa começar com https://';return;}if(file&&file.size>10*1024*1024){m.textContent='Arquivo maior que 10 MB: use um link do Drive.';return;}
  var agora=new Date().toISOString(),ext=file?(file.name.split('.').pop()||'').toLowerCase():'',TY={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  var d={nome:(nome+' · '+String(window.__meuNome||'')).slice(0,120),tipo:file?(ext==='pdf'?'PDF':'Imagem'):(/(docs|drive)\.google\.com/.test(link)?'Drive':'Site'),versao:'',resp:String(window.__meuNome||'').slice(0,80),
    resumo:'Entrega da etapa '+x.nome+' (Trilha do trainee)',eventos:[],trilha:uid,area:'C&D',criadoEm:agora,link:file?'':link,arquivo:''};
  b.disabled=true;m.textContent=file?'Enviando o arquivo…':'Salvando…';
  (file?window.claude.use('assets').then(function(api){if(!api)throw {code:'sem'};return api.upload(file,{type:TY[ext]||file.type});}).then(function(r){d.arquivo='/_blob/'+r.id;d.assetId=r.id;}):Promise.resolve())
    .then(function(){d.url=dPrincipal(d.tipo,d.link,d.arquivo);return db.collection('documentos').add(d);})
    .then(function(r){var en={etapa:eid,uid:uid,nome:nome.slice(0,120),link:d.url||'',docId:r&&r.id||'',obs:obs.slice(0,300),em:agora};entregas[eid+'_'+uid]=en;return db.doc('cd_entregas/'+eid+'_'+uid).set(en);})
    .then(function(){painelFechar();render();$('cd-trilha-ok').textContent='Entrega enviada. O C&D vai avaliar.';},
      function(err){b.disabled=false;m.textContent=err&&err.code==='quota_exceeded'?'Espaço de arquivos cheio: use um link do Drive.':err&&err.code==='unsupported_type'?'Tipo de arquivo não aceito: use PDF ou imagem.':err&&err.code==='sem'?'Seu acesso não permite enviar arquivos: use um link.':'Não foi possível enviar a entrega.';});}

/* ---------------- cliques e dados ---------------- */
function clique(e){if(e.target.closest('a'))return;if(!(e.type==='click'||e.key==='Enter'||e.key===' '))return;
  var b=e.target.closest('[data-trenv]');if(b&&e.type==='click'){abrirEntrega(b.dataset.trenv);return;}
  var t=e.target.closest('[data-tropen]'),x=e.target.closest('[data-tretapa]');if(!t&&!x)return;if(e.type==='keydown')e.preventDefault();
  if(t){var pr=t.dataset.tropen.split('|');abrirTrainee(pr[0],pr.slice(1).join('|'));}else abrirEtapa(x.dataset.tretapa);}
sec.addEventListener('click',clique);sec.addEventListener('keydown',clique);
$('tr-nova').addEventListener('click',function(){if(!pode('editar'))return;$('cd-trilha-ok').textContent='';abrirEtapa(null);});
function ligar(){if(lig||!db)return;lig=true;
  function falhou(c){return function(err){console.error(c,err);};}
  db.collection('cd_trilha').onSnapshot(function(s){etapas=s.docs.map(function(x){var o=Object.assign({},x.data());o.id=x.id;return o;});tudo();if(window.__cdMudou)window.__cdMudou();},falhou('cd_trilha'));
  db.collection('cd_trilha_prog').onSnapshot(function(s){var m={};s.docs.forEach(function(x){m[x.id]=x.data();});prog=m;tudo();},falhou('cd_trilha_prog'));
  db.collection('cd_entregas').onSnapshot(function(s){var m={};s.docs.forEach(function(x){m[x.id]=x.data();});entregas=m;tudo();},falhou('cd_entregas'));}
document.addEventListener('permissoes',function(){ligar();tudo();});
document.addEventListener('membros',tudo);
document.addEventListener('tela',function(e){if(e.detail==='cd-trilha'){ligar();render();}});
document.addEventListener('base-pronta',ligar);
var _cm=window.__cdMudou;window.__cdMudou=function(){if(_cm)_cm();tudo();}; /* capacitações e presença mudam a trilha */
render();
})();
