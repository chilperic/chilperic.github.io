window.RedBannerCharts=(()=>{
const charts={};
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const kill=id=>{if(charts[id]){charts[id].destroy();delete charts[id]}};
const base=euro=>({responsive:true,maintainAspectRatio:false,animation:{duration:760,easing:"easeOutQuart"},interaction:{mode:"index",intersect:false},hover:{mode:"nearest",intersect:false},layout:{padding:{top:4,right:4,bottom:2,left:2}},plugins:{legend:{display:false},tooltip:{backgroundColor:"rgba(17,16,21,.96)",padding:12,cornerRadius:10,displayColors:true}},scales:{x:{grid:{display:false},ticks:{color:"#756d65",font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:8}},y:{grid:{color:"rgba(117,109,101,.15)"},ticks:{color:"#756d65",font:{size:9},callback:v=>euro(v)}}}});
function cumulativeRows(rows,dateFmt){let sum=0;return rows.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).map((x,i)=>{sum=Math.max(0,sum+(x.status==="refunded"?-1:1)*Number(x.amountCents||0));return{label:"#"+(i+1)+" · "+dateFmt(x.date,true),value:sum/100,refund:x.status==="refunded"}})}
function render(d,m,ctx){
 if(typeof Chart==="undefined")return;
 const {t,euro,dateFmt}=ctx,red=css("--red"),green=css("--green"),gold=css("--gold"),blue=css("--blue"),line=css("--line"),paper=css("--paper");
 Chart.defaults.font.family="Inter, system-ui, sans-serif";Chart.defaults.color="#756d65";
 const seq=cumulativeRows(m.rows,dateFmt);

 kill("cum");const gctx=document.getElementById("cumulativeChart").getContext("2d"),grad=gctx.createLinearGradient(0,0,0,360);grad.addColorStop(0,"rgba(193,47,69,.30)");grad.addColorStop(1,"rgba(193,47,69,0)");
 let o=base(euro);
 charts.cum=new Chart(gctx,{type:"line",data:{labels:seq.map(x=>x.label),datasets:[
  {label:t("netFund"),data:seq.map(x=>x.value),borderColor:red,backgroundColor:grad,fill:true,tension:.42,borderWidth:4,pointRadius:seq.map(x=>x.refund?6:4),pointHoverRadius:8,pointHoverBorderWidth:3,pointBackgroundColor:seq.map(x=>x.refund?css("--red-deep"):paper),pointBorderColor:seq.map(x=>x.refund?css("--red-deep"):red),pointBorderWidth:2},
  {label:t("goal"),data:seq.map(()=>m.target/100),borderColor:gold,borderDash:[8,7],borderWidth:2,pointRadius:0}
 ]},options:{...o,plugins:{...o.plugins,legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}},tooltip:{callbacks:{label:x=>x.dataset.label+": "+euro(x.parsed.y)}}}}});
 document.getElementById("curveValue").textContent=euro(m.net/100);

 kill("events");const ev=m.pos.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));o=base(euro);
 const eventCtx=document.getElementById("eventChart").getContext("2d"),eventGrad=eventCtx.createLinearGradient(0,0,0,280);eventGrad.addColorStop(0,"rgba(41,92,72,.26)");eventGrad.addColorStop(1,"rgba(41,92,72,0)");
 charts.events=new Chart(eventCtx,{type:"line",data:{labels:ev.map((_,i)=>"#"+(i+1)),datasets:[{label:t("eventCurve"),data:ev.map(x=>Number(x.amountCents||0)/100),borderColor:green,backgroundColor:eventGrad,fill:true,tension:.4,borderWidth:3,pointRadius:5,pointHoverRadius:8,pointBackgroundColor:paper,pointBorderColor:green,pointBorderWidth:2}]},options:{...o,plugins:{...o.plugins,legend:{display:false},tooltip:{callbacks:{title:x=>x.length?(dateFmt(ev[x[0].dataIndex]?.date)||x[0].label):"",label:x=>euro(x.parsed.y)}}}}});

 kill("dist");const vals=m.pos.map(x=>Number(x.amountCents||0)/100),mx=Math.max(...vals,1),bins=Math.min(6,Math.max(3,Math.ceil(Math.sqrt(Math.max(1,vals.length))))),step=Math.max(1,Math.ceil(mx/bins)),counts=Array(bins).fill(0);vals.forEach(v=>counts[Math.min(bins-1,Math.floor(v/step))]++);o=base(euro);o.scales.y.ticks.callback=v=>v;
 charts.dist=new Chart(document.getElementById("distributionChart"),{type:"bar",data:{labels:counts.map((_,i)=>"€"+(i*step)+"–"+((i+1)*step)),datasets:[{data:counts,backgroundColor:counts.map((_,i)=>i%2?gold:blue),borderColor:paper,borderWidth:1,borderRadius:8,barPercentage:.82,categoryPercentage:.88}]},options:o});

 kill("daily");const byDay=new Map();m.rows.forEach(x=>{const day=String(x.date||"").slice(0,10);if(!byDay.has(day))byDay.set(day,{in:0,out:0});const q=byDay.get(day);if(x.status==="refunded")q.out+=Number(x.amountCents||0)/100;else q.in+=Number(x.amountCents||0)/100});const days=[...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);o=base(euro);
 charts.daily=new Chart(document.getElementById("dailyChart"),{type:"bar",data:{labels:days.map(([x])=>dateFmt(x,true)),datasets:[{label:t("raised"),data:days.map(([,x])=>x.in),backgroundColor:green,borderColor:paper,borderWidth:1,borderRadius:7},{label:t("refunds"),data:days.map(([,x])=>x.out),backgroundColor:red,borderColor:paper,borderWidth:1,borderRadius:7}]},options:{...o,plugins:{...o.plugins,legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}}}}});

 kill("runway");charts.runway=new Chart(document.getElementById("runwayChart"),{type:"doughnut",data:{labels:[t("raised"),t("remaining")],datasets:[{data:[m.net/100,Math.max(0,m.target-m.net)/100],backgroundColor:[red,line],borderWidth:0,borderRadius:8,spacing:2,hoverOffset:9}]},options:{responsive:true,maintainAspectRatio:false,cutout:"74%",rotation:-120,circumference:240,animation:{duration:800,easing:"easeOutQuart"},plugins:{legend:{display:true,position:"bottom",labels:{usePointStyle:true,boxWidth:8,font:{size:10}}},centerText:{text:Math.round(m.pct)+"%",subtext:euro(Math.max(0,m.target-m.net)/100)+" "+t("remaining").toLowerCase()}}}});
 document.getElementById("runwayText").textContent=euro(Math.max(0,m.target-m.net)/100);

 kill("flow");o=base(euro);o.indexAxis="y";o.scales.x={stacked:true,grid:{color:"rgba(117,109,101,.12)"},ticks:{callback:v=>euro(v),font:{size:9},color:"#756d65"}};o.scales.y={stacked:true,grid:{display:false},ticks:{font:{size:10},color:"#756d65"}};
 charts.flow=new Chart(document.getElementById("flowChart"),{type:"bar",data:{labels:[t("gross"),t("netFund")],datasets:[{label:t("refunds"),data:[m.refunds/100,0],backgroundColor:red,borderRadius:5},{label:t("netFund"),data:[m.net/100,0],backgroundColor:blue,borderRadius:5},{label:t("used"),data:[0,m.spent/100],backgroundColor:gold,borderRadius:5},{label:t("available"),data:[0,m.available/100],backgroundColor:green,borderRadius:5}]},options:o});

 kill("supporterActivity");
 const supporterRows=d.supporters||[],buckets=[0,0,0,0];
 supporterRows.forEach(x=>{const n=Number(x.eventCount||0);if(n<=1)buckets[0]++;else if(n===2)buckets[1]++;else if(n===3)buckets[2]++;else buckets[3]++});
 const aopts=base(euro);aopts.scales.y.ticks.callback=v=>Number.isInteger(v)?v:"";aopts.scales.y.beginAtZero=true;
 charts.supporterActivity=new Chart(document.getElementById("supporterActivityChart"),{
   type:"bar",
   data:{labels:["1","2","3","4+"],datasets:[{data:buckets,backgroundColor:[blue,green,gold,red],borderColor:paper,borderWidth:1,borderRadius:8,barPercentage:.72}]},
   options:{...aopts,plugins:{...aopts.plugins,legend:{display:false},tooltip:{callbacks:{label:x=>String(x.parsed.y)+" "+t("supporters")}}}}
 });
}
return{render};
})();