(()=> {
const C=window.KAREN_SUPABASE,$=id=>document.getElementById(id);
let secret=null,admin=null,active="overview",campaigns=null,audit=null,supporters=null,localeState=null,healthState=null,templatesState=null,reconciliationState=null,authContext=null,accountsState=null,lastAdminSync=null,autoRefreshTimer=null;

async function rpc(name,body={}){
 const r=await fetch(C.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:C.key},body:JSON.stringify(body)});
 const txt=await r.text();if(!r.ok)throw Error(txt||"request_failed");return txt?JSON.parse(txt):null
}
async function digest(v){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function adminAction(action){return rpc("karen_admin_action",{p_secret_digest:secret,p_action:action})}
async function campaignAction(action){return rpc("solidarity_campaign_action",{p_secret_digest:secret,p_action:action})}
async function adminTools(action){return rpc("solidarity_admin_tools",{p_secret_digest:secret,p_action:action})}
async function supporterAction(action){return rpc("solidarity_admin_supporters",{p_secret_digest:secret,p_action:action})}
async function localeAction(action){return rpc("solidarity_locale_admin",{p_secret_digest:secret,p_action:action})}
async function addContributionAction(data){return rpc("solidarity_admin_add_contribution",{p_secret_digest:secret,p_data:data})}
async function templateAction(action){return rpc("solidarity_template_action",{p_secret_digest:secret,p_action:action})}
async function loadTemplates(){templatesState=await templateAction({action:"list"});return templatesState}
async function refreshPublic(){if(window.refreshKarenFund)await window.refreshKarenFund()}
async function reload(){admin=await adminAction({action:"list"});renderAdmin();await refreshPublic()}
async function loadCampaigns(){campaigns=await campaignAction({action:"list"});return campaigns}
async function loadAudit(){audit=await rpc("solidarity_admin_audit",{p_secret_digest:secret});return audit}
async function loadSupporters(){supporters=await supporterAction({action:"list"});return supporters}
async function loadLocales(){localeState=await localeAction({action:"get"});return localeState}
async function loadHealth(){healthState=await rpc("solidarity_admin_health",{p_secret_digest:secret});return healthState}
async function reconciliationAction(action){return rpc("solidarity_reconciliation_action",{p_secret_digest:secret,p_action:action})}
async function loadReconciliation(){reconciliationState=await reconciliationAction({action:"list"});return reconciliationState}
async function loadAuthContext(){authContext=await rpc("solidarity_credential_context",{p_credential:secret});return authContext}
async function accountsAction(action){return rpc("solidarity_organizer_accounts_action",{p_owner_credential:secret,p_action:action})}
async function loadAccounts(){accountsState=await accountsAction({action:"list"});return accountsState}
function can(...roles){return roles.includes(authContext?.role||"owner")}
async function preloadAuthorizedData(renderNow=false){
 if(!secret)return;
 const role=authContext?.role||"owner",tabs=ROLE_TABS[role]||ROLE_TABS.owner;
 try{admin=await adminAction({action:"list"})}catch(e){if(!authContext?.breakGlass){sessionStorage.removeItem("solidarity_named_session");secret=null;authContext=null;admin=null;login()}return}
 const jobs=[];
 if(tabs.includes("supporters")||tabs.includes("contributions")||tabs.includes("reconciliation"))jobs.push(loadSupporters());
 if(tabs.includes("health"))jobs.push(loadHealth());
 if(tabs.includes("reconciliation"))jobs.push(loadReconciliation());
 if(tabs.includes("campaign"))jobs.push(loadCampaigns());
 if(tabs.includes("languages"))jobs.push(loadLocales());
 if(tabs.includes("audit"))jobs.push(loadAudit());
 if(role==="owner")jobs.push(loadAccounts());
 await Promise.allSettled(jobs);
 lastAdminSync=new Date();
 if(renderNow||["overview","health","audit"].includes(active))await renderAdmin()
}
function startAutoRefresh(){
 clearInterval(autoRefreshTimer);
 autoRefreshTimer=setInterval(()=>{if(!document.hidden&&secret)preloadAuthorizedData(false)},15000)
}

const ROLE_TABS={
 owner:["overview","health","supporters","contributions","reconciliation","events","campaign","languages","milestones","expenses","updates","integrations","reports","audit","security"],
 treasurer:["overview","health","supporters","contributions","reconciliation","expenses","integrations","reports","security"],
 organizer:["overview","supporters","events","campaign","languages","milestones","updates","reports","security"],
 auditor:["overview","health","supporters","reports","audit","security"]
};

const css=document.createElement("style");css.textContent=`
.admin-login{max-width:460px;margin:28px auto;padding:24px;border:1px solid #d2c8bc;border-radius:16px;background:#fffaf3}.admin-login h3{margin:0 0 7px}.admin-login p{color:#746d67;font-size:.76rem;line-height:1.5;margin:0 0 16px}
.admin-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.admin-head strong{display:block}.admin-head small{display:block;color:#746d67;font-size:.68rem;margin-top:3px}
.admin-tabs{display:flex;gap:6px;overflow:auto;padding-bottom:10px;border-bottom:1px solid #d2c8bc;margin-bottom:15px}.admin-tab{border:0;border-radius:999px;padding:8px 10px;background:#e9e1d7;color:#625b55;font-size:.67rem;font-weight:900;white-space:nowrap}.admin-tab.active{background:#111014;color:#fff}
.admin-panel{border:1px solid #d2c8bc;background:#fffaf3;border-radius:14px;padding:15px;margin-bottom:12px}.admin-panel h4{margin:0 0 10px;font-size:.88rem}.admin-panel h5{margin:0 0 8px;font-size:.78rem}.admin-hint{font-size:.7rem;color:#746d67;line-height:1.5;margin-bottom:10px}
.admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.admin-field{display:grid;gap:5px;font-size:.68rem;font-weight:900;color:#514b46}.admin-field input,.admin-field select,.admin-field textarea{width:100%;min-width:0;border:1px solid #d2c8bc;background:#fff;border-radius:9px;padding:9px}.admin-field textarea{min-height:82px;resize:vertical}
.admin-btn{border:0;border-radius:9px;padding:9px 11px;background:#111014;color:#fff;font-size:.71rem;font-weight:900}.admin-btn.alt{background:#fff;color:#111014;border:1px solid #d2c8bc}.admin-btn.red{background:#74202d}.admin-btn.green{background:#295846}
.admin-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.admin-status{font-size:.68rem;color:#746d67;margin-top:7px}
.admin-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.admin-metric{padding:12px;border-radius:12px;background:#ece3d7}.admin-metric b{display:block;font-size:1.15rem}.admin-metric span{font-size:.61rem;color:#746d67}
.admin-row{padding:13px 0;border-bottom:1px solid #d2c8bc}.admin-row:last-child{border-bottom:0}.admin-row-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}.admin-row-head b{font-size:.82rem}.admin-row-head span{font-size:.72rem;font-weight:900}
.source-chip{display:inline-flex;margin-left:6px;padding:3px 6px;border-radius:999px;background:#e4eaf0;color:#536273;font-size:.55rem;font-weight:900;text-transform:uppercase}
.audit-list{display:grid}.audit-item{display:grid;grid-template-columns:90px 1fr auto;gap:10px;padding:10px 0;border-bottom:1px solid #d2c8bc;font-size:.68rem}.audit-item code{font-size:.62rem}.audit-item time{color:#746d67}
.campaign-card{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px;border:1px solid #d2c8bc;border-radius:12px;margin-top:8px}.campaign-card.active{background:#dfeae4;border-color:#bfd2c5}.campaign-card strong{display:block}.campaign-card span{font-size:.68rem;color:#746d67}
@media(max-width:760px){.admin-grid{grid-template-columns:1fr}.admin-metrics{grid-template-columns:1fr 1fr}.audit-item{grid-template-columns:1fr}.admin-row-head{align-items:flex-start;flex-direction:column}}
`;document.head.append(css);

const dialog=$("adminDialog"),mount=$("adminMount");
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const input=(type,value="")=>{const e=document.createElement("input");e.type=type;e.value=value??"";return e};
const field=(label,control)=>{const w=make("label",undefined,"admin-field");w.append(make("span",label),control);return w};
const button=(text,fn,kind="")=>{const b=make("button",text,"admin-btn"+(kind?" "+kind:""));b.type="button";b.onclick=fn;return b};
const money=c=>new Intl.NumberFormat(undefined,{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(c||0)/100);
const msg=()=>make("div","", "admin-status");

const open=()=>{dialog.showModal();secret?renderAdmin():login()};
$("adminBtn").onclick=open;$("adminClose").onclick=()=>dialog.close();

function login(){
 mount.replaceChildren();
 const box=make("div",undefined,"admin-login");
 box.append(make("h3","Organizer access"),make("p","Use the Owner password directly, or enter a named organizer account. Named sessions expire automatically after 12 hours."));
 const username=input("text"),pass=input("password");username.autocomplete="username";username.placeholder="Leave blank for Owner password";pass.autocomplete="current-password";
 const m=msg();
 const unlock=button("Unlock control room",async()=>{
   m.textContent="Checking…";
   try{
     const d=await digest(pass.value);
     if(username.value.trim()){
       const session=await rpc("solidarity_organizer_login",{p_username:username.value.trim(),p_secret_digest:d});
       secret=session.token;authContext=session;sessionStorage.setItem("solidarity_named_session",secret);
     }else{
       secret=d;sessionStorage.removeItem("solidarity_named_session");await loadAuthContext();
     }
     active="overview";await preloadAuthorizedData(false);startAutoRefresh();renderAdmin()
   }catch{secret=null;authContext=null;sessionStorage.removeItem("solidarity_named_session");m.textContent="Incorrect credentials or account unavailable."}
 });
 box.append(field("Username (optional)",username),field("Password",pass),unlock,m);mount.append(box);
 pass.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();unlock.click()}});
 setTimeout(()=>username.focus(),50)
}
async function save(action,m){m.textContent="Saving…";try{await adminAction(action);m.textContent="Saved.";await reload()}catch{m.textContent="Could not save changes."}}
async function paypalRefund(captureId,amountCents,m){
 if(!captureId||!(amountCents>0)){m.textContent="Enter a valid refund amount.";return}
 if(!confirm("Send this refund through PayPal?"))return;
 m.textContent="Processing PayPal refund…";
 try{const r=await fetch("/api/paypal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"refund",adminSecretDigest:secret,captureId,amountCents})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"refund_failed");m.textContent="Refund submitted and recorded.";await reload()}catch{m.textContent="PayPal refund failed. No local refund was added."}
}
function tabs(){
 const t=make("div",undefined,"admin-tabs");
 const labels={overview:"Overview",health:"Health",supporters:"Supporters",contributions:"Contributions",reconciliation:"Reconciliation",events:"Events",campaign:"Campaign",languages:"Languages",milestones:"Milestones",expenses:"Expenses",updates:"Updates",integrations:"Integrations",reports:"Reports",audit:"Audit",security:"Security"};
 const ids=ROLE_TABS[authContext?.role||"owner"]||ROLE_TABS.owner;
 if(!ids.includes(active))active="overview";
 ids.forEach(id=>{const b=make("button",labels[id], "admin-tab"+(active===id?" active":""));b.type="button";b.onclick=async()=>{active=id;if(id==="audit"&&!audit)await loadAudit();if(id==="campaign"&&!campaigns)await loadCampaigns();if((id==="supporters"||id==="contributions"||id==="reconciliation")&&!supporters)await loadSupporters();if(id==="languages"&&!localeState)await loadLocales();if(id==="health"&&!healthState)await loadHealth();if(id==="reconciliation"&&!reconciliationState)await loadReconciliation();renderAdmin()};t.append(b)});
 return t
}
function healthView(){
 const p=make("div",undefined,"admin-panel");
 p.append(make("h4","Data health"),make("div","Automated consistency checks across supporters, contributions, refunds, PayPal reconciliation, languages and available balance.","admin-hint"));
 const h=healthState||{score:0,status:"unknown",issues:[]};
 const metrics=make("div",undefined,"admin-metrics");
 const statusText=String(h.status||"unknown").toUpperCase();
 [[h.score+"%","Health score"],[statusText,"Status"],[money(h.netCents||0),"Net"],[money(h.spentCents||0),"Used"],[money(h.availableCents||0),"Available"]].forEach(([v,l])=>{const c=make("div",undefined,"admin-metric");c.append(make("b",String(v)),make("span",l));metrics.append(c)});
 p.append(metrics);
 const issues=make("div",undefined,"admin-row");
 issues.append(make("h5","Checks"));
 if(!(h.issues||[]).length){issues.append(make("div","No data-quality issues detected.","admin-hint"))}
 else (h.issues||[]).forEach(x=>{const item=make("div",undefined,"admin-row-head");const left=make("div");left.append(make("b",String(x.code||"issue").replaceAll("_"," ")),make("span",String(x.severity||"warning").toUpperCase(),"source-chip"));item.append(left,make("span",(x.count||1)+" · "+(x.message||"")));issues.append(item)});
 const m=msg();const actions=make("div",undefined,"admin-actions");actions.append(button("Run checks again",async()=>{m.textContent="Checking…";try{healthState=null;await loadHealth();m.textContent="Checks complete.";renderAdmin()}catch{m.textContent="Health check failed."}},"green"));
 p.append(issues,actions,m);return p
}

function overviewView(){
 const rows=admin.contributions||[],expenses=admin.expenses||[];const gross=rows.filter(x=>["confirmed","received"].includes(x.status)).reduce((s,x)=>s+x.amount_cents,0);const refunds=rows.filter(x=>x.status==="refunded").reduce((s,x)=>s+x.amount_cents,0);const net=Math.max(0,gross-refunds);const spent=expenses.filter(x=>x.status==="recorded").reduce((s,x)=>s+x.amount_cents,0);const available=Math.max(0,net-spent);
 const wrap=make("div");
 const p=make("div",undefined,"admin-panel");p.append(make("h4","Campaign overview"));const grid=make("div",undefined,"admin-metrics");[[money(net),"Net raised"],[money(spent),"Used"],[money(available),"Available"],[money(refunds),"Refunded"],[money(admin.targetCents||0),"Target"]].forEach(([v,l])=>{const c=make("div",undefined,"admin-metric");c.append(make("b",String(v)),make("span",l));grid.append(c)});p.append(grid);wrap.append(p);

 const live=make("div",undefined,"admin-panel");live.append(make("h4","Live operations"),make("div","These values load automatically when the control room opens and continue refreshing in the background.","admin-hint"));
 const lg=make("div",undefined,"admin-metrics");
 const supporterCount=(supporters?.supporters||[]).length,eventCount=rows.filter(x=>["confirmed","received","refunded"].includes(x.status)).length,unmatched=(reconciliationState?.items||[]).filter(x=>x.status==="unmatched").length,health=healthState?.score,langs=(localeState?.enabledLocales||admin.campaign?.enabled_locales||[]).length;
 [[supporterCount,"Supporter IDs"],[eventCount,"Contribution events"],[unmatched,"Unmatched payments"],[health==null?"—":health+"%","Data health"],[langs||"—","Languages"]].forEach(([v,l])=>{const c=make("div",undefined,"admin-metric");c.append(make("b",String(v)),make("span",l));lg.append(c)});
 live.append(lg,make("div",lastAdminSync?("Last automatic sync · "+lastAdminSync.toLocaleTimeString()):"Loading live data…","admin-status"));wrap.append(live);

 const rec=make("div",undefined,"admin-panel");rec.append(make("h4","Recent contribution records"));rows.slice(0,8).forEach(x=>{const r=make("div",undefined,"admin-row-head");const left=make("div");left.append(make("b",x.real_name),make("span",(x.source||"manual").toUpperCase(),"source-chip"));r.append(left,make("span",money(x.amount_cents)+" · "+x.status));rec.append(r)});wrap.append(rec);return wrap
}
function supportersView(){
 const editable=can("owner","organizer");
 const p=make("div",undefined,"admin-panel");
 p.append(make("h4","Supporter registry"),make("div","Stable supporter IDs separate identity from transactions. Real names stay private here; public pages use the ID and only show a name with consent.","admin-hint"));
 const rows=supporters?.supporters||[];
 if(!rows.length){p.append(make("div","No supporters yet.","admin-hint"));return p}
 rows.forEach(x=>{
   const row=make("div",undefined,"admin-row");
   const head=make("div",undefined,"admin-row-head");
   const left=make("div");left.append(make("b",x.supporterId),make("span",x.publicName?"PUBLIC":"PRIVATE","source-chip"));
   head.append(left,make("span",money(x.netCents)+" · "+x.eventCount+" event"+(x.eventCount===1?"":"s")));
   const g=make("div",undefined,"admin-grid");
   const name=input("text",x.realName),pub=input("checkbox");pub.checked=!!x.publicName;
   const alias=input("text",x.publicAlias||""),note=document.createElement("textarea");note.value=x.note||"";name.disabled=pub.disabled=alias.disabled=note.disabled=!editable;
   g.append(field("Real name",name),field("Public name enabled",pub),field("Public alias",alias),field("Private note",note));
   const meta=make("div",(x.firstDate||"—")+" → "+(x.lastDate||"—")+" · gross "+money(x.grossCents)+" · refunds "+money(x.refundCents),"admin-hint");
   const m=msg(),acts=make("div",undefined,"admin-actions");
   acts.append(button("Copy public ID",async()=>{await navigator.clipboard.writeText(x.supporterId);m.textContent="Supporter ID copied."},"alt"));
   if(editable)acts.prepend(button("Save supporter",async()=>{m.textContent="Saving…";try{await supporterAction({action:"update",id:x.id,real_name:name.value.trim(),public_name:pub.checked,public_alias:pub.checked?alias.value.trim():null,note:note.value.trim()||null});supporters=null;await loadSupporters();m.textContent="Saved.";renderAdmin();await refreshPublic()}catch{m.textContent="Could not save supporter."}}));
   if(editable&&rows.length>1){
     const target=document.createElement("select");
     rows.filter(y=>y.id!==x.id).forEach(y=>{const o=document.createElement("option");o.value=y.id;o.textContent=y.supporterId+" · "+y.realName;target.append(o)});
     acts.append(target,button("Merge into…",async()=>{if(!target.value||!confirm("Move all events to the selected supporter ID and remove this registry entry?"))return;m.textContent="Merging…";try{await supporterAction({action:"merge",source_id:x.id,target_id:target.value});supporters=null;await loadSupporters();m.textContent="Merged.";renderAdmin();await refreshPublic()}catch{m.textContent="Could not merge."}},"red"));
   }
   row.append(head,meta,g,acts,m);p.append(row)
 });
 return p
}

function contributionsView(){
 const wrap=make("div");
 const add=make("div",undefined,"admin-panel");
 add.append(make("h4","Add contribution"),make("div","Attach repeat contributions to an existing supporter ID. Choose “New supporter” only for a genuinely new person.","admin-hint"));
 const g=make("div",undefined,"admin-grid");
 const supporterSelect=document.createElement("select");
 const newOpt=document.createElement("option");newOpt.value="";newOpt.textContent="New supporter";supporterSelect.append(newOpt);
 (supporters?.supporters||[]).forEach(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=s.supporterId+" · "+s.realName;supporterSelect.append(o)});
 const campaignCurrency=(admin.campaign?.currency||"EUR").toUpperCase();const name=input("text"),amount=input("number"),originalAmount=input("number"),originalCurrency=input("text",campaignCurrency),date=input("date"),status=document.createElement("select"),visibility=document.createElement("select"),note=document.createElement("textarea"),source=document.createElement("select");
 date.value=new Date().toISOString().slice(0,10);amount.min=".01";amount.step=".01";originalAmount.min=".01";originalAmount.step=".01";originalCurrency.maxLength=3;originalCurrency.style.textTransform="uppercase";
 ["confirmed","received","pending"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;status.append(o)});
 visibility.innerHTML='<option value="false">Anonymous publicly</option><option value="true">Show name publicly</option>';
 source.innerHTML='<option value="manual">Manual / bank / cash</option><option value="paypal_pool">PayPal Pool</option>';(window.RBEventsAdmin?.getContributionSources(admin)||[]).forEach(e=>{const o=document.createElement("option");o.value=e.value;o.textContent=e.label;source.append(o)});
 const syncNew=()=>{const isNew=!supporterSelect.value;name.disabled=!isNew;visibility.disabled=!isNew;name.placeholder=isNew?"Private real name":"Inherited from supporter ID"};
 supporterSelect.onchange=syncNew;syncNew();
 g.append(field("Supporter ID",supporterSelect),field("New supporter name",name),field("Campaign amount ("+campaignCurrency+")",amount),field("Original amount (optional)",originalAmount),field("Original currency",originalCurrency),field("Date",date),field("Status",status),field("Source",source),field("New supporter visibility",visibility),field("Internal note",note));
 const m=msg();
 add.append(g,button("Add contribution",async()=>{
   if(!(Number(amount.value)>0)){m.textContent="Amount is required.";return}
   if(!supporterSelect.value&&!name.value.trim()){m.textContent="Name is required for a new supporter.";return}
   const originalCode=(originalCurrency.value.trim()||campaignCurrency).toUpperCase();if(originalCode!==campaignCurrency&&!originalAmount.value){m.textContent="Original amount is required when the original currency differs from the campaign currency.";return}
   m.textContent="Saving…";
   try{
     const d=await addContributionAction({
       supporter_id:supporterSelect.value||null,
       real_name:name.value.trim()||null,
       amount_cents:Math.round(Number(amount.value)*100),
       contributed_on:date.value,status:status.value,source:source.value,
       public_name:!supporterSelect.value&&visibility.value==="true",
       public_alias:!supporterSelect.value&&visibility.value==="true"?name.value.trim():null,
       original_amount:originalAmount.value?Number(originalAmount.value):Number(amount.value),
       original_currency:originalCode,
       note:note.value.trim()||null
     });
     supporters=null;admin=await adminAction({action:"list"});await loadSupporters();m.textContent="Saved as "+(d.supporterId||"supporter");renderAdmin();await refreshPublic()
   }catch{m.textContent="Could not add contribution."}
 }),m);wrap.append(add);

 const manage=make("div",undefined,"admin-panel");
 manage.append(make("h4","Transaction records"),make("div","Transaction editing stays separate from supporter identity. Use Supporters to manage IDs, names and merges.","admin-hint"));
 (admin.contributions||[]).forEach(x=>{
   const paypal=x.source==="paypal",refundRow=paypal&&x.status==="refunded",row=make("div",undefined,"admin-row"),head=make("div",undefined,"admin-row-head"),left=make("div");
   left.append(make("b",x.real_name),make("span",paypal?(refundRow?"PayPal refund":"PayPal API"):(x.source||"manual"),"source-chip"));head.append(left,make("span",money(x.amount_cents)));
   const rg=make("div",undefined,"admin-grid"),rn=input("text",x.real_name),ra=input("number",(x.amount_cents/100).toFixed(2)),rd=input("date",x.contributed_on),rs=document.createElement("select"),rv=document.createElement("select"),rnote=document.createElement("textarea");
   ra.min=".01";ra.step=".01";rnote.value=x.note||"";rv.innerHTML='<option value="false">Anonymous publicly</option><option value="true">Show name publicly</option>';rv.value=x.public_name?"true":"false";
   const states=paypal?(refundRow?["refunded"]:["confirmed","received"]):["confirmed","received","pending","refunded","cancelled"];
   states.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;o.selected=x.status===v;rs.append(o)});if(paypal){ra.readOnly=true;rd.readOnly=true}
   rg.append(field("Transaction name",rn),field(paypal?"Verified amount (€)":"Amount (€)",ra),field("Date",rd),field("Status",rs),field("Transaction visibility",rv),field("Internal note",rnote));
   const rm=msg(),acts=make("div",undefined,"admin-actions");
   acts.append(
     button("Save transaction",()=>save({action:"update",id:x.id,real_name:rn.value.trim(),...(paypal?{}:{amount_cents:Math.round(Number(ra.value)*100),contributed_on:rd.value,status:rs.value}),...(paypal&&!refundRow?{status:rs.value}:{}),public_name:rv.value==="true",public_alias:rv.value==="true"?rn.value.trim():null,note:rnote.value.trim()||null},rm)),
     button("Create privacy link",async()=>{rm.textContent="Creating private link…";try{const d=await adminTools({action:"create_consent_link",contribution_id:x.id,days:30});const url=new URL("../me/",location.href);url.searchParams.set("token",d.token);await navigator.clipboard.writeText(url);rm.textContent="Private privacy link copied. It expires in 30 days."}catch{rm.textContent="Could not create privacy link."}},"alt")
   );
   if(paypal&&!refundRow&&x.provider_ref){const ref=input("number",(x.amount_cents/100).toFixed(2));ref.min=".01";ref.max=(x.amount_cents/100).toFixed(2);ref.step=".01";acts.append(ref,button("Refund via PayPal",()=>paypalRefund(x.provider_ref,Math.round(Number(ref.value)*100),rm),"red"))}
   row.append(head,rg,acts,rm);manage.append(row)
 });
 wrap.append(manage);return wrap
}

