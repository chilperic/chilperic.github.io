window.RBConsent=(()=> {
const $=id=>document.getElementById(id);
async function init(){
 const A=window.RBApp,token=new URLSearchParams(location.search).get("consent");if(!token||!A)return;
 const dialog=$("consentDialog"),mount=$("consentMount");if(!dialog||!mount)return;
 $("consentClose").onclick=()=>dialog.close();
 try{
  const s=await A.rpc("solidarity_consent_state",{p_token:token});
  mount.replaceChildren();

  const idCard=document.createElement("div");
  idCard.style.cssText="padding:13px;border:1px solid #d1c5b6;border-radius:12px;background:#fffaf2;margin-bottom:12px";
  const idLabel=document.createElement("span");idLabel.style.cssText="display:block;font-size:.62rem;color:#756d65;text-transform:uppercase;letter-spacing:.08em";idLabel.textContent="Supporter ID";
  const idValue=document.createElement("strong");idValue.style.cssText="display:block;font-size:1.05rem;margin-top:4px";idValue.textContent=s.supporterId||"—";
  idCard.append(idLabel,idValue);

  const history=document.createElement("div");history.style.cssText="margin-bottom:14px";
  const hh=document.createElement("strong");hh.style.cssText="display:block;font-size:.78rem;margin-bottom:6px";hh.textContent="Your contribution history";
  history.append(hh);
  (s.history||[]).forEach(x=>{const row=document.createElement("div");row.style.cssText="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #d1c5b6;font-size:.7rem";const left=document.createElement("span");left.textContent=A.dateFmt(x.date)+" · "+x.status;const amt=document.createElement("b");amt.textContent=(x.status==="refunded"?"−":"")+A.euro(Number(x.amountCents||0)/100);row.append(left,amt);history.append(row)});

  const anon=document.createElement("label"),r1=document.createElement("input"),pub=document.createElement("label"),r2=document.createElement("input"),alias=document.createElement("input"),save=document.createElement("button"),status=document.createElement("div");
  anon.className=pub.className="consent-option";r1.type=r2.type="radio";r1.name=r2.name="consent";r1.checked=!s.publicName;r2.checked=!!s.publicName;
  anon.append(r1,document.createTextNode(" "+A.t("anonymous")));
  pub.append(r2,document.createTextNode(" "+A.t("publicName")));
  alias.type="text";alias.value=s.publicAlias||"";alias.placeholder=A.t("publicName");alias.style.cssText="width:100%;padding:10px;border:1px solid #d1c5b6;border-radius:9px;background:#fff;margin-top:9px";
  const sync=()=>alias.style.display=r2.checked?"block":"none";r1.onchange=r2.onchange=sync;sync();

  save.className="save-consent";save.textContent="Save privacy choice";
  status.style.cssText="font-size:.68rem;color:#756d65;margin-top:8px";
  save.onclick=async()=>{if(r2.checked&&!alias.value.trim()){status.textContent="Enter a public name or alias.";return}status.textContent="Saving…";try{await A.rpc("solidarity_consent_set",{p_token:token,p_public_name:r2.checked,p_alias:r2.checked?alias.value.trim():null});status.textContent=A.t("confirmed");await A.refresh()}catch{status.textContent="Could not save."}};

  mount.append(idCard,history,anon,pub,alias,save,status);dialog.showModal()
 }catch{}
}
return{init};
})();