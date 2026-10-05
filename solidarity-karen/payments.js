(()=> {
  const host=document.createElement("section");
  host.id="paymentPanel";
  host.innerHTML=`
    <div class="payWrap">
      <div class="payIntro">
        <div class="payEyebrow">Contribute securely</div>
        <h2>Join the collective effort.</h2>
        <p>Choose an amount, decide how you want to appear publicly, then complete the payment with PayPal. Your payment is counted only after PayPal confirms the capture.</p>
        <div class="paySecurity">🔒 PayPal handles the payment. Card or PayPal credentials never pass through this site.</div>
      </div>
      <div class="payCard">
        <div class="payLabel">Amount</div>
        <div class="presetRow">
          <button type="button" data-pay="10">€10</button>
          <button type="button" data-pay="25">€25</button>
          <button type="button" data-pay="50">€50</button>
          <button type="button" data-pay="100">€100</button>
        </div>
        <label class="payField"><span>Custom amount (€)</span><input id="payAmount" type="number" min="1" max="5000" step="1" inputmode="decimal" placeholder="25"></label>
        <label class="payCheck"><input id="payPublic" type="checkbox"><span>Show a public name or alias</span></label>
        <label class="payField" id="payAliasWrap" hidden><span>Public name / alias</span><input id="payAlias" type="text" maxlength="80" placeholder="First name or alias"></label>
        <div id="paypalMount" class="paypalMount"></div>
        <div id="payState" class="payState">Checking PayPal availability…</div>
      </div>
    </div>`;

  const css=document.createElement("style");
  css.textContent=`
    #paymentPanel{background:#b23345;color:#fff;border-bottom:1px solid #151317}
    .payWrap{display:grid;grid-template-columns:1fr 1fr;gap:0;max-width:1180px;margin:auto}
    .payIntro{padding:clamp(32px,5vw,58px);border-right:1px solid #ffffff24}
    .payEyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.64rem;font-weight:950;color:#f0c983}
    .payIntro h2{font-family:Georgia,serif;font-size:clamp(2.5rem,5vw,4.6rem);font-weight:500;line-height:.96;letter-spacing:-.045em;margin:12px 0 18px}
    .payIntro p{max-width:580px;color:#fae7e9;line-height:1.62;font-size:.9rem}
    .paySecurity{margin-top:24px;padding-top:18px;border-top:1px solid #ffffff24;font-size:.72rem;color:#f6dfe3}
    .payCard{padding:clamp(28px,5vw,50px);background:#fffaf2;color:#151317}
    .payLabel,.payField span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.09em;font-weight:900;color:#837b73;margin-bottom:7px}
    .presetRow{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:12px}
    .presetRow button{border:1px solid #cfc5b8;background:#f4efe6;padding:10px 7px;border-radius:9px;font-weight:900}
    .presetRow button.active{background:#151317;color:#fff;border-color:#151317}
    .payField{display:block;margin-top:12px}.payField input{width:100%;border:1px solid #cfc5b8;border-radius:10px;padding:11px;background:white}
    .payCheck{display:flex;gap:9px;align-items:center;margin:16px 0 4px;font-size:.78rem;font-weight:800}.payCheck input{width:18px;height:18px}
    .paypalMount{margin-top:18px;min-height:44px}.payState{font-size:.72rem;color:#837b73;margin-top:9px;line-height:1.4}
    .paySuccess{padding:14px;background:#e1eee6;color:#295846;border-radius:11px;font-weight:850}
    .payDisabled{padding:14px;background:#eee3d5;border-radius:11px;color:#6b6158;font-size:.78rem}
    paypal-button{display:block;width:100%;min-height:46px}
    @media(max-width:760px){.payWrap{grid-template-columns:1fr}.payIntro{border-right:0;border-bottom:1px solid #ffffff24}.presetRow{grid-template-columns:1fr 1fr}}
  `;
  document.head.append(css);

  const marquee=document.querySelector(".marquee");
  if(marquee) marquee.insertAdjacentElement("afterend",host); else document.querySelector(".stage")?.append(host);

  const amount=document.getElementById("payAmount");
  const publicBox=document.getElementById("payPublic");
  const aliasWrap=document.getElementById("payAliasWrap");
  const alias=document.getElementById("payAlias");
  const mount=document.getElementById("paypalMount");
  const state=document.getElementById("payState");

  document.querySelectorAll("[data-pay]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-pay]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    amount.value=b.dataset.pay;
  }));
  amount.addEventListener("input",()=>document.querySelectorAll("[data-pay]").forEach(x=>x.classList.toggle("active",x.dataset.pay===String(Number(amount.value)))));
  publicBox.addEventListener("change",()=>aliasWrap.hidden=!publicBox.checked);

  async function api(payload){
    const r=await fetch("/api/paypal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw Object.assign(new Error(d.error||"payment_error"),{details:d});
    return d;
  }
  function cents(){
    const n=Number(amount.value);
    if(!Number.isFinite(n)||n<1||n>5000) return null;
    return Math.round(n*100);
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      if(window.paypal?.createInstance) return resolve();
      const s=document.createElement("script");s.src=src;s.async=true;s.onload=resolve;s.onerror=reject;document.head.append(s);
    });
  }

  async function init(){
    try{
      const r=await fetch("/api/paypal",{cache:"no-store"});
      const cfg=await r.json();
      if(!r.ok||!cfg.enabled){
        state.className="payState payDisabled";
        state.textContent="PayPal integration is prepared but not active yet. The organizer still needs to add the PayPal sandbox Client ID and Secret in Vercel.";
        return;
      }
      await loadScript(cfg.sdkUrl);
      const sdk=await window.paypal.createInstance({
        clientId:cfg.clientId,
        components:["paypal-payments"],
        pageType:"checkout",
        locale:document.documentElement.lang==="fr"?"fr-FR":"en-US"
      });
      const methods=await sdk.findEligibleMethods({currencyCode:cfg.currency});
      if(!methods.isEligible("paypal")){
        state.className="payState payDisabled";
        state.textContent="PayPal is not available for this browser/account combination.";
        return;
      }
      const btn=document.createElement("paypal-button");
      btn.id="paypalPayButton";btn.setAttribute("type","pay");
      mount.replaceChildren(btn);
      const session=sdk.createPayPalOneTimePaymentSession({
        onApprove:async({orderId})=>{
          state.textContent="Confirming payment…";
          const d=await api({
            action:"capture_order",
            orderId,
            publicName:publicBox.checked,
            publicAlias:publicBox.checked?alias.value.trim():""
          });
          if(d.status!=="COMPLETED") throw new Error("capture_not_completed");
          state.className="payState paySuccess";
          state.textContent="Contribution received. Thank you for the solidarity.";
          if(window.refreshKarenFund) await window.refreshKarenFund();
        },
        onCancel:()=>{state.className="payState";state.textContent="Payment cancelled. Nothing was charged."},
        onError:()=>{state.className="payState";state.textContent="PayPal could not complete the payment. Please try again."}
      });
      btn.addEventListener("click",async()=>{
        const c=cents();
        if(!c){state.textContent="Enter an amount between €1 and €5,000.";return}
        if(publicBox.checked&&!alias.value.trim()){state.textContent="Enter the public name or alias you want displayed.";return}
        state.className="payState";state.textContent="Opening PayPal…";
        const orderPromise=api({action:"create_order",amountCents:c}).then(d=>d.id);
        try{await session.start({presentationMode:"auto"},orderPromise)}
        catch{state.textContent="Could not start PayPal. Please try again."}
      });
      state.textContent="PayPal is ready. Contributions are recorded only after confirmed capture.";
    }catch{
      state.className="payState payDisabled";
      state.textContent="PayPal setup is currently unavailable.";
    }
  }
  init();
})();