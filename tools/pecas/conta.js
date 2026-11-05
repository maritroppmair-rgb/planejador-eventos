<script>
/* ---------- conta: círculo de perfil, menu, Meu perfil, Membros, aparência ---------- */
(function(){
"use strict";
function $(id){return document.getElementById(id);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function cmp(a,b){return String(a||'').localeCompare(String(b||''),'pt-BR',{sensitivity:'base'});}
var THEMEKEY='feashion-tema';
var CARGOS=['Diretor(a)','Coordenador(a)','Membro(a)','Trainee']; /* os que a diretoria pode atribuir */
var ORDEM=['DEV'].concat(CARGOS);
function souDev(){return !!window.__souDev;}
function gestor(){return souDev()||cargoOf(myDoc)==='Diretor(a)';}
/* o que cada cargo pode fazer (igual às regras do Firestore) */
var PODE={
  'DEV':{editar:1,excluir:1,gerir:1},'Diretor(a)':{editar:1,excluir:1,gerir:1},
  'Coordenador(a)':{editar:1,excluir:1,gerir:0},'Membro(a)':{editar:1,excluir:1,gerir:0},
  'Trainee':{editar:1,excluir:0,gerir:0},'':{editar:0,excluir:0,gerir:0}
};
function permissoes(){var c=souDev()?'DEV':cargoOf(myDoc);return PODE[c]||PODE[''];}
function aplicarPermissoes(){
  var p=permissoes(),b=document.body;
  b.classList.toggle('pode-editar',!!p.editar);b.classList.toggle('pode-excluir',!!p.excluir);b.classList.toggle('pode-gerir',!!p.gerir);
  var av=document.getElementById('aviso-perm');
  var msg=!meId?'':!myDoc&&!souDev()?'Crie seu perfil (círculo no canto superior direito). Depois que a diretoria atribuir seu cargo, você poderá editar.':!p.editar?'Você ainda não tem cargo: por enquanto só pode visualizar. A diretoria atribui o cargo na página Membros.':'';
  if(msg){if(!av){av=el('div','aviso-perm');av.id='aviso-perm';av.setAttribute('role','status');var mn=document.querySelector('main');mn.insertBefore(av,mn.firstChild);}av.textContent=msg;}
  else if(av)av.remove();
  var pn=document.getElementById('par-aviso');
  if(!p.gerir){if(!pn){pn=el('p','aviso-perm','Só a diretoria altera os parâmetros. Você pode consultar os valores atuais.');pn.id='par-aviso';var v=document.getElementById('view-par');if(v){var h=v.querySelector('.section-head');v.insertBefore(pn,h?h.nextSibling:v.firstChild);}}}
  else if(pn)pn.remove();
}
var TONES=['#8a0d10','#2b2424','#5e1a1d','#7a5c52','#a8483f'];
var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 20.5c1.4-4 4.4-6 8-6s6.6 2 8 6"/></svg>';
var db=null,meInfo=null,meId=null,members=[],myDoc=null,pendingFoto,pfDirty=false;

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
  $('m-sub').textContent=myDoc?(cargoOf(myDoc)||'Sem cargo'):'Perfil ainda não preenchido';
  $('m-count').textContent=members.length?String(members.length):'';
  $('avbtn').setAttribute('aria-label','Conta de '+myName()+': perfil, membros e aparência');
  aplicarPermissoes();
}

/* Meu perfil (só a equipe de Eventos: nome, apelido, e-mail USP, celular, cargo, semestre de ingresso e foto) */
var FIELDS={nome:'pf-nome',apelido:'pf-apelido',email:'pf-email',telefone:'pf-tel'};
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
function rank(c){var i=ORDEM.indexOf(c);return i<0?9:i;}
function semestres(){var d=new Date(),y=d.getFullYear(),s=d.getMonth()>=6?2:1,out=[];while(y>=2019){out.push(y+'.'+s);if(s===2)s=1;else{s=2;y--;}}return out;}
function fillSelect(sel,first,list,val){
  sel.textContent='';sel.appendChild(new Option(first,''));
  list.forEach(function(x){sel.appendChild(new Option(x,x));});
  if(val&&list.indexOf(val)<0)sel.appendChild(new Option(val,val));
  sel.value=val||'';
}
function pmsg(t,err){var m=$('pfmsg');m.textContent=t;m.classList.toggle('err',!!err);}
function renderPerfil(){
  $('pf-noid').hidden=!!meId||!db;$('pfsave').disabled=!meId||!db;
  $('pf-title').textContent=myDoc?'Meu perfil':'Criar meu perfil';
  $('pfsave').textContent=myDoc?'Salvar perfil':'Criar perfil';
  if(!pfDirty){
    Object.keys(FIELDS).forEach(function(k){var i=$(FIELDS[k]);i.value=(myDoc&&myDoc[k])||'';i.removeAttribute('aria-invalid');});
    $('pf-cargo-ro').textContent=cargoOf(myDoc)||'Ainda sem cargo';
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
  if(bad.length){bad.forEach(function(x){x.setAttribute('aria-invalid','true');});bad[0].focus();
    pmsg(bad.length===1&&msg?msg:'Preencha os campos obrigatórios.'+(msg?' '+msg:''),1);return;}
  var now=new Date().toISOString(),data={};
  Object.keys(FIELDS).forEach(function(k){data[k]=v(FIELDS[k]);});
  data.email=data.email.toLowerCase();data.cargo=(myDoc&&myDoc.cargo)||(souDev()?'DEV':'');data.entrada=v('pf-entrada');
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
function card(m){
  var c=el('article','mcard'+(m.id===meId?' me':''));
  var top=el('div','mtop'),av=el('span','av md');fillAvatar(av,m,null);top.appendChild(av);
  var t=el('div','mt');t.appendChild(el('b',null,m.nome||'Sem nome'));
  var cg=cargoOf(m);t.appendChild(cg==='DEV'?el('span','chip dev','DEV'):el('small',null,cg||'Sem cargo'));
  if(m.id===meId)t.appendChild(el('span','chip neutral you','você'));
  top.appendChild(t);c.appendChild(top);
  var meta=[];if(m.apelido&&m.apelido!==m.nome)meta.push('Prefere “'+m.apelido+'”');if(m.entrada)meta.push('Na Feashion desde '+m.entrada);
  if(meta.length)c.appendChild(el('p','mmeta',meta.join(' · ')));
  var lk=el('div','dlinks');
  if(m.email&&/^[^\s@"<>]+@[^\s@"<>]+$/.test(m.email)){var a=el('a',null,'E-mail');a.href='mailto:'+m.email;a.title=m.email;lk.appendChild(a);}
  var ph=String(m.telefone||'').replace(/\D/g,'');
  if(ph.length>=10&&ph.length<=13){if(ph.length<=11)ph='55'+ph;var w=el('a',null,'WhatsApp');w.href='https://wa.me/'+ph;w.target='_blank';w.rel='noopener';lk.appendChild(w);}
  if(lk.childNodes.length)c.appendChild(lk);
  /* cargo: só a diretoria (e o DEV) atribui; o DEV não aparece como opção e só o próprio DEV mexe no cargo dele */
  var protegido=cg==='DEV'&&!souDev();
  if(m.id!==meId&&!protegido){
    var foot=el('div','mfoot');
    if(gestor()){
      var at=el('button','btn small','Atribuir cargo');at.type='button';
      at.addEventListener('click',function(){
        var box=el('div','mcargo'),s=el('select');s.setAttribute('aria-label','Cargo de '+(m.nome||'membro'));
        s.appendChild(new Option('Sem cargo',''));CARGOS.forEach(function(x){s.appendChild(new Option(x,x));});s.value=CARGOS.indexOf(cg)>=0?cg:'';
        var ok=el('button','btn small','Salvar');ok.type='button';var no=el('button','btn small ghost','Cancelar');no.type='button';var ms=el('span','msg');
        ok.addEventListener('click',function(){ok.disabled=true;db.doc('membros/'+m.id).update({cargo:s.value,cargoPor:meId,cargoEm:new Date().toISOString()}).catch(function(){ms.textContent='Não foi possível salvar.';ok.disabled=false;});});
        no.addEventListener('click',function(){renderMembros();});
        box.appendChild(s);box.appendChild(ok);box.appendChild(no);box.appendChild(ms);foot.replaceChild(box,at);s.focus();
      });
      foot.appendChild(at);
    }
    var del=el('button','btn small ghost del-membro','Excluir');del.type='button';
    del.addEventListener('click',function(){
      if(!del.dataset.sure){del.dataset.sure='1';del.textContent='Confirmar exclusão';clearTimeout(del._t);del._t=setTimeout(function(){delete del.dataset.sure;del.textContent='Excluir';},5000);return;}
      db.doc('membros/'+m.id).delete().catch(function(){});
    });
    foot.appendChild(del);c.appendChild(foot);
  }
  return c;
}
function renderMembros(){
  var sel=$('mfilter'),cur=sel.value,extra={};
  members.forEach(function(m){var c=cargoOf(m);if(c&&CARGOS.indexOf(c)<0)extra[c]=1;});
  var opts=CARGOS.concat(Object.keys(extra).sort(function(a,b){return rank(a)-rank(b);}));
  if(members.some(function(m){return !cargoOf(m);}))opts.push('Sem cargo');
  sel.textContent='';sel.appendChild(new Option('Todos os cargos',''));
  opts.forEach(function(c){sel.appendChild(new Option(c,c));});
  sel.value=opts.indexOf(cur)>=0?cur:'';
  var fc=sel.value,q=$('msearch').value.toLowerCase().trim();
  var rows=members.filter(function(m){
    if(fc&&(cargoOf(m)||'Sem cargo')!==fc)return false;if(!q)return true;
    return [m.nome,m.apelido,m.email,cargoOf(m)].join(' ').toLowerCase().indexOf(q)>=0;
  }).sort(function(a,b){return rank(cargoOf(a))-rank(cargoOf(b))||cmp(a.nome,b.nome);});
  $('mcount').textContent=members.length?(rows.length===members.length?members.length+(members.length===1?' membro':' membros'):rows.length+' de '+members.length):'';
  var list=$('mlist');list.textContent='';
  if(!db){list.appendChild(el('p','empty','Sem base conectada.'));return;}
  if(!members.length){list.appendChild(el('p','empty','Ninguém criou perfil ainda. Comece pelo seu: clique no círculo no canto superior direito e em Meu perfil.'));return;}
  if(!rows.length){list.appendChild(el('p','empty','Nenhum membro encontrado.'));return;}
  rows.forEach(function(m){list.appendChild(card(m));});
}
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
      if(myDoc&&!getTheme()&&(myDoc.tema==='light'||myDoc.tema==='dark'))applyTheme(myDoc.tema);
      renderMe();
      if(!$('view-membros').hidden)renderMembros();
      if(!$('view-perfil').hidden)renderPerfil();
    },function(){});
  }).catch(function(){renderMe();});
}
})();
</script>