function parseCsvRow(line,delimiter){
 const out=[];let cur="",quoted=false;
 for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++}else quoted=!quoted}else if(ch===delimiter&&!quoted){out.push(cur);cur=""}else cur+=ch}
 out.push(cur);return out
}
function parseAmount(raw){
 let x=String(raw||"").trim().replace(/[^0-9,.-]/g,"");if(!x)return NaN;
 const comma=x.lastIndexOf(","),dot=x.lastIndexOf(".");
 if(comma>-1&&dot>-1){if(comma>dot)x=x.replace(/\./g,"").replace(",",".");else x=x.replace(/,/g,"")}
 else if(comma>-1)x=x.replace(",",".");
 return Number(x)
}
async function importReconciliationCsv(file,statusEl){
 statusEl.textContent="Reading CSV…";
 const text=await file.text(),lines=text.split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2){statusEl.textContent="CSV has no data rows.";return}
 const delimiter=(lines[0].split(";").length>lines[0].split(",").length)?";":",";
 const headers=parseCsvRow(lines[0],delimiter).map(x=>x.trim().toLowerCase());
 const find=(cands)=>headers.findIndex(h=>cands.some(c=>h===c||h.includes(c)));
 const idCol=find(["transaction id","transactionid","transaktionscode","transaction_id","reference","referenz"]);
 const dateCol=find(["date","datum"]);
 const nameCol=find(["name","payer","sender","absender"]);
 const amountCol=find(["amount","betrag","gross","net"]);
 const currencyCol=find(["currency","währung","waehrung"]);
 if(amountCol<0){statusEl.textContent="Could not identify an amount column.";return}
 let imported=0,skipped=0;
 for(let i=1;i<lines.length;i++){
   const row=parseCsvRow(lines[i],delimiter);const amount=parseAmount(row[amountCol]);
   if(!(amount>0)){skipped++;continue}
   const currency=(currencyCol>=0?String(row[currencyCol]||"EUR").trim().toUpperCase():"EUR");
   const rawDate=dateCol>=0?String(row[dateCol]||"").trim():"";
   let paidAt=null;if(rawDate){const d=new Date(rawDate);if(!Number.isNaN(d.getTime()))paidAt=d.toISOString()}
   try{
     await reconciliationAction({action:"import",provider:"paypal_pool",provider_ref:idCol>=0?String(row[idCol]||"").trim():null,amount_cents:Math.round(amount*100),currency,paid_at:paidAt,payer_label:nameCol>=0?String(row[nameCol]||"").trim():null,raw:Object.fromEntries(headers.map((h,j)=>[h,row[j]??""]))});
     imported++;
   }catch{skipped++}
 }
 reconciliationState=null;await loadReconciliation();statusEl.textContent="Imported "+imported+" row"+(imported===1?"":"s")+(skipped?" · skipped "+skipped:"");renderAdmin()
}
function reconciliationView(){
 const wrap=make("div");
 const imp=make("div",undefined,"admin-panel");
 imp.append(make("h4","PayPal Pool reconciliation"),make("div","Import a PayPal CSV/export or add payments manually. The queue never changes public totals until an item is matched to an existing contribution or converted into a new one.","admin-hint"));
 const file=input("file");file.accept=".csv,text/csv,text/plain";const im=msg();file.onchange=()=>{if(file.files?.[0])importReconciliationCsv(file.files[0],im).catch(()=>im.textContent="CSV import failed.")};
 const manualGrid=make("div",undefined,"admin-grid"),mRef=input("text"),mName=input("text"),mAmount=input("number"),mDate=input("datetime-local");mAmount.min=".01";mAmount.step=".01";
 manualGrid.append(field("Provider reference",mRef),field("Payer label (private)",mName),field("Amount (€)",mAmount),field("Paid at",mDate));
 const manualMsg=msg();
 imp.append(field("Import CSV",file),im,manualGrid,button("Add unmatched payment",async()=>{if(!(Number(mAmount.value)>0)){manualMsg.textContent="Amount required.";return}manualMsg.textContent="Adding…";try{await reconciliationAction({action:"import",provider:"paypal_pool",provider_ref:mRef.value.trim()||null,amount_cents:Math.round(Number(mAmount.value)*100),currency:"EUR",paid_at:mDate.value?new Date(mDate.value).toISOString():null,payer_label:mName.value.trim()||null,raw:null});reconciliationState=null;await loadReconciliation();manualMsg.textContent="Added.";renderAdmin()}catch{manualMsg.textContent="Could not add payment."}}),manualMsg);
 wrap.append(imp);

 const p=make("div",undefined,"admin-panel");p.append(make("h4","Reconciliation queue"));
 const rows=reconciliationState?.items||[];
 if(!rows.length){p.append(make("div","No imported payments yet.","admin-hint"));wrap.append(p);return wrap}
 rows.forEach(x=>{
   const row=make("div",undefined,"admin-row"),head=make("div",undefined,"admin-row-head"),left=make("div");
   left.append(make("b",money(x.amountCents)),make("span",(x.status||"unmatched").toUpperCase(),"source-chip"));head.append(left,make("span",(x.payerLabel||"Unknown payer")+" · "+(x.paidAt?new Date(x.paidAt).toLocaleString():"no date")));
   const meta=make("div",(x.providerRef?"Ref "+x.providerRef+" · ":"")+(x.currency||"EUR"),"admin-hint"),m=msg(),actions=make("div",undefined,"admin-actions");
   if(x.status==="unmatched"){
     const sugg=document.createElement("select");const none=document.createElement("option");none.value="";none.textContent="Suggested existing contribution…";sugg.append(none);
     (x.suggestions||[]).forEach(y=>{const o=document.createElement("option");o.value=y.contributionId;o.textContent=(y.supporterId||"no ID")+" · "+y.realName+" · "+y.date;sugg.append(o)});
     actions.append(sugg,button("Match existing",async()=>{if(!sugg.value){m.textContent="Choose a suggestion.";return}m.textContent="Matching…";try{await reconciliationAction({action:"match",id:x.id,contribution_id:sugg.value});reconciliationState=null;await loadReconciliation();m.textContent="Matched.";renderAdmin()}catch{m.textContent="Could not match."}},"green"));

     const sup=document.createElement("select"),newO=document.createElement("option");newO.value="";newO.textContent="New supporter";sup.append(newO);
     (supporters?.supporters||[]).forEach(y=>{const o=document.createElement("option");o.value=y.id;o.textContent=y.supporterId+" · "+y.realName;sup.append(o)});
     actions.append(sup,button("Create contribution + match",async()=>{m.textContent="Creating…";try{const d=await addContributionAction({supporter_id:sup.value||null,real_name:sup.value?null:(x.payerLabel||"PayPal Pool contributor"),amount_cents:x.amountCents,original_amount:Number(x.amountCents)/100,original_currency:x.currency||"EUR",contributed_on:x.paidAt?String(x.paidAt).slice(0,10):new Date().toISOString().slice(0,10),status:"confirmed",source:"paypal_pool",public_name:false,note:x.providerRef?("PayPal Pool ref "+x.providerRef):"Imported PayPal Pool payment"});await reconciliationAction({action:"match",id:x.id,contribution_id:d.id});supporters=null;reconciliationState=null;admin=await adminAction({action:"list"});await loadSupporters();await loadReconciliation();m.textContent="Contribution created and matched.";renderAdmin();await refreshPublic()}catch{m.textContent="Could not create/match contribution."}}));
     actions.append(button("Ignore",async()=>{await reconciliationAction({action:"ignore",id:x.id});reconciliationState=null;await loadReconciliation();renderAdmin()},"alt"));
   }else{
     actions.append(button("Reopen",async()=>{await reconciliationAction({action:"reopen",id:x.id});reconciliationState=null;await loadReconciliation();renderAdmin()},"alt"));
   }
   row.append(head,meta,actions,m);p.append(row)
 });
 wrap.append(p);return wrap
}

