/* ============================== FINANCEIRO ==============================
   Roda dentro do script principal (mesmo escopo de events, docs, db, P, esc, fmt, D, painelAbrir...).
   Coleções do Financeiro (as regras dão a edição a quem tem cargo no Financeiro):
   - fin_coffee/{id}: contatos de coffee {nome, contato, telefone, endereco, obs, itens:[{item, preco, unidade}]}
   - fin_custos/{eventoId}: gasto real de cada evento {coffee, coffeeLocal, material, sala, adicionais:[{desc, valor}], obs, total, lancadoEm, lancadoPor} */
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
var fin={coffee:[],custos:{}};window.__fin=fin;

/* ---------------- Contatos de coffee ---------------- */
var UNID=['por pessoa','por unidade','por kit','por cento','por litro','por kg','valor fixo'];
var sc=secao('fin-coffee','Contatos de coffee','Fornecedores de coffee e lanches, com contato e os itens e valores de cada um. O local escolhido no gasto de um evento aparece em “Usado em”.',
  '<button class="btn fin-ed" type="button" id="cf-novo">+ Novo local</button>');
sc.insertAdjacentHTML('beforeend','<div class="sbar"><input type="search" id="cf-busca" placeholder="Buscar local, contato, endereço ou item" aria-label="Buscar contato de coffee"><span class="note" id="cf-conta" aria-live="polite"></span></div><div class="tablewrap"><table id="cf-tab" class="tlist"></table></div>');
$('cf-busca').addEventListener('input',function(){renderCoffee();});
function usos(id){var n=0;Object.keys(fin.custos).forEach(function(k){if(fin.custos[k].coffeeLocal===id)n++;});return n;}
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

/* ---------------- Custos por evento ---------------- */
function semestre(dt){var p=String(dt||'').split('-');return p.length<2?'':p[0]+'.'+(+p[1]<=7?1:2);}
function soma(a){return (a||[]).reduce(function(t,x){return t+(+x.valor||0);},0);}
function arred(v){return Math.round(v*100)/100;}
function totalReal(c){return arred((+c.coffee||0)+(+c.material||0)+(+c.sala||0)+soma(c.adicionais));}
/* o gasto lançado pelo Financeiro passa a ser o custo do evento na Base, no Analytics e no Planejar */
function aplicar(lista){(lista||[]).forEach(function(e){
  if(!e._orig)e._orig={custo:e.custo,custoBasico:e.custoBasico,custoNaoPrev:e.custoNaoPrev};
  var c=fin.custos[e.id];
  if(c&&c.total!=null){e.custo=c.total;e.custoNaoPrev=arred(soma(c.adicionais));e.custoBasico=arred(c.total-e.custoNaoPrev);e.custoFin=true;}
  else{e.custo=e._orig.custo;e.custoBasico=e._orig.custoBasico;e.custoNaoPrev=e._orig.custoNaoPrev;e.custoFin=false;}});}
window.__finAplicar=aplicar;
finAplicar=function(){aplicar(events);adiar('view-fin-custos',renderCustos);};
function realDe(e){var c=fin.custos[e.id];if(c&&c.total!=null)return c.total;var o=e._orig?e._orig.custo:e.custo;return o!=null&&o!==''?+o:null;}
function situacao(e,hoje){var c=fin.custos[e.id];if(c&&c.total!=null)return 'lancado';var o=e._orig?e._orig.custo:e.custo;
  if(!e.data||e.data>hoje)return 'futuro';return o!=null&&o!==''?'base':'lancar';}
var SIT={lancado:['Lançado','ok'],base:['Só o total','neutral'],lancar:['A lançar','warn'],futuro:['Ainda vai acontecer','neutral']};
function nfs(id){return docs.filter(function(d){return d.tipo==='Nota fiscal'&&(d.eventos||[]).indexOf(id)>=0;});}

