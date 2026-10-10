alter table public.rb_push_devices add column if not exists commons_member uuid references public.rb_commons_members;
create index if not exists rb_push_commons_member on public.rb_push_devices(commons_member);
alter table public.rb_push_jobs add column if not exists event_start timestamptz;
alter table public.rb_push_jobs add column if not exists reminder_minutes int;
create function public.rb_commons_link_push(p_member uuid,p_token text,p_device uuid,p_device_token text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.rb_commons_members where id=p_member and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then raise exception 'Member access denied' using errcode='42501';end if;
 update public.rb_push_devices set commons_member=p_member where id=p_device and token_hash=encode(extensions.digest(p_device_token,'sha256'),'hex');if not found then raise exception 'Device access denied' using errcode='42501';end if;return true;
end;$$;
revoke all on function public.rb_commons_link_push(uuid,text,uuid,text) from public;
grant execute on function public.rb_commons_link_push(uuid,text,uuid,text) to anon,authenticated;
create function public.rb_commons_reply_notify() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 select case when t.initiator=new.sender then t.recipient else t.initiator end into target from public.rb_commons_threads t where id=new.thread_id;
 insert into public.rb_push_jobs(device_id,event_key,kind,channel)
 select d.id,'peer:'||new.id,'peer',c.channel from public.rb_push_devices d cross join lateral(values('push',d.subscription is not null),('sms',d.sms),('whatsapp',d.whatsapp)) c(channel,enabled)
 where d.commons_member=target and c.enabled and coalesce((d.preferences->>'replies')::boolean,true) and d.updated_at>now()-interval '180 days' and (select count(*) from public.rb_push_jobs j where j.device_id=d.id and j.created_at>now()-interval '1 hour')<30 on conflict do nothing;
 return new;
end;$$;
revoke all on function public.rb_commons_reply_notify() from public,anon,authenticated;
create trigger rb_commons_peer_push after insert on public.rb_commons_messages for each row execute function public.rb_commons_reply_notify();
create function public.rb_push_timing() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb; due timestamp;
begin
 select preferences into p from public.rb_push_devices where id=new.device_id;
 if p->>'deliveryMode'='daily' and new.kind not in ('test','reminder','digest') then
  due:=date_trunc('day',now() at time zone 'Europe/Berlin')+interval '18 hours';if due<=now() at time zone 'Europe/Berlin' then due:=due+interval '1 day';end if;
  new.available_at:=due at time zone 'Europe/Berlin';
 end if;return new;
end;$$;
revoke all on function public.rb_push_timing() from public,anon,authenticated;
create trigger rb_push_daily_timing before insert on public.rb_push_jobs for each row execute function public.rb_push_timing();
create or replace function public.rb_push_claim() returns setof public.rb_push_jobs language plpgsql set search_path='' as $$
declare j public.rb_push_jobs; p jsonb; key text;
begin
 for j in select * from public.rb_push_jobs where status in('pending','sending') and available_at<=now() and attempts<4 order by created_at for update skip locked limit 5 loop
  select preferences into p from public.rb_push_devices where id=j.device_id;
  if (j.kind='official' and p->>'official'='false') or (j.kind in('reply','peer') and p->>'replies'='false') or (j.kind='event' and not coalesce(p->'events','[]') ? j.event_id) then
   update public.rb_push_jobs set status='cancelled' where id=j.id;
  elsif p->>'deliveryMode'='daily' and j.kind not in('test','reminder','digest') then
   key:='digest:'||to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD');
   insert into public.rb_push_jobs(device_id,event_key,kind,channel) values(j.device_id,key,'digest',j.channel) on conflict do nothing;
   update public.rb_push_jobs set status='bundled' where id=j.id;
  else
   update public.rb_push_jobs set status='sending',available_at=now()+interval '5 minutes',attempts=attempts+1 where id=j.id returning * into j;
   return next j;
  end if;
 end loop;
end;$$;
create function public.rb_commons_reschedule_reminders() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('cancelled','postponed') or new.date is null or new.time is null then
  update public.rb_push_jobs set status='cancelled' where event_id=new.scope and kind='reminder' and status='pending';
 else
  update public.rb_push_jobs set event_start=(new.date+new.time) at time zone 'Europe/Berlin',available_at=greatest(now(),((new.date+new.time) at time zone 'Europe/Berlin')-make_interval(mins=>reminder_minutes)) where event_id=new.scope and kind='reminder' and status='pending';
 end if;return new;
end;$$;
revoke all on function public.rb_commons_reschedule_reminders() from public,anon,authenticated;
create trigger rb_commons_reminder_update after insert or update on public.rb_commons_sessions for each row execute function public.rb_commons_reschedule_reminders();
