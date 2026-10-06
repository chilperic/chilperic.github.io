(()=> {
const PREFIX="__EVENT__:";
const $=id=>document.getElementById(id);
const UI={
 en:{heading:"Solidarity events",intro:"Meet, move, learn and build material support together.",events:"events",event:"event",raised:"raised",goal:"goal",supporters:"supporters",contribute:"Contribute via PayPal",draft:"draft",completed:"completed",capacity:"capacity"},
 fr:{heading:"Événements solidaires",intro:"Se retrouver, bouger, apprendre et construire ensemble un soutien matériel.",events:"événements",event:"événement",raised:"collectés",goal:"objectif",supporters:"soutiens",contribute:"Contribuer via PayPal",draft:"brouillon",completed:"terminé",capacity:"capacité"},
 de:{heading:"Solidaritätsveranstaltungen",intro:"Zusammenkommen, bewegen, lernen und materielle Unterstützung gemeinsam aufbauen.",events:"Veranstaltungen",event:"Veranstaltung",raised:"gesammelt",goal:"Ziel",supporters:"Unterstützende",contribute:"Mit PayPal beitragen",draft:"Entwurf",completed:"abgeschlossen",capacity:"Kapazität"},
 es:{heading:"Eventos solidarios",intro:"Encontrarnos, movernos, aprender y construir apoyo material juntos.",events:"eventos",event:"evento",raised:"recaudado",goal:"objetivo",supporters:"apoyos",contribute:"Contribuir con PayPal",draft:"borrador",completed:"completado",capacity:"capacidad"},
 it:{heading:"Eventi solidali",intro:"Incontrarsi, muoversi, imparare e costruire insieme sostegno materiale.",events:"eventi",event:"evento",raised:"raccolto",goal:"obiettivo",supporters:"sostenitori",contribute:"Contribuisci con PayPal",draft:"bozza",completed:"completato",capacity:"capienza"},
 pt:{heading:"Eventos solidários",intro:"Encontrar, mover, aprender e construir apoio material em conjunto.",events:"eventos",event:"evento",raised:"arrecadado",goal:"meta",supporters:"apoiadores",contribute:"Contribuir com PayPal",draft:"rascunho",completed:"concluído",capacity:"capacidade"},
 nl:{heading:"Solidariteitsevenementen",intro:"Samenkomen, bewegen, leren en materiële steun samen opbouwen.",events:"evenementen",event:"evenement",raised:"ingezameld",goal:"doel",supporters:"supporters",contribute:"Bijdragen via PayPal",draft:"concept",completed:"voltooid",capacity:"capaciteit"},
 ar:{heading:"فعاليات التضامن",intro:"نلتقي ونتحرك ونتعلم ونبني الدعم المادي معًا.",events:"فعاليات",event:"فعالية",raised:"تم جمعه",goal:"الهدف",supporters:"الداعمون",contribute:"المساهمة عبر PayPal",draft:"مسودة",completed:"مكتمل",capacity:"السعة"}
};
const text=(lang,key)=>UI[lang]?.[key]||UI.en[key]||key;
const localized=(obj,lang)=>obj?.[lang]||obj?.en||obj?.fr||Object.values(obj||{}).find(Boolean)||"";
const parse=x=>{
 if(!String(x?.title_en||"").startsWith(PREFIX))return null;
 try{return {...JSON.parse(x.body_en||"{}"),_recordId:x.id}}catch{return null}
};
function formatDate(iso,lang){
 if(!iso)return null;
 try{return new Intl.DateTimeFormat(lang,{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso))}
 catch{return new Date(iso).toLocaleString()}
}
function stats(data,e){
 const rows=(data?.contributions||[]).filter(x=>x.source==="event:"+e.slug&&["confirmed","received","refunded"].includes(x.status));
 const gross=rows.filter(x=>x.status!=="refunded").reduce((n,x)=>n+Number(x.amountCents||0),0);
 const refunds=rows.filter(x=>x.status==="refunded").reduce((n,x)=>n+Number(x.amountCents||0),0);
 return {net:Math.max(0,gross-refunds),supporters:new Set(rows.map(x=>x.supporterId||x.id)).size};
}
function render(state){
 const sec=$("campaignEvents"),grid=$("eventsGrid");if(!sec||!grid||!state)return;
 const {data,lang,euro}=state;
 const events=(data?.updates||[]).map(parse).filter(Boolean).filter(e=>e.showOnCampaign!==false&&["published","completed"].includes(e.status));
 sec.classList.toggle("hidden",!events.length);
 if(!events.length)return;

 $("eventsHeading").textContent=text(lang,"heading");
 $("eventsIntro").textContent=text(lang,"intro");
 $("eventsCount").textContent=events.length+" "+text(lang,events.length===1?"event":"events");
 grid.replaceChildren();

 const payUrl=data.campaign?.paymentUrl||window.KAREN_SUPABASE?.paypalPoolUrl||"https://www.paypal.com/pool/9tfV5v7iJ3";
 events.sort((a,b)=>String(a.startsAt||"9999").localeCompare(String(b.startsAt||"9999"))).forEach(e=>{
   const st=stats(data,e),card=document.createElement("article");card.className="event-card";
   const top=document.createElement("div");top.className="event-top";
   const badge=document.createElement("span");badge.className="event-type";badge.textContent=(e.type||"event").toUpperCase();
   const status=document.createElement("span");status.className="event-status "+(e.status||"");status.textContent=e.status==="completed"?text(lang,"completed"):formatDate(e.startsAt,lang)||"";
   top.append(badge,status);

   const h=document.createElement("h3");h.textContent=localized(e.title,lang);
   const desc=document.createElement("p");desc.textContent=localized(e.description,lang);
   const meta=document.createElement("div");meta.className="event-meta";
   if(e.startsAt){const d=document.createElement("span");d.textContent="◷ "+formatDate(e.startsAt,lang);meta.append(d)}
   if(e.venueName){const v=document.createElement("span");v.textContent="⌖ "+e.venueName;meta.append(v)}
   if(e.capacity){const c=document.createElement("span");c.textContent="◎ "+text(lang,"capacity")+" "+e.capacity;meta.append(c)}

   const finance=document.createElement("div");finance.className="event-finance";
   const raised=document.createElement("div");raised.innerHTML="<span>"+text(lang,"raised")+"</span><strong>"+euro(st.net/100)+"</strong>";
   const supporters=document.createElement("div");supporters.innerHTML="<span>"+text(lang,"supporters")+"</span><strong>"+st.supporters+"</strong>";
   finance.append(raised,supporters);
   if(e.goalCents){
     const goal=document.createElement("div");goal.innerHTML="<span>"+text(lang,"goal")+"</span><strong>"+euro(e.goalCents/100)+"</strong>";finance.append(goal);
   }

   if(e.goalCents){
     const progress=document.createElement("div");progress.className="event-progress";
     const fill=document.createElement("i");fill.style.width=Math.min(100,st.net/Number(e.goalCents)*100)+"%";progress.append(fill);card.append(top,h,desc,meta,finance,progress);
   }else card.append(top,h,desc,meta,finance);

   if(e.status==="published"){
     const pay=document.createElement("a");pay.className="event-pay";pay.href=payUrl;pay.target="_blank";pay.rel="noopener noreferrer";pay.textContent=text(lang,"contribute")+" ↗";card.append(pay);
   }
   grid.append(card);
 });
}
window.addEventListener("rb:campaign-data",e=>render(e.detail));
window.addEventListener("load",()=>{if(window.RBCampaignState)setTimeout(()=>render(window.RBCampaignState),80)});
})();