-- Requires the existing Red Banner community schema and pgcrypto in extensions.
create table if not exists public.rb_push_devices (
 id uuid primary key, token_hash text not null, subscription jsonb,
 preferences jsonb not null default '{"official":true,"replies":true,"events":[],"quietStart":22,"quietEnd":8,"language":"en"}',
 phone text,pending_phone text,pending_expires timestamptz,
 sms boolean not null default false,whatsapp boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check ((not sms and not whatsapp) or phone is not null)
);
create unique index if not exists rb_push_endpoint on public.rb_push_devices ((subscription->>'endpoint')) where subscription is not null;
create table if not exists public.rb_push_threads(device_id uuid references public.rb_push_devices on delete cascade,thread_id uuid references public.rb_contact_threads on delete cascade,primary key(device_id,thread_id));
create table if not exists public.rb_push_jobs(id uuid primary key default gen_random_uuid(),device_id uuid not null references public.rb_push_devices on delete cascade,event_key text not null,kind text not null,event_id text,channel text not null default 'push',status text not null default 'pending',attempts int not null default 0,available_at timestamptz not null default now(),created_at timestamptz not null default now(),last_error text,unique(device_id,event_key,channel));
create index if not exists rb_push_pending on public.rb_push_jobs(status,available_at);
create table if not exists public.rb_push_limits(key text primary key,count int not null,expires_at timestamptz not null);
create table if not exists public.rb_push_config(id boolean primary key check(id),vapid jsonb not null,worker_token text not null);
alter table public.rb_push_devices enable row level security;
alter table public.rb_push_threads enable row level security;
alter table public.rb_push_jobs enable row level security;
alter table public.rb_push_limits enable row level security;
alter table public.rb_push_config enable row level security;
revoke all on public.rb_push_devices,public.rb_push_threads,public.rb_push_jobs,public.rb_push_limits,public.rb_push_config from public,anon,authenticated;
grant all on public.rb_push_devices,public.rb_push_threads,public.rb_push_jobs,public.rb_push_limits,public.rb_push_config to service_role;
-- Apply functions.sql next, then permissions.sql and schedule.sql.
