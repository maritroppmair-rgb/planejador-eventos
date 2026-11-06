/* ---------- telas no padrão de Salas: lista só para ler + painel lateral ---------- */
(function(){
"use strict";
function $(id){return document.getElementById(id);}
function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}
function pode(c){return document.body.classList.contains('pode-'+c);}
function nrm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}

/* ===== painel lateral genérico ===== */
var TP=null;
function painelAbrir(o){
  var sec=$(o.sec),dr=sec.querySelector('.tpanel');
  if(!dr){dr=el('<div class="sdrawer tpanel" hidden><div class="sd-back" data-tclose></div><div class="sd-panel" role="dialog" aria-modal="true"><div class="sd-head"><div class="tp-tt"><h3></h3><div class="note tp-sub"></div></div><button type="button" class="sd-x" data-tclose aria-label="Fechar">&times;</button></div><div class="sd-body tp-body"></div><div class="sd-foot tp-foot"></div></div></div>');
    sec.appendChild(dr);dr.addEventListener('click',function(e){if(e.target.closest('[data-tclose]'))painelFechar();});}
  if(TP&&TP.dr!==dr)painelFechar();
  TP={dr:dr,o:o};preencher(o.montar());
  dr.hidden=false;document.body.classList.add('sd-aberto');
  dr.querySelector('.tp-body').scrollTop=0;
  setTimeout(function(){var f=o.foco&&dr.querySelector(o.foco);(f&&matchMedia('(pointer:fine)').matches?f:dr.querySelector('.sd-x')).focus();},30);
}
function preencher(c){var dr=TP.dr;dr.querySelector('h3').textContent=c.titulo;dr.querySelector('.tp-sub').innerHTML=c.sub||'';
  dr.querySelector('.tp-body').innerHTML=c.corpo;dr.querySelector('.tp-foot').innerHTML=c.rodape||'';
  dr.querySelector('[role=dialog]').setAttribute('aria-label',c.titulo);if(TP.o.depois)TP.o.depois(dr);}
function painelFechar(){if(!TP)return;var t=TP;TP=null;t.dr.hidden=true;document.body.classList.remove('sd-aberto');
  if(t.o.aoFechar)t.o.aoFechar();var sec=$(t.o.sec);if(sec&&pendente[sec.id])adiar(sec.id,pendente[sec.id]);}
