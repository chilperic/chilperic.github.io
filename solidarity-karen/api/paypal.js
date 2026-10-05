import crypto from "node:crypto";

const PAYPAL_ENV = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const PAYPAL_BASE = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const CURRENCY = process.env.PAYPAL_CURRENCY || "EUR";

function send(res,status,data){res.status(status).json(data)}
function parseBody(req){
  if(!req.body) return {};
  if(typeof req.body==="string"){try{return JSON.parse(req.body)}catch{return {}}}
  return req.body;
}
function sameOrigin(req){
  const origin=req.headers.origin;
  if(!origin) return true;
  try{return new URL(origin).host===req.headers.host}catch{return false}
}
function credentialsReady(){
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}
async function accessToken(){
  if(!credentialsReady()) throw new Error("paypal_not_configured");
  const basic=Buffer.from(process.env.PAYPAL_CLIENT_ID+":"+process.env.PAYPAL_CLIENT_SECRET).toString("base64");
  const r=await fetch(PAYPAL_BASE+"/v1/oauth2/token",{
    method:"POST",
    headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},
    body:"grant_type=client_credentials"
  });
  const d=await r.json();
  if(!r.ok||!d.access_token) throw new Error("paypal_auth_failed");
  return d.access_token;
}
async function paypal(path,{method="GET",body,requestId}={}){
  const token=await accessToken();
  const headers={Authorization:"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"};
  if(requestId) headers["PayPal-Request-Id"]=requestId;
  const r=await fetch(PAYPAL_BASE+path,{method,headers,body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error("paypal_api_error");e.status=r.status;e.payload=d;throw e}
  return d;
}
async function supabaseRpc(name,payload){
  const url=process.env.KAREN_SUPABASE_URL;
  const key=process.env.KAREN_SUPABASE_KEY;
  if(!url||!key) throw new Error("supabase_not_configured");
  const r=await fetch(url+"/rest/v1/rpc/"+name,{
    method:"POST",
    headers:{"Content-Type":"application/json",apikey:key},
    body:JSON.stringify(payload)
  });
  const text=await r.text();
  const data=text?JSON.parse(text):null;
  if(!r.ok){const e=new Error("supabase_rpc_error");e.status=r.status;e.payload=data;throw e}
  return data;
}
async function verifyAdmin(secretDigest){
  if(typeof secretDigest!=="string"||!/^[0-9a-f]{64}$/i.test(secretDigest)) throw new Error("admin_auth_failed");
  return supabaseRpc("karen_admin_action",{p_secret_digest:secretDigest,p_action:{action:"list"}});
}
function centsFrom(value){
  const n=Number(value);
  if(!Number.isInteger(n)||n<100||n>500000) return null;
  return n;
}
function safeAlias(v){
  return typeof v==="string"?v.trim().replace(/[<>]/g,"").slice(0,80):"";
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(!sameOrigin(req)) return send(res,403,{error:"origin_not_allowed"});

  try{
    if(req.method==="GET"){
      return send(res,200,{
        enabled:credentialsReady(),
        environment:PAYPAL_ENV,
        currency:CURRENCY,
        clientId:credentialsReady()?process.env.PAYPAL_CLIENT_ID:null,
        sdkUrl:PAYPAL_ENV==="live"
          ?"https://www.paypal.com/web-sdk/v6/core"
          :"https://www.sandbox.paypal.com/web-sdk/v6/core"
      });
    }

    if(req.method!=="POST") return send(res,405,{error:"method_not_allowed"});
    const body=parseBody(req);
    const action=body.action;

    if(action==="create_order"){
      const cents=centsFrom(body.amountCents);
      if(!cents) return send(res,400,{error:"invalid_amount"});
      const order=await paypal("/v2/checkout/orders",{
        method:"POST",
        requestId:"karen-create-"+crypto.randomUUID(),
        body:{
          intent:"CAPTURE",
          purchase_units:[{
            reference_id:"KAREN_SOLIDARITY",
            description:"Solidarity for Karen",
            amount:{currency_code:CURRENCY,value:(cents/100).toFixed(2)}
          }]
        }
      });
      return send(res,200,{id:order.id});
    }

    if(action==="capture_order"){
      const orderId=typeof body.orderId==="string"?body.orderId.trim():"";
      if(!orderId) return send(res,400,{error:"missing_order_id"});
      const captureOrder=await paypal("/v2/checkout/orders/"+encodeURIComponent(orderId)+"/capture",{
        method:"POST",
        requestId:"karen-capture-"+orderId
      });
      const capture=captureOrder?.purchase_units?.[0]?.payments?.captures?.[0];
      if(!capture||capture.status!=="COMPLETED") return send(res,409,{error:"capture_not_completed"});
      if(capture.amount?.currency_code!==CURRENCY) return send(res,409,{error:"currency_mismatch"});
      const amountCents=Math.round(Number(capture.amount.value)*100);
      const payerName=[captureOrder?.payer?.name?.given_name,captureOrder?.payer?.name?.surname].filter(Boolean).join(" ").trim();
      const record=await supabaseRpc("karen_record_paypal_capture",{
        p_integration_secret:process.env.KAREN_INTEGRATION_SECRET,
        p_data:{
          order_id:orderId,
          capture_id:capture.id,
          amount_cents:amountCents,
          currency:CURRENCY,
          status:capture.status,
          payer_name:payerName||null,
          payer_id:captureOrder?.payer?.payer_id||null,
          public_name:body.publicName===true,
          public_alias:body.publicName===true?safeAlias(body.publicAlias):null
        }
      });
      return send(res,200,{status:"COMPLETED",amountCents,contributionId:record?.contribution_id||null});
    }

    if(action==="refund"){
      const admin=await verifyAdmin(body.adminSecretDigest);
      const captureId=typeof body.captureId==="string"?body.captureId.trim():"";
      const cents=centsFrom(body.amountCents);
      if(!captureId||!cents) return send(res,400,{error:"invalid_refund_request"});
      const sourceRow=(admin?.contributions||[]).find(x=>x.provider_ref===captureId&&x.source==="paypal");
      if(!sourceRow) return send(res,404,{error:"paypal_capture_not_found"});
      if(cents>Number(sourceRow.amount_cents)) return send(res,400,{error:"refund_exceeds_original"});
      const refund=await paypal("/v2/payments/captures/"+encodeURIComponent(captureId)+"/refund",{
        method:"POST",
        requestId:"karen-refund-"+crypto.randomUUID(),
        body:{amount:{value:(cents/100).toFixed(2),currency_code:CURRENCY}}
      });
      const rec=await supabaseRpc("karen_record_paypal_refund",{
        p_integration_secret:process.env.KAREN_INTEGRATION_SECRET,
        p_data:{
          capture_id:captureId,
          refund_id:refund.id,
          amount_cents:cents,
          currency:CURRENCY,
          status:refund.status
        }
      });
      return send(res,200,{status:refund.status,refundId:refund.id,recorded:rec?.ok===true});
    }

    return send(res,400,{error:"unknown_action"});
  }catch(e){
    const status=e.message==="paypal_not_configured"?503:
      e.message==="admin_auth_failed"?401:
      (e.status&&Number.isInteger(e.status)?e.status:500);
    return send(res,status,{error:e.message,details:e.payload||undefined});
  }
}
