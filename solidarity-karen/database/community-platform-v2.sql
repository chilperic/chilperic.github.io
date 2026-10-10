-- Private organizer conversations, event attendance, and monthly brunch sessions.
-- Message access is checked by a random capability token or the existing organizer credential.
create table if not exists public.rb_contact_threads (
 id uuid primary key, access_hash text not null, client_id uuid not null,
 display_name text not null default '' check(length(display_name)<=40),
 subject text not null check(length(btrim(subject)) between 1 and 120),
 topic text not null check(topic in ('general','event','fund','access')),
 status text not null default 'open' check(status in ('open','answered','resolved')),
 admin_unread boolean not null default true, member_unread boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists rb_contact_threads_updated_idx on public.rb_contact_threads(updated_at desc);
create index if not exists rb_contact_threads_client_idx on public.rb_contact_threads(client_id,created_at desc);
create table if not exists public.rb_contact_messages (
 id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.rb_contact_threads(id) on delete cascade,
 sender text not null check(sender in ('member','organizer')), body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists rb_contact_messages_thread_idx on public.rb_contact_messages(thread_id,created_at);
alter table public.rb_contact_threads enable row level security;
alter table public.rb_contact_messages enable row level security;
revoke all on public.rb_contact_threads,public.rb_contact_messages from public,anon,authenticated;

create or replace function public.rb_contact_member(p_thread_id uuid,p_token text,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_thread public.rb_contact_threads; v_kind text:=p_action->>'action'; v_client uuid; v_body text:=btrim(coalesce(p_action->>'body','')); v_count integer;
begin
 if p_thread_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid conversation access' using errcode='28000'; end if;
 if v_kind='create' and not exists(select 1 from public.rb_contact_threads where id=p_thread_id) then
  v_client:=(p_action->>'client_id')::uuid;
  if v_client is null or length(v_body) not between 1 and 2000 then raise exception 'A message is required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_client::text));
  select count(*) into v_count from public.rb_contact_threads where client_id=v_client and created_at>now()-interval '1 hour';
  if v_count>=6 then raise exception 'Please wait before starting another conversation'; end if;
  insert into public.rb_contact_threads(id,access_hash,client_id,display_name,subject,topic)
   values(p_thread_id,encode(extensions.digest(p_token,'sha256'),'hex'),v_client,btrim(coalesce(p_action->>'name','')),btrim(p_action->>'subject'),p_action->>'topic');
  insert into public.rb_contact_messages(thread_id,sender,body) values(p_thread_id,'member',v_body);
 elsif v_kind not in ('create','read','send') or v_kind is null then raise exception 'Unknown action'; end if;
 select * into v_thread from public.rb_contact_threads where id=p_thread_id and access_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found then raise exception 'Conversation unavailable' using errcode='28000'; end if;
 if v_kind='send' then
  if length(v_body) not between 1 and 2000 then raise exception 'Write a message of 1–2000 characters'; end if;
  select count(*) into v_count from public.rb_contact_messages where thread_id=p_thread_id and sender='member' and created_at>now()-interval '1 hour';
  if v_count>=60 then raise exception 'Please wait before sending more messages'; end if;
  insert into public.rb_contact_messages(thread_id,sender,body) values(p_thread_id,'member',v_body);
  update public.rb_contact_threads set status='open',admin_unread=true,updated_at=now() where id=p_thread_id;
 end if;
 update public.rb_contact_threads set member_unread=false where id=p_thread_id;
 return jsonb_build_object('thread',(select jsonb_build_object('id',id,'subject',subject,'topic',topic,'status',status,'created_at',created_at,'updated_at',updated_at) from public.rb_contact_threads where id=p_thread_id),'messages',coalesce((select jsonb_agg(jsonb_build_object('id',id,'sender',sender,'body',body,'created_at',created_at) order by created_at,id) from public.rb_contact_messages where thread_id=p_thread_id),'[]'::jsonb));
end $$;
revoke all on function public.rb_contact_member(uuid,text,jsonb) from public;
grant execute on function public.rb_contact_member(uuid,text,jsonb) to anon,authenticated;

create or replace function public.rb_contact_admin(p_credential text,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_context jsonb; v_id uuid; v_kind text:=p_action->>'action'; v_body text:=btrim(coalesce(p_action->>'body',''));
begin
 v_context:=public.solidarity_credential_context(p_credential);
 if coalesce(v_context->>'role','') not in ('owner','organizer') then raise exception 'Organizer access required' using errcode='42501'; end if;
 if v_kind='list' then
  return jsonb_build_object('unread',(select count(*) from public.rb_contact_threads where admin_unread),'threads',coalesce((select jsonb_agg(row_to_json(t) order by t.updated_at desc) from (select id,display_name,subject,topic,status,admin_unread,created_at,updated_at from public.rb_contact_threads order by updated_at desc limit 200)t),'[]'::jsonb));
 end if;
 v_id:=(p_action->>'thread_id')::uuid;
 perform 1 from public.rb_contact_threads where id=v_id for update;
 if not found then raise exception 'Conversation unavailable'; end if;
 if v_kind='reply' then
  if length(v_body) not between 1 and 2000 then raise exception 'Write a reply of 1–2000 characters'; end if;
  insert into public.rb_contact_messages(thread_id,sender,body) values(v_id,'organizer',v_body);
  update public.rb_contact_threads set status='answered',member_unread=true,updated_at=now() where id=v_id;
 elsif v_kind='resolve' then update public.rb_contact_threads set status='resolved',updated_at=now() where id=v_id;
 elsif v_kind<>'read' or v_kind is null then raise exception 'Unknown action'; end if;
 update public.rb_contact_threads set admin_unread=false where id=v_id;
 return jsonb_build_object('thread',(select jsonb_build_object('id',id,'name',display_name,'subject',subject,'topic',topic,'status',status,'created_at',created_at) from public.rb_contact_threads where id=v_id),'messages',coalesce((select jsonb_agg(jsonb_build_object('id',id,'sender',sender,'body',body,'created_at',created_at) order by created_at,id) from public.rb_contact_messages where thread_id=v_id),'[]'::jsonb));
end $$;
revoke all on function public.rb_contact_admin(text,jsonb) from public;
grant execute on function public.rb_contact_admin(text,jsonb) to anon,authenticated;

create table if not exists public.rb_event_rsvps (
 event_id text not null check(length(event_id)<=100), device_id uuid not null,
 response text not null check(response in ('going','maybe','not_going')), updated_at timestamptz not null default now(),
 primary key(event_id,device_id)
);
alter table public.rb_event_rsvps enable row level security;
revoke all on public.rb_event_rsvps from public,anon,authenticated;
insert into public.rb_event_rsvps(event_id,device_id,response)
 select 'karting',voter_id,'maybe' from public.rb_event_interest where event_slug='karting-2026-10-24' on conflict do nothing;
create or replace function public.rb_event_respond(p_event_id text,p_device_id uuid,p_response text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_device_id is null or p_event_id is null or not (p_event_id in ('karen-training','karting') or p_event_id ~ '^brunch-[0-9]{4}-[0-9]{2}-[0-9]{2}$' or exists(select 1 from public.rb_community_posts where kind='event-proposal' and id::text=p_event_id)) then raise exception 'Unknown event'; end if;
 if p_response is null or p_response not in ('going','maybe','not_going','remove') then raise exception 'Invalid attendance choice'; end if;
 if p_response='remove' then delete from public.rb_event_rsvps where event_id=p_event_id and device_id=p_device_id;
 else insert into public.rb_event_rsvps(event_id,device_id,response) values(p_event_id,p_device_id,p_response) on conflict(event_id,device_id) do update set response=excluded.response,updated_at=now(); end if;
end $$;
create or replace function public.rb_event_attendance(p_device_id uuid)
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(q),'[]'::jsonb) from (select event_id,count(*) filter(where response='going') as going,count(*) filter(where response='maybe') as maybe,max(response) filter(where device_id=p_device_id) as mine from public.rb_event_rsvps group by event_id)q
$$;
revoke all on function public.rb_event_respond(text,uuid,text),public.rb_event_attendance(uuid) from public;
grant execute on function public.rb_event_respond(text,uuid,text),public.rb_event_attendance(uuid) to anon,authenticated;

alter table public.rb_brunch_items add column if not exists session_date date not null default date '2026-11-07';
alter table public.rb_brunch_items add column if not exists device_id uuid;
revoke select on public.rb_brunch_items from anon,authenticated;
grant select(id,item,display_name,created_at,session_date) on public.rb_brunch_items to anon,authenticated;
create index if not exists rb_brunch_session_idx on public.rb_brunch_items(session_date,created_at);
create or replace function public.rb_brunch_session(p_date date,p_device_id uuid,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_device_id is null or p_date is null or extract(dow from p_date)<>6 or extract(day from p_date)>7 then raise exception 'Choose a first-Saturday brunch'; end if;
 if p_action->>'action'='add' then
  insert into public.rb_brunch_items(item,display_name,session_date,device_id) values(btrim(p_action->>'item'),btrim(coalesce(p_action->>'name','')),p_date,p_device_id);
 elsif p_action->>'action'='remove' then
  delete from public.rb_brunch_items where id=(p_action->>'id')::uuid and device_id=p_device_id and session_date=p_date;
 elsif coalesce(p_action->>'action','')<>'list' then raise exception 'Unknown action'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'item',item,'name',display_name,'mine',device_id=p_device_id) order by created_at) from public.rb_brunch_items where session_date=p_date),'[]'::jsonb);
end $$;
revoke all on function public.rb_brunch_session(date,uuid,jsonb) from public;
grant execute on function public.rb_brunch_session(date,uuid,jsonb) to anon,authenticated;
