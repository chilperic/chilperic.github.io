(()=> {
const charts={};
const $=id=>document.getElementById(id);
function kill(id){if(charts[id]){charts[id].destroy();delete charts[id]}}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function t(k){return window.RBApp?.t?.(k)||k}
function euro(v){return window.RBApp?.euro?.(v)||("€"+Math.round(Number(v||0)))}
function date(v){return window.RBApp?.dateFmt?.(v,true)||String(v||"")}
function dayNumber(v,base){return Math.max(0,Math.round((new Date(String(v).slice(0,10)+"T12:00:00")-base)/86400000))}
function baseOptions(){
 return {
   responsive:true,maintainAspectRatio:false,animation:{duration:700},
   interaction:{mode:"index",intersect:false},
   plugins:{legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}}},
   scales:{
     x:{grid:{display:false},ticks:{color:"#756d65",font:{size:9},maxTicksLimit:8}},
     y:{grid:{color:"rgba(117,109,101,.12)"},ticks:{color:"#756d65",font:{size:9}}}
   }
 }
}
function momentum(d,m){
 const el=$("momentumChart");if(!el)return;kill("momentum");
 const map=new Map();
 m.rows.forEach(x=>{const k=String(x.date||"").slice(0,10);if(!map.has(k))map.set(k,0);map.set(k,map.get(k)+(x.status==="refunded"?-1:1)*Number(x.amountCents||0)/100)});
 const rows=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 const vals=rows.map(x=>x[1]),roll=vals.map((_,i)=>{const a=Math.max(0,i-2),arr=vals.slice(a,i+1);return arr.reduce((s,v)=>s+v,0)/arr.length});
 charts.momentum=new Chart(el,{
  data:{labels:rows.map(x=>date(x[0])),datasets:[
   {type:"bar",label:t("dailyNet"),data:vals,backgroundColor:vals.map(v=>v<0?css("--red"):css("--green")),borderRadius:7,order:2},
   {type:"line",label:t("rollingAverage"),data:roll,borderColor:css("--gold"),backgroundColor:"rgba(213,164,71,.14)",fill:true,tension:.38,borderWidth:3,pointRadius:3,order:1}
  ]},
  options:{...baseOptions(),plugins:{...baseOptions().plugins,tooltip:{callbacks:{label:x=>x.dataset.label+": "+euro(x.parsed.y)}}},scales:{x:baseOptions().scales.x,y:{...baseOptions().scales.y,ticks:{...baseOptions().scales.y.ticks,callback:v=>euro(v)}}}}
 })
}
function supporterGrowth(d){
 const el=$("supporterGrowthChart");if(!el)return;kill("supporterGrowth");
 const rows=(d.supporters||[]).filter(x=>x.firstDate).slice().sort((a,b)=>String(a.firstDate).localeCompare(String(b.firstDate)));
 const by=new Map();rows.forEach(x=>{const k=String(x.firstDate).slice(0,10);by.set(k,(by.get(k)||0)+1)});
 let cum=0;const data=[...by.entries()].map(([k,v])=>({date:k,count:(cum+=v)}));
 const ctx=el.getContext("2d"),grad=ctx.createLinearGradient(0,0,0,280);grad.addColorStop(0,"rgba(71,107,140,.26)");grad.addColorStop(1,"rgba(71,107,140,0)");
 charts.supporterGrowth=new Chart(el,{type:"line",data:{labels:data.map(x=>date(x.date)),datasets:[{label:t("cumulativeSupporters"),data:data.map(x=>x.count),borderColor:css("--blue"),backgroundColor:grad,fill:true,stepped:"after",borderWidth:3,pointRadius:4}]},options:{...baseOptions(),plugins:{...baseOptions().plugins,legend:{display:false}},scales:{x:baseOptions().scales.x,y:{...baseOptions().scales.y,beginAtZero:true,ticks:{...baseOptions().scales.y.ticks,precision:0}}}}})
}
function supporterSpan(d){
 const el=$("supporterSpanChart");if(!el)return;kill("supporterSpan");
 const rows=(d.supporters||[]).filter(x=>x.firstDate).slice().sort((a,b)=>String(a.firstDate).localeCompare(String(b.firstDate)));
 if(!rows.length)return;
 const base=new Date(String(rows[0].firstDate).slice(0,10)+"T12:00:00");
 const labels=rows.map(x=>x.supporterId||"S-????????");
 const data=rows.map(x=>[dayNumber(x.firstDate,base),dayNumber(x.lastDate||x.firstDate,base)+.7]);
 charts.supporterSpan=new Chart(el,{type:"bar",data:{labels,datasets:[{label:t("activeSpan"),data,backgroundColor:rows.map((_,i)=>i%2?css("--blue"):css("--green")),borderRadius:7,borderSkipped:false}]},options:{...baseOptions(),indexAxis:"y",plugins:{...baseOptions().plugins,legend:{display:false},tooltip:{callbacks:{label:x=>t("activeSpan")+": day "+x.raw[0]+" → "+Math.floor(x.raw[1])}}},scales:{x:{...baseOptions().scales.x,title:{display:true,text:t("days")},beginAtZero:true},y:{grid:{display:false},ticks:{color:"#756d65",font:{size:9}}}}}})
}
function fingerprint(m){
 const el=$("fingerprintChart");if(!el)return;kill("fingerprint");
 const vals=m.pos.map(x=>Number(x.amountCents||0)/100).sort((a,b)=>a-b);
 const points=vals.map((v,i)=>({x:vals.length===1?50:(i/(vals.length-1))*100,y:v}));
 charts.fingerprint=new Chart(el,{type:"line",data:{datasets:[{label:t("fingerprint"),data:points,borderColor:css("--red"),backgroundColor:"rgba(193,47,69,.10)",fill:true,tension:.3,borderWidth:3,pointRadius:4,pointBackgroundColor:css("--paper"),pointBorderColor:css("--red"),pointBorderWidth:2}]},options:{...baseOptions(),plugins:{...baseOptions().plugins,legend:{display:false},tooltip:{callbacks:{label:x=>euro(x.parsed.y)}}},scales:{x:{type:"linear",min:0,max:100,title:{display:true,text:t("percentile")},grid:{display:false},ticks:{callback:v=>v+"%",font:{size:9},color:"#756d65"}},y:{...baseOptions().scales.y,ticks:{...baseOptions().scales.y.ticks,callback:v=>euro(v)}}}}})
}
function waterfall(m){
 const el=$("waterfallChart");if(!el)return;kill("waterfall");
 const gross=m.gross/100,net=m.net/100,spent=m.spent/100,avail=m.available/100;
 const labels=[t("gross"),t("refunds"),t("netFund"),t("used"),t("available")];
 const data=[[0,gross],[net,gross],[0,net],[avail,net],[0,avail]];
 const colors=[css("--blue"),css("--red"),css("--blue"),css("--gold"),css("--green")];
 charts.waterfall=new Chart(el,{type:"bar",data:{labels,datasets:[{data,backgroundColor:colors,borderRadius:7,borderSkipped:false}]},options:{...baseOptions(),plugins:{...baseOptions().plugins,legend:{display:false},tooltip:{callbacks:{label:x=>{const r=x.raw;return euro(Math.abs(r[1]-r[0]))}}}},scales:{x:baseOptions().scales.x,y:{...baseOptions().scales.y,beginAtZero:true,ticks:{...baseOptions().scales.y.ticks,callback:v=>euro(v)}}}}})
}
let key="";
function render(){
 const d=window.RBApp?.fund;if(!d||typeof Chart==="undefined")return;
 const m=window.RBApp.compute(d),next=JSON.stringify([d.updated,(d.supporters||[]).map(x=>[x.supporterId,x.firstDate,x.lastDate,x.eventCount,x.netCents]),m.rows.map(x=>[x.date,x.amountCents,x.status])]);
 if(next===key)return;key=next;
 momentum(d,m);supporterGrowth(d);supporterSpan(d);fingerprint(m);waterfall(m)
}
window.addEventListener("load",()=>{setTimeout(render,350);setInterval(()=>{try{render()}catch{}},2000)});
})();