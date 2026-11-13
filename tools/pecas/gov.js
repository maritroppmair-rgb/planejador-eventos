<script>
/* ---------- governança: Lixeira, Histórico (registro de alterações) e lembrete de backup ----------
   Quem grava a lixeira e o registro é o plataforma.js (em toda exclusão e gravação). Aqui ficam só as telas.
   Lixeira e Histórico: diretoria para cima. Presidência e DEV restauram tudo; a diretoria, só o que é da própria área. */
(function(){
"use strict";
function $(i){return document.getElementById(i);}
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var DIAS_LIXEIRA=30,DIAS_BACKUP=30,PASSO=200;
var TIPO={eventos:'Evento',salas:'Sala',calendario:'Bloqueio do calendário',convidados:'Convidado',documentos:'Documento',membros:'Perfil',permitidos:'Acesso ao app',parametros:'Parâmetros',listas:'Listas de opções',mailing:'Contato do mailing',mailingConfig:'Configuração do mailing',mailingEnvios:'Envio do mailing',descadastros:'Descadastro',fin_coffee:'Contato de coffee',fin_verbas:'Verba de evento',cd_capacitacoes:'Capacitação',cd_trilha:'Etapa da trilha',cd_trilha_prog:'Progresso na trilha',cd_entregas:'Entrega da trilha'};
var ACAO={criou:'criou',editou:'editou',excluiu:'excluiu',restaurou:'restaurou',exportou:'exportou',importou:'importou'};
var CAMPO={areas:'cargos',presidencia:'presidência',responsavel:'responsável',responsavelId:'',hora:'horário',duracao:'duração',obs:'observações',inicio:'início',fim:'fim',penalidade:'penalidade',ativa:'ativa',potencial:'potencial'};
function tipo(c){return TIPO[c]||c;}
function quando(s){var d=new Date(s);return isNaN(d)?'—':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}
function campos(l){var out=[];(l||[]).forEach(function(k){k=String(k).split('.')[0];var n=k in CAMPO?CAMPO[k]:k;if(n&&out.indexOf(n)<0)out.push(n);});return out.join(', ');}
var AREAS=['Eventos','Financeiro','RH','C&D','Marketing','Comum'];
function opcoesArea(sel){var cur=sel.value;sel.textContent='';sel.appendChild(new Option('Todas as áreas',''));AREAS.forEach(function(a){sel.appendChild(new Option(a==='Comum'?'Comum (Documentos, Membros, acesso)':a,a));});sel.value=cur;}

/* telas */
var main=document.querySelector('main');
function secao(id,titulo,nota,ferr){
  var s=document.createElement('section');s.id='view-'+id;s.hidden=true;s.setAttribute('aria-labelledby',id+'-title');
  s.innerHTML='<div class="section-head"><div><h2 id="'+id+'-title">'+titulo+'</h2><p class="note">'+nota+'</p></div><span class="note" id="'+id+'-count"></span></div><div class="mtools">'+ferr+'</div><div id="'+id+'-list"></div>';
  main.appendChild(s);return s;
}
secao('lixeira','Lixeira','O que foi excluído de eventos, salas, calendário, convidados, documentos, contatos de coffee, capacitações e etapas da trilha fica aqui por '+DIAS_LIXEIRA+' dias. A presidência restaura qualquer coisa; a diretoria, só o que é da própria área.',
  '<label for="lx-area" class="sr">Área</label><select id="lx-area"></select><span class="msg" id="lx-msg" role="status"></span>');
secao('hist','Histórico','Quem criou, editou ou excluiu o quê, e quando. Atualizações automáticas (como a nota do clima) não entram.',
  '<label for="hs-busca" class="sr">Buscar</label><input id="hs-busca" type="search" placeholder="Buscar por pessoa ou item" style="flex:1;min-width:200px;max-width:380px"><label for="hs-area" class="sr">Área</label><select id="hs-area"></select><label for="hs-acao" class="sr">Ação</label><select id="hs-acao"><option value="">Todas as ações</option><option value="criou">Criou</option><option value="editou">Editou</option><option value="excluiu">Excluiu</option><option value="restaurou">Restaurou</option><option value="exportou">Backup</option></select><button type="button" class="btn small ghost" id="hs-atual">Atualizar</button>');
opcoesArea($('lx-area'));opcoesArea($('hs-area'));

var db=null,P=function(){return window.__perm;};
var lixo=[],lxOn=false,limpou=false,hist=[],hsLim=PASSO,hsFim=false,hsCarregando=false;

/* ---- Lixeira ---- */
function lxRender(){
  var box=$('lixeira-list'),fa=$('lx-area').value,p=P();
  var rows=lixo.filter(function(x){return !fa||x.area===fa;}).sort(function(a,b){return String(b.em).localeCompare(String(a.em));});
  $('lixeira-count').textContent=lixo.length?(rows.length===lixo.length?lixo.length+(lixo.length===1?' item':' itens'):rows.length+' de '+lixo.length):'';
  if(!lixo.length){box.innerHTML='<p class="empty">A lixeira está vazia.</p>';return;}
  var h='<div class="tablewrap"><table class="tlist"><thead><tr><th>Item</th><th>Área</th><th>Excluído por</th><th>Quando</th><th></th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="5" class="empty">Nada nesta área.</td></tr>';
  rows.forEach(function(x){var pode=p&&p.podeRestaurar(x.area),dias=Math.max(0,DIAS_LIXEIRA-Math.floor((Date.now()-new Date(x.em))/864e5));
    h+='<tr><td><span class="tn">'+esc(x.nome||'Sem nome')+'</span><span class="tsub">'+esc(tipo(x.colecao))+' · some em '+dias+(dias===1?' dia':' dias')+'</span></td><td>'+esc(x.area==='Comum'?'Comum':x.area)+'</td><td>'+esc(x.porNome||'—')+'</td><td>'+esc(quando(x.em))+'</td><td class="r">'+
      (pode?'<div class="btns" style="justify-content:flex-end"><button type="button" class="btn small" data-lxres="'+esc(x.id)+'">Restaurar</button><button type="button" class="btn small ghost tdanger" data-lxdel="'+esc(x.id)+'">Excluir de vez</button></div>':'<span class="note">Só a diretoria da área</span>')+'</td></tr>';});
  box.innerHTML=h+'</tbody></table></div>';
}
function lxLimpar(){
  if(limpou||!db)return;limpou=true;var p=P(),lim=Date.now()-DIAS_LIXEIRA*864e5;
  lixo.forEach(function(x){if(new Date(x.em)<lim&&p&&p.podeRestaurar(x.area))db.doc('lixeira/'+x.id).delete().catch(function(){});});
}
function lxLigar(){
  if(lxOn||!db)return;lxOn=true;
  db.collection('lixeira').onSnapshot(function(s){lixo=s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});lxLimpar();lxRender();},function(){lxOn=false;});
}
$('lx-area').addEventListener('change',lxRender);
$('lixeira-list').addEventListener('click',function(e){
  var b=e.target.closest('[data-lxres],[data-lxdel]');if(!b||!db)return;
  var id=b.dataset.lxres||b.dataset.lxdel,x=lixo.filter(function(y){return y.id===id;})[0];if(!x)return;var msg=$('lx-msg');
  if(b.dataset.lxdel){
    if(!b.dataset.sure){b.dataset.sure='1';b.textContent='Confirmar: não dá para desfazer';setTimeout(function(){delete b.dataset.sure;b.textContent='Excluir de vez';},5000);return;}
    db.doc('lixeira/'+id).delete().then(function(){msg.textContent='Excluído de vez.';},function(){msg.textContent='Não foi possível excluir.';});return;
  }
  b.disabled=true;
  var bt=db.batch();bt.set(db.doc(x.colecao+'/'+x.docId),x.dados||{});bt.delete(db.doc('lixeira/'+id));
  bt.commit().then(function(){msg.textContent=tipo(x.colecao)+' “'+(x.nome||'sem nome')+'” restaurado.';if(window.__registrar)window.__registrar('restaurou',x.colecao,x.docId,x.nome);},
    function(){b.disabled=false;msg.textContent='Não foi possível restaurar.';});
});

