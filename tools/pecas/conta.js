<script>
/* ---------- conta: círculo de perfil, menu, Meu perfil, Membros, aparência ---------- */
(function(){
"use strict";
function $(id){return document.getElementById(id);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function cmp(a,b){return String(a||'').localeCompare(String(b||''),'pt-BR',{sensitivity:'base'});}
var THEMEKEY='feashion-tema';
/* ---------- áreas, hierarquia e permissões (iguais às regras do Firestore: firestore.rules) ----------
   Cada pessoa escolhe as áreas no perfil; a diretoria da área atribui o cargo nela. A presidência fica fora das áreas.
   Hierarquia: DEV > Presidente > Vice-presidente > Diretor(a) > Coordenador(a) > Membro(a) > Trainee > Sem cargo.
   Acesso total a todas as áreas: DEV, Presidente, Vice-presidente e Diretor(a) de Eventos (no mesmo nível da Vice).
   Só quem está acima muda o cargo de quem está abaixo. */
var AREAS=['Eventos','Financeiro','RH','C&D','Marketing'];
var CARGOS=['Diretor(a)','Coordenador(a)','Membro(a)','Trainee'];
var PRES=['Presidente','Vice-presidente'];
var NIVEL={'DEV':0,'Presidente':1,'Vice-presidente':2,'Diretor(a)':3,'Coordenador(a)':4,'Membro(a)':5,'Trainee':6};
function nv(c){return Object.prototype.hasOwnProperty.call(NIVEL,c)?NIVEL[c]:7;}
function tem(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function souDev(){return !!window.__souDev;}
function ehDevM(m){return !!m&&m.cargo==='DEV';}
function presOf(m){var p=m&&m.presidencia;return PRES.indexOf(p)>=0?p:'';}
/* áreas do perfil ({Eventos:'Diretor(a)', RH:''}); perfis antigos, sem áreas, são de Eventos com o cargo que tinham */
function areasOf(m){
  var out={};if(!m)return out;
  if(m.areas&&typeof m.areas==='object'){AREAS.forEach(function(a){if(tem(m.areas,a))out[a]=CARGOS.indexOf(m.areas[a])>=0?m.areas[a]:'';});return out;}
  var c=cargoOf(m);if(c==='DEV')return out;
  out.Eventos=CARGOS.indexOf(c)>=0?c:'';return out;
}
function valores(o){return Object.keys(o).map(function(k){return o[k];});}
function topo(m){if(ehDevM(m))return 0;return Math.min.apply(null,[nv(presOf(m))].concat(valores(areasOf(m)).map(nv)));}
/* acesso geral: DEV, presidência e Diretor(a) de Eventos (este vale como a Vice-presidência) */
function nivelG(m){return Math.min(nv(presOf(m)),areasOf(m).Eventos==='Diretor(a)'?2:7);}
function meuG(){return souDev()?0:nivelG(myDoc);}
function meuCargoEm(a){var ar=areasOf(myDoc);return tem(ar,a)?ar[a]:null;}
function diretorAlgum(){return meuG()<=2||valores(areasOf(myDoc)).indexOf('Diretor(a)')>=0;}
/* o que eu posso fazer numa área ('Comum' = Documentos: vale o melhor cargo em qualquer área) */
function podeEm(a){
  if(meuG()<=2)return {ver:1,editar:1,excluir:1,gerir:1};
  var n;
  if(a==='Comum'){n=Math.min.apply(null,[7].concat(valores(areasOf(myDoc)).map(nv)));return {ver:1,editar:n<=6?1:0,excluir:n<=5?1:0,gerir:0};}
  var c=meuCargoEm(a);
  if(c==null)return {ver:diretorAlgum()?1:0,editar:0,excluir:0,gerir:0}; /* diretoria de outra área só lê */
  n=nv(c);return {ver:1,editar:n<=6?1:0,excluir:n<=5?1:0,gerir:n<=3?1:0};
}
/* estou acima do cargo c na área a? (presidência vale em todas; diretoria só na própria área) */
function souAcima(a,c){return meuG()<nv(c)||(meuCargoEm(a)==='Diretor(a)'&&3<nv(c));}
function opcoesArea(m,a){
  var ar=areasOf(m);if(m.id===meId||ehDevM(m)||!tem(ar,a)||!souAcima(a,ar[a])||!souAcima(a,presOf(m)))return null;
  return [''].concat(CARGOS).filter(function(c){return souAcima(a,c);});
}
function opcoesPres(m){
  if(m.id===meId||ehDevM(m)||meuG()>1||!(meuG()<nv(presOf(m))))return null;
  return [''].concat(PRES).filter(function(c){return !c||meuG()<nv(c);});
}
function podeRemover(m){
  if(!m||m.id===meId||ehDevM(m)||!diretorAlgum())return false;
  if(presOf(m)&&!(meuG()<nv(presOf(m))))return false;
  var ar=areasOf(m);return Object.keys(ar).every(function(a){return souAcima(a,ar[a]);});
}
var carregado=false;
function aplicarPermissoes(){
  var pe=podeEm('Eventos'),pc=podeEm('Comum'),b=document.body;
  b.classList.toggle('pode-editar',!!pe.editar);b.classList.toggle('pode-excluir',!!pe.excluir);b.classList.toggle('pode-gerir',!!pe.gerir);
  b.classList.toggle('pode-docs-editar',!!pc.editar);b.classList.toggle('pode-docs-excluir',!!pc.excluir);b.classList.toggle('pode-governo',diretorAlgum());
  var av=document.getElementById('aviso-perm'),ar=areasOf(myDoc),ks=Object.keys(ar);
  var msg=!meId||!carregado||meuG()<=2?'':!myDoc?'Crie seu perfil (círculo no canto superior direito) e escolha sua área. Depois a diretoria da área atribui seu cargo.':
    !ks.length?'Escolha sua área em Meu perfil. Depois a diretoria da área atribui seu cargo.':
    ks.every(function(a){return !ar[a];})?'Você ainda não tem cargo: por enquanto só pode visualizar. A diretoria da sua área atribui o cargo na página Membros.':'';
  if(msg){if(!av){av=el('div','aviso-perm');av.id='aviso-perm';av.setAttribute('role','status');var mn=document.querySelector('main');mn.insertBefore(av,mn.firstChild);}av.textContent=msg;}
  else if(av)av.remove();
  var pn=document.getElementById('par-aviso');
  if(!pe.gerir){if(!pn){pn=el('p','aviso-perm','Só a diretoria de Eventos e a presidência alteram os parâmetros. Você pode consultar os valores atuais.');pn.id='par-aviso';var v=document.getElementById('view-par');if(v){var h=v.querySelector('.section-head');v.insertBefore(pn,h?h.nextSibling:v.firstChild);}}}
  else if(pn)pn.remove();
  if(carregado)document.dispatchEvent(new CustomEvent('permissoes'));
}
window.__perm={
  carregado:function(){return carregado;},podeEm:podeEm,diretorAlgum:diretorAlgum,
  /* áreas que estão no meu perfil (o seletor do topo abre nelas primeiro) */
  minhas:function(){return Object.keys(areasOf(myDoc));},
  /* etapas do evento: quem marca cada uma */
  cargoEm:function(a){return meuCargoEm(a)||'';},presidencia:function(){return presOf(myDoc);},dev:souDev,geral:function(){return meuG()<=2;},
  /* lixeira: presidência e DEV restauram tudo; a diretoria só o que é da própria área */
  podeRestaurar:function(area){return meuG()<=2||(area!=='Comum'&&meuCargoEm(area)==='Diretor(a)')||(area==='Comum'&&valores(areasOf(myDoc)).indexOf('Diretor(a)')>=0);}
};
var TONES=['#8a0d10','#2b2424','#5e1a1d','#7a5c52','#a8483f'];
var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 20.5c1.4-4 4.4-6 8-6s6.6 2 8 6"/></svg>';
var db=null,meInfo=null,meId=null,members=[],myDoc=null,pendingFoto,pfDirty=false,migrou=false;

function tone(k){var h=0;k=String(k||'');for(var i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;return TONES[h%TONES.length];}
function initials(n){var p=String(n||'').trim().split(/\s+/).filter(Boolean);if(!p.length)return '';return (p[0][0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase();}
function okFoto(f){return typeof f==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(f);}
function fillAvatar(box,m,fallbackUrl){
  box.textContent='';box.style.background='';
  var f=m&&m.foto;
  if(okFoto(f)){var i=el('img');i.src=f;i.alt='';box.appendChild(i);return;}
  if(!m&&fallbackUrl){var j=el('img');j.src=fallbackUrl;j.alt='';box.appendChild(j);return;}
  var ini=initials(m&&m.nome);
  if(!ini){box.innerHTML=ICON;return;}
  box.style.background=tone(m.id||m.nome);box.textContent=ini;
}

/* aparência: preferência de cada pessoa (neste aparelho e no perfil) */
function getTheme(){try{return localStorage.getItem(THEMEKEY)||'';}catch(e){return '';}}
function applyTheme(v){
  var r=document.documentElement;
  if(v==='light'||v==='dark')r.setAttribute('data-theme',v);else r.removeAttribute('data-theme');
  var cur=(v==='light'||v==='dark')?v:'auto';
  document.querySelectorAll('[data-themeopt]').forEach(function(b){b.setAttribute('aria-checked',String(b.getAttribute('data-themeopt')===cur));});
}
function setTheme(v){
  if(v!=='light'&&v!=='dark')v='';
  try{if(v)localStorage.setItem(THEMEKEY,v);else localStorage.removeItem(THEMEKEY);}catch(e){}
  applyTheme(v);
  if(db&&meId&&myDoc)db.doc('membros/'+meId).update({tema:v||'auto'}).catch(function(){});
}
applyTheme(getTheme());
document.querySelectorAll('[data-themeopt]').forEach(function(b){b.addEventListener('click',function(){setTheme(b.getAttribute('data-themeopt'));});});

/* telas fora das abas */
var VIEWS=['plan','base','conv','salas','cal','par','docs'];
function showView(v){
  VIEWS.forEach(function(t){var s=$('view-'+t);if(s)s.hidden=true;});
  document.querySelectorAll('.tabs button').forEach(function(x){x.setAttribute('aria-selected','false');});
  $('view-perfil').hidden=(v!=='perfil');$('view-membros').hidden=(v!=='membros');
  closeMenu();window.scrollTo(0,0);
  if(v==='perfil')renderPerfil();else renderMembros();
}
document.querySelectorAll('.tabs button').forEach(function(b){b.addEventListener('click',function(){$('view-perfil').hidden=true;$('view-membros').hidden=true;});});

/* menu do círculo */
function openMenu(){$('acctmenu').hidden=false;$('avbtn').setAttribute('aria-expanded','true');var f=$('acctmenu').querySelector('.mitem');if(f)f.focus();}
function closeMenu(){if($('acctmenu').hidden)return;$('acctmenu').hidden=true;$('avbtn').setAttribute('aria-expanded','false');}
$('avbtn').addEventListener('click',function(e){e.stopPropagation();if($('acctmenu').hidden)openMenu();else closeMenu();});
document.addEventListener('click',function(e){if(!$('acctmenu').hidden&&!$('acctmenu').contains(e.target))closeMenu();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('acctmenu').hidden){closeMenu();$('avbtn').focus();}});
document.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){showView(b.getAttribute('data-go'));});});

function myName(){return myDoc?(myDoc.apelido||myDoc.nome):((meInfo&&meInfo.name)||'Você');}
function renderMe(){
  var fb=meInfo&&meInfo.id?meInfo.avatarUrl:null;
  fillAvatar($('avbtn'),myDoc,fb);fillAvatar($('m-av'),myDoc,fb);
  $('m-nome').textContent=myName();
  $('m-sub').textContent=myDoc?resumo(myDoc):'Perfil ainda não preenchido';
  var nVis=membrosVisiveis().length;$('m-count').textContent=nVis?String(nVis):'';
  $('avbtn').setAttribute('aria-label','Conta de '+myName()+': perfil, membros e aparência');
  aplicarPermissoes();
}

/* Meu perfil (só a equipe de Eventos: nome, apelido, e-mail USP, celular, cargo, semestre de ingresso e foto) */
var FIELDS={nome:'pf-nome',apelido:'pf-apelido',email:'pf-email',telefone:'pf-tel'};
/* celular no padrão (11) 91234-5678: a pessoa digita só os números e a máscara se ajusta */
function telDig(t){var d=String(t||'').replace(/\D/g,'');if(d.length>11&&d.indexOf('55')===0)d=d.slice(2);return d.slice(0,11);}
function fmtTel(t){var d=telDig(t);if(!d)return '';if(d.length<=2)return '('+d;var r=d.slice(2),o='('+d.slice(0,2)+') ';
  if(r.length<=4)return o+r;if(d.length<11)return o+r.slice(0,4)+'-'+r.slice(4);return o+r.slice(0,5)+'-'+r.slice(5);}
function telMostrar(t){var d=telDig(t);return d.length===10||d.length===11?fmtTel(d):String(t||'');}
window.fmtTel=fmtTel;
(function(){var i=$('pf-tel');if(!i)return;var ant='';
  i.setAttribute('inputmode','numeric');i.setAttribute('autocomplete','tel-national');i.maxLength=15;
  i.addEventListener('focus',function(){ant=telDig(i.value);});
  i.addEventListener('input',function(e){var d=telDig(i.value);
    if(e.inputType&&e.inputType.indexOf('delete')===0&&d===ant&&d)d=d.slice(0,-1); /* apagou só o ")" ou o "-": apaga o número antes */
    ant=d;i.value=fmtTel(d);i.removeAttribute('aria-invalid');});
})();
/* cargo do membro; aceita perfis salvos no formato anterior (lista de diretorias) */
function cargoOf(m){
  if(!m)return '';
  if(m.cargo)return String(m.cargo);
  if(Array.isArray(m.diretorias)){
    var ev=m.diretorias.filter(function(d){return d&&d.nome==='Eventos';})[0]||m.diretorias[0];
    if(ev&&ev.cargo)return String(ev.cargo);
  }
  return '';
}
/* "Presidente", "Eventos · Diretor(a)" */
function papeis(m){if(ehDevM(m))return ['DEV'];var out=[],p=presOf(m),ar=areasOf(m);if(p)out.push(p);AREAS.forEach(function(a){if(tem(ar,a))out.push(a+' · '+(ar[a]||'Sem cargo'));});return out;}
function resumo(m){return papeis(m).join(', ')||'Sem área';}
function semestres(){var d=new Date(),y=d.getFullYear(),s=d.getMonth()>=6?2:1,out=[];while(y>=2019){out.push(y+'.'+s);if(s===2)s=1;else{s=2;y--;}}return out;}
function fillSelect(sel,first,list,val){
  sel.textContent='';sel.appendChild(new Option(first,''));
  list.forEach(function(x){sel.appendChild(new Option(x,x));});
  if(val&&list.indexOf(val)<0)sel.appendChild(new Option(val,val));
  sel.value=val||'';
}
function renderAreasPerfil(){
  var box=$('pf-alist'),ar=areasOf(myDoc),p=presOf(myDoc);box.textContent='';
  if(ehDevM(myDoc)||p)box.appendChild(el('p','cargo-ro',ehDevM(myDoc)?'DEV':p));
  AREAS.forEach(function(a){
    var lb=el('label','pf-a'),ck=el('input');ck.type='checkbox';ck.value=a;ck.checked=tem(ar,a);
    lb.appendChild(ck);lb.appendChild(el('span',null,a));
    if(tem(ar,a))lb.appendChild(el('small',null,ar[a]||'sem cargo ainda'));
    box.appendChild(lb);
  });
}
$('pf-alist').addEventListener('change',function(){pfDirty=true;});
function pmsg(t,err){var m=$('pfmsg');m.textContent=t;m.classList.toggle('err',!!err);}
function renderPerfil(){
  $('pf-noid').hidden=!!meId||!db;$('pfsave').disabled=!meId||!db;
  $('pf-title').textContent=myDoc?'Meu perfil':'Criar meu perfil';
  $('pfsave').textContent=myDoc?'Salvar perfil':'Criar perfil';
  if(!pfDirty){
    Object.keys(FIELDS).forEach(function(k){var i=$(FIELDS[k]);i.value=(myDoc&&myDoc[k])||'';if(k==='telefone')i.value=telMostrar(i.value);i.removeAttribute('aria-invalid');});
    renderAreasPerfil();
    fillSelect($('pf-entrada'),'Escolha o semestre',semestres(),myDoc&&myDoc.entrada);
    $('pf-entrada').removeAttribute('aria-invalid');
    pendingFoto=undefined;
  }
  var shown=pendingFoto!==undefined?(pendingFoto?{foto:pendingFoto}:{nome:$('pf-nome').value,id:meId}):(myDoc||null);
  fillAvatar($('pf-av'),shown,null);
  $('pf-rmfoto').hidden=!(shown&&okFoto(shown.foto));
  if(!db)pmsg('Sem base conectada: nada é salvo.',1);
}
document.querySelectorAll('#pfform input').forEach(function(i){i.addEventListener('input',function(){pfDirty=true;i.removeAttribute('aria-invalid');});});
document.querySelectorAll('#pfform select').forEach(function(s){s.addEventListener('change',function(){pfDirty=true;s.removeAttribute('aria-invalid');});});
$('pf-fotolbl').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();$('pf-foto').click();}});
$('pf-foto').addEventListener('change',function(){
  var f=this.files&&this.files[0];this.value='';if(!f)return;
  if(!/^image\//.test(f.type)){pmsg('Escolha uma imagem (JPG ou PNG).',1);return;}
  var img=new Image(),url=URL.createObjectURL(f);
  img.onload=function(){
    var s=Math.min(img.naturalWidth,img.naturalHeight),c=document.createElement('canvas');c.width=c.height=256;
    var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);
    x.drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,256,256);URL.revokeObjectURL(url);
    pendingFoto=c.toDataURL('image/jpeg',0.85);pfDirty=true;
    fillAvatar($('pf-av'),{foto:pendingFoto},null);$('pf-rmfoto').hidden=false;
    pmsg(myDoc?'Foto pronta: clique em Salvar perfil.':'Foto pronta: preencha os campos obrigatórios e clique em Criar perfil.');
  };
  img.onerror=function(){URL.revokeObjectURL(url);pmsg('Não consegui abrir essa imagem.',1);};
  img.src=url;
});
$('pf-rmfoto').addEventListener('click',function(){pendingFoto='';pfDirty=true;fillAvatar($('pf-av'),{nome:$('pf-nome').value,id:meId},null);$('pf-rmfoto').hidden=true;pmsg('Foto removida: clique em Salvar perfil.');});
$('pfform').addEventListener('submit',function(e){
  e.preventDefault();
  if(!db||!meId){pmsg('Sem base ou sem conta identificada: o perfil não pode ser salvo.',1);return;}
  function v(id){return $(id).value.trim();}
  var bad=[],msg='';
  if(!v('pf-nome'))bad.push($('pf-nome'));
  if(!/^[^\s@]+@usp\.br$/i.test(v('pf-email'))){bad.push($('pf-email'));if(v('pf-email'))msg='Use o e-mail USP (termina em @usp.br).';}
  if(!v('pf-entrada'))bad.push($('pf-entrada'));
  var tl=telDig(v('pf-tel'));if(v('pf-tel')&&tl.length!==10&&tl.length!==11){bad.push($('pf-tel'));msg=(msg?msg+' ':'')+'Celular com DDD, no formato (11) 91234-5678.';}
  if(bad.length){bad.forEach(function(x){x.setAttribute('aria-invalid','true');});bad[0].focus();
    pmsg(bad.length===1&&msg?msg:'Preencha os campos obrigatórios.'+(msg?' '+msg:''),1);return;}
  var now=new Date().toISOString(),data={};
  Object.keys(FIELDS).forEach(function(k){data[k]=v(FIELDS[k]);});
  data.telefone=fmtTel(data.telefone);
  data.email=data.email.toLowerCase();data.cargo=(myDoc&&myDoc.cargo)||(souDev()?'DEV':'');data.entrada=v('pf-entrada');
  /* áreas: quem entra numa área entra sem cargo; quem sai perde o cargo nela. Presidência e cargos não mudam aqui. */
  var antes=areasOf(myDoc);data.areas={};
  [].forEach.call($('pf-alist').querySelectorAll('input:checked'),function(ck){data.areas[ck.value]=tem(antes,ck.value)?antes[ck.value]:'';});
  data.presidencia=presOf(myDoc);
  if(myDoc&&myDoc.cargoPor){data.cargoPor=myDoc.cargoPor;data.cargoEm=myDoc.cargoEm||'';}
  var dup=members.filter(function(m){return m.id!==meId&&String(m.email||'').toLowerCase()===data.email;})[0];
  if(dup){$('pf-email').setAttribute('aria-invalid','true');pmsg('Esse e-mail já está no perfil de '+(dup.nome||'outro membro')+'.',1);return;}
  data.foto=pendingFoto!==undefined?pendingFoto:((myDoc&&okFoto(myDoc.foto))?myDoc.foto:'');
  data.tema=getTheme()||'auto';
  data.criadoEm=(myDoc&&myDoc.criadoEm)||now;data.atualizadoEm=now;
  $('pfsave').disabled=true;pmsg('Salvando…');
  db.doc('membros/'+meId).set(data).then(function(){pendingFoto=undefined;pfDirty=false;pmsg('Perfil salvo.');})
    .catch(function(){pmsg('Não foi possível salvar. Tente de novo.',1);})
    .then(function(){$('pfsave').disabled=false;});
});

