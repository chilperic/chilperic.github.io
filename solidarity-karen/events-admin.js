(()=> {
  const PREFIX="__EVENT__:";

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
      supporters:new Set(rows.map(x=>x.real_name)).size,
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
      startsAt:null,
      endsAt:null,
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
    const clean={...event};
    delete clean._recordId;
    delete clean._public;

    const isPublic=["published","completed"].includes(clean.status);
    statusEl.textContent="Saving event…";

    try{
      await host.adminAction({
        action:"add_update",
        title_en:PREFIX+clean.slug,
        title_fr:PREFIX+clean.slug,
        body_en:JSON.stringify(clean),
        body_fr:null,
        is_public:isPublic
      });

      if(oldId){
        await host.adminAction({action:"delete_update",id:oldId});
      }

      statusEl.textContent="Event saved.";
      await host.reload();
    }catch{
      statusEl.textContent="Could not save event.";
    }
  }

  function getContributionSources(admin){
    return records(admin)
      .filter(e=>!["cancelled","archived"].includes(e.status))
      .map(e=>({
        value:"event:"+e.slug,
        label:"Event · "+label(e)
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
    const starts=input("datetime-local");
    const ends=input("datetime-local");
    const goal=input("number");
    const suggested=input("number");
    const capacity=input("number");
    const descEn=document.createElement("textarea");
    const descFr=document.createElement("textarea");
    const descDe=document.createElement("textarea");

    goal.min=".01";
    goal.step=".01";
    suggested.min=".01";
    suggested.step=".01";
    capacity.min="1";

    const form=make("div",undefined,"admin-grid");
    form.append(
      field("Type",type),
      field("Lifecycle",lifecycle),
      field("Title EN",titleEn),
      field("Title FR",titleFr),
      field("Title DE",titleDe),
      field("Venue",venue),
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

    function load(e){
      editing=e;
      type.value=e.type||"fundraiser";
      lifecycle.value=e.status||"draft";
      titleEn.value=e.title?.en||"";
      titleFr.value=e.title?.fr||"";
      titleDe.value=e.title?.de||"";
      venue.value=e.venueName||"";
      starts.value=e.startsAt?new Date(e.startsAt).toISOString().slice(0,16):"";
      ends.value=e.endsAt?new Date(e.endsAt).toISOString().slice(0,16):"";
      goal.value=e.goalCents?e.goalCents/100:"";
      suggested.value=e.suggestedCents?e.suggestedCents/100:"";
      capacity.value=e.capacity||"";
      descEn.value=e.description?.en||"";
      descFr.value=e.description?.fr||"";
      descDe.value=e.description?.de||"";
      statusEl.textContent=e._recordId
        ?"Editing "+label(e)
        :"Suggested first event";
    }

    function collect(){
      return {
        id:editing?.id||crypto.randomUUID(),
        slug:editing?.slug||slugify(titleEn.value),
        status:lifecycle.value,
        type:type.value,
        venueName:venue.value.trim()||null,
        startsAt:starts.value?new Date(starts.value).toISOString():null,
        endsAt:ends.value?new Date(ends.value).toISOString():null,
        goalCents:goal.value?Math.round(Number(goal.value)*100):null,
        suggestedCents:suggested.value?Math.round(Number(suggested.value)*100):null,
        capacity:capacity.value?Number(capacity.value):null,
        showOnCampaign:true,
        title:{
          en:titleEn.value.trim(),
          fr:titleFr.value.trim()||null,
          de:titleDe.value.trim()||null
        },
        description:{
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
        await saveEvent(host,collect(),editing?editing._recordId:null,statusEl);
      }),
      button("Reset suggestion",()=>load(defaultDraft(host.getAdmin())),"alt")
    );

    editor.append(form,actions,statusEl);
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
        (e.startsAt?new Date(e.startsAt).toLocaleString():"date/time not set")+
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