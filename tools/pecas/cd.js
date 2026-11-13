/* ============================== C&D · CAPACITAÇÕES ==============================
   Roda dentro do script principal (mesmo escopo de events, docs, db, esc, D, iso, $, painelAbrir, painelAtualizar, adiar...).
   Todos os membros veem; quem tem cargo em C&D (e DEV, presidência e Diretor(a) de Eventos) cria, edita e marca presença.
   cd_capacitacoes/{id} = {nome (tema), data, hora, duracao (min), local, quem, descricao, etapa (id da etapa da trilha), presentes:[membroId], criadoEm, editadoEm}
     quem = {tipo:'membro', membroId, nome} ou {tipo:'externo', convidadoId (da base de Convidados; vazio se for de fora da base), nome}.
     Um convidado da base não pode estar em dois compromissos no mesmo horário (window.__convConflito, no Planejar).
   cd_avaliacoes/{capId}_{uid} = {cap, uid, nota (1 a 5), comentario, em}: cada membro grava só a própria (regras);
     a tela mostra a média, as notas e os comentários sem o nome de quem avaliou.
   Material: documentos com caps:[capId] e area 'C&D'; viram a pasta da capacitação em Documentos. */
(function(){
"use strict";
var caps=[],avs=[],lig=false,RS={};
window.__cdCaps=caps;
function pode(k){var p=window.__perm;return !!(p&&p.carregado()&&p.podeEm('C&D')[k]);}
function hoje(){return iso(new Date());}
function nrm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function blk(t,h){return '<div class="tp-blk">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function confirma(b,txt,fn){if(b.dataset.sure){fn();return;}var o=b.textContent;b.dataset.sure='1';b.textContent=txt;setTimeout(function(){delete b.dataset.sure;b.textContent=o;},5000);}
function dataBR(s){return s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4):'sem data';}
function dataLonga(s){return s?D(s).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'sem data';}
function nota(v){return v==null?'—':(Math.round(v*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});}
function membros(){return window.__membros||[];}
function nomeMembro(id){var m=membros().filter(function(x){return x.id===id;})[0];return m?m.nome:'';}
function capDe(id){return caps.filter(function(c){return c.id===id;})[0]||null;}
function feita(c){return !!c.data&&c.data<=hoje();}
function tipoQuem(q){q=q||{};return q.tipo||(q.membroId?'membro':q.nome||q.convidadoId?'externo':'');}
function gDeC(id){return (typeof guests!=='undefined'?guests:[]).filter(function(g){return g.id===id;})[0]||null;}
function quemTxt(c){var q=c.quem||{};if(q.membroId)return nomeMembro(q.membroId)||q.nome||'';if(q.convidadoId){var g=gDeC(q.convidadoId);return g?g.nome:q.nome||'';}return q.nome||'';}
function avsDe(id){return avs.filter(function(a){return a.cap===id&&a.nota>=1&&a.nota<=5;});}
function media(l){return l.length?l.reduce(function(s,a){return s+a.nota;},0)/l.length:null;}
function matDe(id){return (typeof docs!=='undefined'?docs:[]).filter(function(d){return (d.caps||[]).indexOf(id)>=0;}).sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'pt-BR');});}
window.__cdCapDe=capDe;

/* ---------------- tela ---------------- */
var main=document.querySelector('main');
var sec=document.createElement('section');sec.id='view-cd-cap';sec.hidden=true;sec.setAttribute('aria-labelledby','cd-cap-title');
sec.innerHTML='<div class="section-head"><div><h2 id="cd-cap-title">Capacitações</h2><p class="note">Treinamentos e aulas da Feashion: quando, sobre o quê e quem dá, a presença de cada membro, a avaliação de quem foi e o material. O C&amp;D cria e marca a presença; quem vê a área de C&amp;D avalia.</p></div>'+
  '<div class="btns"><span class="msg" id="cd-cap-ok" aria-live="polite"></span><button class="btn cd-ed" type="button" id="cd-novo">+ Nova capacitação</button></div></div>'+
  '<div class="sbar"><input type="search" id="cd-busca" placeholder="Buscar tema ou quem dá" aria-label="Buscar capacitação"><span class="note" id="cd-conta" aria-live="polite"></span></div>'+
  '<h3 class="cd-h">Próximas</h3><div class="tablewrap"><table class="tlist" id="cd-prox"></table></div>'+
  '<h3 class="cd-h">Realizadas</h3><div class="tablewrap"><table class="tlist" id="cd-real"></table></div>'+
  '<div class="cd-freq-h"><h3 class="cd-h">Frequência dos membros</h3><label for="cd-area" class="sr">Área</label><select id="cd-area"><option value="">Todas as áreas</option></select></div>'+
  '<p class="note" style="margin:0 0 8px">Presença em cada capacitação já realizada, contando só as que aconteceram depois que a pessoa entrou no app.</p><div class="tablewrap"><table class="tlist" id="cd-freq"></table></div>';
