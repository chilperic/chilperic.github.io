window.RBConsent=(()=>{
const $=id=>document.getElementById(id);
async function init(){
 const A=window.RBApp,token=new URLSearchParams(location.search).get("consent");if(!token||!A)return;
 const dialog=$("consentDialog"),mount=$("consentMount");if(!dialog||!mount)return;
 $("consentClose").onclick=()=>dialog.close();
 try{
  const s=await A.rpc("solidarity_consent_state",{p_token:token});
  mount.replaceChildren();
  const intro=document.createElement("p");intro.style.cssText="font-size:.75rem;color:#756d65;line-height:1.5;margin:0 0 14px";intro.textContent=A.euro(Number(s.amountCents||0)/100)+" · "+A.dateFmt(s.date);
  const anon=document.createElement("label"),r1=document.createElement("input"),pub=document.createElement("label"),r2=document.createElement("input"),alias=document.createElement("input"),save=document.createElement("button"),status=document.createElement("div");
  anon.className=pub.className="consent-option";r1.type=r2.type="radio";r1.name=r2.name="consent";r1.checked=!s.publicName;r2.checked=!!s.publicName;
  anon.append(r1,document.createTextNode(" "+A.t("anonymous")));pub.append(r2,document.createTextNode(" "+A.t("publicName")));
  alias.type="text";alias.value=s.publicAlias||"";alias.placeholder=A.t("publicName");alias.style.cssText="width:100%;padding:10px;border:1px solid #d1c5b6;border-radius:9px;background:#fff;margin-top:9px";
  const sync=()=>alias.style.display=r2.checked?"block":"none";r1.onchange=r2.onchange=sync;sync();
  save.className="save-consent";save.textContent="Save";status.style.cssText="font-size:.68rem;color:#756d65;margin-top:8px";
  save.onclick=async()=>{if(r2.checked&&!alias.value.trim()){status.textContent="Enter a public name or alias.";return}status.textContent="Saving…";try{await A.rpc("solidarity_consent_set",{p_token:token,p_public_name:r2.checked,p_alias:r2.checked?alias.value.trim():null});status.textContent=A.t("confirmed");await A.refresh()}catch{status.textContent="Could not save."}};
  mount.append(intro,anon,pub,alias,save,status);dialog.showModal()
 }catch{}
}
return{init};
})();