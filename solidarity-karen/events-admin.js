(()=> {
  const PREFIX="__EVENT__:";
  let saving=false;
  const TIME_ZONES=["Europe/Berlin","Europe/Paris","Europe/London","Africa/Douala","America/New_York","UTC"];

  function wallTime(iso,timeZone){
    if(!iso)return "";
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }

  function instant(value,timeZone){
    if(!value)return null;
    const desired=Date.parse(value+":00Z");
    if(!Number.isFinite(desired))throw Error("Enter a valid date and time.");
    let guess=desired;
    for(let i=0;i<4;i++){
      const represented=Date.parse(wallTime(new Date(guess).toISOString(),timeZone)+":00Z");
      const delta=desired-represented;
      if(delta===0)return new Date(guess).toISOString();
      guess+=delta;
    }
    throw Error("This time does not exist in the selected time zone. Choose another time.");
  }

  function isEventUpdate(x){
    return String(x?.title_en||"").startsWith(PREFIX);
  }

  function parseRecord(x){
    if(!isEventUpdate(x)) return null;
    try{
      const e=JSON.parse(x.body_en||"{}");
      return {...e,_recordId:x.id,_public:!!x.is_public};
    }catch{
      return null;
    }
  }

  function records(admin){
    return (admin?.updates||[]).map(parseRecord).filter(Boolean);
  }

  function label(e){
    return e?.title?.en||e?.title?.fr||e?.slug||"Event";
  }

  function slugify(v){
    return String(v||"")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"")
      .slice(0,90);
  }

  function moneyStats(admin,e){
    const rows=(admin?.contributions||[]).filter(x =>
      x.source==="event:"+e.slug &&
      ["confirmed","received","refunded"].includes(x.status)
    );
    const gross=rows
      .filter(x=>x.status!=="refunded")
      .reduce((n,x)=>n+Number(x.amount_cents||0),0);
    const refunds=rows
      .filter(x=>x.status==="refunded")
      .reduce((n,x)=>n+Number(x.amount_cents||0),0);

    return {
      events:rows.length,
      supporters:new Set(rows.filter(x=>x.status!=="refunded").map(x=>x.contributor_id||x.id)).size,
      net:Math.max(0,gross-refunds)
    };
  }

  function defaultDraft(admin){
    const target=Number(admin?.targetCents||0);
    const gross=(admin?.contributions||[])
      .filter(x=>["confirmed","received"].includes(x.status))
      .reduce((n,x)=>n+Number(x.amount_cents||0),0);
    const refunds=(admin?.contributions||[])
      .filter(x=>x.status==="refunded")
      .reduce((n,x)=>n+Number(x.amount_cents||0),0);
    const remaining=Math.max(0,target-Math.max(0,gross-refunds));

    return {
      id:crypto.randomUUID(),
      slug:"training-functional-garage-0211-karen",
      status:"draft",
      type:"training",
      venueName:"Functional Garage 0211",
      venueAddress:"In der Hött 8b, 40223 Düsseldorf, Germany",
      startsAt:null,
      endsAt:null,
      timeZone:"Europe/Berlin",
      capacity:null,
      goalCents:remaining||null,
      suggestedCents:null,
      showOnCampaign:true,
      title:{
        en:"Solidarity Training Session for Karen",
        fr:"Séance d’entraînement solidaire pour Karen",
        de:"Solidarisches Training für Karen"
      },
      description:{
        en:"Collective training in support of Karen. Pay what you can; the session turns training into direct material support.",
        fr:"Entraînement collectif en soutien à Karen. Contribution libre : l’entraînement devient un soutien matériel direct.",
        de:"Gemeinsames Training zur Unterstützung von Karen. Zahl, was du kannst: Training wird zu direkter materieller Unterstützung."
      }
    };
  }

  async function saveEvent(host,event,oldId,statusEl){
    if(saving)return;
    saving=true;
    const clean={...event};
    delete clean._recordId;
    delete clean._public;

    statusEl.textContent="Saving event…";

    try{
      const result=await host.adminAction({action:"save_event",record_id:oldId||null,event:clean});
      event._recordId=result.id;
      statusEl.textContent="Event saved.";
      try{await host.reload()}catch{statusEl.textContent="Event saved. Refresh to load the latest programme."}
    }catch{
      statusEl.textContent="Could not save event. Check your connection and organiser access, then retry.";
    }finally{saving=false}
  }

  function getContributionSources(admin){
    return records(admin)
      .filter(e=>!["cancelled","archived"].includes(e.status))
      .filter(e=>e.fundraising??["training","fundraiser"].includes(e.type))
      .map(e=>({
        value:"event:"+e.slug,
        label:"Event · "+label(e)+" · E-"+String(e.id).slice(0,8).toUpperCase()
      }));
  }

  function render(host){
    const {make,input,field,button,msg,money}=host;
    const admin=host.getAdmin();
    const wrap=make("div");
    let editing=null;

    const editor=make("div",undefined,"admin-panel");
    editor.append(
      make("h4","Event studio"),
      make(
        "div",
        "Plan community and fundraising events here. Drafts stay private. Published events appear automatically on the campaign page. Event-tagged contributions remain in the main fund and are counted here automatically.",
        "admin-hint"
      )
    );

    const type=document.createElement("select");
    ["training","fundraiser","community","workshop","meal","performance","other"].forEach(v=>{
      const o=document.createElement("option");
      o.value=v;
      o.textContent=v;
      type.append(o);
    });

    const lifecycle=document.createElement("select");
    ["draft","published","completed","cancelled","archived"].forEach(v=>{
      const o=document.createElement("option");
      o.value=v;
      o.textContent=v;
      lifecycle.append(o);
    });

    const titleEn=input("text");
    const titleFr=input("text");
    const titleDe=input("text");
    const venue=input("text");
    const address=input("text");address.maxLength=400;
    const starts=input("datetime-local");
    const ends=input("datetime-local");
    const goal=input("number");
    const suggested=input("number");
    const capacity=input("number");
    const fundraising=input("checkbox");
    const timeZone=document.createElement("select");
    const browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    [...new Set([...TIME_ZONES,browserZone])].filter(Boolean).forEach(v=>{
      const o=document.createElement("option");o.value=v;o.textContent=v;timeZone.append(o);
    });
    const descEn=document.createElement("textarea");
    const descFr=document.createElement("textarea");
    const descDe=document.createElement("textarea");
    [titleEn,titleFr,titleDe].forEach(x=>x.maxLength=200);
    [descEn,descFr,descDe].forEach(x=>x.maxLength=4000);

    goal.min=".01";
    goal.step=".01";
    suggested.min=".01";
    suggested.step=".01";
    capacity.min="1";
    capacity.step="1";

    const form=make("div",undefined,"admin-grid");
    form.append(
      field("Type",type),
      field("Lifecycle",lifecycle),
      field("Raise funds for this campaign",fundraising),
      field("Title EN",titleEn),
      field("Title FR",titleFr),
      field("Title DE",titleDe),
      field("Venue",venue),
      field("Venue address",address),
      field("Event time zone",timeZone),
      field("Starts",starts),
      field("Ends",ends),
      field("Event goal (€)",goal),
      field("Suggested contribution (€)",suggested),
      field("Capacity",capacity),
      field("Description EN",descEn),
      field("Description FR",descFr),
      field("Description DE",descDe)
    );

    const statusEl=msg();
    statusEl.setAttribute("role","status");
    const translations=make("details",undefined,"admin-panel");
    translations.append(make("summary","More event languages"));
    const translationGrid=make("div",undefined,"admin-grid"),extraLocales={};
    (admin.campaign?.enabled_locales||["en","fr","de","es","it","pt","nl","ar"]).filter(code=>!["en","fr","de"].includes(code)).forEach(code=>{
      const title=input("text"),description=document.createElement("textarea"),name=window.SOLIDARITY_LOCALES?.names?.[code]||code;
      title.maxLength=200;description.maxLength=4000;title.lang=description.lang=code;
      if(code==="ar")title.dir=description.dir="rtl";
      extraLocales[code]={title,description};
      translationGrid.append(field("Title · "+name,title),field("Description · "+name,description));
    });
    translations.append(translationGrid);

    function load(e){
      editing=e;
      type.value=e.type||"fundraiser";
      lifecycle.value=e.status||"draft";
      fundraising.checked=e.fundraising??["training","fundraiser"].includes(e.type);
      titleEn.value=e.title?.en||"";
      titleFr.value=e.title?.fr||"";
      titleDe.value=e.title?.de||"";
      venue.value=e.venueName||"";
      address.value=e.venueAddress||"";
      const zone=e.timeZone||"Europe/Berlin";
      if(![...timeZone.options].some(o=>o.value===zone)){
        const o=document.createElement("option");o.value=zone;o.textContent=zone;timeZone.append(o);
      }
      timeZone.value=zone;
      starts.value=wallTime(e.startsAt,zone);
      ends.value=wallTime(e.endsAt,zone);
      goal.value=e.goalCents?e.goalCents/100:"";
      suggested.value=e.suggestedCents?e.suggestedCents/100:"";
      capacity.value=e.capacity||"";
      descEn.value=e.description?.en||"";
      descFr.value=e.description?.fr||"";
      descDe.value=e.description?.de||"";
      Object.entries(extraLocales).forEach(([code,x])=>{x.title.value=e.title?.[code]||"";x.description.value=e.description?.[code]||""});
      statusEl.textContent=e._recordId
        ?"Editing "+label(e)
        :"Suggested first event";
    }

    function collect(){
      const startsAt=instant(starts.value,timeZone.value),endsAt=instant(ends.value,timeZone.value);
      if(endsAt&&(!startsAt||endsAt<=startsAt))throw Error("The end must be after the start.");
      for(const [control,label] of [[goal,"Event goal"],[suggested,"Suggested contribution"],[capacity,"Capacity"]]){
        if(control.value&&(!control.checkValidity()||!Number.isFinite(Number(control.value))))throw Error(label+" must be a positive "+(control===capacity?"whole number.":"amount."));
      }
      return {
        ...editing,
        id:editing?.id||crypto.randomUUID(),
        slug:editing?.slug||slugify(titleEn.value)||"event-"+crypto.randomUUID().slice(0,8),
        status:lifecycle.value,
        type:type.value,
        fundraising:fundraising.checked,
        venueName:venue.value.trim()||null,
        venueAddress:address.value.trim()||null,
        startsAt,
        endsAt,
        timeZone:timeZone.value,
        goalCents:goal.value?Math.round(Number(goal.value)*100):null,
        suggestedCents:suggested.value?Math.round(Number(suggested.value)*100):null,
        capacity:capacity.value?Number(capacity.value):null,
        showOnCampaign:true,
        title:{
          ...editing?.title,
          ...Object.fromEntries(Object.entries(extraLocales).map(([code,x])=>[code,x.title.value.trim()||null])),
          en:titleEn.value.trim(),
          fr:titleFr.value.trim()||null,
          de:titleDe.value.trim()||null
        },
        description:{
          ...editing?.description,
          ...Object.fromEntries(Object.entries(extraLocales).map(([code,x])=>[code,x.description.value.trim()||null])),
          en:descEn.value.trim()||null,
          fr:descFr.value.trim()||null,
          de:descDe.value.trim()||null
        }
      };
    }

    const actions=make("div",undefined,"admin-actions");
    actions.append(
      button("Save event",async()=>{
        if(!titleEn.value.trim()){
          statusEl.textContent="English title is required.";
          return;
        }
        if(lifecycle.value==="published"&&!starts.value){
          statusEl.textContent="Set a start date/time before publishing.";
          return;
        }
        let event;
        try{event=collect()}catch(e){statusEl.textContent=e.message;return}
        await saveEvent(host,event,editing?editing._recordId:null,statusEl);
      }),
      button("New event",()=>load({...defaultDraft(host.getAdmin()),slug:null,type:"community",title:{},description:{},venueName:null,venueAddress:null,goalCents:null}),"alt"),
      button("Training suggestion",()=>load(records(host.getAdmin()).find(e=>e.slug==="training-functional-garage-0211-karen")||defaultDraft(host.getAdmin())),"alt")
    );

    editor.append(form,translations,actions,statusEl);
    wrap.append(editor);

    const list=make("div",undefined,"admin-panel");
    list.append(
      make("h4","Event programme"),
      make(
        "div",
        "Fundraising attribution uses the normal contribution ledger: choose an event as the contribution source and its total updates automatically.",
        "admin-hint"
      )
    );

    const all=records(admin);

    if(!all.length){
      list.append(
        make(
          "div",
          "No saved events yet. The editor above is prefilled with a suggested Functional Garage 0211 solidarity training session.",
          "admin-hint"
        )
      );
    }

    all.forEach(e=>{
      const stats=moneyStats(admin,e);
      const row=make("div",undefined,"admin-row");
      const head=make("div",undefined,"admin-row-head");
      const left=make("div");

      left.append(
        make("b",label(e)),
        make("span",String(e.status||"draft").toUpperCase(),"source-chip")
      );

      head.append(
        left,
        make(
          "span",
          money(stats.net)+" · "+stats.supporters+" supporter"+
          (stats.supporters===1?"":"s")
        )
      );

      const meta=make(
        "div",
        (e.venueName||"Venue not set")+" · "+
        (e.startsAt?new Intl.DateTimeFormat(undefined,{timeZone:e.timeZone||"Europe/Berlin",dateStyle:"medium",timeStyle:"short"}).format(new Date(e.startsAt))+" · "+(e.timeZone||"Europe/Berlin"):"date/time not set")+
        (e.goalCents?" · goal "+money(e.goalCents):""),
        "admin-hint"
      );

      const rowMsg=msg();
      const rowActions=make("div",undefined,"admin-actions");

      rowActions.append(
        button("Edit",()=>{
          load(e);
          window.scrollTo({top:0,behavior:"smooth"});
        },"alt")
      );

      if(e.status==="draft"){
        rowActions.append(
          button("Publish",async()=>{
            if(!e.startsAt){
              rowMsg.textContent="Set date/time first.";
              return;
            }
            await saveEvent(host,{...e,status:"published"},e._recordId,rowMsg);
          },"green")
        );
      }

      if(e.status==="published"){
        rowActions.append(
          button(
            "Complete",
            ()=>saveEvent(host,{...e,status:"completed"},e._recordId,rowMsg),
            "green"
          ),
          button(
            "Return to draft",
            ()=>saveEvent(host,{...e,status:"draft"},e._recordId,rowMsg),
            "alt"
          )
        );
      }

      if(!["cancelled","archived"].includes(e.status)){
        rowActions.append(
          button(
            "Cancel",
            ()=>saveEvent(host,{...e,status:"cancelled"},e._recordId,rowMsg),
            "red"
          )
        );
      }

      row.append(head,meta,rowActions,rowMsg);
      list.append(row);
    });

    wrap.append(list);
    load(all[0]||defaultDraft(admin));
    return wrap;
  }

  window.RBEventsAdmin={
    render,
    getContributionSources,
    isEventUpdate
  };
})();
