/* ============ BRIEFING E DIVULGAÇÃO (seção 04 da Ficha de Evento Feashion) ============
   Roda dentro do script principal (mesmo escopo de events, guests, db, esc, D, iso, $, painelAbrir, painelAtualizar, adiar...).
   Briefing ao Marketing: botão "Briefing ao Marketing" na linha do evento (Base). Eventos preenche só o que não é automático:
     eventos/{id}.briefing = {mensagem, artes:[...], pasta, obs, enviadoEm, enviadoPor, atualizadoEm, atualizadoPor}
     "Enviar briefing" deixa verde o ponto "Briefing ao Marketing" do checklist (e o robô avisa a diretoria do Marketing).
   Divulgação dos eventos (tela do Marketing): o Marketing recebe o briefing completo (o que Eventos escreveu + data, sala,
     convidados, público, objetivo e link de inscrição, que vêm da ficha) e monta o plano:
     mkt_divulgacao/{eventoId} = {canais:[{id, nome, resp}], posts:[{id, canal, mom:'antes'|'durante'|'depois', oque, data, pub}],
                                  bastidores:{quem, linkedin:'sim'|'nao'|'?'}, feita:{em, por, uid}|null}
     "Divulgação feita" (diretoria do Marketing e acesso total): libera com todos os posts de antes publicados e grava também
     eventos/{id}.etapas.divulgacao, que deixa verde o ponto "Divulgação feita" do checklist.
   Autorização de imagem: das respostas do Forms (inscricoes/{id}.respostas[].imagem), lidas ao abrir o evento. */
