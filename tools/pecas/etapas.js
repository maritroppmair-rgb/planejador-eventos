/* ============ CHECKLIST DO EVENTO, ANDAMENTO E PENDÊNCIAS (seção 06 da Ficha de Evento Feashion) ============
   Os 14 pontos do checklist, cada um com um prazo (dias antes do evento) dentro do seu bloco de 30, 7 ou 3 dias.
   No bloco de 30 dias: a ficha fica pronta, a Presidência aprova (48 h depois) e então convidado, sala e orçamento correm juntos;
   o briefing ao Marketing fecha o bloco. O lembrete aos inscritos é a exceção: o robô manda 48 h antes.
   Onde fica cada ponto:
     eventos/{id}.checklist[chave] = {s:'andamento'|'ok', em, por, uid}   pontos de Eventos marcados à mão
     eventos/{id}.etapas.aprovacao | orcamento | divulgacao | aex           pontos de outras áreas (as regras do Firestore deixam
                                                                            cada área mudar só o seu); mesmo formato
     eventos/{id}.etapas.ficha = {em, por}                                  quando a ficha ficou pronta (gravado ao salvar)
     eventos/{id}.responsavelAex = {uid, nome}                              quem cuida do Formulário da AEX
   Quem marca: Aprovação, só Presidente, Vice-presidente e DEV (ficha pronta, evento futuro), no botão ao lado de "Salvar ficha";
   Orçamento, a diretoria do Financeiro; Divulgação, a diretoria do Marketing; Formulário da AEX, o responsável AEX;
   o resto, quem edita Eventos. O acesso geral marca tudo, menos a Aprovação. */
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
function ddmm(x){return x?x.slice(8,10)+'/'+x.slice(5,7):'—';}
function primeiro(n){return String(n||'').split(' ')[0];}
function dn(e){return e.status==='realizado';}
function somaDias(dt,n){var d=D(dt);d.setDate(d.getDate()+n);return iso(d);}
function faltaTxt(prazo){if(!prazo)return '';var n=Math.round((D(prazo)-D(hoje()))/864e5);
  return n<0?'atrasado há '+(-n)+' dia'+(n===-1?'':'s'):n===0?'vence hoje':'falta'+(n===1?' 1 dia':'m '+n+' dias');}

/* ----- os 14 pontos ----- (b = bloco; d = dias antes do evento; a = área; c = onde grava; auto = marca sozinho) */
function convs(e){var ids=e.convidadoIds&&e.convidadoIds.length?e.convidadoIds:e.convidadoId?[e.convidadoId]:[];
  if(!ids.length)return e.ficha&&e.ficha.semConvidado?null:[];
  return ids.map(function(i){return guests.filter(function(g){return g.id===i;})[0];}).filter(Boolean);}
var PONTOS=[
  {k:'ficha',n:'Ficha do evento pronta',b:30,d:40,a:'Eventos',auto:function(e){return !!(window.__fichaCompleta&&__fichaCompleta(e));}},
  {k:'aprov',n:'Ficha aprovada pela Presidência',b:30,d:38,a:'Presidência',c:'etapas.aprovacao'},
  {k:'conv',n:'Convidado confirmado por escrito',b:30,d:33,a:'Eventos',auto:function(e){var g=convs(e);if(!g)return null;return g.length>0&&g.every(function(x){return x.status==='Confirmado'||x.status==='Palestrou';});}},
  {k:'sala',n:'Sala reservada',b:30,d:33,a:'Eventos',auto:function(e){var f=e.ficha||{};return f.salaReservada==='sim'&&!!String(f.reservaNum||'').trim();}},
  {k:'orc',n:'Orçamento validado',b:30,d:33,a:'Financeiro',c:'etapas.orcamento'},
  {k:'brief',n:'Briefing ao Marketing',b:30,d:30,a:'Eventos'},
  {k:'forn',n:'Fornecedores confirmados',b:7,d:14,a:'Eventos'},
  {k:'aexform',n:'Formulário da AEX pronto',b:7,d:12,a:'AEX',c:'etapas.aex'},
  {k:'divulg',n:'Divulgação feita',b:7,d:10,a:'Marketing',c:'etapas.divulgacao'},
  {k:'funcoes',n:'Funções do dia definidas',b:7,d:7,a:'Eventos'},
  {k:'reconf',n:'Reconfirmar convidado e sala',b:3,d:5,a:'Eventos'},
  {k:'roteiro',n:'Roteiro enviado à equipe',b:3,d:4,a:'Eventos'},
  {k:'planob',n:'Plano B revisado',b:3,d:3,a:'Eventos'},
  {k:'lembrete',n:'Lembrete aos inscritos',b:3,d:2,a:'Eventos',auto:function(e){var i=e.inscricao;if(!i||!i.formId)return null;var x=(i.emails||{}).lembrete;return !!(x&&x.enviados>0);}}];
