/* Organizer controls use the existing server-validated credential and role. */
(()=>{'use strict';
const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
window.RBCommonsAdmin={async render(context,host){
 const root=n('section');root.className='commons-admin';
 root.innerHTML='<p class="eyebrow">ORGANIZE THE COMMONS</p><h2>Plans, tables & collective curiosity.</h2><p>Change one event, reuse a brunch template, or confirm an idea after its poll.</p>';
 const feedback=n('p');feedback.setAttribute('role','status');
 const call=action=>host.rpc('rb_commons_admin',{p_credential:host.getCredential(),p_action:action});
 let data;try{data=await call({action:'read'})}catch{root.append(n('p','Community organizer tools unavailable.'));return root}
 const scope=n('select');scope.setAttribute('aria-label','Choose an event');
 const choices=new Map([['karting','Karting · 24 October 2026'],['karen-training','Train together for Karen'],['powerpoint-night','PowerPoint Night']]);
 const today=new Date().toISOString().slice(0,10),date=new Date(today+'T12:00:00Z');date.setUTCDate(1);let next='';
 for(let i=0;i<14;i++){while(date.getUTCDay()!==6)date.setUTCDate(date.getUTCDate()+1);const day=date.toISOString().slice(0,10),id='brunch-'+day;choices.set(id,'Brunch · '+day);if(!next&&day>=today)next=id;date.setUTCMonth(date.getUTCMonth()+1,1)}
 for(const e of data.events||[])choices.set(e.id,e.title);
 for(const s of data.sessions)if(!choices.has(s.scope))choices.set(s.scope,s.scope.startsWith('brunch-')?'Brunch · '+s.scope.slice(7):s.scope);
 for(const[value,label]of choices){const o=n('option',label);o.value=value;scope.append(o)}scope.value=next;
 const scopeLabel=n('label','Choose an event');scopeLabel.append(scope);root.append(scopeLabel,n('p','A postponed brunch keeps its original list and commitments.'));
 const selectRows=(select,rows)=>{const value=select.value;select.replaceChildren();for(const[v,label]of rows){const o=n('option',label);o.value=v;select.append(o)}if(rows.some(r=>r[0]===value))select.value=value};
 let refresh=()=>{};
 function form(title,fields,action){
  const box=n('details');box.append(n('summary',title));const f=n('form');f.className='commons-admin-form';
  for(const[key,label,type,values]of fields){const l=n('label',label),input=n(type==='select'?'select':type==='textarea'?'textarea':'input');input.name=key;if(type!=='select'&&type!=='textarea')input.type=type||'text';if(type==='select')selectRows(input,values);input.disabled=!data.canEdit;l.append(input);f.append(l)}
  const button=n('button','Save');button.className='btn primary';button.disabled=!data.canEdit;f.append(button);
  f.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{data=await call({action,scope:scope.value,...Object.fromEntries(new FormData(f))});refresh();feedback.textContent='Saved. Members will see the update.'}catch(err){feedback.textContent=err.message||'Not saved. Check values and access.'}finally{button.disabled=!data.canEdit}};
  box.append(f);root.append(box);return f;
 }
 const session=form('Event update · date, venue, cancellation', [['date','Date','date'],['time','Time · Berlin','time'],['place','Place','text'],['address','Address','text'],['status','Status','select',[['scheduled','Confirmed'],['changed','Changed'],['postponed','Postponed'],['cancelled','Cancelled']]],['note','Explain the change','textarea']],'session');
 session.elements.note.required=true;session.elements.note.maxLength=2000;
 const fill=()=>{const s=data.sessions.find(s=>s.scope===scope.value)||{date:scope.value.startsWith('brunch-')?scope.value.slice(7):'',status:'scheduled'};for(const key of ['date','time','place','address','status','note'])session.elements[key].value=s[key]||''};scope.onchange=fill;fill();
 const templateSave=form('Save this brunch’s needs and tasks as a template',[['name','Template name','text']],'save_template');templateSave.elements.name.required=true;templateSave.elements.name.maxLength=80;
 const templateForm=form('Apply a template to another brunch',[['id','Template','select',data.templates.map(t=>[t.id,t.name])]],'apply_template');
 templateForm.onsubmit=async e=>{e.preventDefault();const button=templateForm.querySelector('button');button.disabled=true;try{const identity=JSON.parse(localStorage.getItem('rb-commons-identity')||'null');if(!identity?.registered)throw Error('Open The commons in the public hub and save a community profile first.');data=await call({action:'apply_template',scope:scope.value,id:templateForm.elements.id.value,member:identity.id});refresh();feedback.textContent='Template applied. Claims and attendance were not copied.'}catch(err){feedback.textContent=err.message}finally{button.disabled=!data.canEdit}};
 const confirm=form('Confirm an idea as an event',[['id','Idea','select',[]],['date','Chosen date','date'],['time','Time · Berlin','time'],['place','Place','text']],'confirm_idea');confirm.elements.date.required=true;
 const order=form('Set presentation running order',[['id','Presentation','select',[]],['rank','Position','number']],'rank');order.elements.rank.min='1';order.elements.rank.max='200';order.elements.rank.required=true;
 const identities=n('details');identities.append(n('summary','Closed poll identities · authorized organizers only'));const people=n('div');people.setAttribute('translate','no');identities.append(people);root.append(identities);
 refresh=()=>{selectRows(templateForm.elements.id,data.templates.map(t=>[t.id,t.name]));selectRows(confirm.elements.id,data.ideas.filter(e=>!e.data.confirmedDate).map(e=>[e.id,e.title]));selectRows(order.elements.id,data.topics.map(e=>[e.id,e.title]));people.replaceChildren();for(const p of data.closedPolls||[])people.append(n('p',p.title+' · '+p.name+' · '+p.dates.join(', ')));identities.hidden=!data.closedPolls?.length;for(const e of data.events||[])if(![...scope.options].some(o=>o.value===e.id)){const o=n('option',e.title);o.value=e.id;scope.append(o)}};
 refresh();root.append(feedback);return root;
}};
})();
