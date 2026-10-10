const CACHE="solidarity-shell-v28";
const ASSETS=["./calendar-tools.js","./collective.js","./collective.css","./assets/paypal-mark.svg","./delivery.js","./notifications.js","./notifications.css","./assets/banner-touch.png","./design-tokens.css","./assets/banner-emblem.svg","./assembly.css","./assembly.js","./community-language.js","./community-translations.json","./role-workspace.js","./appearance.css","./appearance.js","./poll-admin.js",
"./","./index.html","./hub.css","./hub.js","./platform.css","./campaign.html","./inbox-admin.js","./campaign.css","./campaign.js","./campaign-dashboard-locales.js","./campaign-dashboard.js","./events-public.js","./config.js","./locales.js",
"./icon.svg","./manifest.webmanifest","./brand.css","./experience-locales.js","./campaign-insights.js","./assets/red-banner-mark.png","./assets/chart.umd.min.js","./assets/qrcode.min.js",
"./observatory/","./styles.css","./observatory-locales.js","./chart-polish.js","./dashboard-charts.js","./public-core.js","./public-sections.js","./advanced-stats.js","./observatory-extra-charts.js","./chart-tools.js","./consent.js",
"./organizer/","./events-admin.js","./admin.js",
"./report/","./report/report.css","./report/report.js","./me/","./me/me.css","./me/me.js"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(ASSETS.map(a=>c.add(a)))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin||u.search||e.request.method!=="GET"||u.pathname.includes("/api/")||u.hostname.includes("supabase.co")||u.hostname.includes("paypal.com")||u.hostname.includes("jsdelivr.net"))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==="navigate"?caches.match("./index.html"):Response.error()))))
});

self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const target=new URL('./#notifications',self.location.href);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===target.origin){await client.navigate(target.href);return client.focus()}}return self.clients.openWindow(target.href)})())});

self.addEventListener("push",e=>{let p={};try{p=e.data.json()}catch{}e.waitUntil(self.registration.showNotification("The Red Banner Is Raised",{body:typeof p.body==="string"?p.body.slice(0,300):"There is a new update in your signal box.",icon:"./assets/banner-touch.png",tag:typeof p.tag==="string"?p.tag.slice(0,150):"red-banner-updates",data:{url:new URL("./#notifications",self.location.href).href}}))});