function campo(p){return p.c||'checklist.'+p.k;}
function gravado(e,p){var ps=campo(p).split('.'),v=e[ps[0]]&&e[ps[0]][ps[1]];return v&&typeof v==='object'?v:{};}
/* estado de cada ponto de um evento */
function pontosDe(e){var t=hoje(),fim=dn(e);
  return PONTOS.map(function(p){var au=p.auto?p.auto(e):null,g=gravado(e,p),s,em='',por='';
    if(au!=null){s=au?'ok':'';if(p.k==='ficha'&&e.etapas&&e.etapas.ficha){em=e.etapas.ficha.em||'';por=e.etapas.ficha.por||'';}}
    else{s=g.s==='ok'||g.s==='andamento'?g.s:g.em?'ok':'';em=g.em||'';por=g.por||'';}  /* marcas antigas {em,por} contam como concluídas */
    var prazo=e.data?somaDias(e.data,-p.d):null;
    return {p:p,k:p.k,n:p.n,a:p.a,b:p.b,s:s,feito:s==='ok',auto:au!=null,em:em,por:por,prazo:prazo,ptxt:ddmm(prazo),atrasado:s!=='ok'&&!fim&&!!prazo&&prazo<t};});}
window.__pontosDe=pontosDe;
var NOME={'':'Não iniciada',andamento:'Em andamento',ok:'Concluída'};

/* ----- quem marca, de quem é, quando dá ----- */
function podeMarcar(p,e){
  if(p.auto&&p.auto(e)!=null)return false;
  if(p.k==='aprov')return pres();
  if(p.k==='orc')return geral()||dirDe('Financeiro');
  if(p.k==='divulg')return geral()||dirDe('Marketing');
  if(p.k==='aexform')return evEd()||!!(e.responsavelAex&&e.responsavelAex.uid&&e.responsavelAex.uid===window.__euId);
  return evEd();}
function minha(p,e){
  if(p.a==='Presidência')return pres();
  if(p.a==='Financeiro')return dirDe('Financeiro');
  if(p.a==='Marketing')return dirDe('Marketing');
  if(p.a==='AEX')return e.responsavelAex&&e.responsavelAex.uid?e.responsavelAex.uid===window.__euId:evCargo();
  return evCargo();}
function bloqueioAprov(e){if(!(window.__fichaCompleta&&__fichaCompleta(e)))return 'Libera quando a ficha estiver pronta e salva.';
  if(dn(e)||!e.data||e.data<hoje())return 'Só para eventos que ainda vão acontecer.';return '';}

/* ----- gravar ----- */
function quem(){return {em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80),uid:window.__euId||''};}
function falhou(){alertMsg('Não foi possível salvar. Confira se seu cargo permite.');}
function gravar(eid,k,s){var p=PONTOS.filter(function(x){return x.k===k;})[0];if(!p||!db)return;var up={},q=quem();
  up[campo(p)]=s?{s:s,em:q.em,por:q.por,uid:q.uid}:null;db.doc('eventos/'+eid).update(up).catch(falhou);}