/* Membros */
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var CCH={'DEV':'neutral','Diretor(a)':'wine','Coordenador(a)':'ok','Membro(a)':'ok','Trainee':'warn','':'neutral'};
function zap(m){var ph=String(m.telefone||'').replace(/\D/g,'');if(ph.length<10||ph.length>13)return '';if(ph.length<=11)ph='55'+ph;return 'https://wa.me/'+ph;}
var mSel={};
function segCargo(k,opts,cur,rot){return '<div class="seg tseg" role="group" aria-label="'+esc(rot)+'" data-mk="'+esc(k)+'">'+opts.map(function(c){return '<button type="button" data-cg="'+esc(c)+'" aria-pressed="'+(c===cur)+'"'+(c===cur?' class="on"':'')+'>'+esc(c||(k==='__p'?'Nenhuma':'Sem cargo'))+'</button>';}).join('')+'</div>';}
function mPainel(id){var m=members.filter(function(x){return x.id===id;})[0];if(!m)return null;
  var em=m.email&&/^[^\s@"<>]+@[^\s@"<>]+$/.test(m.email)?m.email:'',z=zap(m),eu=m.id===meId;
  var info='<div class="tmem"><span class="av md tp-av"></span><dl class="kv">'+
    '<dt>Como prefere ser chamado(a)</dt><dd>'+esc(m.apelido||'—')+'</dd><dt>Na Feashion desde</dt><dd>'+esc(m.entrada||'—')+'</dd>'+
    '<dt>E-mail</dt><dd>'+(em?'<a href="mailto:'+esc(em)+'">'+esc(em)+'</a>':'—')+'</dd><dt>Celular</dt><dd>'+(m.telefone?esc(telMostrar(m.telefone))+(z?' · <a href="'+esc(z)+'" target="_blank" rel="noopener">WhatsApp</a>':''):'—')+'</dd></dl></div>';
  var cargo='',edita=false;
  if(ehDevM(m))cargo='<p class="note" style="margin:0">Cargo técnico, só do Pedro. Ninguém altera.</p>';
  else{
    var p=presOf(m),po=opcoesPres(m),ar=areasOf(m);
    if(po){edita=true;cargo+='<div class="mrole"><h5>Presidência</h5>'+segCargo('__p',po,tem(mSel,'__p')?mSel.__p:p,'Presidência de '+(m.nome||'membro'))+'</div>';}
    else if(p)cargo+='<div class="mrole"><h5>Presidência</h5><span class="chip wine">'+esc(p)+'</span></div>';
    AREAS.forEach(function(a){if(!tem(ar,a))return;var op=opcoesArea(m,a);
      cargo+='<div class="mrole"><h5>'+esc(a)+'</h5>'+(op?segCargo(a,op,tem(mSel,a)?mSel[a]:ar[a],'Cargo em '+a):'<span class="chip '+(CCH[ar[a]]||'neutral')+'">'+esc(ar[a]||'Sem cargo')+'</span>')+'</div>';
      if(op)edita=true;});
    if(!p&&!Object.keys(ar).length)cargo+='<p class="note" style="margin:0">'+(eu?'Você ainda não escolheu nenhuma área. Escolha em Meu perfil.':'Ainda não escolheu nenhuma área no perfil.')+'</p>';
    if(edita)cargo+='<p class="note" style="margin:8px 0 0">Sem cargo = só vê a área. Diretor(a) faz tudo na área e atribui cargos; Coordenador(a) e Membro(a) editam e excluem; Trainee edita sem excluir. Você só atribui cargos abaixo do seu.</p>';
    else if(eu)cargo+='<p class="note" style="margin:8px 0 0">Quem muda o seu cargo é a diretoria da área ou a presidência.</p>';
  }
  var corpo='<div class="tp-blk">'+info+'</div><div class="tp-blk"><h4>Áreas e cargos</h4>'+cargo+'</div>';
  var rod='<div class="btns">'+(edita?'<button type="button" class="btn" id="m-salvar">Salvar cargos</button>':'')+(eu?'<button type="button" class="btn ghost" id="m-perfil">Editar meu perfil</button>':'')+'<button type="button" class="btn ghost" data-tclose>Fechar</button><span class="msg" id="m-msg"></span></div>'+
    (podeRemover(m)?'<button type="button" class="btn small ghost tdanger" id="m-del">Tirar do app</button>':'');
  return {titulo:m.nome||'Sem nome',sub:esc(em),corpo:corpo,rodape:rod};}
