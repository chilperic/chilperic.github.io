-- Capability-authenticated community workflows. Raw tables are not client-readable.
create table public.rb_commons_members(id uuid primary key,token_hash text not null,name text not null check(length(name) between 1 and 60),created_at timestamptz not null default now());
create table public.rb_commons_entries(id uuid primary key default gen_random_uuid(),scope text not null check(length(scope) between 1 and 100),kind text not null check(kind in ('bring','need','task','aid','journey','topic','idea','recipe','memory')),owner_id uuid not null references public.rb_commons_members,title text not null check(length(title) between 1 and 120),body text not null default '' check(length(body)<=2000),data jsonb not null default '{}',status text not null default 'open' check(status in ('open','closed','deleted')),version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index rb_commons_scope on public.rb_commons_entries(scope,kind,status,created_at desc);
create index rb_commons_owner on public.rb_commons_entries(owner_id);
create table public.rb_commons_claims(entry_id uuid references public.rb_commons_entries on delete cascade,member_id uuid references public.rb_commons_members,quantity int not null check(quantity between 1 and 500),primary key(entry_id,member_id));
create index rb_commons_claim_member on public.rb_commons_claims(member_id);
create table public.rb_commons_votes(entry_id uuid references public.rb_commons_entries on delete cascade,member_id uuid references public.rb_commons_members,dates jsonb not null default '[]',private boolean not null default false,primary key(entry_id,member_id));
create index rb_commons_vote_member on public.rb_commons_votes(member_id);
create table public.rb_commons_sessions(scope text primary key check(length(scope) between 1 and 100),date date,time time,place text not null default '',address text not null default '',status text not null default 'scheduled' check(status in ('scheduled','changed','cancelled','postponed')),note text not null default '',version int not null default 1,updated_at timestamptz not null default now());
create table public.rb_commons_ack(scope text references public.rb_commons_sessions,member_id uuid references public.rb_commons_members,version int not null,primary key(scope,member_id));
create index rb_commons_ack_member on public.rb_commons_ack(member_id);
create table public.rb_commons_threads(id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.rb_commons_entries,initiator uuid not null references public.rb_commons_members,recipient uuid not null references public.rb_commons_members,updated_at timestamptz not null default now(),unique(entry_id,initiator));
create index rb_commons_recipient on public.rb_commons_threads(recipient,updated_at desc);
create table public.rb_commons_messages(id uuid primary key default gen_random_uuid(),thread_id uuid not null references public.rb_commons_threads on delete cascade,sender uuid not null references public.rb_commons_members,body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now());
create index rb_commons_thread_messages on public.rb_commons_messages(thread_id,created_at);
create index rb_commons_message_sender on public.rb_commons_messages(sender);
create table public.rb_commons_templates(id uuid primary key default gen_random_uuid(),name text not null,items jsonb not null,created_at timestamptz not null default now());
alter table public.rb_commons_members enable row level security;
alter table public.rb_commons_entries enable row level security;
alter table public.rb_commons_claims enable row level security;
alter table public.rb_commons_votes enable row level security;
alter table public.rb_commons_sessions enable row level security;
alter table public.rb_commons_ack enable row level security;
alter table public.rb_commons_threads enable row level security;
alter table public.rb_commons_messages enable row level security;
alter table public.rb_commons_templates enable row level security;
revoke all on public.rb_commons_members,public.rb_commons_entries,public.rb_commons_claims,public.rb_commons_votes,public.rb_commons_sessions,public.rb_commons_ack,public.rb_commons_threads,public.rb_commons_messages,public.rb_commons_templates from public,anon,authenticated;

create function public.rb_commons(p_member uuid default null,p_token text default null,p_action jsonb default '{"action":"list"}') returns jsonb language plpgsql security definer set search_path='' as $$
declare a text:=coalesce(p_action->>'action','list'); scope_id text:=coalesce(p_action->>'scope','commons'); e public.rb_commons_entries; d jsonb:=coalesce(p_action->'data','{}'); q int; ident uuid; th public.rb_commons_threads; can_identify boolean:=false; result jsonb; v_name text; row_version int;
begin
 if p_member is not null then
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Device access required' using errcode='42501';end if;
  select name into v_name from public.rb_commons_members where id=p_member and token_hash=encode(extensions.digest(p_token,'sha256'),'hex');can_identify:=found;
  if not can_identify and a='register' then
   if exists(select 1 from public.rb_commons_members where id=p_member) then raise exception 'Device access denied' using errcode='42501';end if;
   if not public.rb_push_limit('commons:registration',100) then raise exception 'Please try again later';end if;
   v_name:=btrim(coalesce(p_action->>'name',''));if length(v_name) not between 1 and 60 then raise exception 'Enter a display name';end if;
   insert into public.rb_commons_members(id,token_hash,name) values(p_member,encode(extensions.digest(p_token,'sha256'),'hex'),v_name);can_identify:=true;
  elsif not can_identify then raise exception 'Device access denied' using errcode='42501';end if;
 end if;
 if a='register' then if not can_identify then raise exception 'Device access required';end if;return jsonb_build_object('saved',true);end if;
 if length(scope_id) not between 1 and 100 then raise exception 'Invalid event';end if;
 if a not in ('list','sessions') and not can_identify then raise exception 'Device access required' using errcode='42501';end if;
 if a not in ('list','sessions','inbox','thread') and not public.rb_push_limit('commons:'||p_member,120) then raise exception 'Too many changes. Please try later';end if;
 if a='sessions' then return coalesce((select jsonb_agg(to_jsonb(s)) from public.rb_commons_sessions s),'[]');end if;
 if a='profile' then
  v_name:=btrim(coalesce(p_action->>'name',''));if length(v_name) not between 1 and 60 then raise exception 'Enter a display name';end if;
  update public.rb_commons_members set name=v_name where id=p_member;return jsonb_build_object('saved',true);
 end if;
 if a in ('save','status','claim','vote') then
  if p_action->>'id' is not null then select * into e from public.rb_commons_entries where id=(p_action->>'id')::uuid for update;if not found then raise exception 'Entry no longer available';end if;scope_id:=e.scope;end if;
 end if;
 if a='save' then
  if e.id is not null and (e.owner_id<>p_member or e.version is distinct from (p_action->>'version')::int) then raise exception 'Entry changed or editing is not permitted. Refresh before editing';end if;
  if e.id is not null and e.status='deleted' then raise exception 'Restore the entry before editing';end if;
  if length(btrim(coalesce(p_action->>'title',''))) not between 1 and 120 or length(coalesce(p_action->>'body',''))>2000 or jsonb_typeof(d)<>'object' or length(d::text)>210000 then raise exception 'Check the title and entry length';end if;
  if coalesce(p_action->>'kind','') not in ('bring','need','task','aid','journey','topic','idea','recipe','memory') then raise exception 'Unknown entry type';end if;
  if e.id is not null and e.kind<>p_action->>'kind' then raise exception 'Entry type cannot change';end if;
  if p_action->>'kind' in ('bring','need','task','journey') then
   q:=coalesce((d->>'quantity')::int,1);if q not between 1 and 500 then raise exception 'Quantity must be between 1 and 500';end if;
   if e.id is not null and q<(select coalesce(sum(quantity),0) from public.rb_commons_claims where entry_id=e.id) then raise exception 'Quantity is below existing commitments';end if;
   if length(coalesce(d->>'unit',''))>30 or length(coalesce(d->>'allergens',''))>300 then raise exception 'Details too long';end if;
  end if;
  if p_action->>'kind'='topic' and coalesce((d->>'minutes')::int,10) not between 3 and 120 then raise exception 'Choose 3–120 minutes';end if;
  if p_action->>'kind'='idea' then
   if jsonb_typeof(coalesce(d->'dates','[]'))<>'array' or jsonb_array_length(coalesce(d->'dates','[]'))>12 then raise exception 'Choose up to 12 dates';end if;
   if exists(select 1 from jsonb_array_elements_text(coalesce(d->'dates','[]')) x where x !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid poll date';end if;
   if e.id is not null and jsonb_array_length(coalesce(e.data->'dates','[]'))>0 and coalesce(e.data->'dates','[]')<>coalesce(d->'dates','[]') and exists(select 1 from public.rb_commons_votes where entry_id=e.id) then raise exception 'Dates cannot change after voting starts';end if;
  end if;
  if d ? 'photo' and (p_action->>'kind'<>'memory' or coalesce((d->>'photoConsent')::boolean,false) is not true or d->>'photo' !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' or length(d->>'photo')>200000) then raise exception 'Photo requires consent and a small JPEG';end if;
  -- Programme order and confirmed event data are organizer-managed.
  d:=d-'rank'-'confirmedDate'-'confirmedTime';if e.id is not null then d:=d||jsonb_strip_nulls(jsonb_build_object('rank',e.data->'rank','confirmedDate',e.data->'confirmedDate','confirmedTime',e.data->'confirmedTime'));end if;
  if e.id is null then
   if (select count(*) from public.rb_commons_entries where owner_id=p_member and created_at>now()-interval '1 day')>=50 then raise exception 'Daily posting limit reached';end if;
   insert into public.rb_commons_entries(scope,kind,owner_id,title,body,data) values(scope_id,p_action->>'kind',p_member,btrim(p_action->>'title'),coalesce(p_action->>'body',''),d) returning id into ident;
  else update public.rb_commons_entries set title=btrim(p_action->>'title'),body=coalesce(p_action->>'body',''),data=d,version=version+1,updated_at=now() where id=e.id;ident:=e.id;end if;
 elsif a='status' then
  if e.id is null or e.owner_id<>p_member or e.version is distinct from (p_action->>'version')::int then raise exception 'Entry changed or editing is not permitted';end if;
  if coalesce(p_action->>'status','') not in ('open','closed','deleted') then raise exception 'Invalid status';end if;
  update public.rb_commons_entries set status=p_action->>'status',version=version+1,updated_at=now() where id=e.id;
 elsif a='claim' then
  q:=coalesce((p_action->>'quantity')::int,0);if q not between 0 and 500 then raise exception 'Invalid quantity';end if;
  if e.id is null or e.kind not in ('need','task','journey') then raise exception 'This entry has no spaces to claim';end if;
  if q=0 then delete from public.rb_commons_claims where entry_id=e.id and member_id=p_member;
  else
   if e.status<>'open' or exists(select 1 from public.rb_commons_sessions where scope=e.scope and status in ('cancelled','postponed')) then raise exception 'This entry or event is closed';end if;
   if q+(select coalesce(sum(quantity),0) from public.rb_commons_claims where entry_id=e.id and member_id<>p_member)>coalesce((e.data->>'quantity')::int,1) then raise exception 'Not enough spaces remain. Refresh the list';end if;
   insert into public.rb_commons_claims values(e.id,p_member,q) on conflict(entry_id,member_id) do update set quantity=excluded.quantity;
  end if;
 elsif a='vote' then
  if e.id is null or e.kind<>'idea' or e.status<>'open' then raise exception 'This poll is closed';end if;
  d:=coalesce(p_action->'dates','[]');if jsonb_typeof(d)<>'array' or jsonb_array_length(d)>12 or exists(select 1 from jsonb_array_elements_text(d) x where not coalesce(e.data->'dates','[]') ? x) then raise exception 'Choose dates from this poll';end if;
  if coalesce(p_action->>'withdraw','false')='true' then delete from public.rb_commons_votes where entry_id=e.id and member_id=p_member;
  else insert into public.rb_commons_votes values(e.id,p_member,d,coalesce((p_action->>'private')::boolean,false)) on conflict(entry_id,member_id) do update set dates=excluded.dates,private=excluded.private;end if;
 elsif a='ack' then
  select version into row_version from public.rb_commons_sessions where scope=scope_id;if not found or row_version is distinct from (p_action->>'version')::int then raise exception 'Update changed. Please read the latest version';end if;
  insert into public.rb_commons_ack values(scope_id,p_member,row_version) on conflict(scope,member_id) do update set version=excluded.version;
 elsif a in ('message','thread') then
  if a='message' then
   if length(btrim(coalesce(p_action->>'body',''))) not between 1 and 2000 then raise exception 'Write a message of 1–2000 characters';end if;
   if p_action->>'thread' is null then
    select * into e from public.rb_commons_entries where id=(p_action->>'id')::uuid and status<>'deleted';if not found or e.owner_id=p_member then raise exception 'Choose another member’s entry';end if;
    insert into public.rb_commons_threads(entry_id,initiator,recipient) values(e.id,p_member,e.owner_id) on conflict(entry_id,initiator) do update set updated_at=now() returning * into th;
   else select * into th from public.rb_commons_threads where id=(p_action->>'thread')::uuid;end if;
  else select * into th from public.rb_commons_threads where id=(p_action->>'thread')::uuid;end if;
  if th.id is null or p_member not in (th.initiator,th.recipient) then raise exception 'Private conversation access denied' using errcode='42501';end if;
  if a='message' then insert into public.rb_commons_messages(thread_id,sender,body) values(th.id,p_member,btrim(p_action->>'body'));update public.rb_commons_threads set updated_at=now() where id=th.id;end if;
  return jsonb_build_object('id',th.id,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,'mine',m.sender=p_member,'name',n.name,'created_at',m.created_at) order by m.created_at) from public.rb_commons_messages m join public.rb_commons_members n on n.id=m.sender where thread_id=th.id),'[]'));
 elsif a='inbox' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'updated_at',x.updated_at,'name',x.name) order by x.updated_at desc) from(select ct.id,src.title,ct.updated_at,m.name from public.rb_commons_threads ct join public.rb_commons_entries src on src.id=ct.entry_id join public.rb_commons_members m on m.id=case when ct.initiator=p_member then ct.recipient else ct.initiator end where p_member in(ct.initiator,ct.recipient) order by ct.updated_at desc limit 100)x),'[]');
 elsif a<>'list' then raise exception 'Unknown action';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'scope',x.scope,'kind',x.kind,'title',x.title,'body',x.body,'data',x.data,'status',x.status,'version',x.version,'name',x.name,'mine',x.owner_id=p_member,'created_at',x.created_at,
 'claims',coalesce((select jsonb_agg(jsonb_build_object('name',m.name,'quantity',c.quantity,'mine',c.member_id=p_member)) from public.rb_commons_claims c join public.rb_commons_members m on m.id=c.member_id where c.entry_id=x.id),'[]'),
 'votes',coalesce((select jsonb_agg(jsonb_build_object('name',case when v.private and not coalesce(v.member_id=p_member or (x.owner_id=p_member and x.status='closed'),false) then 'Comrade '||substr(md5(v.member_id::text||x.id::text),1,6) else m.name end,'private',v.private,'dates',v.dates,'mine',v.member_id=p_member)) from public.rb_commons_votes v join public.rb_commons_members m on m.id=v.member_id where v.entry_id=x.id),'[]')) order by x.created_at desc),'[]') into result from(select src.*,m.name from public.rb_commons_entries src join public.rb_commons_members m on m.id=src.owner_id where src.scope=scope_id and src.status<>'deleted' order by src.created_at desc limit 150)x;
 return jsonb_build_object('entries',result,'savedId',ident,'session',(select to_jsonb(s)||jsonb_build_object('acknowledged',exists(select 1 from public.rb_commons_ack ack where ack.scope=s.scope and ack.member_id=p_member and ack.version=s.version)) from public.rb_commons_sessions s where s.scope=scope_id));
end;$$;
revoke all on function public.rb_commons(uuid,text,jsonb) from public;
grant execute on function public.rb_commons(uuid,text,jsonb) to anon,authenticated;
