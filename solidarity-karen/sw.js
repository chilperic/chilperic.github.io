const CACHE="solidarity-shell-v11";
const ASSETS=[
"./","./index.html","./campaign.css","./campaign.js","./config.js","./locales.js",
"./icon.svg","./manifest.webmanifest",
"./observatory/","./styles.css","./dashboard-charts.js","./public-core.js","./public-sections.js","./advanced-stats.js","./consent.js",
"./organizer/","./admin.js",
"./report/","./report/report.css","./report/report.js","./me/","./me/me.css","./me/me.js"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.pathname.includes("/api/")||u.hostname.includes("supabase.co")||u.hostname.includes("paypal.com")||u.hostname.includes("jsdelivr.net"))return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))
});