/* ---- Histórico ---- */
function hsCarregar(){
  if(!db||hsCarregando)return;hsCarregando=true;$('hist-count').textContent='Carregando…';
  db.collection('registro').orderBy('em','desc').limit(hsLim).get().then(function(s){
    hist=s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});hsFim=s.docs.length<hsLim;hsCarregando=false;hsRender();
  },function(){hsCarregando=false;$('hist-count').textContent='';$('hist-list').innerHTML='<p class="empty">Não foi possível carregar o histórico.</p>';});
}
function hsRender(){
  var fa=$('hs-area').value,fc=$('hs-acao').value,q=$('hs-busca').value.toLowerCase().trim();
  var rows=hist.filter(function(x){if(fa&&x.area!==fa)return false;if(fc&&x.acao!==fc&&!(fc==='exportou'&&x.acao==='importou'))return false;
    return !q||[x.porNome,x.nome,tipo(x.colecao)].join(' ').toLowerCase().indexOf(q)>=0;});
  $('hist-count').textContent=hist.length?rows.length+(rows.length===1?' registro':' registros')+(hsFim?'':' (os mais recentes)'):'';
  var box=$('hist-list');
  if(!hist.length){box.innerHTML='<p class="empty">Nada registrado ainda.</p>';return;}
  var h='<div class="tablewrap"><table class="tlist"><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Área</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="4" class="empty">Nenhum registro com esses filtros.</td></tr>';
  rows.forEach(function(x){
    var o=x.acao==='exportou'?'<b>exportou o backup</b>':x.acao==='importou'?'<b>importou um backup</b> · '+esc(x.nome):'<b>'+esc(ACAO[x.acao]||x.acao)+'</b> '+esc(tipo(x.colecao).toLowerCase())+' “'+esc(x.nome||x.docId)+'”';
    var c=x.acao==='editou'?campos(x.campos):'';
    h+='<tr><td>'+esc(quando(x.em))+'</td><td>'+esc(x.porNome||'—')+'</td><td>'+o+(c?'<span class="tsub">Mudou: '+esc(c)+'</span>':'')+'</td><td>'+esc(x.area||'—')+'</td></tr>';});
  h+='</tbody></table></div>';
  if(!hsFim)h+='<div class="btns" style="margin-top:12px"><button type="button" class="btn small ghost" id="hs-mais">Carregar mais</button></div>';
  box.innerHTML=h;
}
$('hs-busca').addEventListener('input',hsRender);$('hs-area').addEventListener('change',hsRender);$('hs-acao').addEventListener('change',hsRender);
$('hs-atual').addEventListener('click',hsCarregar);
$('hist-list').addEventListener('click',function(e){if(e.target.id==='hs-mais'){hsLim+=PASSO;hsCarregar();}});
document.addEventListener('tela',function(e){if(e.detail==='lixeira'){lxLigar();lxRender();}if(e.detail==='hist')hsCarregar();});

