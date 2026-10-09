(()=>{
  const KEY='red-banner-community-preview-v1';
  const today=new Date('2026-10-09T12:00:00+02:00');
  const options=[
    {date:'2026-11-06',label:'Fri 06',day:'Friday, 6 November'},
    {date:'2026-11-07',label:'Sat 07',day:'Saturday, 7 November'},
    {date:'2026-11-13',label:'Fri 13',day:'Friday, 13 November'},
    {date:'2026-11-14',label:'Sat 14',day:'Saturday, 14 November'},
    {date:'2026-11-20',label:'Fri 20',day:'Friday, 20 November'},
    {date:'2026-11-21',label:'Sat 21',day:'Saturday, 21 November'},
    {date:'2026-11-27',label:'Fri 27',day:'Friday, 27 November'},
    {date:'2026-11-28',label:'Sat 28',day:'Saturday, 28 November'}
  ];
  const starter={
    name:'',
    events:[
      {id:'karen-training',title:'Train together for Karen',date:'2026-10-17',time:'11:30',place:'Functional Garage 0211 · Düsseldorf',description:'A solidarity training session to raise money for Karen.',status:'scheduled',kind:'Fundraising training',note:'',endTime:'13:30'},
      {id:'karting',title:'Karting',date:'2026-10-24',time:'',place:'Venue to be decided',description:'A group proposal. Add your interest and help settle the time and place.',status:'proposed',kind:'Group outing',note:''},
      {id:'brunch-nov',title:'People’s Brunch',date:'2026-11-07',time:'12:00',place:'Place to be confirmed',description:'First Saturday of the month. Add what you can bring to the shared list.',status:'scheduled',kind:'Monthly gathering',note:''}
    ],
    votes:{},myVote:[],
    brunchItems:[],
    suggestions:['Something savoury','Fruit or a fruit salad','Bread and spreads','Tea, coffee, or juice','Help with setup or cleanup'],
    messages:[
      {id:'seed-karting',name:'Group proposal',text:'Some of us suggested that we should go karting on 24 October. The time is still to be decided.',kind:'proposal',createdAt:'2026-10-08T18:00:00+02:00'},
      {id:'seed-ppt',name:'PowerPoint Night',text:'We can meet to eat or train, and we can also present topics that interest us. The reactionaries and evil compradors can keep calling hobbies private; we’ll collectivize our interests. Vote for every Friday and Saturday in November that works for you.',kind:'poll',createdAt:'2026-10-08T18:20:00+02:00'}
    ],
    ideas:[
      {title:'Bouldering afternoon',tag:'MOVE',text:'Pick a gym, choose a date, and see who wants to climb.'},
      {title:'Picnic in the park',tag:'EAT OUTSIDE',text:'A low-cost afternoon with shared food and a blanket.'},
      {title:'Hiking day',tag:'GET OUT',text:'Choose a route by distance, travel time, and weather.'},
      {title:'Barbecue',tag:'COOK TOGETHER',text:'Find a public grill spot and coordinate what to bring.'},
      {title:'Travel together',tag:'TRAVEL',text:'Start with a budget and a few possible destinations.'},
      {title:'PowerPoint Night',tag:'SHARE IDEAS',text:'Make an interest public. Ten minutes, one topic, a room full of questions.'}
    ]
  };
  let state=load(); let toastTimer; let syncReady=false;
  const $=id=>document.getElementById(id);
  const dbConfig=window.KAREN_SUPABASE;
  const voterKey='rb-community-voter';
  function voterId(){let id=localStorage.getItem(voterKey);if(!id){id=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(voterKey,id)}return id}
  const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY));return s&&Array.isArray(s.events)?{...structuredClone(starter),...s}:structuredClone(starter)}catch{return structuredClone(starter)}}
  function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
  function syncLabel(title,detail,ready){syncReady=ready;$('syncTitle').textContent=title;$('syncDetail').textContent=detail;$('syncPulse').style.background=ready?'#55866f':'#bd8b2a'}
  async function db(path,{method='GET',body,prefer}={}){
    if(!dbConfig?.url||!dbConfig?.key)throw new Error('Shared data connection is not configured');
    const headers={apikey:dbConfig.key,Authorization:`Bearer ${dbConfig.key}`,Accept:'application/json'};
    if(body!==undefined)headers['Content-Type']='application/json';if(prefer)headers.Prefer=prefer;
    const response=await fetch(`${dbConfig.url}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    if(!response.ok){const detail=await response.text();throw new Error(detail.slice(0,240)||`Shared board returned ${response.status}`)}
    const payload=await response.text();return payload?JSON.parse(payload):null;
  }
  async function addPost(kind,body,metadata={}){
    if(!syncReady)return false;
    try{await db('rb_community_posts',{method:'POST',prefer:'return=minimal',body:{kind,display_name:state.name||'Community member',body,metadata}});await loadShared();return true}
    catch(error){syncLabel('Offline preview','Shared board unavailable; changes on this device only',false);throw error}
  }
  async function loadShared(){
    try{
      const [posts,brunch,poll,interest]=await Promise.all([
        db('rb_community_posts?select=id,kind,display_name,body,metadata,created_at&order=created_at.desc&limit=100'),
        db('rb_brunch_items?select=id,item,display_name,created_at&order=created_at.asc&limit=200'),
        db('rpc/rb_powerpoint_results',{method:'POST',body:{}}),
        db('rpc/rb_event_interest_count',{method:'POST',body:{p_event_slug:'karting-2026-10-24'}})
      ]);
      const records=Array.isArray(posts)?posts:[];
      const proposals=records.filter(x=>x.kind==='event-proposal').map(x=>({id:x.id,title:x.metadata?.title||x.body,date:x.metadata?.date||'',time:x.metadata?.time||'',place:x.metadata?.place||'Place to be decided',description:x.metadata?.description||'',status:'proposed',kind:x.metadata?.kind||'Group proposal',note:'',createdAt:x.created_at}));
      const events=[...structuredClone(starter.events),...proposals];
      const updated=new Set();records.filter(x=>x.kind==='event-update').forEach(x=>{const event=events.find(e=>e.id===x.metadata?.event_id);if(event&&!updated.has(event.id)){event.status=x.metadata?.status||'changed';event.note=x.body;updated.add(event.id)}});
      const karting=events.find(e=>e.id==='karting');if(karting)karting.interested=Number(interest||0);
      state.events=events;
      state.messages=[...records.map(x=>({id:x.id,name:x.display_name,text:x.body,kind:x.kind,createdAt:x.created_at,metadata:x.metadata})),...structuredClone(starter.messages)].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      state.brunchItems=(Array.isArray(brunch)?brunch:[]).map(x=>({id:x.id,item:x.item,name:x.display_name}));
      state.suggestions=[...new Set([...starter.suggestions,...records.filter(x=>x.kind==='brunch-suggestion').map(x=>x.body)])];
      state.ideas=[...structuredClone(starter.ideas),...records.filter(x=>x.kind==='note'&&x.metadata?.category==='idea').map(x=>({title:x.body,tag:'NEW IDEA',text:'A group idea. Open it as an event when the group is ready.'}))];
      state.votes={};(Array.isArray(poll)?poll:[]).forEach(x=>state.votes[x.option_date]=Number(x.vote_count||0));
      state.pollVoterCount=Number(poll?.[0]?.total_voters||0);
      state.kartingInterestCount=Number(interest||0);
      syncLabel('Shared group board','Anyone with this link can post and vote',true);render();
    }catch(error){
      console.warn('Shared community board unavailable',error);
      syncLabel('Offline preview','Changes on this device only until the board reconnects',false);render();
    }
  }
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
  function monthDay(iso){if(!iso)return 'Date to be decided';const d=new Date(iso+'T12:00:00');return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(d)}
  function initials(name){return (name||'R').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'R'}
  function eventStatus(e){return e.status==='cancelled'?'Cancelled':e.status==='postponed'?'Postponed':e.status==='changed'?'Updated':e.status==='proposed'?'Proposed':'Scheduled'}
  function eventCard(e){
    const date=e.date?new Date(e.date+'T12:00:00'):null;
    const day=date?new Intl.DateTimeFormat('en-GB',{day:'2-digit'}).format(date):'–';
    const mon=date?new Intl.DateTimeFormat('en-GB',{month:'short'}).format(date):'TBD';
    const when=e.date?`${monthDay(e.date)}${e.time?' · '+e.time:''}${e.endTime?'–'+e.endTime:''}`:'Time and date to be decided';
    const interest=e.id==='karting'?`<button class="tiny-button" data-interest="${safe(e.id)}">Interested <span>(${Number(e.interested||0)})</span></button>`:'';
    return `<article class="event-row"><div class="event-row-date"><strong>${day}</strong><span>${safe(mon)}</span></div><div><h3>${safe(e.title)}</h3><div class="event-row-meta">${safe(e.kind||'Group event')} · ${safe(when)}</div><p>${safe(e.place||'Place to be decided')}</p><p>${safe(e.description||'')}</p></div><div class="event-row-actions"><span class="status-chip ${safe(e.status)}">${eventStatus(e)}</span>${interest}<button class="tiny-button" data-update="${safe(e.id)}">Post update</button></div>${e.note?`<p class="event-update-note">${safe(e.note)}</p>`:''}</article>`;
  }
  function dayButton(o,context){const selected=(state.myVote||[]).includes(o.date);return `<button class="poll-day ${selected?'selected':''}" type="button" data-choice="${o.date}" data-context="${context}" aria-pressed="${selected}">${o.label}<small>${Number(state.votes[o.date]||0)} vote${Number(state.votes[o.date])===1?'':'s'}</small></button>`}
  function voteOption(o){const votes=Number(state.votes[o.date]||0),max=Math.max(1,...options.map(x=>Number(state.votes[x.date]||0)));return `<label class="poll-option"><input type="checkbox" data-choice="${o.date}" data-context="full" ${state.myVote.includes(o.date)?'checked':''}><span class="poll-option-date">${o.day}<small>Evening · after 18:00</small><span class="poll-bar"><i style="width:${Math.round(votes/max*100)}%"></i></span></span><span class="poll-result">${votes}</span></label>`}
  function feedItem(m){return `<article class="activity-item"><span class="activity-avatar">${safe(initials(m.name))}</span><div class="activity-copy"><b>${safe(m.name||'A member')}</b><p>${safe(m.text)}</p><time>${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(m.createdAt))}</time></div></article>`}
  function messageCard(m){return `<article class="message-card"><div class="message-card-head"><span class="activity-avatar">${safe(initials(m.name))}</span><b>${safe(m.name||'A member')}</b><time>${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(m.createdAt))}</time></div><p>${safe(m.text)}</p></article>`}
  function render(){
    $('todayLabel').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(today);
    $('eventNavCount').textContent=state.events.filter(e=>e.status!=='cancelled').length;
    $('pollChoices').innerHTML=options.map(o=>dayButton(o,'compact')).join('');
    $('pollChoicesFull').innerHTML=options.map(voteOption).join('');
    const voters=syncReady?Number(state.pollVoterCount||0):Object.values(state.votesByVoter||{}).filter(v=>Array.isArray(v)&&v.length>0).length;
    $('pollTally').textContent=voters?`${voters} ${voters===1?'person has':'people have'} voted`:'No votes yet';
    $('pollVoteCount').textContent=String(voters);
    $('pollSideNote').textContent=state.myVote.length?`Your selections are saved${syncReady?' with the group':' in this browser'}: ${state.myVote.map(d=>options.find(o=>o.date===d)?.label).join(', ')}.`:'Pick as many Friday and Saturday evenings as work for you.';
    $('kartingResponse').textContent=`${Number(state.kartingInterestCount||0)} ${Number(state.kartingInterestCount||0)===1?'person is':'people are'} interested`;
    $('eventList').innerHTML=state.events.map(eventCard).join('');
    $('activityFeed').innerHTML=state.messages.slice(0,3).map(feedItem).join('');
    $('messageList').innerHTML=state.messages.map(messageCard).join('');
    $('brunchItems').innerHTML=state.brunchItems.length?state.brunchItems.map((x,i)=>`<div class="brunch-item"><span class="dish-icon">✿</span><span class="dish-name">${safe(x.item)}</span><span class="dish-person">${safe(x.name||'No name added')}</span>${syncReady?'':`<button type="button" aria-label="Remove ${safe(x.item)}" data-remove-brunch="${i}">×</button>`}</div>`).join(''):'<div class="brunch-items-empty">Nothing claimed yet. Add a dish, a drink, or a helping hand.</div>';
    $('brunchMiniList').innerHTML=state.brunchItems.length?state.brunchItems.slice(0,3).map(x=>`<span>${safe(x.item)}</span>`).join(''):'<span>Nothing claimed yet</span>';
    $('suggestionList').innerHTML=state.suggestions.map((x,i)=>`<div class="suggestion-row"><span>${safe(x)}</span><button type="button" data-claim-suggestion="${i}">I can bring this</button></div>`).join('');
    $('ideaGrid').innerHTML=state.ideas.map((x,i)=>`<article class="idea-card"><span class="idea-no">${String(i+1).padStart(2,'0')} · ${safe(x.tag)}</span><h3>${safe(x.title)}</h3><p>${safe(x.text)}</p><button type="button" data-make-event="${i}">Make it an event</button></article>`).join('');
    const me=state.myVote.length>0;$('castVote').textContent=me?'Update my vote':'Cast my vote';$('castVoteFull').textContent=me?'Update my availability':'Save my availability';
    $('profileButton').textContent=initials(state.name||'T');
  }
  function setView(view){
    document.querySelectorAll('.nav-item[data-view],.mobile-nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.querySelectorAll('[data-view-panel]').forEach(p=>p.classList.toggle('active',p.dataset.viewPanel===view));
    const headings={home:['FRIDAY, 9 OCTOBER','This is what’s moving.'],events:['MAKE A PLAN','Our events'],polls:['DECIDE TOGETHER','Open polls'],brunch:['FIRST SATURDAY OF EVERY MONTH','People’s Brunch'],messages:['KEEP EVERYONE IN THE LOOP','Community messages'],ideas:['A GROUP OF MANY INTERESTS','Ideas & proposals']};
    if(view==='home')$('viewHeading').style.display='flex';else $('viewHeading').style.display='none';
    document.querySelectorAll('[data-open-view]').forEach(b=>b.onclick=()=>setView(b.dataset.openView));
    if(view!=='home')document.querySelector(`[data-view-panel="${view}"]`)?.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function toggleDate(date){const s=new Set(state.myVote||[]);s.has(date)?s.delete(date):s.add(date);state.myVote=[...s];localStorage.setItem(KEY,JSON.stringify(state))}
  async function submitVote(){
    if(syncReady){
      try{await db('rpc/rb_cast_powerpoint_vote',{method:'POST',body:{p_voter_id:voterId(),p_selected_dates:state.myVote}});await loadShared();$('pollNote').textContent='Your availability is saved with the group.';toast('Availability saved for the group');return}
      catch(error){console.warn(error);syncLabel('Offline preview','Shared board unavailable; changes on this device only',false)}
    }
    const voter=voterId(),votesByVoter=state.votesByVoter||{},prior=votesByVoter[voter]||[];
    prior.forEach(d=>state.votes[d]=Math.max(0,Number(state.votes[d]||0)-1));
    (state.myVote||[]).forEach(d=>state.votes[d]=Number(state.votes[d]||0)+1);
    votesByVoter[voter]=[...state.myVote];state.votesByVoter=votesByVoter;save();$('pollNote').textContent=state.myVote.length?'Your availability is saved on this device.':'You cleared your selections.';toast('Poll saved on this device');
  }
  function openDialog(id){$(id).showModal()}
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-open-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.openView)));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  $('pollChoices').addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(!b)return;toggleDate(b.dataset.choice);render()});
  $('pollChoicesFull').addEventListener('change',e=>{const i=e.target.closest('[data-choice]');if(!i)return;toggleDate(i.dataset.choice);render()});
  $('castVote').addEventListener('click',submitVote);$('castVoteFull').addEventListener('click',submitVote);
  $('eventList').addEventListener('click',e=>{
    const interest=e.target.closest('[data-interest]');if(interest){markInterest();return}
    const update=e.target.closest('[data-update]');if(update){const event=state.events.find(x=>x.id===update.dataset.update);$('updateForm').elements.eventId.value=event.id;$('updateDialogTitle').textContent=event.title;openDialog('updateDialog')}
  });
  $('updateForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,ev=state.events.find(x=>x.id===f.elements.eventId.value);if(!ev)return;const status=f.elements.status.value,note=f.elements.note.value.trim(),body=`${ev.title} — ${status}: ${note}`;try{if(syncReady){await addPost('event-update',body,{event_id:ev.id,status})}else{ev.status=status;ev.note=body;state.messages.unshift({id:crypto.randomUUID(),name:state.name||'Group update',text:body,kind:'event-change',createdAt:new Date().toISOString()});save()}}catch{state.messages.unshift({id:crypto.randomUUID(),name:state.name||'Group update',text:body,kind:'event-change',createdAt:new Date().toISOString()});save()}f.reset();$('updateDialog').close();toast(syncReady?'Event update shared with the group':'Event update saved on this device')});
  $('addEvent').addEventListener('click',()=>openDialog('eventDialog'));$('openProposal').addEventListener('click',()=>openDialog('eventDialog'));$('openProposalIdeas').addEventListener('click',()=>openDialog('eventDialog'));
  $('eventForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),title=String(d.get('title')).trim(),record={id:crypto.randomUUID(),title,date:d.get('date'),time:d.get('time'),place:String(d.get('place')).trim()||'Place to be decided',description:String(d.get('description')).trim(),status:'proposed',kind:'Group proposal',note:''};try{if(syncReady){await addPost('event-proposal',title,{title:record.title,date:record.date,time:record.time,place:record.place,description:record.description,kind:record.kind})}else{state.events.push(record);state.messages.unshift({id:crypto.randomUUID(),name:state.name||'New proposal',text:`I proposed: ${title}. Add your thoughts in the community messages.`,kind:'proposal',createdAt:new Date().toISOString()});save()}}catch{state.events.push(record);save()}f.reset();$('eventDialog').close();setView('events');toast(syncReady?'Event proposal shared':'Event proposal saved on this device')});
  $('messageForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('messageInput'),text=input.value.trim();if(!text)return;try{if(syncReady){await addPost('note',text)}else{state.messages.unshift({id:crypto.randomUUID(),name:state.name||'Community member',text,kind:'note',createdAt:new Date().toISOString()});save()}}catch{state.messages.unshift({id:crypto.randomUUID(),name:state.name||'Community member',text,kind:'note',createdAt:new Date().toISOString()});save()}input.value='';toast(syncReady?'Message shared with the group':'Message saved on this device')});
  $('newMessage').addEventListener('click',()=>{setView('messages');$('messageInput').focus()});
  $('brunchForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('brunchItemInput'),item=input.value.trim();if(!item)return;try{if(syncReady){await db('rb_brunch_items',{method:'POST',prefer:'return=minimal',body:{item,display_name:state.name||''}});await loadShared()}else{state.brunchItems.push({item,name:state.name||''});save()}}catch{syncLabel('Offline preview','Shared board unavailable; changes on this device only',false);state.brunchItems.push({item,name:state.name||''});save()}input.value='';toast(syncReady?'Added to the shared brunch plan':'Added on this device')});
  $('brunchItems').addEventListener('click',e=>{const b=e.target.closest('[data-remove-brunch]');if(!b)return;state.brunchItems.splice(Number(b.dataset.removeBrunch),1);save()});
  $('suggestionForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('suggestionInput'),v=input.value.trim();if(!v||state.suggestions.includes(v))return;try{if(syncReady){await addPost('brunch-suggestion',v)}else{state.suggestions.push(v);save()}}catch{state.suggestions.push(v);save()}input.value='';toast(syncReady?'Suggestion shared':'Suggestion saved on this device')});
  $('suggestionList').addEventListener('click',async e=>{const b=e.target.closest('[data-claim-suggestion]');if(!b)return;const item=state.suggestions[Number(b.dataset.claimSuggestion)];if(state.brunchItems.some(x=>x.item===item&&x.name===(state.name||'')))return;try{if(syncReady){await db('rb_brunch_items',{method:'POST',prefer:'return=minimal',body:{item,display_name:state.name||''}});await loadShared()}else{state.brunchItems.push({item,name:state.name||''});save()}}catch{syncLabel('Offline preview','Shared board unavailable; changes on this device only',false);state.brunchItems.push({item,name:state.name||''});save()}toast(syncReady?`Added “${item}” to the shared plan`:`Added “${item}” on this device`)});
  $('addIdea').addEventListener('click',async()=>{const title=prompt('What would you like to do together?');if(!title?.trim())return;try{if(syncReady){await addPost('note',title.trim(),{category:'idea'})}else{state.ideas.push({title:title.trim(),tag:'NEW IDEA',text:'A new idea from the group. Add a date and details when you are ready.'});save()}}catch{state.ideas.push({title:title.trim(),tag:'NEW IDEA',text:'A new idea from the group. Add a date and details when you are ready.'});save()}toast(syncReady?'Idea shared with the group':'Idea saved on this device')});
  $('ideaGrid').addEventListener('click',e=>{const b=e.target.closest('[data-make-event]');if(!b)return;const idea=state.ideas[Number(b.dataset.makeEvent)];$('eventForm').elements.title.value=idea.title;openDialog('eventDialog')});
  async function markInterest(){
    try{if(syncReady){state.kartingInterestCount=Number(await db('rpc/rb_add_event_interest',{method:'POST',body:{p_event_slug:'karting-2026-10-24',p_voter_id:voterId()}}));render();toast('Your interest is shared with the group');return}}
    catch(error){console.warn(error);syncLabel('Offline preview','Shared board unavailable; changes on this device only',false)}
    state.kartingInterestCount=Number(state.kartingInterestCount||0)+1;save();toast('Interest saved on this device');
  }
  $('kartingInterest').addEventListener('click',markInterest);
  $('profileButton').addEventListener('click',()=>{const f=$('profileForm');f.elements.name.value=state.name||'';openDialog('profileDialog')});
  $('profileForm').addEventListener('submit',e=>{e.preventDefault();state.name=e.currentTarget.elements.name.value.trim();save();$('profileDialog').close();toast(state.name?`You’re listed as ${state.name}`:'Your name was cleared')});
  $('shareHub').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Hub link copied')}catch{toast(location.href)}});
  render();setView('home');loadShared();setInterval(loadShared,30000);
})();
