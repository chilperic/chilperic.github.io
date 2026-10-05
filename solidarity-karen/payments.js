(()=> {
const C=window.KAREN_SUPABASE||{};
const anchor=document.getElementById("contribute");
if(!anchor)return;

const section=document.createElement("section");
section.id="paymentPanel";
section.className="payment-section";
section.innerHTML=`
  <div class="payment-story">
    <span class="section-kicker">CONTRIBUTE</span>
    <h2>Turn solidarity into material support.</h2>
    <p>Use the PayPal Pool now, or the integrated checkout when it is enabled. The public tracker only changes after a contribution is verified.</p>
    <div class="payment-points">
      <span>🔒 PayPal handles payment credentials</span>
      <span>◉ Anonymous by default</span>
      <span>↺ Refunds remain auditable</span>
    </div>
  </div>
  <div class="payment-card">
    <div class="payment-mode">
      <strong>PayPal Pool</strong>
      <span class="live-chip">AVAILABLE NOW</span>
    </div>
    <p class="payment-copy">Open the collective PayPal Pool in PayPal. After payment, the organizer confirms the contribution before it appears in the public ledger.</p>
    <a id="poolPayBtn" class="pool-pay-btn" href="#" target="_blank" rel="noopener noreferrer">Open PayPal Pool ↗</a>
    <div class="confirm-helper">
      <span>After contributing</span>
      <button id="copyConfirmBtn" type="button">Copy confirmation message</button>
    </div>
    <div class="payment-divider"><span>Automatic checkout</span></div>
    <div id="autoPayBox" class="auto-pay-box">
      <div id="autoPayState" class="auto-pay-state">Checking integrated PayPal availability…</div>
    </div>
  </div>
`;
anchor.replaceWith(section);

const css=document.createElement("style");
css.textContent=`
.payment-section{display:grid;grid-template-columns:1fr 1fr;background:#b33245;color:#fff;border-bottom:1px solid #111014}
.payment-story,.payment-card{padding:clamp(34px,5vw,62px)}
.payment-story{border-right:1px solid #ffffff24}.payment-story .section-kicker{color:#f0ca83}
.payment-story h2{font-family:Georgia,serif;font-size:clamp(2.7rem,5vw,4.9rem);line-height:.95;letter-spacing:-.045em;font-weight:500;margin:12px 0 18px}
.payment-story p{max-width:600px;color:#f8e3e6;line-height:1.6;font-size:.86rem}
.payment-points{display:grid;gap:8px;margin-top:24px;font-size:.7rem;color:#f9e8ea}
.payment-card{background:#fffaf3;color:#111014}.payment-mode{display:flex;justify-content:space-between;gap:12px;align-items:center}.payment-mode strong{font-size:1rem}.live-chip{font-size:.58rem;letter-spacing:.08em;font-weight:950;color:#295846;background:#dfeae4;padding:5px 7px;border-radius:999px}
.payment-copy{font-size:.76rem;color:#746d67;line-height:1.5;margin:14px 0 16px}
.pool-pay-btn{display:flex;align-items:center;justify-content:center;text-decoration:none;background:#0070ba;color:#fff;padding:13px 16px;border-radius:12px;font-weight:900;font-size:.84rem}
.confirm-helper{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;font-size:.68rem;color:#746d67}.confirm-helper button{border:1px solid #d2c8bc;background:#f4efe6;border-radius:999px;padding:7px 9px;font-size:.65rem;font-weight:850}
.payment-divider{display:flex;align-items:center;gap:9px;margin:22px 0 12px;color:#8b837c;font-size:.62rem;text-transform:uppercase;letter-spacing:.1em}.payment-divider:before,.payment-divider:after{content:"";height:1px;background:#d2c8bc;flex:1}
.auto-pay-box{border:1px dashed #d2c8bc;border-radius:13px;padding:13px}.auto-pay-state{font-size:.7rem;color:#746d67;line-height:1.45}.auto-controls{display:grid;gap:9px}.auto-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.auto-presets button{border:1px solid #d2c8bc;background:#f4efe6;border-radius:8px;padding:8px;font-weight:900}.auto-controls input[type=number]{width:100%;border:1px solid #d2c8bc;border-radius:9px;padding:10px}.auto-privacy{display:flex;align-items:center;gap:8px;font-size:.72rem}.auto-privacy input{width:17px;height:17px}.auto-alias{width:100%;border:1px solid #d2c8bc;border-radius:9px;padding:10px}.paypal-mount{min-height:44px}
@media(max-width:760px){.payment-section{grid-template-columns:1fr}.payment-story{border-right:0;border-bottom:1px solid #ffffff24}.auto-presets{grid-template-columns:1fr 1fr}.confirm-helper{align-items:flex-start;flex-direction:column}}
`;
document.head.append(css);

const pool=document.getElementById("poolPayBtn");
pool.href=C.paypalPoolUrl||"https://www.paypal.com/pool/9tfV5v7iJ3";
document.getElementById("copyConfirmBtn").onclick=async()=>{
 const text="I have contributed to the solidarity fund via the PayPal Pool. Please confirm it in the tracker when received.";
 try{await navigator.clipboard.writeText(text);window.dispatchEvent(new CustomEvent("solidarity-toast",{detail:"Confirmation message copied"}))}catch{}
};

async function api(payload){
 const r=await fetch("/api/paypal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||"payment_error");
 return d;
}
function loadScript(src){return new Promise((resolve,reject)=>{if(window.paypal?.createInstance)return resolve();const s=document.createElement("script");s.src=src;s.async=true;s.onload=resolve;s.onerror=reject;document.head.append(s)})}

async function initAutomatic(){
 const box=document.getElementById("autoPayBox"),state=document.getElementById("autoPayState");
 try{
  const r=await fetch("/api/paypal",{cache:"no-store"});const cfg=await r.json();
  if(!r.ok||!cfg.enabled){state.textContent="Automatic checkout is prepared but not enabled yet. The PayPal Pool above remains the live contribution route.";return}
  box.innerHTML=`
   <div class="auto-controls">
    <div class="auto-presets"><button type="button" data-auto="10">€10</button><button type="button" data-auto="25">€25</button><button type="button" data-auto="50">€50</button><button type="button" data-auto="100">€100</button></div>
    <input id="autoAmount" type="number" min="1" max="5000" step="1" placeholder="Custom amount (€)">
    <label class="auto-privacy"><input id="autoPublic" type="checkbox"> Show a public name / alias</label>
    <input id="autoAlias" class="auto-alias hidden" type="text" maxlength="80" placeholder="Public name or alias">
    <div id="paypalMount" class="paypal-mount"></div>
    <div id="autoState" class="auto-pay-state">PayPal automatic checkout is ready.</div>
   </div>`;
  await loadScript(cfg.sdkUrl);
  const sdk=await window.paypal.createInstance({clientId:cfg.clientId,components:["paypal-payments"],pageType:"checkout",locale:document.documentElement.lang==="fr"?"fr-FR":"en-US"});
  const methods=await sdk.findEligibleMethods({currencyCode:cfg.currency});
  if(!methods.isEligible("paypal")){document.getElementById("autoState").textContent="Automatic PayPal is not eligible in this browser. Use the PayPal Pool above.";return}
  const amount=document.getElementById("autoAmount"),pub=document.getElementById("autoPublic"),alias=document.getElementById("autoAlias"),mount=document.getElementById("paypalMount"),msg=document.getElementById("autoState");
  document.querySelectorAll("[data-auto]").forEach(b=>b.onclick=()=>{amount.value=b.dataset.auto});
  pub.onchange=()=>alias.classList.toggle("hidden",!pub.checked);
  const btn=document.createElement("paypal-button");btn.setAttribute("type","pay");mount.append(btn);
  const session=sdk.createPayPalOneTimePaymentSession({
    onApprove:async({orderId})=>{msg.textContent="Confirming payment…";const d=await api({action:"capture_order",orderId,publicName:pub.checked,publicAlias:pub.checked?alias.value.trim():""});if(d.status!=="COMPLETED")throw Error("capture_not_completed");msg.textContent="Contribution received and recorded.";if(window.refreshKarenFund)await window.refreshKarenFund()},
    onCancel:()=>msg.textContent="Payment cancelled. Nothing was charged.",
    onError:()=>msg.textContent="PayPal could not complete the payment."
  });
  btn.onclick=async()=>{const n=Number(amount.value);if(!Number.isFinite(n)||n<1||n>5000){msg.textContent="Enter an amount between €1 and €5,000.";return}if(pub.checked&&!alias.value.trim()){msg.textContent="Enter the public name or alias.";return}const orderPromise=api({action:"create_order",amountCents:Math.round(n*100)}).then(d=>d.id);try{await session.start({presentationMode:"auto"},orderPromise)}catch{msg.textContent="Could not start PayPal."}};
 }catch{state.textContent="Automatic checkout is unavailable. Use the PayPal Pool above."}
}
initAutomatic();
})();