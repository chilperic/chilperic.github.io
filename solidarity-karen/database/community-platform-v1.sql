-- Shared community features for The Red Banner Is Raised.
-- Public-link participation is intentional; keep personal or sensitive details out of posts.

create table if not exists public.rb_community_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('note', 'event-proposal', 'event-update', 'brunch-suggestion')),
  display_name text not null default 'Community member' check (char_length(display_name) <= 40),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now()
);

create index if not exists rb_community_posts_created_at_idx
  on public.rb_community_posts (created_at desc);

alter table public.rb_community_posts enable row level security;
drop policy if exists rb_community_posts_public_read on public.rb_community_posts;
create policy rb_community_posts_public_read
  on public.rb_community_posts for select to anon, authenticated using (true);
drop policy if exists rb_community_posts_public_insert on public.rb_community_posts;
create policy rb_community_posts_public_insert
  on public.rb_community_posts for insert to anon, authenticated
  with check (
    kind in ('note', 'event-proposal', 'event-update', 'brunch-suggestion')
    and char_length(btrim(body)) between 1 and 500
    and char_length(display_name) <= 40
    and jsonb_typeof(metadata) = 'object'
    and pg_column_size(metadata) <= 4096
  );
revoke all on public.rb_community_posts from public, anon, authenticated;
grant select on public.rb_community_posts to anon, authenticated;
grant insert (kind, display_name, body, metadata) on public.rb_community_posts to anon, authenticated;

create table if not exists public.rb_brunch_items (
  id uuid primary key default gen_random_uuid(),
  item text not null check (char_length(btrim(item)) between 1 and 80),
  display_name text not null default '' check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);

create index if not exists rb_brunch_items_created_at_idx
  on public.rb_brunch_items (created_at asc);

alter table public.rb_brunch_items enable row level security;
drop policy if exists rb_brunch_items_public_read on public.rb_brunch_items;
create policy rb_brunch_items_public_read
  on public.rb_brunch_items for select to anon, authenticated using (true);
drop policy if exists rb_brunch_items_public_insert on public.rb_brunch_items;
create policy rb_brunch_items_public_insert
  on public.rb_brunch_items for insert to anon, authenticated
  with check (
    char_length(btrim(item)) between 1 and 80
    and char_length(display_name) <= 40
  );
revoke all on public.rb_brunch_items from public, anon, authenticated;
grant select on public.rb_brunch_items to anon, authenticated;
grant insert (item, display_name) on public.rb_brunch_items to anon, authenticated;

-- Anonymous vote identities are random, device-local UUIDs. The table itself is not
-- readable or writable through PostgREST; only the narrow aggregate/cast functions are exposed.
create table if not exists public.rb_powerpoint_votes (
  voter_id uuid primary key,
  selected_dates date[] not null default '{}'::date[],
  updated_at timestamptz not null default now(),
  check (cardinality(selected_dates) <= 8)
);
alter table public.rb_powerpoint_votes enable row level security;
revoke all on public.rb_powerpoint_votes from public, anon, authenticated;

create or replace function public.rb_cast_powerpoint_vote(p_voter_id uuid, p_selected_dates date[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_dates constant date[] := array[
    date '2026-11-06', date '2026-11-07', date '2026-11-13', date '2026-11-14',
    date '2026-11-20', date '2026-11-21', date '2026-11-27', date '2026-11-28'
  ];
  clean_dates date[];
begin
  if p_voter_id is null then
    raise exception 'A voter ID is required';
  end if;
  if coalesce(cardinality(p_selected_dates), 0) > 8 then
    raise exception 'Too many poll options';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_selected_dates, '{}'::date[])) as picked(day)
    where not (picked.day = any (allowed_dates))
  ) then
    raise exception 'The poll includes an unavailable date';
  end if;
  select coalesce(array_agg(distinct picked.day order by picked.day), '{}'::date[])
    into clean_dates
    from unnest(coalesce(p_selected_dates, '{}'::date[])) as picked(day);
  insert into public.rb_powerpoint_votes (voter_id, selected_dates, updated_at)
  values (p_voter_id, clean_dates, now())
  on conflict (voter_id) do update
    set selected_dates = excluded.selected_dates, updated_at = now();
end;
$$;

create or replace function public.rb_powerpoint_results()
returns table(option_date date, vote_count bigint, total_voters bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with options(option_date) as (
    values
      (date '2026-11-06'), (date '2026-11-07'),
      (date '2026-11-13'), (date '2026-11-14'),
      (date '2026-11-20'), (date '2026-11-21'),
      (date '2026-11-27'), (date '2026-11-28')
  ), totals(total_voters) as (
    select count(*)::bigint
    from public.rb_powerpoint_votes
    where cardinality(selected_dates) > 0
  )
  select o.option_date, count(v.voter_id)::bigint, t.total_voters
  from options o
  cross join totals t
  left join public.rb_powerpoint_votes v on o.option_date = any(v.selected_dates)
  group by o.option_date, t.total_voters
  order by o.option_date;
$$;

create table if not exists public.rb_event_interest (
  event_slug text not null,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_slug, voter_id),
  check (event_slug in ('karting-2026-10-24'))
);
alter table public.rb_event_interest enable row level security;
revoke all on public.rb_event_interest from public, anon, authenticated;

create or replace function public.rb_add_event_interest(p_event_slug text, p_voter_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare result_count bigint;
begin
  if p_event_slug <> 'karting-2026-10-24' or p_voter_id is null then
    raise exception 'Invalid event interest request';
  end if;
  insert into public.rb_event_interest (event_slug, voter_id)
  values (p_event_slug, p_voter_id)
  on conflict do nothing;
  select count(*)::bigint into result_count
  from public.rb_event_interest where event_slug = p_event_slug;
  return result_count;
end;
$$;

create or replace function public.rb_event_interest_count(p_event_slug text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.rb_event_interest
  where event_slug = p_event_slug
    and p_event_slug = 'karting-2026-10-24';
$$;

revoke all on function public.rb_cast_powerpoint_vote(uuid, date[]) from public;
revoke all on function public.rb_powerpoint_results() from public;
revoke all on function public.rb_add_event_interest(text, uuid) from public;
revoke all on function public.rb_event_interest_count(text) from public;
grant execute on function public.rb_cast_powerpoint_vote(uuid, date[]) to anon, authenticated;
grant execute on function public.rb_powerpoint_results() to anon, authenticated;
grant execute on function public.rb_add_event_interest(text, uuid) to anon, authenticated;
grant execute on function public.rb_event_interest_count(text) to anon, authenticated;