main.appendChild(sec);
['Eventos','Financeiro','Marketing','C&D','RH'].forEach(function(a){$('cd-area').appendChild(new Option(a,a));});

function linhaCap(c){var av=avsDe(c.id),m=media(av),np=(c.presentes||[]).length,nm=matDe(c.id).length,q=quemTxt(c),f=feita(c);
  return '<tr data-cdopen="'+esc(c.id)+'" tabindex="0"><td class="num"><b>'+esc(dataBR(c.data))+'</b>'+(c.hora?'<span class="tsub">'+esc(c.hora)+'</span>':'')+'</td>'+
    '<td><span class="tn">'+esc(c.nome||'Sem tema')+'</span>'+(q||c.local?'<span class="tsub">'+esc([q,c.local].filter(Boolean).join(' · '))+'</span>':'')+'</td>'+
    '<td class="r num">'+(f?(np?np+(np===1?' presente':' presentes'):'<span class="note">sem presença</span>'):'<span class="note">—</span>')+'</td>'+
    '<td class="r num">'+(av.length?'<b>'+nota(m)+'</b> <span class="note">· '+av.length+(av.length===1?' nota':' notas')+'</span>':'<span class="note">—</span>')+'</td>'+
    '<td class="r num">'+(nm?nm+(nm===1?' arquivo':' arquivos'):'<span class="note">—</span>')+'</td></tr>';}
function tabela(id,l,vazio){var h='<thead><tr><th>Data</th><th>Tema</th><th class="r">Presença</th><th class="r">Avaliação</th><th class="r">Material</th></tr></thead><tbody>';
  if(!l.length)h+='<tr><td colspan="5" class="empty">'+vazio+'</td></tr>';
  l.forEach(function(c){h+=linhaCap(c);});$(id).innerHTML=h+'</tbody>';}
