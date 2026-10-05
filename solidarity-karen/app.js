(()=> {
const C=window.KAREN_SUPABASE;
const $=id=>document.getElementById(id);
let lang=localStorage.getItem("solidarity_lang")==="fr"?"fr":"en";
let fund=null;
let installPrompt=null;
let shuffleNonce=Number(sessionStorage.getItem("supporter_shuffle")||Date.now());

const I18N={
 en:{
  brandSub:"Collective care, transparent accounting",share:"Share",install:"Install",organizer:"Organizer",
  contributeNow:"Contribute",seeAccounting:"See the accounting",netRaised:"Net raised",goalProgress:"goal progress",
  supporters:"supporters",remaining:"remaining",privacyDefault:"privacy by default",noRanking:"no donor ranking",
  refundsVisible:"refunds stay visible",liveAccounting:"live accounting",peopleNotRankings:"People, not rankings",
  solidarityWall:"Solidarity wall",wallExplain:"Supporters are intentionally shown in a random order. Contribution amounts are not used to rank people.",
  reshuffle:"Reshuffle",collectiveProgress:"Collective progress",milestones:"Milestones",transparentByDesign:"Transparent by design",
  financialPicture:"The financial picture",financeExplain:"What came in, what was refunded, what has been used, and what remains available.",
  downloadData:"Download public data",grossRaised:"Gross raised",refunds:"Refunds",used:"Used / disbursed",available:"Available balance",
  fundFlow:"Fund flow",auditable:"Auditable",publicLedger:"Public ledger",
  ledgerExplain:"Transactions remain chronological here for accountability, while the solidarity wall above stays randomized.",
  whereItGoes:"Where it goes",disbursements:"Disbursements",campaignJournal:"Campaign journal",updates:"Updates",
  principle:"Principle",solidarityQuote:"“Solidarity means collectivizing the pain, the joy and the effort.”",
  privacyByDefault:"Privacy by default",privacyDetail:"Names appear only with explicit consent.",noCompetition:"No competition",
  competitionDetail:"People are never ranked by contribution size.",correctionsVisible:"Corrections stay visible",
  correctionDetail:"Refunds and public expenses remain part of the record.",controlRoom:"Organizer control room",
  controlRoomExplain:"Manage campaigns, people, money, updates and security without redeploying the site."
 },
 fr:{
  brandSub:"Soin collectif, comptabilité transparente",share:"Partager",install:"Installer",organizer:"Organisateur",
  contributeNow:"Contribuer",seeAccounting:"Voir la comptabilité",netRaised:"Collecte nette",goalProgress:"de l’objectif",
  supporters:"soutiens",remaining:"restants",privacyDefault:"confidentialité par défaut",noRanking:"aucun classement",
  refundsVisible:"remboursements visibles",liveAccounting:"comptabilité en direct",peopleNotRankings:"Des personnes, pas un classement",
  solidarityWall:"Mur de solidarité",wallExplain:"Les soutiens sont volontairement affichés dans un ordre aléatoire. Les montants ne servent jamais à classer les personnes.",
  reshuffle:"Mélanger",collectiveProgress:"Progrès collectif",milestones:"Étapes",transparentByDesign:"Transparent par conception",
  financialPicture:"La situation financière",financeExplain:"Ce qui est entré, remboursé, utilisé et ce qui reste disponible.",
  downloadData:"Télécharger les données publiques",grossRaised:"Collecte brute",refunds:"Remboursements",used:"Utilisé / versé",available:"Solde disponible",
  fundFlow:"Flux du fonds",auditable:"Vérifiable",publicLedger:"Registre public",
  ledgerExplain:"Les transactions restent chronologiques ici pour la transparence, tandis que le mur de solidarité reste aléatoire.",
  whereItGoes:"Où va l’argent",disbursements:"Décaissements",campaignJournal:"Journal de campagne",updates:"Actualités",
  principle:"Principe",solidarityQuote:"« La solidarité, c’est collectiviser la peine, la joie et l’effort. »",
  privacyByDefault:"Confidentialité par défaut",privacyDetail:"Les noms n’apparaissent qu’avec consentement explicite.",noCompetition:"Pas de compétition",
  competitionDetail:"Les personnes ne sont jamais classées selon leur contribution.",correctionsVisible:"Corrections visibles",
  correctionDetail:"Les remboursements et dépenses publiques restent dans l’historique.",controlRoom:"Espace organisateur",
  controlRoomExplain:"Gérez campagnes, personnes, argent, actualités et sécurité sans redéployer le site."
 }
};

function t(k){return I18N[lang]?.[k]||I18N.en[k]||k}
function euro(n){return new Intl.NumberFormat(lang==="fr"?"fr-FR":"de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(n||0))}
function dateFmt(v){
 if(!v)return "—";
 const d=new Date(String(v).slice(0,10)+"T12:00:00");
 return new Intl.DateTimeFormat(lang==="fr"?"fr-FR":"en-GB",{day:"numeric",month:"short",year:"numeric"}).format(d);
}
async function rpc(name,body={}){
 const r=await fetch(C.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:C.key},body:JSON.stringify(body)});
 const txt=await r.text();
 if(!r.ok)throw Error(txt||"request_failed");
 return txt?JSON.parse(txt):null;
}
function toast(msg){
 const el=$("toast"); if(!el)return;
 el.textContent=msg; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2200);
}
function seedHash(s){
 let h=2166136261>>>0;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return h>>>0;
}
function supporterSort(a,b){return seedHash(String(a.id)+":"+shuffleNonce)-seedHash(String(b.id)+":"+shuffleNonce)}
function setLanguage(next){
 lang=next; localStorage.setItem("solidarity_lang",lang);
 document.documentElement.lang=lang;
 document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n; if(I18N[lang]?.[key])el.textContent=I18N[lang][key]});
 $("enBtn")?.classList.toggle("active",lang==="en"); $("frBtn")?.classList.toggle("active",lang==="fr");
 if(fund)render(fund);
}
function statusLabel(s){
 const map={active:{en:"LIVE",fr:"EN DIRECT"},goal_reached:{en:"GOAL REACHED",fr:"OBJECTIF ATTEINT"},closed:{en:"CLOSED",fr:"CLOTURÉE"},archived:{en:"ARCHIVED",fr:"ARCHIVÉE"},draft:{en:"DRAFT",fr:"BROUILLON"}};
 return map[s]?.[lang]||String(s||"active").toUpperCase();
}
function campaignText(c,key){
 const localized=c?.[key+"_"+lang];
 const fallback=c?.[key+"_en"];
 return localized||fallback||"";
}
function compute(d){
 const rows=(d.contributions||[]).filter(x=>["confirmed","received","refunded"].includes(x.status));
 const gross=rows.filter(x=>x.status!=="refunded").reduce((s,x)=>s+Number(x.amountCents??Math.round(Number(x.amount||0)*100)),0);
 const refunds=rows.filter(x=>x.status==="refunded").reduce((s,x)=>s+Number(x.amountCents??Math.round(Number(x.amount||0)*100)),0);
 const net=Math.max(0,gross-refunds);
 const spent=(d.expenses||[]).filter(x=>x.status==="recorded").reduce((s,x)=>s+Number(x.amountCents||0),0);
 const available=Math.max(0,net-spent);
 const target=Number(d.campaign?.targetCents||d.targetCents||0);
 const pct=target>0?Math.min(100,net/target*100):0;
 return {rows,gross,refunds,net,spent,available,target,pct};
}
function renderSupporters(d,m){
 const wall=$("supporterWall"); if(!wall)return;
 wall.replaceChildren();
 const supporters=m.rows.filter(x=>x.status!=="refunded").slice().sort(supporterSort);
 if(!supporters.length){wall.innerHTML='<div class="empty-state">'+(lang==="fr"?"Aucun soutien confirmé pour le moment.":"No confirmed supporters yet.")+"</div>";return}
 supporters.forEach((x,i)=>{
   const name=x.publicNameConsent===true&&x.name?x.name:(lang==="fr"?"Soutien anonyme":"Anonymous supporter");
   const card=document.createElement("article");card.className="supporter-card";
   const av=document.createElement("div");av.className="avatar";av.textContent=x.publicNameConsent===true&&x.name?x.name.trim().charAt(0).toUpperCase():"•";
   const bottom=document.createElement("div");const strong=document.createElement("strong");strong.textContent=name;
   const meta=document.createElement("span");meta.textContent=lang==="fr"?"Soutien confirmé":"Confirmed support";
   bottom.append(strong,meta);card.append(av,bottom);wall.append(card);
 });
}
function renderMilestones(d,m){
 const wrap=$("milestones");const sec=$("milestonesSection");if(!wrap||!sec)return;
 const items=d.milestones||[];wrap.replaceChildren();
 if(!items.length){sec.classList.add("hidden");return}else sec.classList.remove("hidden");
 items.forEach(x=>{
  const threshold=Number(x.thresholdCents||0),p=threshold?Math.min(100,m.net/threshold*100):0;
  const card=document.createElement("article");card.className="milestone"+(m.net>=threshold?" done":"");
  const title=document.createElement("strong");title.textContent=(lang==="fr"&&x.label_fr)||x.label_en||"Milestone";
  const meta=document.createElement("span");meta.textContent=euro(threshold/100)+" · "+(m.net>=threshold?(lang==="fr"?"atteinte":"reached"):Math.round(p)+"%");
  const bar=document.createElement("div");bar.className="milestone-bar";const fill=document.createElement("div");fill.style.width=p+"%";bar.append(fill);
  card.append(title,meta,bar);wrap.append(card);
 });
}
function renderLedger(m){
 const wrap=$("ledger");if(!wrap)return;wrap.replaceChildren();
 const rows=m.rows.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
 if(!rows.length){wrap.innerHTML='<div class="empty-state">'+(lang==="fr"?"Aucune transaction publique.":"No public transactions yet.")+"</div>";return}
 rows.forEach((x,i)=>{
   const refund=x.status==="refunded";const name=x.publicNameConsent===true&&x.name?x.name:(lang==="fr"?"Anonyme":"Anonymous");
   const row=document.createElement("div");row.className="ledger-row";
   const idx=document.createElement("div");idx.className="ledger-index";idx.textContent=String(rows.length-i).padStart(2,"0");
   const main=document.createElement("div");main.className="ledger-main";const s=document.createElement("strong");s.textContent=name;
   const meta=document.createElement("div");meta.className="ledger-meta";const d=document.createElement("span");d.textContent=dateFmt(x.date);
   const badge=document.createElement("span");badge.className="badge "+(refund?"refund":"ok");badge.textContent=refund?(lang==="fr"?"remboursé":"refunded"):(lang==="fr"?"confirmé":"confirmed");
   meta.append(d,badge);main.append(s,meta);
   const amt=document.createElement("div");amt.className="ledger-amount"+(refund?" refund":"");amt.textContent=(refund?"−":"")+euro(Number(x.amountCents||0)/100);
   row.append(idx,main,amt);wrap.append(row);
 });
}
function renderExpenses(d){
 const wrap=$("expensesList");if(!wrap)return;wrap.replaceChildren();
 const rows=(d.expenses||[]).filter(x=>x.status==="recorded");
 if(!rows.length){wrap.innerHTML='<div class="empty-state">'+(lang==="fr"?"Aucun décaissement public enregistré.":"No public disbursements recorded.")+"</div>";return}
 rows.forEach(x=>{
  const card=document.createElement("article");card.className="expense";const head=document.createElement("div");head.className="expense-head";
  const label=document.createElement("strong");label.textContent=(lang==="fr"&&x.label_fr)||x.label_en||"Expense";
  const amount=document.createElement("span");amount.className="amount";amount.textContent=euro(Number(x.amountCents||0)/100);head.append(label,amount);
  const meta=document.createElement("p");const note=(lang==="fr"&&x.note_fr)||x.note_en||"";meta.textContent=dateFmt(x.spentOn)+(note?" · "+note:"");
  card.append(head,meta);wrap.append(card);
 });
}
function renderUpdates(d){
 const wrap=$("updatesList"),sec=$("updatesSection");if(!wrap||!sec)return;const rows=d.updates||[];wrap.replaceChildren();
 if(!rows.length){sec.classList.add("hidden");return}else sec.classList.remove("hidden");
 rows.forEach(x=>{
   const card=document.createElement("article");card.className="update-card";const tm=document.createElement("time");tm.textContent=dateFmt(x.publishedAt);
   const h=document.createElement("h3");h.textContent=(lang==="fr"&&x.title_fr)||x.title_en||"Update";const p=document.createElement("p");p.textContent=(lang==="fr"&&x.body_fr)||x.body_en||"";
   card.append(tm,h,p);wrap.append(card);
 });
}
function render(d){
 fund=d;window.__fund=d;
 const c=d.campaign||{},m=compute(d);
 document.title=(c.title||"Solidarity Fund")+" · Live tracker";
 $("brandTitle").textContent=c.title||"Solidarity Fund";
 $("campaignKicker").textContent=c.beneficiary?(lang==="fr"?"Pour ":"For ")+c.beneficiary:"SOLIDARITY";
 $("campaignTitle").textContent=c.subtitle||c.title||"We carry it together.";
 $("campaignStory").textContent=campaignText(c,"story")||(lang==="fr"?"Fonds collectif de solidarité.":"Collective solidarity fund.");
 $("campaignStatus").textContent=statusLabel(c.status);
 $("lastUpdated").textContent=(lang==="fr"?"Mis à jour ":"Updated ")+dateFmt(d.updated);
 $("raisedTotal").textContent=euro(m.net/100); $("goalText").textContent=(lang==="fr"?"sur ":"of ")+euro(m.target/100);
 $("progressPct").textContent=(Math.round(m.pct*10)/10)+"%";$("supporterCount").textContent=m.rows.filter(x=>x.status!=="refunded").length;
 $("remainingAmount").textContent=euro(Math.max(0,m.target-m.net)/100);$("progressRing").style.setProperty("--p",m.pct.toFixed(1));$("progressLine").style.width=m.pct+"%";
 $("signalRaised").textContent=euro(m.net/100)+(lang==="fr"?" collectés":" raised");
 $("grossRaised").textContent=euro(m.gross/100);$("refundsTotal").textContent=euro(m.refunds/100);$("spentTotal").textContent=euro(m.spent/100);$("availableTotal").textContent=euro(m.available/100);
 $("flowSummary").textContent=euro(m.net/100)+" → "+euro(m.available/100)+" "+(lang==="fr"?"disponibles":"available");
 const spentPct=m.net?Math.min(100,m.spent/m.net*100):0,availPct=m.net?Math.min(100,m.available/m.net*100):0;$("spentBar").style.width=spentPct+"%";$("availableBar").style.width=availPct+"%";
 $("footerCampaign").textContent=(c.title||"Solidarity platform")+" · "+statusLabel(c.status);
 renderSupporters(d,m);renderMilestones(d,m);renderLedger(m);renderExpenses(d);renderUpdates(d);
}
window.render=render;
async function refresh(){
 try{render(await rpc("karen_public_state"))}
 catch{$("campaignStory").textContent=lang==="fr"?"Impossible de charger les données en direct.":"Could not load live campaign data."}
}
window.refreshKarenFund=refresh;

$("enBtn").onclick=()=>setLanguage("en");$("frBtn").onclick=()=>setLanguage("fr");
$("reshuffleBtn").onclick=()=>{shuffleNonce=Date.now()+Math.floor(Math.random()*100000);sessionStorage.setItem("supporter_shuffle",String(shuffleNonce));if(fund)renderSupporters(fund,compute(fund))};
$("shareBtn").onclick=async()=>{
 const data={title:fund?.campaign?.title||"Solidarity Fund",text:(fund?.campaign?.subtitle||"We carry it together.")+" "+(fund?euro(compute(fund).net/100):""),url:location.href};
 try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);toast(lang==="fr"?"Lien copié":"Link copied")}}catch{}
};
$("downloadPublicBtn").onclick=()=>{
 if(!fund)return;
 const publicCopy={campaign:fund.campaign,updated:fund.updated,contributions:fund.contributions,milestones:fund.milestones,expenses:fund.expenses,updates:fund.updates};
 const blob=new Blob([JSON.stringify(publicCopy,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(fund.campaign?.slug||"solidarity-fund")+"-public.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn")?.classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

setLanguage(lang);refresh();setInterval(refresh,30000);
})();