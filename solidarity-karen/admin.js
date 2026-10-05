(()=>{const C=window.KAREN_SUPABASE,$=id=>document.getElementById(id);let secret=null,admin=null,active="overview";
async function rpc(name,body={}){const r=await fetch(C.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:C.key},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw Error(t||"request failed");return t?JSON.parse(t):null}
async function digest(v){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function refreshPublic(){try{const d=await rpc("karen_public_state");if(typeof window.render==="function")window.render(d)}catch{}}
window.refreshKarenFund=refreshPublic;refreshPublic();setInterval(refreshPublic,30000);

const css=document.createElement("style");css.textContent=`
.admLogin{max-width:440px;margin:24px auto 10px;padding:22px;background:#fffaf2;border:1px solid #cfc5b8;border-radius:16px}
.admLogin h3{margin:0 0 8px;font-size:1.05rem}.admLogin p{margin:0 0 16px;color:#837b73;font-size:.78rem;line-height:1.45}
.admTabs{display:flex;gap:6px;overflow:auto;padding-bottom:8px;margin-bottom:14px;border-bottom:1px solid #cfc5b8}.admTab{border:0;background:#e8dfd4;color:#5f5852;padding:8px 10px;border-radius:999px;font-size:.7rem;font-weight:900;white-space:nowrap}.admTab.active{background:#151317;color:#fff}
.admHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.admHead strong{font-size:1rem}.admHead small{display:block;color:#837b73;margin-top:3px}
.admBtn{border:0;background:#151317;color:#fff;padding:9px 11px;border-radius:9px;font-weight:900;font-size:.74rem}.admBtn.alt{background:#fff;color:#151317;border:1px solid #cfc5b8}.admBtn.danger{background:#75202d}
.admGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.admField{display:grid;gap:5px;font-size:.7rem;font-weight:900;color:#514c48}.admField input,.admField select,.admField textarea{width:100%;min-width:0;border:1px solid #cfc5b8;background:#fff;padding:9px 10px;border-radius:9px}.admField textarea{min-height:78px;resize:vertical}
.admPanel{background:#fffaf2;border:1px solid #cfc5b8;border-radius:14px;padding:14px;margin-bottom:12px}.admPanel h4{margin:0 0 10px;font-size:.88rem}.admHint{font-size:.72rem;color:#837b73;line-height:1.45}.admStatus{font-size:.72rem;color:#837b73;margin-top:8px}
.admMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.admMetric{padding:12px;border-radius:12px;background:#ebe3d7}.admMetric b{display:block;font-size:1.2rem}.admMetric span{font-size:.64rem;color:#837b73}
.admList{display:grid}.admRow{padding:14px 0;border-bottom:1px solid #cfc5b8}.admRow:last-child{border-bottom:0}.admRowTop{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.admRowTop b{font-size:.86rem}.admRowTop span{font-size:.8rem;font-weight:900}
.admActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
@media(max-width:720px){.admGrid{grid-template-columns:1fr}.admMetrics{grid-template-columns:1fr 1fr}.admHead{align-items:flex-start}.admRowTop{align-items:flex-start;flex-direction:column}}
`;document.head.append(css);

const dialog=$("adminDialog"),mount=$("adminMount");
const open=()=>{dialog.showModal();secret?renderAdmin():login()};
$("adminBtn").onclick=open;$("adminClose").onclick=()=>dialog.close();

const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const inp=(type,value="")=>{const i=document.createElement("input");i.type=type;i.value=value??"";return i};
const field=(label,control)=>{const w=make("label",undefined,"admField");w.append(make("span",label),control);return w};
const button=(text,fn,kind="")=>{const b=make("button",text,"admBtn"+(kind?" "+kind:""));b.type="button";b.onclick=fn;return b};

function login(){
 mount.replaceChildren();const box=make("div",undefined,"admLogin");box.append(make("h3","Organizer access"),make("p","Use the private organizer password to manage contributions, refunds, privacy, the target and security."));
 const pass=inp("password");pass.autocomplete="current-password";const msg=make("div","", "admStatus");const unlock=button("Unlock dashboard",async()=>{msg.textContent="Checking…";try{secret=await digest(pass.value);admin=await rpc("karen_admin_action",{p_secret_digest:secret,p_action:{action:"list"}});renderAdmin()}catch{secret=null;msg.textContent="Incorrect password or admin service unavailable."}});
 box.append(field("Password",pass),unlock,msg);mount.append(box);pass.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();unlock.click()}});setTimeout(()=>pass.focus(),50)
}

async function reload(){admin=await rpc("karen_admin_action",{p_secret_digest:secret,p_action:{action:"list"}});renderAdmin();await refreshPublic()}
async function save(action,msg){msg.textContent="Saving…";try{await rpc("karen_admin_action",{p_secret_digest:secret,p_action:action});await reload()}catch{msg.textContent="Could not save changes."}}

