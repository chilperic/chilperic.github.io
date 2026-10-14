CREATE OR REPLACE FUNCTION public.rb_contact_admin(p_credential text, p_action jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.rb_contact_member(p_thread_id uuid, p_token text, p_action jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.rb_poll_admin(p_credential text, p_action text DEFAULT 'read'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ctx jsonb; v_closed boolean;
begin
 v_ctx:=public.solidarity_credential_context(p_credential);
 if coalesce(v_ctx->>'role','') not in ('owner','organizer') then raise exception 'Organizer access required' using errcode='42501'; end if;
 if p_action not in ('read','close') or p_action is null then raise exception 'Unknown action'; end if;
 if p_action='close' then update public.rb_poll_state set closed=true,closed_at=coalesce(closed_at,now()) where id=true; end if;
 select closed into v_closed from public.rb_poll_state where id=true;
 return jsonb_build_object('closed',v_closed,'people',coalesce((select jsonb_agg(jsonb_build_object('name',case when not i.private_name or v_closed then i.voter_name else null end,'public_id',i.public_id,'private',i.private_name,'dates',v.selected_dates) order by i.updated_at) from public.rb_poll_identities i join public.rb_powerpoint_votes v using(voter_id) where cardinality(v.selected_dates)>0),'[]'::jsonb));
end $function$;

CREATE OR REPLACE FUNCTION public.rb_poll_public()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('closed',(select closed from public.rb_poll_state where id=true),'people',coalesce((select jsonb_agg(jsonb_build_object('label',case when i.private_name then i.public_id else i.voter_name end,'private',i.private_name,'dates',v.selected_dates) order by i.updated_at) from public.rb_poll_identities i join public.rb_powerpoint_votes v using(voter_id) where cardinality(v.selected_dates)>0),'[]'::jsonb))
$function$;

CREATE OR REPLACE FUNCTION public.rb_poll_vote(p_voter_id uuid, p_token text, p_name text, p_private boolean, p_dates date[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_closed boolean; v_hash text; v_public text; v_dates date[]; allowed constant date[]:=array['2026-11-06','2026-11-07','2026-11-13','2026-11-14','2026-11-20','2026-11-21','2026-11-27','2026-11-28']::date[];
begin
 select closed into v_closed from public.rb_poll_state where id=true for share;
 if v_closed then raise exception 'Poll closed'; end if;
 if p_voter_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' or p_name is null or length(btrim(p_name)) not between 1 and 40 or p_private is null then raise exception 'Name and secure vote access required'; end if;
 if coalesce(cardinality(p_dates),0)>8 or exists(select 1 from unnest(p_dates)d where d is null or not(d=any(allowed))) then raise exception 'Invalid dates'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_voter_id::text));
 select token_hash into v_hash from public.rb_poll_identities where voter_id=p_voter_id;
 if found and v_hash<>encode(extensions.digest(p_token,'sha256'),'hex') then raise exception 'Vote access denied' using errcode='28000'; end if;
 select coalesce(array_agg(distinct d order by d),'{}'::date[]) into v_dates from unnest(p_dates)d;
 insert into public.rb_powerpoint_votes(voter_id,selected_dates) values(p_voter_id,v_dates) on conflict(voter_id) do update set selected_dates=excluded.selected_dates,updated_at=now();
 insert into public.rb_poll_identities(voter_id,token_hash,voter_name,private_name) values(p_voter_id,encode(extensions.digest(p_token,'sha256'),'hex'),btrim(p_name),p_private)
 on conflict(voter_id) do update set voter_name=excluded.voter_name,private_name=excluded.private_name,updated_at=now() returning public_id into v_public;
 return jsonb_build_object('public_id',v_public);
end $function$;