function definirAex(eid,uid){if(!db)return;var m=(window.__membros||[]).filter(function(x){return x.id===uid;})[0];
  db.doc('eventos/'+eid).update({responsavelAex:m?{uid:m.id,nome:m.nome}:null}).catch(falhou);}
function seletor(x,eid){return '<select class="ck-s '+(x.s||'nao')+'" data-ck="'+x.k+'" data-eid="'+esc(eid)+'" aria-label="'+esc(x.n)+'">'+['','andamento','ok'].map(function(v){return '<option value="'+v+'"'+(v===x.s?' selected':'')+'>'+NOME[v]+'</option>';}).join('')+'</select>';}

/* ----- caixinha Andamento (Base): uma bolinha por ponto, em três grupos ----- */
window.__andamento=function(e,ab){
  if(dn(e)&&!e.etapas&&!e.checklist)return '<span class="note">Evento anterior ao andamento.</span>';
  var l=pontosDe(e),n=l.filter(function(x){return x.feito;}).length,cur=l.filter(function(x){return !x.feito;})[0],id=esc(e.id);
  function cls(x){return x.feito?'ok':x===cur?(x.atrasado?'atr':'vez'):x.atrasado?'atr2':x.s==='andamento'?'and':'';}
  var h='<div class="and'+(!cur?' fim':'')+(ab?' on':'')+'" role="button" tabindex="0" data-eand="'+id+'" aria-expanded="'+!!ab+'" aria-label="Andamento: '+n+' de '+l.length+' pontos do checklist. '+(ab?'Fechar':'Ver')+' prazos e datas">'+
    '<div class="and-t"><span>Andamento</span><span>'+n+' de '+l.length+'<span class="and-s" aria-hidden="true">'+(ab?'▲':'▼')+'</span></span></div>'+
    '<div class="and-gs" aria-hidden="true">'+[30,7,3].map(function(b){var lb=l.filter(function(x){return x.b===b;});return '<ol class="and-g" style="flex:'+lb.length+'"><li class="and-gl">'+b+'</li>'+lb.map(function(x){return '<li class="'+cls(x)+'" title="'+esc(x.n+' · '+x.a+' · até '+x.ptxt+' · '+NOME[x.s])+'"><i>'+(x.feito?'✓':'')+'</i></li>';}).join('')+'</ol>';}).join('')+'</div>'+
    '<div class="and-p">'+(!cur?'<span><b>Checklist completo</b></span>':
      '<span>'+(cur.atrasado?'Atrasado: ':'Agora: ')+'<b>'+esc(cur.n)+'</b> · '+cur.a+'</span><span class="and-d'+(cur.atrasado?' atz':'')+'">até '+cur.ptxt+'</span>')+'</div>';
  if(ab)h+=[30,7,3].map(function(b){return '<div class="and-bl"><h5>'+b+' dias</h5><ul>'+l.filter(function(x){return x.b===b;}).map(function(x){var c=cls(x);
      var det='prazo '+x.ptxt+(x.k==='lembrete'?' (48 h antes)':'')+(x.feito?(x.em?' · concluído '+ddmm(x.em.slice(0,10))+(x.por?' por '+esc(primeiro(x.por)):''):''):x.s==='andamento'?' · em andamento':x.prazo&&!dn(e)?' · '+faltaTxt(x.prazo):'');
      return '<li><span class="and-k '+c+'"></span><span><b>'+esc(x.n)+'</b> · '+x.a+'<small'+(x.atrasado?' class="atz"':'')+'>'+det+'</small></span></li>';}).join('')+'</ul></div>';}).join('');
  return h+'</div>';};