async function campaignView(){
 const wrap=make("div"),c=admin.campaign||{};
 const edit=make("div",undefined,"admin-panel");
 edit.append(make("h4","Public campaign experience"),make("div","Control what the public sees. Technical configuration remains private.","admin-hint"));
 const g=make("div",undefined,"admin-grid");
 const title=input("text",c.title||""),benef=input("text",c.beneficiary||""),subtitle=input("text",c.subtitle||"");
 const status=document.createElement("select"),theme=document.createElement("select");
 ["draft","active","goal_reached","closed","archived"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;o.selected=c.status===v;status.append(o)});
 [["assembly","Assembly"],["paper","Paper"],["night","Night"]].forEach(([v,l])=>{const o=document.createElement("option");o.value=v;o.textContent=l;o.selected=(c.theme||"assembly")===v;theme.append(o)});
 const storyEn=document.createElement("textarea"),storyFr=document.createElement("textarea"),overEn=document.createElement("textarea"),overFr=document.createElement("textarea"),thanksEn=document.createElement("textarea"),thanksFr=document.createElement("textarea");
 storyEn.value=c.story_en||"";storyFr.value=c.story_fr||"";overEn.value=c.overfunding_policy_en||"";overFr.value=c.overfunding_policy_fr||"";thanksEn.value=c.thank_you_en||"";thanksFr.value=c.thank_you_fr||"";
 const paymentUrl=input("url",c.payment_url||C.paypalPoolUrl||""),paymentEn=input("text",c.payment_label_en||"Contribute with PayPal"),paymentFr=input("text",c.payment_label_fr||"Contribuer avec PayPal");
 g.append(field("Title",title),field("Beneficiary",benef),field("Subtitle",subtitle),field("Lifecycle",status),field("Theme",theme),field("Payment URL",paymentUrl),field("Payment label EN",paymentEn),field("Payment label FR",paymentFr),field("Story EN",storyEn),field("Story FR",storyFr),field("Thank-you EN",thanksEn),field("Thank-you FR",thanksFr),field("Overfunding EN",overEn),field("Overfunding FR",overFr));
 edit.append(g);

 const vis=make("div",undefined,"admin-panel");vis.append(make("h4","Public sections"),make("div","Turn sections off when they do not add value. Empty sections also hide automatically.","admin-hint"));
 const vg=make("div",undefined,"admin-grid");
 const toggles=[
   ["show_supporters","Show randomized supporter wall",c.show_supporters!==false],
   ["show_analytics","Show trajectory & charts",c.show_analytics!==false],
   ["show_milestones","Show milestones",c.show_milestones!==false],
   ["show_ledger","Show public ledger details",c.show_ledger!==false],
   ["show_expenses","Show disbursement details",c.show_expenses!==false],
   ["show_updates","Show campaign journal",c.show_updates!==false]
 ];
 const controls={};
 toggles.forEach(([key,label,checked])=>{const cb=input("checkbox");cb.checked=checked;controls[key]=cb;const lab=make("label");lab.style.cssText="display:flex;align-items:center;gap:8px;font-size:.72rem;font-weight:800";lab.append(cb,document.createTextNode(label));vg.append(lab)});
 vis.append(vg);

 const m=msg();
 const saveBtn=button("Save public experience",()=>save({
   action:"update_campaign",title:title.value,beneficiary:benef.value,subtitle:subtitle.value,status:status.value,theme:theme.value,
   payment_url:paymentUrl.value,payment_label_en:paymentEn.value,payment_label_fr:paymentFr.value,
   story_en:storyEn.value,story_fr:storyFr.value,thank_you_en:thanksEn.value,thank_you_fr:thanksFr.value,
   overfunding_en:overEn.value,overfunding_fr:overFr.value,
   show_supporters:controls.show_supporters.checked,show_analytics:controls.show_analytics.checked,
   show_milestones:controls.show_milestones.checked,show_ledger:controls.show_ledger.checked,
   show_expenses:controls.show_expenses.checked,show_updates:controls.show_updates.checked
 },m));
 edit.append(saveBtn,m);wrap.append(edit,vis);

 const templates=make("div",undefined,"admin-panel");
 templates.append(make("h4","Campaign templates"),make("div","Start a new campaign from purpose-specific defaults. New campaigns remain drafts until you activate them.","admin-hint"));
 if(!templatesState)await loadTemplates();
 const tsel=document.createElement("select");
 (templatesState?.templates||[]).forEach(t=>{const o=document.createElement("option");o.value=t.slug;o.textContent=t.name+" · "+t.description;tsel.append(o)});
 const tt=input("text"),tb=input("text"),ts=input("text"),tslug=input("text"),tgoal=input("number");tgoal.min="1";
 const refreshTemplateDefaults=()=>{const t=(templatesState?.templates||[]).find(x=>x.slug===tsel.value);if(t?.defaults?.target_cents)tgoal.value=(Number(t.defaults.target_cents)/100).toFixed(0)};
 tsel.onchange=refreshTemplateDefaults;refreshTemplateDefaults();
 const tg=make("div",undefined,"admin-grid");tg.append(field("Template",tsel),field("Title",tt),field("Beneficiary",tb),field("Subtitle",ts),field("Slug",tslug),field("Target (€)",tgoal));
 const tm=msg();
 templates.append(tg,button("Create draft from template",async()=>{if(!tt.value.trim()){tm.textContent="Title is required.";return}tm.textContent="Creating…";try{await templateAction({action:"create",template_slug:tsel.value,title:tt.value.trim(),beneficiary:tb.value.trim(),subtitle:ts.value.trim(),slug:tslug.value.trim(),target_cents:Math.round(Number(tgoal.value||0)*100)});campaigns=null;await loadCampaigns();tm.textContent="Draft campaign created.";renderAdmin()}catch{tm.textContent="Could not create campaign from template."}},"green"),tm);
 wrap.append(templates);

 const library=make("div",undefined,"admin-panel");
 library.append(make("h4","Campaign library"),make("div","Create future campaigns here. Only one campaign is active publicly at a time.","admin-hint"));
 if(!campaigns)await loadCampaigns();
 (campaigns?.campaigns||[]).forEach(x=>{
   const card=make("div",undefined,"campaign-card"+(x.is_active?" active":""));
   const d=make("div");d.append(make("strong",x.title),make("span",(x.status||"draft")+" · "+money(x.target_cents)));
   card.append(d,x.is_active?make("span","ACTIVE","source-chip"):button("Activate",async()=>{if(!confirm("Make this the public active campaign?"))return;await campaignAction({action:"activate",id:x.id});campaigns=null;admin=await adminAction({action:"list"});await loadCampaigns();renderAdmin();await refreshPublic()},"green"));
   library.append(card)
 });
 const create=make("div",undefined,"admin-row");create.append(make("h5","Create new campaign"));
 const cg=make("div",undefined,"admin-grid"),ct=input("text"),cb=input("text"),cs=input("text"),cslug=input("text"),ctarget=input("number"),cstory=document.createElement("textarea"),cstoryfr=document.createElement("textarea");
 ctarget.min="1";ctarget.value="700";cg.append(field("Title",ct),field("Beneficiary",cb),field("Subtitle",cs),field("Slug",cslug),field("Target (€)",ctarget),field("Story EN",cstory),field("Story FR",cstoryfr));
 const cm=msg();create.append(cg,button("Create draft campaign",async()=>{cm.textContent="Creating…";try{await campaignAction({action:"create",title:ct.value.trim(),beneficiary:cb.value.trim(),subtitle:cs.value.trim(),slug:cslug.value.trim(),target_cents:Math.round(Number(ctarget.value)*100),currency:"EUR",theme:"assembly",story_en:cstory.value,story_fr:cstoryfr.value});campaigns=null;await loadCampaigns();cm.textContent="Campaign created.";renderAdmin()}catch{cm.textContent="Could not create campaign."}},"alt"),cm);
 library.append(create);wrap.append(library);return wrap
}
async function languagesView(){
 const wrap=make("div");
 if(!localeState)await loadLocales();
 const currentLocales=localeState?.enabledLocales||["en","fr"];
 const all=["en","fr","de","es","it","pt","nl","ar"];
 const p=make("div",undefined,"admin-panel");
 p.append(make("h4","Languages"),make("div","Enable the languages this campaign should offer publicly. Localized campaign copy is stored in Supabase, not hard-coded into the page.","admin-hint"));
 const boxes=make("div",undefined,"admin-grid"),checks={};
 all.forEach(code=>{const cb=input("checkbox");cb.checked=currentLocales.includes(code);checks[code]=cb;const lab=make("label");lab.style.cssText="display:flex;gap:8px;align-items:center;font-size:.72rem;font-weight:800";lab.append(cb,document.createTextNode((window.SOLIDARITY_LOCALES?.names?.[code]||code.toUpperCase())));boxes.append(lab)});
 const enableMsg=msg();p.append(boxes,button("Save enabled languages",async()=>{const locales=all.filter(x=>checks[x].checked);if(!locales.length){enableMsg.textContent="Enable at least one language.";return}enableMsg.textContent="Saving…";try{await localeAction({action:"set_enabled_locales",locales});localeState=null;await loadLocales();enableMsg.textContent="Languages saved.";await refreshPublic()}catch{enableMsg.textContent="Could not save languages."}}),enableMsg);wrap.append(p);

 const edit=make("div",undefined,"admin-panel");edit.append(make("h4","Localized campaign content"));
 const select=document.createElement("select");all.forEach(code=>{const o=document.createElement("option");o.value=code;o.textContent=window.SOLIDARITY_LOCALES?.names?.[code]||code.toUpperCase();select.append(o)});
 const title=input("text"),subtitle=input("text"),payment=input("text"),story=document.createElement("textarea"),thanks=document.createElement("textarea"),over=document.createElement("textarea");
 const load=()=>{const c=localeState?.localeContent?.[select.value]||{};title.value=c.title||"";subtitle.value=c.subtitle||"";payment.value=c.paymentLabel||"";story.value=c.story||"";thanks.value=c.thankYou||"";over.value=c.overfunding||""};select.onchange=load;load();
 const grid=make("div",undefined,"admin-grid");grid.append(field("Language",select),field("Title",title),field("Subtitle",subtitle),field("Payment label",payment),field("Story",story),field("Thank-you",thanks),field("Overfunding policy",over));
 const lm=msg();edit.append(grid,button("Save translation",async()=>{lm.textContent="Saving…";try{await localeAction({action:"set_locale",locale:select.value,content:{title:title.value.trim(),subtitle:subtitle.value.trim(),paymentLabel:payment.value.trim(),story:story.value.trim(),thankYou:thanks.value.trim(),overfunding:over.value.trim()}});localeState=null;await loadLocales();lm.textContent="Translation saved.";await refreshPublic()}catch{lm.textContent="Could not save translation."}}),lm);wrap.append(edit);
 return wrap
}

