/* Planejador de Eventos · Feashion
 * Camada de plataforma: liga o app ao Firebase (login Google + Firestore) e expõe
 * a mesma interface que o app usava dentro do Claude (window.claude.use('db' | 'user' | 'assets')).
 * Toda a comunicação com o banco fica aqui: trocar de fornecedor no futuro mexe só neste arquivo.
 */
(function(){
"use strict";
var EMU=/[?&]emulador\b/.test(location.search);
var COLECOES=['eventos','salas','calendario','convidados','listas','documentos','parametros','membros','permitidos','arquivos','perfisImportados','mailing','mailingEnvios','mailingConfig','descadastros','inscricoes','fin_coffee','fin_verbas'];
var saindo=false;
var PARTE=700000; /* caracteres base64 por parte de arquivo (o Firestore aceita até 1 MiB por documento) */

firebase.initializeApp(window.FIREBASE_CONFIG);
var auth=firebase.auth(),fs=firebase.firestore();
if(EMU){auth.useEmulator('http://127.0.0.1:9099',{disableWarnings:true});fs.useEmulator('127.0.0.1',8080);}
else{fs.enablePersistence({synchronizeTabs:true}).catch(function(){});}

var usuario=null,liberado=false,esperando=[];
function quandoLiberado(){return liberado?Promise.resolve():new Promise(function(r){esperando.push(r);});}
function liberar(){liberado=true;esperando.splice(0).forEach(function(r){r();});}

/* ---------- lixeira e histórico ----------
   Toda gravação do app passa por aqui: criar, editar e excluir viram uma linha em "registro" (quem, o quê, quando),
   e o que é excluído de eventos, salas, calendário, convidados e documentos vai antes para a "lixeira". */
var SEM_REGISTRO=['registro','lixeira','arquivos','config','perfisImportados','inscricoes'];
var COM_LIXEIRA=['eventos','salas','calendario','convidados','documentos','fin_coffee','fin_verbas'];
var SO_SISTEMA=['notaData','notaHist','notaClima','climaAvisos','tema','atualizadoEm','editadoEm','cargoPor','cargoEm'];
var PREFIXO={fin:'Financeiro',mkt:'Marketing',cd:'C&D',rh:'RH'};
/* área dona de cada coleção (igual às regras): Documentos, Membros e acesso são de todos; fin_, mkt_, cd_ e rh_ são das outras áreas */
function areaDa(c){if(['documentos','arquivos','membros','permitidos'].indexOf(c)>=0)return 'Comum';var m=/^(fin|mkt|cd|rh)_/.exec(c);return m?PREFIXO[m[1]]:'Eventos';}
window.areaDaColecao=areaDa;
function nomeDe(d){return String(d&&(d.nome||d.titulo||d.n||d.email)||'').slice(0,120);}
var DR=firebase.firestore.DocumentReference.prototype,CR=firebase.firestore.CollectionReference.prototype;
var origSet=DR.set,origUpd=DR.update,origDel=DR.delete,origAdd=CR.add;
function rastreia(ref){var p=ref.path.split('/');return p.length===2&&SEM_REGISTRO.indexOf(p[0])<0;}
function registrar(acao,ref,nome,campos){
  if(!usuario)return Promise.resolve();
  var c=ref.path.split('/')[0],d={acao:acao,colecao:c,docId:ref.id,nome:nome||'',area:areaDa(c),por:usuario.uid,porNome:String(window.__meuNome||usuario.displayName||usuario.email||'').slice(0,80),em:new Date().toISOString()};
  if(campos&&campos.length)d.campos=campos.slice(0,15);
  return origAdd.call(fs.collection('registro'),d).catch(function(){});
}
window.__registrar=function(acao,c,id,nome){return registrar(acao,fs.doc(c+'/'+id),nome);};
function nomeCache(ref,dados){if(dados&&nomeDe(dados))return Promise.resolve(nomeDe(dados));return ref.get({source:'cache'}).then(function(s){return s.exists?nomeDe(s.data()):'';},function(){return '';});}
DR.set=function(dados,op){
  var ref=this;if(window.__semRegistro||!rastreia(ref))return origSet.apply(ref,arguments);
  var antes=ref.get({source:'cache'}).then(function(s){return s.exists;},function(){return false;});
  return origSet.apply(ref,arguments).then(function(r){antes.then(function(ex){return nomeCache(ref,dados).then(function(n){registrar(ex||(op&&op.merge)?'editou':'criou',ref,n,ex?Object.keys(dados||{}).filter(function(k){return SO_SISTEMA.indexOf(k)<0;}):null);});});return r;});
};
DR.update=function(dados){
  var ref=this;if(window.__semRegistro||!rastreia(ref)||typeof dados!=='object')return origUpd.apply(ref,arguments);
  var campos=Object.keys(dados).filter(function(k){return SO_SISTEMA.indexOf(k)<0;});
  if(!campos.length)return origUpd.apply(ref,arguments); /* atualizações automáticas (nota do clima, tema) não entram */
  return origUpd.apply(ref,arguments).then(function(r){nomeCache(ref,null).then(function(n){registrar('editou',ref,n,campos);});return r;});
};
DR.delete=function(){
  var ref=this;if(window.__semRegistro||!rastreia(ref))return origDel.call(ref);
  var c=ref.path.split('/')[0];
  return ref.get().catch(function(){return ref.get({source:'cache'});}).catch(function(){return null;}).then(function(s){
    var dados=s&&s.exists?s.data():null,nome=nomeDe(dados);
    var feito;
    if(dados&&COM_LIXEIRA.indexOf(c)>=0){
      var b=fs.batch();
      b.set(fs.collection('lixeira').doc(),{colecao:c,docId:ref.id,nome:nome,area:areaDa(c),dados:dados,por:usuario?usuario.uid:'',porNome:String(window.__meuNome||(usuario&&usuario.displayName)||'').slice(0,80),em:new Date().toISOString()});
      b.delete(ref);
      /* se as regras novas ainda não estiverem no ar, exclui sem lixeira */
      feito=b.commit().catch(function(e){if(e&&e.code==='permission-denied')return origDel.call(ref);throw e;});
    }else feito=origDel.call(ref);
    return feito.then(function(){registrar('excluiu',ref,nome);});
  });
};
CR.add=function(dados){
  var col=this,sem=window.__semRegistro;
  return origAdd.apply(col,arguments).then(function(ref){if(!sem&&rastreia(ref))registrar('criou',ref,nomeDe(dados));return ref;});
};

/* ---------- arquivos guardados no próprio Firestore, em partes ---------- */
function idNovo(){var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');}
function paraBase64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(',')[1]||'');};r.onerror=rej;r.readAsDataURL(blob);});}
function deBase64(b64,tipo){var bin=atob(b64),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:tipo||'application/octet-stream'});}
var cacheArq={};
var arquivos={
  upload:function(blob,opts){
    var id=idNovo(),tipo=(opts&&opts.type)||blob.type||'application/octet-stream';
    return paraBase64(blob).then(function(b64){
      var partes=[];for(var i=0;i<b64.length;i+=PARTE)partes.push(b64.slice(i,i+PARTE));
      var ref=fs.doc('arquivos/'+id);
      return partes.reduce(function(p,d,i){return p.then(function(){return ref.collection('partes').doc(String(i)).set({d:d});});},Promise.resolve())
        .then(function(){return ref.set({tipo:tipo,tamanho:blob.size,partes:partes.length,criadoEm:new Date().toISOString(),por:usuario&&usuario.email||''});})
        .then(function(){cacheArq[id]=Promise.resolve(blob);return {id:id,url:'/_blob/'+id,sizeBytes:blob.size,contentType:tipo};});
    });
  },
  get:function(id){
    if(cacheArq[id])return cacheArq[id];
    var ref=fs.doc('arquivos/'+id);
    cacheArq[id]=ref.get().then(function(s){
      if(!s.exists)throw new Error('arquivo não encontrado');
      var h=s.data(),ps=[];for(var i=0;i<h.partes;i++)ps.push(ref.collection('partes').doc(String(i)).get());
      return Promise.all(ps).then(function(docs){return deBase64(docs.map(function(d){return d.exists?d.data().d:'';}).join(''),h.tipo);});
    });
    cacheArq[id].catch(function(){delete cacheArq[id];});
    return cacheArq[id];
  }
};
window.__arquivos=arquivos;
window.PDFJS_BASE='vendor/';

