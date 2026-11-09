/* Service worker: deixa o app instalável e abre mesmo sem internet (os dados vêm do cache do Firestore). */
var VERSAO='20261108232053';
var CACHE='planejador-'+VERSAO;
var BASE=['./','index.html','config.js','plataforma.js','manifest.webmanifest',
  'vendor/firebase-app-compat.js','vendor/firebase-auth-compat.js','vendor/firebase-firestore-compat.js',
  'vendor/pdf.min.js','vendor/pdf.worker.min.js','icons/icon-192.png','icons/icon-512.png','icons/favicon.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(BASE);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('planejador-')===0&&k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;
  var u=new URL(r.url);if(u.origin!==self.location.origin)return;
  var essencial=r.mode==='navigate'||/\/(index\.html|config\.js|plataforma\.js)?$/.test(u.pathname)||/\.(js|html)$/.test(u.pathname)&&!/\/vendor\//.test(u.pathname);
  if(essencial){
    /* rede primeiro, sem o cache do navegador (o GitHub Pages guarda 10 min), para pegar sempre a versão nova; cache se estiver sem internet */
    e.respondWith(fetch(r.mode==='navigate'?new Request(r.url,{cache:'no-cache',credentials:'same-origin'}):new Request(r,{cache:'no-cache'})).then(function(res){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp);});return res;}).catch(function(){return caches.match(r).then(function(m){return m||caches.match('index.html');});}));
    return;
  }
  e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp);});return res;});}));
});