/* redesenha o painel aberto com dados novos, sem atrapalhar quem está digitando nele */
function painelAtualizar(sec){if(!TP||TP.o.sec!==sec)return;var a=document.activeElement;
  if(a&&TP.dr.contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return;
  var c=TP.o.montar();if(!c){painelFechar();return;}var y=TP.dr.querySelector('.tp-body').scrollTop;preencher(c);TP.dr.querySelector('.tp-body').scrollTop=y;}
window.painelAbrir=painelAbrir;window.painelFechar=painelFechar;window.painelAtualizar=painelAtualizar;
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&TP){e.preventDefault();painelFechar();}});
document.addEventListener('tela',function(){painelFechar();if(gavAberta)fecharGav(gavAberta);});
function blk(t,h){return '<div class="tp-blk">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function confirma(b,txt,fn){if(b.dataset.sure){fn();return;}var o=b.textContent;b.dataset.sure='1';b.textContent=txt;setTimeout(function(){delete b.dataset.sure;b.textContent=o;},5000);}

/* ===== membros para escolher responsável ===== */
function opcoesMembros(sel,valor,vazio){var ms=window.__membros||[];sel.textContent='';sel.appendChild(new Option(vazio||'Sem responsável',''));
  ms.forEach(function(m){sel.appendChild(new Option(m.nome+(m.apelido&&m.apelido!==m.nome?' (“'+m.apelido+'”)':''),m.nome));});
  if(valor&&!ms.some(function(m){return m.nome===valor;}))sel.appendChild(new Option(valor+' (fora de Membros)',valor));
  sel.value=valor||'';}
/* ===== listas de opções viram botões (como em Salas) ===== */
function segmentar(id,curtos){var s=$(id);if(!s||s._pinta)return;var w=document.createElement('div');w.className='seg tseg';w.setAttribute('role','group');
  function pinta(){w.textContent='';[].forEach.call(s.options,function(op,i){var b=document.createElement('button');b.type='button';b.textContent=(curtos&&curtos[i])||op.textContent;
    var on=op.value===s.value;b.setAttribute('aria-pressed',on);if(on)b.className='on';b.title=op.textContent;
    b.addEventListener('click',function(){if(s.disabled)return;s.value=op.value;s.dispatchEvent(new Event('change',{bubbles:true}));pinta();});w.appendChild(b);});}
  s.classList.add('tseg-src');s.parentNode.insertBefore(w,s.nextSibling);s._pinta=pinta;s.addEventListener('change',pinta);pinta();}
function pintar(id){var s=$(id);if(s&&s._pinta)s._pinta();}

/* ============================== CONVIDADOS ============================== */
(function(){
  var sec=$('view-conv'),tw=$('ctable').closest('.tablewrap');
  /* cobertura por tema vira um bloco recolhível */
  var cov=$('tcov'),h3=cov.previousElementSibling&&cov.previousElementSibling.previousElementSibling,pn=cov.previousElementSibling;
  var det=el('<details class="panel tcovbox"><summary><b>Cobertura por tema</b> <span class="note" id="c-covres"></span></summary></details>');
  sec.insertBefore(det,cov);if(h3&&h3.tagName==='H3')h3.remove();if(pn&&pn.tagName==='P'){pn.style.margin='8px 0';det.appendChild(pn);}det.appendChild(cov);
  var bar=el('<div class="sbar"><input type="search" id="c-busca" placeholder="Buscar nome, empresa ou tema" aria-label="Buscar convidado"><select id="c-fst" aria-label="Status"><option value="">Todos os status</option></select><select id="c-ftema" aria-label="Tema"><option value="">Todos os temas</option></select><span class="note" id="c-conta" aria-live="polite"></span></div>');
  sec.insertBefore(bar,det);
  STATUS.forEach(function(s){$('c-fst').appendChild(new Option(s,s));});
  ['c-busca'].forEach(function(k){$(k).addEventListener('input',function(){renderGuests();});});
  ['c-fst','c-ftema'].forEach(function(k){$(k).addEventListener('change',function(){renderGuests();});});
  /* formulário do painel: opções em botões, modo edição e excluir */
  var POTC=['?','5','4','3','2','1'];
  segmentar('c-conx');segmentar('c-ab',['?','Alta','Média','Baixa']);segmentar('c-pot',POTC);segmentar('c-st');
  var ft=$('cform').querySelector('.btns:last-child');
  var del=el('<button type="button" class="btn small ghost tdanger" id="c-del" hidden>Excluir</button>');ft.appendChild(del);
  var convEdit=null,tit=$('cform-tit');
  function modoNovo(){convEdit=null;if(tit)tit.textContent='Novo convidado';$('cadd').textContent='Adicionar convidado';del.hidden=true;
    ['c-nome','c-emp','c-cargo'].forEach(function(k){$(k).value='';});$('c-conx').value='nao';$('c-ab').value='?';$('c-pot').value='?';$('c-st').value='Sugerido';
    ['c-temas','c-segs'].forEach(function(b){$(b).querySelectorAll('input').forEach(function(i){i.checked=false;});});['c-conx','c-ab','c-pot','c-st'].forEach(pintar);}
  var antes=gavAoFechar.cform;gavAoFechar.cform=function(){if(antes)antes();modoNovo();};
  $('cnova').addEventListener('click',function(){modoNovo();},true);
  function abrir(id){var g=guests.filter(function(x){return x.id===id;})[0];if(!g)return;
    convEdit=id;renderChks();
    $('c-nome').value=g.nome||'';$('c-emp').value=g.empresa||'';$('c-cargo').value=g.cargo||'';
    $('c-conx').value=g.conexao==='sim'?'sim':'nao';$('c-ab').value=g.abertura||'?';$('c-pot').value=g.potencial?String(g.potencial):'?';$('c-st').value=STATUS.indexOf(g.status)>=0?g.status:'Sugerido';
    ['c-conx','c-ab','c-pot','c-st'].forEach(pintar);
    $('c-temas').querySelectorAll('input').forEach(function(i){i.checked=gT(g).indexOf(i.value)>=0;});
    $('c-segs').querySelectorAll('input').forEach(function(i){i.checked=gS(g).indexOf(i.value)>=0;});
    if(tit)tit.textContent=g.nome||'Convidado';$('cadd').textContent='Salvar alterações';del.hidden=!pode('excluir');delete del.dataset.sure;del.textContent='Excluir';$('cmsg').textContent='Nota atual: '+gscore(g)+' de 100';
    abrirGav('cform','c-nome');}
  $('cform').addEventListener('submit',function(e){if(!convEdit)return;e.preventDefault();e.stopImmediatePropagation();if(!db)return;
    var g={nome:$('c-nome').value.trim(),empresa:$('c-emp').value.trim(),cargo:$('c-cargo').value.trim(),temas:checked('c-temas'),segmentos:checked('c-segs'),potencial:$('c-pot').value==='?'?null:+$('c-pot').value,conexao:$('c-conx').value,abertura:$('c-ab').value,status:$('c-st').value,editadoEm:new Date().toISOString()};
    if(!g.nome){$('cmsg').textContent='Dê um nome ao convidado.';return;}
    db.doc('convidados/'+convEdit).update(g).then(function(){fecharGav('cform','Convidado atualizado.');}).catch(function(){$('cmsg').textContent='Não foi possível salvar.';});},true);
  del.addEventListener('click',function(){confirma(del,'Confirmar exclusão',function(){var id=convEdit;db.doc('convidados/'+id).delete().then(function(){fecharGav('cform','Convidado excluído.');}).catch(function(){$('cmsg').textContent='Não foi possível excluir.';});});});
  var STC={Sugerido:'neutral',Aprovado:'neutral',Contatado:'warn',Confirmado:'ok',Palestrou:'wine','Voltou ou indicou':'wine'};
  renderGuests=function(){
    var temas={};guests.forEach(function(g){var ts=gT(g);if(!ts.length)ts=['Sem tema'];ts.forEach(function(t){temas[t]=temas[t]||{r:0,s:0,p:0};if(['Aprovado','Contatado','Confirmado'].indexOf(g.status)>=0)temas[t].r++;else if(g.status==='Palestrou'||g.status==='Voltou ou indicou')temas[t].p++;else temas[t].s++;});});
    var semRes=0;
    $('tcov').innerHTML=Object.keys(temas).sort().map(function(t){var o=temas[t];if(!o.r)semRes++;var st=o.r>=2?['Com reservas','ok']:o.r===1?['1 reserva','warn']:['Sem reserva','bad'];return '<div class="kpi"><div class="tt">'+esc(t)+'</div><div class="v num">'+o.r+'</div><div class="l">reserva'+(o.r===1?'':'s')+(o.s||o.p?'<br>':'')+(o.s?o.s+' sugerido'+(o.s>1?'s':''):'')+(o.s&&o.p?' · ':'')+(o.p?o.p+(o.p>1?' já palestraram':' já palestrou'):'')+'</div><span class="chip '+st[1]+'">'+st[0]+'</span></div>';}).join('');
    $('c-covres').textContent=Object.keys(temas).length?(semRes?semRes+' de '+Object.keys(temas).length+' temas sem reserva':'todos os '+Object.keys(temas).length+' temas com reserva'):'';
    var ftm=$('c-ftema'),cur=ftm.value;ftm.innerHTML='<option value="">Todos os temas</option>'+allTemas().sort().map(function(t){return '<option'+(t===cur?' selected':'')+'>'+esc(t)+'</option>';}).join('');
    if(!guests.length){$('ctable').innerHTML='<tbody><tr><td class="empty">Nenhum convidado ainda. Clique em “+ Novo convidado”.</td></tr></tbody>';$('c-conta').textContent='';return;}
    var q=nrm($('c-busca').value).trim(),fs=$('c-fst').value,fte=ftm.value;
    var list=guests.filter(function(g){if(fs&&g.status!==fs)return false;if(fte&&gT(g).indexOf(fte)<0)return false;if(q&&nrm([g.nome,g.empresa,g.cargo].concat(gT(g),gS(g)).join(' ')).indexOf(q)<0)return false;return true;})
      .map(function(g){return {g:g,s:gscore(g)};}).sort(function(a,b){return b.s-a.s;});
    $('c-conta').textContent=list.length+' de '+guests.length+' convidados';
    var h='<thead><tr><th>Convidado</th><th>Temas e segmentos</th><th>Status</th><th class="r">Nota</th><th>Conexão</th></tr></thead><tbody>';
    if(!list.length)h+='<tr><td colspan="5" class="empty">Nenhum convidado com esses filtros.</td></tr>';
    list.forEach(function(o){var g=o.g,l=o.s>=70?'ok':o.s>=45?'warn':'neutral';
      h+='<tr data-copen="'+esc(g.id)+'" tabindex="0"><td><span class="tn">'+esc(g.nome||'Sem nome')+'</span><span class="tsub">'+esc([g.cargo,g.empresa].filter(Boolean).join(' · '))+'</span></td>'+
        '<td>'+(gT(g).map(function(t){return '<span class="ttag">'+esc(t)+'</span>';}).join('')+gS(g).map(function(t){return '<span class="ttag seg2">'+esc(t)+'</span>';}).join('')||'<span class="note">—</span>')+'</td>'+
        '<td><span class="chip '+(STC[g.status]||'neutral')+'">'+esc(g.status||'Sugerido')+'</span></td>'+
        '<td class="r"><span class="tbig '+l+'">'+o.s+'</span></td><td>'+(g.conexao==='sim'?'<span class="chip ok">membro conhece</span>':'<span class="note">—</span>')+'</td></tr>';});
    $('ctable').innerHTML=h+'</tbody>';$('ctable').classList.add('tlist');
  };
  function clique(e){var tr=e.target.closest('[data-copen]');if(tr&&(e.type==='click'||e.key==='Enter'||e.key===' ')){if(e.type==='keydown')e.preventDefault();abrir(tr.dataset.copen);}}
  $('ctable').addEventListener('click',clique);$('ctable').addEventListener('keydown',clique);
  renderGuests();
})();

/* ============================== CALENDÁRIO ============================== */
(function(){
  var kn=$('view-cal').querySelector('.section-head .note');if(kn)kn.textContent='Feriados, férias e outros bloqueios usados na nota da data. Clique num bloqueio da lista para editar, ou num dia do calendário para criar um novo. Feriados também contam como dia não útil no cronograma, e a véspera de feriado tira 50 pontos.';
  var sec=$('view-cal'),det=$('k-details'),tw=$('ktab').closest('.tablewrap'),past=$('k-past');
  var bar=el('<div class="sbar" style="margin-top:16px"><input type="search" id="k-busca" placeholder="Buscar bloqueio" aria-label="Buscar bloqueio"><select id="k-ftipo" aria-label="Tipo"><option value="">Todos os tipos</option></select><label class="sbar-ck"></label><span class="note" id="k-conta"></span></div>');
  Object.keys(CALTIPO).forEach(function(k){$('k-ftipo')||0;});
  sec.insertBefore(bar,det);var lb=bar.querySelector('.sbar-ck');lb.appendChild(past);lb.appendChild(document.createTextNode(' Mostrar passados'));
  Object.keys(CALTIPO).forEach(function(k){bar.querySelector('#k-ftipo').appendChild(new Option(CALTIPO[k][0],k));});
  sec.insertBefore(tw,det);det.remove();
  $('k-busca').addEventListener('input',function(){renderCal();});$('k-ftipo').addEventListener('change',function(){renderCal();});
  /* campos que só existiam na tabela passam para o painel */
  var grid=$('kform').querySelector('.inlineform');
  grid.appendChild(el('<div class="field"><label for="k-pen">Penalidade <span class="rq opt">vazio = padrão do tipo</span></label><input id="k-pen" type="number" min="0" max="100" inputmode="numeric"></div>'));
  grid.appendChild(el('<div class="field"><label for="k-obs">Observações</label><input id="k-obs"></div>'));
  grid.appendChild(el('<label class="sd-ativa"><input type="checkbox" id="k-ativa" checked> Ativo (conta na nota da data)</label>'));
  segmentar('k-tipo',['Feriado','Férias','Evento externo','Outro']);
  function pph(){$('k-pen').placeholder=(CALTIPO[$('k-tipo').value]||CALTIPO.outro)[1];}$('k-tipo').addEventListener('change',pph);pph();
  var ft=$('kform').querySelector('.btns:last-child'),del=el('<button type="button" class="btn small ghost tdanger" id="k-del" hidden>Excluir</button>');ft.appendChild(del);
  var calEdit=null,tit=$('kform-gav').querySelector('h3'),dica=$('kform').querySelector('p.note');
  function modoNovo(){calEdit=null;if(tit)tit.textContent='Novo bloqueio';if(dica)dica.hidden=false;$('kform').querySelector('button[type=submit]').textContent='Adicionar bloqueio';del.hidden=true;$('k-pen').value='';$('k-obs').value='';$('k-ativa').checked=true;}
  var antes=gavAoFechar.kform;gavAoFechar.kform=function(){if(antes)antes();modoNovo();$('k-nome').value='';};
  function abrir(id){var x=calRows.filter(function(r){return r.id===id;})[0];if(!x)return;calEdit=id;
    $('k-nome').value=x.nome||'';$('k-ini').value=x.inicio||'';$('k-fim').value=x.fim||'';$('k-tipo').value=CALTIPO[x.tipo]?x.tipo:'outro';pintar('k-tipo');pph();
    $('k-pen').value=x.penalidade==null?'':x.penalidade;$('k-obs').value=x.obs||'';$('k-ativa').checked=x.ativa!==false;
    if(tit)tit.textContent=x.nome||'Bloqueio';if(dica)dica.hidden=true;$('kform').querySelector('button[type=submit]').textContent='Salvar alterações';del.hidden=!pode('excluir');delete del.dataset.sure;del.textContent='Excluir';$('kmsg').textContent='';
    abrirGav('kform','k-nome');}
  $('kform').addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();if(!db){$('kmsg').textContent='Sem conexão com a base.';return;}
    var ini=$('k-ini').value,fim=$('k-fim').value||ini,nome=$('k-nome').value.trim();
    if(!nome){$('kmsg').textContent='Dê um nome ao bloqueio.';return;}if(!ini){$('kmsg').textContent='Escolha a data de início.';return;}if(fim<ini){$('kmsg').textContent='O fim precisa ser depois do início.';return;}
    var pen=$('k-pen').value;if(pen!==''&&(+pen<0||+pen>100)){$('kmsg').textContent='A penalidade vai de 0 a 100.';return;}
    var d={nome:nome,inicio:ini,fim:fim,tipo:$('k-tipo').value,penalidade:pen===''?null:+pen,obs:$('k-obs').value.trim(),ativa:$('k-ativa').checked};
    var op=calEdit?db.doc('calendario/'+calEdit).update(d):db.collection('calendario').add(d);var era=!!calEdit;
    op.then(function(){fecharGav('kform',era?'Bloqueio atualizado.':'Bloqueio adicionado.');}).catch(function(){$('kmsg').textContent='Não foi possível salvar.';});},true);
  del.addEventListener('click',function(){confirma(del,'Confirmar exclusão',function(){db.doc('calendario/'+calEdit).delete().then(function(){fecharGav('kform','Bloqueio excluído.');}).catch(function(){$('kmsg').textContent='Não foi possível excluir.';});});});
  var KC={feriado:'bad',ferias:'bad',externo:'warn',outro:'neutral'};
  function per(x){var a=x.inicio||'',b=x.fim||a;if(!a)return '—';var f=function(s){return s.slice(8,10)+'/'+s.slice(5,7);};return a===b?f(a)+'/'+a.slice(2,4):f(a)+' a '+f(b)+'/'+b.slice(2,4);}
  renderCal=function(){
    if($('k-grid'))renderMonth();
    var today=iso(new Date()),ps=past.checked,q=nrm($('k-busca').value).trim(),ftp=$('k-ftipo').value;
    if(!calRows.length){$('ktab').innerHTML='<tbody><tr><td class="empty">Nenhuma data cadastrada'+(db?'':' (sem conexão com a base: a nota usa a lista padrão)')+'.</td></tr></tbody>';$('k-conta').textContent='';return;}
    var rows=calRows.filter(function(x){if(!ps&&(x.fim||x.inicio||'')<today)return false;if(ftp&&(x.tipo||'outro')!==ftp)return false;if(q&&nrm([x.nome,x.obs].join(' ')).indexOf(q)<0)return false;return true;}).sort(function(a,b){return (a.inicio||'')<(b.inicio||'')?-1:1;});
    $('k-conta').textContent=rows.length+(rows.length===1?' bloqueio':' bloqueios');
    var h='<thead><tr><th>Período</th><th>Bloqueio</th><th>Tipo</th><th class="r">Peso na nota</th></tr></thead><tbody>';
    if(!rows.length)h+='<tr><td colspan="4" class="empty">Nenhum bloqueio com esses filtros.</td></tr>';
    rows.forEach(function(x){var t=CALTIPO[x.tipo]?x.tipo:'outro',pen=x.penalidade==null?CALTIPO[t][1]:x.penalidade;
      h+='<tr data-kopen="'+esc(x.id)+'" tabindex="0"'+(x.ativa===false?' class="off"':'')+'><td class="num"><b>'+per(x)+'</b></td><td><span class="tn">'+esc(x.nome||'Sem nome')+'</span>'+(x.ativa===false?'<span class="ttag">inativo</span>':'')+(x.obs?'<span class="tsub">'+esc(x.obs)+'</span>':'')+'</td><td><span class="chip '+KC[t]+'">'+CALTIPO[t][0]+'</span></td><td class="r"><span class="tbig">−'+pen+'</span>'+(x.penalidade==null?'':'<span class="tsub">ajustado</span>')+'</td></tr>';});
    $('ktab').innerHTML=h+'</tbody>';$('ktab').classList.add('tlist');
  };
  function clique(e){var tr=e.target.closest('[data-kopen]');if(tr&&(e.type==='click'||e.key==='Enter'||e.key===' ')){if(e.type==='keydown')e.preventDefault();abrir(tr.dataset.kopen);}}
  $('ktab').addEventListener('click',clique);$('ktab').addEventListener('keydown',clique);
  renderCal();
})();