/* ---------- a mesma interface que o app usava no Claude ---------- */
var userApi={
  me:function(){var u=usuario;return Promise.resolve({id:u?u.uid:null,name:u&&u.displayName||'',avatarUrl:u&&u.photoURL||'',color:'#8a0d10',email:u&&u.email||null,isOwner:false,canEdit:true});},
  id:function(){return Promise.resolve(usuario?usuario.uid:null);},
  isOwner:function(){return Promise.resolve(false);},
  canEdit:function(){return Promise.resolve(true);},
  can:function(){return Promise.resolve(true);}
};
window.claude={use:function(nome){
  return quandoLiberado().then(function(){
    if(nome==='db')return fs;
    if(nome==='user')return userApi;
    if(nome==='assets')return arquivos;
    return null;
  });
}};

/* ---------- tela de entrada ---------- */
var CSS='.gate{position:fixed;inset:0;z-index:100;background:#000;color:#f1eee8;display:grid;place-items:center;padding:24px;font-family:var(--body,system-ui)}'+
'.gate .gbox{width:min(420px,100%);display:grid;gap:18px;justify-items:center;text-align:center}'+
'.gate img{width:200px;height:auto}.gate h1{font-family:var(--display,Georgia,serif);font-size:26px;font-weight:600;color:#f1eee8;margin:0}'+
'.gate .sub{font-family:var(--label,Arial);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#b8b0a7}'+
'.gate .gline{width:60px;height:3px;background:#8a0d10}'+
'.gate button{border:0;border-radius:999px;padding:12px 22px;font-family:var(--label,Arial);font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;background:#f1eee8;color:#000}'+
'.gate button.sec{background:transparent;color:#f1eee8;border:1px solid rgba(241,238,232,.4)}'+
'.gate p{font-size:14px;line-height:1.5;color:#d9d2ca;margin:0}.gate p.err{color:#f08d92;font-weight:700}.gate b{color:#fff}'+
'.acesso{margin-top:24px;display:grid;gap:10px}.acesso form{display:flex;gap:8px;flex-wrap:wrap}.acesso input{flex:1;min-width:200px;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:4px;padding:7px 10px;font:inherit}'+
'.acesso ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}.acesso li{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--line);border-radius:4px;padding:6px 10px;background:var(--surface);overflow-wrap:anywhere}'+
'.acesso li span{font-size:14px}.acesso li small{color:var(--muted);margin-left:6px}';
var gate,gbody;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function montarGate(){
  var st=el('style');st.textContent=CSS;document.head.appendChild(st);
  gate=el('div','gate');gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-label','Entrar no Planejador');
  var box=el('div','gbox'),logo=document.querySelector('.brand img');
  if(logo){var im=el('img');im.src=logo.src;im.alt='Feashion · Liga de Fashion Business';box.appendChild(im);}
  box.appendChild(el('div','gline'));box.appendChild(el('h1',null,'Planejador de Eventos'));box.appendChild(el('div','sub','Diretoria de Eventos'));
  gbody=el('div');gbody.style.cssText='display:grid;gap:14px;justify-items:center';box.appendChild(gbody);
  gate.appendChild(box);document.body.appendChild(gate);
  estado('carregando');
}
function estado(tipo,extra){
  if(!gate)return;
  gate.hidden=false;gbody.textContent='';
  if(tipo==='carregando'){gbody.appendChild(el('p',null,'Carregando…'));return;}
  if(tipo==='entrar'){
    var b=el('button',null,'Entrar com Google');b.type='button';b.addEventListener('click',entrar);gbody.appendChild(b);
    gbody.appendChild(el('p',null,'Use o seu e-mail USP.'));
    if(extra)gbody.appendChild(el('p','err',extra));
    return;
  }
  if(tipo==='negado'){
    var p=el('p');p.appendChild(document.createTextNode('O e-mail '));p.appendChild(el('b',null,extra||''));
    p.appendChild(document.createTextNode(' ainda não tem acesso. Peça para alguém da equipe adicionar você em Membros → Quem pode entrar.'));gbody.appendChild(p);
    var s=el('button','sec','Entrar com outra conta');s.type='button';s.addEventListener('click',function(){auth.signOut();});gbody.appendChild(s);
    return;
  }
  if(tipo==='erro'){gbody.appendChild(el('p','err',extra||'Algo deu errado.'));var r=el('button','sec','Tentar de novo');r.type='button';r.addEventListener('click',function(){location.reload();});gbody.appendChild(r);}
}
function msgErro(e){
  var c=e&&e.code||'';
  if(c==='auth/unauthorized-domain')return 'Este endereço ainda não está autorizado no Firebase. Adicione '+location.hostname+' em Authentication → Configurações → Domínios autorizados.';
  if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return '';
  if(c==='auth/network-request-failed')return 'Sem conexão com a internet.';
  return 'Não foi possível entrar ('+(c||'erro')+').';
}
function entrar(){
  var p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
  auth.signInWithPopup(p).catch(function(e){
    var c=e&&e.code||'';
    if(c==='auth/popup-blocked'||c==='auth/operation-not-supported-in-environment'){auth.signInWithRedirect(p);return;}
    estado('entrar',msgErro(e));
  });
}

