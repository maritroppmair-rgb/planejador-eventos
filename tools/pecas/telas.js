/* ---------- telas no padrão de Salas: lista só para ler + painel lateral ---------- */
(function(){
"use strict";
function $(id){return document.getElementById(id);}
function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}
function pode(c){return document.body.classList.contains('pode-'+c);}
/* explicação de cada campo dos e-mails, mostrada ao passar o mouse (ou focar) no botão do campo */
var DICAS={
  '{nome}':'Primeiro nome de quem recebe.\nEx.: Ana. Sem nome no cadastro, vira “pessoal”.',
  '{evento}':'Nome do evento.\nEx.: Palestra de abertura',
  '{quando}':'Dia da semana, data e horário do evento.\nEx.: quarta, 2 de dezembro, às 17h',
  '{sala}':'Sala do evento.\nEx.: Sala Ruy Leme. Sem sala definida, vira “a confirmar”.',
  '{convidado}':'Nome do convidado do evento.\nEx.: Ana Beatriz. Sem convidado, fica vazio.',
  '{fechamento}':'Quando as inscrições fecham (36 h antes do início).\nEx.: segunda, 30 de novembro, às 5h',
  '{detalhes}':'Um quadrinho com Quando, Onde e Com (convidado). Funciona sozinho num parágrafo.',
  '{link_inscricao}':'Botão vermelho “Quero me inscrever”, que leva ao Forms do evento. Funciona sozinho num parágrafo.',
  '{link_avaliacao}':'Botão “Avaliar o evento”, com o link de avaliação. Funciona sozinho num parágrafo.',
  '{mudanca}':'O que mudou no evento (data, horário, sala ou nome).\nEx.: o horário mudou de 17h para 18h'};
function dica(c){var d=DICAS[c];return d?' data-dica="'+esc(d).replace(/\n/g,'&#10;')+'" aria-label="'+esc(c+': '+d.replace(/\n/g,' '))+'"':'';}
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
  var obs=new MutationObserver(function(){var ed=!!docEdit;if(!$('dform-gav').hidden){var dx=ed?docs.filter(function(d){return d.id===docEdit;})[0]:null;opcoesMembros($('d-resp'),dx?dx.resp:'');}del.hidden=!ed||!pode('docs-excluir');if(!ed){delete del.dataset.sure;del.textContent='Excluir';}pintar('d-tipo');});
  obs.observe($('dform-gav'),{attributes:true,attributeFilter:['hidden']});
  del.addEventListener('click',function(){confirma(del,'Confirmar exclusão',function(){var id=docEdit;db.doc('documentos/'+id).delete().then(function(){fecharGav('dform','Documento excluído.');}).catch(function(){$('dmsg').textContent='Não foi possível excluir.';});});});
  /* pastas: Geral + uma por evento; dentro da pasta, filtro pela área de quem subiu */
  var pasta=null,vazias=false,AREAS_D=['Eventos','Financeiro','Marketing','C&D','RH'];
  $('dfilter').hidden=true;
  var dbar=$('dsearch').parentNode;
  var fa=el('<select id="darea" aria-label="Área de quem subiu"><option value="">Todas as áreas</option></select>');
  AREAS_D.forEach(function(a){fa.appendChild(new Option(a,a));});dbar.appendChild(fa);
  fa.addEventListener('change',function(){renderDocs();});
  function dArea(x){return x.area||'Eventos';}
  function evDe(id){return events.filter(function(e){return e.id===id;})[0];}
  function dataEv(e){return e&&e.data?fmt(D(e.data))+'/'+e.data.slice(2,4):'sem data';}
  function linha(x,comPasta){var f=dFontes(x),u=dPrincipal(x.tipo,f.link,f.arquivo),ev=dEvs(x);
    var alt=f.link&&f.arquivo?(u===f.arquivo?'<a class="alt" href="'+esc(f.link)+'" target="_blank" rel="noopener">link</a>':'<a class="alt" href="'+esc(f.arquivo)+'" target="_blank" rel="noopener">arquivo</a>'):'';
    var outras=ev.filter(function(id){return id!==pasta;});
    var onde=comPasta?(ev.length?ev.map(function(id){return '<span class="ttag">'+esc(evName(id))+'</span>';}).join(''):'<span class="ttag">Geral</span>'):(outras.length&&pasta!=='__geral'?'<span class="tsub">também em '+esc(outras.map(evName).join(', '))+'</span>':'');
    return '<tr data-dopen="'+esc(x.id)+'" tabindex="0"><td><span class="tn">'+esc(x.nome)+'</span>'+(x.resumo?'<span class="tsub">'+esc(x.resumo)+'</span>':'')+(comPasta?'':onde)+'</td>'+
      (comPasta?'<td>'+onde+'</td>':'')+
      '<td><span class="chip neutral">'+esc(x.tipo||'—')+(x.versao?' · '+esc(x.versao):'')+'</span></td><td>'+esc(dArea(x))+'</td><td>'+(x.resp?esc(x.resp):'<span class="note">—</span>')+'</td>'+
      '<td class="r topen">'+(u?'<a class="open" href="'+esc(u)+'" target="_blank" rel="noopener">Abrir ↗</a>'+(alt?' <span class="note">ou</span> '+alt:''):'<span class="note">sem link</span>')+'</td></tr>';}
  function tabela(l,comPasta,vazio){
    var h='<div class="tablewrap"><table class="tlist" id="dtab"><thead><tr><th>Documento</th>'+(comPasta?'<th>Pasta</th>':'')+'<th>Tipo</th><th>Área</th><th>Responsável</th><th class="r"></th></tr></thead><tbody>';
    if(!l.length)h+='<tr><td colspan="'+(comPasta?6:5)+'" class="empty">'+vazio+'</td></tr>';
    l.forEach(function(x){h+=linha(x,comPasta);});return h+'</tbody></table></div>';}
  var PASTA_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  renderDocs=function(){
    renderDocEvChoices();pintar('d-tipo');
    var q=nrm($('dsearch').value).trim(),ar=fa.value,box=$('dlist');
    var porArea=docs.filter(function(x){return !ar||dArea(x)===ar;});
    if(pasta&&pasta!=='__geral'&&!evDe(pasta))pasta=null;
    /* busca: procura em todas as pastas */
    if(q){var l=porArea.filter(function(x){return nrm([x.nome,x.resp,x.resumo,x.versao,x.tipo].join(' ')).indexOf(q)>=0;}).sort(function(a,b){return String(a.nome).localeCompare(b.nome);});
      box.innerHTML='<p class="note dbusca">'+l.length+(l.length===1?' documento encontrado':' documentos encontrados')+' em todas as pastas.</p>'+tabela(l,true,'Nenhum documento com essa busca.');return;}
    if(!pasta){
      var cont={__geral:0};porArea.forEach(function(x){var ev=dEvs(x).filter(evDe);if(!ev.length)cont.__geral++;ev.forEach(function(id){cont[id]=(cont[id]||0)+1;});});
      var evs=events.filter(function(e){return vazias||cont[e.id];}).sort(function(a,b){return (a.data||'')<(b.data||'')?1:-1;});
      var nVaz=events.filter(function(e){return !cont[e.id];}).length;
      function card(id,nome,sub,n){return '<button type="button" class="dpasta'+(n?'':' vazia')+'" data-dpasta="'+esc(id)+'">'+PASTA_IC+'<span class="dp-t"><b>'+esc(nome)+'</b><small>'+esc(sub)+'</small></span><span class="dp-n">'+n+'</span></button>';}
      var h='<div class="dpastas">'+card('__geral','Geral','documentos sem evento',cont.__geral);
      evs.forEach(function(e){h+=card(e.id,e.nome||'(evento sem nome)',dataEv(e),cont[e.id]||0);});
      h+='</div>';
      if(nVaz)h+='<label class="check dvaz"><input type="checkbox" id="dvazias"'+(vazias?' checked':'')+'> Mostrar pastas vazias ('+nVaz+(nVaz===1?' evento sem documento':' eventos sem documento')+')</label>';
      box.innerHTML=h;return;}
    var e=pasta==='__geral'?null:evDe(pasta);
    var l=porArea.filter(function(x){var ev=dEvs(x).filter(evDe);return pasta==='__geral'?!ev.length:ev.indexOf(pasta)>=0;}).sort(function(a,b){return String(a.nome).localeCompare(b.nome);});
    box.innerHTML='<div class="dcrumb"><button type="button" class="btn small ghost" data-dpasta="">← Todas as pastas</button><h3>'+PASTA_IC+esc(e?e.nome||'(evento sem nome)':'Geral')+'</h3><span class="note">'+(e?dataEv(e)+' · ':'')+l.length+(l.length===1?' documento':' documentos')+'</span></div>'+
      tabela(l,false,ar?'Nenhum documento de '+esc(ar)+' nesta pasta.':'Esta pasta está vazia. Clique em “+ Novo documento” para adicionar.');
  };
  $('dlist').addEventListener('click',function(e){var b=e.target.closest('[data-dpasta]');if(!b)return;pasta=b.dataset.dpasta||null;renderDocs();var v=$('view-docs');if(v.getBoundingClientRect().top<0)v.scrollIntoView();
    var f=$('dlist').querySelector(pasta?'.dcrumb button':'[data-dpasta]');if(f)f.focus();});
  $('dlist').addEventListener('change',function(e){if(e.target.id==='dvazias'){vazias=e.target.checked;renderDocs();}});
  /* "+ Novo documento" dentro da pasta de um evento já liga o documento a ele */
  $('dnova').addEventListener('click',function(){if(!pasta||pasta==='__geral')return;var i=$('d-evs').querySelector('input[value="'+pasta.replace(/"/g,'')+'"]');if(i)i.checked=true;});
  window.docsAbrirPasta=function(id){pasta=id||null;$('dsearch').value='';renderDocs();};
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
  /* Forms padrão de inscrição: o robô copia este Forms para cada evento (parametros/inscricoes) */
  var PADRAO_FORM='https://docs.google.com/forms/d/1HVmot9qs1QoAu9vt_P_zWy7MzOyQsfcaL8QtDnw9Uy8/edit';
  var fb=el('<div class="tp-blk pinsc" id="par-insc"></div>');sec.appendChild(fb);var fsuj=false;
  function formId(u){var m=/docs\.google\.com\/forms\/d\/(?!e\/)([A-Za-z0-9_-]{20,})/.exec(String(u||''));return m?m[1]:'';}
  function podeF(){var p=window.__perm;return !!(p&&p.carregado()&&p.podeEm('Eventos').gerir);}
  function desenhar(){if(fsuj)return;var d=window.__parInsc||{},u=safeUrl(d.modeloFormUrl)||PADRAO_FORM,ed=podeF();
    fb.innerHTML='<h4>Forms padrão de inscrição</h4><p class="note" style="margin:0 0 8px">O robô copia este Forms para criar a inscrição de cada evento. Quem tem cargo em Eventos tem acesso de edição a ele e a todos os Forms criados (o acesso chega em até 10 min).</p>'+
      (ed?'<div class="fi-add pinsc-row"><input id="pi-url" type="url" value="'+esc(u)+'" aria-label="Link do Forms padrão"><button type="button" class="btn small" id="pi-salvar">Salvar</button></div>':'')+
      '<div class="btns" style="margin-top:6px"><a href="'+esc(u)+'" target="_blank" rel="noopener" class="fi-link">Abrir o Forms padrão ↗</a><span class="msg" id="pi-msg" role="status"></span></div>';}
  window.__parInscDesenhar=desenhar;document.addEventListener('permissoes',desenhar);desenhar();
  fb.addEventListener('input',function(e){if(e.target.id==='pi-url')fsuj=true;});
  fb.addEventListener('click',function(e){if(!e.target.closest('#pi-salvar'))return;var u=$('pi-url').value.trim(),id=formId(u),m=$('pi-msg');
    if(!id){m.textContent='Cole o link de edição do Forms (docs.google.com/forms/d/…/edit).';return;}
    if(!db){m.textContent='Sem conexão com a base.';return;}
    m.textContent='Salvando…';db.doc('parametros/inscricoes').set({modeloFormUrl:'https://docs.google.com/forms/d/'+id+'/edit',modeloFormId:id,em:new Date().toISOString(),porNome:String(window.__meuNome||'').slice(0,80)},{merge:true})
      .then(function(){fsuj=false;desenhar();$('pi-msg').textContent='Salvo. Os próximos Forms saem deste modelo.';},function(){m.textContent='Não foi possível salvar: só a diretoria altera.';});});
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
  var bReg=null,bModo='ficha',andAberto={};
  window.aposRegistro=function(id){if(bReg===id)bReg=null;if(bModo==='fin'&&TP&&TP.o.chave===id)painelFechar();};
  /* ----- Andamento: os pontos do checklist de cada evento (desenhado pelo etapas.js) ----- */
  function andamento(e){return window.__andamento?window.__andamento(e,!!andAberto[e.id]):'';}
  function brl(v){return 'R$ '+(+v).toFixed(2).replace('.',',');}
  function situ(e,today){var dn=e.status==='realizado';
    if(dn){var tc=e.inscritos?Math.max(0,e.presentes-(+e.semInscricao||0))/e.inscritos:null;return tc==null?'<span class="chip neutral">realizado</span>':semaf(tc,'tc').replace('</span>',' vieram</span>');}
    if(e.data&&e.data<today)return '<span class="chip bad">falta finalizar</span>';
    var i=e.inscricao,cs=climaSelo(e);if(i&&i.formId)return (i.aberto===false?'<span class="chip neutral">inscrições fechadas</span>':'<span class="chip ok">inscrições abertas</span>')+cs;
    return '<span class="chip neutral">'+(e.ficha&&e.ficha.linkExterno?'link externo':window.ROBO_URL?'sem Forms':'planejado')+'</span>'+cs;}
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
    $('kpis').innerHTML=[['Próximos',prox,''],['Falta finalizar',pend.length,pend.length?'kbad':''],['Comparecimento geral',I?Math.round(Pr/I*100)+'%':'—',''],['Custo por presente',CP?'R$ '+(C/CP).toFixed(2).replace('.',','):'—','']].map(function(k){return '<div class="kpi '+k[2]+'"><div class="v num">'+k[1]+'</div><div class="l">'+k[0]+'</div></div>';}).join('');
    var types={};all.forEach(function(e){if(e.tipo)types[e.tipo]=1;});
    var cur=fb.value;fb.innerHTML='<option value="">Todos os tipos</option>'+Object.keys(types).sort().map(function(t){return '<option'+(t===cur?' selected':'')+'>'+esc(t)+'</option>';}).join('');
    if(!all.length){$('etable').innerHTML='<tbody><tr><td class="empty">A base está vazia. Planeje um evento e clique em “Salvar evento”.</td></tr></tbody>';$('b-conta').textContent='';painelAtualizar('view-base');return;}
    var list=all.filter(function(e){if(ft&&e.tipo!==ft)return false;if(!tst&&/\[teste\]/i.test(e.nome||''))return false;
      if(q&&nrm([e.nome,e.tipo,e.sala,e.convidado,e.responsavel].join(' ')).indexOf(q)<0)return false;var dn=e.status==='realizado';if(vista==='prox'&&dn)return false;if(vista==='real'&&!dn)return false;return true;});
    var pen=list.filter(function(e){return e.status!=='realizado'&&e.data&&e.data<today;}).sort(function(a,b){return (a.data||'')<(b.data||'')?-1:1;});
    var nx=list.filter(function(e){return e.status!=='realizado'&&!(e.data&&e.data<today);}).sort(function(a,b){return (a.data||'9')<(b.data||'9')?-1:1;});
    var dn=list.filter(function(e){return e.status==='realizado';}).sort(function(a,b){return (a.data||'')<(b.data||'')?1:-1;});
    $('b-conta').textContent=list.length+(list.length===1?' evento':' eventos')+(pen.length?' · '+pen.length+' pendente'+(pen.length>1?'s':''):'');
    function row(e){var d=e.data?e.data.slice(8,10)+'/'+e.data.slice(5,7):'—',dnn=e.status==='realizado',cp=dnn&&e.custo&&e.presentes?e.custo/e.presentes:null,ed=pode('editar'),id=esc(e.id);
      var sub=[e.tipo,e.sala?(e.sala+(e.capacidade?' ('+e.capacidade+')':'')):'',e.hora,e.responsavel?'resp. '+String(e.responsavel).split(' ')[0]:''].filter(Boolean).join(' · ');
      var pen=!dnn&&ed?'<button type="button" class="tpen" data-tplan="'+id+'" title="Abrir no Planejar" aria-label="Abrir '+esc(e.nome||'evento')+' no Planejar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>':'';
      var acoes='<button type="button" class="btn small ghost" data-eficha="'+id+'">Ficha do evento</button>'+
        '<button type="button" class="btn small ghost" data-egastos="'+id+'">'+(ed?'Registrar gastos':'Ver gastos')+'</button>'+
        '<button type="button" class="btn small ghost" data-eavisos="'+id+'">Gerenciar avisos</button>'+
        (ed?(dnn?'<button type="button" class="btn small ghost" data-efin="'+id+'">Editar resultado</button>':'<button type="button" class="btn small'+(e.data&&e.data<=today?'':' ghost')+'" data-efin="'+id+'">Finalizar evento</button>'):'');
      return '<tbody class="evt" data-eopen="'+id+'" tabindex="0" aria-label="'+esc(e.nome||'Evento')+': abrir a ficha"><tr><td class="num tdata"><b>'+d+'</b><span class="tsub">'+(e.data?e.data.slice(0,4):'')+'</span>'+pen+'</td>'+
        '<td><span class="tn">'+esc(e.nome||'Sem nome')+'</span>'+(e.excecao?' <span class="chip warn" title="'+esc(e.excecao.motivo||'')+'">exceção</span>':'')+'<span class="tsub">'+esc(sub)+'</span>'+(window.__fichaSelo?'<span class="fi-selo">'+__fichaSelo(e)+'</span>':'')+'</td>'+
        '<td class="tins">'+insc(e)+'<div class="tsit">'+situ(e,today)+'</div></td><td class="tand">'+andamento(e)+'</td>'+
        '<td class="r">'+(cp!=null?semaf(cp,'cp'):'<span class="note">—</span>')+'</td></tr>'+
        '<tr class="evb"><td></td><td colspan="4"><div class="tacoes">'+acoes+'</div></td></tr></tbody>';}
    var h='<thead><tr><th>Data</th><th>Evento</th><th>Inscrições</th><th>Etapas</th><th class="r">Custo/presente</th></tr></thead>';
    if(pen.length||nx.length)h+='<tbody><tr class="grp"><td colspan="5">Próximos e pendentes ('+(pen.length+nx.length)+')</td></tr></tbody>'+pen.concat(nx).map(row).join('');
    if(dn.length)h+='<tbody><tr class="grp"><td colspan="5">Realizados ('+dn.length+')</td></tr></tbody>'+dn.map(row).join('');
    if(!list.length)h+='<tbody><tr><td colspan="5" class="empty">Nenhum evento com esses filtros.</td></tr></tbody>';
    $('etable').innerHTML=h;$('etable').classList.add('tlist');
    painelAtualizar('view-base');
  };
  function fld(e,k,l,v,req,st){return '<div class="field"><label for="'+k+'-'+e.id+'">'+l+'</label><input id="'+k+'-'+e.id+'" type="number" min="0" inputmode="decimal"'+(st?' step="'+st+'"':'')+(req?' required':'')+' value="'+esc(v==null?'':v)+'"></div>';}
  function regForm(e){var dn=e.status==='realizado',g=function(k){return dn&&e[k]!=null?e[k]:'';};
    var ins=dn?e.inscritos:(e.inscricao&&e.inscricao.formId?e.inscricao.total:(e.inscritosMeta||''));
    return '<form class="tp-reg" data-regform="'+esc(e.id)+'" novalidate><div class="treg">'+fld(e,'ri','Inscritos',ins,1)+fld(e,'rp','Presentes (total)',g('presentes'),1)+fld(e,'rw','Vieram sem inscrição',g('semInscricao'))+fld(e,'rm','Membros presentes',g('membros'))+fld(e,'rpc','Porções compradas',g('porcoesCompradas'))+fld(e,'rpu','Porções consumidas',g('porcoesConsumidas'))+fld(e,'rd','Duração real (min)',g('duracaoReal'))+fld(e,'ra','Atraso (min)',g('atraso'))+
      '<p class="note" style="grid-column:1/-1;margin:2px 0">Os gastos e as notas fiscais ficam no botão <b>Registrar gastos</b>, na lista de eventos.</p>'+
      '<div class="field"><label for="rmt-'+esc(e.id)+'">Método de check-in</label><select id="rmt-'+esc(e.id)+'"><option value="">—</option><option value="papel"'+(e.metodoCheckin==='papel'?' selected':'')+'>Lista de papel</option><option value="qr"'+(e.metodoCheckin==='qr'?' selected':'')+'>QR</option></select></div></div>'+
      '<div class="btns" style="margin-top:12px"><button class="btn" type="submit">'+(dn?'Salvar resultado':'Finalizar evento')+'</button><button class="btn ghost" type="button" data-tclose>Cancelar</button></div></form>';}
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
      '<p class="note" style="margin:10px 0 6px">Campos (clique para inserir onde está o cursor):</p><div class="tchips">'+CAMPOS.filter(function(c){return (c[0]!=='{link_avaliacao}'||t==='agradecimento')&&(c[0]!=='{mudanca}'||t==='mudanca')&&(c[0]!=='{link_inscricao}'||t==='mailing');}).map(function(c){return '<button type="button" data-ed-ins="'+c[0]+'" "'+dica(c[0])+'>'+c[0]+'</button>';}).join('')+'</div>')+
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
    var today=iso(new Date()),dn=e.status==='realizado',late=!dn&&e.data&&e.data<today;
    var quando=e.data?D(e.data).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'sem data';
    var sub=quando+(e.hora?' · '+e.hora:'')+(e.sala?' · '+esc(e.sala):'')+' '+situ(e,today);
    if(bModo==='fin'&&pode('editar'))return {titulo:(dn?'Editar resultado · ':'Finalizar · ')+(e.nome||'Evento'),sub:sub,corpo:blk('',(dn?'':'<p class="note" style="margin:0 0 10px">'+(late?'O evento já aconteceu. ':'')+'Preencha com a lista de presença: é isso que calibra os próximos. Ao finalizar, o evento passa para Realizados.</p>')+regForm(e)),rodape:''};
    if(bModo==='avisos'){var temF=window.ROBO_URL&&e.inscricao&&e.inscricao.formId;
      return {titulo:'Avisos · '+(e.nome||'Evento'),sub:sub,corpo:temF?emailsBlk(e):blk('','<p class="note" style="margin:0">Os avisos automáticos (confirmação, lembrete, aviso no dia e agradecimento) são enviados para quem se inscreveu pelo Google Forms. Crie o Forms na <b>Ficha do evento</b> para ligar os avisos deste evento.</p>'),rodape:''};}
    var corpo=window.__fichaBlk?'':blk('',pode('editar')?'<label class="tresp"><span>Responsável</span><select data-tresp="'+esc(id)+'"></select></label>':'<p class="tresp" style="margin:0"><span>Responsável</span><b>'+esc(e.responsavel||'—')+'</b></p>');
    if(window.__fichaBlk)corpo+=window.__fichaBlk(e); /* ficha do evento (ficha.js) */
    if(dn||!window.__fichaBlk)corpo+=blk(dn?'Resultado e previsto × real':'Detalhes',detail(e,{ficha:!!window.__fichaBlk})); /* antes de acontecer, a ficha já mostra o que importa */
    var rod=pode('excluir')?'<button type="button" class="btn small ghost tdanger" data-tdel="'+esc(id)+'">Excluir evento</button>':'';
    return {titulo:e.nome||'Evento',sub:sub,corpo:corpo,rodape:rod};}
  function abrir(id,modo){bModo=modo||'ficha';bEmail=null;
    painelAbrir({sec:'view-base',chave:id,montar:function(){return montar(id);},foco:'.tp-reg input',aoFechar:function(){bReg=null;bEmail=null;bModo='ficha';if(window.__fichaFechou)__fichaFechou(id);},depois:function(dr){var f=dr.querySelector('.tp-reg');if(f)f.addEventListener('submit',salvarRegistro);var rs=dr.querySelector('[data-tresp]');if(rs){var ev=events.filter(function(x){return x.id===id;})[0];opcoesMembros(rs,ev&&ev.responsavel);}}});}
  /* abrir a ficha de outra tela (Pendências) */
  window.__abrirFicha=function(id){var b=document.querySelector('.side .sitem[data-alvo="base"]');if(b)b.click();abrir(id);};
  /* gastos e notas fiscais (fin.js) num painel próprio, aberto pelo botão da lista */
  function abrirGastos(id){
    painelAbrir({sec:'view-base',chave:'gastos:'+id,montar:function(){var e=events.filter(function(x){return x.id===id;})[0];if(!e||!window.__gastosBlk)return null;
      var quando=e.data?D(e.data).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}):'sem data';
      return {titulo:'Gastos · '+(e.nome||'Evento'),sub:quando+' '+situ(e,iso(new Date())),corpo:window.__gastosBlk(e),rodape:'<div class="btns"><button type="button" class="btn ghost" data-tabrir="'+esc(id)+'">Ver detalhes do evento</button></div>'};},
      foco:'#g-valor',depois:function(dr){if(window.__gastosLigar)window.__gastosLigar(dr,id);var b=dr.querySelector('[data-tabrir]');if(b)b.addEventListener('click',function(){abrir(id);});}});}
  function clique(e){var bg=e.target.closest('[data-egastos]'),bf=e.target.closest('[data-efin]'),bfi=e.target.closest('[data-eficha]'),bav=e.target.closest('[data-eavisos]'),ba=e.target.closest('[data-eand]');
    if(e.target.closest('[data-tplan]'))return; /* a canetinha: tratada abaixo (leva ao Planejar) */
    if(ba){if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();e.stopPropagation();var ai=ba.dataset.eand;andAberto[ai]=!andAberto[ai];renderBase();var nb=e.type==='keydown'&&$('etable').querySelector('[data-eand="'+ai+'"]');if(nb)nb.focus();return;}
    if(bg||bf||bfi||bav){if(e.type!=='click')return;e.stopPropagation();if(bg){abrirGastos(bg.dataset.egastos);return;}
      if(bfi){abrir(bfi.dataset.eficha);return;}if(bav){abrir(bav.dataset.eavisos,'avisos');return;}bReg=bf.dataset.efin;abrir(bReg,'fin');return;}
    if(e.type==='keydown'&&e.target.closest('button'))return;
    var tr=e.target.closest('[data-eopen]');if(tr&&(e.type==='click'||e.key==='Enter'||e.key===' ')){if(e.type==='keydown')e.preventDefault();abrir(tr.dataset.eopen);}}
  $('etable').addEventListener('click',clique);$('etable').addEventListener('keydown',clique);
  document.addEventListener('permissoes',function(){adiar('view-base',renderBase,function(){return regOpen!=null;});}); /* botões da lista dependem do cargo */
  var ultimoCampo=null;
  sec.addEventListener('input',function(e){var f=e.target.dataset&&e.target.dataset.ed;if(!f||!bEmail)return;var k=bEmail.id+'|'+bEmail.tipo;rasc[k][f]=e.target.value;});
  sec.addEventListener('focusin',function(e){if(e.target.dataset&&(e.target.dataset.ed==='assunto'||e.target.dataset.ed==='corpo'))ultimoCampo=e.target;});
  sec.addEventListener('change',function(e){var a=e.target.closest('[data-em-auto]');if(!a||!TP||!db)return;var id=TP.o.chave,up={};up['emails.'+a.dataset.emAuto+'.auto']=a.checked;
    db.doc('eventos/'+id).update(up).catch(function(){alertMsg('Não foi possível salvar.');});});
  sec.addEventListener('click',function(e){if(!TP||TP.o.sec!=='view-base')return;var id=TP.o.chave,ev=events.filter(function(x){return x.id===id;})[0];if(!ev)return;var b;
    if((b=e.target.closest('[data-em-env]'))){var t=b.dataset.emEnv,n=+ev.inscricao.total||0;
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

/* ============================== MAILING DE EVENTOS ============================== */
(function(){
  var sec=$('view-mail');if(!sec)return;
  var LISTA=[],CFG={},ENVIOS=[],INSC=[],ligado=false,aba='prog',fEv='';
  var PAD={assunto:'Novo evento da Feashion: {evento}',corpo:'Oi, {nome}!\n\nVocê pediu para receber os próximos eventos da Feashion, então aqui vai o convite:\n\n{detalhes}\n\nAs vagas são limitadas e as inscrições fecham {fechamento}. Garanta a sua:\n\n{link_inscricao}'};
  var rasc=null,prev=null,msg=null,ocup=false;
  function ligar(){if(ligado||!db)return;ligado=true;
    db.collection('mailing').onSnapshot(function(s){LISTA=s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});desenhar();});
    db.collection('mailingEnvios').onSnapshot(function(s){ENVIOS=s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});desenhar();});
    db.doc('mailingConfig/geral').onSnapshot(function(d){CFG=d.exists?d.data():{};desenhar();});
    db.collection('inscricoes').onSnapshot(function(s){INSC=s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});desenhar();},function(){});}
  document.addEventListener('tela',function(e){if(e.detail==='mail'){ligar();desenhar();}if(e.detail==='ana')ligar();});
  function hora(){return /^\d{1,2}:\d{2}$/.test(CFG.hora||'')?CFG.hora:'08:00';}
  function intervalo(){return CFG.intervaloDias!=null&&CFG.intervaloDias!==''?+CFG.intervaloDias:2;}
  function futuros(){var hoje=iso(new Date());return events.filter(function(e){return e.data&&e.data>=hoje&&e.status!=='realizado';}).sort(function(a,b){return a.data<b.data?-1:1;});}
  function nomeEv(e){return (e.nome||'Evento')+' · '+e.data.slice(8,10)+'/'+e.data.slice(5,7);}
  function viaMailing(r){return /mailing/i.test(r.comoSoube||'');}
  var ST={agendado:['agendado','neutral'],aguardando:['esperando o Forms','warn'],enviando:['enviando','warn'],enviado:['enviado','ok'],pulado:['pulado','neutral'],cancelado:['cancelado','bad']};
  function envios(){var out=[];futuros().concat(events.filter(function(e){return e.mailing&&(e.mailing.envios||[]).length&&futuros().indexOf(e)<0;})).forEach(function(e){(e.mailing&&e.mailing.envios||[]).forEach(function(en){out.push({e:e,en:en});});});
    return out.sort(function(a,b){return (a.en.quando||'')<(b.en.quando||'')?-1:1;});}
  function previsto(e){if(!e.criadoEm||e.mailing&&e.mailing.padraoCriado||e.mailing&&e.mailing.excluido)return null;if(!CFG.desde||e.criadoEm<CFG.desde)return null;
    var d=new Date(e.criadoEm);d.setDate(d.getDate()+1);return diaUtil(d).toISOString();}
  function diaUtil(d){d=new Date(d.getTime());while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()+1);var h=hora().split(':');d.setHours(+h[0],+h[1],0,0);return d;}
  function fds(v){var d=new Date(v);return !isNaN(d)&&(d.getDay()===0||d.getDay()===6);}
  function avisoFds(v){return fds(v)?'<p class="note" style="margin:6px 0 0">Cai no fim de semana; o robô manda na segunda às '+esc(hora())+'.</p>':'';}
  function kpis(){var cliques=0,env=0;ENVIOS.forEach(function(x){cliques+=(x.cliques||[]).length;env+=(x.emails||[]).length;});
    var via=0;INSC.forEach(function(i){(i.respostas||[]).forEach(function(r){if(viaMailing(r))via++;});});
    var prog=envios().filter(function(x){return x.en.status==='agendado'||x.en.status==='aguardando'||x.en.status==='enviando';}).length;
    $('ml-kpis').innerHTML=[['Pessoas na lista',LISTA.length],['Envios programados',prog],['E-mails enviados',env],['Cliques',cliques],['Inscrições via mailing',via]].map(function(k){return '<div class="kpi"><div class="v num">'+k[1]+'</div><div class="l">'+k[0]+'</div></div>';}).join('');}
  function dh(isoS){var d=new Date(isoS);return isNaN(d)?'—':d.toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
  function progHtml(){var fs=futuros(),h='<div class="sbar"><select id="ml-fev" aria-label="Evento"><option value="">Todos os eventos</option>'+fs.map(function(e){return '<option value="'+esc(e.id)+'"'+(e.id===fEv?' selected':'')+'>'+esc(nomeEv(e))+(e.mailing&&e.mailing.excluido?' (fora do mailing)':'')+'</option>';}).join('')+'</select>';
    var sel=fEv&&events.filter(function(e){return e.id===fEv;})[0];
    if(sel)h+='<label class="sbar-ck"><input type="checkbox" id="ml-inc"'+(sel.mailing&&sel.mailing.excluido?'':' checked')+(pode('editar')?'':' disabled')+'> Este evento entra no mailing</label>';
    h+='<span class="note">Envio padrão: dia útil seguinte à criação do evento, às '+esc(hora())+' (só de segunda a sexta). Intervalo mínimo entre envios: '+intervalo()+' dia(s).</span></div>';
    var rows=envios().filter(function(x){return !fEv||x.e.id===fEv;});
    fs.forEach(function(e){if(fEv&&e.id!==fEv)return;var p=previsto(e);if(p)rows.push({e:e,en:{id:'',quando:p,status:'previsto',padrao:true}});});
    rows.sort(function(a,b){return (a.en.quando||'')<(b.en.quando||'')?-1:1;});
    h+='<div class="tablewrap"><table class="tlist" id="ml-tab"><thead><tr><th>Quando</th><th>Evento</th><th>Situação</th><th class="r">Enviados</th><th class="r">Cliques</th></tr></thead><tbody>';
    if(!rows.length)h+='<tr><td colspan="5" class="empty">Nenhum envio programado'+(fEv?' para este evento':'')+'. Use “+ Programar e-mail”.</td></tr>';
    rows.forEach(function(x){var en=x.en,e=x.e,st=en.status==='previsto'?['será criado automaticamente','neutral']:(ST[en.status]||[en.status,'neutral']),exc=e.mailing&&e.mailing.excluido;
      h+='<tr'+(en.id?' data-mlopen="'+esc(e.id)+'|'+esc(en.id)+'" tabindex="0"':'')+(exc||en.status==='pulado'||en.status==='cancelado'?' class="off"':'')+'><td><b>'+esc(dh(en.quando))+'</b>'+(en.padrao?'<span class="tsub">envio padrão</span>':'<span class="tsub">programado</span>')+'</td><td><span class="tn">'+esc(e.nome||'Evento')+'</span><span class="tsub">'+esc(e.data?e.data.slice(8,10)+'/'+e.data.slice(5,7):'')+(exc?' · fora do mailing':'')+(en.assunto?' · texto próprio':'')+'</span></td><td><span class="chip '+st[1]+'">'+esc(st[0])+'</span>'+(en.motivo?'<span class="tsub">'+esc(en.motivo)+'</span>':'')+'</td><td class="r">'+(en.enviados!=null?'<b>'+en.enviados+'</b>'+(en.pendentes?'<span class="tsub">'+en.pendentes+' na fila</span>':''):'—')+'</td><td class="r">'+(en.cliques!=null?en.cliques:'—')+'</td></tr>';});
    return h+'</tbody></table></div>';}
  function listaHtml(){var q=nrm(($('ml-q')||{}).value||'').trim(),l=LISTA.filter(function(m){return !q||nrm([m.nome,m.email].join(' ')).indexOf(q)>=0;}).sort(function(a,b){return String(a.nome||a.email).localeCompare(String(b.nome||b.email));});
    var h='<div class="sbar"><input type="search" id="ml-q" placeholder="Buscar nome ou e-mail" aria-label="Buscar na lista" value="'+esc(($('ml-q')||{}).value||'')+'"><span class="note">'+l.length+' de '+LISTA.length+' pessoas · entra quem marca “quero receber novidades” no Forms; e-mail repetido conta uma vez só</span></div>';
    h+='<div class="tablewrap"><table class="tlist" id="ml-ltab"><thead><tr><th>Pessoa</th><th>Na lista desde</th><th>Inscrições</th><th class="r"></th></tr></thead><tbody>';
    if(!l.length)h+='<tr><td colspan="4" class="empty">'+(LISTA.length?'Ninguém com essa busca.':'A lista ainda está vazia. Ela enche sozinha conforme as pessoas marcam a opção no Forms.')+'</td></tr>';
    l.forEach(function(m){h+='<tr><td><span class="tn">'+esc(m.nome||'—')+'</span><span class="tsub">'+esc(m.email)+'</span></td><td>'+esc(m.desde?new Date(m.desde).toLocaleDateString('pt-BR'):'—')+'</td><td>'+((m.eventos||[]).length||1)+'</td><td class="r">'+(pode('excluir')?'<button type="button" class="btn small ghost tdanger" data-mldel="'+esc(m.id)+'">Tirar da lista</button>':'')+'</td></tr>';});
    return h+'</tbody></table></div>';}
  function textoHtml(){if(!rasc)rasc={assunto:CFG.assunto||PAD.assunto,corpo:CFG.corpo||PAD.corpo,hora:hora(),intervalo:String(intervalo())};
    var ed=pode('editar');
    return '<div class="tml-grid"><div class="tp-blk"><h4>Texto base do convite</h4>'+
      '<div class="field"><label for="ml-assunto">Assunto</label><input id="ml-assunto" data-ml="assunto" value="'+esc(rasc.assunto)+'"'+(ed?'':' disabled')+'></div>'+
      '<div class="field" style="margin-top:10px"><label for="ml-corpo">Texto <span class="rq opt">parágrafos separados por uma linha em branco</span></label><textarea id="ml-corpo" data-ml="corpo" rows="11"'+(ed?'':' disabled')+'>'+esc(rasc.corpo)+'</textarea></div>'+
      '<p class="note" style="margin:10px 0 6px">Campos:</p><div class="tchips">'+['{nome}','{evento}','{quando}','{sala}','{convidado}','{fechamento}','{detalhes}','{link_inscricao}'].map(function(c){return '<button type="button" data-mlins="'+c+'"'+dica(c)+'>'+c+'</button>';}).join('')+'</div>'+
      '<h4 style="margin-top:16px">Horário</h4><div class="treg"><div class="field"><label for="ml-hora">Hora do envio padrão</label><input id="ml-hora" data-ml="hora" type="time" value="'+esc(rasc.hora)+'"'+(ed?'':' disabled')+'></div><div class="field"><label for="ml-int">Intervalo mínimo entre envios (dias)</label><input id="ml-int" data-ml="intervalo" type="number" min="0" max="14" value="'+esc(rasc.intervalo)+'"'+(ed?'':' disabled')+'></div></div>'+
      '<p class="note">O envio padrão sai no dia seguinte à criação do evento nesse horário. Os convites só saem de segunda a sexta: evento criado na sexta ou no fim de semana manda na segunda. Se o último envio foi há menos dias que o intervalo, o próximo espera (sem passar do prazo de inscrição).</p>'+
      (ed?'<div class="btns" style="margin-top:12px"><button type="button" class="btn" id="ml-salvar">Salvar</button><button type="button" class="btn ghost" id="ml-prev"'+(ocup?' disabled':'')+'>Ver prévia</button><button type="button" class="btn ghost" id="ml-teste"'+(ocup?' disabled':'')+'>Enviar teste para mim</button><button type="button" class="btn small ghost" id="ml-pad">Voltar ao padrão</button></div>':'')+
      (msg?'<div class="imsg'+(msg.erro?' err':'')+'">'+esc(msg.t)+'</div>':'')+'</div>'+
      '<div class="tp-blk"><h4>Prévia</h4>'+(prev?'<iframe class="tprev" sandbox="" srcdoc="'+esc(prev)+'" title="Prévia do convite"></iframe>':'<p class="note" style="margin:0">Clique em “Ver prévia”. O exemplo usa o próximo evento e o nome “Fulana”.</p>')+'</div></div>';}
  function desenhar(){if(sec.hidden)return;kpis();
    [['prog',progHtml],['lista',listaHtml],['texto',textoHtml]].forEach(function(a){var el=$('ml-'+a[0]);el.hidden=a[0]!==aba;if(a[0]!==aba)return;
      var at=document.activeElement;if(at&&el.contains(at)&&/^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName)&&a[0]!=='prog'){if(a[0]==='lista'){var tb=$('ml-ltab');if(tb){var t=document.createElement('div');t.innerHTML=listaHtml();tb.parentNode.replaceWith(t.querySelector('.tablewrap'));}}return;}
      el.innerHTML=a[1]();});
    $('ml-novo').hidden=!pode('editar');
    painelAtualizar('view-mail');}
  $('ml-aba').addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;aba=b.dataset.a;[].forEach.call(this.children,function(x){var on=x===b;x.className=on?'on':'';x.setAttribute('aria-pressed',on);});desenhar();});
  sec.addEventListener('input',function(e){if(e.target.id==='ml-q'){desenhar();return;}var k=e.target.dataset&&e.target.dataset.ml;if(k&&rasc)rasc[k]=e.target.value;});
  var ultimo=null;sec.addEventListener('focusin',function(e){if(e.target.id==='ml-assunto'||e.target.id==='ml-corpo')ultimo=e.target;});
  sec.addEventListener('change',function(e){
    if(e.target.id==='ml-fev'){fEv=e.target.value;desenhar();return;}
    if(e.target.id==='ml-inc'&&db&&fEv){db.doc('eventos/'+fEv).update({'mailing.excluido':!e.target.checked}).catch(function(){alertMsg('Não foi possível salvar.');});}
  });
  function salvarEnvios(e,arr){var up={'mailing.envios':arr};return db.doc('eventos/'+e.id).update(up);}
  function acao(a,extra,ok){ocup=true;msg=null;desenhar();robo(a,extra&&extra.evento||'',extra).then(function(j){msg=ok(j);},function(err){msg={t:err.message,erro:1};}).then(function(){ocup=false;desenhar();});}
  sec.addEventListener('click',function(e){var b;
    if((b=e.target.closest('[data-mldel]'))){confirma(b,'Confirmar: tirar',function(){var m=LISTA.filter(function(x){return x.id===b.dataset.mldel;})[0];if(!m)return;
      db.doc('descadastros/'+m.id).set({email:m.email,em:new Date().toISOString(),por:'equipe'}).then(function(){return db.doc('mailing/'+m.id).delete();}).catch(function(){alertMsg('Não foi possível tirar da lista.');});});return;}
    if((b=e.target.closest('[data-mlins]'))){var c=ultimo||$('ml-corpo');if(!c||c.disabled)return;var a0=c.selectionStart==null?c.value.length:c.selectionStart,a1=c.selectionEnd==null?a0:c.selectionEnd,t=b.dataset.mlins;
      if(t==='{detalhes}'||t==='{link_inscricao}')t=(a0&&c.value.charAt(a0-1)!=='\n'?'\n\n':'')+t+'\n\n';c.value=c.value.slice(0,a0)+t+c.value.slice(a1);rasc[c.dataset.ml]=c.value;c.focus();c.selectionStart=c.selectionEnd=a0+t.length;return;}
    if(e.target.id==='ml-salvar'&&db){var hh=rasc.hora,iv=+rasc.intervalo;if(!/^\d{1,2}:\d{2}$/.test(hh)){msg={t:'Hora inválida.',erro:1};desenhar();return;}if(!(iv>=0&&iv<=14)){msg={t:'Intervalo entre 0 e 14 dias.',erro:1};desenhar();return;}
      var pad=rasc.assunto===PAD.assunto&&rasc.corpo===PAD.corpo;
      db.doc('mailingConfig/geral').set({assunto:pad?null:rasc.assunto,corpo:pad?null:rasc.corpo,hora:hh,intervaloDias:iv},{merge:true}).then(function(){msg={t:'Salvo.'};desenhar();},function(){msg={t:'Não foi possível salvar.',erro:1};desenhar();});return;}
    if(e.target.id==='ml-pad'){rasc.assunto=PAD.assunto;rasc.corpo=PAD.corpo;prev=null;msg={t:'Texto padrão de volta. Salve para valer.'};var x=document.activeElement;if(x)x.blur();desenhar();return;}
    if(e.target.id==='ml-prev'){acao('mailingPrevia',{evento:fEv||'',texto:{assunto:rasc.assunto,corpo:rasc.corpo}},function(j){prev=j.html;return null;});return;}
    if(e.target.id==='ml-teste'){acao('mailingTeste',{evento:fEv||'',texto:{assunto:rasc.assunto,corpo:rasc.corpo}},function(j){return {t:'Teste enviado para '+j.enviadoPara+'.'};});return;}
    if(e.target.id==='ml-novo'){abrirEnvio(null,null);return;}
    var tr=e.target.closest('[data-mlopen]');if(tr){var p=tr.dataset.mlopen.split('|');abrirEnvio(p[0],p[1]);}
  });
  sec.addEventListener('keydown',function(e){var tr=e.target.closest('[data-mlopen]');if(tr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();var p=tr.dataset.mlopen.split('|');abrirEnvio(p[0],p[1]);}});
  /* painel de um envio (ou novo) */
  var pmsg=null,pocup=false,pr=null;
  function paraLocal(isoS){var d=new Date(isoS);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}
  function abrirEnvio(eid,envId){pmsg=null;pr=null;
    painelAbrir({sec:'view-mail',chave:eid+'|'+envId,montar:function(){
      var fs=futuros().filter(function(e){return !(e.mailing&&e.mailing.excluido);});
      if(!eid){var amanha=new Date();amanha.setDate(amanha.getDate()+1);amanha=diaUtil(amanha);
        if(!pr)pr={ev:fEv&&fs.some(function(e){return e.id===fEv;})?fEv:(fs[0]&&fs[0].id)||'',quando:paraLocal(amanha.toISOString()),assunto:'',corpo:''};
        return {titulo:'Programar e-mail',sub:'Vai para a lista do mailing (menos quem já se inscreveu no evento).',
          corpo:blk('','<div class="field"><label for="mp-ev">Evento</label><select id="mp-ev" data-mp="ev">'+fs.map(function(e){return '<option value="'+esc(e.id)+'"'+(e.id===pr.ev?' selected':'')+'>'+esc(nomeEv(e))+'</option>';}).join('')+'</select></div>'+
            '<div class="field" style="margin-top:10px"><label for="mp-q">Data e hora</label><input id="mp-q" data-mp="quando" type="datetime-local" value="'+esc(pr.quando)+'">'+avisoFds(pr.quando)+'</div>'+
            '<div class="field" style="margin-top:10px"><label for="mp-a">Assunto <span class="rq opt">vazio = o do texto base</span></label><input id="mp-a" data-mp="assunto" value="'+esc(pr.assunto)+'" placeholder="'+esc(CFG.assunto||PAD.assunto)+'"></div>'+
            '<div class="field" style="margin-top:10px"><label for="mp-c">Texto <span class="rq opt">vazio = o texto base</span></label><textarea id="mp-c" data-mp="corpo" rows="7" placeholder="Por exemplo: últimas vagas!">'+esc(pr.corpo)+'</textarea></div>'+(fs.length?'':'<p class="note">Nenhum evento futuro no mailing.</p>')+(pmsg?'<div class="imsg'+(pmsg.erro?' err':'')+'">'+esc(pmsg.t)+'</div>':'')),
          rodape:'<div class="btns"><button type="button" class="btn" data-mp-add="1"'+(fs.length?'':' disabled')+'>Programar</button><button type="button" class="btn ghost" data-tclose>Cancelar</button></div>'};}
      var e=events.filter(function(x){return x.id===eid;})[0];if(!e)return null;var en=(e.mailing&&e.mailing.envios||[]).filter(function(x){return x.id===envId;})[0];if(!en)return null;
      if(!pr)pr={quando:paraLocal(en.quando),assunto:en.assunto||'',corpo:en.corpo||''};
      var st=ST[en.status]||[en.status,'neutral'],ed=pode('editar'),mexe=ed&&(en.status==='agendado'||en.status==='aguardando'),reg=ENVIOS.filter(function(x){return x.id===eid+'_'+envId;})[0];
      var c=blk('','<p style="margin:0 0 10px"><span class="chip '+st[1]+'">'+esc(st[0])+'</span>'+(en.motivo?' <span class="note">'+esc(en.motivo)+'</span>':'')+'</p>'+
        '<dl class="kv"><dt>Evento</dt><dd>'+esc(nomeEv(e))+'</dd><dt>Enviados</dt><dd>'+(en.enviados||0)+(en.pendentes?' · '+en.pendentes+' na fila':'')+'</dd><dt>Cliques</dt><dd>'+(reg?(reg.cliques||[]).length:(en.cliques||0))+'</dd><dt>Inscrições via mailing</dt><dd>'+(INSC.filter(function(i){return i.id===eid;}).map(function(i){return (i.respostas||[]).filter(viaMailing).length;})[0]||0)+' no evento</dd></dl>')+
        blk('Quando e texto','<div class="field"><label for="mp-q">Data e hora</label><input id="mp-q" data-mp="quando" type="datetime-local" value="'+esc(pr.quando)+'"'+(mexe?'':' disabled')+'>'+avisoFds(pr.quando)+'</div>'+
          '<div class="field" style="margin-top:10px"><label for="mp-a">Assunto <span class="rq opt">vazio = o do texto base</span></label><input id="mp-a" data-mp="assunto" value="'+esc(pr.assunto)+'" placeholder="'+esc(CFG.assunto||PAD.assunto)+'"'+(mexe?'':' disabled')+'></div>'+
          '<div class="field" style="margin-top:10px"><label for="mp-c">Texto <span class="rq opt">vazio = o texto base</span></label><textarea id="mp-c" data-mp="corpo" rows="7"'+(mexe?'':' disabled')+'>'+esc(pr.corpo)+'</textarea></div>'+(pmsg?'<div class="imsg'+(pmsg.erro?' err':'')+'">'+esc(pmsg.t)+'</div>':''));
      var r='<div class="btns">'+(mexe?'<button type="button" class="btn" data-mp-salvar="1">Salvar</button>':'')+(ed&&(en.status==='agendado'||en.status==='aguardando'||en.status==='enviando')?'<button type="button" class="btn ghost" data-mp-agora="1"'+(pocup?' disabled':'')+'>Enviar agora</button>':'')+(ed&&en.status==='pulado'?'<button type="button" class="btn ghost" data-mp-reat="1">Reativar</button>':'')+'</div>'+(ed&&(en.status==='agendado'||en.status==='aguardando')?'<div class="btns"><button type="button" class="btn small ghost" data-mp-pular="1">Pular este envio</button>'+(en.padrao?'':'<button type="button" class="btn small ghost tdanger" data-mp-del="1">Excluir</button>')+'</div>':'');
      return {titulo:en.padrao?'Envio padrão':'E-mail programado',sub:esc(dh(en.quando)),corpo:c,rodape:r};},aoFechar:function(){pr=null;pmsg=null;}});}
  sec.addEventListener('input',function(e){var k=e.target.dataset&&e.target.dataset.mp;if(k&&pr)pr[k]=e.target.value;});
  sec.addEventListener('change',function(e){var k=e.target.dataset&&e.target.dataset.mp;if(k&&pr){pr[k]=e.target.value;if(k==='quando'){var f=e.target.parentNode,n=f.querySelector('.note');if(n)n.remove();f.insertAdjacentHTML('beforeend',avisoFds(pr.quando));}}});
  sec.addEventListener('click',function(e){if(!TP||TP.o.sec!=='view-mail')return;var ch=TP.o.chave.split('|'),eid=ch[0],envId=ch[1];
    function ok(t){pmsg={t:t};painelAtualizar('view-mail');}function erro(t){pmsg={t:t,erro:1};painelAtualizar('view-mail');}
    if(e.target.closest('[data-mp-add]')){var ev=events.filter(function(x){return x.id===pr.ev;})[0];if(!ev){erro('Escolha um evento.');return;}var q=new Date(pr.quando);if(isNaN(q)){erro('Data e hora inválidas.');return;}
      var arr=((ev.mailing&&ev.mailing.envios)||[]).concat([{id:'m'+Date.now(),quando:q.toISOString(),status:'agendado',assunto:pr.assunto.trim()||null,corpo:pr.corpo.trim()||null}]);
      salvarEnvios(ev,arr).then(function(){painelFechar();},function(){erro('Não foi possível programar.');});return;}
    var ev2=events.filter(function(x){return x.id===eid;})[0];if(!ev2)return;var arr2=((ev2.mailing&&ev2.mailing.envios)||[]).map(function(x){return Object.assign({},x);}),en=arr2.filter(function(x){return x.id===envId;})[0];if(!en)return;
    if(e.target.closest('[data-mp-salvar]')){var q2=new Date(pr.quando);if(isNaN(q2)){erro('Data e hora inválidas.');return;}en.quando=q2.toISOString();en.assunto=pr.assunto.trim()||null;en.corpo=pr.corpo.trim()||null;if(en.status==='aguardando')en.status='agendado';delete en.motivo;
      salvarEnvios(ev2,arr2).then(function(){pr=null;ok('Salvo.');},function(){erro('Não foi possível salvar.');});return;}
    if(e.target.closest('[data-mp-pular]')){en.status='pulado';salvarEnvios(ev2,arr2).then(function(){ok('Envio pulado.');});return;}
    if(e.target.closest('[data-mp-reat]')){en.status='agendado';delete en.motivo;salvarEnvios(ev2,arr2).then(function(){ok('Reativado.');});return;}
    var d=e.target.closest('[data-mp-del]');if(d){confirma(d,'Confirmar exclusão',function(){salvarEnvios(ev2,arr2.filter(function(x){return x.id!==envId;})).then(function(){painelFechar();});});return;}
    var ag=e.target.closest('[data-mp-agora]');if(ag){confirma(ag,'Confirmar: enviar agora',function(){pocup=true;painelAtualizar('view-mail');
      robo('mailingAgora',eid,{envio:envId}).then(function(j){pocup=false;ok(j.enviados!=null?'Enviado para '+j.enviados+(j.pendentes?'; '+j.pendentes+' na fila (cota do dia).':'.'):'Situação: '+((j.envio&&j.envio.motivo)||(j.envio&&j.envio.status)||'ok'));},function(err){pocup=false;erro(err.message);});});}
  });
  var rb=renderBase;renderBase=function(){rb();desenhar();};
  window.__mailingDados=function(){return {lista:LISTA,envios:ENVIOS,insc:INSC};};
})();

