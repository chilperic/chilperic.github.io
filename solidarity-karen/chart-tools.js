(()=> {
function label(k){
 const lang=document.documentElement.lang||"en",ui=window.SOLIDARITY_LOCALES?.ui||{};
 return ui[lang]?.[k]||ui.en?.[k]||k
}
function enhance(panel){
 if(panel.dataset.toolsReady)return;
 const canvas=panel.querySelector("canvas");if(!canvas)return;
 panel.dataset.toolsReady="1";
 const head=panel.querySelector(".viz-head")||panel;
 const controls=document.createElement("div");controls.className="chart-tools";
 const expand=document.createElement("button"),download=document.createElement("button");
 expand.type=download.type="button";expand.title=label("expandChart");download.title=label("downloadChart");
 expand.textContent="⛶";download.textContent="⇩";
 expand.onclick=()=>{
   const active=panel.classList.toggle("chart-expanded");
   document.body.classList.toggle("chart-modal-open",active);
   expand.textContent=active?"×":"⛶";
   const chart=Chart.getChart(canvas);setTimeout(()=>chart?.resize(),120)
 };
 download.onclick=()=>{
   const chart=Chart.getChart(canvas);
   const url=chart?.toBase64Image("image/png",1);
   if(!url)return;
   const a=document.createElement("a");
   const title=panel.querySelector("h3")?.textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"solidarity-chart";
   a.href=url;a.download=title+".png";a.click()
 };
 controls.append(expand,download);head.append(controls)
}
function scan(){document.querySelectorAll(".viz-panel").forEach(enhance)}
window.addEventListener("load",()=>{setTimeout(scan,150);setInterval(scan,2000)});
window.addEventListener("keydown",e=>{
 if(e.key!=="Escape")return;
 const p=document.querySelector(".viz-panel.chart-expanded");
 if(!p)return;p.classList.remove("chart-expanded");document.body.classList.remove("chart-modal-open");
 const b=p.querySelector(".chart-tools button");if(b)b.textContent="⛶";
 Chart.getChart(p.querySelector("canvas"))?.resize()
});
})();