function render(){
  var q=nrm($('cd-busca').value).trim(),hj=hoje();
  var l=caps.filter(function(c){return !q||nrm([c.nome,quemTxt(c),c.local,c.descricao].join(' ')).indexOf(q)>=0;});
  $('cd-conta').textContent=caps.length?(q?l.length+' de '+caps.length:caps.length)+(caps.length===1?' capacitação':' capacitações'):'';
  var px=l.filter(function(c){return !c.data||c.data>=hj;}).sort(function(a,b){return String(a.data||'9').localeCompare(String(b.data||'9'));});
  var rl=l.filter(function(c){return c.data&&c.data<hj;}).sort(function(a,b){return String(b.data).localeCompare(String(a.data));});
  tabela('cd-prox',px,q?'Nenhuma próxima capacitação com essa busca.':'Nenhuma capacitação marcada.'+(pode('editar')?' Clique em “+ Nova capacitação”.':''));
  tabela('cd-real',rl,q?'Nenhuma capacitação realizada com essa busca.':'Nenhuma capacitação realizada ainda.');
  renderFreq();
}
function renderFreq(){
  var ar=$('cd-area').value,rl=caps.filter(function(c){return c.data&&c.data<=hoje();});
  if(!rl.length){$('cd-freq').innerHTML='<tbody><tr><td class="empty">A frequência aparece depois da primeira capacitação.</td></tr></tbody>';return;}
  var ms=membros().filter(function(m){return !ar||(m.areas&&Object.prototype.hasOwnProperty.call(m.areas,ar));});
  var rows=ms.map(function(m){var n=0,p=0;rl.forEach(function(c){var pres=(c.presentes||[]).indexOf(m.id)>=0;if(pres||!m.desde||c.data>=m.desde){n++;if(pres)p++;}});return {m:m,n:n,p:p,pc:n?p/n:null};})
    .sort(function(a,b){return (b.pc==null?-1:b.pc)-(a.pc==null?-1:a.pc)||a.m.nome.localeCompare(b.m.nome,'pt-BR');});
  var h='<thead><tr><th>Membro</th><th>Áreas</th><th class="r">Presenças</th><th class="r">Frequência</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="4" class="empty">Ninguém nesta área.</td></tr>';
  rows.forEach(function(r){var a=Object.keys(r.m.areas||{});
    h+='<tr'+(r.m.id===window.__euId?' class="cd-eu"':'')+'><td><span class="tn">'+esc(r.m.nome)+'</span>'+(r.m.id===window.__euId?'<span class="tsub">você</span>':'')+'</td><td>'+(a.length?a.map(function(x){return '<span class="ttag">'+esc(x)+'</span>';}).join(''):'<span class="note">—</span>')+'</td>'+
      '<td class="r num">'+r.p+' de '+r.n+'</td><td class="r num">'+(r.pc==null?'<span class="note">—</span>':'<span class="cd-bar"><i style="width:'+Math.round(r.pc*100)+'%"></i></span><b>'+Math.round(r.pc*100)+'%</b>')+'</td></tr>';});
  $('cd-freq').innerHTML=h+'</tbody>';
}
function tudo(){adiar('view-cd-cap',render);painelAtualizar('view-cd-cap');}
window.__cdMudou=tudo;
$('cd-busca').addEventListener('input',render);$('cd-area').addEventListener('change',renderFreq);
function clique(e){if(e.target.closest('a'))return;var tr=e.target.closest('[data-cdopen]');if(!tr||!(e.type==='click'||e.key==='Enter'||e.key===' '))return;if(e.type==='keydown')e.preventDefault();abrir(tr.dataset.cdopen);}
['cd-prox','cd-real'].forEach(function(i){$(i).addEventListener('click',clique);$(i).addEventListener('keydown',clique);});
$('cd-novo').addEventListener('click',function(){$('cd-cap-ok').textContent='';abrir(null);});

/* ---------------- painel da capacitação ---------------- */
function campo(id,rot,val,attr){return '<div class="field"><label for="'+id+'">'+rot+'</label><input id="'+id+'" value="'+esc(val==null?'':val)+'"'+(attr?' '+attr:'')+'></div>';}
function opsMembro(q){var sel=q.membroId||'';
  return '<option value="">A definir</option>'+membros().map(function(m){return '<option value="'+esc(m.id)+'"'+(m.id===sel?' selected':'')+'>'+esc(m.nome)+'</option>';}).join('')+
    (sel&&!membros().some(function(m){return m.id===sel;})?'<option value="'+esc(sel)+'" selected>'+esc(q.nome||'membro')+'</option>':'');}
function opsConv(q){var sel=q.convidadoId||(q.nome?'__fora':''),l=(typeof guests!=='undefined'?guests:[]).slice().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');});
  return '<option value="">A definir</option>'+l.map(function(g){return '<option value="'+esc(g.id)+'"'+(g.id===sel?' selected':'')+'>'+esc(g.nome+(g.empresa?' · '+g.empresa:''))+'</option>';}).join('')+
    (q.convidadoId&&!gDeC(q.convidadoId)?'<option value="'+esc(q.convidadoId)+'" selected>'+esc(q.nome||'convidado removido')+'</option>':'')+
    '<option value="__fora"'+(sel==='__fora'?' selected':'')+'>Outra pessoa (fora da lista de Convidados)</option>';}
