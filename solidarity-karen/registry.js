(()=> {
function h(s){let x=2166136261>>>0;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
window.SolidarityRegistry={
 render(opts){
  const c=opts.container;
  if(!c)return;
  c.replaceChildren();
  const rows=(opts.supporters||[]).slice().sort((a,b)=>h(String(a.supporterId)+opts.nonce)-h(String(b.supporterId)+opts.nonce));
  if(!rows.length){c.textContent=opts.t("noData");return}
  rows.forEach(x=>{
   const item=document.createElement("article");item.className="supporter-chip";
   const av=document.createElement("span");av.className="avatar";av.textContent=x.publicNameConsent&&x.name?x.name.slice(0,1).toUpperCase():"#";
   const body=document.createElement("div");
   const id=document.createElement("strong");id.textContent=x.supporterId||"S-????????";
   const meta=document.createElement("span");
   const label=x.publicNameConsent&&x.name?x.name:opts.t("anonymous");
   meta.textContent=label+" · "+String(x.eventCount||0)+" "+opts.t("events")+" · "+opts.t("net")+" "+opts.euro(Number(x.netCents||0)/100);
   body.append(id,meta);item.append(av,body);c.append(item);
  })
 }
};
})();