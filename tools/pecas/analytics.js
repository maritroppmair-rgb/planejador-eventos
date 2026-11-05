<script>
/* ---------- Analytics: indicadores e gráficos dos eventos realizados ---------- */
(function(){
"use strict";
function $(i){return document.getElementById(i);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var PDEF={tcVerde:55,tcAmarelo:30,pvVerde:70,pvAmarelo:51,metaPresente:15,limiteAmarelo:20};
var STATUS=['Sugerido','Aprovado','Contatado','Confirmado','Palestrou'];
var eventos=[],convidados=[],par={},pronto=false;
function P(k){return par[k]!=null&&par[k]!==''&&!isNaN(+par[k])?+par[k]:PDEF[k];}
function num(v){return v==null||v===''||isNaN(+v)?null:+v;}
function pct(v){return v==null?'—':Math.round(v*100)+'%';}
function reais(v,d){return v==null?'—':'R$ '+v.toFixed(d==null?2:d).replace('.',',');}
function dm(d){return d?d.slice(8,10)+'/'+d.slice(5,7):'';}
function semestre(d){if(!d)return '';var m=+d.slice(5,7);return d.slice(0,4)+'.'+(m<=7?1:2);}
function teste(e){return /\[teste\]/i.test(e.nome||'');}
function curto(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s;}
function visivel(){var v=$('view-ana');return v&&!v.hidden;}

/* ---------- dados ---------- */
function filtrados(){
  var sem=$('a-sem').value,tp=$('a-tipo').value,inc=$('a-teste').checked;
  return eventos.filter(function(e){return e.status==='realizado'&&(inc||!teste(e))&&(!sem||semestre(e.data)===sem)&&(!tp||e.tipo===tp);})
    .sort(function(a,b){return (a.data||'')<(b.data||'')?-1:1;});
}
function opcoes(){
  var inc=$('a-teste').checked,base=eventos.filter(function(e){return e.status==='realizado'&&(inc||!teste(e));});
  var sems={},tps={};base.forEach(function(e){if(e.data)sems[semestre(e.data)]=1;if(e.tipo)tps[e.tipo]=1;});
  [['a-sem','Todos os semestres',Object.keys(sems).sort().reverse()],['a-tipo','Todos os tipos',Object.keys(tps).sort()]].forEach(function(c){
    var s=$(c[0]),cur=s.value;s.textContent='';s.appendChild(new Option(c[1],''));c[2].forEach(function(x){s.appendChild(new Option(x,x));});s.value=c[2].indexOf(cur)>=0?cur:'';
  });
}

/* ---------- indicadores ---------- */
function chip(r,t){return '<span class="chip '+r+'">'+t+'</span>';}
function kpis(L){
  var I=0,Pi=0,Pr=0,C=0,CP=0,T=0,X=0,erros=[];
  L.forEach(function(e){var p=num(e.presentes)||0,i=num(e.inscritos);Pr+=p;
    if(i){I+=i;Pi+=p;}
    if(num(e.custo)&&p){C+=+e.custo;CP+=p;}
    if(num(e.membros)!=null&&p){T+=p;X+=Math.max(0,p-e.membros);}
    if(num(e.presentesPrev)&&p)erros.push(Math.abs(p-e.presentesPrev)/p);});
  var tc=I?Pi/I:null,cp=CP?C/CP:null,ex=T?X/T:null,er=erros.length?erros.reduce(function(a,b){return a+b;},0)/erros.length:null;
  var tcC=tc==null?'':tc*100>=P('tcVerde')?chip('ok','na meta'):tc*100>=P('tcAmarelo')?chip('warn','atenção'):chip('bad','abaixo');
  var cpC=cp==null?'':cp<=P('metaPresente')?chip('ok','dentro da meta'):cp<=P('limiteAmarelo')?chip('warn','acima da meta'):chip('bad','acima do limite');
  var K=[['Eventos realizados',L.length,''],['Público total',Pr,''],['Comparecimento',pct(tc),tcC],['Público de fora da Feashion',pct(ex),''],['Custo por presente',reais(cp),cpC],['Erro médio da previsão',er==null?'—':Math.round(er*100)+'%',er==null?'':'<span class="note">'+erros.length+' evento'+(erros.length===1?'':'s')+' com previsão</span>']];
  $('a-kpis').innerHTML=K.map(function(k){return '<div class="kpi"><div class="v num">'+k[1]+'</div><div class="l">'+k[0]+'</div>'+(k[2]?'<div>'+k[2]+'</div>':'')+'</div>';}).join('');
}

/* ---------- desenho ---------- */
function largura(el){return Math.max(280,Math.floor(el.clientWidth||600));}
function teto(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;}
function barraV(x,y,w,h){if(h<=0)return '';var r=Math.min(4,w/2,h);return 'M'+x+','+(y+h)+'V'+(y+r)+'Q'+x+','+y+' '+(x+r)+','+y+'H'+(x+w-r)+'Q'+(x+w)+','+y+' '+(x+w)+','+(y+r)+'V'+(y+h)+'Z';}
function barraH(x,y,w,h){if(w<=0)return '';var r=Math.min(4,h/2,w);return 'M'+x+','+y+'H'+(x+w-r)+'Q'+(x+w)+','+y+' '+(x+w)+','+(y+r)+'V'+(y+h-r)+'Q'+(x+w)+','+(y+h)+' '+(x+w-r)+','+(y+h)+'H'+x+'Z';}
function vazio(el,t){el.innerHTML='<div class="aempty">'+esc(t)+'</div>';}
function tabela(cab,linhas){return '<details><summary>Ver tabela</summary><table><thead><tr>'+cab.map(function(c,i){return '<th'+(i?' class="r"':'')+'>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>'+linhas.map(function(l){return '<tr>'+l.map(function(c,i){return '<td'+(i?' class="r num"':'')+'>'+esc(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></details>';}
function legenda(it){return '<div class="alegend">'+it.map(function(x){return '<span><i style="background:'+x[1]+'"></i>'+esc(x[0])+'</span>';}).join('')+'</div>';}

/* 1. público por evento: barras agrupadas (inscritos, presentes) */
function g1(L){
  var el=$('a-c1');if(!L.length)return vazio(el,'Nenhum evento realizado neste filtro.');
  var W=largura(el),H=240,ml=36,mr=8,mt=14,mb=L.length>8||W<560?28:44,pw=W-ml-mr,ph=H-mt-mb;
  var mx=teto(Math.max.apply(null,L.map(function(e){return Math.max(num(e.inscritos)||0,num(e.presentes)||0);}))||1);
  var band=pw/L.length,bw=Math.max(3,Math.min(24,(band*0.72-2)/2)),y=function(v){return mt+ph-v/mx*ph;};
  var s='<svg class="achart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Inscritos e presentes por evento">';
  for(var k=0;k<=4;k++){var v=mx*k/4,yy=y(v);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--grid)" stroke-width="1"/><text x="'+(ml-6)+'" y="'+(yy+4)+'" text-anchor="end">'+Math.round(v)+'</text>';}
  L.forEach(function(e,i){
    var x0=ml+i*band,cx=x0+band/2,ins=num(e.inscritos)||0,pr=num(e.presentes)||0;
    var tip='<b>'+esc(e.nome||'Evento')+'</b>'+esc(dm(e.data)+' · '+(e.tipo||''))+'<br>Inscritos: '+ins+'<br>Presentes: '+pr+(ins?' ('+Math.round(pr/ins*100)+'%)':'');
    s+='<g class="m" data-tip="'+esc(tip)+'"><rect class="hl" x="'+x0+'" y="'+mt+'" width="'+band+'" height="'+ph+'"/>';
    s+='<path d="'+barraV(cx-bw-1,y(ins),bw,mt+ph-y(ins))+'" fill="var(--s-ins)"/><path d="'+barraV(cx+1,y(pr),bw,mt+ph-y(pr))+'" fill="var(--s-pres)"/>';
    s+='<rect class="hit" x="'+x0+'" y="'+mt+'" width="'+band+'" height="'+(ph+mb)+'"/></g>';
    s+='<text x="'+cx+'" y="'+(mt+ph+15)+'" text-anchor="middle">'+dm(e.data)+'</text>';
    if(mb>30)s+='<text x="'+cx+'" y="'+(mt+ph+30)+'" text-anchor="middle">'+esc(curto(e.nome,Math.max(6,Math.floor(band/6.2))))+'</text>';
  });
  s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(mt+ph)+'" y2="'+(mt+ph)+'" stroke="var(--axis)" stroke-width="1"/></svg>';
  el.innerHTML=legenda([['Inscritos','var(--s-ins)'],['Presentes','var(--s-pres)']])+s+tabela(['Evento','Data','Inscritos','Presentes'],L.map(function(e){return [e.nome||'',dm(e.data),num(e.inscritos)==null?'—':e.inscritos,num(e.presentes)==null?'—':e.presentes];}));
}

/* barras horizontais genéricas (uma série), com linhas de referência opcionais */
function barrasH(el,rows,opt){
  if(!rows.length)return vazio(el,opt.vazio);
  var nr=(opt.refs||[]).length,W=largura(el),lw=Math.min(170,Math.max(90,W*0.32)),vw=W<420?62:76,rh=30,bh=16,mt=nr?8+nr*13:4,H=mt+rows.length*rh+4;
  var pw=W-lw-vw,mx=opt.max||teto(Math.max.apply(null,rows.map(function(r){return r.v;}).concat((opt.refs||[]).map(function(r){return r.v;})))||1);
  var x=function(v){return lw+Math.min(v,mx)/mx*pw;};
  var s='<svg class="achart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(opt.titulo)+'">';
  (opt.refs||[]).forEach(function(r,i){var xx=x(r.v),ty=10+i*13;s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(ty+3)+'" y2="'+(H-2)+'" stroke="var(--axis)" stroke-width="1"/><text class="ref" x="'+(xx+4)+'" y="'+ty+'">'+esc(r.t)+'</text>';});
  rows.forEach(function(r,i){
    var y0=mt+i*rh,by=y0+(rh-bh)/2;
    s+='<g class="m" data-tip="'+esc(r.tip)+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/>';
    s+='<text x="'+(lw-8)+'" y="'+(y0+rh/2+4)+'" text-anchor="end">'+esc(curto(r.l,Math.floor(lw/6.6)))+'</text>';
    s+='<path d="'+barraH(lw,by,Math.max(0,x(r.v)-lw),bh)+'" fill="'+(r.cor||'var(--s-pres)')+'"/>';
    s+='<text class="v" x="'+(Math.min(x(r.v),lw+pw)+6)+'" y="'+(y0+rh/2+4)+'">'+esc(r.t)+'</text>';
    s+='<rect class="hit" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/></g>';
  });
  s+='<line x1="'+lw+'" x2="'+lw+'" y1="'+(mt-2)+'" y2="'+(H-2)+'" stroke="var(--axis)" stroke-width="1"/></svg>';
  el.innerHTML=s+tabela(opt.cab,rows.map(function(r){return r.linha;}));
}

/* 2. comparecimento por tipo */
function g2(L){
  var t={};L.forEach(function(e){var i=num(e.inscritos);if(!i||!e.tipo)return;t[e.tipo]=t[e.tipo]||{i:0,p:0,n:0};t[e.tipo].i+=i;t[e.tipo].p+=num(e.presentes)||0;t[e.tipo].n++;});
  var rows=Object.keys(t).map(function(k){var v=t[k].p/t[k].i;return {l:k,v:v,t:pct(v),tip:'<b>'+esc(k)+'</b>'+t[k].p+' presentes de '+t[k].i+' inscritos<br>'+t[k].n+' evento'+(t[k].n===1?'':'s'),linha:[k,t[k].n,t[k].i,t[k].p,pct(v)]};}).sort(function(a,b){return b.v-a.v;});
  barrasH($('a-c2'),rows,{titulo:'Comparecimento por tipo',vazio:'Sem eventos com inscritos neste filtro.',max:Math.max(1,teto(Math.max.apply(null,rows.map(function(r){return r.v;}).concat([1])))),refs:[{v:P('tcVerde')/100,t:'meta '+P('tcVerde')+'%'}],cab:['Tipo','Eventos','Inscritos','Presentes','Comparec.']});
}

/* 3. previsto × real (halteres) */
function g3(L){
  var el=$('a-c3'),R=L.filter(function(e){return num(e.presentesPrev)!=null&&num(e.presentes)!=null;});
  if(!R.length)return vazio(el,'Nenhum evento realizado foi planejado no app ainda. Os eventos salvos pelo Planejar passam a aparecer aqui.');
  var W=largura(el),lw=Math.min(170,Math.max(90,W*0.32)),vw=W<420?70:92,rh=30,mt=4,H=mt+R.length*rh+4,pw=W-lw-vw;
  var mx=teto(Math.max.apply(null,R.map(function(e){return Math.max(+e.presentesPrev,+e.presentes);}))),x=function(v){return lw+v/mx*pw;};
  var s='<svg class="achart" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Previsto e real por evento">';
  R.forEach(function(e,i){
    var y0=mt+i*rh,cy=y0+rh/2,a=x(+e.presentesPrev),b=x(+e.presentes),d=e.presentes-e.presentesPrev,dp=e.presentesPrev?Math.round(d/e.presentesPrev*100):0;
    var tip='<b>'+esc(e.nome||'Evento')+'</b>'+esc(dm(e.data))+'<br>Previsto: '+e.presentesPrev+'<br>Real: '+e.presentes+' ('+(d>=0?'+':'')+dp+'%)';
    s+='<g class="m" data-tip="'+esc(tip)+'"><rect class="hl" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/>';
    s+='<text x="'+(lw-8)+'" y="'+(cy+4)+'" text-anchor="end">'+esc(curto(e.nome,Math.floor(lw/6.6)))+'</text>';
    s+='<line x1="'+Math.min(a,b)+'" x2="'+Math.max(a,b)+'" y1="'+cy+'" y2="'+cy+'" stroke="var(--axis)" stroke-width="2"/>';
    s+='<circle cx="'+a+'" cy="'+cy+'" r="5" fill="var(--s-ins)" stroke="var(--surface)" stroke-width="2"/><circle cx="'+b+'" cy="'+cy+'" r="5" fill="var(--s-pres)" stroke="var(--surface)" stroke-width="2"/>';
    s+='<text class="v" x="'+(lw+pw+8)+'" y="'+(cy+4)+'">'+e.presentesPrev+' → '+e.presentes+'</text>';
    s+='<rect class="hit" x="0" y="'+y0+'" width="'+W+'" height="'+rh+'"/></g>';
  });
  s+='</svg>';
  el.innerHTML=legenda([['Previsto','var(--s-ins)'],['Real','var(--s-pres)']])+s+tabela(['Evento','Previsto','Real','Diferença'],R.map(function(e){var d=e.presentes-e.presentesPrev;return [e.nome||'',e.presentesPrev,e.presentes,(d>=0?'+':'')+d];}));
}

/* 4. custo por presente */
function g4(L){
  var rows=L.filter(function(e){return num(e.custo)&&num(e.presentes);}).map(function(e){var v=e.custo/e.presentes,st=v<=P('metaPresente')?'dentro da meta':v<=P('limiteAmarelo')?'acima da meta':'acima do limite';
    return {l:(e.nome||'Evento'),v:v,t:reais(v,0),tip:'<b>'+esc(e.nome||'Evento')+'</b>'+esc(dm(e.data))+'<br>Custo: '+reais(+e.custo)+'<br>Presentes: '+e.presentes+'<br>'+reais(v)+' por presente · '+st,linha:[e.nome||'',dm(e.data),reais(+e.custo),e.presentes,reais(v),st]};});
  barrasH($('a-c4'),rows,{titulo:'Custo por presente',vazio:'Sem eventos com custo registrado neste filtro.',refs:[{v:P('metaPresente'),t:'meta '+reais(P('metaPresente'),0)},{v:P('limiteAmarelo'),t:'limite '+reais(P('limiteAmarelo'),0)}],cab:['Evento','Data','Custo','Presentes','Por presente','Situação']});
}

/* 5. ocupação das salas */
function g5(L){
  var rows=L.filter(function(e){return num(e.capacidade)&&num(e.presentes)!=null;}).map(function(e){var v=e.presentes/e.capacidade;
    return {l:(e.nome||'Evento'),v:v,t:pct(v),tip:'<b>'+esc(e.nome||'Evento')+'</b>'+esc((e.sala||'')+' · '+dm(e.data))+'<br>'+e.presentes+' presentes em '+e.capacidade+' lugares',linha:[e.nome||'',e.sala||'',e.capacidade,e.presentes,pct(v)]};});
  barrasH($('a-c5'),rows,{titulo:'Ocupação das salas',vazio:'Sem eventos com sala e capacidade neste filtro.',max:Math.max(1,teto(Math.max.apply(null,rows.map(function(r){return r.v;}).concat([1])))),refs:[{v:1,t:'lotada'}],cab:['Evento','Sala','Lugares','Presentes','Ocupação']});
}

/* 6. funil de convidados */
function g6(){
  var c={};STATUS.forEach(function(s){c[s]=0;});var outros=0;
  convidados.forEach(function(g){if(c[g.status]!=null)c[g.status]++;else outros++;});
  var rows=STATUS.map(function(s){return {l:s,v:c[s],t:String(c[s]),tip:'<b>'+s+'</b>'+c[s]+' convidado'+(c[s]===1?'':'s'),linha:[s,c[s]]};});
  if(outros)rows.push({l:'Sem status',v:outros,t:String(outros),tip:'<b>Sem status</b>'+outros,linha:['Sem status',outros]});
  if(!convidados.length)rows=[];
  barrasH($('a-c6'),rows,{titulo:'Funil de convidados',vazio:'Nenhum convidado cadastrado.',cab:['Status','Convidados']});
}

function render(){
  if(!visivel()||!pronto)return;
  opcoes();var L=filtrados();
  kpis(L);g1(L);g2(L);g3(L);g4(L);g5(L);g6();
}

/* dica ao passar o mouse ou tocar */
var tip=document.createElement('div');tip.className='atip';tip.hidden=true;document.body.appendChild(tip);
function mostrar(g,x,y){tip.innerHTML=g.getAttribute('data-tip');tip.hidden=false;var w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(window.innerWidth-w-8,x+14))+'px';tip.style.top=Math.max(8,(y-h-12<8?y+18:y-h-12))+'px';}
document.addEventListener('pointermove',function(e){var g=e.target&&e.target.closest?e.target.closest('#view-ana [data-tip]'):null;if(g)mostrar(g,e.clientX,e.clientY);else tip.hidden=true;});
document.addEventListener('scroll',function(){tip.hidden=true;},true);

['a-sem','a-tipo','a-teste'].forEach(function(id){$(id).addEventListener('change',render);});
document.addEventListener('tela',function(e){if(e.detail==='ana')render();});
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(render,150);});

if(window.claude&&window.claude.use)window.claude.use('db').then(function(db){
  if(!db)return;
  var n=0;function ok(){if(++n>=3)pronto=true;render();}
  var f={e:0,c:0,p:0};
  db.collection('eventos').onSnapshot(function(s){eventos=s.docs.map(function(d){var o=d.data();o.id=d.id;return o;});if(!f.e){f.e=1;ok();}else render();},function(){});
  db.collection('convidados').onSnapshot(function(s){convidados=s.docs.map(function(d){return d.data();});if(!f.c){f.c=1;ok();}else render();},function(){});
  db.collection('parametros').onSnapshot(function(s){par={};s.docs.forEach(function(d){if(d.id==='geral')par=d.data()||{};});if(!f.p){f.p=1;ok();}else render();},function(){});
});
})();
</script>