function mAbrir(id){mSel={};window.painelAbrir({sec:'view-membros',montar:function(){return mPainel(id);},aoFechar:function(){mSel={};},depois:function(dr){
  var m=members.filter(function(x){return x.id===id;})[0];var av=dr.querySelector('.tp-av');if(av&&m)fillAvatar(av,m,null);
  [].forEach.call(dr.querySelectorAll('[data-mk]'),function(sg){sg.addEventListener('click',function(e){var b=e.target.closest('[data-cg]');if(!b)return;mSel[sg.dataset.mk]=b.dataset.cg;[].forEach.call(sg.children,function(x){var on=x===b;x.className=on?'on':'';x.setAttribute('aria-pressed',on);});});});
  var sv=dr.querySelector('#m-salvar');if(sv)sv.addEventListener('click',function(){if(!m)return;sv.disabled=true;
    var ar=areasOf(m),up={cargoPor:meId,cargoEm:new Date().toISOString()};
    Object.keys(mSel).forEach(function(k){if(k==='__p')up.presidencia=mSel.__p;else ar[k]=mSel[k];});up.areas=ar;
    db.doc('membros/'+id).update(up).then(function(){mSel={};var ms=document.getElementById('m-msg');if(ms)ms.textContent='Cargos salvos.';}).catch(function(){sv.disabled=false;var ms=document.getElementById('m-msg');if(ms)ms.textContent='Não foi possível salvar.';});});
  var pf=dr.querySelector('#m-perfil');if(pf)pf.addEventListener('click',function(){window.painelFechar();showView('perfil');});
  var dl=dr.querySelector('#m-del');if(dl)dl.addEventListener('click',function(){if(!dl.dataset.sure){dl.dataset.sure='1';dl.textContent='Confirmar: tirar do app';setTimeout(function(){delete dl.dataset.sure;dl.textContent='Tirar do app';},5000);return;}
    db.doc('membros/'+id).delete().then(function(){window.painelFechar();}).catch(function(){});});
}});}
/* Apresentação: esconde o perfil DEV da tela de Membros. Liga/desliga em config.js (OCULTAR_DEV_EM_MEMBROS). */
function membrosVisiveis(){return window.OCULTAR_DEV_EM_MEMBROS?members.filter(function(m){return cargoOf(m)!=='DEV';}):members;}
function renderMembros(){
  var members=membrosVisiveis();
  var sel=$('mfilter'),cur=sel.value,opts=['Presidência'].concat(AREAS,['Sem área']);
  sel.textContent='';sel.appendChild(new Option('Todas as áreas',''));
  opts.forEach(function(c){sel.appendChild(new Option(c,c));});
  sel.value=opts.indexOf(cur)>=0?cur:'';
  var fc=sel.value,q=$('msearch').value.toLowerCase().trim();
  var rows=members.filter(function(m){
    var ar=areasOf(m);
    if(fc==='Presidência'&&!presOf(m))return false;
    if(fc==='Sem área'&&(ehDevM(m)||presOf(m)||Object.keys(ar).length))return false;
    if(AREAS.indexOf(fc)>=0&&!tem(ar,fc))return false;
    if(!q)return true;
    return [m.nome,m.apelido,m.email,resumo(m)].join(' ').toLowerCase().indexOf(q)>=0;
  }).sort(function(a,b){return topo(a)-topo(b)||cmp(a.nome,b.nome);});
  var sem=members.filter(function(m){return topo(m)===7;}).length;
  $('mcount').textContent=members.length?(rows.length===members.length?members.length+(members.length===1?' membro':' membros'):rows.length+' de '+members.length)+(sem&&diretorAlgum()?' · '+sem+' sem cargo':''):'';
  var list=$('mlist');list.textContent='';list.className='';
  if(!db){list.appendChild(el('p','empty','Sem base conectada.'));return;}
  if(!members.length){list.appendChild(el('p','empty','Ninguém criou perfil ainda. Comece pelo seu: clique no círculo no canto superior direito e em Meu perfil.'));return;}
  var tw=el('div','tablewrap'),t=el('table','tlist'),hd=el('thead'),tr0=el('tr');['Pessoa','Áreas e cargos','Ingresso','Contato'].forEach(function(x){tr0.appendChild(el('th',null,x));});hd.appendChild(tr0);t.appendChild(hd);
  var tb=el('tbody');
  if(!rows.length){var tr=el('tr'),td=el('td','empty','Nenhum membro encontrado.');td.colSpan=4;tr.appendChild(td);tb.appendChild(tr);}
  rows.forEach(function(m){var tr=el('tr');tr.dataset.mopen=m.id;tr.tabIndex=0;
    var c1=el('td'),w=el('div','twho'),av=el('span','av sm');fillAvatar(av,m,null);w.appendChild(av);var tx=el('span');tx.appendChild(el('span','tn',m.nome||'Sem nome'));
    var sb=[];if(m.apelido&&m.apelido!==m.nome)sb.push('“'+m.apelido+'”');if(m.email)sb.push(m.email);tx.appendChild(el('span','tsub',sb.join(' · ')));
    if(m.id===meId)tx.firstChild.appendChild(el('span','chip neutral you',' você'));w.appendChild(tx);c1.appendChild(w);tr.appendChild(c1);
    var c2=el('div','mpapeis'),ar=areasOf(m),p=presOf(m);
    if(ehDevM(m))c2.appendChild(el('span','chip neutral','DEV'));
    if(p)c2.appendChild(el('span','chip wine',p));
    AREAS.forEach(function(a){if(tem(ar,a))c2.appendChild(el('span','chip '+(CCH[ar[a]]||'neutral'),a+' · '+(ar[a]||'Sem cargo')));});
    if(!c2.childNodes.length)c2.appendChild(el('span','chip neutral','Sem área'));
    var td2=el('td');td2.appendChild(c2);tr.appendChild(td2);
    tr.appendChild(el('td',null,m.entrada||'—'));tr.appendChild(el('td',null,m.telefone?telMostrar(m.telefone):'—'));tb.appendChild(tr);});
  t.appendChild(tb);tw.appendChild(t);list.appendChild(tw);
  if(window.painelAtualizar)window.painelAtualizar('view-membros');
}
$('mlist').addEventListener('click',function(e){var tr=e.target.closest('[data-mopen]');if(tr)mAbrir(tr.dataset.mopen);});
$('mlist').addEventListener('keydown',function(e){var tr=e.target.closest('[data-mopen]');if(tr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();mAbrir(tr.dataset.mopen);}});
$('msearch').addEventListener('input',renderMembros);
$('mfilter').addEventListener('change',renderMembros);

