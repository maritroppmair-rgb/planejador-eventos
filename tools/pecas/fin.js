/* ============================== FINANCEIRO ==============================
   Roda dentro do script principal (mesmo escopo de events, docs, db, P, esc, fmt, D, painelAbrir...).
   Coleções do Financeiro (as regras dão a edição a quem tem cargo no Financeiro):
   - fin_coffee/{id}: contatos de coffee {nome, contato, telefone, endereco, obs, itens:[{item, preco, unidade}]}
   - fin_custos/{eventoId}: gasto real de cada evento {coffee, coffeeLocal, material, sala, adicionais:[{desc, valor}], obs, total, lancadoEm, lancadoPor} */
var finLigar=null,finMudou=function(){};
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

/* ---------------- dados ---------------- */
var ligado=false;
finLigar=function(){if(ligado||!db)return;ligado=true;
  db.collection('fin_coffee').onSnapshot(function(s){fin.coffee=s.docs.map(function(x){var o=Object.assign({},x.data());o.id=x.id;return o;});adiar('view-fin-coffee',renderCoffee);finMudou();},function(){});
  db.collection('fin_custos').onSnapshot(function(s){var m={};s.docs.forEach(function(x){var o=Object.assign({},x.data());o.id=x.id;m[x.id]=o;});fin.custos=m;adiar('view-fin-coffee',renderCoffee);finMudou();},function(){});
};
finMudou=function(){document.dispatchEvent(new CustomEvent('fin'));};
document.addEventListener('permissoes',function(){document.body.classList.toggle('fin-editar',fpode('editar'));renderCoffee();});
})();
