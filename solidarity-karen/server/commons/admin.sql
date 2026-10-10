create function public.rb_commons_admin(p_credential text,p_action jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; role_name text; a text:=coalesce(p_action->>'action','read'); scope_id text:=coalesce(p_action->>'scope',''); e public.rb_commons_entries; template_row public.rb_commons_templates; s public.rb_commons_sessions; item jsonb; actor uuid; eid text;
begin
 ctx:=public.solidarity_credential_context(p_credential);role_name:=coalesce(ctx->>'role','');
 if role_name not in ('owner','organizer','editor','reader','auditor','developer','treasurer') then raise exception 'Organizer access required' using errcode='42501';end if;
 if a<>'read' and role_name not in ('owner','organizer','editor') then raise exception 'Editing is not allowed for this role' using errcode='42501';end if;
 if a='session' then
  if length(scope_id) not between 1 and 100 or length(coalesce(p_action->>'place',''))>200 or length(coalesce(p_action->>'address',''))>300 or length(coalesce(p_action->>'note','')) not between 1 and 2000 or coalesce(p_action->>'status','') not in ('scheduled','changed','cancelled','postponed') then raise exception 'Check event details and write an update';end if;
  insert into public.rb_commons_sessions(scope,date,time,place,address,status,note) values(scope_id,nullif(p_action->>'date','')::date,nullif(p_action->>'time','')::time,coalesce(p_action->>'place',''),coalesce(p_action->>'address',''),p_action->>'status',p_action->>'note') on conflict(scope) do update set date=excluded.date,time=excluded.time,place=excluded.place,address=excluded.address,status=excluded.status,note=excluded.note,version=rb_commons_sessions.version+1,updated_at=now() returning * into s;
  insert into public.rb_community_posts(kind,display_name,body,metadata) values('event-update','Organizers',left(s.note,500),jsonb_build_object('event_id',s.scope,'date',s.date,'time',s.time,'status',s.status,'official',true));
 elsif a='confirm_idea' then
  select * into e from public.rb_commons_entries where id=(p_action->>'id')::uuid and kind='idea' and status<>'deleted' for update;if not found then raise exception 'Idea unavailable';end if;
  if (p_action->>'date') is null then raise exception 'Choose a date';end if;
  if jsonb_array_length(coalesce(e.data->'dates','[]'))>0 and not(e.data->'dates' ? (p_action->>'date')) then raise exception 'Choose one of the polled dates';end if;
  perform (p_action->>'date')::date;perform nullif(p_action->>'time','')::time;
  update public.rb_commons_entries set status='closed',data=data||jsonb_build_object('confirmedDate',p_action->>'date','confirmedTime',coalesce(p_action->>'time','')),version=version+1,updated_at=now() where id=e.id;
  if not exists(select 1 from public.rb_community_posts where id=e.id) then insert into public.rb_community_posts(id,kind,display_name,body,metadata) values(e.id,'event-proposal','Organizers',left(coalesce(nullif(e.body,''),e.title),500),jsonb_build_object('title',e.title,'description',e.body,'date',p_action->>'date','time',p_action->>'time','place',coalesce(p_action->>'place','Place to be confirmed'),'category',coalesce(e.data->>'category','social')));end if;
  insert into public.rb_commons_sessions(scope,date,time,place,status,note) values(e.id::text,(p_action->>'date')::date,nullif(p_action->>'time','')::time,coalesce(p_action->>'place','Place to be confirmed'),'scheduled','The collective’s plan is confirmed.') on conflict(scope) do update set date=excluded.date,time=excluded.time,place=excluded.place,status='scheduled',version=rb_commons_sessions.version+1,note=excluded.note,updated_at=now();
  insert into public.rb_community_posts(kind,display_name,body,metadata) values('event-update','Organizers','The collective’s plan is confirmed.',jsonb_build_object('event_id',e.id,'date',p_action->>'date','time',p_action->>'time','status','scheduled','official',true));
 elsif a='rank' then
  if (p_action->>'rank')::int not between 1 and 200 then raise exception 'Choose a position from 1 to 200';end if;
  update public.rb_commons_entries set data=data||jsonb_build_object('rank',(p_action->>'rank')::int),version=version+1,updated_at=now() where id=(p_action->>'id')::uuid and kind='topic';if not found then raise exception 'Topic unavailable';end if;
 elsif a='moderate' then
  if coalesce(p_action->>'status','') not in ('open','closed','deleted') then raise exception 'Invalid status';end if;
  update public.rb_commons_entries set status=p_action->>'status',version=version+1,updated_at=now() where id=(p_action->>'id')::uuid;
 elsif a='save_template' then
  if length(btrim(coalesce(p_action->>'name',''))) not between 1 and 80 then raise exception 'Name this template';end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'title',title,'body',body,'data',data)),'[]') into item from public.rb_commons_entries where scope=scope_id and kind in ('need','task') and status='open';
  if jsonb_array_length(item)=0 then raise exception 'Add needs or tasks before saving a template';end if;
  insert into public.rb_commons_templates(name,items) values(btrim(p_action->>'name'),item);
 elsif a='apply_template' then
  actor:=(p_action->>'member')::uuid;if not exists(select 1 from public.rb_commons_members where id=actor) then raise exception 'Register a community profile first';end if;
  select * into template_row from public.rb_commons_templates where id=(p_action->>'id')::uuid;if not found then raise exception 'Template unavailable';end if;
  if length(scope_id) not between 1 and 100 then raise exception 'Choose an event';end if;
  for item in select * from jsonb_array_elements(template_row.items) loop
   if not exists(select 1 from public.rb_commons_entries where scope=scope_id and kind=item->>'kind' and title=item->>'title' and status<>'deleted') then insert into public.rb_commons_entries(scope,kind,owner_id,title,body,data) values(scope_id,item->>'kind',actor,item->>'title',item->>'body',item->'data');end if;
  end loop;
 elsif a<>'read' then raise exception 'Unknown organizer action';end if;
 return jsonb_build_object('canEdit',role_name in ('owner','organizer','editor'),'templates',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.rb_commons_templates),'[]'),'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',coalesce(metadata->>'title',body))) from public.rb_community_posts where kind='event-proposal'),'[]'),'sessions',coalesce((select jsonb_agg(to_jsonb(x)) from public.rb_commons_sessions x),'[]'),'ideas',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'data',data,'status',status)) from public.rb_commons_entries where kind='idea' and status<>'deleted'),'[]'),'topics',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'data',data)) from public.rb_commons_entries where kind='topic' and status<>'deleted'),'[]'),'closedPolls',case when role_name in('owner','organizer') then coalesce((select jsonb_agg(jsonb_build_object('title',src.title,'name',m.name,'dates',v.dates,'private',v.private)) from public.rb_commons_votes v join public.rb_commons_entries src on src.id=v.entry_id join public.rb_commons_members m on m.id=v.member_id where src.status='closed'),'[]') else '[]'::jsonb end);
end;$$;
revoke all on function public.rb_commons_admin(text,jsonb) from public;
grant execute on function public.rb_commons_admin(text,jsonb) to anon,authenticated;
