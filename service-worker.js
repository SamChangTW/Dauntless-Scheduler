self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>self.clients.claim());
const CACHE='dauntless-v2-3';
const CORE=['./','./index.html','./app.js','./manifest.webmanifest'];
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req);
    if(hit) return hit;
    try{
      const res=await fetch(req);
      cache.put(req,res.clone());
      return res;
    }catch(_){ return hit||Response.error(); }
  })());
});