-- Keep the two existing organizer save paths consistent for Karen's training.
create or replace function public.rb_sync_training_details(p_source text)
returns void language plpgsql security invoker set search_path='' as $$
declare c uuid; u uuid; ev jsonb; s public.rb_commons_sessions%rowtype; start_at timestamptz; finish_at timestamptz; day date; start_time time; finish_time time; zone text;
begin
 select id into c from public.solidarity_campaigns where is_active order by updated_at desc limit 1 for update;
 select id,body_en::jsonb into u,ev from public.solidarity_updates where campaign_id=c and title_en='__EVENT__:training-functional-garage-0211-karen' for update;
 if u is null then return; end if;
 zone:=coalesce(ev->>'timeZone','Europe/Berlin');
 if p_source='session' then
  select * into s from public.rb_commons_sessions where scope='karen-training';
  if not found then return; end if;
  day:=coalesce(s.date,(nullif(ev->>'startsAt','')::timestamptz at time zone zone)::date);
  start_time:=coalesce(s.time,(nullif(ev->>'startsAt','')::timestamptz at time zone zone)::time);
  if day is null or start_time is null then raise exception 'Training date and start time are required'; end if;
  start_at:=(day+start_time) at time zone zone;
  finish_time:=(nullif(ev->>'endsAt','')::timestamptz at time zone zone)::time;
  finish_at:=case when finish_time is not null then (day+finish_time) at time zone zone end;
  if finish_at<=start_at then finish_at:=null; end if;
  ev:=ev||jsonb_build_object('startsAt',start_at,'endsAt',finish_at,
   'venueName',coalesce(nullif(s.place,''),ev->>'venueName'),
   'venueAddress',coalesce(nullif(s.address,''),ev->>'venueAddress'),
   'status',case when s.status in ('cancelled','postponed') then 'cancelled' else 'published' end);
  update public.solidarity_updates set body_en=ev::text,is_public=true where id=u;
 elsif p_source='studio' then
  start_at:=nullif(ev->>'startsAt','')::timestamptz;
  insert into public.rb_commons_sessions(scope,date,time,place,address,status,note)
  values('karen-training',(start_at at time zone zone)::date,(start_at at time zone zone)::time,
   coalesce(ev->>'venueName',''),coalesce(ev->>'venueAddress',''),
   case when ev->>'status' in ('published','completed') then 'scheduled' else 'cancelled' end,
   'Training details updated by organizers.')
  on conflict(scope) do update set date=excluded.date,time=excluded.time,place=excluded.place,address=excluded.address,status=excluded.status,note=excluded.note,version=rb_commons_sessions.version+1,updated_at=now();
 else raise exception 'invalid_sync_source'; end if;
 update public.solidarity_campaigns set updated_at=now() where id=c;
end $$;
revoke all on function public.rb_sync_training_details(text) from public,anon,authenticated;
do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('public.rb_commons_admin(text,jsonb)'::regprocedure);
 if position('rb_sync_training_details' in definition)=0 then
  if position('elsif a=''confirm_idea'' then' in definition)=0 then raise exception 'commons_patch_anchor_missing'; end if;
  definition:=replace(definition,'if a=''session'' then','if a=''session'' then if scope_id=''karen-training'' then perform 1 from public.solidarity_campaigns where is_active for update; end if;');
  definition:=replace(definition,'elsif a=''confirm_idea'' then','if scope_id=''karen-training'' then perform public.rb_sync_training_details(''session''); end if; elsif a=''confirm_idea'' then');
  execute definition;
 end if;
 definition:=pg_get_functiondef('public.karen_admin_action(text,jsonb)'::regprocedure);
 if position('rb_sync_training_details' in definition)=0 then
  if position('return jsonb_build_object(''ok'',true,''id'',v_record_id);' in definition)=0 then raise exception 'studio_patch_anchor_missing'; end if;
  definition:=replace(definition,'return jsonb_build_object(''ok'',true,''id'',v_record_id);','if v_slug=''training-functional-garage-0211-karen'' then perform public.rb_sync_training_details(''studio''); end if; return jsonb_build_object(''ok'',true,''id'',v_record_id);');
  execute definition;
 end if;
end $patch$;

