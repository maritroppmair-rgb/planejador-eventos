/* ============ ETAPAS DO EVENTO, CHECKLIST E PENDÊNCIAS (seções 06 e 08 da Ficha de Evento Feashion) ============
   eventos/{id}.etapas[chave] = {em, por, uid}   (chave: ficha, aprovacao, orcamento, divulgacao, aex, pos)
   eventos/{id}.responsavelAex = {uid, nome}     (quem envia os dados à AEX; escolhido em cada evento)
   eventos/{id}.checklist[chave] = {s:'andamento'|'ok', em, por}   (itens marcados à mão; os automáticos não gravam nada)
   Quem marca cada etapa (igual às regras do Firestore):
     Ficha: sozinha, quando a ficha fica completa · Aprovação: Presidente, Vice-presidente e DEV (eventos futuros, ficha completa)
     Orçamento: diretoria do Financeiro · Divulgação: diretoria do Marketing · Dados AEX: o responsável AEX ou Eventos
     Pós-evento: Eventos (depois da data). O acesso geral (Diretor(a) de Eventos, presidência, DEV) marca tudo, menos a Aprovação.
   As contas de prazo e de "etapa da vez" ficam no telas.js (window.__etapasDe), as mesmas da caixinha Andamento. */
(function(){
"use strict";
var EDITA=['Diretor(a)','Coordenador(a)','Membro(a)','Trainee'];
function P(){return window.__perm&&__perm.carregado()?__perm:null;}
function dirDe(a){var p=P(),c=p&&p.cargoEm(a);return c==='Diretor(a)'||c==='Coordenador(a)';}
function pres(){var p=P();return !!p&&(p.dev()||!!p.presidencia());}
function geral(){var p=P();return !!p&&p.geral();}
function evEd(){var p=P();return !!p&&!!p.podeEm('Eventos').editar;}
function evCargo(){var p=P();return !!p&&EDITA.indexOf(p.cargoEm('Eventos'))>=0;}
function hoje(){return iso(new Date());}
function evDe(id){return events.filter(function(x){return x.id===id;})[0];}
function ddmm(x){return x?x.slice(8,10)+'/'+x.slice(5,7):'—';}
function primeiro(n){return String(n||'').split(' ')[0];}
function dn(e){return e.status==='realizado';}

/* ----- quem marca, quem é "dono" e quando dá para marcar ----- */
function podeMarcar(k,e){
  if(k==='aprovacao')return pres();
  if(k==='orcamento')return geral()||dirDe('Financeiro');
  if(k==='divulgacao')return geral()||dirDe('Marketing');
  if(k==='aex')return evEd()||!!(e.responsavelAex&&e.responsavelAex.uid&&e.responsavelAex.uid===window.__euId);
  if(k==='pos')return evEd();
  return false;}
function minha(k,e){
  if(k==='aprovacao')return pres();
  if(k==='orcamento')return dirDe('Financeiro');
  if(k==='divulgacao')return dirDe('Marketing');
  if(k==='aex')return e.responsavelAex&&e.responsavelAex.uid?e.responsavelAex.uid===window.__euId:evCargo();
  return evCargo();}
function bloqueio(k,e){
  if(k==='aprovacao'){if(!(window.__fichaCompleta&&__fichaCompleta(e)))return 'Fica disponível quando a ficha estiver completa e salva.';
    if(dn(e)||!e.data||e.data<hoje())return 'Só dá para aprovar eventos que ainda vão acontecer.';}
  if(k==='pos'&&(!e.data||e.data>hoje()))return 'Fica disponível a partir do dia do evento.';
  return '';}
var FAZER={ficha:'Completar a ficha',aprovacao:'Aprovar a ficha',orcamento:'Validar o orçamento',divulgacao:'Planejar a divulgação',aex:'Enviar os dados à AEX',pos:'Fechar o pós-evento'};

/* ----- checklist da seção 06: 30, 7 e 3 dias antes ----- */
var CK=[
  [30,'aprov','Ficha aprovada pela Presidência',function(e){return et(e,'aprovacao');}],
  [30,'conv','Convidado confirmado por escrito',function(e){var g=convs(e);if(!g)return null;return g.length&&g.every(function(x){return x.status==='Confirmado'||x.status==='Palestrou';});}],
  [30,'sala','Sala reservada',function(e){var f=e.ficha||{};return f.salaReservada==='sim'&&!!String(f.reservaNum||'').trim();}],
  [30,'orc','Orçamento validado',function(e){return et(e,'orcamento');}],
  [30,'brief','Briefing ao Marketing'],
  [7,'divulg','Divulgação feita'],
  [7,'forn','Fornecedores confirmados'],
  [7,'aexform','Formulário da AEX pronto'],
  [7,'funcoes','Funções do dia definidas'],
  [3,'reconf','Reconfirmar convidado e sala'],
  [3,'lembrete','Lembrete aos inscritos',function(e){var i=e.inscricao;if(!i||!i.formId)return null;var x=(i.emails||{}).lembrete;return !!(x&&x.enviados>0);}],
  [3,'roteiro','Roteiro enviado à equipe'],
  [3,'planob','Plano B revisado']];
function et(e,k){return !!(e.etapas&&e.etapas[k]&&e.etapas[k].em);}
/* convidados do evento (null = evento sem convidado: o item vira manual) */
function convs(e){var ids=e.convidadoIds&&e.convidadoIds.length?e.convidadoIds:e.convidadoId?[e.convidadoId]:[];
  if(!ids.length)return e.ficha&&e.ficha.semConvidado?null:[];
  return ids.map(function(i){return guests.filter(function(g){return g.id===i;})[0];}).filter(Boolean);}
/* estado de um item: {s:''|'andamento'|'ok', auto, prazo, atrasado} */
function ckEstado(e,c){var auto=c[3]?c[3](e):null,m=(e.checklist||{})[c[1]]||{},s;
  if(auto!=null)s=auto?'ok':'';else s=m.s==='ok'||m.s==='andamento'?m.s:'';
  var prazo=e.data?somaDias(e.data,-c[0]):null;
  return {s:s,auto:auto!=null,prazo:prazo,atrasado:s!=='ok'&&!dn(e)&&!!prazo&&prazo<hoje(),em:auto!=null?'':m.em,por:auto!=null?'':m.por};}
function somaDias(dt,n){var d=D(dt);d.setDate(d.getDate()+n);return iso(d);}
var CKNOME={'':'Não iniciada',andamento:'Em andamento',ok:'Concluída'};

/* ----- gravar ----- */
function quem(){return {em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80),uid:window.__euId||''};}
function falhou(){alertMsg('Não foi possível salvar. Confira se seu cargo permite.');}
function marcar(eid,k,on){if(!db)return;var up={};up['etapas.'+k]=on?quem():null;db.doc('eventos/'+eid).update(up).catch(falhou);}
function marcarCk(eid,k,s){if(!db)return;var up={},q=quem();up['checklist.'+k]=s?{s:s,em:q.em,por:q.por}:null;db.doc('eventos/'+eid).update(up).catch(falhou);}
function definirAex(eid,uid){if(!db)return;var m=(window.__membros||[]).filter(function(x){return x.id===uid;})[0];
  db.doc('eventos/'+eid).update({responsavelAex:m?{uid:m.id,nome:m.nome}:null}).catch(falhou);}

/* ----- blocos da ficha (painel do evento) ----- */
function linhaEtapa(e,x,cur){var c=x.feita?'ok':x===cur?(x.atrasada?'atr':'vez'):'',id=esc(e.id),acao='',nota='';
  var det='prazo '+x.ptxt+(x.feita?(x.em?' · concluída '+ddmm(x.em.slice(0,10))+(x.por?' por '+esc(primeiro(x.por)):''):' · completa'):x===cur&&x.prazo?' · '+window.__faltaTxt(x.prazo):'');
  var pm=podeMarcar(x.k,e),bl=bloqueio(x.k,e);
  if(x.k==='ficha')nota='Marca sozinha quando a ficha fica completa.';
  else if(x.k==='aprovacao'){
    if(pm)acao='<label class="check et-ck"><input type="checkbox" data-et="aprovacao" data-eid="'+id+'"'+(x.feita?' checked':'')+(bl?' disabled':'')+'>Aprovo esta ficha</label>';
    nota=bl&&pm?bl:x.feita?'':'Aguardando a Presidência.';}
  else{
    if(pm)acao=x.feita?'<button type="button" class="btn small ghost" data-et-off="'+x.k+'" data-eid="'+id+'">Desfazer</button>':'<button type="button" class="btn small ghost" data-et-on="'+x.k+'" data-eid="'+id+'"'+(bl?' disabled':'')+'>Marcar como feita</button>';
    if(bl&&!x.feita)nota=bl;}
  if(x.k==='aex'){var ra=e.responsavelAex;
    nota=(evEd()?'<label class="et-aex"><span>Responsável AEX</span><select data-et-aex="'+id+'"><option value="">— escolher —</option>'+(window.__membros||[]).map(function(m){return '<option value="'+esc(m.id)+'"'+(ra&&ra.uid===m.id?' selected':'')+'>'+esc(m.nome)+'</option>';}).join('')+(ra&&!(window.__membros||[]).some(function(m){return m.id===ra.uid;})?'<option value="'+esc(ra.uid)+'" selected>'+esc(ra.nome||'?')+'</option>':'')+'</select></label>'
      :'<span>Responsável AEX: <b>'+esc(ra&&ra.nome||'a definir')+'</b></span>')+(nota?' '+nota:'');}
  return '<li class="et-row'+(c?' et-'+c:'')+'"><span class="and-k '+c+'"></span><div class="et-t"><b>'+x.n+'</b> · '+x.a+'<small'+(x===cur&&x.atrasada?' class="atz"':'')+'>'+det+'</small>'+(nota?'<span class="note et-n">'+nota+'</span>':'')+'</div>'+(acao?'<div class="et-a">'+acao+'</div>':'')+'</li>';}
window.__fichaEtapasBlk=function(e){if(!window.__etapasDe)return '';
  var h='',ed=evEd(),id=esc(e.id);
  /* 06 checklist */
  if(!dn(e)){var cols=[30,7,3].map(function(n){
    return '<div class="ck-col"><h5>'+n+' dias</h5><ul>'+CK.filter(function(c){return c[0]===n;}).map(function(c){var s=ckEstado(e,c);
      var st=s.auto||!ed?'<span class="ck-s '+(s.s||'nao')+'">'+CKNOME[s.s]+'</span>':
        '<select class="ck-s '+(s.s||'nao')+'" data-ck="'+c[1]+'" data-eid="'+id+'" aria-label="'+esc(c[2])+'">'+['','andamento','ok'].map(function(v){return '<option value="'+v+'"'+(v===s.s?' selected':'')+'>'+CKNOME[v]+'</option>';}).join('')+'</select>';
      return '<li class="'+(s.atrasado?'atz':'')+'">'+st+'<span class="ck-l">'+esc(c[2])+(s.auto?' <span class="note">· automático</span>':'')+(s.atrasado?' <span class="ck-atz">atrasado</span>':'')+'</span></li>';}).join('')+'</ul></div>';}).join('');
    h+='<div class="tp-blk fi-sec"><h4>06 · Checklist</h4><p class="note" style="margin:0">O que precisa estar pronto 30, 7 e 3 dias antes. Os itens automáticos se marcam sozinhos'+(ed?'; os outros você muda aqui':'')+'.</p><div class="ck-grid">'+cols+'</div></div>';}
  /* 08 aprovação e etapas */
  if(dn(e)&&!e.etapas)return h;
  var l=__etapasDe(e),cur=l.filter(function(x){return !x.feita;})[0];
  h+='<div class="tp-blk fi-sec"><h4>08 · Aprovação e etapas</h4><ul class="et-list">'+l.map(function(x){return linhaEtapa(e,x,cur);}).join('')+'</ul></div>';
  return h;};

/* cliques e mudanças dentro do painel (Base) e da tela Pendências */
function ligar(sec){if(!sec)return;
  sec.addEventListener('change',function(ev){var t=ev.target;
    if(t.dataset.et==='aprovacao'){marcar(t.dataset.eid,'aprovacao',t.checked);return;}
    if(t.dataset.ck){marcarCk(t.dataset.eid,t.dataset.ck,t.value);t.className='ck-s '+(t.value||'nao');return;}
    if(t.dataset.etAex!=null){definirAex(t.dataset.etAex,t.value);}});
  sec.addEventListener('click',function(ev){var b=ev.target.closest('[data-et-on],[data-et-off],[data-pd-abrir]');if(!b)return;
    if(b.dataset.pdAbrir){if(window.__abrirFicha)__abrirFicha(b.dataset.pdAbrir);return;}
    b.disabled=true;marcar(b.dataset.eid,b.dataset.etOn||b.dataset.etOff,!!b.dataset.etOn);});}
ligar($('view-base'));

/* ============ PENDÊNCIAS DA MINHA ÁREA ============ */
var sec=document.createElement('section');sec.id='view-pend';sec.hidden=true;sec.setAttribute('aria-labelledby','pend-title');
sec.innerHTML='<div class="section-head"><div><h2 id="pend-title">Pendências</h2><p class="note">O que está na vez da sua área, com o prazo de cada coisa: etapas do evento e o checklist de 30, 7 e 3 dias.</p></div></div>'+
  '<div class="sbar"><div class="seg tseg" id="pd-vista" role="group"><button type="button" data-v="minhas" class="on" aria-pressed="true">Minhas áreas</button><button type="button" data-v="todas" aria-pressed="false">Todas as áreas</button></div></div><div id="pd-lista"></div>';
document.querySelector('main').appendChild(sec);
var vista='minhas';
$('pd-vista').addEventListener('click',function(e){var b=e.target.closest('[data-v]');if(!b)return;vista=b.dataset.v;[].forEach.call(this.children,function(x){var on=x===b;x.className=on?'on':'';x.setAttribute('aria-pressed',on);});renderPend();});
ligar(sec);
/* tudo o que está pendente; o filtro "minhas" fica para a tela */
function pendencias(){var t=hoje(),lim=somaDias(t,14),lim7=somaDias(t,7),out=[];
  events.forEach(function(e){if(/\[teste\]/i.test(e.nome||'')&&!document.getElementById('b-teste').checked)return;
    if(dn(e)&&!e.etapas)return;                                        /* evento anterior ao andamento */
    if(e.data&&e.data<somaDias(t,-30))return;                          /* passou há mais de 30 dias */
    var l=window.__etapasDe(e),cur=l.filter(function(x){return !x.feita;})[0];
    l.forEach(function(x){if(x.feita)return;if(x!==cur&&!(x.prazo&&x.prazo<=lim))return;
      out.push({e:e,tipo:'etapa',k:x.k,o:FAZER[x.k],area:x.a,prazo:x.prazo,ptxt:x.ptxt,atr:x.atrasada,minha:minha(x.k,e)});});
    if(!dn(e))CK.forEach(function(c){var s=ckEstado(e,c);if(s.s==='ok'||!s.prazo||s.prazo>lim7||c[1]==='aprov'||c[1]==='orc')return; /* esses dois já aparecem como etapa */
      out.push({e:e,tipo:'ck',k:c[1],o:c[2],area:'Eventos',prazo:s.prazo,ptxt:ddmm(s.prazo),atr:s.atrasado,s:s.s,auto:s.auto,n:c[0],minha:evCargo()});});});
  return out.sort(function(a,b){return (a.prazo||'9')<(b.prazo||'9')?-1:(a.prazo||'9')>(b.prazo||'9')?1:0;});}
function linhaPend(p){var e=p.e,id=esc(e.id),acao='',P0=P();
  var podeVer=!!P0&&!!P0.podeEm('Eventos').ver;
  if(p.tipo==='etapa'){var bl=bloqueio(p.k,e);
    if(p.k!=='ficha'&&p.k!=='aprovacao'&&podeMarcar(p.k,e)&&!bl)acao+='<button type="button" class="btn small" data-et-on="'+p.k+'" data-eid="'+id+'">Marcar como feita</button>';
    if(p.k==='aprovacao'&&pres()&&!bl&&!podeVer)acao+='<label class="check et-ck"><input type="checkbox" data-et="aprovacao" data-eid="'+id+'">Aprovo esta ficha</label>';}
  else if(!p.auto&&evEd())acao+='<select class="ck-s '+(p.s||'nao')+'" data-ck="'+p.k+'" data-eid="'+id+'" aria-label="'+esc(p.o)+'">'+['','andamento','ok'].map(function(v){return '<option value="'+v+'"'+(v===p.s?' selected':'')+'>'+CKNOME[v]+'</option>';}).join('')+'</select>';
  if(podeVer)acao+='<button type="button" class="btn small ghost" data-pd-abrir="'+id+'">Abrir ficha</button>';
  var fl=p.prazo?window.__faltaTxt(p.prazo):'';
  return '<li class="pd-it'+(p.atr?' atz':'')+'"><div class="pd-d"><b>'+(p.prazo?ddmm(p.prazo):'—')+'</b><span>'+(p.atr?'atrasada':esc(fl))+'</span></div>'+
    '<div class="pd-t"><b>'+esc(p.o)+'</b>'+(p.tipo==='ck'?' <span class="note">· checklist de '+p.n+' dias'+(p.auto?' · automático':'')+'</span>':'')+
    '<span class="tsub">'+esc(e.nome||'Evento')+(e.data?' · '+ddmm(e.data)+'/'+e.data.slice(2,4):'')+'</span></div>'+
    '<span class="chip neutral pd-a">'+esc(p.area)+'</span><div class="pd-ac">'+acao+'</div></li>';}
function renderPend(){var box=$('pd-lista');if(!box||!window.__etapasDe)return;
  var todas=pendencias(),minhas=todas.filter(function(p){return p.minha;}),l=vista==='todas'?todas:minhas;
  contador(minhas.length);
  if(!P()){box.innerHTML='<p class="note">Carregando…</p>';return;}
  if(!l.length){box.innerHTML='<div class="embreve"><b>Nada pendente'+(vista==='minhas'?' para a sua área':'')+'</b><span>'+(vista==='minhas'?'Quando chegar a vez da sua área num evento, aparece aqui (e a diretoria recebe um e-mail).':'Nenhum evento com etapa ou item do checklist em aberto nas próximas semanas.')+'</span></div>';return;}
  var t=hoje(),s7=somaDias(t,7);
  var g=[['Atrasadas',l.filter(function(p){return p.atr;})],['Até 7 dias',l.filter(function(p){return !p.atr&&p.prazo&&p.prazo<=s7;})],['Depois',l.filter(function(p){return !p.atr&&!(p.prazo&&p.prazo<=s7);})]];
  box.innerHTML=g.filter(function(x){return x[1].length;}).map(function(x){return '<div class="pd-g"><h3>'+x[0]+' <span class="note">('+x[1].length+')</span></h3><ul class="pd-l">'+x[1].map(linhaPend).join('')+'</ul></div>';}).join('');}
/* número de pendências minhas no menu */
function contador(n){var b=document.querySelector('.side .sitem[data-alvo="pend"]');if(!b)return;var c=b.querySelector('.pd-n');
  if(!n){if(c)c.remove();return;}if(!c){c=document.createElement('span');c.className='beta pd-n';b.appendChild(c);}c.textContent=n;c.setAttribute('aria-label',n+' pendentes');}
/* acompanha a Base, os convidados e os cargos */
var _rb=renderBase;renderBase=function(){_rb.apply(this,arguments);adiar('view-pend',renderPend,function(){var a=document.activeElement;return !!(a&&sec.contains(a)&&a.tagName==='SELECT');});};
var _rc=renderChks;renderChks=function(){_rc.apply(this,arguments);renderPend();};
var foiHash=false;
document.addEventListener('permissoes',function(){renderPend();
  if(!foiHash&&location.hash==='#pendencias'){foiHash=true;setTimeout(function(){var b=document.querySelector('.side .sitem[data-alvo="pend"]');if(b)b.click();},0);}});
document.addEventListener('membros',function(){renderPend();});
renderPend();
})();
