-- Complete the event workflow while preserving the existing campaign and ledger.
-- Execute through the Supabase migration API. All statements run in one transaction.
-- Existing SECURITY DEFINER RPCs retain their credential checks and role restrictions.
alter table public.karen_fund_contributions
  add column if not exists public_id uuid not null default gen_random_uuid();
create unique index if not exists karen_contributions_public_id_key
  on public.karen_fund_contributions(public_id);

CREATE OR REPLACE FUNCTION public.karen_admin_action(p_secret_digest text, p_action jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_hash text;
  v_ctx jsonb;
  v_role text;
  v_action text := coalesce(p_action->>'action','');
  v_id text;
  v_target integer;
  v_rows jsonb;
  v_new_digest text;
  v_campaign_id uuid;
  v_campaign jsonb;
  v_milestones jsonb;
  v_updates jsonb;
  v_expenses jsonb;
  v_event jsonb;
  v_old_event jsonb;
  v_record_id uuid;
  v_slug text;
  v_event_status text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_pair record;
begin
  v_ctx:=public.solidarity_credential_context(p_secret_digest);
  v_role:=v_ctx->>'role';

  select id into v_campaign_id from public.solidarity_campaigns where is_active=true order by updated_at desc limit 1;

  if v_action='list' then
    if v_role not in ('owner','organizer','treasurer','auditor') then raise exception 'forbidden' using errcode='42501'; end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'real_name',real_name,'amount_cents',amount_cents,'contributed_on',contributed_on,
      'status',status,'public_name',public_name,'public_alias',public_alias,'note',note,
      'source',source,'provider_ref',provider_ref,'currency',currency,'contributor_id',contributor_id
    ) order by contributed_on desc,created_at desc),'[]'::jsonb)
    into v_rows from public.karen_fund_contributions where campaign_id=v_campaign_id;
    select to_jsonb(c) into v_campaign from public.solidarity_campaigns c where c.id=v_campaign_id;
    select coalesce(jsonb_agg(to_jsonb(m) order by m.sort_order,m.threshold_cents),'[]'::jsonb) into v_milestones from public.solidarity_milestones m where m.campaign_id=v_campaign_id;
    select coalesce(jsonb_agg(to_jsonb(u) order by u.published_at desc),'[]'::jsonb) into v_updates from public.solidarity_updates u where u.campaign_id=v_campaign_id;
    select coalesce(jsonb_agg(to_jsonb(e) order by e.spent_on desc,e.created_at desc),'[]'::jsonb) into v_expenses from public.solidarity_expenses e where e.campaign_id=v_campaign_id;
    return jsonb_build_object('ok',true,'contributions',v_rows,'campaign',v_campaign,'milestones',v_milestones,'updates',v_updates,'expenses',v_expenses,'targetCents',(select target_cents from public.solidarity_campaigns where id=v_campaign_id));

  elsif v_action='add' then
    if v_role not in ('owner','treasurer') then raise exception 'forbidden' using errcode='42501'; end if;
    if nullif(trim(p_action->>'real_name'),'') is null then raise exception 'invalid_name'; end if;
    if coalesce((p_action->>'amount_cents')::integer,0)<=0 then raise exception 'invalid_amount'; end if;
    v_id:=gen_random_uuid()::text;
    insert into public.karen_fund_contributions(id,campaign_id,real_name,amount_cents,contributed_on,status,public_name,public_alias,note)
    values(v_id,v_campaign_id,left(trim(p_action->>'real_name'),100),(p_action->>'amount_cents')::integer,coalesce((p_action->>'contributed_on')::date,current_date),coalesce(nullif(p_action->>'status',''),'confirmed'),coalesce((p_action->>'public_name')::boolean,false),case when coalesce((p_action->>'public_name')::boolean,false) then left(coalesce(nullif(trim(p_action->>'public_alias'),''),trim(p_action->>'real_name')),100) else null end,left(nullif(trim(p_action->>'note'),''),300));
    return jsonb_build_object('ok',true,'id',v_id);

  elsif v_action='update' then
    if v_role not in ('owner','treasurer') then raise exception 'forbidden' using errcode='42501'; end if;
    v_id:=p_action->>'id';
    update public.karen_fund_contributions set
      real_name=case when p_action?'real_name' then left(trim(p_action->>'real_name'),100) else real_name end,
      amount_cents=case when p_action?'amount_cents' then (p_action->>'amount_cents')::integer else amount_cents end,
      contributed_on=case when p_action?'contributed_on' then (p_action->>'contributed_on')::date else contributed_on end,
      status=case when p_action?'status' then p_action->>'status' else status end,
      public_name=case when p_action?'public_name' then (p_action->>'public_name')::boolean else public_name end,
      public_alias=case when p_action?'public_name' and not (p_action->>'public_name')::boolean then null when p_action?'public_alias' then left(nullif(trim(p_action->>'public_alias'),''),100) else public_alias end,
      note=case when p_action?'note' then left(nullif(trim(p_action->>'note'),''),300) else note end,
      updated_at=now()
    where id=v_id and campaign_id=v_campaign_id;
    return jsonb_build_object('ok',true);

  elsif v_action='set_target' then
    if v_role not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
    v_target:=(p_action->>'target_cents')::integer;
    if v_target<=0 then raise exception 'invalid_target'; end if;
    update public.solidarity_campaigns set target_cents=v_target,updated_at=now() where id=v_campaign_id;
    update public.karen_fund_settings set target_cents=v_target,updated_at=now() where singleton=true;
    return jsonb_build_object('ok',true);

  elsif v_action='set_password' then
    if v_role not in ('owner') then raise exception 'forbidden' using errcode='42501'; end if;
    v_new_digest:=lower(coalesce(p_action->>'new_secret_digest',''));
    if v_new_digest!~'^[0-9a-f]{64}$' then raise exception 'invalid_new_secret'; end if;
    update public.karen_fund_settings set admin_secret_hash=crypt(v_new_digest,gen_salt('bf',12)),updated_at=now() where singleton=true;
    return jsonb_build_object('ok',true);

  elsif v_action='update_campaign' then
    if v_role not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
    update public.solidarity_campaigns set
      title=coalesce(nullif(trim(p_action->>'title'),''),title),
      beneficiary=case when p_action?'beneficiary' then left(nullif(trim(p_action->>'beneficiary'),''),120) else beneficiary end,
      subtitle=case when p_action?'subtitle' then left(nullif(trim(p_action->>'subtitle'),''),180) else subtitle end,
      story_en=case when p_action?'story_en' then left(nullif(trim(p_action->>'story_en'),''),4000) else story_en end,
      story_fr=case when p_action?'story_fr' then left(nullif(trim(p_action->>'story_fr'),''),4000) else story_fr end,
      status=case when p_action?'status' then p_action->>'status' else status end,
      theme=case when p_action?'theme' and p_action->>'theme' in ('assembly','paper','night') then p_action->>'theme' else theme end,
      overfunding_policy_en=case when p_action?'overfunding_en' then left(nullif(trim(p_action->>'overfunding_en'),''),1200) else overfunding_policy_en end,
      overfunding_policy_fr=case when p_action?'overfunding_fr' then left(nullif(trim(p_action->>'overfunding_fr'),''),1200) else overfunding_policy_fr end,
      payment_url=case when p_action?'payment_url' then left(nullif(trim(p_action->>'payment_url'),''),1000) else payment_url end,
      payment_label_en=case when p_action?'payment_label_en' then left(nullif(trim(p_action->>'payment_label_en'),''),100) else payment_label_en end,
      payment_label_fr=case when p_action?'payment_label_fr' then left(nullif(trim(p_action->>'payment_label_fr'),''),100) else payment_label_fr end,
      thank_you_en=case when p_action?'thank_you_en' then left(nullif(trim(p_action->>'thank_you_en'),''),1000) else thank_you_en end,
      thank_you_fr=case when p_action?'thank_you_fr' then left(nullif(trim(p_action->>'thank_you_fr'),''),1000) else thank_you_fr end,
      show_supporters=case when p_action?'show_supporters' then (p_action->>'show_supporters')::boolean else show_supporters end,
      show_ledger=case when p_action?'show_ledger' then (p_action->>'show_ledger')::boolean else show_ledger end,
      show_analytics=case when p_action?'show_analytics' then (p_action->>'show_analytics')::boolean else show_analytics end,
      show_expenses=case when p_action?'show_expenses' then (p_action->>'show_expenses')::boolean else show_expenses end,
      show_updates=case when p_action?'show_updates' then (p_action->>'show_updates')::boolean else show_updates end,
      show_milestones=case when p_action?'show_milestones' then (p_action->>'show_milestones')::boolean else show_milestones end,
      updated_at=now()
    where id=v_campaign_id;
    return jsonb_build_object('ok',true);

  elsif v_action='add_milestone' then
    if v_role not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
    insert into public.solidarity_milestones(campaign_id,label_en,label_fr,threshold_cents,sort_order)
    values(v_campaign_id,left(trim(p_action->>'label_en'),160),left(nullif(trim(p_action->>'label_fr'),''),160),(p_action->>'threshold_cents')::integer,coalesce((p_action->>'sort_order')::integer,0));
    return jsonb_build_object('ok',true);
  elsif v_action='delete_milestone' then
    if v_role not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
    delete from public.solidarity_milestones where id=(p_action->>'id')::uuid and campaign_id=v_campaign_id;return jsonb_build_object('ok',true);
  elsif v_action='save_event' then
    if v_role not in ('owner','organizer') then
      raise exception 'forbidden' using errcode='42501';
    end if;
    if v_campaign_id is null then raise exception 'campaign_not_found'; end if;
    -- Serialize event writes for the campaign, including first-save retries.
    perform 1 from public.solidarity_campaigns where id=v_campaign_id for update;
    v_event:=p_action->'event';
    if jsonb_typeof(v_event) is distinct from 'object' or octet_length(v_event::text)>65536 then
      raise exception 'invalid_event';
    end if;
    if nullif(v_event->>'id','') is null then raise exception 'invalid_event_id'; end if;
    perform (v_event->>'id')::uuid;
    v_slug:=v_event->>'slug';
    if v_slug is null or v_slug !~ '^[a-z0-9][a-z0-9-]{0,89}$' then raise exception 'invalid_event_slug'; end if;
    v_event_status:=v_event->>'status';
    if v_event_status is null or v_event_status not in ('draft','published','completed','cancelled','archived') then
      raise exception 'invalid_event_status';
    end if;
    if v_event->>'type' is null or v_event->>'type' not in ('training','fundraiser','community','workshop','meal','performance','other') then
      raise exception 'invalid_event_type';
    end if;
    if jsonb_typeof(v_event->'title') is distinct from 'object'
      or nullif(trim(v_event->'title'->>'en'),'') is null then raise exception 'event_title_required'; end if;
    for v_pair in select key,value from jsonb_each(v_event->'title') loop
      if jsonb_typeof(v_pair.value) not in ('string','null') or length(v_pair.value #>> '{}')>200 then
        raise exception 'invalid_event_title';
      end if;
    end loop;
    if v_event ? 'description' and jsonb_typeof(v_event->'description') is distinct from 'object' then
      raise exception 'invalid_event_description';
    end if;
    for v_pair in select key,value from jsonb_each(coalesce(v_event->'description','{}'::jsonb)) loop
      if jsonb_typeof(v_pair.value) not in ('string','null') or length(v_pair.value #>> '{}')>4000 then
        raise exception 'invalid_event_description';
      end if;
    end loop;
    if not exists(select 1 from pg_catalog.pg_timezone_names where name=coalesce(v_event->>'timeZone','Europe/Berlin')) then
      raise exception 'invalid_event_timezone';
    end if;
    v_starts:=nullif(v_event->>'startsAt','')::timestamptz;
    v_ends:=nullif(v_event->>'endsAt','')::timestamptz;
    if v_event_status in ('published','completed') and v_starts is null then raise exception 'event_start_required'; end if;
    if v_ends is not null and (v_starts is null or v_ends<=v_starts) then raise exception 'invalid_event_end'; end if;
    foreach v_id in array array['goalCents','suggestedCents','capacity'] loop
      if nullif(v_event->>v_id,'') is not null and (
        jsonb_typeof(v_event->v_id) is distinct from 'number'
        or v_event->>v_id !~ '^[0-9]+$'
        or (v_event->>v_id)::numeric<=0
        or (v_event->>v_id)::numeric>2147483647
      ) then raise exception 'invalid_event_amount_or_capacity'; end if;
    end loop;
    v_record_id:=nullif(p_action->>'record_id','')::uuid;
    if v_record_id is not null then
      select body_en::jsonb into v_old_event from public.solidarity_updates
      where id=v_record_id and campaign_id=v_campaign_id and title_en like '__EVENT__:%' for update;
      if not found then raise exception 'event_not_found'; end if;
    else
      select id,body_en::jsonb into v_record_id,v_old_event from public.solidarity_updates
      where campaign_id=v_campaign_id and title_en='__EVENT__:'||v_slug for update;
    end if;
    if v_old_event is not null and (
      v_old_event->>'id' is distinct from v_event->>'id'
      or v_old_event->>'slug' is distinct from v_slug
    ) then raise exception 'event_identity_conflict'; end if;
    if v_record_id is null then
      insert into public.solidarity_updates(campaign_id,title_en,title_fr,body_en,body_fr,is_public,published_at)
      values(v_campaign_id,'__EVENT__:'||v_slug,'__EVENT__:'||v_slug,v_event::text,null,
        v_event_status in ('published','completed','cancelled'),now()) returning id into v_record_id;
    else
      update public.solidarity_updates set body_en=v_event::text,body_fr=null,
        is_public=v_event_status in ('published','completed','cancelled')
      where id=v_record_id and campaign_id=v_campaign_id;
    end if;
    update public.solidarity_campaigns set updated_at=now() where id=v_campaign_id;
    return jsonb_build_object('ok',true,'id',v_record_id);

  elsif v_action='add_update' then
    if v_role not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
    insert into public.solidarity_updates(campaign_id,title_en,title_fr,body_en,body_fr,is_public,published_at)
    values(v_campaign_id,left(trim(p_action->>'title_en'),200),left(nullif(trim(p_action->>'title_fr'),''),200),left(nullif(trim(p_action->>'body_en'),''),3000),left(nullif(trim(p_action->>'body_fr'),''),3000),coalesce((p_action->>'is_public')::boolean,true),now());
    return jsonb_build_object('ok',true);
  elsif v_action='delete_update' then
    if v_role not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
    delete from public.solidarity_updates where id=(p_action->>'id')::uuid and campaign_id=v_campaign_id;return jsonb_build_object('ok',true);
  elsif v_action='add_expense' then
    if v_role not in ('owner','treasurer') then raise exception 'forbidden' using errcode='42501'; end if;
    insert into public.solidarity_expenses(campaign_id,label_en,label_fr,amount_cents,spent_on,status,public_note_en,public_note_fr)
    values(v_campaign_id,left(trim(p_action->>'label_en'),180),left(nullif(trim(p_action->>'label_fr'),''),180),(p_action->>'amount_cents')::integer,coalesce((p_action->>'spent_on')::date,current_date),coalesce(nullif(p_action->>'status',''),'recorded'),left(nullif(trim(p_action->>'note_en'),''),1000),left(nullif(trim(p_action->>'note_fr'),''),1000));
    return jsonb_build_object('ok',true);
  elsif v_action='delete_expense' then
    if v_role not in ('owner','treasurer') then raise exception 'forbidden' using errcode='42501'; end if;
    delete from public.solidarity_expenses where id=(p_action->>'id')::uuid and campaign_id=v_campaign_id;return jsonb_build_object('ok',true);
  else raise exception 'unknown_action';
  end if;
end
$function$;


CREATE OR REPLACE FUNCTION public.karen_public_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_campaign public.solidarity_campaigns%rowtype;
  v_contrib jsonb;
  v_milestones jsonb;
  v_updates jsonb;
  v_expenses jsonb;
begin
  select * into v_campaign
  from public.solidarity_campaigns
  where is_active=true
  order by updated_at desc
  limit 1;

  if v_campaign.id is null then
    return jsonb_build_object('campaign',null,'contributions','[]'::jsonb,'milestones','[]'::jsonb,'updates','[]'::jsonb,'expenses','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.public_id,
    'supporterId',(select s.public_id from public.solidarity_contributors s where s.id=c.contributor_id),
    'amountCents',c.amount_cents,
    'amount',c.amount_cents/100.0,
    'date',c.contributed_on,
    'status',c.status,
    'source',c.source,
    'publicNameConsent',c.public_name,
    'name',case when c.public_name then coalesce(nullif(c.public_alias,''),c.real_name) else null end
  ) order by c.contributed_on,c.created_at),'[]'::jsonb)
  into v_contrib
  from public.karen_fund_contributions c
  where c.campaign_id=v_campaign.id
    and c.status in ('confirmed','received','refunded');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'label_en',m.label_en,'label_fr',m.label_fr,
    'thresholdCents',m.threshold_cents,'sortOrder',m.sort_order
  ) order by m.sort_order,m.threshold_cents),'[]'::jsonb)
  into v_milestones
  from public.solidarity_milestones m
  where m.campaign_id=v_campaign.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',u.id,'title_en',u.title_en,'title_fr',u.title_fr,
    'body_en',u.body_en,'body_fr',u.body_fr,'publishedAt',u.published_at
  ) order by u.published_at desc),'[]'::jsonb)
  into v_updates
  from public.solidarity_updates u
  where u.campaign_id=v_campaign.id and u.is_public=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'label_en',e.label_en,'label_fr',e.label_fr,
    'amountCents',e.amount_cents,'spentOn',e.spent_on,'status',e.status,
    'note_en',e.public_note_en,'note_fr',e.public_note_fr
  ) order by e.spent_on desc,e.created_at desc),'[]'::jsonb)
  into v_expenses
  from public.solidarity_expenses e
  where e.campaign_id=v_campaign.id and e.status='recorded';

  return jsonb_build_object(
    'campaign',jsonb_build_object(
      'id',v_campaign.id,'slug',v_campaign.slug,'title',v_campaign.title,
      'beneficiary',v_campaign.beneficiary,'subtitle',v_campaign.subtitle,
      'story_en',v_campaign.story_en,'story_fr',v_campaign.story_fr,
      'targetCents',v_campaign.target_cents,'currency',v_campaign.currency,
      'status',v_campaign.status,'theme',v_campaign.theme,
      'startDate',v_campaign.start_date,'endDate',v_campaign.end_date,
      'overfunding_en',v_campaign.overfunding_policy_en,
      'overfunding_fr',v_campaign.overfunding_policy_fr,
      'paymentUrl',v_campaign.payment_url,
      'paymentLabel_en',v_campaign.payment_label_en,
      'paymentLabel_fr',v_campaign.payment_label_fr,
      'thankYou_en',v_campaign.thank_you_en,
      'thankYou_fr',v_campaign.thank_you_fr,
      'showSupporters',v_campaign.show_supporters,
      'showLedger',v_campaign.show_ledger,
      'showAnalytics',v_campaign.show_analytics,
      'showExpenses',v_campaign.show_expenses,
      'showUpdates',v_campaign.show_updates,
      'showMilestones',v_campaign.show_milestones,
      'enabledLocales',v_campaign.enabled_locales,
      'localeContent',v_campaign.locale_content
    ),
    'targetCents',v_campaign.target_cents,
    'updated',greatest(
      v_campaign.updated_at,
      coalesce((select max(c.updated_at) from public.karen_fund_contributions c where c.campaign_id=v_campaign.id),v_campaign.updated_at),
      coalesce((select max(e.updated_at) from public.solidarity_expenses e where e.campaign_id=v_campaign.id),v_campaign.updated_at)
    ),
    'contributions',v_contrib,
    'milestones',v_milestones,
    'updates',v_updates,
    'expenses',v_expenses
  );
end
$function$;