var sx=secao('fin-custos','Custos por evento','O previsto de cada evento (calculado no Planejar) e o gasto real, lançado aqui pelo Financeiro com as notas fiscais. O gasto lançado aqui é o que vale na Base e no Analytics.');
sx.insertAdjacentHTML('beforeend','<div class="kpis fkpis" id="fc-kpis"></div><div class="sbar"><input type="search" id="fc-busca" placeholder="Buscar evento" aria-label="Buscar evento"><select id="fc-sem" aria-label="Semestre"><option value="">Todos os semestres</option></select><select id="fc-sit" aria-label="Situação"><option value="">Todas as situações</option><option value="lancar">A lançar</option><option value="lancado">Lançados</option><option value="base">Só o total</option><option value="futuro">Ainda vão acontecer</option></select><span class="note" id="fc-conta" aria-live="polite"></span></div><div class="tablewrap"><table id="fc-tab" class="tlist"></table></div>');
['fc-busca'].forEach(function(k){$(k).addEventListener('input',function(){renderCustos();});});
['fc-sem','fc-sit'].forEach(function(k){$(k).addEventListener('change',function(){renderCustos();});});
function difHtml(r,p){if(r==null||p==null||!+p)return '<span class="note">—</span>';var d=r-p,pc=Math.round(d/p*100);
  return '<span class="fdif '+(d>0.005?'mais':'menos')+'">'+(d>0.005?'+':d<-0.005?'−':'')+reais(Math.abs(d),0)+' <small>('+(pc>0?'+':'')+pc+'%)</small></span>';}
