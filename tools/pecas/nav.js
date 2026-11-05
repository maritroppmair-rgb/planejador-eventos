<script>
/* ---------- menu lateral: substitui as abas do topo (que continuam no código, escondidas) ---------- */
(function(){
"use strict";
function $(i){return document.getElementById(i);}
var I={
  plan:'<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
  base:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  ana:'<path d="M5 20V11M12 20V5M19 20v-6"/>',
  conv:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/>',
  salas:'<path d="M5 21V4h10v17M15 8h4v13M3 21h18"/><circle cx="12" cy="13" r=".6"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  docs:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  par:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  membros:'<circle cx="9" cy="9" r="3"/><path d="M3 20c.9-3 3.2-4.6 6-4.6s5.1 1.6 6 4.6"/><path d="M16 6.5a3 3 0 0 1 0 5.6M18 15.6c1.4.6 2.4 2 3 4.4"/>',
  perfil:'<circle cx="12" cy="8.5" r="4"/><path d="M4 20.5c1.4-4 4.4-6 8-6s6.6 2 8 6"/>'
};
var GRUPOS=[
  ['Eventos',[['plan','Planejar evento','tab'],['base','Base de eventos','tab'],['ana','Analytics','view']]],
  ['Recursos',[['conv','Convidados','tab'],['salas','Salas','tab'],['cal','Calendário','tab'],['docs','Documentos','tab']]],
  ['Ajustes',[['par','Parâmetros','tab'],['membros','Membros','go']]]
];
function icone(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+I[k]+'</svg>';}
var main=document.querySelector('main'),hdr=document.querySelector('header.app');
var shell=document.createElement('div');shell.className='shell';
var side=document.createElement('aside');side.className='side';side.id='side';side.setAttribute('aria-label','Menu');
var back=document.createElement('div');back.className='sback';
main.parentNode.insertBefore(shell,main);shell.appendChild(side);shell.appendChild(main);document.body.appendChild(back);
var nav=document.createElement('nav');nav.setAttribute('aria-label','Seções');nav.style.cssText='display:grid;gap:18px';
GRUPOS.forEach(function(g){
  var box=document.createElement('div');box.className='sgroup';
  var h=document.createElement('h4');h.textContent=g[0];box.appendChild(h);
  g[1].forEach(function(it){
    var b=document.createElement('button');b.type='button';b.className='sitem';b.dataset.alvo=it[0];b.dataset.modo=it[2];
    b.innerHTML=icone(it[0]);var sp=document.createElement('span');sp.textContent=it[1];b.appendChild(sp);
    b.addEventListener('click',function(){ir(it[0],it[2]);});
    box.appendChild(b);
  });
  nav.appendChild(box);
});
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
function esconderAna(){var a=$('view-ana');if(a&&!a.hidden){a.hidden=true;}}
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
new MutationObserver(marcar).observe(main,{attributes:true,attributeFilter:['hidden'],subtree:true});
marcar();
/* altura do cabeçalho para o menu grudar logo abaixo dele */
function medir(){if(hdr)document.documentElement.style.setProperty('--hdr',hdr.offsetHeight+'px');}
medir();if(window.ResizeObserver&&hdr)new ResizeObserver(medir).observe(hdr);
window.addEventListener('resize',function(){if(pc()){fechar();aplicarPc();}else hb.setAttribute('aria-expanded',String(side.classList.contains('open')));});
})();
</script>