/* acesso: só quem está na lista "permitidos" lê e grava (as regras do Firestore garantem isso) */
function aoMudarConta(u){
  if(saindo)return;
  if(liberado&&(!u||!usuario||u.uid!==usuario.uid)){location.reload();return;}
  usuario=u;
  if(!u){estado('entrar');return;}
  var email=String(u.email||'').toLowerCase();
  estado('carregando');
  var ref=fs.doc('permitidos/'+email);
  ref.get().then(function(s){
    if(s.exists)return;
    return ref.set({email:email,adicionadoEm:new Date().toISOString(),por:'primeiro acesso'}); /* só funciona para o e-mail inicial das regras */
  }).then(function(){return ehDev(email);}).then(function(dev){
    window.__souDev=dev;gate.hidden=true;liberar();posEntrada(u,email,dev);
  }).catch(function(e){
    if(e&&e.code==='permission-denied')estado('negado',email);
    else if(e&&e.code==='unavailable')estado('erro','Sem conexão com o banco. Verifique a internet e tente de novo.');
    else estado('erro','Erro ao verificar o acesso ('+(e&&e.code||e)+').');
  });
}

/* ---------- depois de entrar ---------- */
/* quem é o DEV fica no banco (config/dev), não no código público. As regras só deixam o próprio DEV gravar esse documento. */
function ehDev(email){
  var ref=fs.doc('config/dev');
  return ref.get().then(function(s){
    if(s.exists)return String(s.data().email||'').toLowerCase()===email;
    return ref.set({email:email,em:new Date().toISOString()}).then(function(){return true;},function(){return false;});
  }).catch(function(){return false;});
}
function posEntrada(u,email,dev){
  /* perfil vindo do backup da versão no Claude: vira o perfil desta conta no primeiro acesso */
  var meu=fs.doc('membros/'+u.uid),imp=fs.doc('perfisImportados/'+email);
  meu.get().then(function(s){
    if(s.exists){if(dev&&s.data().cargo!=='DEV')return meu.update({cargo:'DEV'});return;}
    return imp.get().then(function(i){if(!i.exists)return;var d=i.data();
    var novo={nome:d.nome||'',apelido:d.apelido||'',email:email,telefone:d.telefone||'',cargo:dev?'DEV':'',entrada:d.entrada||'',foto:d.foto||'',tema:d.tema||'auto',criadoEm:d.criadoEm||new Date().toISOString(),atualizadoEm:new Date().toISOString()};
    return meu.set(novo).then(function(){return imp.delete();});});}).catch(function(){});
  montarSair();montarAcesso(email);montarBackup();
}
/* ao sair, apaga também a cópia dos dados guardada neste navegador (importante em computador compartilhado) */
function sair(){
  saindo=true;
  auth.signOut().catch(function(){}).then(function(){return fs.terminate();}).then(function(){return fs.clearPersistence();}).catch(function(){}).then(function(){location.reload();});
}
function montarSair(){
  var menu=document.getElementById('acctmenu');if(!menu||document.getElementById('m-sair'))return;
  var b=el('button','mitem','Sair');b.type='button';b.id='m-sair';
  var sp=el('span',null,usuario&&usuario.email||'');b.appendChild(sp);
  b.addEventListener('click',sair);
  menu.appendChild(b);
}
function armar(b,txt,orig,fn){
  if(b.dataset.sure){delete b.dataset.sure;b.textContent=orig;fn();return;}
  b.dataset.sure='1';b.textContent=txt;clearTimeout(b._t);b._t=setTimeout(function(){delete b.dataset.sure;b.textContent=orig;},5000);
}
function montarAcesso(meuEmail){
  var view=document.getElementById('view-membros');if(!view||document.getElementById('acesso'))return;
  var sec=el('section','panel acesso');sec.id='acesso';
  sec.appendChild(el('h3',null,'Quem pode entrar'));
  sec.appendChild(el('p','note','Só os e-mails desta lista conseguem abrir o app. Depois de liberada, a pessoa entra com a conta Google desse e-mail e cria o próprio perfil; o cargo é atribuído pela diretoria.'));
  var f=el('form');f.noValidate=true;
  var lb=el('label','sr','E-mail para liberar');lb.htmlFor='pm-email';
  var inp=el('input');inp.type='email';inp.id='pm-email';inp.placeholder='nome@usp.br';inp.autocomplete='off';
  var add=el('button','btn small','Adicionar');add.type='submit';
  var msg=el('span','msg');
  f.appendChild(lb);f.appendChild(inp);f.appendChild(add);f.appendChild(msg);sec.appendChild(f);
  var ul=el('ul');sec.appendChild(ul);view.appendChild(sec);
  f.addEventListener('submit',function(e){
    e.preventDefault();var v=inp.value.trim().toLowerCase();
    if(!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(v)){msg.textContent='Digite um e-mail válido.';return;}
    fs.doc('permitidos/'+v).set({email:v,adicionadoEm:new Date().toISOString(),por:meuEmail}).then(function(){inp.value='';msg.textContent='Liberado.';}).catch(function(){msg.textContent='Não foi possível adicionar.';});
  });
  /* Apresentação: com OCULTAR_DEV_EM_MEMBROS (config.js), o e-mail do DEV também sai desta lista. */
  (window.OCULTAR_DEV_EM_MEMBROS?fs.doc('config/dev').get().then(function(d){return d.exists?String(d.data().email||'').toLowerCase():'';}).catch(function(){return '';}):Promise.resolve('')).then(function(oculto){
  fs.collection('permitidos').onSnapshot(function(s){
    var lista=s.docs.map(function(d){return d.id;}).filter(function(em){return em!==oculto;}).sort();ul.textContent='';
    lista.forEach(function(em){
      var li=el('li'),sp=el('span',null,em);if(em===meuEmail)sp.appendChild(el('small',null,'você'));li.appendChild(sp);
      if(em!==meuEmail){var b=el('button','btn small ghost','Remover');b.type='button';
        b.addEventListener('click',function(){armar(b,'Confirmar remoção','Remover',function(){fs.doc('permitidos/'+em).delete().catch(function(){msg.textContent='Não foi possível remover.';});});});li.appendChild(b);}
      ul.appendChild(li);
    });
  },function(){});
  });
}