function blocoDados(c,ed){
  if(!ed)return blk('',['<p class="fin-ro"><span>Data</span><b>'+esc(dataLonga(c.data))+(c.hora?' · '+esc(c.hora):'')+(c.duracao?' · '+esc(c.duracao)+' min':'')+'</b></p>',
    '<p class="fin-ro"><span>Quem dá</span><b>'+esc(quemTxt(c)||'A definir')+'</b></p>','<p class="fin-ro"><span>Local</span><b>'+(safeUrl(c.local)?'<a href="'+esc(c.local)+'" target="_blank" rel="noopener">'+esc(c.local)+' ↗</a>':esc(c.local||'—'))+'</b></p>',
    (function(){var x=c.etapa&&window.__trilhaEtapa?window.__trilhaEtapa(c.etapa):null;return x?'<p class="fin-ro"><span>Trilha do trainee</span><b>'+esc(x.nome)+'</b></p>':'';})(),
    c.descricao?'<p style="margin:8px 0 0;white-space:pre-wrap">'+esc(c.descricao)+'</p>':''].join(''));
  var q=c.quem||{},tq=tipoQuem(q)||'membro',fora=tq==='externo'&&!q.convidadoId&&!!q.nome;
  return blk('','<div class="fin-grid">'+
    '<div class="field ffull"><label for="cd-nome">Tema <span class="rq">obrigatório</span></label><input id="cd-nome" maxlength="120" value="'+esc(c.nome||'')+'" placeholder="ex.: Excel para orçamentos"></div>'+
    campo('cd-data','Data <span class="rq">obrigatório</span>',c.data,'type="date"')+campo('cd-hora','Horário',c.hora,'type="time"')+
    campo('cd-dur','Duração (min)',c.duracao,'type="number" min="0" step="5" inputmode="numeric"')+campo('cd-local','Local ou link',c.local,'maxlength="200" placeholder="Sala ou link da chamada"')+
    '<fieldset class="field ffull cd-quemf"><legend>Quem dá</legend><div class="cd-qtipo" role="radiogroup">'+
      '<label class="check"><input type="radio" name="cd-qt" value="membro"'+(tq==='membro'?' checked':'')+'> Membro da Feashion</label>'+
      '<label class="check"><input type="radio" name="cd-qt" value="externo"'+(tq==='externo'?' checked':'')+'> Convidado externo</label></div>'+
      '<div id="cd-qmbox"'+(tq==='membro'?'':' hidden')+'><label for="cd-qm" class="sr">Membro</label><select id="cd-qm">'+opsMembro(q)+'</select></div>'+
      '<div id="cd-qcbox"'+(tq==='externo'?'':' hidden')+'><label for="cd-qc" class="sr">Convidado</label><select id="cd-qc">'+opsConv(q)+'</select>'+
        '<div id="cd-forabox"'+(fora?'':' hidden')+' style="margin-top:6px"><label for="cd-fora">Nome de quem dá</label><input id="cd-fora" maxlength="80" value="'+esc(fora?q.nome:'')+'"></div>'+
        '<p class="note" style="margin:6px 0 0">Os convidados vêm da tela Convidados. Um convidado não pode estar em dois eventos ou capacitações no mesmo horário.</p></div>'+
      '<p class="msg err" id="cd-confl" role="status"></p></fieldset>'+
    '<div class="field ffull"><label for="cd-desc">Descrição <span class="rq opt">opcional</span></label><textarea id="cd-desc" rows="3" maxlength="1500">'+esc(c.descricao||'')+'</textarea></div>'+
    (function(){var l=(window.__trilhaEtapas?window.__trilhaEtapas():[]).filter(function(x){return x.tipo==='cap';});if(!l.length&&!c.etapa)return '';
      return '<div class="field ffull"><label for="cd-etapa">Conta para a Trilha do trainee <span class="rq opt">opcional · o trainee que estiver na presença cumpre a etapa</span></label><select id="cd-etapa"><option value="">Não conta para a trilha</option>'+
        l.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===c.etapa?' selected':'')+'>'+esc(x.nome+' · '+(x.area||'Base comum'))+'</option>';}).join('')+'</select></div>';})()+'</div>');}