/* ----- ficha: 06 checklist e o botão de aprovação ao lado de "Salvar ficha" ----- */
window.__fichaEtapasBlk=function(e){if(dn(e))return '';
  var ed=evEd(),id=esc(e.id),l=pontosDe(e),ra=e.responsavelAex;
  var aex=ed?'<label class="et-aex"><span>Responsável AEX</span><select data-et-aex="'+id+'"><option value="">— escolher —</option>'+(window.__membros||[]).map(function(m){return '<option value="'+esc(m.id)+'"'+(ra&&ra.uid===m.id?' selected':'')+'>'+esc(m.nome)+'</option>';}).join('')+(ra&&!(window.__membros||[]).some(function(m){return m.id===ra.uid;})?'<option value="'+esc(ra.uid)+'" selected>'+esc(ra.nome||'?')+'</option>':'')+'</select></label>'
    :'<p class="note" style="margin:0">Responsável AEX: <b>'+esc(ra&&ra.nome||'a definir')+'</b></p>';
  var cols=[30,7,3].map(function(b){return '<div class="ck-col"><h5>'+b+' dias</h5><ul>'+l.filter(function(x){return x.b===b;}).map(function(x){
      var st=podeMarcar(x.p,e)&&x.k!=='aprov'?seletor(x,e.id):'<span class="ck-s '+(x.s||'nao')+'">'+NOME[x.s]+'</span>';
      var sub=[x.a!=='Eventos'?x.a:'',x.auto?'automático':'','até '+x.ptxt+(x.k==='lembrete'?' (48 h antes)':'')].filter(Boolean).join(' · ');
      return '<li class="'+(x.atrasado?'atz':'')+'">'+st+'<span class="ck-l">'+esc(x.n)+(x.atrasado?' <span class="ck-atz">atrasado</span>':'')+'<small>'+esc(sub)+(x.feito&&x.em&&!x.auto?' · '+esc(primeiro(x.por))+' em '+ddmm(x.em.slice(0,10)):'')+'</small></span></li>';}).join('')+'</ul></div>';}).join('');
  return '<div class="tp-blk fi-sec"><h4>06 · Checklist</h4><p class="note" style="margin:0">O que precisa estar pronto até 30, 7 e 3 dias antes, cada ponto com o seu prazo. Os automáticos se marcam sozinhos; cada área marca os seus (aqui ou em Pendências).</p>'+aex+'<div class="ck-grid">'+cols+'</div></div>';};
window.__fichaAprovHtml=function(e){if(dn(e))return '';var x=pontosDe(e).filter(function(y){return y.k==='aprov';})[0],id=esc(e.id);
  if(pres()){var bl=bloqueioAprov(e);
    return '<label class="fi-aprov'+(x.feito?' on':'')+(bl&&!x.feito?' off':'')+'"><input type="checkbox" data-et="aprov" data-eid="'+id+'"'+(x.feito?' checked':'')+(bl?' disabled':'')+'><span><b>'+(x.feito?'Ficha aprovada':'Aprovo esta ficha')+'</b><small>'+(x.feito&&x.em?'por '+esc(primeiro(x.por))+' em '+ddmm(x.em.slice(0,10)):bl||'Presidência · até '+x.ptxt)+'</small></span></label>';}
  return '<span class="fi-aprov-st '+(x.feito?'ok':'')+'">'+(x.feito?'✓ Aprovada pela Presidência'+(x.em?' em '+ddmm(x.em.slice(0,10)):''):'Aguardando a aprovação da Presidência')+'</span>';};

/* cliques e mudanças (painel da Base e tela Pendências) */
function ligar(sec){if(!sec)return;
  sec.addEventListener('change',function(ev){var t=ev.target;
    if(t.dataset.et==='aprov'){gravar(t.dataset.eid,'aprov',t.checked?'ok':'');t.blur();return;}
    if(t.dataset.ck){gravar(t.dataset.eid,t.dataset.ck,t.value);t.className='ck-s '+(t.value||'nao');return;}
    if(t.dataset.etAex!=null){definirAex(t.dataset.etAex,t.value);}});
  sec.addEventListener('click',function(ev){var b=ev.target.closest('[data-pd-abrir]');if(b&&window.__abrirFicha)__abrirFicha(b.dataset.pdAbrir);});}
ligar($('view-base'));