async function paypalRefund(captureId,amountCents,msg){
  if(!captureId||!(amountCents>0)){msg.textContent="Enter a valid refund amount.";return}
  if(!confirm("Send this refund through PayPal? This action cannot be undone here."))return;
  msg.textContent="Processing PayPal refund…";
  try{
    const r=await fetch("/api/paypal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"refund",adminSecretDigest:secret,captureId,amountCents})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||"refund_failed");
    msg.textContent=d.status==="COMPLETED"?"Refund completed and recorded.":"Refund submitted to PayPal and recorded.";
    await reload();
  }catch(e){msg.textContent="PayPal refund failed. No local refund was added."}
}

function tabs(){
 const t=make("div",undefined,"admTabs");
 [["overview","Overview"],["add","Add"],["manage","Manage"],["settings","Settings"],["security","Security"]].forEach(([id,label])=>{const b=make("button",label,"admTab"+(active===id?" active":""));b.type="button";b.onclick=()=>{active=id;renderAdmin()};t.append(b)});return t
}

function overview(){
 const wrap=make("div");const rows=admin.contributions||[];const gross=rows.filter(x=>["confirmed","received"].includes(x.status)).reduce((s,x)=>s+x.amount_cents,0);const refunds=rows.filter(x=>x.status==="refunded").reduce((s,x)=>s+x.amount_cents,0);const net=Math.max(0,gross-refunds);const panel=make("div",undefined,"admPanel");panel.append(make("h4","Fund overview"));const m=make("div",undefined,"admMetrics");[[net/100,"Net total"],[rows.filter(x=>["confirmed","received"].includes(x.status)).length,"Confirmed"],[refunds/100,"Refunded"],[(admin.targetCents||70000)/100,"Target"]].forEach(([v,l],i)=>{const c=make("div",undefined,"admMetric");c.append(make("b",i===1?String(v):new Intl.NumberFormat(undefined,{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v)),make("span",l));m.append(c)});panel.append(m);wrap.append(panel);
 const recent=make("div",undefined,"admPanel");recent.append(make("h4","Recent records"));(rows.slice(0,5)).forEach(x=>{const r=make("div",undefined,"admRowTop");r.append(make("b",x.real_name),make("span",(x.amount_cents/100).toLocaleString(undefined,{style:"currency",currency:"EUR"})+" · "+x.status));recent.append(r)});wrap.append(recent);return wrap
}

function addContribution(){
 const p=make("div",undefined,"admPanel");p.append(make("h4","Add contribution"),make("div","New entries are private by default unless you explicitly make the name public.","admHint"));const g=make("div",undefined,"admGrid");g.style.marginTop="10px";
 const name=inp("text"),amount=inp("number"),date=inp("date"),status=document.createElement("select"),visibility=document.createElement("select"),note=document.createElement("textarea");date.value=new Date().toISOString().slice(0,10);amount.min=".01";amount.step=".01";["confirmed","received","pending"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;status.append(o)});visibility.innerHTML='<option value="false">Anonymous publicly</option><option value="true">Show name publicly</option>';
 g.append(field("Contributor name",name),field("Amount (€)",amount),field("Date",date),field("Status",status),field("Public visibility",visibility),field("Internal note",note));const msg=make("div","", "admStatus");const add=button("Add contribution",()=>{if(!name.value.trim()||!(Number(amount.value)>0)||!date.value){msg.textContent="Name, amount and date are required.";return}save({action:"add",real_name:name.value.trim(),amount_cents:Math.round(Number(amount.value)*100),contributed_on:date.value,status:status.value,public_name:visibility.value==="true",public_alias:visibility.value==="true"?name.value.trim():null,note:note.value.trim()||null},msg)});p.append(g,add,msg);return p
}

function manage(){
 const p=make("div",undefined,"admPanel");
 p.append(make("h4","Manage contributions"),make("div","Manual records can be corrected here. PayPal-captured amounts are locked and refunds must go through PayPal so the public ledger stays reconciled with the payment provider.","admHint"));
 const list=make("div",undefined,"admList");
 (admin.contributions||[]).forEach(x=>{
   const paypal=x.source==="paypal";
   const paypalRefundRow=paypal&&x.status==="refunded";
   const row=make("div",undefined,"admRow");
   const top=make("div",undefined,"admRowTop");
   const left=make("div");
   const src=make("span",paypal?(paypalRefundRow?"PayPal refund":"PayPal"):"Manual");
   src.style.cssText="display:inline-block;margin-left:7px;padding:3px 7px;border-radius:999px;background:"+(paypal?"#e4eef8":"#ebe3d7")+";color:#5f5852;font-size:.58rem;font-weight:900;text-transform:uppercase;vertical-align:middle";
   const who=make("b",x.real_name);left.append(who,src);
   top.append(left,make("span",(x.amount_cents/100).toLocaleString(undefined,{style:"currency",currency:"EUR"})));

   const g=make("div",undefined,"admGrid");
   const name=inp("text",x.real_name);
   const amount=inp("number",(x.amount_cents/100).toFixed(2));
   const date=inp("date",x.contributed_on);
   const status=document.createElement("select");
   const pub=document.createElement("select");
   const note=document.createElement("textarea");
   amount.min=".01";amount.step=".01";note.value=x.note||"";
   pub.innerHTML='<option value="false">Anonymous publicly</option><option value="true">Show name publicly</option>';
   pub.value=x.public_name?"true":"false";

   const allowed=paypal ? (paypalRefundRow?["refunded"]:["confirmed","received"]) : ["confirmed","received","pending","refunded","cancelled"];
   allowed.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;o.selected=x.status===v;status.append(o)});

   if(paypal){amount.readOnly=true;date.readOnly=true;amount.title="Verified PayPal amount";date.title="Recorded from PayPal";}

   g.append(field("Name",name),field(paypal?"Verified amount (€)":"Amount (€)",amount),field("Date",date),field("Status",status),field("Visibility",pub),field("Internal note",note));
   const msg=make("div","", "admStatus");
   const actions=make("div",undefined,"admActions");

   actions.append(button("Save details",()=>save({
     action:"update",id:x.id,
     real_name:name.value.trim(),
     ...(paypal?{}:{amount_cents:Math.round(Number(amount.value)*100),contributed_on:date.value,status:status.value}),
     ...(paypal&&!paypalRefundRow?{status:status.value}:{}),
     public_name:pub.value==="true",
     public_alias:pub.value==="true"?name.value.trim():null,
     note:note.value.trim()||null
   },msg)));

   if(paypal&&!paypalRefundRow&&x.provider_ref){
     const refundAmount=inp("number",(x.amount_cents/100).toFixed(2));
     refundAmount.min=".01";refundAmount.max=(x.amount_cents/100).toFixed(2);refundAmount.step=".01";
     refundAmount.style.cssText="max-width:130px;padding:9px;border:1px solid #cfc5b8;border-radius:9px";
     const wrap=make("div");wrap.style.cssText="display:flex;gap:7px;align-items:center;flex-wrap:wrap";
     wrap.append(refundAmount,button("Refund via PayPal",()=>paypalRefund(x.provider_ref,Math.round(Number(refundAmount.value)*100),msg),"danger"));
     actions.append(wrap);
   }

   row.append(top,g,actions,msg);list.append(row);
 });
 p.append(list);return p
}