/* conexão */
renderMe();
if(window.claude&&window.claude.use){
  Promise.all([window.claude.use('db'),window.claude.use('user')]).then(function(r){
    db=r[0];var u=r[1];return u?u.me():null;
  }).then(function(me){
    meInfo=me;meId=me&&me.id;renderMe();
    if(!db)return;
    db.collection('membros').onSnapshot(function(s){
      members=s.docs.map(function(x){var o=Object.assign({},x.data());o.id=x.id;return o;});
      myDoc=members.filter(function(m){return m.id===meId;})[0]||null;
      carregado=true;
      /* perfis antigos (só cargo) ganham a área Eventos com o mesmo cargo; quem grava é o DEV, sem entrar no histórico */
      if(souDev()&&!migrou){migrou=true;members.forEach(function(m){if(m.areas||ehDevM(m))return;window.__semRegistro=true;db.doc('membros/'+m.id).update({areas:areasOf(m)}).catch(function(){});window.__semRegistro=false;});}
      if(myDoc&&!getTheme()&&(myDoc.tema==='light'||myDoc.tema==='dark'))applyTheme(myDoc.tema);
      renderMe();
      window.__membros=members.map(function(m){return {id:m.id,nome:m.nome||m.email||'Sem nome',apelido:m.apelido||'',areas:areasOf(m)};}).sort(function(a,b){return cmp(a.nome,b.nome);});
      window.__euId=meId;window.__meuNome=(myDoc&&myDoc.nome)||(meInfo&&meInfo.name)||'';
      document.dispatchEvent(new CustomEvent('membros'));
      if(!$('view-membros').hidden)renderMembros();
      if(!$('view-perfil').hidden)renderPerfil();
    },function(){});
  }).catch(function(){renderMe();});
}
})();
</script>
