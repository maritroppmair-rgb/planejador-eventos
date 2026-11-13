<script>
/* ---------- menu lateral: substitui as abas do topo (que continuam no código, escondidas) ---------- */
(function(){
"use strict";
function $(i){return document.getElementById(i);}
var I={
  ia:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 15l.8 2.2 2.2.8-2.2.8L18 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  plan:'<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
  base:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  ana:'<path d="M5 20V11M12 20V5M19 20v-6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  conv:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/>',
  salas:'<path d="M5 21V4h10v17M15 8h4v13M3 21h18"/><circle cx="12" cy="13" r=".6"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  docs:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  par:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  membros:'<circle cx="9" cy="9" r="3"/><path d="M3 20c.9-3 3.2-4.6 6-4.6s5.1 1.6 6 4.6"/><path d="M16 6.5a3 3 0 0 1 0 5.6M18 15.6c1.4.6 2.4 2 3 4.4"/>',
  perfil:'<circle cx="12" cy="8.5" r="4"/><path d="M4 20.5c1.4-4 4.4-6 8-6s6.6 2 8 6"/>',
  lixeira:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  hist:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  'fin-custos':'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  'fin-coffee':'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  'fin-ana':'<path d="M5 20V11M12 20V5M19 20v-6"/>',
  'mkt-div':'<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/>',
  'mkt-posts':'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 16l-5-5-9 9"/>',
  'mkt-met':'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  'cd-cap':'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2.5 2 9.5 2 12 0v-5"/>',
  'cd-trilha':'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  'rh':'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  pend:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11"/><circle cx="5" cy="18" r="1.3"/>'
};
/* menu por área: a área é escolhida no subtítulo do topo ("Diretoria de Eventos ▾") e o menu mostra só as telas dela.
   O grupo Geral (Calendário, Documentos, Membros, Lixeira, Histórico) aparece em todas. Lixeira e Histórico: diretoria para cima. */
var AREAS=['Eventos','Financeiro','Marketing','C&D','RH'];
var MENU={
  'Eventos':[['Eventos',[['ia','Ideia de evento','view','BETA'],['plan','Planejar evento','tab'],['base','Base de eventos','tab'],['ana','Analytics','view'],['mail','Mailing','view']]],
             ['Recursos',[['conv','Convidados','tab'],['salas','Salas','tab'],['fin-coffee','Contatos de coffee','view']]],
             ['Ajustes',[['par','Parâmetros','tab']]]],
  'Financeiro':[['Financeiro',[['fin-custos','Orçamento por evento','view'],['fin-ana','Analytics','view']]]],
  'Marketing':[['Marketing',[['mkt-div','Divulgação dos eventos','view'],['mkt-posts','Posts','view'],['mkt-met','Métricas','view']]]],
  'C&D':[['C&D',[['cd-cap','Capacitações','view'],['cd-trilha','Trilha do trainee','view']]]],
  'RH':[['RH',[['rh','Visão geral','view']]]]
};
var GERAL=['Geral',[['pend','Pendências','view'],['cal','Calendário','tab'],['cd-cap','Capacitações','view','','fora:C&D'],['cd-trilha','Trilha do trainee','view','','fora:C&D'],['docs','Documentos','tab'],['membros','Membros','go'],['lixeira','Lixeira','view','','gov'],['hist','Histórico','view','','gov']]];
/* telas novas das áreas: por enquanto em branco, para desenhar uma a uma */
var NOVAS={
  'fin-custos':['Orçamento por evento','Financeiro','Orçamento, validação e pagamentos de cada evento.'],
  'fin-ana':['Analytics','Financeiro','Visão dos gastos dos eventos.'],
  'mkt-div':['Divulgação dos eventos','Marketing','Briefing, plano de divulgação e autorização de imagem de cada evento.'],
  'mkt-posts':['Posts','Marketing','Do rascunho à publicação: ideia, produção, aprovação e publicado.'],
  'mkt-met':['Métricas','Marketing','Seguidores, alcance e engajamento, mês a mês.'],
  'cd-cap':['Capacitações','C&D','Treinamentos e aulas, com data, tema, quem dá e presença.'],
  'cd-trilha':['Trilha do trainee','C&D','As etapas de cada trainee e o progresso de cada um.'],
  'rh':['RH','RH','O que a área de RH vai acompanhar aqui ainda será definido.']
};
var main=document.querySelector('main');
var SOLTAS=['view-ana','view-mail','view-ia','view-lixeira','view-hist','view-pend','view-fin-coffee'];
Object.keys(NOVAS).forEach(function(k){
  if(document.getElementById('view-'+k)){SOLTAS.push('view-'+k);return;} /* telas já prontas (ex.: Financeiro, no fin.js) */
  var n=NOVAS[k],sec=document.createElement('section');sec.id='view-'+k;sec.hidden=true;sec.setAttribute('aria-labelledby',k+'-title');
  sec.innerHTML='<div class="section-head"><div><h2 id="'+k+'-title"></h2><p class="note"></p></div></div><div class="embreve"><b>Tela em construção</b><span>Vamos desenhar esta tela juntos.</span></div>';
  sec.querySelector('h2').textContent=n[0];sec.querySelector('.note').textContent=n[2];
  main.appendChild(sec);SOLTAS.push(sec.id);
});
function icone(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+I[k]+'</svg>';}
var hdr=document.querySelector('header.app');
var shell=document.createElement('div');shell.className='shell';
var side=document.createElement('aside');side.className='side';side.id='side';side.setAttribute('aria-label','Menu');
var back=document.createElement('div');back.className='sback';
main.parentNode.insertBefore(shell,main);shell.appendChild(side);shell.appendChild(main);document.body.appendChild(back);
var nav=document.createElement('nav');nav.setAttribute('aria-label','Seções');nav.style.cssText='display:grid;gap:18px';
function grupo(g,area){
  var box=document.createElement('div');box.className='sgroup';box.dataset.area=area;
  var h=document.createElement('h4');h.textContent=g[0];box.appendChild(h);
  g[1].forEach(function(it){
    var b=document.createElement('button');b.type='button';b.className='sitem';b.dataset.alvo=it[0];b.dataset.modo=it[2];if(it[4]==='gov')b.dataset.gov='1';else if(it[4])b.dataset.fora=it[4].slice(5);
    b.innerHTML=icone(it[0]);var sp=document.createElement('span');sp.textContent=it[1];b.appendChild(sp);if(it[3]){var bt=document.createElement('span');bt.className='beta';bt.textContent=it[3];b.appendChild(bt);}
    b.addEventListener('click',function(){ir(it[0],it[2]);});
    box.appendChild(b);
  });
  nav.appendChild(box);
}
AREAS.forEach(function(a){MENU[a].forEach(function(g){grupo(g,a);});});
grupo(GERAL,'');
side.appendChild(nav);
var foot=document.createElement('div');foot.className='sfoot';
var pb=document.createElement('button');pb.type='button';pb.className='sitem';pb.dataset.alvo='perfil';pb.dataset.modo='go';
pb.innerHTML=icone('perfil')+'<span>Meu perfil</span>';pb.addEventListener('click',function(){ir('perfil','go');});
foot.appendChild(pb);
var st=$('dbstatus');if(st)foot.appendChild(st);
side.appendChild(foot);

/* botão ☰ no celular */
var hb=document.createElement('button');hb.type='button';hb.className='hamb';hb.setAttribute('aria-label','Mostrar ou esconder o menu');hb.title='Mostrar ou esconder o menu';hb.setAttribute('aria-controls','side');hb.setAttribute('aria-expanded','false');
hb.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
var tr=document.querySelector('.toprow');if(tr)tr.insertBefore(hb,tr.firstChild);
var CHAVE='feashion-menu';
function pc(){return window.innerWidth>=1000;}
function aplicarPc(){var off=false;try{off=localStorage.getItem(CHAVE)==='fechado';}catch(e){}document.body.classList.toggle('side-off',off);if(pc())hb.setAttribute('aria-expanded',String(!off));}
function alternarPc(){var off=!document.body.classList.contains('side-off');document.body.classList.toggle('side-off',off);hb.setAttribute('aria-expanded',String(!off));try{localStorage.setItem(CHAVE,off?'fechado':'aberto');}catch(e){}}
aplicarPc();
function abrir(){side.classList.add('open');back.classList.add('open');hb.setAttribute('aria-expanded','true');var f=side.querySelector('.sitem');if(f)f.focus();}
function fechar(){if(!side.classList.contains('open'))return;side.classList.remove('open');back.classList.remove('open');hb.setAttribute('aria-expanded','false');}
hb.addEventListener('click',function(){if(pc()){alternarPc();return;}side.classList.contains('open')?fechar():abrir();});
back.addEventListener('click',fechar);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&side.classList.contains('open')){fechar();hb.focus();}});