function blocoPresenca(c,ed){
  var pres=c.presentes||[],ms=membros();
  if(!feita(c))return blk('Presença','<p class="note" style="margin:0">A lista de presença abre no dia da capacitação.</p>');
  if(!ed){var eu=pres.indexOf(window.__euId)>=0;
    return blk('Presença · '+pres.length+(pres.length===1?' membro':' membros'),(window.__euId?'<p style="margin:0 0 6px"><b>'+(eu?'Você esteve presente.':'Você não está na lista de presença.')+'</b></p>':'')+
      (pres.length?'<p class="note" style="margin:0">'+esc(pres.map(function(id){return nomeMembro(id)||'membro';}).sort().join(', '))+'</p>':'<p class="note" style="margin:0">Ninguém marcado ainda.</p>'));}
  var r=RS[c.id]=RS[c.id]||{q:''},q=nrm(r.q);
  var l=ms.filter(function(m){return !q||nrm(m.nome+' '+(m.apelido||'')).indexOf(q)>=0;});
  return blk('Presença · '+pres.length+' de '+ms.length,'<div class="field" style="margin-bottom:8px"><input type="search" id="cd-pq" placeholder="Buscar membro" aria-label="Buscar membro na lista de presença" value="'+esc(r.q)+'"></div>'+
    '<div class="cd-pres">'+(l.length?l.map(function(m){var on=pres.indexOf(m.id)>=0,a=Object.keys(m.areas||{}).join(', ');
      return '<label class="check"><input type="checkbox" data-cdp="'+esc(m.id)+'"'+(on?' checked':'')+'> <span>'+esc(m.nome)+(a?' <small class="note">'+esc(a)+'</small>':'')+'</span></label>';}).join(''):'<p class="note" style="margin:0">Nenhum membro com essa busca.</p>')+'</div>'+
    '<p class="note" style="margin:8px 0 0">Cada marcação é salva na hora.</p>');}
function estrelas(v,dis){var h='<div class="cd-notas" role="radiogroup" aria-label="Sua nota, de 1 a 5">';for(var i=1;i<=5;i++)h+='<button type="button" role="radio" aria-checked="'+(v===i)+'" data-cdn="'+i+'"'+(v===i?' class="on"':'')+(dis?' disabled':'')+'>'+i+'</button>';return h+'</div>';}
function blocoAval(c){
  if(!feita(c))return blk('Avaliação','<p class="note" style="margin:0">A avaliação abre no dia da capacitação.</p>');
  var l=avsDe(c.id),m=media(l),uid=window.__euId,mi=avs.filter(function(a){return a.cap===c.id&&a.uid===uid;})[0]||null;
  var r=RS['a'+c.id]=RS['a'+c.id]||{n:mi?mi.nota:0,t:mi?mi.comentario||'':''};
  var h='';
  if(uid)h+='<div class="cd-minha"><p style="margin:0 0 6px"><b>Sua avaliação</b> <span class="note">1 = não ajudou · 5 = ajudou muito</span></p>'+estrelas(r.n)+
    '<div class="field" style="margin-top:8px"><label for="cd-com">Comentário <span class="rq opt">opcional · aparece sem o seu nome</span></label><textarea id="cd-com" rows="2" maxlength="600">'+esc(r.t)+'</textarea></div>'+
    '<div class="btns"><button type="button" class="btn small" id="cd-av">'+(mi?'Atualizar avaliação':'Enviar avaliação')+'</button><span class="msg" id="cd-avm" role="status"></span></div></div>';
  if(l.length){var dist=[0,0,0,0,0];l.forEach(function(a){dist[a.nota-1]++;});var mx=Math.max.apply(null,dist)||1;
    h+='<p style="margin:12px 0 6px"><b>Média '+nota(m)+'</b> <span class="note">de 5 · '+l.length+(l.length===1?' nota':' notas')+'</span></p><div class="cd-dist">'+
      dist.map(function(n,i){return '<span>'+(i+1)+'</span><span class="cd-bar"><i style="width:'+Math.round(n/mx*100)+'%"></i></span><span class="num">'+n+'</span>';}).join('')+'</div>';
    var cm=l.filter(function(a){return String(a.comentario||'').trim();}).sort(function(a,b){return String(b.em).localeCompare(String(a.em));});
    if(cm.length)h+='<h5 class="cd-h5">Comentários</h5><ul class="cd-coms">'+cm.map(function(a){return '<li>“'+esc(a.comentario)+'” <span class="note">· nota '+a.nota+'</span></li>';}).join('')+'</ul>';}
  else h+='<p class="note" style="margin:12px 0 0">Ninguém avaliou ainda.</p>';
  return blk('Avaliação',h);}