function renderCustos(){
  var hoje=iso(new Date()),q=nrm($('fc-busca').value).trim(),fs=$('fc-sem').value,ft=$('fc-sit').value;
  var sems={};events.forEach(function(e){var s=semestre(e.data);if(s)sems[s]=1;});
  var sel=$('fc-sem'),cur=sel.value;sel.innerHTML='<option value="">Todos os semestres</option>'+Object.keys(sems).sort().reverse().map(function(s){return '<option'+(s===cur?' selected':'')+'>'+s+'</option>';}).join('');
  var doSem=events.filter(function(e){return !/\[teste\]/i.test(e.nome||'')&&(!fs||semestre(e.data)===fs);});
  var R=0,Pv=0,lanc=0,falta=0;doSem.forEach(function(e){var s=situacao(e,hoje),r=realDe(e);if(s==='lancar')falta++;if(r!=null&&(s==='lancado'||s==='base')){R+=r;lanc++;if(e.custoPrev!=null)Pv+=+e.custoPrev;}});
  var pc=Pv?Math.round((R-Pv)/Pv*100):null;
  $('fc-kpis').innerHTML=[[reais(R,0),'gasto real'+(fs?' em '+fs:'')+' ('+lanc+(lanc===1?' evento':' eventos')+')',''],[pc==null?'—':(pc>0?'+':'')+pc+'%','acima ou abaixo do previsto, nos mesmos eventos',pc>0?'kbad':''],[falta,falta===1?'evento já realizado sem gasto lançado':'eventos já realizados sem gasto lançado',falta?'kbad':'']]
    .map(function(k){return '<div class="kpi '+k[2]+'"><div class="v num">'+k[0]+'</div><div class="l">'+k[1]+'</div></div>';}).join('');
  if(!events.length){$('fc-tab').innerHTML='<tbody><tr><td class="empty">Nenhum evento na base ainda.</td></tr></tbody>';$('fc-conta').textContent='';return;}
  var l=doSem.filter(function(e){if(ft&&situacao(e,hoje)!==ft)return false;if(q&&nrm([e.nome,e.tipo,e.convidado].join(' ')).indexOf(q)<0)return false;return true;})
    .sort(function(a,b){var sa=situacao(a,hoje)==='lancar'?0:1,sb=situacao(b,hoje)==='lancar'?0:1;if(sa!==sb)return sa-sb;return (a.data||'')<(b.data||'')?1:-1;});
  $('fc-conta').textContent=l.length+(l.length===1?' evento':' eventos');
  var h='<thead><tr><th>Data</th><th>Evento</th><th class="r">Previsto</th><th class="r">Real</th><th class="r">Diferença</th><th>Notas</th><th>Situação</th></tr></thead><tbody>';
  if(!l.length)h+='<tr><td colspan="7" class="empty">Nenhum evento com esses filtros.</td></tr>';
  l.forEach(function(e){var s=situacao(e,hoje),r=realDe(e),n=nfs(e.id).length;
    h+='<tr data-fcopen="'+esc(e.id)+'" tabindex="0"><td class="num"><b>'+(e.data?fmt(D(e.data))+'/'+e.data.slice(2,4):'—')+'</b></td><td><span class="tn">'+esc(e.nome||'Sem nome')+'</span><span class="tsub">'+esc([e.tipo,e.sala].filter(Boolean).join(' · '))+'</span></td>'+
      '<td class="r num">'+(e.custoPrev!=null?reais(e.custoPrev,0):'<span class="note">sem previsão</span>')+'</td><td class="r num">'+(r!=null?'<b>'+reais(r,0)+'</b>':'<span class="note">—</span>')+'</td>'+
      '<td class="r num">'+difHtml(r,e.custoPrev)+'</td><td>'+(n?'<span class="ttag">'+n+(n===1?' nota':' notas')+'</span>':'<span class="note">—</span>')+'</td><td><span class="chip '+SIT[s][1]+'">'+SIT[s][0]+'</span></td></tr>';});
  $('fc-tab').innerHTML=h+'</tbody>';
}
function linhaAd(a,ed){a=a||{};return '<tr class="fc-ad"><td><input data-k="desc" aria-label="Descrição do gasto" placeholder="ex.: Transporte do convidado" value="'+esc(a.desc||'')+'"></td><td><input data-k="valor" aria-label="Valor (R$)" inputmode="decimal" placeholder="0,00" value="'+esc(nv(a.valor))+'"></td><td><button type="button" class="cf-x" data-fcrm aria-label="Tirar gasto">&times;</button></td></tr>';}
function nfHtml(id,ed){var l=nfs(id);
  var h=l.length?'<ul class="fc-nfs">'+l.map(function(d){var f=dFontes(d),u=dPrincipal(d.tipo,f.link,f.arquivo);return '<li><span>'+esc(d.nome)+'</span>'+(u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">Abrir ↗</a>':'')+'</li>';}).join('')+'</ul>':'<p class="note" style="margin:0 0 8px">Nenhuma nota fiscal anexada.</p>';
  return h;}
function montarCusto(id){var e=events.filter(function(x){return x.id===id;})[0];if(!e)return null;
  var c=fin.custos[id]||{},ed=fpode('editar'),pi=e.custoPrevItens,hoje=iso(new Date());
  var prev=pi?'<table class="fc-prev"><tbody>'+[['Coffee',pi.coffee,pi.porcoes?pi.porcoes+' porções':''],['Material impresso',pi.material,''],['Sala',pi.sala,''],['Outros',pi.outros,'']].filter(function(r){return +r[1];}).map(function(r){return '<tr><td>'+r[0]+(r[2]?' <span class="note">'+r[2]+'</span>':'')+'</td><td class="r num">'+reais(r[1])+'</td></tr>';}).join('')+'<tr class="tot"><td>Total previsto</td><td class="r num">'+reais(e.custoPrev)+'</td></tr></tbody></table>':
    (e.custoPrev!=null?'<p class="fin-ro"><span>Total previsto</span><b>'+reais(e.custoPrev)+'</b></p><p class="note" style="margin:0">Evento salvo antes da divisão por item: só o total ficou guardado.</p>':'<p class="note" style="margin:0">Este evento não foi planejado no app, então não tem previsão.</p>');
  var antigo=!fin.custos[id]&&e._orig&&e._orig.custo!=null?'<p class="note" style="margin:0 0 10px">Na Base estava registrado só o total: <b>'+reais(e._orig.custo)+'</b>. Ao lançar aqui, este passa a valer.</p>':'';
  var real;
  if(ed){var ops='<option value="">Escolha o local</option>'+fin.coffee.slice().sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'pt-BR');}).map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===c.coffeeLocal?' selected':'')+'>'+esc(x.nome)+'</option>';}).join('');
    real=antigo+'<div class="fin-grid">'+
      '<div class="field"><label for="fc-coffee">Coffee (R$)</label><input id="fc-coffee" inputmode="decimal" placeholder="0,00" value="'+esc(nv(c.coffee))+'"></div>'+
      '<div class="field"><label for="fc-local">Local do coffee</label><select id="fc-local">'+ops+'</select></div>'+
      '<div class="field"><label for="fc-mat">Material impresso (R$)</label><input id="fc-mat" inputmode="decimal" placeholder="0,00" value="'+esc(nv(c.material))+'"></div>'+
      '<div class="field"><label for="fc-sala">Sala (R$)</label><input id="fc-sala" inputmode="decimal" placeholder="0,00" value="'+esc(nv(c.sala))+'"></div></div>'+
      '<h5 class="fc-h5">Gastos adicionais</h5><table class="cf-itens fc-ads"><tbody id="fc-ads">'+(c.adicionais&&c.adicionais.length?c.adicionais:[{}]).map(function(a){return linhaAd(a,true);}).join('')+'</tbody></table>'+
      '<button type="button" class="btn small ghost" id="fc-add" style="margin-top:6px">+ Adicionar gasto</button>'+
      '<div class="field" style="margin-top:12px"><label for="fc-obs">Observações</label><textarea id="fc-obs" rows="2">'+esc(c.obs||'')+'</textarea></div>'+
      '<div class="fc-tot" id="fc-tot"></div>';}
  else{var loc=fin.coffee.filter(function(x){return x.id===c.coffeeLocal;})[0];
    real=c.total!=null?'<table class="fc-prev"><tbody>'+[['Coffee'+(loc?' <span class="note">'+esc(loc.nome)+'</span>':''),c.coffee],['Material impresso',c.material],['Sala',c.sala]].filter(function(r){return +r[1];}).map(function(r){return '<tr><td>'+r[0]+'</td><td class="r num">'+reais(r[1])+'</td></tr>';}).join('')+
      (c.adicionais||[]).map(function(a){return '<tr><td>'+esc(a.desc)+'</td><td class="r num">'+reais(a.valor)+'</td></tr>';}).join('')+'<tr class="tot"><td>Total real</td><td class="r num">'+reais(c.total)+'</td></tr></tbody></table>'+(c.obs?'<p class="note">'+esc(c.obs)+'</p>':''):
      (antigo||'<p class="note" style="margin:0">O Financeiro ainda não lançou o gasto deste evento.</p>');}
  var nf='<div id="fc-nfl">'+nfHtml(id)+'</div>'+(ed?'<div class="fc-nfadd"><input id="fc-nfnome" placeholder="Nome da nota (ex.: NF coffee Padaria)" aria-label="Nome da nota fiscal"><input id="fc-nfarq" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" aria-label="Arquivo da nota fiscal"><input id="fc-nflink" type="url" placeholder="ou cole um link (https://...)" aria-label="Link da nota fiscal"><button type="button" class="btn small" id="fc-nfbt">Anexar nota</button><span class="msg" id="fc-nfmsg" role="status"></span></div>':'')+
    '<button type="button" class="btn small ghost" id="fc-pasta" style="margin-top:10px">Abrir a pasta do evento em Documentos</button>';
  var corpo=blk('Previsto no Planejar',prev)+blk('Gasto real',real)+blk('Notas fiscais',nf);
  var rod=ed?'<div class="btns"><button type="button" class="btn" id="fc-salvar">Salvar gasto</button><span class="msg" id="fc-msg" role="status"></span></div>':'';
  var sub=(e.data?D(e.data).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}):'sem data')+(e.sala?' · '+esc(e.sala):'')+' <span class="chip '+SIT[situacao(e,hoje)][1]+'">'+SIT[situacao(e,hoje)][0]+'</span>';
  return {titulo:e.nome||'Evento',sub:sub,corpo:corpo,rodape:rod};}