/* ============================== DOCUMENTOS ============================== */
(function(){
  var ft=$('dform').querySelector('.btns:last-child'),del=el('<button type="button" class="btn small ghost tdanger" id="d-del" hidden>Excluir</button>');ft.appendChild(del);
  segmentar('d-tipo');
  /* quando o painel abre para editar, mostra o Excluir */
  var obs=new MutationObserver(function(){var ed=!!docEdit;if(!$('dform-gav').hidden){var dx=ed?docs.filter(function(d){return d.id===docEdit;})[0]:null;opcoesMembros($('d-resp'),dx?dx.resp:'');}del.hidden=!ed||!pode('excluir');if(!ed){delete del.dataset.sure;del.textContent='Excluir';}pintar('d-tipo');});
  obs.observe($('dform-gav'),{attributes:true,attributeFilter:['hidden']});
  del.addEventListener('click',function(){confirma(del,'Confirmar exclusão',function(){var id=docEdit;db.doc('documentos/'+id).delete().then(function(){fecharGav('dform','Documento excluído.');}).catch(function(){$('dmsg').textContent='Não foi possível excluir.';});});});
  renderDocs=function(){
    renderDocEvChoices();pintar('d-tipo');
    var q=nrm($('dsearch').value).trim(),fe=$('dfilter').value;
    if(!docs.length){$('dlist').innerHTML='<div class="panel empty">Nenhum documento ainda. Clique em “+ Novo documento”.</div>';return;}
    var l=docs.filter(function(x){if(q&&nrm([x.nome,x.resp,x.resumo,x.versao,x.tipo].join(' ')).indexOf(q)<0)return false;if(fe==='__geral')return !dEvs(x).length;if(fe)return dEvs(x).indexOf(fe)>=0;return true;}).sort(function(a,b){return String(a.nome).localeCompare(b.nome);});
    var h='<div class="tablewrap"><table class="tlist" id="dtab"><thead><tr><th>Documento</th><th>Eventos ligados</th><th>Tipo</th><th>Responsável</th><th class="r"></th></tr></thead><tbody>';
    if(!l.length)h+='<tr><td colspan="5" class="empty">Nenhum documento com esse filtro.</td></tr>';
    l.forEach(function(x){var f=dFontes(x),u=dPrincipal(x.tipo,f.link,f.arquivo),ev=dEvs(x);
      var alt=f.link&&f.arquivo?(u===f.arquivo?'<a class="alt" href="'+esc(f.link)+'" target="_blank" rel="noopener">link</a>':'<a class="alt" href="'+esc(f.arquivo)+'" target="_blank" rel="noopener">arquivo</a>'):'';
      h+='<tr data-dopen="'+esc(x.id)+'" tabindex="0"><td><span class="tn">'+esc(x.nome)+'</span>'+(x.resumo?'<span class="tsub">'+esc(x.resumo)+'</span>':'')+'</td>'+
        '<td>'+(ev.length?ev.map(function(id){return '<span class="ttag">'+esc(evName(id))+'</span>';}).join(''):'<span class="note">geral</span>')+'</td>'+
        '<td><span class="chip neutral">'+esc(x.tipo||'—')+(x.versao?' · '+esc(x.versao):'')+'</span></td><td>'+(x.resp?esc(x.resp):'<span class="note">—</span>')+'</td>'+
        '<td class="r topen">'+(u?'<a class="open" href="'+esc(u)+'" target="_blank" rel="noopener">Abrir ↗</a>'+(alt?' <span class="note">ou</span> '+alt:''):'<span class="note">sem link</span>')+'</td></tr>';});
    $('dlist').innerHTML=h+'</tbody></table></div>';
  };
  function clique(e){if(e.target.closest('a'))return;var tr=e.target.closest('[data-dopen]');if(!tr||!(e.type==='click'||e.key==='Enter'||e.key===' '))return;if(e.type==='keydown')e.preventDefault();
    var b=document.createElement('button');b.type='button';b.hidden=true;b.dataset.dedit=tr.dataset.dopen;$('dlist').appendChild(b);b.click();b.remove();}
  $('dlist').addEventListener('click',clique);$('dlist').addEventListener('keydown',clique);
  renderDocs();
})();

