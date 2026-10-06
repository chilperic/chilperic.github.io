(()=> {
let lorenzChart=null,sourceChart=null,forecastChart=null,lastKey="";
const $=id=>document.getElementById(id);

function quantile(sorted,q){
  if(!sorted.length)return 0;
  const p=(sorted.length-1)*q,b=Math.floor(p),r=p-b;
  return sorted[b]+(sorted[b+1]!==undefined?r*(sorted[b+1]-sorted[b]):0)
}
function evenness(values){
  const v=values.filter(x=>x>=0).slice().sort((a,b)=>a-b),n=v.length,sum=v.reduce((a,b)=>a+b,0);
  if(!n||sum<=0)return 0;
  let weighted=0;v.forEach((x,i)=>weighted+=(i+1)*x);
  const g=(2*weighted)/(n*sum)-(n+1)/n;
  return Math.max(0,Math.min(1,1-g))
}
function locale(){return document.documentElement.lang||"en"}
function euro(v){
  try{return new Intl.NumberFormat(locale(),{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v||0))}
  catch{return "€"+Math.round(Number(v||0))}
}
function t(k){return window.RBApp?.t?.(k)||k}

function drawLorenz(supporters){
  const el=$("lorenzChart");if(!el||typeof Chart==="undefined")return;
  const vals=supporters.map(x=>Number(x.netCents||0)).filter(x=>x>=0).sort((a,b)=>a-b);
  const total=vals.reduce((a,b)=>a+b,0);
  const actual=[{x:0,y:0}];let cum=0;
  vals.forEach((v,i)=>{cum+=v;actual.push({x:(i+1)/Math.max(1,vals.length)*100,y:total?cum/total*100:0})});
  const equality=[{x:0,y:0},{x:100,y:100}];
  if(lorenzChart)lorenzChart.destroy();
  const lctx=el.getContext("2d"),lgrad=lctx.createLinearGradient(0,0,0,280);lgrad.addColorStop(0,"rgba(193,47,69,.22)");lgrad.addColorStop(1,"rgba(193,47,69,.015)");
  lorenzChart=new Chart(el,{
    type:"line",
    data:{datasets:[
      {label:t("evenness"),data:actual,borderColor:"#c12f45",backgroundColor:lgrad,fill:true,tension:.22,borderWidth:3,pointRadius:3,pointHoverRadius:7,pointBackgroundColor:"#fffaf2",pointBorderColor:"#c12f45",pointBorderWidth:2},
      {label:"Equality",data:equality,borderColor:"#d5a447",borderDash:[7,6],borderWidth:2,pointRadius:0}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:450},
      plugins:{legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}}},
      scales:{
        x:{type:"linear",min:0,max:100,title:{display:true,text:"% supporters"},grid:{color:"rgba(117,109,101,.12)"},ticks:{callback:v=>v+"%",font:{size:9}}},
        y:{min:0,max:100,title:{display:true,text:"% collective net"},grid:{color:"rgba(117,109,101,.12)"},ticks:{callback:v=>v+"%",font:{size:9}}}
      }
    }
  })
}
function drawSources(rows){
  const el=$("sourceChart");if(!el||typeof Chart==="undefined")return;
  const map=new Map();
  rows.filter(x=>x.status!=="refunded").forEach(x=>{
    const key=x.source||"manual";
    map.set(key,(map.get(key)||0)+Number(x.amountCents||0)/100)
  });
  const labels=[...map.keys()].map(x=>({manual:"Manual / bank / cash",paypal_pool:"PayPal Pool",paypal:"PayPal API"}[x]||x));
  const values=[...map.values()];
  if(sourceChart)sourceChart.destroy();
  sourceChart=new Chart(el,{
    type:"doughnut",
    data:{labels,datasets:[{data:values,borderWidth:0}]},
    options:{
      responsive:true,maintainAspectRatio:false,cutout:"68%",animation:{duration:750,easing:"easeOutQuart"},
      plugins:{legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}},tooltip:{callbacks:{label:x=>x.label+": "+euro(x.parsed)}},centerText:{text:euro(values.reduce((a,b)=>a+b,0)),subtext:t("gross")}}
    }
  })
}
function drawForecast(d,m,rate,eta){
  const el=$("forecastChart");if(!el||typeof Chart==="undefined")return;
  const gap=Math.max(0,m.target-m.net),horizon=Math.max(7,Math.min(60,eta?Math.ceil(eta*1.25):30));
  const days=Array.from({length:horizon+1},(_,i)=>i);
  const conservative=rate*.65,current=rate,strong=rate*1.35;
  const project=r=>days.map(day=>Math.min(m.target*1.2,m.net+r*day)/100);
  if(forecastChart)forecastChart.destroy();
  forecastChart=new Chart(el,{
    type:"line",
    data:{labels:days.map(d=>String(d)),datasets:[
      {label:"Conservative",data:project(conservative),borderColor:"#756d65",borderDash:[6,5],borderWidth:2,pointRadius:0,tension:.22,order:3},
      {label:"Strong momentum",data:project(strong),borderColor:"#295c48",backgroundColor:"rgba(41,92,72,.08)",borderWidth:2,pointRadius:0,tension:.22,fill:"-1",order:4},
      {label:"Current pace",data:project(current),borderColor:"#476b8c",backgroundColor:"rgba(71,107,140,.10)",borderWidth:3,pointRadius:0,tension:.28,order:2},
      {label:t("goal"),data:days.map(()=>m.target/100),borderColor:"#d5a447",borderDash:[8,7],borderWidth:2,pointRadius:0,order:1}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:450},
      plugins:{legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}},tooltip:{backgroundColor:"rgba(17,16,21,.96)",padding:12,cornerRadius:10,callbacks:{title:x=>x.length?("Day "+x[0].label):"",label:x=>x.dataset.label+": "+euro(x.parsed.y)}}},
      scales:{
        x:{title:{display:true,text:t("days")},grid:{display:false},ticks:{maxTicksLimit:8,font:{size:9}}},
        y:{grid:{color:"rgba(117,109,101,.12)"},ticks:{callback:v=>euro(v),font:{size:9}}}
      }
    }
  });
}

