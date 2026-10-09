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
  let state=load(); let toastTimer;
  const $=id=>document.getElementById(id);
  const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function load(){try{const s=JSON.parse(localStorage.getItem(KEY));return s&&Array.isArray(s.events)?{...structuredClone(starter),...s}:structuredClone(starter)}catch{return structuredClone(starter)}}
  function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
  function monthDay(iso){if(!iso)return 'Date to be decided';const d=new Date(iso+'T12:00:00');return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(d)}
  function initials(name){return (name||'R').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'R'}
  function eventStatus(e){return e.status==='cancelled'?'Cancelled':e.status==='postponed'?'Postponed':e.status==='changed'?'Updated':e.status==='proposed'?'Proposed':'Scheduled'}
  function eventCard(e){
    const date=e.date?new Date(e.date+'T12:00:00'):null;
    const day=date?new Intl.DateTimeFormat('en-GB',{day:'2-digit'}).format(date):'–';
    const mon=date?new Intl.DateTimeFormat('en-GB',{month:'short'}).format(date):'TBD';
    const when=e.date?`${monthDay(e.date)}${e.time?' · '+e.time:''}${e.endTime?'–'+e.endTime:''}`:'Time and date to be decided';
    return `<article class="event-row"><div class="event-row-date"><strong>${day}</strong><span>${safe(mon)}</span></div><div><h3>${safe(e.title)}</h3><div class="event-row-meta">${safe(e.kind||'Group event')} · ${safe(when)}</div><p>${safe(e.place||'Place to be decided')}</p><p>${safe(e.description||'')}</p></div><div class="event-row-actions"><span class="status-chip ${safe(e.status)}">${eventStatus(e)}</span><button class="tiny-button" data-interest="${safe(e.id)}">Interested <span>(${Number(e.interested||0)})</span></button><button class="tiny-button" data-update="${safe(e.id)}">Post update</button></div>${e.note?`<p class="event-update-note">${safe(e.note)}</p>`:''}</article>`;
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
    const voters=Object.values(state.votesByVoter||{}).filter(v=>Array.isArray(v)&&v.length>0).length;
    $('pollTally').textContent=voters?`${voters} ${voters===1?'person has':'people have'} voted`:'No votes yet';
    $('pollVoteCount').textContent=String(voters);
    $('pollSideNote').textContent=state.myVote.length?`Your selections are saved in this browser: ${state.myVote.map(d=>options.find(o=>o.date===d)?.label).join(', ')}.`:'Pick as many Friday and Saturday evenings as work for you.';
    $('eventList').innerHTML=state.events.map(eventCard).join('');
    $('activityFeed').innerHTML=state.messages.slice(0,3).map(feedItem).join('');
    $('messageList').innerHTML=state.messages.map(messageCard).join('');
    $('brunchItems').innerHTML=state.brunchItems.length?state.brunchItems.map((x,i)=>`<div class="brunch-item"><span class="dish-icon">✿</span><span class="dish-name">${safe(x.item)}</span><span class="dish-person">${safe(x.name||'No name added')}</span><button type="button" aria-label="Remove ${safe(x.item)}" data-remove-brunch="${i}">×</button></div>`).join(''):'<div class="brunch-items-empty">Nothing claimed yet. Add a dish, a drink, or a helping hand.</div>';
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
  function toggleDate(date){const s=new Set(state.myVote||[]);s.has(date)?s.delete(date):s.add(date);state.myVote=[...s]}
  function submitVote(){
    const voter=localStorage.getItem('rb-community-voter')||crypto.randomUUID();localStorage.setItem('rb-community-voter',voter);
    const votesByVoter=state.votesByVoter||{};const prior=votesByVoter[voter]||[];
    prior.forEach(d=>state.votes[d]=Math.max(0,Number(state.votes[d]||0)-1));
    (state.myVote||[]).forEach(d=>state.votes[d]=Number(state.votes[d]||0)+1);
    votesByVoter[voter]=[...state.myVote];state.votesByVoter=votesByVoter;save();$('pollNote').textContent=state.myVote.length?'Your availability is saved on this device.':'You cleared your selections.';toast('Poll updated on this device');
  }
  function openDialog(id){$(id).showModal()}
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-open-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.openView)));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  $('pollChoices').addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(!b)return;toggleDate(b.dataset.choice);render()});
  $('pollChoicesFull').addEventListener('change',e=>{const i=e.target.closest('[data-choice]');if(!i)return;toggleDate(i.dataset.choice);render()});
  $('castVote').addEventListener('click',submitVote);$('castVoteFull').addEventListener('click',submitVote);
  $('eventList').addEventListener('click',e=>{
    const interest=e.target.closest('[data-interest]');if(interest){const event=state.events.find(x=>x.id===interest.dataset.interest);event.interested=Number(event.interested||0)+1;save();toast('Interest noted on this device');return}
    const update=e.target.closest('[data-update]');if(update){const event=state.events.find(x=>x.id===update.dataset.update);$('updateForm').elements.eventId.value=event.id;$('updateDialogTitle').textContent=event.title;openDialog('updateDialog')}
  });
  $('updateForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,ev=state.events.find(x=>x.id===f.elements.eventId.value);if(!ev)return;ev.status=f.elements.status.value;ev.note=f.elements.note.value.trim();state.messages.unshift({id:crypto.randomUUID(),name:state.name||'Group update',text:`${ev.title} — ${eventStatus(ev).toLowerCase()}: ${ev.note}`,kind:'event-change',createdAt:new Date().toISOString()});save();f.reset();$('updateDialog').close();toast('Event update added to the board')});
  $('addEvent').addEventListener('click',()=>openDialog('eventDialog'));$('openProposal').addEventListener('click',()=>openDialog('eventDialog'));$('openProposalIdeas').addEventListener('click',()=>openDialog('eventDialog'));
  $('eventForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),title=String(d.get('title')).trim();state.events.push({id:crypto.randomUUID(),title,date:d.get('date'),time:d.get('time'),place:String(d.get('place')).trim()||'Place to be decided',description:String(d.get('description')).trim(),status:'proposed',kind:'Group proposal',note:''});state.messages.unshift({id:crypto.randomUUID(),name:state.name||'New proposal',text:`I proposed: ${title}. Add your thoughts in the community messages.`,kind:'proposal',createdAt:new Date().toISOString()});save();f.reset();$('eventDialog').close();setView('events');toast('Event proposal added')});
  $('messageForm').addEventListener('submit',e=>{e.preventDefault();const input=$('messageInput'),text=input.value.trim();if(!text)return;state.messages.unshift({id:crypto.randomUUID(),name:state.name||'Community member',text,kind:'note',createdAt:new Date().toISOString()});save();input.value='';toast('Message added to the board')});
  $('newMessage').addEventListener('click',()=>{setView('messages');$('messageInput').focus()});
  $('brunchForm').addEventListener('submit',e=>{e.preventDefault();const input=$('brunchItemInput'),item=input.value.trim();if(!item)return;state.brunchItems.push({item,name:state.name||''});save();input.value='';toast('Added to the brunch plan')});
  $('brunchItems').addEventListener('click',e=>{const b=e.target.closest('[data-remove-brunch]');if(!b)return;state.brunchItems.splice(Number(b.dataset.removeBrunch),1);save()});
  $('suggestionForm').addEventListener('submit',e=>{e.preventDefault();const input=$('suggestionInput'),v=input.value.trim();if(v&&!state.suggestions.includes(v)){state.suggestions.push(v);save();input.value='';toast('Suggestion added')}});
  $('suggestionList').addEventListener('click',e=>{const b=e.target.closest('[data-claim-suggestion]');if(!b)return;const item=state.suggestions[Number(b.dataset.claimSuggestion)];if(!state.brunchItems.some(x=>x.item===item&&x.name===(state.name||'')))state.brunchItems.push({item,name:state.name||''});save();toast(`Added “${item}” to the brunch plan`)});
  $('addIdea').addEventListener('click',()=>{const title=prompt('What would you like to do together?');if(!title?.trim())return;state.ideas.push({title:title.trim(),tag:'NEW IDEA',text:'A new idea from the group. Add a date and details when you are ready.'});save();toast('Idea added')});
  $('ideaGrid').addEventListener('click',e=>{const b=e.target.closest('[data-make-event]');if(!b)return;const idea=state.ideas[Number(b.dataset.makeEvent)];$('eventForm').elements.title.value=idea.title;openDialog('eventDialog')});
  $('kartingInterest').addEventListener('click',()=>{const ev=state.events.find(x=>x.id==='karting');ev.interested=Number(ev.interested||0)+1;save();$('kartingResponse').textContent=`${ev.interested} ${ev.interested===1?'person is':'people are'} interested`;toast('Interest noted on this device')});
  $('profileButton').addEventListener('click',()=>{const f=$('profileForm');f.elements.name.value=state.name||'';openDialog('profileDialog')});
  $('profileForm').addEventListener('submit',e=>{e.preventDefault();state.name=e.currentTarget.elements.name.value.trim();save();$('profileDialog').close();toast(state.name?`You’re listed as ${state.name}`:'Your name was cleared')});
  $('shareHub').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Hub link copied')}catch{toast(location.href)}});
  render();setView('home');
})();