/* ============================== PARÂMETROS ============================== */
(function(){
  var sec=$('view-par'),form=$('parform'),btns=$('parsave').parentNode;
  var cards=el('<div class="tpar" id="parcards"></div>');sec.insertBefore(cards,form);
  var hn=sec.querySelector('.section-head .note');if(hn)hn.textContent='Números usados nos cálculos do Planejar. Só a diretoria altera.';
  var aviso=el('<p class="note tparnote">Clique num grupo para editar. Mudanças valem para todos os próximos cálculos; o app pede confirmação antes de salvar.</p>');sec.insertBefore(aviso,cards);
  gav('parform','Parâmetros');
  var rodape=el('<div class="btns"></div>');rodape.appendChild($('parsave'));rodape.appendChild(el('<button type="button" class="btn ghost" data-gclose>Cancelar</button>'));
  var gpad=el('<button type="button" class="btn small ghost" id="par-grppad">Voltar este grupo ao padrão</button>');rodape.appendChild(gpad);rodape.appendChild($('parmsg'));
  btns.appendChild($('parreset'));$('parreset').textContent='Restaurar todos os padrões';
  var grupo=0;
  var orig=renderPar;
  function mostrar(){form.querySelectorAll('fieldset').forEach(function(f,i){f.hidden=i!==grupo;});if(!rodape.parentNode||rodape.parentNode!==form)form.appendChild(rodape);}
  function fmtv(k,v){var F=null;PFORM.forEach(function(g){g[1].forEach(function(f){if(f[0]===k)F=f;});});var lab=F?F[1]:'';
    if(/R\$/.test(lab))return 'R$ '+String(v).replace('.',',');if(/\(%\)/.test(lab))return v+'%';if(/\(min\)|minutos/.test(lab))return v+' min';if(/\(s\)|segundos/.test(lab))return v+' s';return String(v);}
  renderPar=function(){orig();mostrar();
    cards.innerHTML=PFORM.map(function(g,i){return '<button type="button" class="tpc" data-grp="'+i+'"><span class="tpc-h"><b>'+esc(g[0])+'</b><span class="note">Editar ›</span></span><dl class="kv">'+g[1].map(function(f){var mud=String(P[f[0]])!==String(PDEF[f[0]]);return '<dt>'+esc(f[1].replace(/\s*\((R\$|%|min|s)\)/,''))+'</dt><dd'+(mud?' class="mud" title="Diferente do padrão ('+esc(PDEF[f[0]])+')"':'')+'>'+esc(fmtv(f[0],P[f[0]]))+'</dd>';}).join('')+'</dl></button>';}).join('');};
  cards.addEventListener('click',function(e){var b=e.target.closest('[data-grp]');if(!b)return;grupo=+b.dataset.grp;mostrar();$('parform-tit').textContent=PFORM[grupo][0];abrirGav('parform');});
  gpad.addEventListener('click',function(){PFORM[grupo][1].forEach(function(f){var i=$('par-'+f[0]);if(i){i.value=PDEF[f[0]];}});parDirty=true;$('parmsg').textContent='Valores padrão colocados. Salve para valer.';});
  gavAoFechar.parform=function(){if(parDirty){parDirty=false;renderPar();}$('parmsg').textContent='';};
  var sv=savePar;savePar=function(){sv();renderPar();setTimeout(function(){if(!parDirty)fecharGav('parform');},400);};
  renderPar();
})();

