self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
const CACHE='dauntless-v2-5';
const CORE=['./','./index.html','./css/style.css','./js/app.js','./js/cloud.js','./js/ui.js','./manifest.webmanifest'];
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(e.request);
    if(hit) return hit;
    try{
      const res=await fetch(e.request);
      cache.put(e.request, res.clone());
      return res;
    }catch(_){ return hit || Response.error(); }
  })());
});