/* ============================== ANALYTICS: MAILING ============================== */
(function(){
  var box=document.querySelector('#view-ana .acharts');if(!box)return;
  var art=el('<article class="acard full" id="a-mail"><h3>Mailing</h3><p class="sub">Inscrições que vieram do mailing (marcadas “Mailing Feashion” em como ficou sabendo) e cliques nos convites, por hora do dia. Ajuda a descobrir o melhor horário para enviar.</p><div id="a-mail-c"></div></article>');
  box.appendChild(art);
  function desenhar(){var d=window.__mailingDados?window.__mailingDados():null;if(!d||$('view-ana').hidden)return;
    var hI=new Array(24).fill(0),hC=new Array(24).fill(0),dI=new Array(7).fill(0),via=0,cl=0,env=0;
    d.insc.forEach(function(i){(i.respostas||[]).forEach(function(r){if(!/mailing/i.test(r.comoSoube||''))return;var t=new Date(r.em);if(isNaN(t))return;via++;hI[t.getHours()]++;dI[t.getDay()]++;});});
    d.envios.forEach(function(x){env+=(x.emails||[]).length;(x.cliques||[]).forEach(function(c){var t=new Date(c.em);if(isNaN(t))return;cl++;hC[t.getHours()]++;});});
    var mx=Math.max(1,Math.max.apply(null,hI.concat(hC)));
    var barras='<div class="mh">'+hI.map(function(v,h){return '<div class="mhc" title="'+h+'h: '+v+' inscrições, '+hC[h]+' cliques"><div class="mhb"><i class="c" style="height:'+(hC[h]/mx*100)+'%"></i><i class="i" style="height:'+(v/mx*100)+'%"></i></div><span>'+(h%3===0?h+'h':'')+'</span></div>';}).join('')+'</div>';
    var dias=['dom','seg','ter','qua','qui','sex','sáb'],mxd=Math.max(1,Math.max.apply(null,dI));
    $('a-mail-c').innerHTML='<div class="akpis"><div class="kpi"><div class="v num">'+(d.lista.length)+'</div><div class="l">Pessoas na lista</div></div><div class="kpi"><div class="v num">'+env+'</div><div class="l">Convites enviados</div></div><div class="kpi"><div class="v num">'+cl+'</div><div class="l">Cliques'+(env?' ('+Math.round(cl/env*100)+'%)':'')+'</div></div><div class="kpi"><div class="v num">'+via+'</div><div class="l">Inscrições via mailing</div></div></div>'+
      (via||cl?'<div class="mleg"><span><i class="i"></i>inscrições</span><span><i class="c"></i>cliques</span></div>'+barras+'<p class="sub" style="margin-top:14px">Inscrições via mailing por dia da semana</p><div class="md">'+dI.map(function(v,i){return '<div><span>'+dias[i]+'</span><b style="width:'+(v/mxd*100)+'%"></b><em>'+v+'</em></div>';}).join('')+'</div>'
        :'<p class="note">Ainda sem inscrições pelo mailing. Os gráficos aparecem quando as primeiras chegarem.</p>');}
  document.addEventListener('tela',function(e){if(e.detail==='ana')setTimeout(desenhar,50);});
  var t=setInterval(function(){if(!$('view-ana').hidden)desenhar();},4000);
})();