function render(){
  const d=window.RBApp?.fund;if(!d)return;
  const m=window.RBApp.compute(d),supporters=d.supporters||[];
  const key=JSON.stringify([d.updated,supporters.map(x=>[x.supporterId,x.netCents,x.eventCount]),m.rows.map(x=>[x.date,x.amountCents,x.source,x.status])]);
  if(key===lastKey)return;lastKey=key;

  const vals=m.pos.map(x=>Number(x.amountCents||0)).sort((a,b)=>a-b);
  const ev=evenness(supporters.map(x=>Number(x.netCents||0)));
  const iqr=Math.max(0,quantile(vals,.75)-quantile(vals,.25));
  const dates=m.pos.map(x=>new Date(String(x.date||"").slice(0,10)+"T12:00:00").getTime()).filter(Number.isFinite);
  const first=dates.length?Math.min(...dates):Date.now(),today=new Date();today.setHours(12,0,0,0);
  const elapsed=Math.max(1,Math.floor((today.getTime()-first)/86400000)+1);
  const cutoff=today.getTime()-6*86400000;let recentNet=0;for(const x of m.rows){const ts=new Date(String(x.date||"").slice(0,10)+"T12:00:00").getTime();if(ts>=cutoff)recentNet+=(x.status==="refunded"?-1:1)*Number(x.amountCents||0)}
  const recentDays=Math.max(1,Math.min(7,elapsed)),avgRate=m.net/elapsed,recentRate=Math.max(0,recentNet/recentDays),rate=recentRate>0?recentRate:avgRate,gap=Math.max(0,m.target-m.net),eta=gap===0?0:(rate>0?Math.ceil(gap/rate):null);

  if($("statEvenness"))$("statEvenness").textContent=supporters.length?ev.toFixed(2):"—";
  if($("statIQR"))$("statIQR").textContent=euro(iqr/100);
  if($("statVelocity"))$("statVelocity").textContent=euro(rate/100)+"/day";
  if($("statETA"))$("statETA").textContent=eta===0?t("goalReached"):(eta?("~"+eta+" "+t("days")):"—");

  drawLorenz(supporters);
  drawSources(m.rows);
  drawForecast(d,m,rate,eta)
}
function tick(){
  try{render()}catch{}
}
window.addEventListener("load",()=>{setTimeout(tick,250);setInterval(tick,2000)});
})();