/* navegação */
function esconderAna(){SOLTAS.forEach(function(k){var a=$(k);if(a&&!a.hidden)a.hidden=true;});}
function ir(alvo,modo){
  fechar();
  if(modo==='tab'){esconderAna();var t=$('tab-'+alvo);if(t)t.click();}
  else if(modo==='go'){esconderAna();var g=document.querySelector('#acctmenu [data-go="'+alvo+'"]');if(g)g.click();}
  else if(modo==='view'){
    document.querySelectorAll('main>section').forEach(function(s){s.hidden=s.id!=='view-'+alvo;});
    document.querySelectorAll('.tabs button').forEach(function(x){x.setAttribute('aria-selected','false');});
    window.scrollTo(0,0);
    document.dispatchEvent(new CustomEvent('tela',{detail:alvo}));
  }
  marcar();
}
/* telas abertas por outros caminhos (menu do círculo, "Abrir no Planejar"...) também fecham a Analytics */
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('.tabs button,#acctmenu [data-go]'):null;
  if(t)esconderAna();
},true);
function marcar(){
  var vis=null;document.querySelectorAll('main>section').forEach(function(s){if(!s.hidden&&!vis)vis=s.id.replace('view-','');});
  side.querySelectorAll('.sitem').forEach(function(b){if(b.dataset.alvo===vis)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
}
/* ---------- área escolhida ---------- */
var CHAVE_AREA='feashion-area',atual=null;
try{atual=localStorage.getItem(CHAVE_AREA);}catch(e){}
if(AREAS.indexOf(atual)<0)atual='Eventos';
/* área em que a pessoa está agora: os documentos novos guardam isso */
window.__areaAtual=function(){return atual||'Eventos';};
/* vai para uma área e uma tela dela (ex.: o link do e-mail abre o orçamento no Financeiro) */
window.__irArea=function(a,alvo){if(a!==atual)escolher(a);var b=alvo&&([].filter.call(side.querySelectorAll('.sitem[data-alvo="'+alvo+'"]'),function(x){return !x.hidden&&!x.closest('.sgroup').hidden;})[0]||side.querySelector('.sitem[data-alvo="'+alvo+'"]'));if(b)b.click();};
function visiveis(){var P=window.__perm;if(!P||!P.carregado())return [atual];return AREAS.filter(function(a){return !!P.podeEm(a).ver;});}
function telaAberta(){var vis=null;document.querySelectorAll('main>section').forEach(function(s){if(!s.hidden&&!vis)vis=s.id.replace('view-','');});return vis;}
function primeira(){return side.querySelector('.sgroup:not([hidden]) .sitem:not([hidden])');}
function mostrarGrupos(){
  var P=window.__perm,ok=P&&P.carregado();
  side.querySelectorAll('.sgroup').forEach(function(g){var algum=false,daArea=!g.dataset.area||g.dataset.area===atual;
    g.querySelectorAll('.sitem').forEach(function(b){var v=(!b.dataset.gov||(ok&&P.diretorAlgum()))&&b.dataset.fora!==atual;b.hidden=!v;if(v)algum=true;});
    g.hidden=!daArea||!algum;});
  rotulos();
}
function aplicarAreas(){
  var P=window.__perm;if(!P||!P.carregado())return;
  var vis=visiveis();
  if(vis.indexOf(atual)<0){var mi=P.minhas().filter(function(a){return vis.indexOf(a)>=0;});atual=mi[0]||vis[0]||null;}
  mostrarGrupos();
  /* a tela aberta ficou fora da área (ou do alcance): vai para a primeira da área */
  var t=telaAberta(),bts=t?[].slice.call(side.querySelectorAll('.sitem[data-alvo="'+t+'"]')):[];
  if(bts.length&&bts.every(function(bt){return bt.hidden||bt.closest('.sgroup').hidden;})){var f=primeira();if(f)ir(f.dataset.alvo,f.dataset.modo);}
}
function escolher(a){
  if(a===atual)return fecharSel();
  atual=a;try{localStorage.setItem(CHAVE_AREA,a);}catch(e){}
  mostrarGrupos();fecharSel();
  var f=side.querySelector('.sgroup[data-area="'+a+'"]:not([hidden]) .sitem:not([hidden])')||primeira();if(f)ir(f.dataset.alvo,f.dataset.modo);
}
/* seletor: no subtítulo do topo (computador) e no topo do menu (celular) */
var SETA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
var selTopo=document.createElement('button');selTopo.type='button';selTopo.className='asel';
var sm=document.querySelector('header.app .brand .bt small');if(sm)sm.parentNode.replaceChild(selTopo,sm);
var selSide=document.createElement('button');selSide.type='button';selSide.className='sarea';
side.insertBefore(selSide,side.firstChild);
var amenu=document.createElement('div');amenu.className='amenu';amenu.id='amenu';amenu.setAttribute('role','menu');amenu.setAttribute('aria-label','Escolher área');amenu.hidden=true;
document.body.appendChild(amenu);
[selTopo,selSide].forEach(function(b){b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-controls','amenu');b.setAttribute('aria-expanded','false');
  b.addEventListener('click',function(e){e.stopPropagation();if(b.classList.contains('so1'))return;amenu.hidden?abrirSel(b):fecharSel();});});
function nomeArea(a){return a?'Diretoria de '+a:'Sem área';}
function rotulos(){
  var vis=visiveis(),um=vis.length<=1,txt=nomeArea(atual);
  [selTopo,selSide].forEach(function(b){b.classList.toggle('so1',um);b.disabled=false;b.setAttribute('aria-disabled',String(um));
    b.title=um?'':'Trocar de área';b.innerHTML='';
    if(b===selSide){var l=document.createElement('small');l.textContent='Área';b.appendChild(l);}
    var t=document.createElement('span');t.textContent=txt;b.appendChild(t);b.insertAdjacentHTML('beforeend',SETA);});
}
var aberto=null;
function abrirSel(b){
  var P=window.__perm,ok=P&&P.carregado();amenu.innerHTML='';
  var h=document.createElement('div');h.className='ahead';h.textContent='Áreas';amenu.appendChild(h);
  visiveis().forEach(function(a){
    var it=document.createElement('button');it.type='button';it.setAttribute('role','menuitemradio');it.setAttribute('aria-checked',String(a===atual));it.className='aitem';
    var n=document.createElement('span');n.textContent=a;it.appendChild(n);
    if(ok&&!P.podeEm(a).editar){var r=document.createElement('em');r.textContent='só leitura';it.appendChild(r);}
    it.addEventListener('click',function(){escolher(a);});amenu.appendChild(it);
  });
  var r=b.getBoundingClientRect();amenu.hidden=false;
  amenu.style.top=Math.round(r.bottom+6)+'px';amenu.style.left=Math.round(Math.max(8,Math.min(r.left,window.innerWidth-amenu.offsetWidth-8)))+'px';
  aberto=b;b.setAttribute('aria-expanded','true');
  var c=amenu.querySelector('[aria-checked="true"]')||amenu.querySelector('.aitem');if(c)c.focus();
}
function fecharSel(){if(amenu.hidden)return;amenu.hidden=true;if(aberto){aberto.setAttribute('aria-expanded','false');aberto.focus();}aberto=null;}
document.addEventListener('click',function(e){if(!amenu.hidden&&!amenu.contains(e.target))fecharSel();});
amenu.addEventListener('keydown',function(e){
  var its=[].slice.call(amenu.querySelectorAll('.aitem')),i=its.indexOf(document.activeElement);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();var n=its[(i+(e.key==='ArrowDown'?1:-1)+its.length)%its.length];if(n)n.focus();}
  else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();e.stopPropagation();fecharSel();}
});
var largura=window.innerWidth;window.addEventListener('resize',function(){if(window.innerWidth!==largura){largura=window.innerWidth;fecharSel();}});
window.addEventListener('scroll',function(e){if(!amenu.hidden&&!amenu.contains(e.target)&&e.target!==document&&e.target!==window)fecharSel();},true);
mostrarGrupos();
document.addEventListener('permissoes',aplicarAreas);
new MutationObserver(marcar).observe(main,{attributes:true,attributeFilter:['hidden'],subtree:true});
marcar();
/* altura do cabeçalho para o menu grudar logo abaixo dele */
function medir(){if(hdr)document.documentElement.style.setProperty('--hdr',hdr.offsetHeight+'px');}
medir();if(window.ResizeObserver&&hdr)new ResizeObserver(medir).observe(hdr);
window.addEventListener('resize',function(){if(pc()){fechar();aplicarPc();}else hb.setAttribute('aria-expanded',String(side.classList.contains('open')));});
})();
</script>
