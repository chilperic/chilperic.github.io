(()=>{const C=window.KAREN_SUPABASE,$=id=>document.getElementById(id);let secret=null,admin=null;
async function rpc(name,body={}){const r=await fetch(C.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{"Content-Type":"application/json",apikey:C.key},body:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw Error(t||"request failed");return t?JSON.parse(t):null}
async function digest(v){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function refreshPublic(){try{const d=await rpc("karen_public_state");if(typeof window.render==="function")window.render(d)}catch{}}
window.refreshKarenFund=refreshPublic;refreshPublic();setInterval(refreshPublic,30000);

const css=document.createElement("style");css.textContent=`
#adminTopFloat{position:fixed;right:16px;bottom:16px;z-index:40;border:0;background:#141618;color:#fff;padding:11px 14px;border-radius:999px;font-weight:850;box-shadow:0 10px 30px #0003}
#adminDialog::backdrop{background:#1118;backdrop-filter:blur(4px)}
.adm-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.adm-row{padding:12px 0;border-bottom:1px solid #d9d5ce}.adm-row2{display:grid;grid-template-columns:1.2fr .7fr .8fr;gap:7px}.adm-row3{display:grid;grid-template-columns:1fr 1fr auto;gap:7px;align-items:end;margin-top:7px}
.adm-field{display:grid;gap:5px;font-size:.74rem;font-weight:800}.adm-field input,.adm-field select{width:100%;min-width:0;padding:9px;border:1px solid #d9d5ce;border-radius:8px;background:white}
.adm-btn{padding:9px 11px;border-radius:8px;font-weight:800;border:0;background:#141618;color:white}.adm-btn.alt{background:white;color:#141618;border:1px solid #d9d5ce}
@media(max-width:600px){.adm-grid,.adm-row2,.adm-row3{grid-template-columns:1fr}.adm-row3 .adm-btn{width:100%}}
`;document.head.append(css);

const dialog=$("adminDialog"),mount=$("adminMount");
const float=document.createElement("button");float.id="adminTopFloat";float.type="button";float.textContent="Organizer";document.body.append(float);
const open=()=>{dialog.showModal();secret?panel():login()};float.onclick=open;$("adminBtn").onclick=open;$("adminClose").onclick=()=>dialog.close();

const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const inp=(type,value="")=>{const i=document.createElement("input");i.type=type;i.value=value;return i};
const field=(label,control)=>{const w=make("label",undefined,"adm-field");w.append(make("span",label),control);return w};
const button=(text,fn,alt=false)=>{const b=make("button",text,"adm-btn"+(alt?" alt":""));b.type="button";b.onclick=fn;return b};

function login(){mount.replaceChildren();const p=make("p","Enter the organizer password to manage contributors.");p.style.cssText="margin:0 0 12px;color:#6c6f73;font-size:.82rem";const pass=inp("password");pass.autocomplete="current-password";const msg=make("div","");msg.style.cssText="margin-top:8px;color:#8d1c2c;font-size:.78rem";const unlock=button("Unlock",async()=>{msg.textContent="Checking…";try{secret=await digest(pass.value);admin=await rpc("karen_admin_action",{p_secret_digest:secret,p_action:{action:"list"}});panel()}catch{secret=null;msg.textContent="Wrong password or admin service unavailable."}});mount.append(p,field("Password",pass),unlock,msg);unlock.style.marginTop="10px";pass.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();unlock.click()}});setTimeout(()=>pass.focus(),50)}

async function reload(){admin=await rpc("karen_admin_action",{p_secret_digest:secret,p_action:{action:"list"}});panel();await refreshPublic()}
async function save(action,msg){msg.textContent="Saving…";try{await rpc("karen_admin_action",{p_secret_digest:secret,p_action:action});await reload();const s=$("admStatus");if(s)s.textContent="Saved."}catch{msg.textContent="Could not save."}}

function panel(){mount.replaceChildren();
 const top=make("div");top.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px";top.append(make("strong","Fund administration"),button("Lock",()=>{secret=null;admin=null;login()},true));mount.append(top);
 const st=make("div","",null);st.id="admStatus";st.style.cssText="font-size:.76rem;color:#6c6f73;margin-bottom:10px";mount.append(st);

 const targetWrap=make("section");targetWrap.style.cssText="padding:13px;background:#f5f1e8;border-radius:11px;margin-bottom:14px";targetWrap.append(make("strong","Fund target"));
 const tr=make("div");tr.style.cssText="display:flex;gap:8px;margin-top:8px";const target=inp("number",String((admin.targetCents||70000)/100));target.min="1";target.step="1";target.style.flex="1";const tm=make("div","");tr.append(target,button("Save target",()=>save({action:"set_target",target_cents:Math.round(Number(target.value)*100)},tm)));targetWrap.append(tr,tm);mount.append(targetWrap);

 const add=make("section");add.style.cssText="padding:13px;border:1px solid #d9d5ce;border-radius:11px;margin-bottom:16px";add.append(make("strong","Add contribution"));const g=make("div",undefined,"adm-grid");g.style.marginTop="9px";
 const nm=inp("text"),am=inp("number"),dt=inp("date");dt.value=new Date().toISOString().slice(0,10);am.min=".01";am.step=".01";const vis=document.createElement("select");vis.innerHTML='<option value="false">Anonymous publicly</option><option value="true">Show name publicly</option>';
 g.append(field("Name",nm),field("Amount (€)",am),field("Date",dt),field("Visibility",vis));add.append(g);const addMsg=make("div","");addMsg.style.cssText="font-size:.75rem;color:#6c6f73;margin-top:7px";const addBtn=button("Add contribution",()=>{if(!nm.value.trim()||!(Number(am.value)>0)||!dt.value){addMsg.textContent="Name, amount and date are required.";return}save({action:"add",real_name:nm.value.trim(),amount_cents:Math.round(Number(am.value)*100),contributed_on:dt.value,public_name:vis.value==="true",public_alias:vis.value==="true"?nm.value.trim():null},addMsg)});addBtn.style.marginTop="10px";add.append(addBtn,addMsg);mount.append(add);

 mount.append(make("strong","Manage contributors"));const list=make("div");list.style.marginTop="8px";
 (admin.contributions||[]).forEach(x=>{const box=make("div",undefined,"adm-row");const r1=make("div",undefined,"adm-row2");const name=inp("text",x.real_name),amount=inp("number",(x.amount_cents/100).toFixed(2)),date=inp("date",x.contributed_on);amount.min=".01";amount.step=".01";r1.append(field("Name",name),field("€",amount),field("Date",date));
 const r2=make("div",undefined,"adm-row3");const status=document.createElement("select");["confirmed","received","pending","refunded","cancelled"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;o.selected=x.status===v;status.append(o)});const pub=document.createElement("select");pub.innerHTML='<option value="false">Anonymous</option><option value="true">Public</option>';pub.value=x.public_name?"true":"false";const local=make("div","");local.style.cssText="font-size:.72rem;color:#6c6f73;margin-top:5px";r2.append(field("Status",status),field("Public name",pub),button("Save",()=>save({action:"update",id:x.id,real_name:name.value.trim(),amount_cents:Math.round(Number(amount.value)*100),contributed_on:date.value,status:status.value,public_name:pub.value==="true",public_alias:pub.value==="true"?name.value.trim():null},local)));box.append(r1,r2,local);list.append(box)});
 mount.append(list);
}
})();