/* ============ PÓS-EVENTO E RELATÓRIO FINAL (seção 07 da Ficha de Evento Feashion) ============
   Roda dentro do script principal (mesmo escopo de events, guests, docs, db, esc, D, iso, $, P, painelAbrir, painelAtualizar...).
   "Finalizar evento" (linha do evento na Base) abre a tela do pós-evento:
     1. Resultado: inscritos vem sozinho do Forms do app; presentes, membros, duração, atraso e a comida (faltou/sobrou/certas + %)
        são digitados. "Vieram sem inscrição" vai sair do cruzamento de e-mails (lista de presença × inscritos) quando a presença for automatizada;
     2. Resumo automático: público, custo, checklist e divulgação, calculados do que as áreas já registraram;
     3. Pós-evento: eventos/{id}.posEvento = {certo, errado, mudar, contatos:{convidadoId:{manter, coment}}, outros, em, por}
   "Gerar relatório final" monta um PDF com o que todas as diretorias registraram do evento, guarda o arquivo (arquivos/, como
   qualquer arquivo enviado) e um documento tipo PDF ligado ao evento (pasta do evento em Documentos). Só então o evento passa
   para Realizados: eventos/{id}.relatorio = {docId, assetId, em, por, versao} e status 'realizado'.
   Depois de gerado, o evento fica fechado: a ficha, o orçamento, os pagamentos, a divulgação e o pós-evento
   passam a ser só leitura (por isso o prazo do relatório é 7 dias depois do evento: dá tempo de chegar nota e comprovante). O ponto "Relatório final gerado" do checklist (7 dias depois) fica
   verde sozinho. Eventos realizados mostram só "Relatório final" e "Relatório feedback convidado" (um PDF por convidado, no fim deste arquivo). */