function lerForm(dr){var g=function(k){var x=dr.querySelector('#'+k);return x?x.value.trim():'';},erro='';
  var d={coffee:num(g('fc-coffee')),coffeeLocal:g('fc-local')||null,material:num(g('fc-mat')),sala:num(g('fc-sala')),adicionais:[],obs:g('fc-obs')};
  ['fc-coffee','fc-mat','fc-sala'].forEach(function(k){var v=g(k);if(v&&(num(v)==null||num(v)<0))erro='Confira os valores: use só números, como 120,50.';});
  dr.querySelectorAll('#fc-ads tr').forEach(function(tr){var de=tr.querySelector('[data-k="desc"]').value.trim(),vv=tr.querySelector('[data-k="valor"]').value.trim();if(!de&&!vv)return;
    var n=num(vv);if(!de){erro='Descreva cada gasto adicional.';return;}if(vv===''||n==null||n<0){erro='Valor inválido em “'+de+'”.';return;}d.adicionais.push({desc:de,valor:n});});
  d.total=totalReal(d);return {d:d,erro:erro};}
function totalVivo(dr,e){var t=dr.querySelector('#fc-tot');if(!t)return;var r=lerForm(dr).d.total;
  t.innerHTML='<span>Total real</span><b>'+reais(r)+'</b>'+(e.custoPrev!=null?'<span class="note">previsto '+reais(e.custoPrev)+' · '+difHtml(r,e.custoPrev)+'</span>':'');}
