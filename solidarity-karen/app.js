(()=> {
const C=window.KAREN_SUPABASE;
const $=id=>document.getElementById(id);
const NS="http://www.w3.org/2000/svg";
let lang=localStorage.getItem("solidarity_lang")==="fr"?"fr":"en";
let fund=null;
let shuffleNonce=Number(sessionStorage.getItem("supporter_shuffle")||Date.now());

const I18N={
 en:{
  brandSub:"Collective care, transparent accounting",organizer:"Organizer",netRaised:"Net raised",goalProgress:"goal progress",supporters:"supporters",remaining:"remaining",
  payPalPool:"Contribute with PayPal",payNote:"Opens the collective PayPal Pool. Contributions appear in the tracker after verification.",
  trajectoryKicker:"Collective trajectory",trajectoryTitle:"How the fund is moving",lastSevenDays:"last 7 days",cumulativeNet:"Cumulative net fund",netFund:"Net fund",goal:"Goal",
  dailyMovement:"Daily movement",medianContribution:"Median contribution",participationDays:"Participation days",nextMilestone:"Next milestone",available:"Available balance",
  collectiveProgress:"Collective progress",milestones:"Milestones",peopleNotRankings:"People, not rankings",solidarityWall:"Solidarity wall",
  wallExplain:"Random order by design. No ranking by contribution size.",reshuffle:"Reshuffle",transparentByDesign:"Transparent by design",moneyFlowTitle:"Where the money stands",
  downloadData:"Export",grossRaised:"Gross raised",refunds:"Refunds",used:"Used",raised:"Raised",campaignJournal:"Campaign journal",updates:"Updates",
  publicLedger:"Public ledger",viewDetails:"View details",disbursements:"Disbursements",solidarityQuote:"“Solidarity means collectivizing the pain, the joy and the effort.”",
  privacyByDefault:"Privacy by default",noCompetition:"No competition",correctionsVisible:"Corrections stay visible",controlRoom:"Organizer control room",
  controlRoomExplain:"Manage campaigns, people, money, updates and security without redeploying the site."
 },
 fr:{
  brandSub:"Soin collectif, comptabilité transparente",organizer:"Organisateur",netRaised:"Collecte nette",goalProgress:"de l’objectif",supporters:"soutiens",remaining:"restants",
  payPalPool:"Contribuer avec PayPal",payNote:"Ouvre la cagnotte PayPal collective. Les contributions apparaissent après vérification.",
  trajectoryKicker:"Trajectoire collective",trajectoryTitle:"Comment le fonds évolue",lastSevenDays:"7 derniers jours",cumulativeNet:"Fonds net cumulé",netFund:"Fonds net",goal:"Objectif",
  dailyMovement:"Mouvement quotidien",medianContribution:"Contribution médiane",participationDays:"Jours de participation",nextMilestone:"Prochaine étape",available:"Solde disponible",
  collectiveProgress:"Progrès collectif",milestones:"Étapes",peopleNotRankings:"Des personnes, pas un classement",solidarityWall:"Mur de solidarité",
  wallExplain:"Ordre aléatoire par conception. Aucun classement selon le montant.",reshuffle:"Mélanger",transparentByDesign:"Transparent par conception",moneyFlowTitle:"Situation du fonds",
  downloadData:"Exporter",grossRaised:"Collecte brute",refunds:"Remboursements",used:"Utilisé",raised:"Collecté",campaignJournal:"Journal de campagne",updates:"Actualités",
  publicLedger:"Registre public",viewDetails:"Voir les détails",disbursements:"Décaissements",solidarityQuote:"« La solidarité, c’est collectiviser la peine, la joie et l’effort. »",
  privacyByDefault:"Confidentialité par défaut",noCompetition:"Pas de compétition",correctionsVisible:"Corrections visibles",controlRoom:"Espace organisateur",
  controlRoomExplain:"Gérez campagnes, personnes, argent, actualités et sécurité sans redéployer le site."
 }
};

function tr(k){return I18N[lang]?.[k]||I18N.en[k]||k}
function euro(n){return new Intl.NumberFormat(lang==="fr"?"fr-FR":"de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(n||0))}
function dateFmt(v,short=false){
 if(!v)return "—";const d=new Date(String(v).slice(0,10)+"T12:00:00");
 return new Intl.DateTimeFormat(lang==="fr"?"fr-FR":"en-GB",short?{day:"numeric",month:"short"}:{day:"numeric",month:"short",year:"numeric"}).format(d)
}
function escText(v){return String(v??"")}
async function rpc(name,body={}){
 const r=await fetch(C.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:C.key},body:JSON.stringify(body)});
 const txt=await r.text();if(!r.ok)throw Error(txt||"request_failed");return txt?JSON.parse(txt):null
}
function toast(msg){const el=$("toast");if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200)}
function setLanguage(next){lang=next;localStorage.setItem("solidarity_lang",lang);document.documentElement.lang=lang;document.querySelectorAll("[data-i18n]").forEach(el=>{const v=I18N[lang]?.[el.dataset.i18n];if(v)el.textContent=v});$("enBtn").classList.toggle("active",lang==="en");$("frBtn").classList.toggle("active",lang==="fr");if(fund)render(fund)}
function campaignText(c,key){return c?.[key+"_"+lang]||c?.[key+"_en"]||""}
function statusLabel(s){const x={active:["LIVE","EN DIRECT"],goal_reached:["GOAL REACHED","OBJECTIF ATTEINT"],closed:["CLOSED","CLÔTURÉE"],archived:["ARCHIVED","ARCHIVÉE"],draft:["DRAFT","BROUILLON"]};return (x[s]||x.active)[lang==="fr"?1:0]}
function compute(d){
 const rows=(d.contributions||[]).filter(x=>["confirmed","received","refunded"].includes(x.status));
 const gross=rows.filter(x=>x.status!=="refunded").reduce((s,x)=>s+Number(x.amountCents||0),0);
 const refunds=rows.filter(x=>x.status==="refunded").reduce((s,x)=>s+Number(x.amountCents||0),0);
 const net=Math.max(0,gross-refunds);
 const spent=(d.expenses||[]).filter(x=>x.status==="recorded").reduce((s,x)=>s+Number(x.amountCents||0),0);
 const available=Math.max(0,net-spent);
 const target=Number(d.campaign?.targetCents||d.targetCents||0);
 const pct=target?Math.min(100,net/target*100):0;
 return {rows,gross,refunds,net,spent,available,target,pct}
}
function seedHash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function supporterSort(a,b){return seedHash(String(a.id)+":"+shuffleNonce)-seedHash(String(b.id)+":"+shuffleNonce)}

function svgEl(tag,attrs={},text){
 const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e
}
function niceMax(v){if(v<=0)return 10000;const p=10**Math.floor(Math.log10(v));return Math.ceil(v/p)*p}
function trajectoryPoints(rows){
 let cumulative=0;
 return rows.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).map((x,i)=>{
  cumulative+=x.status==="refunded"?-Number(x.amountCents||0):Number(x.amountCents||0);
  cumulative=Math.max(0,cumulative);
  return {i,date:x.date,value:cumulative,delta:(x.status==="refunded"?-1:1)*Number(x.amountCents||0),status:x.status}
 })
}
function smoothPath(points){
 if(points.length<2)return "";
 let d="M "+points[0][0]+" "+points[0][1];
 for(let i=1;i<points.length;i++){
  const [x0,y0]=points[i-1],[x1,y1]=points[i],mx=(x0+x1)/2;
  d+=" C "+mx+" "+y0+", "+mx+" "+y1+", "+x1+" "+y1
 }
 return d
}
function renderTrajectory(d,m){
 const svg=$("trajectoryChart");if(!svg)return;svg.replaceChildren();
 const W=900,H=360,L=56,R=24,T=24,B=48,iw=W-L-R,ih=H-T-B;
 const pts=trajectoryPoints(m.rows);
 const milestones=(d.milestones||[]).map(x=>Number(x.thresholdCents||0));
 const ymax=niceMax(Math.max(m.target,...milestones,...pts.map(x=>x.value),1));
 const x=i=>pts.length<=1?L+iw*.5:L+(i/(pts.length-1))*iw;
 const y=v=>T+ih-(v/ymax)*ih;

 const defs=svgEl("defs");
 const grad=svgEl("linearGradient",{id:"areaGrad",x1:"0",y1:"0",x2:"0",y2:"1"});grad.append(svgEl("stop",{offset:"0%","stop-color":"#b33245","stop-opacity":".28"}),svgEl("stop",{offset:"100%","stop-color":"#b33245","stop-opacity":"0"}));defs.append(grad);svg.append(defs);
 for(let i=0;i<=4;i++){const val=ymax*i/4,yy=y(val);svg.append(svgEl("line",{x1:L,y1:yy,x2:W-R,y2:yy,stroke:"#d1c6b9","stroke-width":"1","stroke-opacity":".65"}));svg.append(svgEl("text",{x:L-8,y:yy+4,"text-anchor":"end","font-size":"11",fill:"#766f68"},euro(val/100)))}
 if(m.target>0){const gy=y(m.target);svg.append(svgEl("line",{x1:L,y1:gy,x2:W-R,y2:gy,stroke:"#d5a44d","stroke-width":"2","stroke-dasharray":"7 7"}));svg.append(svgEl("text",{x:W-R,y:gy-7,"text-anchor":"end","font-size":"11",fill:"#9b722d"},tr("goal")+" "+euro(m.target/100)))}
 (d.milestones||[]).forEach(ms=>{const v=Number(ms.thresholdCents||0);if(!v||v===m.target)return;const yy=y(v);svg.append(svgEl("line",{x1:L,y1:yy,x2:W-R,y2:yy,stroke:"#285a46","stroke-width":"1","stroke-opacity":".35","stroke-dasharray":"3 6"}))});
 if(!pts.length){svg.append(svgEl("text",{x:W/2,y:H/2,"text-anchor":"middle","font-size":"14",fill:"#766f68"},lang==="fr"?"Pas encore de trajectoire.":"No trajectory yet."));return}
 const screen=pts.map((p,i)=>[x(i),y(p.value)]);
 const line=smoothPath(screen);
 const area=line+" L "+screen[screen.length-1][0]+" "+(T+ih)+" L "+screen[0][0]+" "+(T+ih)+" Z";
 svg.append(svgEl("path",{d:area,fill:"url(#areaGrad)"}));
 svg.append(svgEl("path",{d:line,fill:"none",stroke:"#b33245","stroke-width":"5","stroke-linecap":"round","stroke-linejoin":"round"}));
 screen.forEach(([px,py],i)=>{const p=pts[i],refund=p.delta<0;svg.append(svgEl("circle",{cx:px,cy:py,r:refund?6:5,fill:refund?"#8a2636":"#fffaf2",stroke:refund?"#8a2636":"#b33245","stroke-width":"3"}));if(i===0||i===screen.length-1||pts.length<=6)svg.append(svgEl("text",{x:px,y:H-18,"text-anchor":i===0?"start":i===screen.length-1?"end":"middle","font-size":"10",fill:"#766f68"},dateFmt(p.date,true)))});
 $("chartCurrent").textContent=euro(m.net/100)
}
function renderDailyBars(m){
 const svg=$("dailyBars");if(!svg)return;svg.replaceChildren();
 const W=600,H=220,L=40,R=18,T=18,B=38,iw=W-L-R,ih=H-T-B;
 const map=new Map();
 m.rows.forEach(x=>{const day=String(x.date||"").slice(0,10);if(!map.has(day))map.set(day,{in:0,out:0});const obj=map.get(day);if(x.status==="refunded")obj.out+=Number(x.amountCents||0);else obj.in+=Number(x.amountCents||0)});
 const days=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
 if(!days.length){svg.append(svgEl("text",{x:W/2,y:H/2,"text-anchor":"middle","font-size":"13",fill:"#766f68"},lang==="fr"?"Aucun mouvement.":"No movement yet."));return}
 const max=Math.max(...days.flatMap(([,v])=>[v.in,v.out]),1),bw=Math.min(26,iw/days.length*.58);
 const y=v=>T+ih-(v/max)*ih;
 const baseline=T+ih;
 svg.append(svgEl("line",{x1:L,y1:baseline,x2:W-R,y2:baseline,stroke:"#d1c6b9"}));
 days.forEach(([day,v],i)=>{const cx=L+(i+.5)*(iw/days.length);const hin=(v.in/max)*ih,hout=(v.out/max)*ih;svg.append(svgEl("rect",{x:cx-bw-2,y:baseline-hin,width:bw,height:hin,rx:5,fill:"#285a46"}));if(v.out)svg.append(svgEl("rect",{x:cx+2,y:baseline-hout,width:bw,height:hout,rx:5,fill:"#b33245"}));svg.append(svgEl("text",{x:cx,y:H-15,"text-anchor":"middle","font-size":"9",fill:"#766f68"},dateFmt(day,true)))});
 $("activeDays").textContent=days.length+" "+(lang==="fr"?"jours":"days")
}
function renderInsights(d,m){
 const positive=m.rows.filter(x=>x.status!=="refunded"),amounts=positive.map(x=>Number(x.amountCents||0)).sort((a,b)=>a-b);
 const median=amounts.length?(amounts.length%2?amounts[Math.floor(amounts.length/2)]:(amounts[amounts.length/2-1]+amounts[amounts.length/2])/2):0;
 const days=new Set(positive.map(x=>String(x.date||"").slice(0,10)));
 const cutoff=Date.now()-7*86400000,recent=positive.filter(x=>new Date(String(x.date).slice(0,10)+"T12:00:00").getTime()>=cutoff).reduce((s,x)=>s+Number(x.amountCents||0),0);
 const next=(d.milestones||[]).map(x=>({label:(lang==="fr"&&x.label_fr)||x.label_en||"",value:Number(x.thresholdCents||0)})).filter(x=>x.value>m.net).sort((a,b)=>a.value-b.value)[0];
 $("medianContribution").textContent=euro(median/100);$("participationDays").textContent=days.size;$("nextMilestone").textContent=next?(next.label+" · "+euro(next.value/100)):(lang==="fr"?"Objectif atteint":"Goal reached");$("trajectoryDelta").textContent=(recent>=0?"+":"")+euro(recent/100)
}
function renderFlow(m){
 const svg=$("flowChart");if(!svg)return;svg.replaceChildren();
 const W=900,H=240;
 const startX=60,midX=430,endX=800,y=120;
 const total=Math.max(m.net,1),usedFrac=Math.min(.85,m.spent/total),availFrac=Math.min(.85,m.available/total);
 const raisedW=70,usedW=Math.max(18,120*usedFrac),availW=Math.max(18,120*availFrac);
 svg.append(svgEl("path",{d:`M ${startX+raisedW} ${y-42} C 260 ${y-42}, 300 ${y-usedW/2}, ${midX} ${y-usedW/2} L ${midX} ${y+usedW/2} C 300 ${y+usedW/2}, 260 ${y+42}, ${startX+raisedW} ${y+42} Z`,fill:"#b33245",opacity:".78"}));
 svg.append(svgEl("path",{d:`M ${startX+raisedW} ${y+8} C 310 ${y+8}, 560 ${y-availW/2}, ${endX} ${y-availW/2} L ${endX} ${y+availW/2} C 560 ${y+availW/2}, 310 ${y+30}, ${startX+raisedW} ${y+30} Z`,fill:"#285a46",opacity:".8"}));
 svg.append(svgEl("rect",{x:startX,y:y-52,width:raisedW,height:104,rx:12,fill:"#151317"}));
 svg.append(svgEl("rect",{x:midX,y:y-usedW/2,width:72,height:usedW,rx:10,fill:"#b33245"}));
 svg.append(svgEl("rect",{x:endX,y:y-availW/2,width:72,height:availW,rx:10,fill:"#285a46"}));
 svg.append(svgEl("text",{x:startX+raisedW/2,y:y+4,"text-anchor":"middle","font-size":"12",fill:"#fff", "font-weight":"700"},euro(m.net/100)));
 svg.append(svgEl("text",{x:midX+36,y:y+4,"text-anchor":"middle","font-size":"11",fill:"#fff","font-weight":"700"},euro(m.spent/100)));
 svg.append(svgEl("text",{x:endX+36,y:y+4,"text-anchor":"middle","font-size":"11",fill:"#fff","font-weight":"700"},euro(m.available/100)))
}
function renderMilestones(d,m){
 const sec=$("milestonesSection"),wrap=$("milestones");const show=d.campaign?.showMilestones!==false&&(d.milestones||[]).length>0;sec.classList.toggle("hidden",!show);wrap.replaceChildren();if(!show)return;
 (d.milestones||[]).forEach(x=>{const threshold=Number(x.thresholdCents||0),p=threshold?Math.min(100,m.net/threshold*100):0;const card=document.createElement("article");card.className="milestone"+(m.net>=threshold?" done":"");const title=document.createElement("strong");title.textContent=(lang==="fr"&&x.label_fr)||x.label_en||"Milestone";const meta=document.createElement("span");meta.textContent=euro(threshold/100)+" · "+(m.net>=threshold?(lang==="fr"?"atteinte":"reached"):Math.round(p)+"%");const bar=document.createElement("div");bar.className="milestone-bar";const fill=document.createElement("div");fill.style.width=p+"%";bar.append(fill);card.append(title,meta,bar);wrap.append(card)})
}
function renderPeople(d,m){
 const sec=$("supportersSection"),wrap=$("supporterWall");const show=d.campaign?.showSupporters!==false;sec.classList.toggle("hidden",!show);wrap.replaceChildren();if(!show)return;
 const rows=m.rows.filter(x=>x.status!=="refunded");if(!rows.length){wrap.innerHTML='<div class="empty-state">'+(lang==="fr"?"Aucun soutien confirmé.":"No confirmed supporters yet.")+"</div>";return}
 const named=rows.filter(x=>x.publicNameConsent===true&&x.name).slice().sort(supporterSort);
 const anonymousCount=rows.length-named.length;
 const chips=named.map(x=>({kind:"named",row:x}));
 if(anonymousCount>0)chips.push({kind:"anonymous",count:anonymousCount,id:"anonymous"});
 chips.sort((a,b)=>supporterSort(a.row||a,b.row||b));
 chips.forEach(item=>{const publicName=item.kind==="named",name=publicName?item.row.name:(lang==="fr"?item.count+" soutiens anonymes":item.count+" anonymous supporter"+(item.count===1?"":"s"));const chip=document.createElement("div");chip.className="person-chip";const dot=document.createElement("span");dot.className="dot";dot.textContent=publicName?item.row.name.trim().charAt(0).toUpperCase():"•";const text=document.createElement("div");const strong=document.createElement("strong");strong.textContent=name;const meta=document.createElement("span");meta.textContent=publicName?(lang==="fr"?"nom public consenti":"public name by consent"):(lang==="fr"?"identités protégées":"identities protected");text.append(strong,meta);chip.append(dot,text);wrap.append(chip)})
}
function renderLedger(d,m){
 const details=$("ledgerDetails"),wrap=$("ledger");const show=d.campaign?.showLedger!==false;details.classList.toggle("hidden",!show);wrap.replaceChildren();if(!show)return;
 const rows=m.rows.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));if(!rows.length){wrap.innerHTML='<div class="empty-state">'+(lang==="fr"?"Aucune transaction publique.":"No public transactions.")+"</div>";return}
 rows.forEach((x,i)=>{const refund=x.status==="refunded",name=x.publicNameConsent===true&&x.name?x.name:(lang==="fr"?"Anonyme":"Anonymous"),row=document.createElement("div");row.className="ledger-row";const idx=document.createElement("div");idx.className="ledger-index";idx.textContent=String(rows.length-i).padStart(2,"0");const main=document.createElement("div");main.className="ledger-main";const s=document.createElement("strong");s.textContent=name;const meta=document.createElement("div");meta.className="ledger-meta";const dt=document.createElement("span");dt.textContent=dateFmt(x.date);const badge=document.createElement("span");badge.className="badge "+(refund?"refund":"ok");badge.textContent=refund?(lang==="fr"?"remboursé":"refunded"):(lang==="fr"?"confirmé":"confirmed");meta.append(dt,badge);main.append(s,meta);const amt=document.createElement("div");amt.className="ledger-amount"+(refund?" refund":"");amt.textContent=(refund?"−":"")+euro(Number(x.amountCents||0)/100);row.append(idx,main,amt);wrap.append(row)})
}
function renderExpenses(d){
 const details=$("expensesDetails"),wrap=$("expensesList"),rows=(d.expenses||[]).filter(x=>x.status==="recorded"),show=d.campaign?.showExpenses!==false&&rows.length>0;details.classList.toggle("hidden",!show);wrap.replaceChildren();if(!show)return;
 rows.forEach(x=>{const row=document.createElement("div");row.className="expense";const left=document.createElement("div");const strong=document.createElement("strong");strong.textContent=(lang==="fr"&&x.label_fr)||x.label_en||"Expense";const p=document.createElement("p");const note=(lang==="fr"&&x.note_fr)||x.note_en||"";p.textContent=dateFmt(x.spentOn)+(note?" · "+note:"");left.append(strong,p);const amt=document.createElement("div");amt.className="amount";amt.textContent=euro(Number(x.amountCents||0)/100);row.append(left,amt);wrap.append(row)})
}
function renderUpdates(d){
 const sec=$("updatesSection"),wrap=$("updatesList"),rows=d.updates||[],show=d.campaign?.showUpdates!==false&&rows.length>0;sec.classList.toggle("hidden",!show);wrap.replaceChildren();if(!show)return;
 rows.forEach(x=>{const card=document.createElement("article");card.className="update-card";const tm=document.createElement("time");tm.textContent=dateFmt(x.publishedAt);const h=document.createElement("h3");h.textContent=(lang==="fr"&&x.title_fr)||x.title_en||"Update";const p=document.createElement("p");p.textContent=(lang==="fr"&&x.body_fr)||x.body_en||"";card.append(tm,h,p);wrap.append(card)})
}
function render(d){
 fund=d;window.__fund=d;const c=d.campaign||{},m=compute(d);document.body.dataset.theme=c.theme||"assembly";
 document.title=(c.title||"Solidarity Fund")+" · Live";
 $("brandTitle").textContent=c.title||"Solidarity Fund";$("campaignKicker").textContent=c.beneficiary?(lang==="fr"?"Pour ":"For ")+c.beneficiary:"SOLIDARITY";$("campaignTitle").textContent=c.subtitle||c.title||"We carry it together.";$("campaignStory").textContent=campaignText(c,"story")||(lang==="fr"?"Fonds collectif de solidarité.":"Collective solidarity fund.");$("campaignStatus").textContent=statusLabel(c.status);$("lastUpdated").textContent=(lang==="fr"?"Mis à jour ":"Updated ")+dateFmt(d.updated);
 $("raisedTotal").textContent=euro(m.net/100);$("goalText").textContent=(lang==="fr"?"sur ":"of ")+euro(m.target/100);$("progressPct").textContent=(Math.round(m.pct*10)/10)+"%";$("supporterCount").textContent=m.rows.filter(x=>x.status!=="refunded").length;$("remainingAmount").textContent=euro(Math.max(0,m.target-m.net)/100);$("progressLine").style.width=m.pct+"%";
 $("grossRaised").textContent=euro(m.gross/100);$("refundsTotal").textContent=euro(m.refunds/100);$("spentTotal").textContent=euro(m.spent/100);$("availableBalance").textContent=euro(m.available/100);$("availableTotal").textContent=euro(m.available/100);
 $("refundsTotal").parentElement?.classList.toggle("hidden",m.refunds===0);$("spentTotal").parentElement?.classList.toggle("hidden",m.spent===0);
 const paymentUrl=c.paymentUrl||C.paypalPoolUrl||"https://www.paypal.com/pool/9tfV5v7iJ3";
 const closed=["draft","closed","archived"].includes(c.status);
 ["primaryPayBtn","mobilePayBtn","navPayBtn"].forEach(id=>{const a=$(id);if(!a)return;a.href=paymentUrl;a.classList.toggle("hidden",closed)});
 const payLabel=(lang==="fr"&&c.paymentLabel_fr)||c.paymentLabel_en||tr("payPalPool");document.querySelectorAll('[data-i18n="payPalPool"]').forEach(el=>el.textContent=payLabel);
 const ty=$("thankYouCard");if(ty){const txt=(lang==="fr"&&c.thankYou_fr)||c.thankYou_en||"";ty.textContent=txt;ty.classList.toggle("hidden",!closed||!txt)}
 const analyticsShow=c.showAnalytics!==false;$("trajectorySection").classList.toggle("hidden",!analyticsShow);if(analyticsShow){renderTrajectory(d,m);renderDailyBars(m);renderInsights(d,m)}
 renderFlow(m);renderMilestones(d,m);renderPeople(d,m);renderLedger(d,m);renderExpenses(d);renderUpdates(d);
 const policy=(lang==="fr"&&c.overfunding_fr)||c.overfunding_en||"";$("overfundingNote").textContent=policy;$("overfundingNote").classList.toggle("hidden",!policy);
 $("footerCampaign").textContent=(c.title||"Solidarity platform")+" · "+statusLabel(c.status)
}
window.render=render;
async function refresh(){try{render(await rpc("karen_public_state"))}catch{$("campaignStory").textContent=lang==="fr"?"Impossible de charger les données en direct.":"Could not load live campaign data."}}
window.refreshKarenFund=refresh;