(function(){
"use strict";
function Pm(){return window.__perm&&__perm.carregado()?__perm:null;}
function podeEd(){var p=Pm();return !!p&&!!p.podeEm('Eventos').editar;}
function evDe(id){return events.filter(function(x){return x.id===id;})[0]||null;}
function hoje(){return iso(new Date());}
function ddmm(s){return s?s.slice(8,10)+'/'+s.slice(5,7):'';}
function ddmmaa(s){return s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';}
function dia(t){var d=t?new Date(t):null;return d&&!isNaN(d)?iso(d):'';} /* data local de um horário salvo em UTC */
function prim(n){return String(n||'').split(' ')[0];}
function blk(t,h){return '<div class="tp-blk">'+(t?'<h4>'+t+'</h4>':'')+h+'</div>';}
function dl(l){return '<dl class="br-dl">'+l.map(function(r){return '<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>';}).join('')+'</dl>';}
function quem(){return {em:new Date().toISOString(),por:String(window.__meuNome||'').slice(0,80),uid:window.__euId||''};}
function reais(v){if(v==null||v===''||isNaN(+v))return '—';var s=Math.abs(+v).toFixed(2).split('.');return (+v<0?'-':'')+'R$ '+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1];}
function pct(v){return v==null||isNaN(v)?'—':Math.round(v*100)+'%';}
function num(v){return v==null||v===''||isNaN(+v)?null:+v;}
function convIds(e){return e.convidadoIds&&e.convidadoIds.length?e.convidadoIds:e.convidadoId?[e.convidadoId]:[];}
function gDe(id){return guests.filter(function(g){return g.id===id;})[0]||null;}
function dataLonga(e){return e.data?D(e.data).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'sem data';}

/* público USP dos inscritos pelo Forms do app (o robô conta "Aluno USP" e "qual instituto"): null sem dados */
function publicoUsp(e){var i=e.inscricao;if(!i||!i.formId)return null;var u=+i.usp||0,n=+i.naoUsp||0;if(!u&&!n)return null;
  var inst=Object.keys(i.institutos||{}).map(function(k){return [k,+i.institutos[k]||0];}).sort(function(a,b){return b[1]-a[1]||(a[0]<b[0]?-1:1);});
  return {usp:u,nao:n,total:u+n,inst:inst};}
window.__publicoUsp=publicoUsp;
/* feedback dos participantes (Forms de feedback do app, lido pelo robô): null sem Forms */
function fbDe(e){var f=e.feedback;if(!f||!f.formId)return null;
  return {total:+f.total||0,satisfacao:num(f.satisfacao),perguntas:(f.perguntas||[]).filter(function(q){return q&&q.t;}),comentarios:(f.comentarios||[]).filter(function(c){return c&&c.txt;})};}
function nota(v){return v==null?'—':(Math.round(v*10)/10).toFixed(1).replace('.',',');}
/* perguntas do feedback na tela: título à esquerda, nota à direita (o dl espreme títulos longos) */
function qLista(fb){return '<div class="fc-qs">'+fb.perguntas.map(function(q){return '<div class="fc-q"><span>'+esc(q.t)+'</span><b>'+nota(q.media)+' <span class="note">de '+q.max+(q.n!=null?' · '+q.n+' resp.':'')+'</span></b></div>';}).join('')+'</div>';}
/* os números do resultado (os mesmos de antes do pós-evento) */
var RES=[['presentes','Presentes (total)',1],['membros','Membros presentes'],['duracaoReal','Duração real (min)'],['atraso','Atraso (min)']];
var COM=[['','—'],['certo','Porções certas'],['faltou','Faltou comida'],['sobrou','Sobrou comida']];
/* inscritos: automático, do Forms do app (o robô conta as respostas); eventos antigos ficam com o número já gravado */
function insDe(e){var i=e.inscricao;if(i&&i.formId&&i.total!=null&&!isNaN(+i.total))return +i.total;return num(e.inscritos);}
function comidaTxt(c,p){var o=COM.filter(function(x){return x[0]===(c||'');})[0];if(!o||!o[0])return '';return o[1]+(c!=='certo'&&p!=null&&p!==''?' ('+p+'%)':'');}
var TXT=[['certo','O que deu certo',1],['errado','O que deu errado e como foi corrigido',1],['mudar','O que mudar no próximo',1]];

/* rascunho por evento (o que está na tela antes de salvar) */
var RP={};
function rasc(e){var m0='';if(RP[e.id]&&!RP[e.id].sujo){m0=RP[e.id].msg;delete RP[e.id];}
  if(!RP[e.id]){var pe=e.posEvento||{},res={};
    RES.forEach(function(r){var v=e[r[0]];res[r[0]]=v!=null&&v!==''?String(v):'';});
    var ct={};convIds(e).forEach(function(i){var c=(pe.contatos||{})[i]||{};ct[i]={manter:!!c.manter,coment:c.coment||''};});
    RP[e.id]={res:res,com:e.comida||'',comPct:e.comidaPct!=null?String(e.comidaPct):'',certo:pe.certo||'',errado:pe.errado||'',mudar:pe.mudar||'',contatos:ct,outros:pe.outros||'',sujo:false,msg:m0,ocup:false};}
  return RP[e.id];}
/* lê e confere os números (as mesmas regras de antes) */
function lerRes(r,exigir){var v={};RES.forEach(function(x){var s=String(r.res[x[0]]||'').trim().replace(',','.');v[x[0]]=s===''?null:+s;});
  for(var k in v){if(v[k]!=null&&(isNaN(v[k])||v[k]<0))return {erro:'Os números não podem ser negativos nem ter letras.'};}
  var pr=v.presentes;
  if(exigir&&pr==null)return {erro:'Informe quantas pessoas estiveram presentes.'};
  if(pr!=null&&v.membros!=null&&v.membros>pr)return {erro:'Membros presentes não pode passar do total de presentes ('+pr+').'};
  v.comida=r.com||null;v.comidaPct=null;
  if(v.comida&&v.comida!=='certo'){var s=String(r.comPct||'').trim().replace(',','.').replace('%','');
    if(s!==''){var n=+s;if(isNaN(n)||n<0||n>100)return {erro:'O percentual de comida que '+v.comida+' vai de 0 a 100.'};v.comidaPct=Math.round(n);}}
  return {v:v};}

/* ----- resumo automático: o que as áreas já registraram ----- */
function resumo(e){var r=rasc(e),v=lerRes(r).v||{},ins=insDe(e),pr=v.presentes,sw=num(e.semInscricao)||0;
  var tc=ins&&pr!=null?Math.min(1,Math.max(0,pr-sw)/ins):null,f=window.__finRel?__finRel(e):null,mk=window.__mktRel?__mktRel(e):null;
  var pub=[{l:'Inscritos',p:num(e.inscritosMeta),r:ins},{l:'Presentes',p:num(e.presentesPrev),r:pr}];
  var pu=publicoUsp(e);
  var h='<h5 class="br-h5">Público</h5>'+dl(pub.map(function(x){return [x.l,(x.r!=null?x.r:'—')+' <span class="note">previsto '+(x.p!=null?x.p:'—')+'</span>'];}).concat([['Comparecimento',pct(tc)+' <span class="note">dos inscritos vieram</span>']])
    .concat(pu?[['Alunos USP',pu.usp+' de '+pu.total+' inscritos ('+pct(pu.usp/pu.total)+')'+(pu.nao?' <span class="note">'+pu.nao+' de fora da USP</span>':'')],['Institutos',pu.inst.length?esc(pu.inst.map(function(x){return x[0]+' '+x[1];}).join(' · ')):'—']]
      :e.inscricao&&e.inscricao.formId?[['Alunos USP','<span class="note">o Forms deste evento não tem a pergunta Aluno USP</span>']]:[]));
  if(f){var cp=f.gasto!=null&&pr?f.gasto/pr:null,meta=typeof P!=='undefined'&&P&&P.metaPresente;
    h+='<h5 class="br-h5">Custo</h5>'+dl([['Previsto',reais(f.previsto)],['Verba liberada',reais(f.verba)],['Gasto',reais(f.gasto)+(f.verba!=null&&f.gasto!=null&&f.gasto>f.verba+0.005?' <span class="chip bad">passou da verba</span>':'')],
      ['Custo por presente',reais(cp)+(meta?' <span class="note">meta '+reais(meta)+'</span>':'')]]);}
  var ps=window.__pontosDe?__pontosDe(e).filter(function(x){return x.k!=='pos';}):[];
  if(ps.length){var fe=ps.filter(function(x){return x.feito;}),at=fe.filter(function(x){return x.em&&x.prazo&&dia(x.em)>x.prazo;}),nf=ps.filter(function(x){return !x.feito;});
    h+='<h5 class="br-h5">Checklist</h5>'+dl([['Feitos',fe.length+' de '+ps.length],['Feitos com atraso',at.length?esc(at.map(function(x){return x.n;}).join(', ')):'nenhum'],['Não feitos',nf.length?esc(nf.map(function(x){return x.n;}).join(', ')):'nenhum']]);}
  if(mk){var po=[];mk.canais.forEach(function(c){c.posts.forEach(function(p){po.push(p);});});
    h+='<h5 class="br-h5">Divulgação</h5>'+dl([['Posts publicados',po.filter(function(p){return p.pub;}).length+' de '+po.length],
      ['Por canal',mk.canais.filter(function(c){return c.posts.length;}).map(function(c){return esc(c.nome)+' '+c.posts.filter(function(p){return p.pub;}).length+'/'+c.posts.length;}).join(' · ')||'—'],
      ['Divulgação feita',mk.feita?'em '+ddmm(dia(mk.feita.em))+(mk.feita.por?' por '+esc(prim(mk.feita.por)):''):'não marcada']]);}
  var fb=fbDe(e),ms=num((e.ficha||{}).metaSatisfacao);
  if(fb)h+='<h5 class="br-h5">Feedback dos participantes</h5>'+(fb.total?dl([['Respostas',fb.total+(ins?' <span class="note">'+pct(fb.total/ins)+' dos inscritos</span>':'')],
      ['Satisfação',pct(fb.satisfacao)+' <span class="note">notas 4 e 5'+(ms!=null?' · meta '+ms+'%':'')+'</span>'+(ms!=null&&fb.satisfacao!=null?(fb.satisfacao*100>=ms?' <span class="chip ok">bateu a meta</span>':' <span class="chip warn">abaixo da meta</span>'):'')]]
    .concat([['Comentários',fb.comentarios.length?fb.comentarios.length+' <span class="note">entram no relatório final</span>':'nenhum']]))+qLista(fb):'<p class="note" style="margin:0">O Forms de feedback ainda não tem respostas.</p>');
  return h+'<p class="note" style="margin:8px 0 0">O resumo usa os números do resultado já salvos e o que cada área registrou. Tudo isso entra no relatório final.</p>';}

/* ----- painel ----- */
function montarPos(id){var e=evDe(id);if(!e)return null;var r=rasc(e),dn=e.status==='realizado',rel=e.relatorio&&e.relatorio.em?e.relatorio:null,ed=podeEd()&&!rel; /* com o relatório gerado, o evento fica fechado */
  var sub=dataLonga(e)+(e.hora?' · '+esc(e.hora):'')+(e.sala?' · '+esc(e.sala):'')+' '+(rel?'<span class="chip ok">Relatório gerado em '+ddmm(dia(rel.em))+'</span>':dn?'<span class="chip warn">Sem relatório final</span>':'<span class="chip neutral">Pós-evento</span>');
  var c='';
  if(rel)c+=blk('Relatório final','<p style="margin:0">Gerado em '+ddmmaa(dia(rel.em))+(rel.por?' por '+esc(prim(rel.por)):'')+(rel.versao>1?' (versão '+rel.versao+')':'')+'. '+
    (rel.assetId?'<a href="/_blob/'+esc(rel.assetId)+'" class="pos-pdf">Abrir o PDF</a>':'')+'</p><p class="note" style="margin:6px 0 0">O PDF também fica em Documentos, na pasta do evento. Com o relatório gerado, o evento está fechado: nada mais muda.</p>');
  else if(dn)c+=blk('','<p class="note" style="margin:0">Este evento foi finalizado antes do relatório final. '+(ed?'Confira os dados e gere o relatório.':'Ainda não tem relatório.')+'</p>');
  else c+='<p class="note" style="margin:0 0 10px">Registre o resultado, confira o resumo e escreva o pós-evento. O evento só passa para <b>Realizados</b> quando o relatório final é gerado.</p>';
  /* 1. resultado */
  var rh;
  var ins=insDe(e),auto=e.inscricao&&e.inscricao.formId;
  rh=dl([['Inscritos',(ins!=null?'<b>'+ins+'</b>':'—')+' <span class="note">'+(auto?'automático, do Forms do app':ins!=null?'número registrado antes do Forms do app':'evento sem o Forms do app')+'</span>'],
    ['Vieram sem inscrição',(num(e.semInscricao)!=null?esc(String(e.semInscricao))+' ':'')+'<span class="note">vai ser automático: cruza os e-mails da lista de presença com os inscritos</span>']]);
  if(ed)rh+='<div class="treg">'+RES.map(function(x){return '<div class="field"><label for="pr-'+x[0]+'">'+x[1]+(x[2]?' <span class="rq">obrigatório</span>':'')+'</label><input id="pr-'+x[0]+'" data-pr="'+x[0]+'" type="number" min="0" inputmode="decimal" value="'+esc(r.res[x[0]])+'"></div>';}).join('')+
    '<div class="field"><label for="pr-com">Comida</label><select id="pr-com" data-pcom="1">'+COM.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===r.com?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></div>'+
    (r.com==='faltou'||r.com==='sobrou'?'<div class="field"><label for="pr-cpct">Quanto '+r.com+' (%) <span class="rq opt">opcional</span></label><input id="pr-cpct" data-pcpct="1" type="number" min="0" max="100" inputmode="decimal" value="'+esc(r.comPct)+'"></div>':'')+'</div>';
  else rh+=dl(RES.map(function(x){return [x[1],esc(r.res[x[0]]||'—')];}).concat([['Comida',esc(comidaTxt(r.com,r.comPct))||'—']]));
  c+=blk('Resultado',rh);
  c+=blk('Resumo automático',resumo(e));
  /* 2. pós-evento */
  var gl=convIds(e),ph='';
  TXT.forEach(function(t){ph+=ed?'<div class="field"><label for="pt-'+t[0]+'">'+t[1]+' <span class="rq">obrigatório</span></label><textarea id="pt-'+t[0]+'" data-pt="'+t[0]+'" rows="3" maxlength="1500">'+esc(r[t[0]])+'</textarea></div>'
    :'<h5 class="br-h5">'+t[1]+'</h5><p style="margin:0;white-space:pre-wrap">'+(esc(r[t[0]])||'<span class="note">—</span>')+'</p>';});
  var ch=gl.map(function(i){var g=gDe(i),ct=r.contatos[i]||{manter:false,coment:''},nm=g?g.nome:'convidado removido da base',ce=g&&(g.cargo||g.empresa)?[g.cargo,g.empresa].filter(Boolean).join(' · '):'';
    return ed?'<div class="pos-ct"><label class="check"><input type="checkbox" data-pck="'+esc(i)+'"'+(ct.manter?' checked':'')+'><span><b>'+esc(nm)+'</b>'+(ce?' <span class="note">'+esc(ce)+'</span>':'')+'</span></label><input data-pcm="'+esc(i)+'" maxlength="200" placeholder="Comentário (opcional)" value="'+esc(ct.coment)+'" aria-label="Comentário sobre '+esc(nm)+'"></div>'
      :'<p style="margin:0 0 4px"><b>'+esc(nm)+'</b> · '+(ct.manter?'manter contato':'não marcado')+(ct.coment?' · '+esc(ct.coment):'')+'</p>';}).join('');
  ph+='<div class="field"><label>Contatos a manter</label>'+(gl.length?(ed?'<span class="note" style="display:block;margin:0 0 6px">Marque os convidados com quem vale manter contato.</span>':'')+ch:'<span class="note">Evento sem convidado na ficha.</span>')+'</div>'+
    (ed?'<div class="field"><label for="pt-outros">Outros contatos a manter <span class="rq opt">opcional · fornecedor, sala, parceiro</span></label><textarea id="pt-outros" data-pt="outros" rows="2" maxlength="800">'+esc(r.outros)+'</textarea></div>'
      :(r.outros?'<h5 class="br-h5">Outros contatos</h5><p style="margin:0;white-space:pre-wrap">'+esc(r.outros)+'</p>':''));
  c+=blk('Pós-evento',ph);
  var rod='';
  if(ed)rod='<div class="btns"><button type="button" class="btn ghost" id="pos-salvar"'+(r.ocup?' disabled':'')+'>Salvar</button><button type="button" class="btn" id="pos-gerar"'+(r.ocup?' disabled':'')+'>'+'Gerar relatório final'+'</button>'+
    '<span class="msg" id="pos-m" role="status">'+esc(r.msg||(r.sujo?'Alterações não salvas.':''))+'</span></div>';
  return {titulo:(dn?'Relatório final · ':'Pós-evento · ')+(e.nome||'Evento'),sub:sub,corpo:c,rodape:rod};}
function redesenha(){var a=document.activeElement;if(a&&a.blur&&a.closest&&a.closest('#view-base .tpanel'))a.blur();painelAtualizar('view-base');}

/* ----- salvar e gerar ----- */
function salvar(id,gerar){var e=evDe(id);if(!e||!db)return;var r=rasc(e),q=quem();
  var lr=lerRes(r,gerar);if(lr.erro){r.msg=lr.erro;redesenha();return;}
  if(window.__travado&&__travado(e)){r.msg='O relatório final já foi gerado: o evento está fechado.';redesenha();return;}
  if(gerar){var falta=TXT.filter(function(t){return !String(r[t[0]]).trim();});
    if(falta.length){r.msg='Preencha: '+falta.map(function(t){return t[1].toLowerCase();}).join('; ')+'.';redesenha();return;}
    if(e.data&&e.data>hoje()){r.msg='O relatório final só pode ser gerado depois do dia do evento.';redesenha();return;}}
  var up={comida:lr.v.comida,comidaPct:lr.v.comidaPct},ia=insDe(e);RES.forEach(function(x){up[x[0]]=lr.v[x[0]];});
  if(ia!=null)up.inscritos=ia; /* inscritos do Forms gravado no evento (Base e Analytics usam) */
  var ct={};Object.keys(r.contatos).forEach(function(i){var c=r.contatos[i];if(c.manter||String(c.coment).trim())ct[i]={manter:!!c.manter,coment:String(c.coment).trim().slice(0,200)};});
  up.posEvento={certo:r.certo.trim().slice(0,1500),errado:r.errado.trim().slice(0,1500),mudar:r.mudar.trim().slice(0,1500),contatos:ct,outros:r.outros.trim().slice(0,800),em:q.em,por:q.por};
  r.ocup=true;r.msg=gerar?'Gerando o relatório final…':'Salvando…';redesenha();
  db.doc('eventos/'+id).update(up).then(function(){
    if(!gerar){r.sujo=false;r.msg='Salvo. O evento continua em Próximos e pendentes até o relatório final ser gerado.';if(e.status==='realizado')r.msg='Salvo.';return;}
    return gerarRel(id,Object.assign({},e,up)).then(function(){r.sujo=false;r.msg='Relatório final gerado: o evento está em Realizados e o PDF, em Documentos.';});})
    .catch(function(err){r.msg=err&&err.code==='sem'?'Não foi possível guardar o PDF: entre de novo no app e tente outra vez.':gerar?'Não foi possível gerar o relatório final.':'Não foi possível salvar.';})
    .then(function(){r.ocup=false;redesenha();});}
function autDe(ev){if(!(ev.inscricao&&ev.inscricao.formId)||!db)return Promise.resolve(null);
  return db.doc('inscricoes/'+ev.id).get().then(function(s){var l=s.exists?(s.data().respostas||[]):[];return {total:l.length,sim:l.filter(function(x){return x.imagem===true;}).length,nao:l.filter(function(x){return x.imagem===false;}).length};},function(){return null;});}
function gerarRel(id,ev){var q=quem();
  return autDe(ev).then(function(aut){var blob=pdfRelatorio(ev,aut,q);
    return window.claude.use('assets').then(function(api){if(!api)throw {code:'sem'};return api.upload(blob,{type:'application/pdf'});})
    .then(function(upl){var rel0=ev.relatorio||{},vs=(+rel0.versao||0)+1,url='/_blob/'+upl.id;
      var d={nome:('Relatório final · '+(ev.nome||'Evento')+' ('+ddmmaa(ev.data)+')').slice(0,120),tipo:'PDF',versao:'v'+vs,resp:q.por,
        resumo:'Gerado pelo app no pós-evento: Eventos, Presidência, Financeiro, Marketing, checklist e pós-evento.',eventos:[id],area:'Eventos',link:'',arquivo:url,assetId:upl.id,url:url};
      var existe=rel0.docId&&docs.some(function(x){return x.id===rel0.docId;});
      var pd=existe?db.doc('documentos/'+rel0.docId).update(d).then(function(){return rel0.docId;}):db.collection('documentos').add(Object.assign({criadoEm:q.em},d)).then(function(x){return x.id;});
      return pd.then(function(docId){var u={status:'realizado',relatorio:{docId:docId,assetId:upl.id,em:q.em,por:q.por,versao:vs}};
        if(ev.status!=='realizado'){u.finalizadoEm=q.em;u.finalizadoPor=q.por;}
        return db.doc('eventos/'+id).update(u);});});});}

/* ================= PDF (gerado aqui mesmo, sem biblioteca: fontes padrão do PDF) ================= */
var HV=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
var HB=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
var ESP={8211:150,8212:151,8216:145,8217:146,8220:147,8221:148,8226:149,8230:133,8364:128};
var LESP={150:556,151:1000,145:222,146:222,147:333,148:333,149:350,133:1000,128:556,160:278,183:278,215:584,170:370,186:365,176:400};
function limpa(s){return String(s==null?'':s).replace(/[→]/g,'->').replace(/[−]/g,'-').replace(/[✓✔]/g,'ok').replace(/\r/g,'');}
function byteDe(ch){var c=ch.charCodeAt(0);if(c<32)return 32;if(c<127)return c;if(ESP[c])return ESP[c];if(c>=160&&c<=255)return c;
  var b=ch.normalize?ch.normalize('NFD').charAt(0):'?';var cb=b.charCodeAt(0);return cb>=32&&cb<127?cb:63;}
function larg(s,f,sz){var t=0,tab=f==='F2'||f==='F3'?HB:HV;s=limpa(s);
  for(var i=0;i<s.length;i++){var ch=s.charAt(i),b=byteDe(ch),w;
    if(b>=32&&b<127)w=tab[b-32];else if(LESP[b])w=LESP[b];else{var n=ch.normalize?ch.normalize('NFD').charAt(0):'a',nb=n.charCodeAt(0);w=nb>=32&&nb<127?tab[nb-32]:556;}
    t+=w;}return t*sz/1000*(f==='F3'?0.96:1);}
function enc(s){s=limpa(s);var o='';for(var i=0;i<s.length;i++){var b=byteDe(s.charAt(i));
  if(b===40||b===41||b===92)o+='\\'+String.fromCharCode(b);else if(b>126)o+='\\'+('00'+b.toString(8)).slice(-3);else o+=String.fromCharCode(b);}return o;}
var VINHO=[138,13,16],TINTA=[34,34,34],CINZA=[110,104,98],LINHA=[214,206,196],CLARO=[241,238,232];
function criarPdf(rodapeTxt){
  var W=595.28,H=841.89,ML=50,LW=W-100,MT=56,MB=64,pags=[],cur,y;
  function cor(c){return c.map(function(v){return (v/255).toFixed(3);}).join(' ');}
  function pag(){cur=[];pags.push(cur);y=H-MT;}
  function txt(s,x,yy,f,sz,c,tc){cur.push('BT /'+f+' '+sz+' Tf '+(tc||0)+' Tc '+cor(c||TINTA)+' rg '+x.toFixed(2)+' '+yy.toFixed(2)+' Td ('+enc(s)+') Tj ET');}
  function lin(x1,y1,x2,y2,c,w){cur.push(cor(c||LINHA)+' RG '+(w||0.6)+' w '+x1.toFixed(2)+' '+y1.toFixed(2)+' m '+x2.toFixed(2)+' '+y2.toFixed(2)+' l S');}
  function ret(x,yy,w,h,c){cur.push(cor(c)+' rg '+x.toFixed(2)+' '+yy.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');}
  function cabe(h){if(y-h<MB){pag();return false;}return true;}
  function quebra(s,f,sz,l){var out=[];limpa(s).split('\n').forEach(function(par){var ws=par.split(/\s+/).filter(Boolean),cl='';if(!ws.length){out.push('');return;}
    ws.forEach(function(w){var t=cl?cl+' '+w:w;if(larg(t,f,sz)<=l){cl=t;return;}if(cl)out.push(cl);
      while(larg(w,f,sz)>l&&w.length>1){var k=w.length;while(k>1&&larg(w.slice(0,k),f,sz)>l)k--;out.push(w.slice(0,k));w=w.slice(k);}cl=w;});out.push(cl);});return out;}
  pag();
  var api={
    capa:function(titulo,nome,linha2,linha3){ret(0,H-92,W,92,VINHO);txt('Feashion',ML,H-50,'F3',24,[255,255,255]);txt('LIGA DE FASHION BUSINESS',ML,H-66,'F1',7,[240,215,215],1.6);
      txt(titulo.toUpperCase(),W-ML-larg(titulo.toUpperCase(),'F2',9)-titulo.length*1.2,H-52,'F2',9,[255,255,255],1.2);y=H-130;
      quebra(nome,'F3',22,LW).forEach(function(l){txt(l,ML,y,'F3',22,TINTA);y-=26;});y+=4;
      if(linha2){txt(linha2,ML,y,'F1',10.5,CINZA);y-=15;}if(linha3){txt(linha3,ML,y,'F1',9,CINZA);y-=14;}y-=10;},
    secao:function(t){cabe(60);y-=14;txt(t.toUpperCase(),ML,y,'F2',9,VINHO,1.4);lin(ML,y-6,ML+LW,y-6,VINHO,0.8);y-=22;},
    sub:function(t){cabe(30);y-=4;txt(t,ML,y,'F2',10,TINTA);y-=15;},
    par:function(t,f,sz,c){f=f||'F1';sz=sz||10;quebra(t||'—',f,sz,LW).forEach(function(l){cabe(14);txt(l,ML,y,f,sz,c);y-=sz*1.4;});y-=4;},
    kv:function(l){var LK=150;l.forEach(function(r){var ls=quebra(r[1]==null||r[1]===''?'—':r[1],'F1',10,LW-LK),h=ls.length*13.5;
      cabe(h+4);txt(r[0],ML,y,'F1',9,CINZA);ls.forEach(function(s,i){txt(s,ML+LK,y-i*13.5,'F1',10);});y-=h+4;});y-=4;},
    tabela:function(cab,linhas,fr){if(!linhas.length){api.par('Nada registrado.','F4',9.5,CINZA);return;}
      var ws=fr.map(function(f){return f*LW;}),xs=[],x=ML;ws.forEach(function(w){xs.push(x);x+=w;});
      function topo(){cabe(44);ret(ML,y-5,LW,17,CLARO);cab.forEach(function(c,i){txt(c,xs[i]+4,y,'F2',8,CINZA);});y-=18;}
      topo();
      linhas.forEach(function(row){var cl=row.map(function(c,i){return quebra(c==null||c===''?'—':c,'F1',9,ws[i]-8);}),n=Math.max.apply(null,cl.map(function(c){return c.length;})),h=n*11.5+5;
        if(y-h<MB){pag();topo();}
        cl.forEach(function(ls,i){ls.forEach(function(s,k){txt(s,xs[i]+4,y-k*11.5,'F1',9);});});y-=h;lin(ML,y+7,ML+LW,y+7,LINHA,0.4);y-=2;});y-=8;},
    blob:function(titulo){var n=pags.length;pags.forEach(function(c,i){cur=c;lin(ML,40,ML+LW,40,LINHA,0.5);txt(rodapeTxt,ML,28,'F1',7.5,CINZA);var pg='página '+(i+1)+' de '+n;txt(pg,ML+LW-larg(pg,'F1',7.5),28,'F1',7.5,CINZA);});
      var ob=[],kids=[],k=8;
      ob[1]='<< /Type /Catalog /Pages 2 0 R >>';
      ob[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
      ob[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
      ob[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>';
      ob[6]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';
      ob[7]='<< /Title ('+enc(titulo)+') /Producer (Planejador de Eventos Feashion) >>';
      pags.forEach(function(c){var s=c.join('\n');ob[k]='<< /Length '+s.length+' >>\nstream\n'+s+'\nendstream';
        ob[k+1]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Contents '+k+' 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> >>';kids.push((k+1)+' 0 R');k+=2;});
      ob[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+kids.length+' >>';
      var out='%PDF-1.4\n%âãÏÓ\n',off=[];
      for(var i=1;i<k;i++){off[i]=out.length;out+=i+' 0 obj\n'+ob[i]+'\nendobj\n';}
      var xr=out.length;out+='xref\n0 '+k+'\n0000000000 65535 f \n';for(i=1;i<k;i++)out+=('000000000'+off[i]).slice(-10)+' 00000 n \n';
      out+='trailer\n<< /Size '+k+' /Root 1 0 R /Info 7 0 R >>\nstartxref\n'+xr+'\n%%EOF\n';
      var u=new Uint8Array(out.length);for(i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return new Blob([u],{type:'application/pdf'});}};
  return api;}

/* ----- o conteúdo do relatório: o que cada diretoria registrou do evento ----- */
function pdfRelatorio(e,aut,q){var f=e.ficha||{},pe=e.posEvento||{},nome=e.nome||'Evento';
  var agora=new Date(q.em),gerado='Gerado em '+agora.toLocaleDateString('pt-BR')+' às '+agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+(q.por?' por '+q.por:'');
  var doc=criarPdf('Feashion · Relatório final · '+nome.slice(0,60));
  doc.capa('Relatório final',nome,[dataLonga(e),e.hora,e.sala].filter(Boolean).join(' · '),gerado);
  /* Eventos: a ficha */
  doc.secao('O evento · Eventos');
  var gl=convIds(e).map(function(i){var g=gDe(i),cf=(e.convConfirmados||{})[i];return (g?g.nome+(g.cargo||g.empresa?' ('+[g.cargo,g.empresa].filter(Boolean).join(', ')+')':''):'convidado removido da base')+(cf&&cf.em?' · confirmado por escrito em '+ddmm(dia(cf.em)):' · sem confirmação por escrito');});
  doc.kv([['Tipo',e.tipo||''],['Data e horário',dataLonga(e)+(e.hora?', '+e.hora:'')],['Sala',(e.sala||'')+(f.reservaNum?' · reserva '+f.reservaNum:'')],['Responsável',e.responsavel||''],
    ['Equipe',(f.equipe||[]).join(', ')],['Objetivo',f.objetivo||''],['Público-alvo',(f.publico||[]).join(', ')],['Convidados',gl.length?gl.join('\n'):(f.semConvidado?'evento sem convidado':'')],
    ['Inscrição',e.inscricao&&e.inscricao.formId?'Google Forms do app':f.linkExterno?'link externo ('+f.linkExterno+')':''],['Meta de satisfação',f.metaSatisfacao!=null&&f.metaSatisfacao!==''?f.metaSatisfacao+'%':'']]);
  /* Presidência */
  var ap=e.etapas&&e.etapas.aprovacao;doc.secao('Aprovação · Presidência');
  doc.kv([['Ficha aprovada',ap&&(ap.s==='ok'||(ap.em&&!ap.s))?'em '+ddmmaa(dia(String(ap.em||'')))+(ap.por?' por '+ap.por:''):'não registrada']]);
  /* resultado */
  doc.secao('Resultado');
  var ins=insDe(e),pr=num(e.presentes),sw=num(e.semInscricao)||0,tc=ins&&pr!=null?Math.min(1,Math.max(0,pr-sw)/ins):null,v=function(x){return x==null?'':String(x);};
  doc.tabela(['Indicador','Previsto','Real'],[['Inscritos',v(num(e.inscritosMeta)),v(ins)],['Presentes',v(num(e.presentesPrev)),v(pr)],['Comparecimento (inscritos que vieram)','',pct(tc)],
    ['Vieram sem inscrição',v(num(e.semInscricaoPrev)),num(e.semInscricao)!=null?v(num(e.semInscricao)):'automático em breve'],['Membros presentes','',v(num(e.membros))],
    ['Comida','',comidaTxt(e.comida,e.comidaPct)||(num(e.porcoesCompradas)!=null&&num(e.porcoesConsumidas)!=null?e.porcoesConsumidas+' de '+e.porcoesCompradas+' porções':'')],
    ['Duração (min)',v(num(e.duracao)),v(num(e.duracaoReal))],['Atraso (min)','',v(num(e.atraso))]],[.5,.25,.25]);
  var pu=publicoUsp(e);
  if(pu){doc.sub('Público USP (inscritos pelo Forms)');
    doc.kv([['Alunos USP',pu.usp+' de '+pu.total+' inscritos ('+pct(pu.usp/pu.total)+')'],['Fora da USP',pu.nao+' ('+pct(pu.nao/pu.total)+')']]);
    doc.tabela(['Instituto','Inscritos','% dos alunos USP'],pu.inst.map(function(x){return [x[0],String(x[1]),pu.usp?pct(x[1]/pu.usp):'—'];}),[.5,.25,.25]);}
  /* feedback dos participantes */
  var fbk=fbDe(e),mts=num(f.metaSatisfacao);doc.secao('Feedback dos participantes');
  if(fbk&&fbk.total){doc.kv([['Respostas',fbk.total+(ins?' ('+pct(fbk.total/ins)+' dos inscritos)':'')],['Satisfação',pct(fbk.satisfacao)+' das notas foram 4 ou 5'+(mts!=null?' (meta '+mts+'%)':'')]]);
    doc.tabela(['Pergunta','Média','Respostas','Notas (da menor à maior)'],fbk.perguntas.map(function(q){return [q.t,nota(q.media)+' de '+q.max,String(q.n),(q.dist||[]).join(' · ')];}),[.5,.14,.13,.23]);
    if(fbk.comentarios.length){doc.sub('Comentários');fbk.comentarios.forEach(function(c){doc.par('“'+c.txt+'”','F4',9.5);});}}
  else doc.par(fbk?'O Forms de feedback não teve respostas.':'Evento sem o Forms de feedback do app.','F4',9.5,CINZA);
  /* Financeiro */
  var fr=window.__finRel?__finRel(e):null;doc.secao('Financeiro');
  if(fr){var cp=fr.gasto!=null&&pr?fr.gasto/pr:null,meta=typeof P!=='undefined'&&P&&P.metaPresente;
    doc.kv([['Previsto (Planejar)',reais(fr.previsto)],['Verba liberada',reais(fr.verba)],['Gasto',reais(fr.gasto)],['Saldo da verba',fr.verba!=null&&fr.gasto!=null?reais(fr.verba-fr.gasto):''],
      ['Custo por presente',reais(cp)+(meta?' (meta '+reais(meta)+')':'')],['Orçamento validado',fr.validado?'em '+ddmmaa(dia(fr.validado.em))+(fr.validado.por?' por '+fr.validado.por:''):'não validado']]);
    doc.sub('Orçamento por item');
    doc.tabela(['Tipo','Descrição','Fornecedor','Fonte','Aprovado','Gasto'],fr.itens.map(function(x){return [x.tipo,x.desc,x.forn,x.fonte,reais(x.valor),reais(x.gasto)];}),[.13,.25,.2,.14,.14,.14]);
    doc.sub('Gastos lançados');
    doc.tabela(['Data','Descrição','Tipo','Valor','Pagamento','Comprovante'],fr.gastos.map(function(g){return [ddmmaa(g.data),g.desc,g.tipo,reais(g.valor),g.pag||'—',g.comp==null?'—':g.comp?'sim':'não'];}),[.13,.29,.14,.14,.15,.15]);}
  else doc.par('Sem dados do Financeiro.','F4',9.5,CINZA);
  /* Marketing */
  var mk=window.__mktRel?__mktRel(e):null;doc.secao('Divulgação · Marketing');
  if(mk){var b=mk.briefing;
    doc.kv([['Briefing',b?'enviado em '+ddmmaa(dia(b.em))+(b.por?' por '+b.por:'')+(b.atEm&&b.atEm>b.em?' · atualizado em '+ddmmaa(dia(b.atEm)):''):'não enviado'],
      ['Mensagem principal',b?b.mensagem:''],['Precisa de arte',b?b.artes:''],['Pasta de materiais',b?b.pasta:''],['Observações',b?b.obs:''],
      ['Divulgação feita',mk.feita?'em '+ddmmaa(dia(mk.feita.em))+(mk.feita.por?' por '+mk.feita.por:''):'não marcada'],
      ['Bastidores',mk.bastidores.quem||'a definir'],['Convidado no LinkedIn',mk.bastidores.linkedin],
      ['Autorização de imagem',aut?aut.sim+' de '+aut.total+' inscritos autorizaram'+(aut.nao?' · '+aut.nao+' não autorizaram':''):'sem Forms do app']]);
    var po=[];mk.canais.forEach(function(c){c.posts.forEach(function(p){po.push([c.nome+(c.resp?' ('+prim(c.resp)+')':''),p.mom,p.oque,ddmmaa(p.data),p.pub?'sim':'não']);});});
    doc.sub('Plano de divulgação');doc.tabela(['Canal','Momento','O que','Data','Publicado'],po,[.22,.13,.37,.14,.14]);}
  else doc.par('Sem dados do Marketing.','F4',9.5,CINZA);
  /* checklist */
  doc.secao('Checklist');
  var ps=window.__pontosDe?__pontosDe(e).filter(function(x){return x.k!=='pos';}):[];
  doc.tabela(['Ponto','Área','Prazo','Situação'],ps.map(function(x){var at=x.feito&&x.em&&x.prazo&&dia(x.em)>x.prazo;
    return [x.n,x.a,ddmmaa(x.prazo),x.feito?'feito'+(x.em?' em '+ddmmaa(dia(x.em)):'')+(x.por?' por '+prim(x.por):'')+(at?' (com atraso)':''):x.s==='andamento'?'em andamento':'não feito'];}),[.4,.15,.15,.3]);
  /* pós-evento */
  doc.secao('Pós-evento · Eventos');
  TXT.forEach(function(t){doc.sub(t[1]);doc.par(pe[t[0]]||'—');});
  doc.sub('Contatos a manter');
  var cts=Object.keys(pe.contatos||{}).filter(function(i){return pe.contatos[i].manter||pe.contatos[i].coment;}).map(function(i){var g=gDe(i),c=pe.contatos[i];return '• '+(g?g.nome:'convidado')+(c.manter?' · manter contato':'')+(c.coment?' · '+c.coment:'');});
  doc.par(cts.concat(pe.outros?['• '+pe.outros]:[]).join('\n')||'Nenhum marcado.');
  return doc.blob('Relatório final · '+nome);}
window.__pdfRelatorio=pdfRelatorio; /* para testes */

/* ----- abrir ----- */
window.__abrirPos=function(id){if(!$('view-base')||$('view-base').hidden){var b=document.querySelector('.side .sitem[data-alvo="base"]');if(b)b.click();}
  painelAbrir({sec:'view-base',chave:'pos:'+id,montar:function(){return montarPos(id);},foco:'#pr-presentes',depois:function(dr){dr._posId=id;if(dr._posLig)return;dr._posLig=1;
    function mexeu(){var r=RP[dr._posId];if(!r)return;r.sujo=true;r.msg='';var m=dr.querySelector('#pos-m');if(m)m.textContent='Alterações não salvas.';}
    dr.addEventListener('input',function(ev){var t=ev.target,r=RP[dr._posId];if(!r||!t.dataset)return;
      if(t.dataset.pr){r.res[t.dataset.pr]=t.value;mexeu();}else if(t.dataset.pcpct){r.comPct=t.value;mexeu();}else if(t.dataset.pt){r[t.dataset.pt]=t.value;mexeu();}
      else if(t.dataset.pcm){(r.contatos[t.dataset.pcm]=r.contatos[t.dataset.pcm]||{manter:false,coment:''}).coment=t.value;mexeu();}});
    dr.addEventListener('change',function(ev){var t=ev.target,r=RP[dr._posId];if(!r||!t.dataset)return;
      if(t.dataset.pck){(r.contatos[t.dataset.pck]=r.contatos[t.dataset.pck]||{manter:false,coment:''}).manter=t.checked;mexeu();}
      else if(t.dataset.pcom){r.com=t.value;if(t.value!=='faltou'&&t.value!=='sobrou')r.comPct='';mexeu();redesenha();}});
    dr.addEventListener('click',function(ev){var id2=dr._posId;if(!id2||!RP[id2]||RP[id2].ocup)return;
      if(ev.target.closest('#pos-salvar'))salvar(id2,false);else if(ev.target.closest('#pos-gerar'))salvar(id2,true);});}});};
/* ================= RELATÓRIO FEEDBACK CONVIDADO =================
   Um PDF por convidado do evento, para a diretoria mandar a ele: agradecimento, público (inscritos, presentes, comparecimento),
   público USP por instituto e as notas do Forms de feedback, com só os comentários que a pessoa marcar e um recado opcional.
   Cada PDF fica em Documentos, na pasta do evento. eventos/{id}.relConvidado = {comentarios:[texto], recado, em, por,
   docs:{convidadoId:{docId, assetId, versao, em}}}. Pode gerar de novo (o Forms de feedback recebe respostas até 30 dias
   depois do evento): atualiza o mesmo documento, com nova versão. Não mexe no evento fechado pelo relatório final. */
var RC={};
function rcRasc(e){if(!RC[e.id]){var x=e.relConvidado||{};RC[e.id]={sel:(x.comentarios||[]).slice(),recado:x.recado||'',msg:'',ocup:false};}return RC[e.id];}
function montarFc(id){var e=evDe(id);if(!e)return null;var r=rcRasc(e),ed=podeEd(),fb=fbDe(e),x=e.relConvidado||{},gl=convIds(e),c='';
  c+='<p class="note" style="margin:0 0 10px">Um PDF para cada convidado, com o agradecimento da Feashion, o público do evento, quantos eram alunos da USP e de quais institutos e as notas do Forms de feedback. Os comentários só entram se forem marcados. O PDF fica em <b>Documentos</b>, na pasta do evento, para a diretoria mandar ao convidado.</p>';
  var fh;
  if(!fb)fh='<p class="note" style="margin:0">Este evento não tem o Forms de feedback do app: o PDF sai só com o público.</p>';
  else if(!fb.total)fh='<p class="note" style="margin:0">O Forms de feedback ainda não tem respostas.</p>';
  else fh=dl([['Respostas',String(fb.total)],['Satisfação',pct(fb.satisfacao)+' <span class="note">notas 4 e 5</span>']])+qLista(fb)+
    (e.feedback&&e.feedback.aberto?'<p class="note" style="margin:6px 0 0">O Forms ainda recebe respostas (até 30 dias depois do evento): dá para gerar de novo depois.</p>':'');
  c+=blk('Notas do feedback',fh);
  var cs=fb?fb.comentarios:[],ch;
  if(!cs.length)ch='<p class="note" style="margin:0">Nenhum comentário no Forms de feedback.</p>';
  else if(ed)ch='<p class="note" style="margin:0 0 6px">Marque os que vão para o convidado (<span id="fc-n">'+r.sel.filter(function(t){return cs.some(function(k){return k.txt===t;});}).length+'</span> marcados).</p>'+
    cs.map(function(k,i){return '<label class="check fc-c"><input type="checkbox" data-fcc="'+i+'"'+(r.sel.indexOf(k.txt)>=0?' checked':'')+'><span>'+esc(k.txt)+'</span></label>';}).join('');
  else{var so=cs.filter(function(k){return r.sel.indexOf(k.txt)>=0;});ch=so.length?so.map(function(k){return '<p style="margin:0 0 4px">“'+esc(k.txt)+'”</p>';}).join(''):'<p class="note" style="margin:0">Nenhum comentário escolhido.</p>';}
  c+=blk('Comentários',ch);
  c+=blk('Recado da diretoria',ed?'<div class="field"><label for="fc-recado">Recado ao convidado <span class="rq opt">opcional · entra depois do agradecimento</span></label><textarea id="fc-recado" data-fcr="1" rows="3" maxlength="800">'+esc(r.recado)+'</textarea></div>'
    :(r.recado?'<p style="margin:0;white-space:pre-wrap">'+esc(r.recado)+'</p>':'<p class="note" style="margin:0">Sem recado.</p>'));
  var ph=gl.length?gl.map(function(g0){var g=gDe(g0),d=(x.docs||{})[g0];return '<p style="margin:0 0 6px"><b>'+esc(g?g.nome:'convidado removido da base')+'</b> · '+
    (d&&d.assetId?'<a href="/_blob/'+esc(d.assetId)+'" class="pos-pdf">Abrir o PDF</a> <span class="note">gerado em '+ddmm(dia(d.em))+(d.versao>1?' · versão '+d.versao:'')+'</span>':'<span class="note">ainda não gerado</span>')+'</p>';}).join('')
    :'<p class="note" style="margin:0">Evento sem convidado na ficha: não há para quem gerar.</p>';
  c+=blk('PDFs',ph);
  var rod='';
  if(ed&&gl.length)rod='<div class="btns"><button type="button" class="btn" id="fc-gerar"'+(r.ocup?' disabled':'')+'>'+(x.em?'Gerar de novo':gl.length>1?'Gerar os '+gl.length+' PDFs':'Gerar o PDF')+'</button><span class="msg" id="fc-m" role="status">'+esc(r.msg)+'</span></div>';
  return {titulo:'Feedback ao convidado · '+(e.nome||'Evento'),sub:dataLonga(e)+(e.sala?' · '+esc(e.sala):''),corpo:c,rodape:rod};}
function redesenhaFc(){var a=document.activeElement;if(a&&a.blur&&a.closest&&a.closest('#view-base .tpanel'))a.blur();painelAtualizar('view-base');}
function gerarFc(id){var e=evDe(id);if(!e||!db)return;var r=rcRasc(e),q=quem(),gl=convIds(e),x=e.relConvidado||{},velhos=x.docs||{},novos={};if(!gl.length)return;
  var cs=(fbDe(e)||{comentarios:[]}).comentarios.map(function(k){return k.txt;}).filter(function(t){return r.sel.indexOf(t)>=0;}),rec=String(r.recado||'').trim().slice(0,800);
  r.ocup=true;r.msg='Gerando…';redesenhaFc();
  var p=Promise.resolve();
  gl.forEach(function(gid){p=p.then(function(){var g=gDe(gid),blob=pdfConvidado(e,g,cs,rec);
    return window.claude.use('assets').then(function(api){if(!api)throw {code:'sem'};return api.upload(blob,{type:'application/pdf'});}).then(function(upl){var d0=velhos[gid]||{},vs=(+d0.versao||0)+1,url='/_blob/'+upl.id;
      var d={nome:('Feedback ao convidado · '+(g?g.nome:'Convidado')+' · '+(e.nome||'Evento')+' ('+ddmmaa(e.data)+')').slice(0,120),tipo:'PDF',versao:'v'+vs,resp:q.por,
        resumo:'Gerado pelo app para mandar ao convidado: agradecimento, público, público USP e notas do Forms de feedback.',eventos:[id],area:'Eventos',link:'',arquivo:url,assetId:upl.id,url:url};
      var existe=d0.docId&&docs.some(function(z){return z.id===d0.docId;});
      return (existe?db.doc('documentos/'+d0.docId).update(d).then(function(){return d0.docId;}):db.collection('documentos').add(Object.assign({criadoEm:q.em},d)).then(function(z){return z.id;}))
        .then(function(docId){novos[gid]={docId:docId,assetId:upl.id,versao:vs,em:q.em};});});});});
  p.then(function(){return db.doc('eventos/'+id).update({relConvidado:{comentarios:cs.slice(0,150),recado:rec,em:q.em,por:q.por,docs:Object.assign({},velhos,novos)}});})
    .then(function(){r.msg=gl.length>1?'PDFs gerados: estão em Documentos, na pasta do evento.':'PDF gerado: está em Documentos, na pasta do evento.';},
      function(err){r.msg=err&&err.code==='sem'?'Não foi possível guardar o PDF: entre de novo no app e tente outra vez.':'Não foi possível gerar o PDF.';})
    .then(function(){r.ocup=false;redesenhaFc();});}
function pdfConvidado(e,g,cs,recado){var nome=e.nome||'Evento',gn=g?g.nome:'Convidado',pn=String(gn).trim().split(/\s+/)[0];
  var doc=criarPdf('Feashion · Feedback do evento · '+nome.slice(0,60));
  doc.capa('Feedback do evento',nome,[dataLonga(e),e.hora,e.sala].filter(Boolean).join(' · '),'Para '+gn+(g&&(g.cargo||g.empresa)?' · '+[g.cargo,g.empresa].filter(Boolean).join(', '):''));
  doc.par('Olá, '+pn+'!',null,10.5);
  doc.par('Muito obrigado por ter participado do evento '+nome+' com a Feashion. Reunimos aqui como foi o encontro: quantas pessoas vieram, quem eram e como o público avaliou o evento.',null,10.5);
  if(recado)doc.par(recado,null,10.5);
  doc.par('Diretoria de Eventos · Feashion','F4',10,CINZA);
  var ins=insDe(e),pr=num(e.presentes),sw=num(e.semInscricao)||0,tc=ins&&pr!=null?Math.min(1,Math.max(0,pr-sw)/ins):null;
  doc.secao('Público');
  doc.kv([['Inscritos',ins!=null?String(ins):''],['Presentes',pr!=null?String(pr):''],['Comparecimento',tc!=null?pct(tc)+' dos inscritos vieram':'']]);
  var pu=publicoUsp(e);
  if(pu){doc.secao('Quem estava lá');
    doc.kv([['Alunos USP',pu.usp+' de '+pu.total+' inscritos ('+pct(pu.usp/pu.total)+')'],['Fora da USP',pu.nao+' ('+pct(pu.nao/pu.total)+')']]);
    if(pu.inst.length)doc.tabela(['Instituto','Inscritos','% dos alunos USP'],pu.inst.map(function(x){return [x[0],String(x[1]),pu.usp?pct(x[1]/pu.usp):'—'];}),[.5,.25,.25]);}
  var fb=fbDe(e);
  if(fb&&fb.total){doc.secao('Avaliação do público');
    doc.kv([['Respostas',fb.total+(ins?' ('+pct(fb.total/ins)+' dos inscritos)':'')],['Satisfação',pct(fb.satisfacao)+' das notas foram 4 ou 5, numa escala de 1 a 5']]);
    doc.tabela(['Pergunta','Média','Respostas'],fb.perguntas.map(function(x){return [x.t,nota(x.media)+' de '+x.max,String(x.n)];}),[.64,.18,.18]);}
  if(cs.length){doc.secao('O que o público disse');cs.forEach(function(t){doc.par('“'+t+'”','F4',10);});}
  return doc.blob('Feedback do evento · '+nome);}
window.__pdfConvidado=pdfConvidado; /* para testes */
window.__abrirFbConv=function(id){if(!$('view-base')||$('view-base').hidden){var b=document.querySelector('.side .sitem[data-alvo="base"]');if(b)b.click();}
  painelAbrir({sec:'view-base',chave:'fc:'+id,montar:function(){return montarFc(id);},foco:'#fc-gerar',depois:function(dr){dr._fcId=id;if(dr._fcLig)return;dr._fcLig=1;
    dr.addEventListener('change',function(ev){var t=ev.target;if(!t.dataset||t.dataset.fcc==null)return;var e=evDe(dr._fcId);if(!e)return;var r=rcRasc(e),k=((fbDe(e)||{}).comentarios||[])[+t.dataset.fcc];if(!k)return;
      var i=r.sel.indexOf(k.txt);if(t.checked&&i<0)r.sel.push(k.txt);else if(!t.checked&&i>=0)r.sel.splice(i,1);r.msg='';
      var n=dr.querySelector('#fc-n');if(n)n.textContent=dr.querySelectorAll('[data-fcc]:checked').length;var m=dr.querySelector('#fc-m');if(m)m.textContent='';});
    dr.addEventListener('input',function(ev){var t=ev.target;if(!t.dataset||!t.dataset.fcr)return;var e=evDe(dr._fcId);if(e)rcRasc(e).recado=t.value;});
    dr.addEventListener('click',function(ev){if(!ev.target.closest('#fc-gerar'))return;var e=evDe(dr._fcId);if(!e||rcRasc(e).ocup)return;gerarFc(dr._fcId);});}});};
/* link do e-mail do robô: #posevento=ID */
(function(){var m=/^#posevento=(.+)$/.exec(location.hash||'');if(!m)return;var id=decodeURIComponent(m[1]),n=0;
  (function tenta(){var p=Pm();if(p&&evDe(id)){if(p.podeEm('Eventos').ver)window.__abrirPos(id);return;}if(++n<60)setTimeout(tenta,500);})();})();
})();