var custoAberto=null;
function abrirCusto(id){var e=events.filter(function(x){return x.id===id;})[0];if(!e)return;custoAberto=id;
  painelAbrir({sec:'view-fin-custos',chave:id,montar:function(){return montarCusto(id);},foco:'#fc-coffee',aoFechar:function(){custoAberto=null;},depois:function(dr){
    totalVivo(dr,e);dr.addEventListener('input',function(ev){if(ev.target.closest('.fin-grid,#fc-ads'))totalVivo(dr,e);});
    var add=dr.querySelector('#fc-add');if(add)add.addEventListener('click',function(){var tb=dr.querySelector('#fc-ads');tb.insertAdjacentHTML('beforeend',linhaAd({},true));tb.lastElementChild.querySelector('input').focus();});
    var ads=dr.querySelector('#fc-ads');if(ads)ads.addEventListener('click',function(ev){var x=ev.target.closest('[data-fcrm]');if(!x)return;var tr=x.closest('tr');if(ads.children.length>1)tr.remove();else tr.querySelectorAll('input').forEach(function(i){i.value='';});totalVivo(dr,e);});
    var sv=dr.querySelector('#fc-salvar');if(sv)sv.addEventListener('click',function(){salvarCusto(id,dr);});
    var nb=dr.querySelector('#fc-nfbt');if(nb)nb.addEventListener('click',function(){anexarNota(id,dr);});
    dr.querySelector('#fc-pasta').addEventListener('click',function(){painelFechar();var b=document.querySelector('.side .sitem[data-alvo="docs"]');if(b)b.click();if(window.docsAbrirPasta)docsAbrirPasta(id);});
  }});}