function blocoMaterial(c,ed){
  var l=matDe(c.id);
  var h=l.length?'<ul class="cd-mat">'+l.map(function(d){var f=dFontes(d),u=dPrincipal(d.tipo,f.link,f.arquivo);return '<li><span>'+esc(d.nome)+' <span class="note">'+esc(d.tipo||'')+'</span></span>'+(u?'<a class="fi-link" href="'+esc(u)+'" target="_blank" rel="noopener">Abrir ↗</a>':'')+'</li>';}).join('')+'</ul>':'<p class="note" style="margin:0">Nenhum material ainda.</p>';
  if(ed)h+='<div class="cd-addmat"><div class="field"><label for="cd-mn">Nome do material</label><input id="cd-mn" maxlength="120" placeholder="ex.: Slides da aula"></div>'+
    '<div class="field"><label for="cd-mf">Arquivo <span class="rq opt">PDF ou imagem, até 10 MB</span></label><input id="cd-mf" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"><input id="cd-ml" type="url" placeholder="ou cole um link (slides, gravação, Drive)" aria-label="Link do material"></div>'+
    '<div class="btns"><button type="button" class="btn small" id="cd-madd">Adicionar material</button><span class="msg" id="cd-mm" role="status"></span></div>'+
    '<p class="note" style="margin:6px 0 0">O material fica em Documentos, na pasta desta capacitação; para tirar, exclua lá.</p></div>';
  return blk('Material',h);}
function montar(id){
  var c=id?capDe(id):{};if(id&&!c)return null;
  var ed=pode('editar');
  var corpo=blocoDados(c,ed)+(id?blocoPresenca(c,ed)+blocoAval(c)+blocoMaterial(c,ed):'');
  var rod=ed?'<div class="btns"><button type="button" class="btn" id="cd-salvar">'+(id?'Salvar alterações':'Criar capacitação')+'</button>'+(id&&pode('excluir')?'<button type="button" class="btn small ghost tdanger" id="cd-del">Excluir</button>':'')+'<span class="msg" id="cd-msg" role="status"></span></div>':'';
  return {titulo:id?c.nome||'Capacitação':'Nova capacitação',sub:id?esc(dataLonga(c.data))+(quemTxt(c)?' · '+esc(quemTxt(c)):''):'',corpo:corpo,rodape:rod};}
