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
const EXTRA={
 en:{cancelled:"Cancelled",scheduled:"Scheduled",calendar:"Add to calendar",suggested:"Suggested contribution",reference:"PayPal payment note",copy:"Copy note",copied:"Copied",included:"Included in the campaign total",types:{training:"Training",fundraiser:"Fundraiser",community:"Community",workshop:"Workshop",meal:"Meal",performance:"Performance",other:"Event"}},
 fr:{cancelled:"Annulé",scheduled:"Programmé",calendar:"Ajouter au calendrier",suggested:"Contribution suggérée",reference:"Note du paiement PayPal",copy:"Copier la note",copied:"Copié",included:"Inclus dans le total de la campagne",types:{training:"Entraînement",fundraiser:"Collecte",community:"Rencontre",workshop:"Atelier",meal:"Repas",performance:"Spectacle",other:"Événement"}},
 de:{cancelled:"Abgesagt",scheduled:"Geplant",calendar:"Zum Kalender hinzufügen",suggested:"Vorgeschlagener Beitrag",reference:"PayPal-Zahlungsnotiz",copy:"Notiz kopieren",copied:"Kopiert",included:"Im Kampagnenbetrag enthalten",types:{training:"Training",fundraiser:"Spendensammlung",community:"Treffen",workshop:"Workshop",meal:"Essen",performance:"Aufführung",other:"Veranstaltung"}},
 es:{cancelled:"Cancelado",scheduled:"Programado",calendar:"Añadir al calendario",suggested:"Contribución sugerida",reference:"Nota del pago de PayPal",copy:"Copiar nota",copied:"Copiado",included:"Incluido en el total de la campaña",types:{training:"Entrenamiento",fundraiser:"Recaudación",community:"Encuentro",workshop:"Taller",meal:"Comida",performance:"Actuación",other:"Evento"}},
 it:{cancelled:"Annullato",scheduled:"Programmato",calendar:"Aggiungi al calendario",suggested:"Contributo suggerito",reference:"Nota del pagamento PayPal",copy:"Copia nota",copied:"Copiato",included:"Incluso nel totale della campagna",types:{training:"Allenamento",fundraiser:"Raccolta fondi",community:"Incontro",workshop:"Laboratorio",meal:"Pasto",performance:"Spettacolo",other:"Evento"}},
 pt:{cancelled:"Cancelado",scheduled:"Agendado",calendar:"Adicionar ao calendário",suggested:"Contribuição sugerida",reference:"Nota do pagamento PayPal",copy:"Copiar nota",copied:"Copiado",included:"Incluído no total da campanha",types:{training:"Treino",fundraiser:"Angariação de fundos",community:"Encontro",workshop:"Oficina",meal:"Refeição",performance:"Espetáculo",other:"Evento"}},
 nl:{cancelled:"Geannuleerd",scheduled:"Gepland",calendar:"Toevoegen aan agenda",suggested:"Voorgestelde bijdrage",reference:"PayPal-betaalnotitie",copy:"Notitie kopiëren",copied:"Gekopieerd",included:"Inbegrepen in het campagnetotaal",types:{training:"Training",fundraiser:"Inzamelingsactie",community:"Bijeenkomst",workshop:"Workshop",meal:"Maaltijd",performance:"Voorstelling",other:"Evenement"}},
 ar:{cancelled:"ملغى",scheduled:"مجدول",calendar:"إضافة إلى التقويم",suggested:"المساهمة المقترحة",reference:"ملاحظة دفع PayPal",copy:"نسخ الملاحظة",copied:"تم النسخ",included:"مشمول في إجمالي الحملة",types:{training:"تدريب",fundraiser:"جمع التبرعات",community:"لقاء",workshop:"ورشة عمل",meal:"وجبة",performance:"عرض",other:"فعالية"}}
};
Object.keys(UI).forEach(lang=>Object.assign(UI[lang],EXTRA[lang]));
const text=(lang,key)=>UI[lang]?.[key]||UI.en[key]||key;
const localized=(obj,lang)=>obj?.[lang]||obj?.en||obj?.fr||Object.values(obj||{}).find(Boolean)||"";
const parse=x=>{
 if(!String(x?.title_en||"").startsWith(PREFIX))return null;
 try{return {...JSON.parse(x.body_en||"{}"),_recordId:x.id}}catch{return null}
};
function formatDate(iso,lang,timeZone="Europe/Berlin"){
 if(!iso)return null;
 try{return new Intl.DateTimeFormat(lang,{timeZone,weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(iso))}
 catch{return new Date(iso).toLocaleString()}
}
function stats(data,e){
 const rows=(data?.contributions||[]).filter(x=>x.source==="event:"+e.slug&&["confirmed","received","refunded"].includes(x.status));
 const gross=rows.filter(x=>x.status!=="refunded").reduce((n,x)=>n+Number(x.amountCents||0),0);
 const refunds=rows.filter(x=>x.status==="refunded").reduce((n,x)=>n+Number(x.amountCents||0),0);
 return {net:Math.max(0,gross-refunds),supporters:new Set(rows.filter(x=>x.status!=="refunded").map(x=>x.supporterId||x.id)).size};
}
const paymentNote=e=>"E-"+String(e.id||e._recordId).slice(0,8).toUpperCase();
function calendar(e,lang){
 const escape=v=>String(v||"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
 const stamp=iso=>new Date(iso).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Red Banner//Solidarity Events//EN","BEGIN:VEVENT","UID:"+escape(e.id)+"@red-banner","DTSTAMP:"+stamp(new Date()),"DTSTART:"+stamp(e.startsAt)];
 if(e.endsAt)lines.push("DTEND:"+stamp(e.endsAt));
 lines.push("SUMMARY:"+escape(localized(e.title,lang)),"DESCRIPTION:"+escape(localized(e.description,lang)),"LOCATION:"+escape([e.venueName,e.venueAddress].filter(Boolean).join(", ")),"END:VEVENT","END:VCALENDAR");
 const folded=lines.map(line=>{const chunks=[];let s="",bytes=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(bytes+size>73){chunks.push(s);s=" ";bytes=1}s+=c;bytes+=size}chunks.push(s);return chunks.join("\r\n")});
 const url=URL.createObjectURL(new Blob([folded.join("\r\n")+"\r\n"],{type:"text/calendar;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=e.slug+".ics";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(state){
 const sec=$("campaignEvents"),grid=$("eventsGrid");if(!sec||!grid||!state)return;
 const {data,lang,euro}=state;
 const events=(data?.updates||[]).map(parse).filter(Boolean).filter(e=>e.showOnCampaign!==false&&["published","completed","cancelled"].includes(e.status));
 sec.classList.toggle("hidden",!events.length);
 if(!events.length)return;

 $("eventsHeading").textContent=text(lang,"heading");
 $("eventsIntro").textContent=text(lang,"intro");
 $("eventsCount").textContent=events.length+" "+text(lang,events.length===1?"event":"events");
 grid.replaceChildren();

 const payUrl=data.campaign?.paymentUrl||window.KAREN_SUPABASE?.paypalPoolUrl||"https://www.paypal.com/pool/9tfV5v7iJ3";
 events.sort((a,b)=>(a.status==="published"?0:1)-(b.status==="published"?0:1)||(a.type==="training"?-1:0)-(b.type==="training"?-1:0)||String(a.startsAt||"9999").localeCompare(String(b.startsAt||"9999"))).forEach(e=>{
   const st=stats(data,e),card=document.createElement("article");card.className="event-card";
   const top=document.createElement("div");top.className="event-top";
   card.id="event-"+e.slug;
   const badge=document.createElement("span");badge.className="event-type";badge.textContent=UI[lang]?.types?.[e.type]||UI.en.types[e.type]||text(lang,"event");
   const status=document.createElement("span");status.className="event-status "+(e.status||"");status.textContent=text(lang,e.status==="published"?"scheduled":e.status);
   top.append(badge,status);

   const h=document.createElement("h3");h.textContent=localized(e.title,lang);
   const desc=document.createElement("p");desc.textContent=localized(e.description,lang);
   const meta=document.createElement("div");meta.className="event-meta";
   if(e.startsAt){const d=document.createElement("span");d.textContent=formatDate(e.startsAt,lang,e.timeZone||"Europe/Berlin")+(e.endsAt?" – "+new Intl.DateTimeFormat(lang,{timeZone:e.timeZone||"Europe/Berlin",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(e.endsAt)):"")+" · "+(e.timeZone||"Europe/Berlin");meta.append(d)}
   if(e.venueName){const v=document.createElement("span");v.textContent=e.venueName;if(e.venueAddress){const address=document.createElement("small");address.textContent=e.venueAddress;v.append(address)}meta.append(v)}
   if(e.capacity){const c=document.createElement("span");c.textContent="◎ "+text(lang,"capacity")+" "+e.capacity;meta.append(c)}

   const finance=document.createElement("div");finance.className="event-finance";
   const raised=document.createElement("div");raised.innerHTML="<span>"+text(lang,"raised")+"</span><strong>"+euro(st.net/100)+"</strong>";
   const supporters=document.createElement("div");supporters.innerHTML="<span>"+text(lang,"supporters")+"</span><strong>"+st.supporters+"</strong>";
   finance.append(raised,supporters);
   const fundraising=e.fundraising??["training","fundraiser"].includes(e.type);
   if(e.goalCents){
     const goal=document.createElement("div");goal.innerHTML="<span>"+text(lang,"goal")+"</span><strong>"+euro(e.goalCents/100)+"</strong>";finance.append(goal);
   }

   const heading=document.createElement("div");heading.className="event-heading";
   if(e.startsAt){const date=document.createElement("time");date.className="event-date-tile";date.dateTime=e.startsAt;const d=document.createElement("strong"),m=document.createElement("span");d.textContent=new Intl.DateTimeFormat(lang,{timeZone:e.timeZone||"Europe/Berlin",day:"2-digit"}).format(new Date(e.startsAt));m.textContent=new Intl.DateTimeFormat(lang,{timeZone:e.timeZone||"Europe/Berlin",month:"short"}).format(new Date(e.startsAt));date.append(d,m);heading.append(date)}
   heading.append(h);card.append(top,heading,desc,meta);
   if(st.net||e.goalCents){card.append(finance);const note=document.createElement("p");note.className="event-ledger-note";note.textContent=text(lang,"included");card.append(note)}
   if(e.goalCents&&fundraising){
     const progress=document.createElement("div");progress.className="event-progress";
     const fill=document.createElement("i");fill.style.width=Math.min(100,st.net/Number(e.goalCents)*100)+"%";progress.append(fill);progress.setAttribute("role","progressbar");progress.setAttribute("aria-label",text(lang,"goal"));progress.setAttribute("aria-valuenow",String(Math.min(100,Math.round(st.net/Number(e.goalCents)*100))));progress.setAttribute("aria-valuemin","0");progress.setAttribute("aria-valuemax","100");card.append(progress);
   }

   if(e.status==="published"&&fundraising&&!["draft","closed","archived"].includes(data.campaign?.status)){
     if(e.suggestedCents){const suggestion=document.createElement("p");suggestion.textContent=text(lang,"suggested")+": "+euro(e.suggestedCents/100);card.append(suggestion)}
     const reference=document.createElement("div");reference.className="event-reference";
     const note=document.createElement("span");note.textContent=text(lang,"reference")+": "+paymentNote(e);
     const copy=document.createElement("button");copy.type="button";copy.textContent=text(lang,"copy");copy.onclick=async()=>{try{await navigator.clipboard.writeText(paymentNote(e));copy.textContent=text(lang,"copied")}catch{const range=document.createRange();range.selectNodeContents(note);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}};
     reference.append(note,copy);const details=document.createElement("details"),summary=document.createElement("summary");details.className="event-payment-details";summary.textContent=text(lang,"reference");details.append(summary,reference);card.append(details);
     const pay=document.createElement("a");pay.className="event-pay";pay.href=payUrl;pay.target="_blank";pay.rel="noopener noreferrer";pay.textContent=text(lang,"contribute");card.append(pay);
   }
   if(e.venueAddress){const directions=document.createElement("a");directions.className="event-calendar";directions.href="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(e.venueName+", "+e.venueAddress);directions.target="_blank";directions.rel="noopener noreferrer";directions.textContent=state.t("trainingDirections");card.append(directions)}
   if(e.startsAt&&e.status==="published"){const button=document.createElement("button");button.className="event-calendar";button.type="button";button.textContent=text(lang,"calendar");button.onclick=()=>calendar(e,lang);card.append(button)}
   if(e.status==="published"){const share=document.createElement("button");share.type="button";share.className="event-calendar";share.textContent=state.t("shareEvent");share.onclick=async()=>{const url=new URL("./",location.href);url.hash=card.id;try{if(navigator.share)await navigator.share({title:localized(e.title,lang),text:formatDate(e.startsAt,lang,e.timeZone),url:url.href});else{await navigator.clipboard.writeText(url.href);share.textContent=state.t("shared")}}catch(err){if(err.name!=="AbortError"){share.textContent=url.href}}};card.append(share)}
   grid.append(card);
 });
}
window.addEventListener("rb:campaign-data",e=>render(e.detail));
window.addEventListener("load",()=>{if(window.RBCampaignState)setTimeout(()=>render(window.RBCampaignState),80)});
window.RBEventsPublic={render,stats,parse,localized,paymentNote};
})();