function salvarCusto(id,dr){var msg=dr.querySelector('#fc-msg');if(!db){msg.textContent='Sem conexão com a base.';return;}
  var r=lerForm(dr);if(r.erro){msg.textContent=r.erro;return;}
  var d=r.d;d.lancadoEm=new Date().toISOString();
  msg.textContent='Salvando…';
  db.doc('fin_custos/'+id).set(d).then(function(){painelFechar();$('fin-custos-ok')&&($('fin-custos-ok').textContent='Gasto salvo.');}).catch(function(){msg.textContent='Não foi possível salvar.';});}
function anexarNota(id,dr){var msg=dr.querySelector('#fc-nfmsg');if(!db){msg.textContent='Sem conexão com a base.';return;}
  var nome=dr.querySelector('#fc-nfnome').value.trim(),file=dr.querySelector('#fc-nfarq').files[0],link=dr.querySelector('#fc-nflink').value.trim();
  if(!file&&!link){msg.textContent='Escolha o arquivo da nota ou cole um link.';return;}
  if(link&&!safeUrl(link)){msg.textContent='Use um link que comece com https://';return;}
  var e=events.filter(function(x){return x.id===id;})[0];
  var d={nome:nome||('Nota fiscal · '+(e&&e.nome||'evento')),tipo:'Nota fiscal',versao:'',resp:'',resumo:'',eventos:[id],area:'Financeiro',criadoEm:new Date().toISOString(),link:link,arquivo:''};
  function salvar(){d.url=dPrincipal(d.tipo,d.link,d.arquivo);db.collection('documentos').add(d).then(function(){msg.textContent='Nota anexada.';['fc-nfnome','fc-nflink','fc-nfarq'].forEach(function(k){dr.querySelector('#'+k).value='';});}).catch(function(){msg.textContent='Não foi possível anexar.';});}
  if(!file){salvar();return;}
  if(file.size>10*1024*1024){msg.textContent='Arquivo maior que 10 MB: use um link do Drive.';return;}
  var ext=(file.name.split('.').pop()||'').toLowerCase(),TY={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  msg.textContent='Enviando…';
  window.claude.use('assets').then(function(api){if(!api)throw {code:'sem'};return api.upload(file,{type:TY[ext]||file.type});})
    .then(function(r){d.arquivo='/_blob/'+r.id;d.assetId=r.id;salvar();})
    .catch(function(err){msg.textContent=err&&err.code==='quota_exceeded'?'Espaço de arquivos cheio.':err&&err.code==='unsupported_type'?'Tipo de arquivo não aceito.':'Não foi possível enviar o arquivo.';});}
finDocs=function(){adiar('view-fin-custos',renderCustos);var l=document.getElementById('fc-nfl');if(l&&custoAberto)l.innerHTML=nfHtml(custoAberto);};
function cliqueFc(ev){var tr=ev.target.closest('[data-fcopen]');if(tr&&(ev.type==='click'||ev.key==='Enter'||ev.key===' ')){if(ev.type==='keydown')ev.preventDefault();abrirCusto(tr.dataset.fcopen);}}
$('fc-tab').addEventListener('click',cliqueFc);$('fc-tab').addEventListener('keydown',cliqueFc);
document.addEventListener('fin',function(){aplicar(events);adiar('view-fin-custos',renderCustos);adiar('view-base',renderBase,function(){return regOpen!=null;});refresh();});
renderCustos();

/* ---------------- dados ---------------- */
var ligado=false;
finLigar=function(){if(ligado||!db)return;ligado=true;
  db.collection('fin_coffee').onSnapshot(function(s){fin.coffee=s.docs.map(function(x){var o=Object.assign({},x.data());o.id=x.id;return o;});adiar('view-fin-coffee',renderCoffee);finMudou();},function(){});
  db.collection('fin_custos').onSnapshot(function(s){var m={};s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;m[x.id]=o;});fin.custos=m;adiar('view-fin-coffee',renderCoffee);finMudou();},function(){});
};
finMudou=function(){document.dispatchEvent(new CustomEvent('fin'));};
document.addEventListener('permissoes',function(){document.body.classList.toggle('fin-editar',fpode('editar'));renderCoffee();});
})();