function milestonesView(){
 const p=make("div",undefined,"admin-panel");p.append(make("h4","Milestones"),make("div","Milestones give collective progress meaning without ranking supporters.","admin-hint"));(admin.milestones||[]).forEach(x=>{const r=make("div",undefined,"admin-row-head");r.append(make("b",x.label_en),make("span",money(x.threshold_cents)));const box=make("div",undefined,"admin-row");box.append(r,button("Remove",()=>save({action:"delete_milestone",id:x.id},msg()),"alt"));p.append(box)});
 const g=make("div",undefined,"admin-grid"),en=input("text"),fr=input("text"),threshold=input("number"),order=input("number","0");threshold.min="1";g.append(field("Label EN",en),field("Label FR",fr),field("Threshold (€)",threshold),field("Order",order));const m=msg();p.append(g,button("Add milestone",()=>save({action:"add_milestone",label_en:en.value,label_fr:fr.value,threshold_cents:Math.round(Number(threshold.value)*100),sort_order:Number(order.value)||0},m)),m);return p
}
function expensesView(){
 const p=make("div",undefined,"admin-panel");p.append(make("h4","Expenses & disbursements"),make("div","Public recorded expenses reduce the available balance but not the amount raised.","admin-hint"));(admin.expenses||[]).forEach(x=>{const row=make("div",undefined,"admin-row-head");row.append(make("b",x.label_en),make("span",money(x.amount_cents)+" · "+x.status));const box=make("div",undefined,"admin-row");box.append(row,button("Remove",()=>save({action:"delete_expense",id:x.id},msg()),"alt"));p.append(box)});
 const g=make("div",undefined,"admin-grid"),en=input("text"),fr=input("text"),amount=input("number"),date=input("date"),noteEn=document.createElement("textarea"),noteFr=document.createElement("textarea");date.value=new Date().toISOString().slice(0,10);amount.min=".01";amount.step=".01";g.append(field("Label EN",en),field("Label FR",fr),field("Amount (€)",amount),field("Date",date),field("Public note EN",noteEn),field("Public note FR",noteFr));const m=msg();p.append(g,button("Record expense",()=>save({action:"add_expense",label_en:en.value,label_fr:fr.value,amount_cents:Math.round(Number(amount.value)*100),spent_on:date.value,status:"recorded",note_en:noteEn.value,note_fr:noteFr.value},m)),m);return p
}
function updatesView(){
 const p=make("div",undefined,"admin-panel");p.append(make("h4","Campaign updates"),make("div","Publish short progress notes without changing the campaign story.","admin-hint"));(admin.updates||[]).filter(x=>!window.RBEventsAdmin?.isEventRecord(x)).forEach(x=>{const box=make("div",undefined,"admin-row");const row=make("div",undefined,"admin-row-head");row.append(make("b",x.title_en),make("span",new Date(x.published_at).toLocaleDateString()));box.append(row,button("Remove",()=>save({action:"delete_update",id:x.id},msg()),"alt"));p.append(box)});
 const g=make("div",undefined,"admin-grid"),te=input("text"),tf=input("text"),be=document.createElement("textarea"),bf=document.createElement("textarea");g.append(field("Title EN",te),field("Title FR",tf),field("Body EN",be),field("Body FR",bf));const m=msg();p.append(g,button("Publish update",()=>save({action:"add_update",title_en:te.value,title_fr:tf.value,body_en:be.value,body_fr:bf.value,is_public:true},m)),m);return p
}
async function integrationsView(){
 const p=make("div",undefined,"admin-panel");
 p.append(make("h4","Payment integrations"),make("div","These details are private to organizers and never shown on the public page.","admin-hint"));
 const pool=admin.campaign?.payment_url||C.paypalPoolUrl||"";
 const grid=make("div",undefined,"admin-grid");
 const url=input("text",pool);url.readOnly=true;
 const auto=document.createElement("div");auto.className="admin-field";auto.append(make("span","Automatic PayPal API"));
 const autoValue=make("div","Checking…");autoValue.style.cssText="padding:9px;border:1px solid #d2c8bc;border-radius:9px;background:#fff;font-size:.72rem";auto.append(autoValue);
 grid.append(field("PayPal Pool URL",url),auto);p.append(grid);
 const actions=make("div",undefined,"admin-actions");
 actions.append(
  button("Open Pool",()=>window.open(pool,"_blank","noopener"),"alt"),
  button("Copy Pool link",async()=>{await navigator.clipboard.writeText(pool);autoValue.textContent="Pool link copied."},"alt"),
  button("Copy share message",async()=>{const title=admin.campaign?.title||"Solidarity Fund";const text=title+"\n"+(admin.campaign?.subtitle||"We carry it together.")+"\n"+location.origin+location.pathname+"\nPayPal: "+pool;await navigator.clipboard.writeText(text);autoValue.textContent="Share message copied."},"alt")
 );
 p.append(actions);
 try{const r=await fetch("/api/paypal",{cache:"no-store"});const d=await r.json();autoValue.textContent=d.enabled?("Ready · "+(d.environment||"sandbox")+" · "+(d.currency||"EUR")):"Not configured · Pool remains the active payment route."}catch{autoValue.textContent="Automatic API unavailable · Pool remains the active payment route."}
 return p
}

