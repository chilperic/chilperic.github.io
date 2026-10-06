(()=> {
if(typeof Chart==="undefined")return;
Chart.defaults.animation.duration=850;
Chart.defaults.animation.easing="easeOutQuart";
Chart.defaults.font.family="Inter, system-ui, sans-serif";
Chart.defaults.color="#756d65";
Chart.defaults.elements.line.borderWidth=3;
Chart.defaults.elements.line.tension=.32;
Chart.defaults.elements.point.hoverRadius=7;
Chart.defaults.elements.point.hoverBorderWidth=3;
Chart.defaults.elements.bar.borderSkipped=false;
Chart.defaults.elements.bar.borderRadius=7;
Chart.defaults.plugins.tooltip.backgroundColor="rgba(17,16,21,.96)";
Chart.defaults.plugins.tooltip.titleColor="#fffaf2";
Chart.defaults.plugins.tooltip.bodyColor="#f5efe4";
Chart.defaults.plugins.tooltip.padding=12;
Chart.defaults.plugins.tooltip.cornerRadius=10;
Chart.defaults.plugins.tooltip.displayColors=true;
Chart.defaults.plugins.tooltip.usePointStyle=true;
Chart.defaults.plugins.legend.labels.usePointStyle=true;
Chart.defaults.plugins.legend.labels.boxWidth=8;
Chart.defaults.plugins.legend.labels.padding=16;

const crosshair={
 id:"redBannerCrosshair",
 afterDatasetsDraw(chart){
   const active=chart.tooltip?.getActiveElements?.()||[];
   if(!active.length||chart.config.type==="doughnut"||chart.config.type==="pie")return;
   const {ctx,chartArea}=chart,x=active[0].element.x;
   ctx.save();
   ctx.strokeStyle="rgba(117,109,101,.28)";
   ctx.lineWidth=1;
   ctx.setLineDash([4,4]);
   ctx.beginPath();ctx.moveTo(x,chartArea.top);ctx.lineTo(x,chartArea.bottom);ctx.stroke();
   ctx.restore()
 }
};
const shadow={
 id:"redBannerShadow",
 beforeDatasetDraw(chart){
   chart.ctx.save();
   chart.ctx.shadowColor="rgba(17,16,21,.10)";
   chart.ctx.shadowBlur=8;
   chart.ctx.shadowOffsetY=3
 },
 afterDatasetDraw(chart){chart.ctx.restore()}
};
const centerText={
 id:"redBannerCenterText",
 afterDraw(chart,args,opts){
   if(!opts?.text||!["doughnut","pie"].includes(chart.config.type))return;
   const meta=chart.getDatasetMeta(0);if(!meta?.data?.length)return;
   const p=meta.data[0],ctx=chart.ctx;
   ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
   ctx.fillStyle=opts.color||"#111015";ctx.font="800 24px Inter, system-ui";
   ctx.fillText(String(opts.text),p.x,p.y-4);
   if(opts.subtext){ctx.fillStyle="#756d65";ctx.font="600 10px Inter, system-ui";ctx.fillText(String(opts.subtext),p.x,p.y+18)}
   ctx.restore()
 }
};
Chart.register(crosshair,shadow,centerText);
})();