function abrir(id){painelAbrir({sec:'view-cd-cap',chave:id||'nova',montar:function(){return montar(id);},foco:id?null:'#cd-nome',depois:function(dr){ligarPainel(dr,id);}});}
window.__cdAbrir=abrir;
function ligarPainel(dr,id){
  function qTipo(){var r=dr.querySelector('input[name="cd-qt"]:checked');return r?r.value:'membro';}
  function confl(){var b=dr.querySelector('#cd-confl');if(!b)return '';var t='';
    if(qTipo()==='externo'){var gid=dr.querySelector('#cd-qc').value;if(gid&&gid!=='__fora'&&window.__convConflito){var x=window.__convConflito(gid,dr.querySelector('#cd-data').value,dr.querySelector('#cd-hora').value,dr.querySelector('#cd-dur').value||90,id?'cap:'+id:null);
      if(x){var g=gDeC(gid);t=(g?g.nome:'Este convidado')+' já está '+window.__convConflitoTxt(x)+'. Troque o horário ou o convidado.';}}}
    b.textContent=t;return t;}
  dr._cdConfl=confl;
  if(dr.querySelector('#cd-qc')){dr.querySelectorAll('input[name="cd-qt"]').forEach(function(r){r.addEventListener('change',function(){var t=qTipo();dr.querySelector('#cd-qmbox').hidden=t!=='membro';dr.querySelector('#cd-qcbox').hidden=t!=='externo';confl();});});
    dr.querySelector('#cd-qc').addEventListener('change',function(){dr.querySelector('#cd-forabox').hidden=this.value!=='__fora';confl();});
    ['cd-data','cd-hora','cd-dur'].forEach(function(k){dr.querySelector('#'+k).addEventListener('change',confl);});confl();}
  var sv=dr.querySelector('#cd-salvar');if(sv)sv.addEventListener('click',function(){salvar(id,dr);});
  var dl=dr.querySelector('#cd-del');if(dl)dl.addEventListener('click',function(){confirma(dl,'Confirmar exclusão',function(){db.doc('cd_capacitacoes/'+id).delete().then(function(){painelFechar();$('cd-cap-ok').textContent='Capacitação excluída (fica 30 dias na Lixeira).';}).catch(function(){dr.querySelector('#cd-msg').textContent='Não foi possível excluir.';});});});
  var pq=dr.querySelector('#cd-pq');if(pq)pq.addEventListener('input',function(){RS[id].q=pq.value;var c=capDe(id);if(!c)return;
    var b=pq.closest('.tp-blk'),t=document.createElement('div');t.innerHTML=blocoPresenca(c,true);b.querySelector('.cd-pres').replaceWith(t.querySelector('.cd-pres'));});
  dr.addEventListener('change',function(e){var x=e.target.closest('[data-cdp]'),c=capDe(id);if(!x||!db||!c)return;
    var l=(c.presentes||[]).filter(function(u){return u!==x.dataset.cdp;});if(x.checked)l.push(x.dataset.cdp);c.presentes=l;
    x.blur();db.doc('cd_capacitacoes/'+id).update({presentes:l}).catch(function(){x.checked=!x.checked;var m=dr.querySelector('#cd-msg');if(m)m.textContent='Não foi possível salvar a presença.';});});
  var com=dr.querySelector('#cd-com');if(com)com.addEventListener('input',function(){RS['a'+id].t=com.value;});
  dr.addEventListener('click',function(e){var b=e.target.closest('[data-cdn]');if(!b)return;RS['a'+id].n=+b.dataset.cdn;
    dr.querySelectorAll('[data-cdn]').forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on);});});
  var av=dr.querySelector('#cd-av');if(av)av.addEventListener('click',function(){var r=RS['a'+id],m=dr.querySelector('#cd-avm'),uid=window.__euId;
    if(!r.n){m.textContent='Escolha uma nota de 1 a 5.';return;}if(!db||!uid){m.textContent='Sem conexão com a base.';return;}
    m.textContent='Salvando…';av.disabled=true;
    db.doc('cd_avaliacoes/'+id+'_'+uid).set({cap:id,uid:uid,nota:r.n,comentario:String(r.t||'').trim().slice(0,600),em:new Date().toISOString()})
      .then(function(){delete RS['a'+id];m.textContent='Avaliação salva. Obrigado!';av.disabled=false;},function(){av.disabled=false;m.textContent='Não foi possível salvar a avaliação.';});});
  var ma=dr.querySelector('#cd-madd');if(ma)ma.addEventListener('click',function(){addMaterial(id,dr,ma);});
}
function salvar(id,dr){var msg=dr.querySelector('#cd-msg');if(!db){msg.textContent='Sem conexão com a base.';return;}
  var g=function(k){return dr.querySelector('#'+k).value.trim();},nome=g('cd-nome'),dt=g('cd-data'),dur=g('cd-dur'),rq=dr.querySelector('input[name="cd-qt"]:checked'),qt=rq?rq.value:'membro',qv=qt==='membro'?g('cd-qm'):g('cd-qc');
  if(!nome){msg.textContent='Escreva o tema.';dr.querySelector('#cd-nome').focus();return;}
  if(!dt){msg.textContent='Escolha a data.';dr.querySelector('#cd-data').focus();return;}
  if(qt==='externo'&&qv==='__fora'&&!g('cd-fora')){msg.textContent='Escreva o nome de quem dá.';dr.querySelector('#cd-fora').focus();return;}
  var cf=dr._cdConfl&&dr._cdConfl();if(cf){msg.textContent='Não dá para salvar: '+cf;return;}
  var quem=qt==='membro'?{tipo:'membro',membroId:qv,convidadoId:'',nome:qv?nomeMembro(qv):''}:qv==='__fora'?{tipo:'externo',membroId:'',convidadoId:'',nome:g('cd-fora').slice(0,80)}:{tipo:'externo',membroId:'',convidadoId:qv,nome:qv?(gDeC(qv)||{}).nome||'':''};
  var et=dr.querySelector('#cd-etapa');
  var d={nome:nome.slice(0,120),data:dt,hora:g('cd-hora'),duracao:dur?Math.max(0,Math.round(+dur))||null:null,local:g('cd-local').slice(0,200),quem:quem,descricao:g('cd-desc').slice(0,1500),etapa:et?et.value||null:null,editadoEm:new Date().toISOString()};
  msg.textContent='Salvando…';
  var pr=id?db.doc('cd_capacitacoes/'+id).update(d):db.collection('cd_capacitacoes').add(Object.assign({presentes:[],criadoEm:d.editadoEm,porNome:String(window.__meuNome||'').slice(0,80)},d));
  pr.then(function(r){if(id){painelFechar();$('cd-cap-ok').textContent='Alterações salvas.';return;}
      caps.push(Object.assign({id:r.id,presentes:[]},d));render();abrir(r.id);$('cd-cap-ok').textContent='Capacitação criada.';},
    function(){msg.textContent='Não foi possível salvar: só quem tem cargo em C&D edita.';});}