/* ============================== BASE DE EVENTOS ============================== */
(function(){
  var sec=$('view-base'),fb=$('bfilter'),velho=fb.parentNode;
  var bar=el('<div class="sbar"><input type="search" id="b-busca" placeholder="Buscar evento, convidado ou sala" aria-label="Buscar evento"><div class="seg tseg" id="b-vista" role="group"><button type="button" data-v="" class="on" aria-pressed="true">Todos</button><button type="button" data-v="prox" aria-pressed="false">Próximos</button><button type="button" data-v="real" aria-pressed="false">Realizados</button></div><label class="sbar-ck"><input type="checkbox" id="b-teste" checked> Mostrar [teste]</label><span class="note" id="b-conta"></span></div>');
  sec.insertBefore(bar,velho);bar.insertBefore(fb,bar.querySelector('.sbar-ck'));fb.setAttribute('aria-label','Tipo');velho.remove();
  var nota=$('kpis').nextElementSibling;if(nota&&nota.tagName==='P')nota.textContent='Os indicadores não contam eventos com “[teste]”. Comparecimento = presentes que se inscreveram ÷ inscritos. Clique num evento para ver tudo e agir.';
  var vista='';
  $('b-vista').addEventListener('click',function(e){var b=e.target.closest('[data-v]');if(!b)return;vista=b.dataset.v;[].forEach.call(this.children,function(x){var on=x===b;x.className=on?'on':'';x.setAttribute('aria-pressed',on);});renderBase();});
  $('b-busca').addEventListener('input',function(){renderBase();});$('b-teste').addEventListener('change',function(){renderBase();});
  var bReg=null;
  window.aposRegistro=function(id){if(bReg===id)bReg=null;};
  function brl(v){return 'R$ '+(+v).toFixed(2).replace('.',',');}
  function situ(e,today){var dn=e.status==='realizado';
    if(dn){var tc=e.inscritos?Math.max(0,e.presentes-(+e.semInscricao||0))/e.inscritos:null;return tc==null?'<span class="chip neutral">realizado</span>':semaf(tc,'tc').replace('</span>',' vieram</span>');}
    if(e.data&&e.data<today)return '<span class="chip bad">resultado pendente</span>';
    var i=e.inscricao;if(i&&i.formId)return i.aberto===false?'<span class="chip neutral">inscrições fechadas</span>':'<span class="chip ok">inscrições abertas</span>';
    return '<span class="chip neutral">'+(window.ROBO_URL?'sem Forms':'planejado')+'</span>';}
  function insc(e){var dn=e.status==='realizado',meta=+e.inscritosMeta||0;
    if(dn)return e.inscritos!=null?'<b>'+e.inscritos+'</b> inscritos':'—';
    var n=e.inscricao&&e.inscricao.formId?(+e.inscricao.total||0):null;
    if(n==null)return meta?'<span class="note">meta de '+meta+'</span>':'—';
    var pc=meta?Math.min(100,Math.round(n/meta*100)):0;return (meta?'<span class="tbar"><i style="width:'+pc+'%"></i></span>':'')+'<b>'+n+'</b>'+(meta?' de '+meta:'');}
  renderBase=function(){
    var today=iso(new Date()),ft=fb.value,q=nrm($('b-busca').value).trim(),tst=$('b-teste').checked;
    var all=events.slice();
    var real=all.filter(function(e){return e.status==='realizado';}),pend=all.filter(function(e){return e.status!=='realizado'&&e.data&&e.data<today;});
    var I=0,Pr=0,C=0,CP=0,realK=real.filter(function(e){return !/\[teste\]/i.test(e.nome||'');});realK.forEach(function(e){if(+e.inscritos){I+=+e.inscritos;Pr+=Math.max(0,(+e.presentes||0)-(+e.semInscricao||0));}if(e.custo){C+=+e.custo;CP+=+e.presentes||0;}});
    var prox=all.length-real.length-pend.length;
    $('kpis').innerHTML=[['Próximos',prox,''],['Resultados pendentes',pend.length,pend.length?'kbad':''],['Comparecimento geral',I?Math.round(Pr/I*100)+'%':'—',''],['Custo por presente',CP?'R$ '+(C/CP).toFixed(2).replace('.',','):'—','']].map(function(k){return '<div class="kpi '+k[2]+'"><div class="v num">'+k[1]+'</div><div class="l">'+k[0]+'</div></div>';}).join('');
    var types={};all.forEach(function(e){if(e.tipo)types[e.tipo]=1;});
    var cur=fb.value;fb.innerHTML='<option value="">Todos os tipos</option>'+Object.keys(types).sort().map(function(t){return '<option'+(t===cur?' selected':'')+'>'+esc(t)+'</option>';}).join('');
    if(!all.length){$('etable').innerHTML='<tbody><tr><td class="empty">A base está vazia. Planeje um evento e clique em “Salvar evento”.</td></tr></tbody>';$('b-conta').textContent='';painelAtualizar('view-base');return;}
    var list=all.filter(function(e){if(ft&&e.tipo!==ft)return false;if(!tst&&/\[teste\]/i.test(e.nome||''))return false;
      if(q&&nrm([e.nome,e.tipo,e.sala,e.convidado,e.responsavel].join(' ')).indexOf(q)<0)return false;var dn=e.status==='realizado';if(vista==='prox'&&dn)return false;if(vista==='real'&&!dn)return false;return true;});
    var pen=list.filter(function(e){return e.status!=='realizado'&&e.data&&e.data<today;}).sort(function(a,b){return (a.data||'')<(b.data||'')?-1:1;});
    var nx=list.filter(function(e){return e.status!=='realizado'&&!(e.data&&e.data<today);}).sort(function(a,b){return (a.data||'9')<(b.data||'9')?-1:1;});
    var dn=list.filter(function(e){return e.status==='realizado';}).sort(function(a,b){return (a.data||'')<(b.data||'')?1:-1;});
    $('b-conta').textContent=list.length+(list.length===1?' evento':' eventos')+(pen.length?' · '+pen.length+' pendente'+(pen.length>1?'s':''):'');
    function row(e){var d=e.data?e.data.slice(8,10)+'/'+e.data.slice(5,7):'—',dnn=e.status==='realizado',cp=dnn&&e.custo&&e.presentes?e.custo/e.presentes:null;
      var sub=[e.tipo,e.sala?(e.sala+(e.capacidade?' ('+e.capacidade+')':'')):'',e.hora,e.responsavel?'resp. '+String(e.responsavel).split(' ')[0]:''].filter(Boolean).join(' · ');
      return '<tr data-eopen="'+esc(e.id)+'" tabindex="0"><td class="num"><b>'+d+'</b><span class="tsub">'+(e.data?e.data.slice(0,4):'')+'</span></td><td><span class="tn">'+esc(e.nome||'Sem nome')+'</span>'+(e.excecao?' <span class="chip warn" title="'+esc(e.excecao.motivo||'')+'">exceção</span>':'')+'<span class="tsub"><span class="tmob">'+d+' · </span>'+esc(sub)+'</span></td><td>'+insc(e)+'</td><td>'+situ(e,today)+'</td><td class="r">'+(cp!=null?semaf(cp,'cp'):'<span class="note">—</span>')+'</td></tr>';}
    var h='<thead><tr><th>Data</th><th>Evento</th><th>Inscrições</th><th>Situação</th><th class="r">Custo/presente</th></tr></thead><tbody>';
    if(pen.length||nx.length)h+='<tr class="grp"><td colspan="5">Próximos e pendentes ('+(pen.length+nx.length)+')</td></tr>'+pen.concat(nx).map(row).join('');
    if(dn.length)h+='<tr class="grp"><td colspan="5">Realizados ('+dn.length+')</td></tr>'+dn.map(row).join('');
    if(!list.length)h+='<tr><td colspan="5" class="empty">Nenhum evento com esses filtros.</td></tr>';
    $('etable').innerHTML=h+'</tbody>';$('etable').classList.add('tlist');
    painelAtualizar('view-base');
  };
  function fld(e,k,l,v,req,st){return '<div class="field"><label for="'+k+'-'+e.id+'">'+l+'</label><input id="'+k+'-'+e.id+'" type="number" min="0" inputmode="decimal"'+(st?' step="'+st+'"':'')+(req?' required':'')+' value="'+esc(v==null?'':v)+'"></div>';}
  function regForm(e){var dn=e.status==='realizado',g=function(k){return dn&&e[k]!=null?e[k]:'';};
    var ins=dn?e.inscritos:(e.inscricao&&e.inscricao.formId?e.inscricao.total:(e.inscritosMeta||''));
    return '<form class="tp-reg" data-regform="'+esc(e.id)+'" novalidate><div class="treg">'+fld(e,'ri','Inscritos',ins,1)+fld(e,'rp','Presentes (total)',g('presentes'),1)+fld(e,'rw','Vieram sem inscrição',g('semInscricao'))+fld(e,'rm','Membros presentes',g('membros'))+fld(e,'rpc','Porções compradas',g('porcoesCompradas'))+fld(e,'rpu','Porções consumidas',g('porcoesConsumidas'))+fld(e,'rd','Duração real (min)',g('duracaoReal'))+fld(e,'ra','Atraso (min)',g('atraso'))+
      fld(e,'rcb','Custo básico (R$)',dn?(e.custoBasico!=null?e.custoBasico:(e.custo!=null?e.custo:'')):'',0,'0.01')+fld(e,'rcn','Custo não previsto (R$)',g('custoNaoPrev'),0,'0.01')+
      '<div class="field"><label for="rmt-'+esc(e.id)+'">Método de check-in</label><select id="rmt-'+esc(e.id)+'"><option value="">—</option><option value="papel"'+(e.metodoCheckin==='papel'?' selected':'')+'>Lista de papel</option><option value="qr"'+(e.metodoCheckin==='qr'?' selected':'')+'>QR</option></select></div></div>'+
      '<div class="btns" style="margin-top:12px"><button class="btn" type="submit">Salvar resultado</button>'+(dn?'<button class="btn ghost" type="button" data-treg="">Cancelar</button>':'')+'</div></form>';}
  /* ----- e-mails para os inscritos ----- */
  var ETIPOS=[['confirmacao','Confirmação de inscrição','até 10 min depois de cada inscrição',true],['lembrete','Lembrete','a partir de 48 h antes',true],['dia','Aviso no dia','3 h antes do início',false],['agradecimento','Agradecimento','no dia seguinte ao evento',true]];
  var bEmail=null,rasc={},prevHtml={},emMsg={},emOcup={},alcance={},hist={},modelos=null;
  function enome(t){var x={mudanca:'Aviso de mudança',divulgacao:'Convite para a lista de novidades'}[t];if(x)return x;for(var i=0;i<ETIPOS.length;i++)if(ETIPOS[i][0]===t)return ETIPOS[i][1];return t;}
  function estado(i,t){var x=(i.emails||{})[t];if(!x||!x.enviados&&!x.erros)return 'nada enviado ainda';
    return 'enviado para '+x.enviados+(x.pendentes?' · <b>'+x.pendentes+' na fila</b>':'')+(x.erros?' · <span style="color:var(--red)">'+x.erros+' com erro</span>':'')+(x.em?' · último em '+esc(hhmm(x.em)):'');}
  function emailsBlk(e){var i=e.inscricao,cfg=e.emails||{},id=esc(e.id),oc=emOcup[e.id],ed=pode('editar'),h='';
    if(i.mudanca&&i.mudanca.pendente)h+='<div class="tem-alerta"><b>O evento mudou</b>: '+esc(i.mudanca.texto||'')+'. Avisar os '+(+i.total||0)+' inscritos?'+(ed?'<div class="btns"><button type="button" class="btn small" data-em-env="mudanca">Avisar inscritos</button><button type="button" class="btn small ghost" data-em-txt="mudanca">Ver texto</button><button type="button" class="btn small ghost" data-em-ign="1">Não avisar</button></div>':'')+'</div>';
    ETIPOS.forEach(function(T){var t=T[0],c=cfg[t]||{},auto=c.auto!=null?!!c.auto:T[3];
      h+='<div class="temr"><div class="temr-t"><b>'+T[1]+'</b>'+(c.corpo?' <span class="ttag">texto próprio</span>':'')+'<span class="tsub">'+(auto?'automático: '+T[2]:'desligado')+'</span><span class="tsub">'+estado(i,t)+'</span></div>'+
        (ed?'<div class="temr-a"><label class="tsw"><input type="checkbox" data-em-auto="'+t+'"'+(auto?' checked':'')+'> automático</label><button type="button" class="btn small ghost" data-em-txt="'+t+'">Texto</button><button type="button" class="btn small ghost" data-em-env="'+t+'"'+(oc?' disabled':'')+'>Enviar agora</button></div>':'')+'</div>';});
    if(i.mudanca&&!i.mudanca.pendente)h+='<div class="temr"><div class="temr-t"><b>Aviso de mudança</b><span class="tsub">'+esc(i.mudanca.texto||'')+'</span><span class="tsub">'+estado(i,'mudanca')+'</span></div>'+(ed?'<div class="temr-a"><button type="button" class="btn small ghost" data-em-txt="mudanca">Texto</button><button type="button" class="btn small ghost" data-em-env="mudanca"'+(oc?' disabled':'')+'>Enviar agora</button></div>':'')+'</div>';
    var aberto=i.aberto!==false,al=alcance[e.id];
    h+='<div class="temr"><div class="temr-t"><b>Convite para a lista de novidades</b><span class="tsub">'+(aberto?'manda o link de inscrição para quem pediu novidades em outras inscrições'+(al!=null?' · <b>'+al+' pessoas</b> na lista (fora quem já se inscreveu)':''):'só com inscrições abertas')+'</span><span class="tsub">'+estado(i,'divulgacao')+(i.divulgacaoAtiva?' · continua sozinho quando a cota renovar':'')+'</span></div>'+
      (ed?'<div class="temr-a"><button type="button" class="btn small ghost" data-em-txt="divulgacao">Texto</button>'+(aberto?'<button type="button" class="btn small ghost" data-em-env="divulgacao"'+(oc?' disabled':'')+'>Convidar'+(al!=null?' '+al:'')+'</button>':'')+'</div>':'')+'</div>';
    h+='<div class="btns temr-f"><span class="note">'+(i.cota!=null?'Cota de e-mails hoje: <b>'+i.cota+'</b> restantes (Gmail comum: 100 por dia).':'Gmail comum: até 100 e-mails por dia; o que passar fica na fila.')+'</span><button type="button" class="btn small ghost" data-em-hist="1">'+(hist[e.id]?'Atualizar lista':'Ver quem recebeu')+'</button></div>';
    if(hist[e.id])h+=histTab(hist[e.id]);
    if(emMsg[e.id])h+='<div class="imsg'+(emMsg[e.id].erro?' err':'')+'">'+esc(emMsg[e.id].t)+'</div>';
    return blk('E-mails para os inscritos',h);}
  function histTab(d){var env=d.envios||{},rs=(d.respostas||[]).filter(function(r){return r.email;}),tps=['confirmacao','lembrete','dia','agradecimento','mudanca'].filter(function(t){return env[t]||t==='lembrete'&&d.avisados;});
    if(!rs.length)return '<p class="note">Ninguém com e-mail inscrito ainda.</p>';
    var lem=(env.lembrete&&env.lembrete.emails||[]).concat(d.avisados||[]);
    function tem(t,m){if(t==='lembrete')return lem.indexOf(m)>=0;var x=env[t]||{};if((x.emails||[]).indexOf(m)>=0)return 1;if((x.erros||[]).some(function(y){return y.email===m;}))return -1;return 0;}
    return '<div class="tablewrap" style="margin-top:8px"><table class="thist"><thead><tr><th>Inscrito</th>'+tps.map(function(t){return '<th>'+esc(enome(t).split(' ')[0])+'</th>';}).join('')+'</tr></thead><tbody>'+
      rs.map(function(r){return '<tr><td><span class="tn">'+esc(r.nome||r.email)+'</span><span class="tsub">'+esc(r.email)+(r.novidades?' · quer novidades':'')+'</span></td>'+tps.map(function(t){var v=tem(t,r.email);return '<td>'+(v===1||v===true?'<span class="chip ok">✓</span>':v===-1?'<span class="chip bad">erro</span>':'<span class="note">—</span>')+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
  var CAMPOS=[['{nome}','primeiro nome'],['{evento}','nome do evento'],['{quando}','data e hora'],['{sala}','sala'],['{convidado}','convidado'],['{detalhes}','quadro com quando/onde/com'],['{link_inscricao}','botão de inscrição'],['{link_avaliacao}','botão de avaliação'],['{mudanca}','o que mudou']];
  function editor(e,t){var k=e.id+'|'+t,r=rasc[k],ph=prevHtml[k];
    var corpo=blk('',(e.inscricao&&e.inscricao.mudanca&&t==='mudanca'?'<p class="note" style="margin:0 0 10px">O que mudou: '+esc(e.inscricao.mudanca.texto||'')+'</p>':'')+
      '<div class="field"><label for="ed-assunto">Assunto</label><input id="ed-assunto" data-ed="assunto" value="'+esc(r.assunto)+'"></div>'+
      '<div class="field" style="margin-top:10px"><label for="ed-corpo">Texto <span class="rq opt">parágrafos separados por uma linha em branco</span></label><textarea id="ed-corpo" data-ed="corpo" rows="10">'+esc(r.corpo)+'</textarea></div>'+
      (t==='agradecimento'?'<div class="field" style="margin-top:10px"><label for="ed-link">Link do formulário de avaliação</label><input id="ed-link" data-ed="link" type="url" placeholder="https://forms.gle/..." value="'+esc(r.link||'')+'"><span class="note">Sem link, o botão de avaliação não aparece.</span></div>':'')+
      '<p class="note" style="margin:10px 0 6px">Campos (clique para inserir onde está o cursor):</p><div class="tchips">'+CAMPOS.filter(function(c){return (c[0]!=='{link_avaliacao}'||t==='agradecimento')&&(c[0]!=='{mudanca}'||t==='mudanca')&&(c[0]!=='{link_inscricao}'||t==='divulgacao');}).map(function(c){return '<button type="button" data-ed-ins="'+c[0]+'" title="'+c[1]+'">'+c[0]+'</button>';}).join('')+'</div>')+
      blk('Prévia',ph?'<iframe class="tprev" sandbox="" srcdoc="'+esc(ph)+'" title="Prévia do e-mail"></iframe>':'<p class="note" style="margin:0">Clique em “Ver prévia” para ver o e-mail como chega, com o nome de exemplo.</p>')+
      (emMsg[e.id]?'<div class="imsg'+(emMsg[e.id].erro?' err':'')+'">'+esc(emMsg[e.id].t)+'</div>':'');
    var oc=emOcup[e.id];
    var rod='<div class="btns"><button type="button" class="btn" data-ed-salvar="1"'+(oc?' disabled':'')+'>Salvar texto</button><button type="button" class="btn ghost" data-ed-prev="1"'+(oc?' disabled':'')+'>Ver prévia</button><button type="button" class="btn ghost" data-ed-teste="1"'+(oc?' disabled':'')+'>Enviar teste para mim</button></div><div class="btns"><button type="button" class="btn small ghost" data-ed-pad="1">Voltar ao texto padrão</button><button type="button" class="btn small ghost" data-ed-voltar="1">← Voltar</button></div>';
    return {titulo:enome(t),sub:esc(e.nome||''),corpo:corpo,rodape:rod};}
  function emAcao(id,acao,extra,ok){emOcup[id]=1;delete emMsg[id];painelAtualizar('view-base');
    robo(acao,id,extra).then(function(j){var m=ok(j);if(m)emMsg[id]={t:m};},function(err){emMsg[id]={t:err.message,erro:1};}).then(function(){delete emOcup[id];painelAtualizar('view-base');});}
  function carregarModelos(){if(modelos)return Promise.resolve(modelos);return robo('modelos','x').then(function(j){modelos=j.modelos;return modelos;});}
  function montar(id){var e=events.filter(function(x){return x.id===id;})[0];if(!e)return null;
    if(bEmail&&bEmail.id===id)return editor(e,bEmail.tipo);
    var today=iso(new Date()),dn=e.status==='realizado',late=!dn&&e.data&&e.data<today,reg=pode('editar')&&(bReg===id||late);
    var quando=e.data?D(e.data).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'sem data';
    var sub=quando+(e.hora?' · '+e.hora:'')+(e.sala?' · '+esc(e.sala):'')+' '+situ(e,today);
    var corpo=blk('',pode('editar')?'<label class="tresp"><span>Responsável</span><select data-tresp="'+esc(id)+'"></select></label>':'<p class="tresp" style="margin:0"><span>Responsável</span><b>'+esc(e.responsavel||'—')+'</b></p>');
    if(reg)corpo+=blk(dn?'Editar resultado':'Registrar resultado',(dn?'':'<p class="note" style="margin:0 0 10px">O evento já aconteceu. Preencha com a lista de presença: é isso que calibra os próximos.</p>')+regForm(e));
    corpo+=blk(dn?'Resultado e previsto × real':'Detalhes',detail(e));
    if(window.ROBO_URL&&e.inscricao&&e.inscricao.formId)corpo+=emailsBlk(e);
    var rod='<div class="btns">'+(!dn?'<button type="button" class="btn'+(late?' ghost':'')+'" data-tplan="'+esc(id)+'">Abrir no Planejar</button>':'')+(pode('editar')&&dn&&bReg!==id?'<button type="button" class="btn ghost" data-treg="'+esc(id)+'">Editar resultado</button>':'')+(pode('editar')&&!dn&&!late?'<button type="button" class="btn ghost" data-treg="'+esc(id)+'">Registrar resultado</button>':'')+'</div>'+(pode('excluir')?'<button type="button" class="btn small ghost tdanger" data-tdel="'+esc(id)+'">Excluir</button>':'');
    return {titulo:e.nome||'Evento',sub:sub,corpo:corpo,rodape:rod};}
  function abrir(id){var ev0=events.filter(function(x){return x.id===id;})[0];
    if(window.ROBO_URL&&ev0&&ev0.inscricao&&ev0.inscricao.formId&&ev0.inscricao.aberto!==false&&alcance[id]==null&&pode('editar'))robo('alcance',id).then(function(j){alcance[id]=j.alcance;painelAtualizar('view-base');},function(){});
    painelAbrir({sec:'view-base',chave:id,montar:function(){return montar(id);},foco:'.tp-reg input',aoFechar:function(){bReg=null;bEmail=null;},depois:function(dr){var f=dr.querySelector('.tp-reg');if(f)f.addEventListener('submit',salvarRegistro);var rs=dr.querySelector('[data-tresp]');if(rs){var ev=events.filter(function(x){return x.id===id;})[0];opcoesMembros(rs,ev&&ev.responsavel);}}});}
  function clique(e){var tr=e.target.closest('[data-eopen]');if(tr&&(e.type==='click'||e.key==='Enter'||e.key===' ')){if(e.type==='keydown')e.preventDefault();abrir(tr.dataset.eopen);}}
  $('etable').addEventListener('click',clique);$('etable').addEventListener('keydown',clique);
  var ultimoCampo=null;
  sec.addEventListener('input',function(e){var f=e.target.dataset&&e.target.dataset.ed;if(!f||!bEmail)return;var k=bEmail.id+'|'+bEmail.tipo;rasc[k][f]=e.target.value;});
  sec.addEventListener('focusin',function(e){if(e.target.dataset&&(e.target.dataset.ed==='assunto'||e.target.dataset.ed==='corpo'))ultimoCampo=e.target;});
  sec.addEventListener('change',function(e){var a=e.target.closest('[data-em-auto]');if(!a||!TP||!db)return;var id=TP.o.chave,up={};up['emails.'+a.dataset.emAuto+'.auto']=a.checked;
    db.doc('eventos/'+id).update(up).catch(function(){alertMsg('Não foi possível salvar.');});});
  sec.addEventListener('click',function(e){if(!TP||TP.o.sec!=='view-base')return;var id=TP.o.chave,ev=events.filter(function(x){return x.id===id;})[0];if(!ev)return;var b;
    if((b=e.target.closest('[data-em-env]'))){var t=b.dataset.emEnv,n=t==='divulgacao'?alcance[id]:(+ev.inscricao.total||0);
      confirma(b,'Confirmar: enviar'+(n!=null?' para '+n:''),function(){emAcao(id,'enviar',{tipo:t},function(j){return j.enviados?'Enviado para '+j.enviados+(j.pendentes?'; '+j.pendentes+' ficaram na fila (limite diário).':'.'):(j.pendentes?'A cota de hoje acabou: '+j.pendentes+' na fila.':'Ninguém novo para receber esse e-mail.');});});return;}
    if((b=e.target.closest('[data-em-ign]'))){db.doc('eventos/'+id).update({'inscricao.mudanca.pendente':false}).catch(function(){});return;}
    if((b=e.target.closest('[data-em-hist]'))){db.doc('inscricoes/'+id).get().then(function(d){hist[id]=d.exists?d.data():{};painelAtualizar('view-base');},function(){emMsg[id]={t:'Não foi possível carregar a lista.',erro:1};painelAtualizar('view-base');});return;}
    if((b=e.target.closest('[data-em-txt]'))){var t2=b.dataset.emTxt;emOcup[id]=1;
      carregarModelos().then(function(M){var k=id+'|'+t2,c=(ev.emails||{})[t2]||{};if(!rasc[k])rasc[k]={assunto:c.assunto||M[t2].assunto,corpo:c.corpo||M[t2].corpo,link:ev.linkAvaliacao||''};bEmail={id:id,tipo:t2};},function(err){emMsg[id]={t:err.message,erro:1};})
        .then(function(){delete emOcup[id];painelAtualizar('view-base');var x=TP&&TP.dr.querySelector('.tp-body');if(x)x.scrollTop=0;});return;}
    if(!bEmail)return;var k=bEmail.id+'|'+bEmail.tipo,tp=bEmail.tipo,r=rasc[k];
    if((b=e.target.closest('[data-ed-ins]'))){var c=ultimoCampo||TP.dr.querySelector('[data-ed=corpo]');if(c){var a0=c.selectionStart==null?c.value.length:c.selectionStart,a1=c.selectionEnd==null?a0:c.selectionEnd,txt=b.dataset.edIns;
      if(txt.charAt(1)==='d'||txt.indexOf('link_')>0)txt=(a0&&c.value.charAt(a0-1)!=='\n'?'\n\n':'')+txt+'\n\n';
      c.value=c.value.slice(0,a0)+txt+c.value.slice(a1);r[c.dataset.ed]=c.value;c.focus();c.selectionStart=c.selectionEnd=a0+txt.length;}return;}
    if(e.target.closest('[data-ed-voltar]')){bEmail=null;painelAtualizar('view-base');return;}
    if(e.target.closest('[data-ed-pad]')){carregarModelos().then(function(M){r.assunto=M[tp].assunto;r.corpo=M[tp].corpo;delete prevHtml[k];emMsg[id]={t:'Texto padrão de volta. Salve para valer.'};painelAtualizar('view-base');});return;}
    var texto={assunto:r.assunto,corpo:r.corpo,linkAvaliacao:r.link||''};
    if(e.target.closest('[data-ed-prev]')){emAcao(id,'previa',{tipo:tp,texto:texto},function(j){prevHtml[k]=j.html;return '';});return;}
    if(e.target.closest('[data-ed-teste]')){emAcao(id,'teste',{tipo:tp,texto:texto},function(j){return 'Teste enviado para '+j.enviadoPara+'.';});return;}
    if(e.target.closest('[data-ed-salvar]')&&db){var up={};
      carregarModelos().then(function(M){var pad=r.assunto===M[tp].assunto&&r.corpo===M[tp].corpo;up['emails.'+tp+'.assunto']=pad?null:r.assunto;up['emails.'+tp+'.corpo']=pad?null:r.corpo;if(tp==='agradecimento')up.linkAvaliacao=r.link||'';
        return db.doc('eventos/'+id).update(up);}).then(function(){emMsg[id]={t:'Texto salvo. Os próximos envios usam este texto.'};painelAtualizar('view-base');},function(){emMsg[id]={t:'Não foi possível salvar.',erro:1};painelAtualizar('view-base');});}
  });
  sec.addEventListener('change',function(e){var r=e.target.closest('[data-tresp]');if(!r||!db)return;var nm=r.value,m=(window.__membros||[]).filter(function(x){return x.nome===nm;})[0];
    db.doc('eventos/'+r.dataset.tresp).update({responsavel:nm,responsavelId:m?m.id:''}).catch(function(){alertMsg('Não foi possível salvar o responsável.');});});
  document.addEventListener('membros',function(){painelAtualizar('view-base');});
  sec.addEventListener('click',function(e){
    var p=e.target.closest('[data-tplan]');if(p){painelFechar();openInPlan(p.dataset.tplan);return;}
    var r=e.target.closest('[data-treg]');if(r){bReg=r.dataset.treg||null;painelAtualizar('view-base');var i=TP&&TP.dr.querySelector('.tp-reg input');if(i)i.focus();return;}
    var d=e.target.closest('[data-tdel]');if(d){confirma(d,'Confirmar exclusão',function(){db.doc('eventos/'+d.dataset.tdel).delete().then(function(){painelFechar();}).catch(function(){alertMsg('Não foi possível excluir.');});});}
  });
  renderBase();
})();
})();
