self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{ self.clients.claim(); });
const CACHE='ds-v261';
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith((async()=>{
    try{ return await fetch(e.request); }
    catch{ const cache = await caches.open(CACHE); const m = await cache.match(e.request); return m || Response.error(); }
  })());
});