function addMaterial(id,dr,b){var m=dr.querySelector('#cd-mm'),c=capDe(id);if(!c)return;
  var nome=dr.querySelector('#cd-mn').value.trim(),file=dr.querySelector('#cd-mf').files[0],link=dr.querySelector('#cd-ml').value.trim();
  if(!nome){m.textContent='Dê um nome ao material.';dr.querySelector('#cd-mn').focus();return;}
  if(!file&&!link){m.textContent='Escolha um arquivo ou cole um link.';return;}
  if(!file&&!safeUrl(link)){m.textContent='O link precisa começar com https://';return;}
  if(file&&file.size>10*1024*1024){m.textContent='Arquivo maior que 10 MB: use um link do Drive.';return;}
  var ext=file?(file.name.split('.').pop()||'').toLowerCase():'',TY={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  var d={nome:nome.slice(0,120),tipo:file?(ext==='pdf'?'PDF':'Imagem'):(/(docs|drive)\.google\.com/.test(link)?'Drive':'Site'),versao:'',resp:String(window.__meuNome||'').slice(0,80),resumo:'Material da capacitação '+c.nome+' ('+dataBR(c.data)+')',
    eventos:[],caps:[id],area:'C&D',criadoEm:new Date().toISOString(),link:file?'':link,arquivo:''};
  function gravar(){d.url=dPrincipal(d.tipo,d.link,d.arquivo);return db.collection('documentos').add(d);}
  b.disabled=true;m.textContent=file?'Enviando o arquivo…':'Salvando…';
  (file?window.claude.use('assets').then(function(api){if(!api)throw {code:'sem'};return api.upload(file,{type:TY[ext]||file.type});}).then(function(r){d.arquivo='/_blob/'+r.id;d.assetId=r.id;return gravar();}):gravar())
    .then(function(){b.disabled=false;dr.querySelector('#cd-mn').value='';dr.querySelector('#cd-mf').value='';dr.querySelector('#cd-ml').value='';m.textContent='Material adicionado.';},
      function(err){b.disabled=false;m.textContent=err&&err.code==='quota_exceeded'?'Espaço de arquivos cheio: use um link do Drive.':err&&err.code==='unsupported_type'?'Tipo de arquivo não aceito: use PDF ou imagem.':err&&err.code==='sem'?'Seu acesso não permite enviar arquivos: use um link.':'Não foi possível adicionar o material.';});}

/* ---------------- dados ---------------- */
function ligar(){if(lig||!db)return;lig=true;
  db.collection('cd_capacitacoes').onSnapshot(function(s){caps.length=0;s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;caps.push(o);});window.__cdMudou();if(typeof renderDocs==='function')renderDocs();},function(err){console.error('cd_capacitacoes',err);});
  db.collection('cd_avaliacoes').onSnapshot(function(s){avs=s.docs.map(function(x){var o=Object.assign({},x.data());o.id=x.id;return o;});tudo();},function(){});}
document.addEventListener('permissoes',function(){document.body.classList.toggle('cd-editar',pode('editar'));ligar();tudo();});
document.addEventListener('membros',tudo);
document.addEventListener('tela',function(e){if(e.detail==='cd-cap'){ligar();render();}});
document.addEventListener('base-pronta',ligar);
render();
})();
