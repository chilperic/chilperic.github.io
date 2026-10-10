-- Named-by-default voting with explicit public-name privacy and post-close organizer disclosure.
create table if not exists public.rb_poll_state (id boolean primary key default true check(id), closed boolean not null default false, closed_at timestamptz);
insert into public.rb_poll_state(id) values(true) on conflict do nothing;
create table if not exists public.rb_poll_identities (
 voter_id uuid primary key references public.rb_powerpoint_votes(voter_id),
 token_hash text not null, voter_name text not null check(length(btrim(voter_name)) between 1 and 40),
 private_name boolean not null default false,
 public_id text not null unique default ('RB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 updated_at timestamptz not null default now()
);
alter table public.rb_poll_state enable row level security;
alter table public.rb_poll_identities enable row level security;
revoke all on public.rb_poll_state,public.rb_poll_identities from public,anon,authenticated;

create or replace function public.rb_poll_vote(p_voter_id uuid,p_token text,p_name text,p_private boolean,p_dates date[])
returns jsonb language plpgsql security definer set search_path='' as $$
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
end $$;

create or replace function public.rb_poll_public()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('closed',(select closed from public.rb_poll_state where id=true),'people',coalesce((select jsonb_agg(jsonb_build_object('label',case when i.private_name then i.public_id else i.voter_name end,'private',i.private_name,'dates',v.selected_dates) order by i.updated_at) from public.rb_poll_identities i join public.rb_powerpoint_votes v using(voter_id) where cardinality(v.selected_dates)>0),'[]'::jsonb))
$$;
create or replace function public.rb_poll_admin(p_credential text,p_action text default 'read')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ctx jsonb; v_closed boolean;
begin
 v_ctx:=public.solidarity_credential_context(p_credential);
 if coalesce(v_ctx->>'role','') not in ('owner','organizer') then raise exception 'Organizer access required' using errcode='42501'; end if;
 if p_action not in ('read','close') or p_action is null then raise exception 'Unknown action'; end if;
 if p_action='close' then update public.rb_poll_state set closed=true,closed_at=coalesce(closed_at,now()) where id=true; end if;
 select closed into v_closed from public.rb_poll_state where id=true;
 return jsonb_build_object('closed',v_closed,'people',coalesce((select jsonb_agg(jsonb_build_object('name',case when not i.private_name or v_closed then i.voter_name else null end,'public_id',i.public_id,'private',i.private_name,'dates',v.selected_dates) order by i.updated_at) from public.rb_poll_identities i join public.rb_powerpoint_votes v using(voter_id) where cardinality(v.selected_dates)>0),'[]'::jsonb));
end $$;
-- Preserve older clients while preventing them from modifying enrolled identities or a closed poll.
create or replace function public.rb_cast_powerpoint_vote(p_voter_id uuid,p_selected_dates date[])
returns void language plpgsql security definer set search_path='' as $$
declare v_closed boolean; v_dates date[]; allowed constant date[]:=array['2026-11-06','2026-11-07','2026-11-13','2026-11-14','2026-11-20','2026-11-21','2026-11-27','2026-11-28']::date[];
begin
 select closed into v_closed from public.rb_poll_state where id=true for share;
 if v_closed then raise exception 'Poll closed'; end if;
 if p_voter_id is null then raise exception 'Voter ID required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_voter_id::text));
 if exists(select 1 from public.rb_poll_identities where voter_id=p_voter_id) then raise exception 'Use the current voting form'; end if;
 if coalesce(cardinality(p_selected_dates),0)>8 or exists(select 1 from unnest(p_selected_dates)d where d is null or not(d=any(allowed))) then raise exception 'Invalid dates'; end if;
 select coalesce(array_agg(distinct d order by d),'{}'::date[]) into v_dates from unnest(p_selected_dates)d;
 insert into public.rb_powerpoint_votes(voter_id,selected_dates) values(p_voter_id,v_dates) on conflict(voter_id) do update set selected_dates=excluded.selected_dates,updated_at=now();
end $$;
revoke all on function public.rb_poll_vote(uuid,text,text,boolean,date[]),public.rb_poll_public(),public.rb_poll_admin(text,text) from public;
grant execute on function public.rb_poll_vote(uuid,text,text,boolean,date[]),public.rb_poll_public(),public.rb_poll_admin(text,text) to anon,authenticated;