$("enBtn").onclick=()=>setLanguage("en");$("frBtn").onclick=()=>setLanguage("fr");$("reshuffleBtn").onclick=()=>{shuffleNonce=Date.now()+Math.floor(Math.random()*100000);sessionStorage.setItem("supporter_shuffle",String(shuffleNonce));if(fund)renderPeople(fund,compute(fund))};
$("shareBtn").onclick=async()=>{const data={title:fund?.campaign?.title||"Solidarity Fund",text:(fund?.campaign?.subtitle||"We carry it together.")+" "+(fund?euro(compute(fund).net/100):""),url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);toast(lang==="fr"?"Lien copié":"Link copied")}}catch{}};
$("downloadPublicBtn").onclick=()=>{if(!fund)return;const publicCopy={campaign:fund.campaign,updated:fund.updated,contributions:fund.contributions,milestones:fund.milestones,expenses:fund.expenses,updates:fund.updates};const blob=new Blob([JSON.stringify(publicCopy,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(fund.campaign?.slug||"solidarity-fund")+"-public.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

async function initConsentFlow(){
 const params=new URLSearchParams(location.search);
 const token=params.get("consent");
 if(!token)return;
 const dialog=$("consentDialog"),mount=$("consentMount"),close=$("consentClose");
 if(!dialog||!mount)return;
 close.onclick=()=>dialog.close();
 try{
   const state=await rpc("solidarity_consent_state",{p_token:token});
   mount.replaceChildren();
   const intro=document.createElement("p");intro.style.cssText="font-size:.76rem;color:#766f68;line-height:1.5;margin:0 0 14px";intro.textContent=(lang==="fr"?"Contribution : ":"Contribution: ")+euro(Number(state.amountCents||0)/100)+" · "+dateFmt(state.date);
   const anon=document.createElement("label");anon.className="consent-option";const r1=document.createElement("input");r1.type="radio";r1.name="consentMode";r1.value="anonymous";r1.checked=!state.publicName;const atext=document.createElement("div");const astr=document.createElement("strong");astr.textContent=lang==="fr"?"Rester anonyme":"Remain anonymous";const asp=document.createElement("span");asp.textContent=lang==="fr"?"Votre identité reste privée.":"Your identity stays private.";atext.append(astr,asp);anon.append(r1,atext);
   const pub=document.createElement("label");pub.className="consent-option";const r2=document.createElement("input");r2.type="radio";r2.name="consentMode";r2.value="public";r2.checked=!!state.publicName;const ptext=document.createElement("div");const pstr=document.createElement("strong");pstr.textContent=lang==="fr"?"Afficher un nom ou alias":"Show a name or alias";const psp=document.createElement("span");psp.textContent=lang==="fr"?"Vous choisissez exactement ce qui est public.":"You choose exactly what becomes public.";ptext.append(pstr,psp);pub.append(r2,ptext);
   const alias=document.createElement("input");alias.type="text";alias.maxLength=100;alias.placeholder=lang==="fr"?"Nom public ou alias":"Public name or alias";alias.value=state.publicAlias||"";alias.style.marginTop="10px";
   const save=document.createElement("button");save.type="button";save.className="save-consent";save.textContent=lang==="fr"?"Enregistrer":"Save privacy choice";
   const status=document.createElement("div");status.style.cssText="font-size:.7rem;color:#766f68;margin-top:8px";
   const sync=()=>alias.style.display=r2.checked?"block":"none";r1.onchange=sync;r2.onchange=sync;sync();
   save.onclick=async()=>{if(r2.checked&&!alias.value.trim()){status.textContent=lang==="fr"?"Entrez le nom ou alias à afficher.":"Enter the public name or alias.";return}status.textContent=lang==="fr"?"Enregistrement…":"Saving…";try{await rpc("solidarity_consent_set",{p_token:token,p_public_name:r2.checked,p_alias:r2.checked?alias.value.trim():null});status.textContent=lang==="fr"?"Préférence enregistrée.":"Privacy preference saved.";await refresh()}catch{status.textContent=lang==="fr"?"Impossible d’enregistrer.":"Could not save."}};
   mount.append(intro,anon,pub,alias,save,status);dialog.showModal()
 }catch{}
}

window.addEventListener("solidarity-toast",e=>toast(e.detail||"Done"));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
setLanguage(lang);refresh().then(()=>initConsentFlow());setInterval(refresh,30000);
})();