(function(){
"use strict";
var ARTES=['Post no feed','Story','Banner','E-mail','Outro'];
var CANAIS=['Instagram','LinkedIn','TikTok','E-mail/grupos'];
var MOM=[['antes','Antes'],['durante','Durante'],['depois','Depois']];
var LKD=[['?','A confirmar'],['sim','Sim'],['nao','Não']];
var PRAZO=10; /* "Divulgação feita" vence 10 dias antes do evento (o mesmo do checklist) */
var div={};          /* mkt_divulgacao por evento */
function P(){return window.__perm&&__perm.carregado()?__perm:null;}
function pode(a,k){var p=P();return !!p&&!!p.podeEm(a)[k];}
function podeFeita(){var p=P();if(!p)return false;var c=p.cargoEm('Marketing');return !!(p.dev()||p.geral()||c==='Diretor(a)'||c==='Coordenador(a)');}
function hoje(){return iso(new Date());}
function ddmm(s){return s?s.slice(8,10)+'/'+s.slice(5,7):'';}
function prim(n){return String(n||'').split(' ')[0];}
function blk(t,h){return '<div class="tp-blk">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function quem(){return {em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80),uid:window.__euId||''};}
function nid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function evDe(id){return events.filter(function(x){return x.id===id;})[0]||null;}
function dataLonga(e){return e.data?D(e.data).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'sem data';}
function somaDias(dt,n){var d=D(dt);d.setDate(d.getDate()+n);return iso(d);}
function membrosDe(a){return (window.__membros||[]).filter(function(m){return !a||(m.areas&&Object.prototype.hasOwnProperty.call(m.areas,a));});}
function nomeMembro(id){var m=(window.__membros||[]).filter(function(x){return x.id===id;})[0];return m?m.nome:'';}
function opsMembros(l,sel,vazio){return '<option value="">'+vazio+'</option>'+l.map(function(m){return '<option value="'+esc(m.id)+'"'+(m.id===sel?' selected':'')+'>'+esc(m.nome)+'</option>';}).join('')+(sel&&!l.some(function(m){return m.id===sel;})?'<option value="'+esc(sel)+'" selected>'+esc(nomeMembro(sel)||'membro')+'</option>':'');}

/* ================= BRIEFING (Eventos, na linha do evento) ================= */
function brOk(e){var b=e.briefing;return !!(b&&b.enviadoEm);}
window.__briefingEnviado=brOk;
var RB={};
function rasc(e){var m0='';if(RB[e.id]&&!RB[e.id].sujo){m0=RB[e.id].msg;delete RB[e.id];}if(!RB[e.id]){var b=e.briefing||{};RB[e.id]={mensagem:b.mensagem||'',artes:(b.artes||[]).slice(),pasta:b.pasta||'',obs:b.obs||'',sujo:false,msg:m0};}return RB[e.id];}
function convidadosTxt(e){var ids=e.convidadoIds&&e.convidadoIds.length?e.convidadoIds:e.convidadoId?[e.convidadoId]:[];
  var l=ids.map(function(i){var g=guests.filter(function(x){return x.id===i;})[0];return g?g.nome+([g.cargo,g.empresa].filter(Boolean).length?' ('+[g.cargo,g.empresa].filter(Boolean).join(', ')+')':''):'';}).filter(Boolean);
  if(!l.length&&e.convidado)l=[e.convidado];return l.length?l.join('; '):(e.ficha&&e.ficha.semConvidado?'sem convidado':'a definir');}
function linkInsc(e){var u=e.inscricao&&e.inscricao.url||e.ficha&&e.ficha.linkExterno||'';return safeUrl(u);}
/* o que vem sozinho da ficha */
function automaticos(e){var f=e.ficha||{},u=linkInsc(e);
  return [['Quando',dataLonga(e)+(e.hora?', às '+esc(e.hora):'')],['Onde',esc(e.sala||'a definir')],['Convidados',esc(convidadosTxt(e))],
    ['Público-alvo',esc((f.publico||[]).join(', ')||'a definir')],['Objetivo',esc(f.objetivo||'a definir')],
    ['Inscrição',u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(u.replace(/^https:\/\//,''))+' ↗</a>':'ainda sem link'],['Responsável',esc(e.responsavel||'—')]];}
function tabela(l){return '<dl class="br-dl">'+l.map(function(r){return '<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>';}).join('')+'</dl>';}
function manuais(e){var b=e.briefing||{},p=safeUrl(b.pasta);
  return [['Mensagem principal',esc(b.mensagem||'—').replace(/\n/g,'<br>')],['Precisa de arte',esc((b.artes||[]).join(', ')||'—')],
    ['Pasta de materiais',p?'<a href="'+esc(p)+'" target="_blank" rel="noopener">Abrir ↗</a>':'—'],['Observações',esc(b.obs||'—').replace(/\n/g,'<br>')]];}
/* ficha completa do briefing (o que o Marketing recebe) */
function briefCompleto(e){if(!brOk(e))return '<p class="note" style="margin:0">A área de Eventos ainda não enviou o briefing deste evento. O prazo é '+ddmm(e.data?somaDias(e.data,-30):'')+' (30 dias antes).</p>';
  var b=e.briefing,at=b.atualizadoEm&&b.atualizadoEm>b.enviadoEm?'<p class="chip warn br-at">Briefing atualizado em '+ddmm(b.atualizadoEm)+(b.atualizadoPor?' por '+esc(prim(b.atualizadoPor)):'')+'</p>':'';
  return at+'<p class="note" style="margin:0 0 8px">Enviado em '+ddmm(b.enviadoEm)+(b.enviadoPor?' por '+esc(b.enviadoPor):'')+'.</p>'+tabela(manuais(e))+'<h5 class="br-h5">Da ficha do evento</h5>'+tabela(automaticos(e));}
function montarBrief(id){var e=evDe(id);if(!e)return null;var ed=pode('Eventos','editar')&&e.status!=='realizado',b=e.briefing||{},r=rasc(e);
  var sub=dataLonga(e)+(e.sala?' · '+esc(e.sala):'')+' '+(brOk(e)?'<span class="chip ok">Enviado em '+ddmm(b.enviadoEm)+'</span>':'<span class="chip warn">Não enviado</span>');
  if(!ed)return {titulo:'Briefing · '+(e.nome||'Evento'),sub:sub,corpo:blk('',briefCompleto(e))};
  var c='<p class="note" style="margin:0 0 10px">Preencha só o que é do briefing. O Marketing recebe junto, sem precisar escrever de novo: data e horário, sala, convidados, público-alvo, objetivo, link de inscrição e responsável, tudo da ficha do evento.</p>'+
    '<div class="field"><label for="br-msg">Mensagem principal <span class="rq">obrigatório</span></label><textarea id="br-msg" data-br="mensagem" rows="3" maxlength="600" placeholder="O que queremos comunicar com este evento?">'+esc(r.mensagem)+'</textarea></div>'+
    '<div class="field"><label>O que precisa de arte</label><div class="br-artes">'+ARTES.map(function(a){return '<label class="check"><input type="checkbox" data-br-arte="'+esc(a)+'"'+(r.artes.indexOf(a)>=0?' checked':'')+'>'+a+'</label>';}).join('')+'</div></div>'+
    '<div class="field"><label for="br-pasta">Pasta de materiais <span class="rq opt">opcional · fotos do convidado, logos</span></label><input id="br-pasta" data-br="pasta" type="url" placeholder="https://drive.google.com/..." value="'+esc(r.pasta)+'"></div>'+
    '<div class="field"><label for="br-obs">Observações <span class="rq opt">opcional</span></label><textarea id="br-obs" data-br="obs" rows="2" maxlength="600">'+esc(r.obs)+'</textarea></div>';
  var rod='<div class="btns"><button type="button" class="btn" id="br-enviar"'+(r.sujo||!brOk(e)?'':' disabled')+'>'+(brOk(e)?'Atualizar briefing':'Enviar briefing')+'</button><span class="msg" id="br-m" role="status">'+esc(r.msg||(r.sujo?'Alterações não enviadas.':brOk(e)?'Enviado em '+ddmm(b.enviadoEm)+(b.enviadoPor?' por '+prim(b.enviadoPor):'')+'.':''))+'</span></div>';
  return {titulo:'Briefing · '+(e.nome||'Evento'),sub:sub,corpo:blk('Briefing ao Marketing',c),rodape:rod};}
function redesenhaBr(){var a=document.activeElement;if(a&&a.blur&&a.closest&&a.closest('#view-base .tpanel'))a.blur();painelAtualizar('view-base');}
function enviarBrief(id){var e=evDe(id);if(!e||!db)return;var r=rasc(e),q=quem(),b=e.briefing||{};
  if(!r.mensagem.trim()){r.msg='Escreva a mensagem principal.';redesenhaBr();return;}
  if(r.pasta.trim()&&!safeUrl(r.pasta.trim())){r.msg='O link da pasta precisa começar com https://';redesenhaBr();return;}
  var nb={mensagem:r.mensagem.trim().slice(0,600),artes:r.artes.slice(),pasta:r.pasta.trim(),obs:r.obs.trim().slice(0,600),
    enviadoEm:b.enviadoEm||q.em,enviadoPor:b.enviadoPor||q.por,atualizadoEm:b.enviadoEm?q.em:null,atualizadoPor:b.enviadoEm?q.por:null};
  r.msg='Enviando…';redesenhaBr();
  db.doc('eventos/'+id).update({briefing:nb}).then(function(){r.sujo=false;r.msg=b.enviadoEm?'Briefing atualizado: o Marketing vê o aviso.':'Briefing enviado ao Marketing.';redesenhaBr();})
    .catch(function(){r.msg='Não foi possível enviar o briefing.';redesenhaBr();});}
var brLig=false;
window.__abrirBrief=function(id){if(!$('view-base')||$('view-base').hidden){var b=document.querySelector('.side .sitem[data-alvo="base"]');if(b)b.click();}
  painelAbrir({sec:'view-base',chave:'brief:'+id,montar:function(){return montarBrief(id);},foco:'#br-msg',depois:function(dr){dr._brId=id;if(dr._brLig)return;dr._brLig=1;
    function mexeu(){var r=RB[dr._brId];if(!r)return;r.sujo=true;r.msg='';var s=dr.querySelector('#br-enviar');if(s)s.disabled=false;var m=dr.querySelector('#br-m');if(m)m.textContent='Alterações não enviadas.';}
    dr.addEventListener('input',function(ev){var t=ev.target,r=RB[dr._brId];if(!r||!t.dataset||!t.dataset.br)return;r[t.dataset.br]=t.value;mexeu();});
    dr.addEventListener('change',function(ev){var t=ev.target,r=RB[dr._brId];if(!r||!t.dataset||t.dataset.brArte==null)return;var a=t.dataset.brArte;r.artes=r.artes.filter(function(x){return x!==a;});if(t.checked)r.artes.push(a);r.artes.sort(function(x,y){return ARTES.indexOf(x)-ARTES.indexOf(y);});mexeu();});
    dr.addEventListener('click',function(ev){if(ev.target.closest('#br-enviar')&&dr._brId&&RB[dr._brId])enviarBrief(dr._brId);});}});};

/* ================= DIVULGAÇÃO DOS EVENTOS (tela do Marketing) ================= */
function planoDe(id){var d=div[id];if(d)return d;return {canais:CANAIS.map(function(n,i){return {id:'c'+i,nome:n,resp:''};}),posts:[],bastidores:{quem:'',linkedin:'?'},feita:null,_novo:true};}
function feitaDe(id){var d=div[id];return d&&d.feita&&d.feita.em?d.feita:null;}
function antes(d){return (d.posts||[]).filter(function(p){return p.mom==='antes';});}
function situDiv(e){var d=div[e.id];if(feitaDe(e.id))return ['Divulgação feita','ok'];if(!brOk(e))return ['Sem briefing','warn'];
  if(!d||!(d.posts||[]).length)return ['Briefing recebido','neutral'];var a=antes(d),n=a.filter(function(p){return p.pub;}).length;return [n+' de '+a.length+' posts de antes publicados','neutral'];}
function salvarPlano(id,d){var o=JSON.parse(JSON.stringify(d));delete o._novo;delete o.id;o.nome=(evDe(id)||{}).nome||'';o.em=new Date().toISOString();
  div[id]=Object.assign({},o);return db.doc('mkt_divulgacao/'+id).set(o).catch(function(){alertMsg('Não foi possível salvar a divulgação.');});}
var AUT={};
function carregarAut(id){if(AUT[id]||!db)return;AUT[id]={carregando:true};
  db.doc('inscricoes/'+id).get().then(function(s){var r=s.exists?(s.data().respostas||[]):[];AUT[id]={l:r};painelAtualizar('view-mkt-div');},function(){AUT[id]={erro:true};painelAtualizar('view-mkt-div');});}
function autBlk(e){var a=AUT[e.id];if(!(e.inscricao&&e.inscricao.formId))return '<p class="note" style="margin:0">Este evento não tem o Forms do app, então a autorização de imagem não chega aqui.</p>';
  if(!a||a.carregando)return '<p class="note" style="margin:0">Carregando as respostas…</p>';if(a.erro)return '<p class="note" style="margin:0">Não foi possível ler as respostas.</p>';
  var sim=a.l.filter(function(r){return r.imagem===true;}),nao=a.l.filter(function(r){return r.imagem===false;}),sr=a.l.length-sim.length-nao.length;
  if(!a.l.length)return '<p class="note" style="margin:0">Ninguém se inscreveu ainda.</p>';
  return '<div class="br-aut"><span class="chip ok">'+sim.length+' autorizaram</span><span class="chip '+(nao.length?'bad':'neutral')+'">'+nao.length+' não autorizaram</span>'+(sr?'<span class="chip neutral">'+sr+' sem resposta</span>':'')+'</div>'+
    (nao.length?'<p class="note" style="margin:8px 0 4px">Cuidado nas fotos com:</p><ul class="br-nao">'+nao.map(function(r){return '<li>'+esc(r.nome||r.email||'sem nome')+'</li>';}).join('')+'</ul>':'');}
function planoBlk(e,ed){var d=planoDe(e.id),mk=membrosDe('Marketing');
  return d.canais.map(function(c){var ps=d.posts.filter(function(p){return p.canal===c.id;}).sort(function(a,b){var o=['antes','durante','depois'];return o.indexOf(a.mom)-o.indexOf(b.mom)||String(a.data||'').localeCompare(String(b.data||''));});
    var cab=ed?'<div class="dv-cab"><input class="dv-nome" data-dc="'+esc(c.id)+'" data-df="nome" value="'+esc(c.nome)+'" maxlength="40" aria-label="Canal"><label class="dv-resp"><span>Responsável</span><select data-dc="'+esc(c.id)+'" data-df="resp">'+opsMembros(mk,c.resp,'— escolher —')+'</select></label><button type="button" class="cf-x" data-dcx="'+esc(c.id)+'" aria-label="Tirar o canal '+esc(c.nome)+'" title="Tirar canal">&times;</button></div>'
      :'<div class="dv-cab"><b>'+esc(c.nome)+'</b><span class="note">'+(c.resp?'resp. '+esc(nomeMembro(c.resp)||'—'):'sem responsável')+'</span></div>';
    var lis=ps.map(function(p){var a='data-dp="'+esc(p.id)+'" data-df=';
      return ed?'<li class="dv-p'+(p.pub?' pub':'')+'"><select '+a+'"mom" aria-label="Quando">'+MOM.map(function(m){return '<option value="'+m[0]+'"'+(m[0]===p.mom?' selected':'')+'>'+m[1]+'</option>';}).join('')+'</select>'+
        '<input '+a+'"oque" maxlength="100" placeholder="O que vai ser postado (ex.: post de anúncio)" value="'+esc(p.oque||'')+'" aria-label="O que sai">'+
        '<input '+a+'"data" type="date" value="'+esc(p.data||'')+'" aria-label="Data prevista">'+
        '<label class="check dv-pub"><input type="checkbox" '+a+'"pub"'+(p.pub?' checked':'')+'>Publicado</label>'+
        '<button type="button" class="cf-x" data-dpx="'+esc(p.id)+'" aria-label="Tirar o post" title="Tirar post">&times;</button></li>'
        :'<li class="dv-p'+(p.pub?' pub':'')+'"><span class="chip neutral">'+(MOM.filter(function(m){return m[0]===p.mom;})[0]||['',''])[1]+'</span><span>'+esc(p.oque||'—')+'</span><span class="note">'+(p.data?ddmm(p.data):'')+'</span><span class="chip '+(p.pub?'ok':'warn')+'">'+(p.pub?'Publicado':'A publicar')+'</span></li>';}).join('');
    return '<div class="dv-canal">'+cab+(lis?'<ul class="dv-l">'+lis+'</ul>':'<p class="note" style="margin:4px 0 0">Nada planejado neste canal.</p>')+(ed?'<button type="button" class="btn small ghost" data-dpadd="'+esc(c.id)+'">+ Post</button>':'')+'</div>';}).join('')+
    (ed?'<button type="button" class="btn small ghost" data-dcadd>+ Adicionar canal</button>':'');}
function bastBlk(e,ed){var b=planoDe(e.id).bastidores||{};
  return ed?'<div class="fin-grid"><div class="field"><label for="dv-quem">Quem grava os bastidores</label><select id="dv-quem" data-db="quem">'+opsMembros(membrosDe(''),b.quem,'— escolher —')+'</select></div>'+
    '<div class="field"><label for="dv-lk">O convidado vai postar no LinkedIn?</label><select id="dv-lk" data-db="linkedin">'+LKD.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===(b.linkedin||'?')?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div></div>'
    :tabela([['Quem grava',esc(nomeMembro(b.quem)||'a definir')],['Convidado posta no LinkedIn',(LKD.filter(function(x){return x[0]===(b.linkedin||'?');})[0]||LKD[0])[1]]]);}
var DM={};
function rodDiv(e){var d=planoDe(e.id),f=feitaDe(e.id),a=antes(d),falta=!a.length||a.some(function(p){return !p.pub;});
  if(!podeFeita())return f?'<p class="note" style="margin:0">Divulgação feita, marcada por '+esc(prim(f.por))+' em '+ddmm(f.em)+'.</p>':'';
  var bt=f?'<button type="button" class="btn ghost" id="dv-desf">Desfazer “Divulgação feita”</button>':'<button type="button" class="btn" id="dv-feita"'+(falta?' disabled':'')+'>Divulgação feita</button>';
  var dica=DM[e.id]||(f?'Marcada por '+prim(f.por)+' em '+ddmm(f.em)+'.':!brOk(e)?'Aguardando o briefing de Eventos.':!a.length?'Planeje ao menos um post de antes do evento.':falta?'Libera quando todos os posts de antes estiverem publicados.':'');
  return '<div class="btns">'+bt+'<span class="msg" id="dv-m" role="status">'+esc(dica)+'</span></div>';}
function montarDiv(id){var e=evDe(id);if(!e)return null;carregarAut(id);var ed=pode('Marketing','editar')&&!feitaDe(id),s=situDiv(e);
  var sub=dataLonga(e)+(e.sala?' · '+esc(e.sala):'')+' <span class="chip '+s[1]+'">'+esc(s[0])+'</span>';
  var corpo=blk('Briefing',briefCompleto(e))+blk('Plano de divulgação',(pode('Marketing','editar')&&feitaDe(id)?'<p class="note" style="margin:0 0 8px">Com a divulgação feita, o plano fica fechado. Para mudar, a diretoria desfaz o “Divulgação feita”.</p>':'')+planoBlk(e,ed))+blk('Bastidores',bastBlk(e,ed))+blk('Autorização de imagem',autBlk(e));
  return {titulo:e.nome||'Evento',sub:sub,corpo:corpo,rodape:rodDiv(e)};}
function marcarFeita(id,on){var q=quem(),d=planoDe(id);DM[id]='Salvando…';painelAtualizar('view-mkt-div');
  d.feita=on?{em:q.em,por:q.por,uid:q.uid}:null;
  Promise.all([salvarPlano(id,d),db.doc('eventos/'+id).update({'etapas.divulgacao':on?{s:'ok',em:q.em,por:q.por,uid:q.uid}:null})])
    .then(function(){DM[id]=on?'Divulgação feita: o ponto do checklist ficou verde.':'Desfeito.';painelAtualizar('view-mkt-div');})
    .catch(function(){DM[id]='Não foi possível salvar. Confira se seu cargo permite.';painelAtualizar('view-mkt-div');});}
var aberto=null;
function forcar(dr){var a=document.activeElement;if(a&&a.blur&&dr.contains(a))a.blur();painelAtualizar('view-mkt-div');}
function abrirDiv(id){aberto=id;delete DM[id];
  painelAbrir({sec:'view-mkt-div',chave:id,montar:function(){return montarDiv(id);},aoFechar:function(){aberto=null;},depois:function(dr){dr._dvId=id;if(dr._dvLig)return;dr._dvLig=1;
    function cur(){var i=dr._dvId;return i&&!feitaDe(i)&&pode('Marketing','editar')?{id:i,d:JSON.parse(JSON.stringify(planoDe(i)))}:null;}
    dr.addEventListener('change',function(ev){var t=ev.target,c=cur();if(!c||!t.dataset)return;
      if(t.dataset.dc){var k=c.d.canais.filter(function(x){return x.id===t.dataset.dc;})[0];if(k)k[t.dataset.df]=t.dataset.df==='nome'?(t.value.trim().slice(0,40)||k.nome):t.value;}
      else if(t.dataset.dp){var p=c.d.posts.filter(function(x){return x.id===t.dataset.dp;})[0];if(!p)return;p[t.dataset.df]=t.type==='checkbox'?t.checked:t.value.slice(0,100);if(t.type==='checkbox'){var li=t.closest('.dv-p');if(li)li.classList.toggle('pub',t.checked);}}
      else if(t.dataset.db){c.d.bastidores=c.d.bastidores||{};c.d.bastidores[t.dataset.db]=t.value;}
      else return;
      delete DM[c.id];salvarPlano(c.id,c.d).then(function(){if(t.dataset.df==='pub'||t.dataset.df==='mom')forcar(dr);});});
    dr.addEventListener('click',function(ev){var b=ev.target.closest('[data-dpadd],[data-dpx],[data-dcadd],[data-dcx],#dv-feita,#dv-desf');if(!b)return;var i=dr._dvId;
      if(b.id==='dv-feita'){marcarFeita(i,true);return;}if(b.id==='dv-desf'){marcarFeita(i,false);return;}
      var c=cur();if(!c)return;
      if(b.dataset.dpadd){c.d.posts.push({id:nid(),canal:b.dataset.dpadd,mom:'antes',oque:'',data:'',pub:false});}
      else if(b.dataset.dpx){c.d.posts=c.d.posts.filter(function(x){return x.id!==b.dataset.dpx;});}
      else if(b.hasAttribute('data-dcadd')){c.d.canais.push({id:nid(),nome:'Outro canal',resp:''});}
      else if(b.dataset.dcx){if(!b.dataset.sure&&c.d.posts.some(function(x){return x.canal===b.dataset.dcx;})){b.dataset.sure='1';b.textContent='Tirar?';setTimeout(function(){delete b.dataset.sure;b.innerHTML='&times;';},4000);return;}
        c.d.canais=c.d.canais.filter(function(x){return x.id!==b.dataset.dcx;});c.d.posts=c.d.posts.filter(function(x){return x.canal!==b.dataset.dcx;});}
      salvarPlano(c.id,c.d);forcar(dr);
      if(b.dataset.dpadd){var l=dr.querySelectorAll('[data-dp][data-df="oque"]');for(var k=0;k<l.length;k++)if(!l[k].value){l[k].focus();break;}}});}});}
window.__abrirDiv=function(id){if(window.__irArea)__irArea('Marketing','mkt-div');setTimeout(function(){abrirDiv(id);},60);};

/* lista: próximos eventos, com a situação do briefing e da divulgação */
var sec=document.createElement('section');sec.id='view-mkt-div';sec.hidden=true;sec.setAttribute('aria-labelledby','mkt-div-title');
sec.innerHTML='<div class="section-head"><div><h2 id="mkt-div-title">Divulgação dos eventos</h2><p class="note">O briefing que Eventos envia, o plano de divulgação por canal, os bastidores e a autorização de imagem de cada evento. O prazo da divulgação é '+PRAZO+' dias antes do evento.</p></div></div>'+
  '<div class="sbar"><input type="search" id="dv-busca" placeholder="Buscar evento" aria-label="Buscar evento"><label class="check"><input type="checkbox" id="dv-pass"> Mostrar eventos passados</label><span class="note" id="dv-conta" aria-live="polite"></span></div><div class="tablewrap"><table id="dv-tab" class="tlist"></table></div>';
document.querySelector('main').appendChild(sec);
function nrm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function renderDiv(){var t=hoje(),q=nrm($('dv-busca').value).trim(),ps=$('dv-pass').checked;
  var l=events.filter(function(e){if(/\[teste\]/i.test(e.nome||'')&&$('b-teste')&&!$('b-teste').checked)return false;if(!ps&&(!e.data||e.data<t||e.status==='realizado'))return false;return !q||nrm(e.nome).indexOf(q)>=0;})
    .sort(function(a,b){return ps?((a.data||'')<(b.data||'')?1:-1):((a.data||'9')<(b.data||'9')?-1:1);});
  $('dv-conta').textContent=l.length+(l.length===1?' evento':' eventos');
  var h='<thead><tr><th>Data</th><th>Evento</th><th>Briefing</th><th>Divulgação</th><th>Prazo</th></tr></thead><tbody>';
  if(!l.length)h+='<tr><td colspan="5" class="empty">'+(ps?'Nenhum evento.':'Nenhum evento pela frente. Marque “Mostrar eventos passados” para ver os anteriores.')+'</td></tr>';
  l.forEach(function(e){var s=situDiv(e),pz=e.data?somaDias(e.data,-PRAZO):'',atr=pz&&pz<t&&!feitaDe(e.id)&&e.status!=='realizado',b=e.briefing;
    h+='<tr data-dvopen="'+esc(e.id)+'" tabindex="0"><td class="num"><b>'+(e.data?ddmm(e.data)+'/'+e.data.slice(2,4):'—')+'</b></td><td><span class="tn">'+esc(e.nome||'Sem nome')+'</span><span class="tsub">'+esc([e.tipo,e.sala].filter(Boolean).join(' · '))+'</span></td>'+
      '<td>'+(brOk(e)?'<span class="chip ok">Recebido '+ddmm(b.enviadoEm)+'</span>'+(b.atualizadoEm&&b.atualizadoEm>b.enviadoEm?' <span class="chip warn">atualizado '+ddmm(b.atualizadoEm)+'</span>':''):'<span class="chip warn">Ainda não</span>')+'</td>'+
      '<td><span class="chip '+s[1]+'">'+esc(s[0])+'</span></td><td class="num'+(atr?' dv-atr':'')+'">'+(pz?ddmm(pz)+(atr?' · atrasado':''):'—')+'</td></tr>';});
  $('dv-tab').innerHTML=h+'</tbody>';}
$('dv-busca').addEventListener('input',renderDiv);$('dv-pass').addEventListener('change',renderDiv);
function cliqueDv(ev){var tr=ev.target.closest('[data-dvopen]');if(tr&&(ev.type==='click'||ev.key==='Enter'||ev.key===' ')){if(ev.type==='keydown')ev.preventDefault();abrirDiv(tr.dataset.dvopen);}}
$('dv-tab').addEventListener('click',cliqueDv);$('dv-tab').addEventListener('keydown',cliqueDv);
function tudo(){adiar('view-mkt-div',renderDiv);painelAtualizar('view-mkt-div');}
var _rb=renderBase;renderBase=function(){_rb.apply(this,arguments);tudo();};
var lig=false;
function ligar(){if(lig||!db)return;lig=true;db.collection('mkt_divulgacao').onSnapshot(function(s){var m={};s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;m[x.id]=o;});div=m;tudo();},function(){});}
document.addEventListener('permissoes',function(){ligar();tudo();});
document.addEventListener('membros',function(){painelAtualizar('view-mkt-div');});
/* link do e-mail do robô: #divulgacao=ID */
(function(){var m=/^#divulgacao=(.+)$/.exec(location.hash||'');if(!m)return;var id=decodeURIComponent(m[1]),n=0;
  (function tenta(){var p=P();if(p&&evDe(id)){if(p.podeEm('Marketing').ver)window.__abrirDiv(id);return;}if(++n<60)setTimeout(tenta,500);})();})();
renderDiv();
})();