function reportsView(){
 const p=make("div",undefined,"admin-panel");
 p.append(make("h4","Reports, sharing & checkpoints"),make("div","Portable exports, printable reporting, campaign snapshots and a share image. These tools stay private to organizers.","admin-hint"));
 const acts=make("div",undefined,"admin-actions");

 acts.append(
  button("Export full JSON",()=>{const blob=new Blob([JSON.stringify(admin,null,2)],{type:"application/json"});download(blob,(admin.campaign?.slug||"campaign")+"-private.json")}),
  button("Export contributions CSV",()=>{const rows=[["Name","Amount EUR","Date","Status","Public","Source","Note"],...(admin.contributions||[]).map(x=>[x.real_name,(x.amount_cents/100).toFixed(2),x.contributed_on,x.status,x.public_name?"yes":"no",x.source||"manual",x.note||""])];const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");download(new Blob([csv],{type:"text/csv"}),(admin.campaign?.slug||"campaign")+"-contributions.csv")},"alt"),
  button("Open public final report",()=>window.open("../report/","_blank","noopener"),"alt"),
  button("Print public report",()=>window.print(),"alt"),
  button("Create share card",()=>createShareCard(),"alt")
 );
 p.append(acts);

 if(can("owner","auditor")){const snap=make("div",undefined,"admin-row");
 snap.append(make("h5","Campaign snapshots"));
 const label=input("text");label.placeholder="e.g. Before changing target";
 const sm=msg();
 const sacts=make("div",undefined,"admin-actions");
 sacts.append(
   button("Create snapshot",async()=>{sm.textContent="Saving snapshot…";try{await adminTools({action:"snapshot_create",label:label.value.trim()||null});sm.textContent="Snapshot created."}catch{sm.textContent="Could not create snapshot."}},"green"),
   button("List snapshots",async()=>{sm.textContent="Loading…";try{const d=await adminTools({action:"snapshot_list"});sm.textContent=(d.snapshots||[]).map(x=>(x.label||"Snapshot")+" · "+new Date(x.createdAt).toLocaleString()).join("\n")||"No snapshots yet."}catch{sm.textContent="Could not load snapshots."}},"alt")
 );
 snap.append(field("Snapshot label",label),sacts,sm);p.append(snap)}
 return p
}

function createShareCard(){
 const rows=admin.contributions||[];
 const gross=rows.filter(x=>["confirmed","received"].includes(x.status)).reduce((s,x)=>s+x.amount_cents,0);
 const refunds=rows.filter(x=>x.status==="refunded").reduce((s,x)=>s+x.amount_cents,0);
 const net=Math.max(0,gross-refunds),target=admin.targetCents||70000,pct=target?Math.min(100,net/target*100):0;
 const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=630;const ctx=canvas.getContext("2d");
 ctx.fillStyle="#f3eee5";ctx.fillRect(0,0,1200,630);
 ctx.fillStyle="#151317";ctx.fillRect(0,0,42,630);
 ctx.fillStyle="#b33245";ctx.beginPath();ctx.arc(1080,90,210,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#151317";ctx.font="700 30px system-ui";ctx.fillText((admin.campaign?.title||"Solidarity Fund").toUpperCase(),90,95);
 ctx.fillStyle="#766f68";ctx.font="500 23px system-ui";ctx.fillText(admin.campaign?.subtitle||"We carry it together.",90,140);
 ctx.fillStyle="#151317";ctx.font="900 92px system-ui";ctx.fillText(new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(net/100),90,290);
 ctx.fillStyle="#766f68";ctx.font="600 28px system-ui";ctx.fillText("of "+new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(target/100)+" · "+Math.round(pct)+"% · "+rows.filter(x=>["confirmed","received"].includes(x.status)).length+" supporters",95,335);
 ctx.fillStyle="#d8d0c5";ctx.fillRect(90,390,900,24);ctx.fillStyle="#b33245";ctx.fillRect(90,390,900*(pct/100),24);
 ctx.fillStyle="#295846";ctx.font="800 26px system-ui";ctx.fillText("No charity. Solidarity.",90,485);
 ctx.fillStyle="#766f68";ctx.font="500 21px system-ui";ctx.fillText(location.origin+location.pathname,90,540);
 canvas.toBlob(blob=>{if(blob)download(blob,(admin.campaign?.slug||"campaign")+"-share-card.png")},"image/png")
}

function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function securityView(){
 const wrap=make("div");
 const session=make("div",undefined,"admin-panel");
 session.append(make("h4","Current organizer session"));
 const grid=make("div",undefined,"admin-metrics");
 [[authContext?.displayName||"Owner","Identity"],[(authContext?.role||"owner").toUpperCase(),"Role"],[authContext?.username||"owner","Username"]].forEach(([v,l])=>{const c=make("div",undefined,"admin-metric");c.append(make("b",v),make("span",l));grid.append(c)});
 const sm=msg();session.append(grid,button("Sign out",async()=>{try{if(!authContext?.breakGlass&&secret)await rpc("solidarity_organizer_logout",{p_token:secret})}catch{}sessionStorage.removeItem("solidarity_named_session");secret=null;authContext=null;admin=null;login()},"alt"),sm);wrap.append(session);

 if(!can("owner"))return wrap;

 const breakGlass=make("div",undefined,"admin-panel");
 breakGlass.append(make("h4","Break-glass Owner password"),make("div","Changing this password invalidates the shared emergency Owner credential. Named account sessions remain separate.","admin-hint"));
 const pg=make("div",undefined,"admin-grid"),np=input("password"),cp=input("password");np.autocomplete=cp.autocomplete="new-password";pg.append(field("New Owner password",np),field("Confirm Owner password",cp));const pm=msg();
 breakGlass.append(pg,button("Change Owner password",async()=>{if(np.value.length<10){pm.textContent="Use at least 10 characters.";return}if(np.value!==cp.value){pm.textContent="Passwords do not match.";return}pm.textContent="Changing…";try{const nd=await digest(np.value);await adminAction({action:"set_password",new_secret_digest:nd});if(authContext?.breakGlass)secret=nd;np.value=cp.value="";pm.textContent="Owner password changed."}catch{pm.textContent="Could not change Owner password."}}),pm);wrap.append(breakGlass);

 const accounts=make("div",undefined,"admin-panel");accounts.append(make("h4","Named organizer accounts"),make("div","Create role-specific accounts instead of sharing the Owner password. Sessions expire after 12 hours.","admin-hint"));
 const cm=msg(),cg=make("div",undefined,"admin-grid"),user=input("text"),display=input("text"),role=document.createElement("select"),pw=input("password");
 ["treasurer","organizer","auditor","owner"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;role.append(o)});cg.append(field("Username",user),field("Display name",display),field("Role",role),field("Temporary password",pw));
 accounts.append(cg,button("Create account",async()=>{if(!user.value.trim()||!display.value.trim()||pw.value.length<10){cm.textContent="Username, display name and a 10+ character password are required.";return}cm.textContent="Creating…";try{await accountsAction({action:"create",username:user.value.trim(),display_name:display.value.trim(),role:role.value,secret_digest:await digest(pw.value)});accountsState=null;await loadAccounts();cm.textContent="Account created.";renderAdmin()}catch{cm.textContent="Could not create account."}},"green"),cm);

 const list=make("div");
 (accountsState?.accounts||[]).forEach(x=>{const row=make("div",undefined,"admin-row"),head=make("div",undefined,"admin-row-head"),left=make("div");left.append(make("b",x.displayName),make("span",x.role.toUpperCase(),"source-chip"));head.append(left,make("span",x.username+" · "+x.sessionCount+" active session"+(x.sessionCount===1?"":"s")));const rg=make("div",undefined,"admin-grid"),dn=input("text",x.displayName),rr=document.createElement("select"),aa=input("checkbox");aa.checked=!!x.active;["owner","treasurer","organizer","auditor"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;o.selected=x.role===v;rr.append(o)});const reset=input("password");rg.append(field("Display name",dn),field("Role",rr),field("Active",aa),field("New password (optional)",reset));const m=msg(),acts=make("div",undefined,"admin-actions");acts.append(button("Save account",async()=>{m.textContent="Saving…";try{await accountsAction({action:"update",id:x.id,display_name:dn.value.trim(),role:rr.value,active:aa.checked});accountsState=null;await loadAccounts();m.textContent="Saved.";renderAdmin()}catch{m.textContent="Could not save account."}}),button("Revoke sessions",async()=>{await accountsAction({action:"revoke_sessions",id:x.id});accountsState=null;await loadAccounts();renderAdmin()},"alt"));acts.append(button("Reset password",async()=>{if(reset.value.length<10){m.textContent="Enter a 10+ character new password.";return}try{await accountsAction({action:"reset_password",id:x.id,secret_digest:await digest(reset.value)});accountsState=null;await loadAccounts();m.textContent="Password reset and sessions revoked.";renderAdmin()}catch{m.textContent="Could not reset password."}},"red"));row.append(head,rg,acts,m);list.append(row)});
 accounts.append(list);wrap.append(accounts);
 return wrap
}
function auditView(){
 const p=make("div",undefined,"admin-panel");p.append(make("h4","Audit trail"),make("div","Latest 100 recorded changes. This is deliberately read-only.","admin-hint"));const list=make("div",undefined,"audit-list");(audit?.audit||[]).forEach(x=>{const row=make("div",undefined,"audit-item");row.append(make("strong",x.action+" · "+x.entity_type),make("code",x.entity_id||""),make("time",new Date(x.created_at).toLocaleString()));list.append(row)});p.append(list);return p
}
async function renderAdmin(){
 mount.replaceChildren();const head=make("div",undefined,"admin-head");const title=make("div");title.append(make("strong",admin?.campaign?.title||"Organizer control room"),make("small",(authContext?.displayName||"Owner")+" · "+(authContext?.role||"owner")+" · private live administration"));head.append(title,button("Lock",async()=>{try{if(!authContext?.breakGlass&&secret)await rpc("solidarity_organizer_logout",{p_token:secret})}catch{}sessionStorage.removeItem("solidarity_named_session");secret=null;authContext=null;admin=null;active="overview";campaigns=null;audit=null;supporters=null;localeState=null;healthState=null;templatesState=null;reconciliationState=null;accountsState=null;login()},"alt"));mount.append(head,tabs());
 let view;
 if(active==="health"){if(!healthState)await loadHealth();view=healthView();}
 else if(active==="supporters"){if(!supporters)await loadSupporters();view=supportersView();}
 else if(active==="contributions"){if(!supporters)await loadSupporters();view=contributionsView();}
 else if(active==="reconciliation"){if(!reconciliationState)await loadReconciliation();if(!supporters)await loadSupporters();view=reconciliationView();}
 else if(active==="events")view=window.RBEventsAdmin?.render(window.RBAdminHost)||make("div","Events module unavailable.","admin-panel");
 else if(active==="campaign")view=await campaignView();
 else if(active==="languages"){if(!localeState)await loadLocales();view=await languagesView();}
 else if(active==="milestones")view=milestonesView();
 else if(active==="expenses")view=expensesView();
 else if(active==="updates")view=updatesView();
 else if(active==="integrations")view=await integrationsView();
 else if(active==="reports")view=reportsView();
 else if(active==="security"){if(can("owner")&&!accountsState)await loadAccounts();view=securityView();}
 else if(active==="audit")view=auditView();
 else view=overviewView();
 mount.append(view)
}
window.RBAdminHost={
  getCredential:()=>secret,
  getAdmin:()=>admin,
  getSupporters:()=>supporters,
  rpc,
  adminAction,
  addContributionAction,
  refreshPublic,
  money,
  make,
  input,
  field,
  button,
  msg,
  reload:async()=>{admin=await adminAction({action:"list"});supporters=null;await loadSupporters();await renderAdmin();await refreshPublic()}
};
async function restoreNamedSession(){
 const token=sessionStorage.getItem("solidarity_named_session");if(!token)return;
 try{secret=token;await loadAuthContext();dialog.showModal();await preloadAuthorizedData(false);startAutoRefresh();renderAdmin()}catch{sessionStorage.removeItem("solidarity_named_session");secret=null;authContext=null}
}
window.addEventListener("focus",()=>{if(secret)preloadAuthorizedData(false)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&secret)preloadAuthorizedData(false)});
restoreNamedSession();
})();