/* ---------- backup: exportar e importar tudo em JSON ---------- */
function montarBackup(){
  var view=document.getElementById('view-par');if(!view||document.getElementById('backup'))return;
  var sec=el('div','panel');sec.id='backup';sec.style.marginTop='20px';sec.style.display='grid';sec.style.gap='10px';
  sec.appendChild(el('h3',null,'Backup'));
  sec.appendChild(el('p','note','Exporta todos os dados do app num arquivo, ou importa um arquivo exportado antes. A importação substitui os registros que têm o mesmo identificador e não apaga os outros.'));
  var row=el('div','btns');
  var ex=el('button','btn small ghost','Exportar tudo');ex.type='button';
  var lb=el('label','btn small ghost','Importar backup');lb.htmlFor='bk-file';lb.setAttribute('role','button');lb.tabIndex=0;
  var fi=el('input');fi.type='file';fi.id='bk-file';fi.accept='.json,application/json';fi.className='sr';fi.tabIndex=-1;
  var ok=el('button','btn small','Confirmar importação');ok.type='button';ok.hidden=true;
  var msg=el('span','msg');
  [ex,lb,fi,ok,msg].forEach(function(x){row.appendChild(x);});sec.appendChild(row);view.appendChild(sec);
  lb.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click();}});
  ex.addEventListener('click',function(){
    msg.textContent='Exportando…';ex.disabled=true;
    exportar().then(function(obj){
      var blob=new Blob([JSON.stringify(obj)],{type:'application/json'}),u=URL.createObjectURL(blob),a=el('a');
      a.href=u;a.download='planejador-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},4000);
      msg.textContent='Backup baixado.';
      /* lembrete de backup: guarda quando foi o último */
      window.__semRegistro=true;fs.doc('parametros/backup').set({em:new Date().toISOString(),por:usuario?usuario.uid:'',porNome:String(window.__meuNome||(usuario&&usuario.displayName)||'').slice(0,80)}).catch(function(){});window.__semRegistro=false;
      registrar('exportou',fs.doc('parametros/backup'),'Backup completo');
      document.dispatchEvent(new CustomEvent('backup-feito'));
    }).catch(function(e){msg.textContent='Erro ao exportar ('+(e&&e.message||e)+').';}).then(function(){ex.disabled=false;});
  });
  var pend=null;
  fi.addEventListener('change',function(){
    var f=fi.files&&fi.files[0];fi.value='';if(!f)return;
    f.text().then(function(t){var o=JSON.parse(t);if(!o||!o.colecoes)throw new Error('arquivo não é um backup do Planejador');
      pend=o;var n=0,c=0;Object.keys(o.colecoes).forEach(function(k){if(COLECOES.indexOf(k)<0)return;c++;n+=Object.keys(o.colecoes[k]).length;});
      msg.textContent=n+' registros em '+c+' coleções. Confira e clique em Confirmar importação.';ok.hidden=false;
    }).catch(function(e){pend=null;ok.hidden=true;msg.textContent='Não consegui ler o arquivo: '+(e&&e.message||e)+'.';});
  });
  ok.addEventListener('click',function(){
    if(!pend)return;
    armar(ok,'Clique de novo para importar','Confirmar importação',function(){
      var o=pend;pend=null;ok.hidden=true;msg.textContent='Importando…';
      importar(o,function(f){msg.textContent='Importando… '+Math.round(f*100)+'%';}).then(function(n){msg.textContent=n+' registros importados.';registrar('importou',fs.doc('parametros/backup'),n+' registros');})
        .catch(function(e){msg.textContent='Erro na importação ('+(e&&e.message||e)+'). Parte dos dados pode ter sido gravada; importe de novo.';});
    });
  });
}
function exportar(){
  var out={app:'planejador-feashion',versao:1,exportadoEm:new Date().toISOString(),colecoes:{}};
  return COLECOES.reduce(function(p,c){return p.then(function(){return fs.collection(c).get().then(function(s){
    var col={};out.colecoes[c]=col;
    return Promise.all(s.docs.map(function(d){col[d.id]=d.data();
      if(c!=='arquivos')return;
      return d.ref.collection('partes').get().then(function(ps){var arr=[];ps.docs.forEach(function(x){arr[+x.id]=x.data().d;});col[d.id].__partes=arr;});
    }));
  });});},Promise.resolve()).then(function(){return out;});
}
function importar(o,prog){
  var ops=[];
  COLECOES.forEach(function(c){var col=o.colecoes[c];if(!col)return;Object.keys(col).forEach(function(id){
    var d=Object.assign({},col[id]);
    /* perfis não podem ser gravados por outra pessoa: viram perfis "a reivindicar", que cada um recebe no próximo login */
    if(c==='membros'){if(usuario&&id===usuario.uid)return;var em=String(d.email||'').toLowerCase();if(!em)return;delete d.cargo;ops.push({p:'perfisImportados/'+em,d:d,t:JSON.stringify(d).length});return;}
    if(c==='arquivos'){var ps=d.__partes||[];delete d.__partes;ps.forEach(function(x,i){ops.push({p:'arquivos/'+id+'/partes/'+i,d:{d:x},t:x.length});});d.partes=ps.length;}
    ops.push({p:c+'/'+id,d:d,t:JSON.stringify(d).length});
  });});
  var lotes=[],cur=[],tam=0;
  ops.forEach(function(op){if(cur.length&&(cur.length>=400||tam+op.t>6e6)){lotes.push(cur);cur=[];tam=0;}cur.push(op);tam+=op.t;});
  if(cur.length)lotes.push(cur);
  var feitos=0;
  return lotes.reduce(function(p,l){return p.then(function(){var b=fs.batch();l.forEach(function(op){b.set(fs.doc(op.p),op.d);});
    return b.commit().then(function(){feitos+=l.length;prog(feitos/ops.length);});});},Promise.resolve()).then(function(){return ops.length;});
}

document.addEventListener('DOMContentLoaded',function(){
  montarGate();
  auth.getRedirectResult().catch(function(e){estado('entrar',msgErro(e));});
  auth.onAuthStateChanged(aoMudarConta);
  if('serviceWorker' in navigator&&!EMU&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(function(){});
});
})();
