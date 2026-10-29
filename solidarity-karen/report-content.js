(()=> {
'use strict';
const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
function registry(rows,lang='en'){
 const fr=lang==='fr',wrap=make('div'),table=make('table'),caption=make('caption',fr?'Registre des contributions':'Contribution registry');
 wrap.className='report-table-scroll';wrap.tabIndex=0;table.className='report-contribution-table';table.append(caption);
 const head=make('thead'),hr=make('tr');for(const s of [fr?'ID du contributeur':'Contributor ID',fr?'Nom':'Name',fr?'Montant':'Amount']){const th=make('th',s);th.scope='col';hr.append(th)}head.append(hr);table.append(head);
 const body=make('tbody');let total=0;
 for(const row of rows.slice().sort((a,b)=>String(a.supporterId).localeCompare(String(b.supporterId)))){
 if(!/^S-[A-F0-9]+$/i.test(row.supporterId||''))continue;
 const tr=make('tr'),id=make('th',row.supporterId);id.scope='row';const amount=Number(row.netCents||0);total+=amount;
 tr.append(id,make('td',fr?'Masqué':'Hidden'),make('td',new Intl.NumberFormat(fr?'fr-FR':'en-GB',{style:'currency',currency:'EUR'}).format(amount/100)));body.append(tr);
 }table.append(body);
 const foot=make('tfoot'),tr=make('tr'),label=make('th','Total');label.colSpan=2;label.scope='row';tr.append(label,make('td',new Intl.NumberFormat(fr?'fr-FR':'en-GB',{style:'currency',currency:'EUR'}).format(total/100)));foot.append(tr);table.append(foot);wrap.append(table);return wrap;
}
function render(mount,text,lang='en'){
 mount.classList.add('report-readable');const lines=String(text||'').split(/\r?\n/);let i=0;
 while(i<lines.length){
 const line=lines[i].trim();if(!line){i++;continue}
 if(/^(Contributor ID|ID)\s*\|/.test(line)){
 const rows=[];i++;
 while(i<lines.length){const s=lines[i].trim();if(!s){i++;continue}if(!/^S-[A-F0-9]+\s*\|/i.test(s))break;
 const cells=s.split('|').map(v=>v.trim()).filter(Boolean),amount=cells.at(-1)||'',value=amount.replace(/[^0-9.,-]/g,'').replace(',','.');
 rows.push({supporterId:cells[0],netCents:Math.round(Number(value)*100)});i++}
 // Earlier English snapshots have an empty trailing pipe.
 for(const row of rows){if(!Number.isFinite(row.netCents))row.netCents=0}
 mount.append(registry(rows,lang));if(/^Total\s*\|/.test((lines[i]||'').trim()))i++;continue;
 }
 const p=make('p',line);mount.append(p);i++;
 }
}
if(!document.getElementById('report-table-style')){
 const style=make('style');style.id='report-table-style';style.textContent='.report-table-scroll{max-width:100%;overflow-x:auto;margin:24px 0}.report-contribution-table{border-collapse:collapse;width:100%;min-width:300px;font-size:15px}.report-contribution-table caption{text-align:left;font-weight:750;padding:12px 0}.report-contribution-table th,.report-contribution-table td{padding:12px;text-align:left;border-bottom:1px solid #b8b2aa;white-space:nowrap}.report-contribution-table thead,.report-contribution-table tfoot{background:#eee5db;color:#24242a}.report-contribution-table tbody tr:nth-child(even){background:rgba(150,120,100,.06)}.report-contribution-table td:last-child,.report-contribution-table thead th:last-child{text-align:right;font-variant-numeric:tabular-nums}.report-readable p{white-space:pre-line;line-height:1.65;margin:0 0 16px}.update-card:has(.report-contribution-table){grid-column:1 / -1;min-width:0}.report-readable{min-width:0}@media print{.report-table-scroll{overflow:visible}.report-contribution-table{font-size:10pt}.report-contribution-table tr{break-inside:avoid}}';document.head.append(style);
}
window.RBReportContent={registry,render};
})();