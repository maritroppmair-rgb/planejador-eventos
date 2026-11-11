/* ============================== FINANCEIRO ==============================
   Roda dentro do script principal (mesmo escopo de events, docs, db, P, esc, fmt, D, painelAbrir...).
   Coleções do Financeiro (as regras dão a edição a quem tem cargo no Financeiro):
   - fin_coffee/{id}: contatos de coffee {nome, contato, telefone, endereco, obs, itens:[{item, preco, unidade}]}
   - fin_verbas/{eventoId}: verba liberada para cada evento {valor, obs, historico:[{valor, em, porNome}]} (= soma do orçamento)
   - fin_orcamentos/{eventoId}: orçamento por item e a validação; fin_pagamentos/{eventoId}: pagamento de cada gasto (ver Orçamento por evento)
   Os gastos (cada um com seu comprovante) são registrados pela área de Eventos, no botão Registrar gastos (Base de eventos). */
var finLigar=null,finMudou=function(){},finAplicar=null,finDocs=null;
(function(){
"use strict";
var main=document.querySelector('main');
function nrm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function blk(t,h){return '<div class="tp-blk">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function confirma(b,txt,fn){if(b.dataset.sure){fn();return;}var o=b.textContent;b.dataset.sure='1';b.textContent=txt;setTimeout(function(){delete b.dataset.sure;b.textContent=o;},5000);}
function fpode(k){var p=window.__perm;return !!(p&&p.carregado()&&p.podeEm('Financeiro')[k]);}
function reais(v,dec){return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:dec==null?2:dec,maximumFractionDigits:dec==null?2:dec});}
function num(v){if(v==null||v==='')return null;var n=+String(v).replace(/\s/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');return isFinite(n)?n:null;}
function nv(v){return v==null||v===''?'':String(v).replace('.',',');}
function secao(id,titulo,nota,botao){
  var s=document.createElement('section');s.id='view-'+id;s.hidden=true;s.setAttribute('aria-labelledby',id+'-title');
  s.innerHTML='<div class="section-head"><div><h2 id="'+id+'-title">'+titulo+'</h2><p class="note">'+nota+'</p></div>'+(botao?'<div class="btns"><span class="msg" id="'+id+'-ok" aria-live="polite"></span>'+botao+'</div>':'')+'</div>';
  main.appendChild(s);return s;}
var fin={coffee:[],verbas:{}};window.__fin=fin;

/* ---------------- Contatos de coffee ---------------- */
var UNID=['por pessoa','por unidade','por kit','por cento','por litro','por kg','valor fixo'];
var sc=secao('fin-coffee','Contatos de coffee','Fornecedores de coffee e lanches, com contato e os itens e valores de cada um. Quem lança o gasto de coffee de um evento escolhe o local daqui; “Usado em” conta esses eventos.',
  '<button class="btn fin-ed" type="button" id="cf-novo">+ Novo local</button>');
sc.insertAdjacentHTML('beforeend','<div class="sbar"><input type="search" id="cf-busca" placeholder="Buscar local, contato, endereço ou item" aria-label="Buscar contato de coffee"><span class="note" id="cf-conta" aria-live="polite"></span></div><div class="tablewrap"><table id="cf-tab" class="tlist"></table></div>');
$('cf-busca').addEventListener('input',function(){renderCoffee();});
function usos(id){var n=0;events.forEach(function(e){if((e.gastos||[]).some(function(g){return g.local===id;}))n++;});return n;}
function porPessoa(c){var v=(c.itens||[]).filter(function(i){return i.unidade==='por pessoa'&&+i.preco>0;}).map(function(i){return +i.preco;});return v.length?Math.min.apply(null,v):null;}
function wa(t){var d=String(t||'').replace(/\D/g,'');if(d.length<10)return '';if(d.length<=11)d='55'+d;return 'https://wa.me/'+d;}
function renderCoffee(){
  var q=nrm($('cf-busca').value).trim(),L=fin.coffee;
  if(!L.length){$('cf-tab').innerHTML='<tbody><tr><td class="empty">Nenhum local ainda.'+(fpode('editar')?' Clique em “+ Novo local”.':'')+'</td></tr></tbody>';$('cf-conta').textContent='';return;}
  var l=L.filter(function(c){return !q||nrm([c.nome,c.contato,c.endereco,c.telefone,c.obs].concat((c.itens||[]).map(function(i){return i.item;})).join(' ')).indexOf(q)>=0;})
    .sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');});
  $('cf-conta').textContent=l.length+' de '+L.length+(L.length===1?' local':' locais');
  var h='<thead><tr><th>Local</th><th>Contato</th><th>Itens</th><th class="r">Por pessoa</th><th class="r">Usado em</th></tr></thead><tbody>';
  if(!l.length)h+='<tr><td colspan="5" class="empty">Nenhum local com essa busca.</td></tr>';
  l.forEach(function(c){var it=c.itens||[],pp=porPessoa(c),u=usos(c.id),w=wa(c.telefone);
    h+='<tr data-cfopen="'+esc(c.id)+'" tabindex="0"><td><span class="tn">'+esc(c.nome||'Sem nome')+'</span>'+(c.endereco?'<span class="tsub">'+esc(c.endereco)+'</span>':'')+'</td>'+
      '<td>'+(c.contato?'<span class="tn" style="font-weight:600">'+esc(c.contato)+'</span>':'')+(c.telefone?'<span class="tsub">'+esc(c.telefone)+(w?' · <a href="'+esc(w)+'" target="_blank" rel="noopener" class="cf-wa">WhatsApp ↗</a>':'')+'</span>':(c.contato?'':'<span class="note">—</span>'))+'</td>'+
      '<td>'+(it.length?it.slice(0,3).map(function(i){return '<span class="ttag">'+esc(i.item)+'</span>';}).join('')+(it.length>3?'<span class="note"> +'+(it.length-3)+'</span>':''):'<span class="note">sem itens</span>')+'</td>'+
      '<td class="r num">'+(pp!=null?'<b>'+reais(pp)+'</b>':'<span class="note">—</span>')+'</td><td class="r num">'+(u?u+(u===1?' evento':' eventos'):'<span class="note">—</span>')+'</td></tr>';});
  $('cf-tab').innerHTML=h+'</tbody>';
}
function itemLinha(i,ed){i=i||{};
  if(!ed)return '<tr><td>'+esc(i.item||'')+'</td><td class="r num">'+(i.preco!=null?reais(i.preco):'—')+'</td><td>'+esc(i.unidade||'')+'</td></tr>';
  return '<tr class="cf-it"><td><input data-k="item" aria-label="Item" placeholder="ex.: Kit coffee individual" value="'+esc(i.item||'')+'"></td>'+
    '<td><input data-k="preco" aria-label="Preço (R$)" inputmode="decimal" placeholder="0,00" value="'+esc(nv(i.preco))+'"></td>'+
    '<td><select data-k="unidade" aria-label="Unidade">'+UNID.map(function(u){return '<option'+(u===(i.unidade||'por pessoa')?' selected':'')+'>'+u+'</option>';}).join('')+'</select></td>'+
    '<td><button type="button" class="cf-x" data-cfrm aria-label="Tirar item">&times;</button></td></tr>';}
function campo(id,rot,val,extra){return '<div class="field'+(extra&&extra.full?' ffull':'')+'"><label for="'+id+'">'+rot+'</label>'+(extra&&extra.area?'<textarea id="'+id+'" rows="3">'+esc(val||'')+'</textarea>':'<input id="'+id+'" value="'+esc(val||'')+'"'+(extra&&extra.attr?' '+extra.attr:'')+'>')+'</div>';}
function montarCoffee(id){
  var c=id?fin.coffee.filter(function(x){return x.id===id;})[0]:{itens:[{}]};if(id&&!c)return null;
  var ed=fpode('editar'),it=c.itens||[];
  if(!ed){var w=wa(c.telefone);
    return {titulo:c.nome||'Local',sub:esc(c.endereco||''),
      corpo:blk('Contato','<p class="fin-ro"><span>Pessoa</span><b>'+esc(c.contato||'—')+'</b></p><p class="fin-ro"><span>Telefone</span><b>'+esc(c.telefone||'—')+(w?' · <a href="'+esc(w)+'" target="_blank" rel="noopener">WhatsApp ↗</a>':'')+'</b></p>'+(c.obs?'<p class="note" style="margin:8px 0 0">'+esc(c.obs)+'</p>':''))+
        blk('Itens e valores',it.length?'<table class="cf-itens"><thead><tr><th>Item</th><th class="r">Preço</th><th>Unidade</th></tr></thead><tbody>'+it.map(function(i){return itemLinha(i,false);}).join('')+'</tbody></table>':'<p class="note" style="margin:0">Nenhum item cadastrado.</p>')};}
  var corpo=blk('','<div class="fin-grid">'+campo('cf-nome','Nome do local <span class="rq">obrigatório</span>',c.nome,{full:1})+campo('cf-contato','Pessoa de contato',c.contato)+campo('cf-tel','Telefone ou WhatsApp',c.telefone,{attr:'type="tel" inputmode="tel" placeholder="(11) 90000-0000"'})+
      campo('cf-end','Endereço',c.endereco,{full:1})+campo('cf-obs','Observações',c.obs,{full:1,area:1})+'</div>')+
    blk('Itens e valores','<table class="cf-itens"><thead><tr><th>Item</th><th>Preço (R$)</th><th>Unidade</th><th><span class="sr">Tirar</span></th></tr></thead><tbody id="cf-its">'+(it.length?it:[{}]).map(function(i){return itemLinha(i,true);}).join('')+'</tbody></table>'+
      '<button type="button" class="btn small ghost" id="cf-add" style="margin-top:8px">+ Adicionar item</button>');
  var rod='<div class="btns"><button type="button" class="btn" id="cf-salvar">'+(id?'Salvar alterações':'Adicionar local')+'</button>'+(id&&fpode('excluir')?'<button type="button" class="btn small ghost tdanger" id="cf-del">Excluir</button>':'')+'<span class="msg" id="cf-msg" role="status"></span></div>';
  return {titulo:id?c.nome||'Local':'Novo local de coffee',sub:id?esc(c.endereco||''):'',corpo:corpo,rodape:rod};}
function abrirCoffee(id){
  painelAbrir({sec:'view-fin-coffee',chave:id||'novo',montar:function(){return montarCoffee(id);},foco:'#cf-nome',depois:function(dr){
    var add=dr.querySelector('#cf-add');if(add)add.addEventListener('click',function(){var tb=dr.querySelector('#cf-its');tb.insertAdjacentHTML('beforeend',itemLinha({},true));tb.lastElementChild.querySelector('input').focus();});
    var its=dr.querySelector('#cf-its');if(its)its.addEventListener('click',function(e){var x=e.target.closest('[data-cfrm]');if(!x)return;var tr=x.closest('tr');if(its.children.length>1)tr.remove();else tr.querySelectorAll('input').forEach(function(i){i.value='';});});
    var sv=dr.querySelector('#cf-salvar');if(sv)sv.addEventListener('click',function(){salvarCoffee(id,dr);});
    var dl=dr.querySelector('#cf-del');if(dl)dl.addEventListener('click',function(){confirma(dl,'Confirmar exclusão',function(){db.doc('fin_coffee/'+id).delete().then(function(){painelFechar();$('fin-coffee-ok').textContent='Local excluído.';}).catch(function(){dr.querySelector('#cf-msg').textContent='Não foi possível excluir.';});});});
  }});}
function salvarCoffee(id,dr){var msg=dr.querySelector('#cf-msg');if(!db){msg.textContent='Sem conexão com a base.';return;}
  var g=function(k){return dr.querySelector('#'+k).value.trim();},nome=g('cf-nome');
  if(!nome){msg.textContent='Dê um nome ao local.';dr.querySelector('#cf-nome').focus();return;}
  var itens=[],erro='';
  dr.querySelectorAll('#cf-its tr').forEach(function(tr){var v=function(k){return tr.querySelector('[data-k="'+k+'"]').value.trim();},item=v('item'),pr=v('preco');
    if(!item&&!pr)return;if(!item){erro='Dê um nome a cada item com preço.';return;}var p=num(pr);if(pr&&(p==null||p<0)){erro='Preço inválido em “'+item+'”.';return;}
    itens.push({item:item,preco:p,unidade:v('unidade')});});
  if(erro){msg.textContent=erro;return;}
  var d={nome:nome,contato:g('cf-contato'),telefone:g('cf-tel'),endereco:g('cf-end'),obs:g('cf-obs'),itens:itens,editadoEm:new Date().toISOString()};
  msg.textContent='Salvando…';
  (id?db.doc('fin_coffee/'+id).set(d,{merge:true}):db.collection('fin_coffee').add(d)).then(function(){painelFechar();$('fin-coffee-ok').textContent=id?'Alterações salvas.':'Local adicionado.';})
    .catch(function(){msg.textContent='Não foi possível salvar.';});}
$('cf-novo').addEventListener('click',function(){$('fin-coffee-ok').textContent='';abrirCoffee(null);});
function cliqueCf(e){if(e.target.closest('a'))return;var tr=e.target.closest('[data-cfopen]');if(tr&&(e.type==='click'||e.key==='Enter'||e.key===' ')){if(e.type==='keydown')e.preventDefault();abrirCoffee(tr.dataset.cfopen);}}
$('cf-tab').addEventListener('click',cliqueCf);$('cf-tab').addEventListener('keydown',cliqueCf);
renderCoffee();

/* ---------------- comum: gastos de cada evento ---------------- */
/* Os gastos são lançados pela área de Eventos, no painel do evento (Base de eventos), e ficam no próprio evento:
   eventos/{id}.gastos = [{id, data, tipo, desc, valor, local, porNome, em}]. Ao salvar, o evento também guarda custo (total),
   custoBasico (coffee + material + sala) e custoNaoPrev (outros), que a Base, o Analytics e o Planejar já usam. */
var TIPOS=[['coffee','Coffee'],['material','Material impresso'],['sala','Sala'],['outro','Outro']];
function tipoNome(t){if(t==='antigo')return 'Registrado antes';for(var i=0;i<TIPOS.length;i++)if(TIPOS[i][0]===t)return TIPOS[i][1];return 'Outro';}
/* evento com custo total salvo antes do bloco de gastos: no 1º lançamento o total vira item(ns), para não se perder */
function legado(e){if(gastosDe(e).length||e.custo==null||!(+e.custo>0))return [];var tot=+e.custo,np=+e.custoNaoPrev>0?Math.min(+e.custoNaoPrev,tot):0,r=[],quando=e.data||hojeISO(),em=new Date().toISOString();
  if(tot-np>0.004)r.push({id:'ant1',data:quando,tipo:'antigo',desc:'Custo registrado antes (total)',valor:arred(tot-np),local:null,porNome:'',em:em});
  if(np>0)r.push({id:'ant2',data:quando,tipo:'outro',desc:'Não previsto registrado antes',valor:arred(np),local:null,porNome:'',em:em});return r;}
function semestre(dt){var p=String(dt||'').split('-');return p.length<2?'':p[0]+'.'+(+p[1]<=7?1:2);}
function arred(v){return Math.round(v*100)/100;}
function gastosDe(e){return Array.isArray(e&&e.gastos)?e.gastos:[];}
function somaG(l,f){return arred(l.reduce(function(t,g){return t+(!f||f(g)?(+g.valor||0):0);},0));}
/* gasto do evento: a soma dos lançamentos; eventos antigos podem ter só o total (custo) */
function gastoDe(e){var l=gastosDe(e);if(l.length)return somaG(l);return e&&e.custo!=null&&e.custo!==''?+e.custo:null;}
function verbaDe(id){var v=fin.verbas[id];return v&&v.valor!=null?+v.valor:null;}
function nfs(id){return docs.filter(function(d){return (d.tipo==='Nota fiscal'||d.tipo==='Comprovante')&&(d.eventos||[]).indexOf(id)>=0;});}
function epode(k){var p=window.__perm;return !!(p&&p.carregado()&&p.podeEm('Eventos')[k]);}
function dataBR(s){return s?fmt(D(s.slice(0,10)))+'/'+s.slice(2,4):'—';}
function hojeISO(){return iso(new Date());}
function resumoGasto(e){var g=gastoDe(e),v=verbaDe(e.id),p=e.custoPrev;
  var h='<div class="g-res"><div><span>Previsto</span><b>'+(p!=null?reais(p):'—')+'</b></div><div><span>Verba liberada</span><b>'+(v!=null?reais(v):'<em>ainda não</em>')+'</b></div><div><span>Gasto</span><b>'+reais(g||0)+'</b></div>'+
    (v!=null?'<div class="'+((g||0)>v+0.005?'g-mais':'g-ok')+'"><span>'+((g||0)>v+0.005?'Passou da verba':'Saldo da verba')+'</span><b>'+reais(Math.abs(v-(g||0)))+'</b></div>':'')+'</div>';
  return h;}

/* ---- "Registrar gastos" (painel próprio, aberto pela lista da Base) ----
   Cada gasto é uma ficha única: data, tipo, valor, descrição, local do coffee e o comprovante (opcional; sem ele, o gasto fica marcado).
   O comprovante vira um documento (tipo Comprovante) na pasta do evento, com a descrição do gasto como nome. */
function docDe(id){return id?docs.filter(function(d){return d.id===id;})[0]||null:null;}
function linkDoc(d){if(!d)return '';var f=dFontes(d);return safeUrl(dPrincipal(d.tipo,f.link,f.arquivo))||'';}
function linhaGasto(g,ed){var loc=g.local?fin.coffee.filter(function(x){return x.id===g.local;})[0]:null,cd=docDe(g.docId),u=linkDoc(cd);
  var comp=u?'<a href="'+esc(u)+'" target="_blank" rel="noopener" class="g-comp">comprovante ↗</a>':(g.tipo==='antigo'?'':'<span class="chip warn g-semc">sem comprovante</span>');
  return '<tr><td class="num">'+dataBR(g.data)+'</td><td><span class="tn" style="font-weight:600">'+esc(g.desc||tipoNome(g.tipo))+'</span><span class="tsub">'+esc(tipoNome(g.tipo)+(loc?' · '+loc.nome:'')+(g.porNome?' · '+g.porNome:''))+'</span>'+comp+'</td><td class="r num"><b>'+reais(g.valor)+'</b></td>'+
    (ed?'<td class="r"><button type="button" class="cf-x" data-gdel="'+esc(g.id)+'" aria-label="Excluir gasto" title="Excluir gasto">&times;</button></td>':'')+'</tr>';}
window.__gastosBlk=function(e){var ed=epode('editar'),l=gastosDe(e).slice().sort(function(a,b){return (a.data||'')<(b.data||'')?-1:1;});
  var h=resumoGasto(e);
  if(!l.length&&e.custo!=null)h+='<p class="note" style="margin:8px 0 0">Registrado antes, só com o total: <b>'+reais(e.custo)+'</b>. Ao registrar o primeiro gasto, esse total entra na lista como “Registrado antes”.</p>';
  h+=l.length?'<table class="g-tab"><tbody>'+l.map(function(g){return linhaGasto(g,ed&&epode('excluir'));}).join('')+'</tbody></table>':'<p class="note" style="margin:10px 0 0">Nenhum gasto registrado ainda.</p>';
  /* comprovantes antigos, anexados soltos antes da ficha única */
  var usados={};l.forEach(function(g){if(g.docId)usados[g.docId]=1;});
  var soltos=nfs(e.id).filter(function(d){return !usados[d.id];});
  if(soltos.length)h+='<p class="note" style="margin:10px 0 4px">Comprovantes anexados sem gasto:</p><ul class="fc-nfs">'+soltos.map(function(d){var u=linkDoc(d);return '<li><span>'+esc(d.nome)+(d.criadoEm?' <span class="note">'+dataBR(d.criadoEm)+'</span>':'')+'</span>'+(u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">Abrir ↗</a>':'')+'</li>';}).join('')+'</ul>';
  var out='<div class="tp-blk" id="g-blk"><h4>Gastos do evento</h4>'+h+'</div>';
  if(ed){var ops=fin.coffee.slice().sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'pt-BR');}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>';}).join('');
    out+='<div class="tp-blk g-ficha" id="g-add"><h4>Registrar gasto</h4><div class="g-grid">'+
      '<div class="field"><label for="g-data">Data</label><input id="g-data" type="date" value="'+hojeISO()+'"></div>'+
      '<div class="field"><label for="g-tipo">Tipo</label><select id="g-tipo">'+TIPOS.map(function(t){return '<option value="'+t[0]+'">'+t[1]+'</option>';}).join('')+'</select></div>'+
      '<div class="field"><label for="g-valor">Valor (R$)</label><input id="g-valor" inputmode="decimal" placeholder="0,00"></div>'+
      '<div class="field g-wide"><label for="g-desc">Descrição <span class="rq">vira o nome do comprovante em Documentos</span></label><input id="g-desc" maxlength="120" placeholder="ex.: Coffee para 60 pessoas"></div>'+
      '<div class="field g-wide" id="g-locbox"><label for="g-local">Local do coffee <span class="rq opt">dos Contatos de coffee</span></label><select id="g-local"><option value="">Sem local</option>'+ops+'</select></div>'+
      (function(){var oi=((orcDe(e.id)||{}).itens||[]);return oi.length?'<div class="field g-wide"><label for="g-orc">Linha do orçamento <span class="rq opt">opcional · para o Financeiro comparar o aprovado com o gasto</span></label><select id="g-orc"><option value="">Sem linha</option>'+oi.map(function(x){return '<option value="'+esc(x.id)+'">'+esc((x.desc||tipoNome(x.tipo))+' · '+reais(x.valor))+'</option>';}).join('')+'</select></div>':'';})()+
      '<div class="field g-wide g-compbox"><label for="g-arq">Comprovante <span class="rq opt">opcional · dá para anexar depois</span></label><input id="g-arq" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"><input id="g-link" type="url" placeholder="ou cole um link (https://...)" aria-label="Link do comprovante"><span class="note">Nota fiscal, recibo ou print do pagamento (PDF ou imagem, até 10 MB). Vai para a pasta do evento em Documentos. Sem comprovante, o gasto fica marcado como “sem comprovante”.</span></div>'+
      '</div><div class="btns" style="margin-top:10px"><button type="button" class="btn" id="g-salvar">Registrar gasto</button><span class="msg" id="g-msg" role="status"></span></div></div>';}
  return out;};
function gravarGastos(id,lista){var e=events.filter(function(x){return x.id===id;})[0];
  var up={gastos:lista};
  if(lista.length){up.custo=somaG(lista);up.custoNaoPrev=somaG(lista,function(g){return g.tipo==='outro';});up.custoBasico=arred(up.custo-up.custoNaoPrev);}
  else if(e&&gastosDe(e).length){up.custo=null;up.custoBasico=null;up.custoNaoPrev=null;}
  return db.doc('eventos/'+id).update(up);}
/* sobe o arquivo (se houver) e cria o documento do comprovante; devolve o id do documento */
function criarComprovante(id,nome,resumo,file,link){
  var d={nome:nome,tipo:'Comprovante',versao:'',resp:String(window.__meuNome||'').slice(0,80),resumo:resumo,eventos:[id],area:'Eventos',criadoEm:new Date().toISOString(),link:link||'',arquivo:''};
  function salvar(){d.url=dPrincipal(d.tipo,d.link,d.arquivo);return db.collection('documentos').add(d).then(function(r){return r.id;});}
  if(!file)return salvar();
  var ext=(file.name.split('.').pop()||'').toLowerCase(),TY={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  return window.claude.use('assets').then(function(api){if(!api)throw {code:'sem'};return api.upload(file,{type:TY[ext]||file.type});})
    .then(function(r){d.arquivo='/_blob/'+r.id;d.assetId=r.id;return salvar();});}
window.__gastosLigar=function(dr,id){
  var tp=dr.querySelector('#g-tipo'),lb=dr.querySelector('#g-locbox');
  function vis(){if(lb)lb.hidden=tp.value!=='coffee';}if(tp){tp.addEventListener('change',vis);vis();}
  var sv=dr.querySelector('#g-salvar');if(sv)sv.addEventListener('click',function(){var msg=dr.querySelector('#g-msg');if(!db){msg.textContent='Sem conexão com a base.';return;}
    var e=events.filter(function(x){return x.id===id;})[0];if(!e)return;
    var dt=dr.querySelector('#g-data').value,vl=num(dr.querySelector('#g-valor').value),ds=dr.querySelector('#g-desc').value.trim(),t=tp.value,file=dr.querySelector('#g-arq').files[0],link=dr.querySelector('#g-link').value.trim();
    if(!dt){msg.textContent='Escolha a data do gasto.';return;}
    if(vl==null||vl<=0){msg.textContent='Informe o valor, como 120,50.';dr.querySelector('#g-valor').focus();return;}
    if(!ds){msg.textContent='Escreva a descrição do gasto.';dr.querySelector('#g-desc').focus();return;}
    if(!file&&link&&!safeUrl(link)){msg.textContent='O link precisa começar com https://';return;}
    if(file&&file.size>10*1024*1024){msg.textContent='Arquivo maior que 10 MB: use um link do Drive.';return;}
    var g={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),data:dt,tipo:t,desc:ds.slice(0,120),valor:arred(vl),local:t==='coffee'?(dr.querySelector('#g-local').value||null):null,porNome:String(window.__meuNome||'').slice(0,80),em:new Date().toISOString()};
    var go=dr.querySelector('#g-orc');if(go&&go.value)g.orcItem=go.value;
    msg.textContent=file?'Enviando o comprovante…':'Salvando…';sv.disabled=true;
    (file||link?criarComprovante(id,g.desc,tipoNome(t)+' · '+reais(g.valor)+' · '+dataBR(dt),file,file?'':link):Promise.resolve(null))
      .then(function(docId){if(docId)g.docId=docId;msg.textContent='Salvando…';return gravarGastos(id,legado(e).concat(gastosDe(e),[g]));})
      .catch(function(err){sv.disabled=false;msg.textContent=err&&err.code==='quota_exceeded'?'Espaço de arquivos cheio: use um link do Drive.':err&&err.code==='unsupported_type'?'Tipo de arquivo não aceito: use PDF ou imagem.':'Não foi possível registrar o gasto.';});});
  var bl=dr.querySelector('#g-blk');if(bl)bl.addEventListener('click',function(ev){var b=ev.target.closest('[data-gdel]');if(!b)return;
    if(!b.dataset.sure){b.dataset.sure='1';b.textContent='Excluir?';b.classList.add('sure');setTimeout(function(){delete b.dataset.sure;b.innerHTML='&times;';b.classList.remove('sure');},4000);return;}
    var e=events.filter(function(x){return x.id===id;})[0];if(!e)return;b.disabled=true;var g0=gastosDe(e).filter(function(g){return g.id===b.dataset.gdel;})[0];
    /* o comprovante do gasto vai junto para a Lixeira */
    gravarGastos(id,gastosDe(e).filter(function(g){return g.id!==b.dataset.gdel;})).then(function(){if(g0&&g0.docId&&docDe(g0.docId))return db.doc('documentos/'+g0.docId).delete();}).catch(function(){b.disabled=false;});});
};

/* ---------------- Financeiro: Orçamento por evento ----------------
   fin_verbas/{eventoId} = {valor, obs, nome, em, porNome, historico:[{valor, em, porNome}]}: a verba liberada. Desde o orçamento
     por item, o valor é a soma das linhas do orçamento, gravada junto ao salvar (o resto do app continua lendo daqui).
   fin_orcamentos/{eventoId} = {itens:[{id, tipo, desc, fornecedor, local, valor, fonte}], nome, em, porNome, validado:{em, por, uid}|null}
     Abre já com as linhas do previsto no Planejar. "Validar orçamento" (diretoria do Financeiro e acesso total) exige descrição,
     fornecedor (no coffee, um dos Contatos de coffee), valor e fonte em toda linha, e grava também eventos/{id}.etapas.orcamento,
     que deixa verde o ponto "Orçamento validado" do checklist. Salvar uma mudança depois desfaz a validação; com o orçamento
     validado, só quem valida pode mudar.
   fin_pagamentos/{eventoId} = {g:{idDoGasto:{sit:'apagar'|'pago'|'reembolso', forma, data, em, por}}}: o Financeiro marca o
     pagamento de cada gasto lançado por Eventos. Gastos registrados antes de PAG_DESDE não entram em "A pagar".
   Cada gasto pode apontar para uma linha do orçamento (gasto.orcItem), escolhida em Registrar gastos: aprovado × gasto por linha. */
var FONTES=['Caixa da Feashion','Patrocínio','Outro'];
var PAGS=[['apagar','A pagar','warn'],['pago','Pago','ok'],['reembolso','Reembolsar membro','bad']];
var FORMAS=['Pix','Cartão','Dinheiro','Boleto'];
var PAG_DESDE='2026-11-11';
fin.orc={};fin.pag={};
function orcDe(id){return fin.orc[id]||null;}
function somaItens(l){return arred((l||[]).reduce(function(t,x){return t+(+x.valor||0);},0));}
function novoId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function ddmmF(s){return s?s.slice(8,10)+'/'+s.slice(5,7):'';}
function prim(n){return String(n||'').split(' ')[0];}
function quemF(){return {em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80),uid:window.__euId||''};}
function podeValidar(){var p=window.__perm;if(!p||!p.carregado())return false;var c=p.cargoEm('Financeiro');return !!(p.dev()||p.geral()||c==='Diretor(a)'||c==='Coordenador(a)');}
function validadoDe(e){var o=orcDe(e.id);return o&&o.validado&&o.validado.em?o.validado:null;}
function estadoOrc(e){var o=orcDe(e.id);if(validadoDe(e))return 'val';if(o&&o.itens&&o.itens.length)return 'prep';return 'sem';}
var EORC={sem:['Sem orçamento','warn'],prep:['A validar','neutral'],val:['Validado','ok']};
/* pode mexer no orçamento deste evento? (validado: só quem valida) */
function podeOrc(e){return fpode('editar')&&(!validadoDe(e)||podeValidar());}
function itensIniciais(e){var o=orcDe(e.id);if(o&&o.itens)return JSON.parse(JSON.stringify(o.itens));
  var pi=e.custoPrevItens,l=[];
  if(pi)[['coffee','Coffee',pi.coffee],['material','Material impresso',pi.material],['sala','Sala',pi.sala],['outro','Outros',pi.outros]].forEach(function(r){if(+r[2]>0)l.push({id:novoId(),tipo:r[0],desc:r[1],fornecedor:'',local:null,valor:arred(+r[2]),fonte:''});});
  var v=verbaDe(e.id);if(!l.length&&v!=null)l.push({id:novoId(),tipo:'outro',desc:'Verba liberada antes do orçamento por item',fornecedor:'',local:null,valor:v,fonte:''});
  return l;}
var ORAS={};
function rascOrc(e){var r=ORAS[e.id];if(!r){var it0=itensIniciais(e),nv0=!orcDe(e.id)&&it0.length>0;r=ORAS[e.id]={itens:it0,sujo:nv0,novo:nv0,msg:''};}else if(!r.sujo)r.itens=itensIniciais(e);return r;}
function linhaOk(x){return !!String(x.desc||'').trim()&&(x.tipo==='coffee'?!!x.local:!!String(x.fornecedor||'').trim())&&+x.valor>0&&FONTES.indexOf(x.fonte)>=0;}
function nomeForn(x){if(x.tipo==='coffee'){var c=fin.coffee.filter(function(y){return y.id===x.local;})[0];return c?c.nome:'';}return x.fornecedor||'';}
function gastoPorItem(e){var m={},ids={};((orcDe(e.id)||{}).itens||[]).forEach(function(x){ids[x.id]=1;});
  gastosDe(e).forEach(function(g){var k=g.orcItem&&ids[g.orcItem]?g.orcItem:'';m[k]=arred((m[k]||0)+(+g.valor||0));});return m;}
function coffeeOps(sel){return fin.coffee.slice().sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'pt-BR');}).map(function(c){return '<option value="'+esc(c.id)+'"'+(c.id===sel?' selected':'')+'>'+esc(c.nome)+'</option>';}).join('');}
function orcBlk(e){var ed=podeOrc(e),gp=gastoPorItem(e),val=validadoDe(e),it=ed?rascOrc(e).itens:((orcDe(e.id)||{}).itens||[]),h='';
  if(!it.length&&!ed)return '<p class="note" style="margin:0">O Financeiro ainda não montou o orçamento deste evento.</p>';
  if(ed){
    h='<p class="note" style="margin:0 0 8px">Uma linha por item, com fornecedor, valor aprovado e de onde sai o dinheiro. Abre com o previsto no Planejar; o total vira a verba liberada.</p><div class="orc-l">'+it.map(function(x,i){var a='data-oi="'+i+'" data-of=';
      var forn=x.tipo==='coffee'?'<select '+a+'"local" aria-label="Local do coffee"><option value="">Local do coffee…</option>'+coffeeOps(x.local)+'</select>'
        :'<input '+a+'"fornecedor" maxlength="80" placeholder="Fornecedor" value="'+esc(x.fornecedor||'')+'" aria-label="Fornecedor">';
      return '<div class="orc-r'+(linhaOk(x)?'':' inc')+'">'+
        '<select '+a+'"tipo" aria-label="Tipo">'+TIPOS.map(function(t){return '<option value="'+t[0]+'"'+(t[0]===x.tipo?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select>'+
        '<input '+a+'"desc" maxlength="80" placeholder="Descrição" value="'+esc(x.desc||'')+'" aria-label="Descrição">'+forn+
        '<span class="vb-in"><span>R$</span><input '+a+'"valor" inputmode="decimal" placeholder="0,00" value="'+esc(x.valor!=null&&x.valor!==''?nv(x.valor):'')+'" aria-label="Valor aprovado"></span>'+
        '<select '+a+'"fonte" aria-label="Fonte do recurso"><option value="">Fonte…</option>'+FONTES.map(function(f){return '<option'+(f===x.fonte?' selected':'')+'>'+f+'</option>';}).join('')+'</select>'+
        '<span class="orc-g">'+(gp[x.id]?'gasto '+reais(gp[x.id]):'')+'</span>'+
        '<button type="button" class="cf-x" data-ox="'+i+'" aria-label="Tirar a linha '+esc(x.desc||'')+'" title="Tirar linha">&times;</button></div>';}).join('')+'</div>'+
      '<button type="button" class="btn small ghost" data-oadd style="margin-top:8px">+ Adicionar item</button>';
  }else h='<table class="fc-prev orc-t"><tbody>'+it.map(function(x){return '<tr><td><b>'+esc(x.desc||tipoNome(x.tipo))+'</b><span class="tsub">'+esc([tipoNome(x.tipo),nomeForn(x),x.fonte].filter(Boolean).join(' · '))+'</span></td><td class="r num">'+reais(x.valor)+(gp[x.id]?'<span class="tsub">gasto '+reais(gp[x.id])+'</span>':'')+'</td></tr>';}).join('')+'</tbody></table>';
  h+='<p class="fin-ro orc-tot"><span>Total aprovado (verba liberada)</span><b>'+reais(somaItens(it))+'</b></p>';
  if(gp[''])h+='<p class="note" style="margin:0">Gastos sem linha do orçamento: '+reais(gp[''])+'.</p>';
  h+='<p class="orc-st">'+(val?'<span class="chip ok">✓ Orçamento validado por '+esc(prim(val.por))+' em '+ddmmF(val.em)+'</span>'+(fpode('editar')&&!podeValidar()?' <span class="note">Só a diretoria do Financeiro muda um orçamento validado.</span>':''):'<span class="chip warn">Ainda não validado</span>')+'</p>';
  return h;}
function rodOrc(e){if(!podeOrc(e))return '';var r=rascOrc(e),val=validadoDe(e),pv=podeValidar(),falta=!r.itens.length||r.itens.some(function(x){return !linhaOk(x);});
  var vb=pv?(val?'<button type="button" class="btn ghost" id="or-desval">Desfazer validação</button>':'<button type="button" class="btn ghost" id="or-val"'+(r.sujo||falta||!orcDe(e.id)?' disabled':'')+'>Validar orçamento</button>'):'';
  var dica=r.msg||(r.sujo?(r.novo?'Rascunho com o previsto no Planejar: complete e salve.':'Alterações não salvas.')+(val?' Salvar desfaz a validação.':''):pv&&!val?(falta?'Para validar, toda linha precisa de descrição, fornecedor, valor e fonte.':!orcDe(e.id)?'Salve o orçamento para poder validar.':''):'');
  return '<div class="btns"><button type="button" class="btn" id="or-salvar"'+(r.sujo?'':' disabled')+'>Salvar orçamento</button>'+vb+'<span class="msg" id="or-msg" role="status">'+esc(dica)+'</span></div>';}
function redesenhaOrc(){var a=document.activeElement;if(a&&a.blur&&a.closest&&a.closest('#view-fin-custos .tpanel'))a.blur();painelAtualizar('view-fin-custos');}
function salvarOrc(e){var r=rascOrc(e),q=quemF(),eraVal=!!validadoDe(e);
  if(r.itens.some(function(x){return x.valor===null||(x.valor!==''&&!(+x.valor>=0));})){r.msg='Valor inválido: use só números, como 1.200,50.';redesenhaOrc();return;}
  var it=r.itens.map(function(x){return {id:x.id,tipo:x.tipo,desc:String(x.desc||'').trim().slice(0,80),fornecedor:x.tipo==='coffee'?'':String(x.fornecedor||'').trim().slice(0,80),local:x.tipo==='coffee'?(x.local||null):null,valor:x.valor===''?0:arred(+x.valor||0),fonte:x.fonte||''};});
  r.msg='Salvando…';redesenhaOrc();
  var ps=[db.doc('fin_orcamentos/'+e.id).set({itens:it,nome:e.nome||'',em:q.em,porNome:q.por,validado:null}),salvarVerba(e.id,nv(somaItens(it)),null,null)];
  if(eraVal)ps.push(db.doc('eventos/'+e.id).update({'etapas.orcamento':null}));
  Promise.all(ps).then(function(){r.sujo=false;r.novo=false;r.itens=JSON.parse(JSON.stringify(it));r.msg='Orçamento salvo: verba liberada de '+reais(somaItens(it))+'.'+(eraVal?' A validação foi desfeita; valide de novo.':'');redesenhaOrc();})
    .catch(function(){r.msg='Não foi possível salvar o orçamento.';redesenhaOrc();});}
function validarOrc(e,on){var r=rascOrc(e),q=quemF();r.msg='Salvando…';redesenhaOrc();
  Promise.all([db.doc('fin_orcamentos/'+e.id).update({validado:on?{em:q.em,por:q.por,uid:q.uid}:null}),db.doc('eventos/'+e.id).update({'etapas.orcamento':on?{s:'ok',em:q.em,por:q.por,uid:q.uid}:null})])
    .then(function(){r.msg=on?'Orçamento validado: o ponto do checklist ficou verde.':'Validação desfeita.';redesenhaOrc();})
    .catch(function(){r.msg='Não foi possível '+(on?'validar':'desfazer a validação')+'. Confira se seu cargo permite.';redesenhaOrc();});}
/* os ouvintes ficam no painel (que é reaproveitado entre redesenhos e eventos): ligados uma vez, leem o evento aberto em dr._orcId */
function evAberto(dr){return events.filter(function(x){return x.id===dr._orcId;})[0]||null;}
function ligarOrc(dr){
  function ctx(){var e=evAberto(dr);return e&&podeOrc(e)?{e:e,r:rascOrc(e)}:null;}
  function mexeu(c){c.r.sujo=true;c.r.msg='';var s=dr.querySelector('#or-salvar');if(s)s.disabled=false;var v=dr.querySelector('#or-val');if(v)v.disabled=true;var m=dr.querySelector('#or-msg');if(m)m.textContent='Alterações não salvas.'+(validadoDe(c.e)?' Salvar desfaz a validação.':'');}
  function campo(t){var c=ctx();if(!c)return null;var x=c.r.itens[+t.dataset.oi],f=t.dataset.of;if(!x)return null;
    if(f==='valor'){var v=t.value.trim();x.valor=v===''?'':num(v);}else x[f]=t.value||(f==='local'?null:'');
    var row=t.closest('.orc-r');if(row)row.classList.toggle('inc',!linhaOk(x));mexeu(c);return f;}
  dr.addEventListener('input',function(ev){var t=ev.target;if(t.dataset&&t.dataset.oi!=null&&t.tagName==='INPUT')campo(t);});
  dr.addEventListener('change',function(ev){var t=ev.target;if(!t.dataset||t.dataset.oi==null)return;if(campo(t)==='tipo')redesenhaOrc();});
  dr.addEventListener('click',function(ev){var b=ev.target.closest('[data-oadd],[data-ox],#or-salvar,#or-val,#or-desval');if(!b)return;var c=ctx();if(!c)return;
    if(b.hasAttribute('data-oadd')){c.r.itens.push({id:novoId(),tipo:'outro',desc:'',fornecedor:'',local:null,valor:'',fonte:''});mexeu(c);redesenhaOrc();var l=dr.querySelectorAll('.orc-r [data-of="desc"]');if(l.length)l[l.length-1].focus();}
    else if(b.dataset.ox!=null){c.r.itens.splice(+b.dataset.ox,1);mexeu(c);redesenhaOrc();}
    else if(b.id==='or-salvar')salvarOrc(c.e);
    else if(b.id==='or-val')validarOrc(c.e,true);
    else if(b.id==='or-desval')validarOrc(c.e,false);});}

/* pagamento de cada gasto */
function pagDe(eid,gid){var p=fin.pag[eid];return p&&p.g&&p.g[gid]||null;}
function sitDe(eid,g){var p=pagDe(eid,g.id);return p&&p.sit?p.sit:((g.em||'')>=PAG_DESDE?'apagar':'');}
function pagNome(s){for(var i=0;i<PAGS.length;i++)if(PAGS[i][0]===s)return PAGS[i];return ['Antes do controle de pagamento','neutral'];}
function pagBlk(e){var l=gastosDe(e).filter(function(g){return g.tipo!=='antigo';}).sort(function(a,b){return (a.data||'')<(b.data||'')?-1:1;}),ed=fpode('editar');
  if(!l.length)return '<p class="note" style="margin:0">Nenhum gasto registrado pela área de Eventos ainda.</p>';
  return '<ul class="pg-l">'+l.map(function(g){var p=pagDe(e.id,g.id)||{},s=sitDe(e.id,g),pn=pagNome(s),a='data-pg="'+esc(g.id)+'" data-pf=';
    var ctl=ed?'<select '+a+'"sit" aria-label="Situação do pagamento">'+(s?'':'<option value="" selected>Antes do controle</option>')+PAGS.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===s?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select>'+
      '<select '+a+'"forma" aria-label="Forma de pagamento"><option value="">Forma…</option>'+FORMAS.map(function(f){return '<option'+(f===p.forma?' selected':'')+'>'+f+'</option>';}).join('')+'</select>'+
      '<input type="date" '+a+'"data" value="'+esc(p.data||'')+'" aria-label="Data do pagamento">'
      :'<span class="chip '+pn[2]+'">'+pn[1]+'</span>'+(p.forma||p.data?'<span class="note">'+esc([p.forma,p.data?dataBR(p.data):''].filter(Boolean).join(' · '))+'</span>':'');
    return '<li class="pg-'+(s||'ant')+'"><div><b>'+esc(g.desc||tipoNome(g.tipo))+' · '+reais(g.valor)+'</b><span class="tsub">'+esc([dataBR(g.data),tipoNome(g.tipo),g.porNome].filter(Boolean).join(' · '))+'</span></div><div class="pg-c">'+ctl+'</div></li>';}).join('')+'</ul>';}
function ligarPag(dr){dr.addEventListener('change',function(ev){var t=ev.target,id=dr._orcId;if(!t.dataset||t.dataset.pg==null||!db||!id)return;
  var cur=JSON.parse(JSON.stringify(fin.pag[id]||{}));cur.g=cur.g||{};var x=cur.g[t.dataset.pg]||{},q=quemF();
  x[t.dataset.pf]=t.value;if(!x.sit)x.sit='apagar';if(t.dataset.pf==='sit'&&t.value==='pago'&&!x.data)x.data=hojeISO();x.em=q.em;x.por=q.por;cur.g[t.dataset.pg]=x;delete cur.id;
  db.doc('fin_pagamentos/'+id).set(cur).catch(function(){alertMsg('Não foi possível salvar o pagamento.');});});}
/* tudo o que falta pagar (ou reembolsar), de todos os eventos */
function aPagar(){var out=[];events.forEach(function(e){if(/\[teste\]/i.test(e.nome||''))return;
  gastosDe(e).forEach(function(g){if(g.tipo==='antigo')return;var s=sitDe(e.id,g);if(s==='apagar'||s==='reembolso')out.push({e:e,g:g,s:s});});});
  return out.sort(function(a,b){return (a.g.data||'')<(b.g.data||'')?-1:1;});}

function situacao(e){var v=verbaDe(e.id),g=gastoDe(e)||0;if(v==null)return 'sem';if(g>v+0.005)return 'passou';return 'ok';}
var SIT={sem:['Sem verba','warn'],ok:['Dentro da verba','ok'],passou:['Gasto passou da verba','bad']};
var sx=secao('fin-custos','Orçamento por evento','O Financeiro monta o orçamento de cada evento, linha por linha (fornecedor, valor e fonte), e valida; o total vira a verba liberada. Os gastos, lançados pela área de Eventos, aparecem em cada evento para marcar o pagamento.');
sx.insertAdjacentHTML('beforeend','<div class="kpis fkpis" id="fc-kpis"></div><div id="fc-apagar"></div><div class="sbar"><input type="search" id="fc-busca" placeholder="Buscar evento" aria-label="Buscar evento"><select id="fc-sem" aria-label="Semestre"><option value="">Todos os semestres</option></select><select id="fc-sit" aria-label="Situação"><option value="">Todas as situações</option><option value="o-sem">Sem orçamento</option><option value="o-prep">Orçamento a validar</option><option value="o-val">Orçamento validado</option><option value="passou">Gasto passou da verba</option></select><label class="check"><input type="checkbox" id="fc-pass"> Mostrar eventos passados</label><span class="note" id="fc-conta" aria-live="polite"></span></div><div class="tablewrap"><table id="fc-tab" class="tlist"></table></div><p class="msg" id="fc-ok" role="status"></p>');
$('fc-busca').addEventListener('input',function(){renderCustos();});
['fc-sem','fc-sit','fc-pass'].forEach(function(k){$(k).addEventListener('change',function(){renderCustos();});});
function difHtml(r,p){if(r==null||p==null||!+p)return '<span class="note">—</span>';var d=r-p,pc=Math.round(d/p*100);
  return '<span class="fdif '+(d>0.005?'mais':'menos')+'">'+(d>0.005?'+':d<-0.005?'−':'')+reais(Math.abs(d),0)+' <small>('+(pc>0?'+':'')+pc+'%)</small></span>';}
function renderAPagar(){var l=aPagar(),box=$('fc-apagar');if(!box)return;
  if(!l.length){box.innerHTML='';return;}
  var tot=arred(l.reduce(function(t,x){return t+(+x.g.valor||0);},0));
  box.innerHTML='<details class="fc-ap" open><summary><b>A pagar</b> <span class="note">'+l.length+(l.length===1?' gasto':' gastos')+' · '+reais(tot)+'</span></summary><ul class="pg-l">'+l.map(function(x){var pn=pagNome(x.s);
    return '<li data-fcopen="'+esc(x.e.id)+'" tabindex="0"><div><b>'+esc(x.g.desc||tipoNome(x.g.tipo))+' · '+reais(x.g.valor)+'</b><span class="tsub">'+esc([x.e.nome||'Evento',dataBR(x.g.data),x.g.porNome].filter(Boolean).join(' · '))+'</span></div><span class="chip '+pn[2]+'">'+pn[1]+'</span></li>';}).join('')+'</ul></details>';}
function renderCustos(){
  var hoje=hojeISO(),q=nrm($('fc-busca').value).trim(),fs=$('fc-sem').value,ft=$('fc-sit').value,ps=$('fc-pass').checked||!!fs;
  var sems={};events.forEach(function(e){var s=semestre(e.data);if(s)sems[s]=1;});
  var sel=$('fc-sem'),cur=sel.value;sel.innerHTML='<option value="">Todos os semestres</option>'+Object.keys(sems).sort().reverse().map(function(s){return '<option'+(s===cur?' selected':'')+'>'+s+'</option>';}).join('');
  var base=events.filter(function(e){return !/\[teste\]/i.test(e.nome||'')&&(!fs||semestre(e.data)===fs);});
  var prox=base.filter(function(e){return !e.data||e.data>=hoje;});
  var V=0,G=0,aval=0,ap=aPagar();base.forEach(function(e){var v=verbaDe(e.id),g=gastoDe(e);if(v!=null)V+=v;if(g!=null)G+=g;});prox.forEach(function(e){if(estadoOrc(e)!=='val')aval++;});
  var apT=arred(ap.reduce(function(t,x){return t+(+x.g.valor||0);},0));
  $('fc-kpis').innerHTML=[[reais(V,0),'verba liberada'+(fs?' em '+fs:''),''],[reais(G,0),'gasto lançado pela área de Eventos',''],[aval,aval===1?'próximo evento sem orçamento validado':'próximos eventos sem orçamento validado',aval?'kbad':''],[reais(apT,0),'a pagar ou reembolsar',ap.length?'kbad':'']]
    .map(function(k){return '<div class="kpi '+k[2]+'"><div class="v num">'+k[0]+'</div><div class="l">'+k[1]+'</div></div>';}).join('');
  renderAPagar();
  if(!events.length){$('fc-tab').innerHTML='<tbody><tr><td class="empty">Nenhum evento na base ainda.</td></tr></tbody>';$('fc-conta').textContent='';return;}
  var l=base.filter(function(e){if(!ps&&e.data&&e.data<hoje)return false;if(ft&&(ft.slice(0,2)==='o-'?'o-'+estadoOrc(e):situacao(e))!==ft)return false;if(q&&nrm([e.nome,e.tipo,e.convidado].join(' ')).indexOf(q)<0)return false;return true;})
    .sort(function(a,b){return ps?((a.data||'')<(b.data||'')?1:-1):((a.data||'9')<(b.data||'9')?-1:1);});
  $('fc-conta').textContent=l.length+(l.length===1?' evento':' eventos');
  var h='<thead><tr><th>Data</th><th>Evento</th><th class="r">Previsto</th><th class="r">Verba liberada</th><th class="r">Gasto</th><th>Orçamento</th></tr></thead><tbody>';
  if(!l.length)h+='<tr><td colspan="6" class="empty">'+(ps?'Nenhum evento com esses filtros.':'Nenhum evento pela frente. Marque “Mostrar eventos passados” para ver os anteriores.')+'</td></tr>';
  l.forEach(function(e){var v=verbaDe(e.id),g=gastoDe(e),s=situacao(e),o=EORC[estadoOrc(e)];
    h+='<tr data-fcopen="'+esc(e.id)+'" tabindex="0"><td class="num"><b>'+(e.data?dataBR(e.data):'—')+'</b></td><td><span class="tn">'+esc(e.nome||'Sem nome')+'</span><span class="tsub">'+esc([e.tipo,e.sala].filter(Boolean).join(' · '))+'</span></td>'+
      '<td class="r num">'+(e.custoPrev!=null?reais(e.custoPrev,0):'<span class="note">sem previsão</span>')+'</td>'+
      '<td class="r num">'+(v!=null?'<b>'+reais(v,0)+'</b>':'<span class="note">—</span>')+'</td>'+
      '<td class="r num">'+(g!=null?reais(g,0):'<span class="note">—</span>')+(s==='passou'?'<span class="tsub fdif mais">passou da verba</span>':'')+'</td><td><span class="chip '+o[1]+'">'+o[0]+'</span></td></tr>';});
  $('fc-tab').innerHTML=h+'</tbody>';
}
function salvarVerba(id,txt,obs,msgEl){var e=events.filter(function(x){return x.id===id;})[0];if(!e||!db)return Promise.resolve();
  var antes=fin.verbas[id]||{},val=txt===''?null:num(txt);
  if(txt!==''&&(val==null||val<0)){if(msgEl)msgEl.textContent='Valor inválido: use só números, como 1.200,50.';return Promise.resolve();}
  if(val!=null)val=arred(val);
  var mudouValor=(antes.valor==null?null:+antes.valor)!==val,mudouObs=obs!=null&&obs!==(antes.obs||'');
  if(!mudouValor&&!mudouObs)return Promise.resolve();
  var agora=new Date().toISOString(),quem=String(window.__meuNome||'').slice(0,80);
  var d={valor:val,nome:e.nome||'',em:agora,porNome:quem,obs:obs!=null?obs:(antes.obs||''),historico:(antes.historico||[]).concat(mudouValor?[{valor:val,em:agora,porNome:quem}]:[])};
  if(msgEl)msgEl.textContent='Salvando…';
  return db.doc('fin_verbas/'+id).set(d).then(function(){if(msgEl)msgEl.textContent=val==null?'Verba retirada.':'Verba de '+reais(val)+' salva para '+(e.nome||'o evento')+'.';})
    .catch(function(){if(msgEl)msgEl.textContent='Não foi possível salvar a verba.';});}

/* linha do tempo de um evento: planejamento, verba, gastos, notas e o dia do evento */
function timeline(e){var it=[],acum=0;
  if(e.criadoEm)it.push({d:e.criadoEm,k:'plan',t:'Evento planejado',s:e.custoPrev!=null?'custo previsto de '+reais(e.custoPrev):''});
  var vb=fin.verbas[e.id];(vb&&vb.historico||[]).forEach(function(h,i,arr){var ant=i?arr[i-1].valor:null;
    it.push({d:h.em,k:'verba',t:h.valor==null?'Verba retirada':ant==null?'Verba liberada: '+reais(h.valor):'Verba ajustada para '+reais(h.valor),s:(ant!=null&&h.valor!=null?'antes '+reais(ant):'')+(h.porNome?(ant!=null&&h.valor!=null?' · ':'')+'por '+h.porNome:'')});});
  gastosDe(e).forEach(function(g){it.push({d:g.data,k:'gasto',g:g});});
  nfs(e.id).forEach(function(n){var f=dFontes(n),u=dPrincipal(n.tipo,f.link,f.arquivo);it.push({d:n.criadoEm||'',k:'nf',t:n.tipo==='Comprovante'?'Comprovante anexado':'Nota fiscal anexada',s:n.nome,u:u});});
  if(e.data)it.push({d:e.data+'T23:59',k:'dia',t:e.data<hojeISO()?'Dia do evento':'Dia do evento (ainda vai acontecer)',s:e.status==='realizado'&&e.presentes?e.presentes+' presentes':''});
  it=it.filter(function(x){return x.d;}).sort(function(a,b){return String(a.d)<String(b.d)?-1:String(a.d)>String(b.d)?1:0;});
  if(!it.length)return '<p class="note">Nada registrado ainda.</p>';
  var v=verbaDe(e.id);
  return '<ol class="tl">'+it.map(function(x){
    if(x.k==='gasto'){acum=arred(acum+(+x.g.valor||0));var loc=x.g.local?fin.coffee.filter(function(c){return c.id===x.g.local;})[0]:null;
      return '<li class="tl-gasto'+(v!=null&&acum>v+0.005?' tl-passou':'')+'"><span class="tl-d">'+dataBR(x.d)+'</span><div><b>'+esc(x.g.desc||tipoNome(x.g.tipo))+' · '+reais(x.g.valor)+'</b><span class="tsub">'+esc(tipoNome(x.g.tipo)+(loc?' · '+loc.nome:'')+(x.g.porNome?' · lançado por '+x.g.porNome:''))+'</span><span class="tl-ac">acumulado '+reais(acum)+(v!=null?' de '+reais(v)+' liberados':'')+'</span></div></li>';}
    return '<li class="tl-'+x.k+'"><span class="tl-d">'+dataBR(x.d)+'</span><div><b>'+esc(x.t)+'</b>'+(x.s?'<span class="tsub">'+esc(x.s)+'</span>':'')+(x.u?'<a href="'+esc(x.u)+'" target="_blank" rel="noopener" class="tl-a">Abrir nota ↗</a>':'')+'</div></li>';}).join('')+'</ol>';}
var vbAberto=null;
function montarVerba(id){var e=events.filter(function(x){return x.id===id;})[0];if(!e)return null;
  var ed=fpode('editar'),vb=fin.verbas[id]||{},pi=e.custoPrevItens;
  var prev=pi?'<table class="fc-prev"><tbody>'+[['Coffee',pi.coffee,pi.porcoes?pi.porcoes+' porções':''],['Material impresso',pi.material,''],['Sala',pi.sala,''],['Outros',pi.outros,'']].filter(function(r){return +r[1];}).map(function(r){return '<tr><td>'+r[0]+(r[2]?' <span class="note">'+r[2]+'</span>':'')+'</td><td class="r num">'+reais(r[1])+'</td></tr>';}).join('')+'<tr class="tot"><td>Total previsto</td><td class="r num">'+reais(e.custoPrev)+'</td></tr></tbody></table>':
    (e.custoPrev!=null?'<p class="fin-ro"><span>Total previsto</span><b>'+reais(e.custoPrev)+'</b></p>':'<p class="note" style="margin:0">Este evento não foi planejado no app, então não tem previsão.</p>');
  var corpo=blk('',resumoGasto(e))+blk('Orçamento',orcBlk(e))+blk('Pagamento dos gastos',pagBlk(e))+blk('Previsto no Planejar',prev)+blk('Linha do tempo dos gastos',timeline(e));
  var o=EORC[estadoOrc(e)],sub=(e.data?D(e.data).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}):'sem data')+(e.sala?' · '+esc(e.sala):'')+' <span class="chip '+o[1]+'">'+o[0]+'</span>';
  return {titulo:e.nome||'Evento',sub:sub,corpo:corpo,rodape:rodOrc(e)};}
function abrirVerba(id){vbAberto=id;
  painelAbrir({sec:'view-fin-custos',chave:id,montar:function(){return montarVerba(id);},aoFechar:function(){vbAberto=null;},depois:function(dr){
    dr._orcId=id;if(!dr._orcLig){dr._orcLig=1;ligarOrc(dr);ligarPag(dr);}}});}
/* abre o orçamento de um evento (Pendências e o link do e-mail "Sua vez" do robô: #orcamento=ID) */
window.__abrirOrc=function(id){if(window.__irArea)window.__irArea('Financeiro','fin-custos');setTimeout(function(){abrirVerba(id);},60);};
(function(){var m=/^#orcamento=(.+)$/.exec(location.hash||'');if(!m)return;var id=decodeURIComponent(m[1]),n=0;
  (function tenta(){var P=window.__perm;if(P&&P.carregado()&&events.some(function(x){return x.id===id;})){if(P.podeEm('Financeiro').ver)window.__abrirOrc(id);return;}if(++n<60)setTimeout(tenta,500);})();})();
function cliqueFc(ev){var tr=ev.target.closest('[data-fcopen]');if(tr&&(ev.type==='click'||ev.key==='Enter'||ev.key===' ')){if(ev.type==='keydown')ev.preventDefault();abrirVerba(tr.dataset.fcopen);}}
$('fc-tab').addEventListener('click',cliqueFc);$('fc-tab').addEventListener('keydown',cliqueFc);
$('fc-apagar').addEventListener('click',cliqueFc);$('fc-apagar').addEventListener('keydown',cliqueFc);
function atualizarTudo(){adiar('view-fin-custos',renderCustos);if(vbAberto)painelAtualizar('view-fin-custos');renderAna();renderCoffee();}
finAplicar=function(){atualizarTudo();};
finDocs=function(){atualizarTudo();painelAtualizar('view-base');};
renderCustos();

/* ---------------- Analytics do Financeiro ---------------- */
var sa=secao('fin-ana','Analytics','Verba, previsto e gasto dos eventos (fora os [teste]). Os gastos vêm do que a área de Eventos lança em cada evento. Os gráficos são uma primeira proposta: dá para trocar com a área.');
sa.insertAdjacentHTML('beforeend','<div class="afilt"><label class="sr" for="fa-sem">Semestre</label><select id="fa-sem"><option value="">Todos os semestres</option></select></div><div class="akpis" id="fa-kpis"></div>'+
  '<div class="acharts">'+
  '<article class="acard full"><h3>Previsto, verba e gasto por evento</h3><p class="sub">O que o Planejar previu, quanto o Financeiro liberou e quanto foi gasto, em ordem de data.</p><div id="fa-c1"></div></article>'+
  '<article class="acard"><h3>Para onde vai o dinheiro</h3><p class="sub">Gasto lançado em cada semestre, por tipo de gasto.</p><div id="fa-c2"></div></article>'+
  '<article class="acard"><h3>Custo por presente</h3><p class="sub">Por evento realizado, com a meta e o limite da aba Parâmetros.</p><div id="fa-c3"></div></article>'+
  '<article class="acard"><h3>Gasto por local de coffee</h3><p class="sub">Soma do coffee lançado em cada fornecedor.</p><div id="fa-c4"></div></article>'+
  '<article class="acard"><h3>Gasto mês a mês</h3><p class="sub">Soma dos gastos pela data de cada gasto.</p><div id="fa-c5"></div></article>'+
  '</div>');
$('fa-sem').addEventListener('change',function(){renderAna();});
var CATS=[['coffee','Coffee','var(--f-cof)'],['material','Material','var(--f-mat)'],['sala','Sala','var(--f-sala)'],['outro','Outros','var(--f-ad)']];
function anaVisivel(){var v=$('view-fin-ana');return v&&!v.hidden;}
function rs(v){return reais(v,0);}
function renderAna(){
  var G=window.__graf;if(!G||!anaVisivel())return;
  var hoje=hojeISO(),fs=$('fa-sem').value;
  var todos=events.filter(function(e){return !/\[teste\]/i.test(e.nome||'');});
  var sems={};todos.forEach(function(e){var s=semestre(e.data);if(s)sems[s]=1;});
  var sel=$('fa-sem'),cur=sel.value;sel.innerHTML='<option value="">Todos os semestres</option>'+Object.keys(sems).sort().reverse().map(function(s){return '<option'+(s===cur?' selected':'')+'>'+s+'</option>';}).join('');
  var doSem=todos.filter(function(e){return !fs||semestre(e.data)===fs;}).sort(function(a,b){return (a.data||'')<(b.data||'')?-1:1;});
  var comG=doSem.filter(function(e){return gastoDe(e)!=null;});
  var V=0,Gt=0,GP=0,PV=0,CP=0,PR=0,COF=0,DET=0;
  doSem.forEach(function(e){var v=verbaDe(e.id),g=gastoDe(e);if(v!=null)V+=v;if(g!=null){Gt+=g;if(e.custoPrev!=null&&e.data&&e.data<=hoje){GP+=g;PV+=+e.custoPrev;}if(+e.presentes){CP+=g;PR+=+e.presentes;}}
    var l=gastosDe(e);if(l.length){COF+=somaG(l,function(x){return x.tipo==='coffee';});DET+=somaG(l);}});
  var pc=PV?Math.round((GP-PV)/PV*100):null,meta=+P.metaPresente,lim=+P.limiteAmarelo;
  $('fa-kpis').innerHTML=[[rs(V),'verba liberada',''],[rs(Gt),'gasto lançado ('+comG.length+(comG.length===1?' evento':' eventos')+')',''],[pc==null?'—':(pc>0?'+':'')+pc+'%','gasto acima ou abaixo do previsto',pc>0?'kbad':''],
    [PR?reais(CP/PR):'—','custo médio por presente'+(meta?' (meta '+rs(meta)+')':''),PR&&meta&&CP/PR>meta?'kbad':''],[DET?Math.round(COF/DET*100)+'%':'—','do gasto vai para o coffee','']]
    .map(function(k){return '<div class="kpi '+k[2]+'"><div class="v num">'+k[0]+'</div><div class="l">'+k[1]+'</div></div>';}).join('');
  /* 1. previsto, verba e gasto (três pontos por evento) */
  (function(){var el=$('fa-c1'),Rr=doSem.filter(function(e){return e.custoPrev!=null&&(gastoDe(e)!=null||verbaDe(e.id)!=null);});
    if(!Rr.length)return G.vazio(el,'Nenhum evento com previsão e com verba ou gasto neste filtro.');
    var W=G.largura(el),lw=Math.min(190,Math.max(90,W*0.28)),vw=W<480?70:200,rh=30,mt=4,H=mt+Rr.length*rh+4,pw=W-lw-vw;
    var mx=G.teto(Math.max.apply(null,Rr.map(function(e){return Math.max(+e.custoPrev,verbaDe(e.id)||0,gastoDe(e)||0);}))||1),x=function(v){return lw+v/mx*pw;};
    var s='<svg class="achart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Previsto, verba e gasto por evento">';
    Rr.forEach(function(e,i){var y0=mt+i*rh,cy=y0+rh/2,p=+e.custoPrev,v=verbaDe(e.id),g=gastoDe(e),pts=[p,v,g].filter(function(z){return z!=null;});
      var tip='<b>'+esc(e.nome||'Evento')+'</b>'+esc(G.dm(e.data))+'<br>Previsto: '+reais(p)+'<br>Verba: '+(v!=null?reais(v):'—')+'<br>Gasto: '+(g!=null?reais(g):'—');
      s+='<g class="m" data-tip="'+esc(tip)+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/>';
      s+='<text x="'+(lw-8)+'" y="'+(cy+4)+'" text-anchor="end">'+esc(G.curto(e.nome,Math.floor(lw/6.6)))+'</text>';
      s+='<line x1="'+x(Math.min.apply(null,pts))+'" x2="'+x(Math.max.apply(null,pts))+'" y1="'+cy+'" y2="'+cy+'" stroke="'+(v!=null&&g!=null&&g>v?'var(--red)':'var(--axis)')+'" stroke-width="2"/>';
      s+='<circle cx="'+x(p)+'" cy="'+cy+'" r="5" fill="var(--s-ins)" stroke="var(--surface)" stroke-width="2"/>';
      if(v!=null)s+='<rect x="'+(x(v)-5)+'" y="'+(cy-5)+'" width="10" height="10" fill="var(--f-sala)" stroke="var(--surface)" stroke-width="2" transform="rotate(45 '+x(v)+' '+cy+')"/>';
      if(g!=null)s+='<circle cx="'+x(g)+'" cy="'+cy+'" r="5" fill="var(--s-pres)" stroke="var(--surface)" stroke-width="2"/>';
      s+='<text class="v" x="'+(lw+pw+10)+'" y="'+(cy+4)+'">'+(W<480?(g!=null?rs(g):'—'):rs(p)+' · '+(v!=null?rs(v):'—')+' · '+(g!=null?rs(g):'—'))+'</text><rect class="hit" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/></g>';});
    el.innerHTML=G.legenda([['Previsto','var(--s-ins)'],['Verba liberada','var(--f-sala)'],['Gasto','var(--s-pres)']])+s+'</svg>'+G.tabela(['Evento','Data','Previsto','Verba','Gasto'],Rr.map(function(e){var v=verbaDe(e.id),g=gastoDe(e);return [e.nome||'',G.dm(e.data),reais(+e.custoPrev),v!=null?reais(v):'—',g!=null?reais(g):'—'];}));})();
  /* 2. composição por semestre */
  (function(){var el=$('fa-c2'),S={};
    doSem.forEach(function(e){var l=gastosDe(e);if(!l.length)return;var k=semestre(e.data)||'sem data';S[k]=S[k]||{coffee:0,material:0,sala:0,outro:0};l.forEach(function(g){var t=S[k][g.tipo]!=null?g.tipo:'outro';S[k][t]+=+g.valor||0;});});
    var ks=Object.keys(S).sort();if(!ks.length)return G.vazio(el,'Nenhum gasto lançado em detalhe neste filtro. Eventos antigos com só o total não entram aqui.');
    var tot=function(k){return S[k].coffee+S[k].material+S[k].sala+S[k].outro;};
    var W=G.largura(el),lw=64,vw=72,rh=34,bh=18,H=ks.length*rh+4,pw=W-lw-vw,mx=G.teto(Math.max.apply(null,ks.map(tot))||1);
    var s='<svg class="achart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Gasto por tipo em cada semestre">';
    ks.forEach(function(k,i){var y0=i*rh,by=y0+(rh-bh)/2,xx=lw,t=tot(k);
      var tip='<b>'+esc(k)+'</b>'+CATS.map(function(c){return c[1]+': '+reais(S[k][c[0]])+(t?' ('+Math.round(S[k][c[0]]/t*100)+'%)':'');}).join('<br>');
      s+='<g class="m" data-tip="'+esc(tip)+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/><text x="'+(lw-8)+'" y="'+(y0+rh/2+4)+'" text-anchor="end">'+esc(k)+'</text>';
      CATS.forEach(function(c){var w=S[k][c[0]]/mx*pw;if(w>0){s+='<rect x="'+xx+'" y="'+by+'" width="'+Math.max(0,w-1)+'" height="'+bh+'" fill="'+c[2]+'"/>';xx+=w;}});
      s+='<text class="v" x="'+(xx+6)+'" y="'+(y0+rh/2+4)+'">'+rs(t)+'</text><rect class="hit" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/></g>';});
    el.innerHTML=G.legenda(CATS.map(function(c){return [c[1],c[2]];}))+s+'</svg>'+G.tabela(['Semestre'].concat(CATS.map(function(c){return c[1];})).concat(['Total']),ks.map(function(k){return [k].concat(CATS.map(function(c){return reais(S[k][c[0]]);})).concat([reais(tot(k))]);}));})();
  /* 3. custo por presente */
  G.barrasH($('fa-c3'),comG.filter(function(e){return +e.presentes;}).map(function(e){var g=gastoDe(e),v=g/e.presentes,st=meta&&v<=meta?'dentro da meta':lim&&v<=lim?'acima da meta':'acima do limite';
      return {l:e.nome||'Evento',v:v,t:rs(v),cor:meta&&v>meta?(lim&&v<=lim?'var(--s-ins)':'var(--red)'):'var(--s-pres)',tip:'<b>'+esc(e.nome||'Evento')+'</b>'+esc(G.dm(e.data))+'<br>Gasto: '+reais(g)+'<br>Presentes: '+e.presentes+'<br>'+reais(v)+' por presente · '+st,linha:[e.nome||'',G.dm(e.data),reais(g),e.presentes,reais(v),st]};}),
    {titulo:'Custo por presente',vazio:'Sem eventos com gasto e presentes registrados neste filtro.',refs:[meta?{v:meta,t:'meta '+rs(meta)}:null,lim?{v:lim,t:'limite '+rs(lim)}:null].filter(Boolean),cab:['Evento','Data','Gasto','Presentes','Por presente','Situação']});
  /* 4. por local de coffee */
  (function(){var M={},N={};doSem.forEach(function(e){var vis={};gastosDe(e).forEach(function(g){if(g.tipo!=='coffee')return;var k=g.local||'';M[k]=(M[k]||0)+(+g.valor||0);if(!vis[k]){vis[k]=1;N[k]=(N[k]||0)+1;}});});
    G.barrasH($('fa-c4'),Object.keys(M).map(function(k){var loc=fin.coffee.filter(function(x){return x.id===k;})[0],nome=loc?loc.nome:k?'local excluído':'Sem local informado';
      return {l:nome,v:M[k],t:rs(M[k]),tip:'<b>'+esc(nome)+'</b>'+reais(M[k])+' em '+N[k]+(N[k]===1?' evento':' eventos')+'<br>média de '+reais(M[k]/N[k])+' por evento',linha:[nome,N[k],reais(M[k]),reais(M[k]/N[k])]};}).sort(function(a,b){return b.v-a.v;}),
      {titulo:'Gasto por local de coffee',vazio:'Nenhum coffee lançado neste filtro.',cab:['Local','Eventos','Total','Média por evento']});})();
  /* 5. mês a mês (pela data de cada gasto) */
  (function(){var el=$('fa-c5'),M={};doSem.forEach(function(e){var l=gastosDe(e);if(l.length)l.forEach(function(g){if(!g.data)return;var k=g.data.slice(0,7);M[k]=(M[k]||0)+(+g.valor||0);});else if(gastoDe(e)!=null&&e.data){var k=e.data.slice(0,7);M[k]=(M[k]||0)+gastoDe(e);}});var ks=Object.keys(M).sort();
    if(!ks.length)return G.vazio(el,'Nenhum gasto lançado neste filtro.');
    var NM=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],nome=function(k){return NM[+k.slice(5,7)-1]+'/'+k.slice(2,4);};
    var W=G.largura(el),H=200,ml=48,mr=8,mt=12,mb=24,pw=W-ml-mr,ph=H-mt-mb,mx=G.teto(Math.max.apply(null,ks.map(function(k){return M[k];}))||1),band=pw/ks.length,bw=Math.max(6,Math.min(36,band*0.6)),y=function(v){return mt+ph-v/mx*ph;};
    var s='<svg class="achart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Gasto por mês">';
    for(var q=0;q<=4;q++){var v=mx*q/4,yy=y(v);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--grid)" stroke-width="1"/><text x="'+(ml-6)+'" y="'+(yy+4)+'" text-anchor="end">'+(v>=1000?Math.round(v/100)/10+' mil':Math.round(v))+'</text>';}
    ks.forEach(function(k,i){var cx=ml+i*band+band/2;s+='<g class="m" data-tip="'+esc('<b>'+nome(k)+'</b>'+reais(M[k]))+'"><rect class="hl" x="'+(ml+i*band)+'" y="'+mt+'" width="'+band+'" height="'+ph+'"/><path d="'+G.barraV(cx-bw/2,y(M[k]),bw,mt+ph-y(M[k]))+'" fill="var(--s-pres)"/><rect class="hit" x="'+(ml+i*band)+'" y="'+mt+'" width="'+band+'" height="'+(ph+mb)+'"/></g><text x="'+cx+'" y="'+(mt+ph+16)+'" text-anchor="middle">'+nome(k)+'</text>';});
    el.innerHTML=s+'<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(mt+ph)+'" y2="'+(mt+ph)+'" stroke="var(--axis)"/></svg>'+G.tabela(['Mês','Gasto'],ks.map(function(k){return [nome(k),reais(M[k])];}));})();
}
document.addEventListener('tela',function(e){if(e.detail==='fin-ana')setTimeout(renderAna);});
var rtA;window.addEventListener('resize',function(){clearTimeout(rtA);rtA=setTimeout(renderAna,150);});

/* ---------------- dados ---------------- */
var ligado=false;
finLigar=function(){if(ligado||!db)return;ligado=true;
  db.collection('fin_coffee').onSnapshot(function(s){fin.coffee=s.docs.map(function(x){var o=Object.assign({},x.data());o.id=x.id;return o;});atualizarTudo();},function(){});
  db.collection('fin_orcamentos').onSnapshot(function(s){var m={};s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;m[x.id]=o;});fin.orc=m;atualizarTudo();painelAtualizar('view-base');},function(){});
  db.collection('fin_pagamentos').onSnapshot(function(s){var m={};s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;m[x.id]=o;});fin.pag=m;atualizarTudo();},function(){});
  db.collection('fin_verbas').onSnapshot(function(s){var m={};s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;m[x.id]=o;});fin.verbas=m;atualizarTudo();painelAtualizar('view-base');},function(){});
};
document.addEventListener('permissoes',function(){document.body.classList.toggle('fin-editar',fpode('editar'));renderCoffee();renderCustos();});
})();
