(()=> {
const NS="http://www.w3.org/2000/svg";
const $=id=>document.getElementById(id);
function S(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e}
function scale(min,max,a,b){return v=>a+(v-min)/(max-min||1)*(b-a)}
function nice(v){if(v<=0)return 10000;const p=10**Math.floor(Math.log10(v));return Math.ceil(v/p)*p}
function curve(points){if(points.length<2)return"";let d=`M ${points[0][0]} ${points[0][1]}`;for(let i=1;i<points.length;i++){const[a,b]=points[i-1],[c,d1]=points[i],m=(a+c)/2;d+=` C ${m} ${b}, ${m} ${d1}, ${c} ${d1}`}return d}
function series(rows){let c=0;return rows.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).map((x,i)=>{const delta=(x.status==="refunded"?-1:1)*Number(x.amountCents||0);c=Math.max(0,c+delta);return{i,date:x.date,delta,value:c}})}

function cumulative(ctx){
 const {state,m,euro,dateFmt,t}=ctx,el=$("cumulativeChart");if(!el)return;el.replaceChildren();
 const W=1000,H=390,L=64,R=25,T=24,B=48,iw=W-L-R,ih=H-T-B,s=series(m.rows),max=nice(Math.max(m.target,...s.map(x=>x.value),1)),sx=i=>s.length<2?L+iw/2:L+i/(s.length-1)*iw,sy=scale(0,max,T+ih,T);
 for(let i=0;i<=4;i++){const v=max*i/4,y=sy(v);el.append(S("line",{x1:L,y1:y,x2:W-R,y2:y,stroke:"#d1c5b6"}),S("text",{x:L-8,y:y+4,"text-anchor":"end","font-size":"10",fill:"#756d65"},euro(v/100)))}
 if(m.target){const y=sy(m.target);el.append(S("line",{x1:L,y1:y,x2:W-R,y2:y,stroke:"#d5a447","stroke-width":"2","stroke-dasharray":"8 7"}),S("text",{x:W-R,y:y-7,"text-anchor":"end","font-size":"10",fill:"#9b722c"},t("goal")+" "+euro(m.target/100)))}
 for(const ms of state.milestones||[]){const v=Number(ms.thresholdCents||0);if(!v||v===m.target)continue;const y=sy(v);el.append(S("line",{x1:L,y1:y,x2:W-R,y2:y,stroke:"#295c48","stroke-width":"1","stroke-opacity":".35","stroke-dasharray":"3 6"}))}
 if(!s.length){el.append(S("text",{x:W/2,y:H/2,"text-anchor":"middle",fill:"#756d65"},t("noData")));return}
 const pts=s.map((p,i)=>[sx(i),sy(p.value)]),path=curve(pts);
 el.append(S("path",{d:path+` L ${pts.at(-1)[0]} ${T+ih} L ${pts[0][0]} ${T+ih} Z`,fill:"#c12f45",opacity:".11"}),S("path",{d:path,fill:"none",stroke:"#c12f45","stroke-width":"6","stroke-linecap":"round"}));
 pts.forEach(([x,y],i)=>{el.append(S("circle",{cx:x,cy:y,r:s[i].delta<0?7:5,fill:s[i].delta<0?"#7f2130":"#fffaf1",stroke:"#c12f45","stroke-width":"3"}));if(s.length<=8||i===0||i===s.length-1)el.append(S("text",{x,y:H-17,"text-anchor":i===0?"start":i===s.length-1?"end":"middle","font-size":"9",fill:"#756d65"},dateFmt(s[i].date,true)))});
 $("curveValue").textContent=euro(m.net/100)
}
function eventChart(ctx){
 const {m,euro,t}=ctx,el=$("eventChart");if(!el)return;el.replaceChildren();const W=620,H=310,L=48,R=18,T=24,B=42,iw=W-L-R,ih=H-T-B,v=m.pos.map(x=>Number(x.amountCents||0));
 if(!v.length){el.append(S("text",{x:W/2,y:H/2,"text-anchor":"middle",fill:"#756d65"},t("noData")));return}
 const max=nice(Math.max(...v)),sx=i=>L+i/Math.max(1,v.length-1)*iw,sy=scale(0,max,T+ih,T),pts=v.map((x,i)=>[sx(i),sy(x)]);
 for(let i=0;i<=3;i++){const x=max*i/3,y=sy(x);el.append(S("line",{x1:L,y1:y,x2:W-R,y2:y,stroke:"#d1c5b6"}),S("text",{x:L-7,y:y+4,"text-anchor":"end","font-size":"9",fill:"#756d65"},euro(x/100)))}
 el.append(S("path",{d:curve(pts),fill:"none",stroke:"#295c48","stroke-width":"4","stroke-linecap":"round"}));
 pts.forEach(([x,y],i)=>el.append(S("circle",{cx:x,cy:y,r:5,fill:"#fffaf1",stroke:"#295c48","stroke-width":"3"}),S("text",{x,y:H-16,"text-anchor":"middle","font-size":"9",fill:"#756d65"},String(i+1))))
}
function distribution(ctx){
 const {m,t}=ctx,el=$("distributionChart");if(!el)return;el.replaceChildren();const W=620,H=310,L=46,R=18,T=24,B=45,iw=W-L-R,ih=H-T-B,vals=m.pos.map(x=>Number(x.amountCents||0)/100);
 if(!vals.length){el.append(S("text",{x:W/2,y:H/2,"text-anchor":"middle",fill:"#756d65"},t("noData")));return}
 const mx=Math.max(...vals),bins=Math.min(6,Math.max(3,Math.ceil(Math.sqrt(vals.length)))),step=Math.max(1,Math.ceil(mx/bins)),cnt=Array(bins).fill(0);vals.forEach(v=>cnt[Math.min(bins-1,Math.floor(v/step))]++);
 const mc=Math.max(...cnt,1),gap=10,bw=(iw-gap*(bins-1))/bins;
 cnt.forEach((c,i)=>{const h=c/mc*ih,x=L+i*(bw+gap),y=T+ih-h;el.append(S("rect",{x,y,width:bw,height:h,rx:7,fill:i%2?"#d5a447":"#476b8c"}),S("text",{x:x+bw/2,y:H-18,"text-anchor":"middle","font-size":"9",fill:"#756d65"},`${i*step}–${(i+1)*step}`),S("text",{x:x+bw/2,y:y-6,"text-anchor":"middle","font-size":"10",fill:"#151317"},String(c)))})
}
function daily(ctx){
 const {m,dateFmt,t}=ctx,el=$("dailyChart");if(!el)return;el.replaceChildren();const W=620,H=310,L=46,R=18,T=24,B=42,iw=W-L-R,ih=H-T-B,map=new Map();
 m.rows.forEach(x=>{const d=String(x.date||"").slice(0,10);if(!map.has(d))map.set(d,{i:0,o:0});const q=map.get(d);x.status==="refunded"?q.o+=Number(x.amountCents||0):q.i+=Number(x.amountCents||0)});
 const ds=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
 if(!ds.length){el.append(S("text",{x:W/2,y:H/2,"text-anchor":"middle",fill:"#756d65"},t("noData")));return}
 const max=Math.max(...ds.flatMap(([,v])=>[v.i,v.o]),1),bw=Math.min(23,iw/ds.length*.35),base=T+ih;el.append(S("line",{x1:L,y1:base,x2:W-R,y2:base,stroke:"#d1c5b6"}));
 ds.forEach(([d,v],i)=>{const cx=L+(i+.5)*iw/ds.length,hi=v.i/max*ih,ho=v.o/max*ih;el.append(S("rect",{x:cx-bw-2,y:base-hi,width:bw,height:hi,rx:5,fill:"#295c48"}));if(v.o)el.append(S("rect",{x:cx+2,y:base-ho,width:bw,height:ho,rx:5,fill:"#c12f45"}));el.append(S("text",{x:cx,y:H-14,"text-anchor":"middle","font-size":"8",fill:"#756d65"},dateFmt(d,true)))})
}
function runway(ctx){
 const {state,m,euro,t}=ctx,el=$("runwayChart");if(!el)return;el.replaceChildren();const W=620,H=310,cx=310,cy=170,r=112,start=-Math.PI*.82,end=Math.PI*.82,total=end-start,p=Math.min(1,m.target?m.net/m.target:0),polar=a=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r],a=polar(start),b=polar(end),c=polar(start+total*p);
 el.append(S("path",{d:`M ${a[0]} ${a[1]} A ${r} ${r} 0 1 1 ${b[0]} ${b[1]}`,fill:"none",stroke:"#d1c5b6","stroke-width":"24","stroke-linecap":"round"}));if(p)el.append(S("path",{d:`M ${a[0]} ${a[1]} A ${r} ${r} 0 ${p>.5?1:0} 1 ${c[0]} ${c[1]}`,fill:"none",stroke:"#c12f45","stroke-width":"24","stroke-linecap":"round"}));
 for(const ms of state.milestones||[]){const v=Number(ms.thresholdCents||0);if(!m.target||v<=0||v>m.target)continue;const [x,y]=polar(start+total*(v/m.target));el.append(S("circle",{cx:x,cy:y,r:6,fill:m.net>=v?"#295c48":"#d5a447"}))}
 el.append(S("text",{x:cx,y:cy-5,"text-anchor":"middle","font-size":"34","font-weight":"800",fill:"#151317"},Math.round(p*100)+"%"),S("text",{x:cx,y:cy+25,"text-anchor":"middle","font-size":"12",fill:"#756d65"},euro(Math.max(0,m.target-m.net)/100)+" "+t("remaining").toLowerCase()));$("runwayText").textContent=euro(Math.max(0,m.target-m.net)/100)
}
function flow(ctx){
 const {m,euro,t}=ctx,el=$("flowChart");if(!el)return;el.replaceChildren();const y=155,total=Math.max(m.net,1),uh=Math.max(18,100*Math.min(1,m.spent/total)),ah=Math.max(18,100*Math.min(1,m.available/total));
 el.append(S("path",{d:`M 105 117 C 190 117,220 ${y-uh/2},300 ${y-uh/2} L 300 ${y+uh/2} C 220 ${y+uh/2},190 167,105 167Z`,fill:"#c12f45",opacity:".72"}),S("path",{d:`M 105 173 C 250 173,390 ${y-ah/2},525 ${y-ah/2} L 525 ${y+ah/2} C 390 ${y+ah/2},250 195,105 195Z`,fill:"#295c48",opacity:".78"}));
 const node=(x,h,color,l,v)=>{el.append(S("rect",{x,y:y-h/2,width:60,height:h,rx:9,fill:color}),S("text",{x:x+30,y:y+4,"text-anchor":"middle","font-size":"10","font-weight":"800",fill:"#fff"},euro(v/100)),S("text",{x:x+30,y:y+h/2+21,"text-anchor":"middle","font-size":"9",fill:"#756d65"},l))};node(45,100,"#151317",t("raised"),m.net);node(300,uh,"#c12f45",t("used"),m.spent);node(525,ah,"#295c48",t("available"),m.available)
}
window.SolidarityCharts={renderAll(ctx){cumulative(ctx);eventChart(ctx);distribution(ctx);daily(ctx);runway(ctx);flow(ctx)}};
})();