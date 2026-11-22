const CACHE='ecoute-interieure-v16-original-colors';
const FILES=['./practice-timer.js?v=1.1.2','../vendor/supabase-2.95.3.js','../piano-sync.js?v=1.0.0','./','./index.html','./style.css?v=original-1','./app.js?v=1.1.0','./core.mjs?v=1.0.7','./audio.mjs?v=1.0.3','./program.js','./icon-32.png?v=club-jazz-1','./apple-touch-icon.png?v=club-jazz-1','./icon-192.png?v=club-jazz-1','./manifest.webmanifest?v=club-jazz-1'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ecoute-interieure-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))))});