/* ============ PENDÊNCIAS DA MINHA ÁREA ============ */
var sec=document.createElement('section');sec.id='view-pend';sec.hidden=true;sec.setAttribute('aria-labelledby','pend-title');
sec.innerHTML='<div class="section-head"><div><h2 id="pend-title">Pendências</h2><p class="note">Os pontos do checklist dos eventos que estão com a sua área, com o prazo de cada um.</p></div></div>'+
  '<div class="sbar"><div class="seg tseg" id="pd-vista" role="group"><button type="button" data-v="minhas" class="on" aria-pressed="true">Minhas áreas</button><button type="button" data-v="todas" aria-pressed="false">Todas as áreas</button></div></div><div id="pd-lista"></div>';
document.querySelector('main').appendChild(sec);
var vista='minhas';
$('pd-vista').addEventListener('click',function(e){var b=e.target.closest('[data-v]');if(!b)return;vista=b.dataset.v;[].forEach.call(this.children,function(x){var on=x===b;x.className=on?'on':'';x.setAttribute('aria-pressed',on);});renderPend();});
ligar(sec);
/* pontos em aberto com prazo nas próximas 2 semanas (ou já vencidos) */
function pendencias(){var t=hoje(),lim=somaDias(t,14),out=[],tst=$('b-teste');
  events.forEach(function(e){if(dn(e)||!e.data||e.data<t)return;
    if(/\[teste\]/i.test(e.nome||'')&&tst&&!tst.checked)return;
    pontosDe(e).forEach(function(x){if(x.feito||!x.prazo||x.prazo>lim)return;out.push({e:e,x:x,minha:minha(x.p,e)});});});
  return out.sort(function(a,b){return a.x.prazo<b.x.prazo?-1:a.x.prazo>b.x.prazo?1:0;});}
function linhaPend(r){var e=r.e,x=r.x,id=esc(e.id),acao='',P0=P(),podeVer=!!P0&&!!P0.podeEm('Eventos').ver;
  if(x.k==='aprov'){if(pres()&&!bloqueioAprov(e))acao+='<label class="check et-ck"><input type="checkbox" data-et="aprov" data-eid="'+id+'">Aprovo esta ficha</label>';}
  else if(podeMarcar(x.p,e))acao+=seletor(x,e.id);
  if(podeVer)acao+='<button type="button" class="btn small ghost" data-pd-abrir="'+id+'">Abrir ficha</button>';
  return '<li class="pd-it'+(x.atrasado?' atz':'')+'"><div class="pd-d"><b>'+x.ptxt+'</b><span>'+esc(faltaTxt(x.prazo))+'</span></div>'+
    '<div class="pd-t"><b>'+esc(x.n)+'</b> <span class="note">· checklist de '+x.b+' dias'+(x.auto?' · automático':'')+'</span>'+
    '<span class="tsub">'+esc(e.nome||'Evento')+' · '+ddmm(e.data)+'/'+e.data.slice(2,4)+'</span></div>'+
    '<span class="chip neutral pd-a">'+esc(x.a)+'</span><div class="pd-ac">'+acao+'</div></li>';}
function renderPend(){var box=$('pd-lista');if(!box)return;
  var todas=pendencias(),minhas=todas.filter(function(r){return r.minha;}),l=vista==='todas'?todas:minhas;
  contador(minhas.length);
  if(!P()){box.innerHTML='<p class="note">Carregando…</p>';return;}
  if(!l.length){box.innerHTML='<div class="embreve"><b>Nada pendente'+(vista==='minhas'?' para a sua área':'')+'</b><span>'+(vista==='minhas'?'Quando um ponto do checklist com a sua área estiver perto do prazo, aparece aqui (e a diretoria recebe um e-mail).':'Nenhum ponto do checklist em aberto nas próximas duas semanas.')+'</span></div>';return;}
  var s7=somaDias(hoje(),7);
  var g=[['Atrasados',l.filter(function(r){return r.x.atrasado;})],['Até 7 dias',l.filter(function(r){return !r.x.atrasado&&r.x.prazo<=s7;})],['Até 14 dias',l.filter(function(r){return !r.x.atrasado&&r.x.prazo>s7;})]];
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