/* ============================== IDEIA DE EVENTO (BETA, IA Gemini via robô) ============================== */
(function(){
if(!$('view-ia'))return;
var EX={
1:'Queria um workshop prático de precificação para quem está começando a vender roupa, coisa de 2 horas, de preferência numa quinta à noite. Algo mais mão na massa do que palestra.',
2:'Quero fazer algo grande sobre moda circular e sustentabilidade no fim do semestre: começar com uma palestra para atrair gente, depois algo prático e, se der, fechar com uma visita a um lugar que trabalhe com reuso. Público principal são os calouros, mas aberto para a FEA toda.'
};
var PROP=null,IDEIA='',EST=[],ocup=false,erro=null,okMsg=null,restantes=null,SIMC={};
var DIAS=['dom','seg','ter','qua','qui','sex','sáb'];
function teste(e){return /^\s*\[teste\]/i.test(e.nome||'');}
function semestre(dt){var p=String(dt||'').split('-');return p.length<2?'':p[0]+'.'+(+p[1]<=7?1:2);}
function tiposApp(){return [].map.call($('f-tipo').options,function(o){return o.value;});}
function tipoValido(t){var l=tiposApp();if(l.indexOf(t)>=0)return t;var n=nrm(t||'');for(var i=0;i<l.length;i++)if(nrm(l[i])===n||nrm(l[i]).indexOf(n)>=0&&n.length>3)return l[i];return 'Palestra';}
function hojeIso(){return iso(new Date());}
function mediaInsc(tipo){var r=events.filter(function(e){return +e.inscritos>0&&!teste(e);}),t=r.filter(function(e){return typeOf(e.tipo)===typeOf(tipo);}),u=t.length?t:r;if(!u.length)return 60;return Math.round(u.reduce(function(s,e){return s+(+e.inscritos);},0)/u.length);}
/* contexto que vai para a IA: só o necessário, sem e-mail nem telefone */
function contexto(){var hoje=hojeIso();
  var tipos=tiposApp().map(function(t){var c=tcfg(t);return {tipo:t,fimDeSemana:c.fds==='obrigatorio'?'obrigatório':c.fds==='livre'?'pode':'não pode',foraDaFEA:!!c.externo,mediaInscricoes:mediaInsc(t)};});
  var conv=guests.slice(0,200).map(function(g){return {id:g.id,nome:g.nome||'',empresa:g.empresa||'',cargo:g.cargo||'',temas:gT(g),segmentos:gS(g),status:g.status||'',nota:gscore(g)};});
  var cal=calList().filter(function(x){return (x.fim||x.inicio)>=hoje;}).slice(0,80).map(function(x){return {nome:x.nome,inicio:x.inicio,fim:x.fim||x.inicio,tipo:(CALTIPO[x.tipo]||CALTIPO.outro)[0]};});
  var real=events.filter(function(e){return e.status==='realizado'&&!teste(e);}).slice(-60).map(function(e){return {nome:e.nome,tipo:e.tipo,data:e.data,dia:e.data?DIAS[D(e.data).getDay()]:'',hora:e.hora,inscritos:+e.inscritos||null,presentes:+e.presentes||null,convidado:e.convidado||''};});
  var fut=events.filter(function(e){return e.status!=='realizado'&&e.data>=hoje&&!teste(e);}).map(function(e){return {nome:e.nome,tipo:e.tipo,data:e.data,hora:e.hora};});
  return {hoje:hoje,diaDaSemanaHoje:DIAS[new Date().getDay()],janelaHorarioFEA:JANELA[0]+' às '+JANELA[1],tipos:tipos,convidados:conv,calendario:cal,eventosRealizados:real,eventosMarcados:fut};}
/* roda o cálculo do Planejar sem mexer no que a pessoa está planejando */
var CAMPOS=['f-nome','f-tipo','f-data','f-hora','f-dur','f-insc','f-conv','f-convid','f-cpp'];
function cppPadrao(){var l=events.filter(function(e){return e.form&&+e.form['f-cpp']>0;}).sort(function(a,b){return String(b.criadoEm||'').localeCompare(String(a.criadoEm||''));});return l.length?String(l[0].form['f-cpp']):'';}
function preencher(o){$('f-nome').value=o.nome;$('f-tipo').value=o.tipo;$('f-data').value=o.data;$('f-hora').value=o.hora;
  var dur=Math.max(30,Math.min(300,Math.round((+o.dur||90)/30)*30));$('f-dur').value=String(dur);$('f-insc').value=String(o.insc);if(window.__planConvNome)__planConvNome(o.conv);else $('f-conv').value=o.conv||'';if(!(+$('f-cpp').value>0))$('f-cpp').value=cppPadrao();}
function simular(o){var k=[o.tipo,o.data,o.hora,o.dur,o.insc].join('|');if(SIMC[k])return SIMC[k];
  var snap={};CAMPOS.forEach(function(id){snap[id]=$(id).value;});var sm=salaManual,cur=current,al=alertas,sid=savedId,r=null;
  try{salaManual=null;savedId=null;preencher(o);plan();var c=current;var h=history(o.tipo),p=totalPmf(Math.max(5,Math.min(600,+o.insc||0)),h,h.lam);
    r={p10:quant(p,.1),p90:quant(p,.9),m:c.presentesPrev,sala:c.sala,cap:c.capacidade,nota:c.notaData,cpp:(+$('f-cpp').value>0||!$('f-coffee').checked)?c.custoPorPresentePrev:null,externo:!!tcfg(o.tipo).externo,cur:Object.assign({},c)};}
  catch(e){r=null;}
  CAMPOS.forEach(function(id){$(id).value=snap[id];});if(window.__planConvSync)__planConvSync();salaManual=sm;savedId=sid;
  if(calcDone&&$('f-data').value){try{plan();}catch(e){}}else{current=cur;}alertas=al;
  SIMC[k]=r;return r;}
function datasDe(e,tipo){var hoje=hojeIso(),vis={},l=[];(e.datas||[]).forEach(function(x){var d=String(x.data||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d<=hoje||vis[d])return;vis[d]=1;l.push({d:d,motivo:x.motivo||'',s:scoreDate(D(d),tipo,null).s});});
  if(!l.length){var b=null;for(var i=14;i<75;i++){var dd=add(new Date(),i),s=scoreDate(dd,tipo,null).s;if(!b||s>b.s)b={d:iso(dd),s:s};}if(b)l.push({d:b.d,motivo:'sugerida pelo app (melhor nota da data nas próximas semanas)',s:b.s});}
  return l;}
function preparar(){EST=PROP.eventos.map(function(e){var tipo=tipoValido(e.tipo),ds=datasDe(e,tipo),best=0;ds.forEach(function(x,i){if(x.s>ds[best].s)best=i;});
  var cv=(e.convidados||[]).map(function(c){var g=guests.filter(function(x){return x.id===c.id;})[0];return g?{g:g,motivo:c.motivo||''}:null;}).filter(Boolean).slice(0,3);
  var hora=/^\d{1,2}:\d{2}$/.test(e.horario||'')?('0'+e.horario).slice(-5):JANELA[0];
  return {tipo:tipo,datas:ds,sel:best,conv:cv,hora:hora,dur:+e.duracaoMin||90,insc:Math.max(5,Math.min(600,+e.inscricoesEsperadas||mediaInsc(tipo))),fora:false};});}
function obj(i){var e=PROP.eventos[i],s=EST[i],d=s.datas[s.sel];return {nome:e.nome||'Evento',tipo:s.tipo,data:d?d.d:'',hora:s.hora,dur:s.dur,insc:s.insc,conv:s.conv.map(function(c){return c.g.nome;}).join(', ')};}
function brl(v){return 'R$ '+(+v||0).toFixed(2).replace('.',',');}
function card(i){var e=PROP.eventos[i],s=EST[i],serie=PROP.tipoProposta==='serie'&&PROP.eventos.length>1,o=obj(i),r=o.data?simular(o):null,ativos=EST.filter(function(x){return !x.fora;}).length;
  var h='<article class="ia-card"><div class="hd"><div class="n">'+esc(serie?(i+1)+' de '+PROP.eventos.length+(e.papelNaSerie?' · '+e.papelNaSerie:''):'Evento')+'</div><h4>'+esc(e.nome||'Evento')+'</h4><div class="tags">'+[s.tipo,e.tema,e.formato,(s.dur>=60?Math.floor(s.dur/60)+'h'+(s.dur%60?('0'+s.dur%60).slice(-2):''):s.dur+' min')].filter(Boolean).map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div></div><div class="bd">';
  if(e.porque)h+='<p class="why">'+esc(e.porque)+'</p>';
  h+='<div class="ia-sec"><h5>Data · '+esc(s.hora)+'</h5><div class="dts">'+s.datas.map(function(x,j){var l=label(x.s);return '<button type="button" class="'+(j===s.sel?'on':'')+'" data-iad="'+i+'|'+j+'" title="'+esc(x.motivo)+'">'+esc(fmtLong(D(x.d)))+'<small>nota '+x.s+' · '+l[0].toLowerCase()+'</small></button>';}).join('')+'</div>'+(s.datas[s.sel]&&s.datas[s.sel].motivo?'<p class="note" style="margin:6px 0 0">'+esc(s.datas[s.sel].motivo)+'</p>':'')+'</div>';
  h+='<div class="ia-sec"><h5>Convidados</h5><div class="pp">'+s.conv.map(function(c){var g=c.g,ini=String(g.nome||'?').split(/\s+/).map(function(w){return w.charAt(0);}).join('').slice(0,2).toUpperCase();return '<div><span class="av2">'+esc(ini)+'</span><span>'+esc(g.nome)+'<small>'+esc([g.empresa,gT(g).join(', ')].filter(Boolean).join(' · '))+(c.motivo?'<br>'+esc(c.motivo):'')+'</small></span><span class="nt">nota '+gscore(g)+'</span></div>';}).join('')+
    (e.perfilProcurar?'<div><span class="av2 q">?</span><span>'+(s.conv.length?'Ou: ':'')+esc(e.perfilProcurar)+'<small>Perfil a procurar (não está na lista)</small></span></div>':'')+(!s.conv.length&&!e.perfilProcurar?'<p class="note" style="margin:0">Nenhum convidado da lista combina.</p>':'')+'</div></div>';
  if(r)h+='<div class="calc"><div class="t"><span>Calculado pelo Planejar</span><span>'+s.insc+' inscrições esperadas</span></div><div class="g"><div><b>'+r.p10+'–'+r.p90+'</b><small>público provável</small></div><div><b>'+esc(r.externo?'Fora da FEA':(r.sala||'sem sala'))+'</b><small>'+(r.externo?'sem sala':'sala sugerida')+'</small></div><div><b>'+(r.cpp==null?'—':brl(r.cpp))+'</b><small>'+(r.cpp==null?'custo: falta o preço do coffee':'por presente')+'</small></div></div></div>';
  (e.riscos||[]).slice(0,3).forEach(function(x){h+='<div class="risk">⚠ '+esc(x)+'</div>';});
  if(e.divulgacao)h+='<p class="note" style="margin:0"><b>Divulgação:</b> '+esc(e.divulgacao)+'</p>';
  h+='</div><div class="ft"><button class="btn small" type="button" data-iaplan="'+i+'">Levar para o Planejar</button><button class="btn small ghost" type="button" data-iatroca="'+i+'"'+(ocup?' disabled':'')+'>Trocar este</button>'+(serie&&ativos>1?'<button class="btn small ghost" type="button" data-iatira="'+i+'">Tirar da série</button>':'')+'</div></article>';
  return h;}
function beta(){var real=events.filter(function(e){return e.status==='realizado'&&!teste(e)&&+e.inscritos>0&&e.presentes!=null&&e.presentes!=='';});
  var cont={},todos={};events.filter(function(e){return !teste(e);}).forEach(function(e){var t=typeOf(e.tipo||'');if(t)todos[t]=(todos[t]||0)+1;});real.forEach(function(e){var t=typeOf(e.tipo);cont[t]=(cont[t]||0)+1;});
  var princ=Object.keys(todos).sort(function(a,b){return todos[b]-todos[a];}).filter(function(t,i){return todos[t]>=2||i<2;}).slice(0,4);
  var sem={};real.forEach(function(e){sem[semestre(e.data)]=1;});var ns=Object.keys(sem).filter(Boolean).length;
  var errs=real.filter(function(e){return +e.presentesPrev>0&&+e.presentes>0;}).map(function(e){return Math.abs(+e.presentesPrev-+e.presentes)/(+e.presentes);});
  var erro=errs.length?errs.reduce(function(a,b){return a+b;},0)/errs.length:null;
  var okT=princ.length&&princ.every(function(t){return (cont[t]||0)>=8;}),ok=okT&&ns>=2&&erro!=null&&erro<0.15;
  return {princ:princ,cont:cont,ns:ns,erro:erro,nErr:errs.length,ok:ok};}
function betaHtml(b){function pill(txt,ok){return '<span class="'+(ok?'ok':'')+'">'+(ok?'✓ ':'')+txt+'</span>';}
  return '<div class="ia-meta"><b>Para sair do BETA</b><div class="ia-steps">'+(b.princ.length?b.princ.map(function(t){var n=b.cont[t]||0;return pill(esc(t)+' '+Math.min(n,8)+' de 8',n>=8);}).join(''):pill('nenhum evento realizado ainda',false))+
    pill(Math.min(b.ns,2)+' de 2 semestres',b.ns>=2)+pill('erro da previsão '+(b.erro==null?'sem dados':Math.round(b.erro*100)+'%')+' (meta: abaixo de 15%)',b.erro!=null&&b.erro<0.15)+'</div><p class="note" style="margin:6px 0 0">Conta só eventos realizados com inscritos e presentes registrados, fora os [teste]. Tipos principais: os mais usados na Base.</p></div>';}
function selo(){var b=beta();document.querySelectorAll('.sitem[data-alvo=ia] .beta, #ia-title .beta').forEach(function(x){x.hidden=b.ok;});var a=$('ia-aviso');if(a)a.hidden=b.ok;return b;}
function desenhar(){if($('view-ia').hidden){selo();return;}
  var b=selo();$('ia-meta').innerHTML=b.ok?'':betaHtml(b);
  $('ia-gerar').disabled=ocup;
  var h='';
  if(ocup)h='<div class="ia-load"><i></i> Lendo a ideia, os convidados, o calendário e a Base… (uns 10 a 20 segundos)</div>';
  if(erro)h+='<div class="imsg err" style="margin-top:14px">'+esc(erro)+'</div>';
  if(okMsg)h+='<div class="imsg" style="margin-top:14px">'+okMsg+'</div>';
  if(PROP&&!ocup){var serie=PROP.tipoProposta==='serie'&&PROP.eventos.length>1,idx=[];EST.forEach(function(s,i){if(!s.fora)idx.push(i);});
    h+='<div class="ia-res"><div class="ia-head"><div class="ia-k">'+(serie?'Proposta · série de '+idx.length+' eventos':'Proposta · 1 evento')+'</div><h3>'+esc(PROP.titulo||'')+'</h3><p>'+esc(PROP.resumo||'')+'</p>'+(serie?'<div class="ia-steps">'+idx.map(function(i,k){var o=obj(i);return '<span><b>'+(k+1)+'</b> '+esc(o.tipo)+' · '+esc(o.data?fmtLong(D(o.data)):'sem data')+'</span>';}).join('')+'</div>':'')+'</div>'+
      '<div class="ia-grid">'+idx.map(card).join('')+'</div>'+
      '<div class="ia-adj"><input id="ia-ajuste" aria-label="Pedir ajuste" placeholder="Pedir ajuste: “troca a visita por uma mesa redonda”, “tudo depois do dia 30”…"><button class="btn ghost" type="button" id="ia-refazer">Refazer</button></div>'+
      '<div class="ia-save"><span class="note">Ao salvar, '+(serie?'os '+idx.length+' eventos entram na Base como planejados, ligados pela série “'+esc(PROP.titulo||'')+'”':'o evento entra na Base como planejado')+', com você como responsável. Dá para editar tudo depois no Planejar.'+(restantes!=null?' Você ainda pode pedir '+restantes+' propostas hoje.':'')+'</span>'+(pode('editar')?'<button class="btn" type="button" id="ia-salvar">'+(serie?'Salvar série ('+idx.length+' eventos)':'Salvar evento')+'</button>':'')+'</div></div>';}
  $('ia-out').innerHTML=h;}
function pedir(ajuste){var texto=$('ia-ideia').value.trim();if(!ajuste){if(texto.length<15){erro='Escreva a ideia com um pouco mais de detalhe.';desenhar();return;}IDEIA=texto;}
  ocup=true;erro=null;okMsg=null;desenhar();
  var extra={texto:IDEIA,contexto:contexto()};if(ajuste&&PROP){extra.anterior=PROP;extra.ajuste=ajuste;}
  robo('ideia','',extra).then(function(j){PROP=j.proposta;restantes=j.restantes;SIMC={};preparar();},function(err){erro=err.message;}).then(function(){ocup=false;desenhar();});}
$('ia-gerar').addEventListener('click',function(){PROP=null;pedir(null);});
document.querySelectorAll('[data-iaex]').forEach(function(b){b.addEventListener('click',function(){$('ia-ideia').value=EX[b.dataset.iaex];$('ia-ideia').focus();});});
$('view-ia').addEventListener('click',function(e){var b;
  if((b=e.target.closest('[data-iad]'))){var p=b.dataset.iad.split('|');EST[+p[0]].sel=+p[1];desenhar();return;}
  if((b=e.target.closest('[data-iatira]'))){EST[+b.dataset.iatira].fora=true;desenhar();return;}
  if((b=e.target.closest('[data-iatroca]'))){var ev=PROP.eventos[+b.dataset.iatroca];pedir('Troque o evento "'+(ev.nome||'')+'" por outra opção diferente (outro formato ou tema), mantendo os demais.');return;}
  if(e.target.id==='ia-refazer'){var a=$('ia-ajuste').value.trim();if(!a){$('ia-ajuste').focus();return;}pedir(a);return;}
  if((b=e.target.closest('[data-iaplan]'))){var o=obj(+b.dataset.iaplan);if(!o.data)return;
    editingId=null;savedId=null;salaManual=null;showEditBar();
    var sp=document.querySelector('.sitem[data-alvo=plan]');if(sp)sp.click();else{var t=$('tab-plan');if(t)t.click();}
    preencher(o);setNeeds(o.tipo);doCalc();window.scrollTo(0,0);return;}
  if(e.target.id==='ia-salvar'){salvar(e.target);}
});
$('view-ia').addEventListener('keydown',function(e){if(e.target.id==='ia-ajuste'&&e.key==='Enter'){e.preventDefault();var r=$('ia-refazer');if(r)r.click();}});
function salvar(btn){if(!db||!PROP)return;var idx=[];EST.forEach(function(s,i){if(!s.fora&&obj(i).data)idx.push(i);});if(!idx.length)return;
  var serie=PROP.tipoProposta==='serie'&&idx.length>1,sid=serie?'s'+Date.now():null,agora=new Date().toISOString();
  var docs=idx.map(function(i,k){var o=obj(i),r=simular(o);var d=Object.assign({status:'planejado',criadoEm:agora},r?r.cur:{nome:o.nome,tipo:o.tipo,data:o.data,hora:o.hora,duracao:o.dur,inscritosMeta:o.insc});
    d.responsavel=window.__meuNome||'';d.responsavelId=window.__euId||'';d.criadoPor=window.__euId||'';d.origem='ia';d.ideia=IDEIA.slice(0,2000);
    if(serie){d.serieId=sid;d.serieNome=PROP.titulo||'Série';d.serieOrdem=k+1;}return d;});
  btn.disabled=true;var feitos=0;
  docs.reduce(function(pr,d){return pr.then(function(){return db.collection('eventos').add(d).then(function(){feitos++;});});},Promise.resolve())
    .then(function(){okMsg=(serie?'Série salva: '+feitos+' eventos':'Evento salvo')+' na Base de eventos como planejado. <button type="button" class="btn small ghost" data-iabase>Ver na Base</button>';PROP=null;EST=[];$('ia-ideia').value='';},
          function(){erro='Não foi possível salvar'+(feitos?' todos (salvos '+feitos+' de '+docs.length+')':'')+'. Tente de novo.';})
    .then(function(){desenhar();});}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-iabase]')){var s=document.querySelector('.sitem[data-alvo=base]');if(s)s.click();}});
document.addEventListener('tela',function(e){if(e.detail==='ia')desenhar();});
var rb=renderBase;renderBase=function(){rb();if(!ocup)desenhar();};
selo();
})();
})();