function settings(){
 const p=make("div",undefined,"admPanel");p.append(make("h4","Fund target"),make("div","Change the public target without redeploying the website.","admHint"));const target=inp("number",String((admin.targetCents||70000)/100));target.min="1";target.step="1";const msg=make("div","", "admStatus");p.append(field("Target (€)",target),button("Save target",()=>save({action:"set_target",target_cents:Math.round(Number(target.value)*100)},msg)),msg);return p
}

function security(){
 const p=make("div",undefined,"admPanel");p.append(make("h4","Organizer security"),make("div","Changing the password invalidates the old one immediately. Use at least 10 characters.","admHint"));const g=make("div",undefined,"admGrid");g.style.marginTop="10px";const np=inp("password"),cp=inp("password");np.autocomplete="new-password";cp.autocomplete="new-password";g.append(field("New password",np),field("Confirm new password",cp));const msg=make("div","", "admStatus");const change=button("Change password",async()=>{if(np.value.length<10){msg.textContent="Use at least 10 characters.";return}if(np.value!==cp.value){msg.textContent="Passwords do not match.";return}msg.textContent="Changing…";try{const nd=await digest(np.value);await rpc("karen_admin_action",{p_secret_digest:secret,p_action:{action:"set_password",new_secret_digest:nd}});secret=nd;msg.textContent="Password changed successfully.";np.value="";cp.value=""}catch{msg.textContent="Could not change password."}});p.append(g,change,msg);return p
}

function renderAdmin(){
 mount.replaceChildren();const h=make("div",undefined,"admHead");const title=make("div");title.append(make("strong","Organizer control room"),make("small","Private live administration"));h.append(title,button("Lock",()=>{secret=null;admin=null;active="overview";login()},"alt"));mount.append(h,tabs());
 const view=active==="add"?addContribution():active==="manage"?manage():active==="settings"?settings():active==="security"?security():overview();mount.append(view)
}
})();