/* ---- lembrete de backup (para quem pode exportar: diretoria de Eventos, presidência e DEV) ---- */
var CH='feashion-backup-adiado',bkVisto=false;
function bkAviso(dias){
  var av=$('aviso-backup');
  if(dias!=null&&dias<DIAS_BACKUP){if(av)av.remove();return;}
  try{if(sessionStorage.getItem(CH))return;}catch(e){}
  if(!av){av=document.createElement('div');av.className='aviso-perm aviso-bk';av.id='aviso-backup';av.setAttribute('role','status');main.insertBefore(av,main.firstChild);}
  av.innerHTML='<span>'+(dias==null?'Ainda não há registro de backup.':'O último backup foi há '+dias+' dias.')+' Baixe um em Parâmetros → Backup (Exportar tudo) e guarde no Drive da diretoria.</span><span class="btns"><button type="button" class="btn small" id="bk-ir">Ir para o backup</button><button type="button" class="btn small ghost" id="bk-depois">Agora não</button></span>';
  $('bk-ir').addEventListener('click',function(){var b=document.querySelector('.side .sitem[data-alvo="par"]');if(b)b.click();setTimeout(function(){var k=$('backup');if(k)k.scrollIntoView({behavior:'smooth',block:'center'});},60);});
  $('bk-depois').addEventListener('click',function(){try{sessionStorage.setItem(CH,'1');}catch(e){}av.remove();});
}
function bkChecar(){
  if(bkVisto||!db||!document.body.classList.contains('pode-gerir'))return;bkVisto=true;
  db.doc('parametros/backup').get().then(function(d){var em=d.exists&&d.data().em;bkAviso(em?Math.floor((Date.now()-new Date(em))/864e5):null);},function(){bkVisto=false;});
}
document.addEventListener('backup-feito',function(){var av=$('aviso-backup');if(av)av.remove();});

document.addEventListener('permissoes',function(){
  var p=P();if(p&&p.diretorAlgum()&&!$('view-lixeira').hidden){lxLigar();}
  bkChecar();
  if(!$('view-lixeira').hidden)lxRender();
});
if(window.claude&&window.claude.use)window.claude.use('db').then(function(d){db=d;bkChecar();});
})();
</script>
