CREATE OR REPLACE FUNCTION public.rb_push_bind_thread(p_device uuid, p_thread uuid, p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if not exists(select 1 from public.rb_contact_threads where id=p_thread and access_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then raise exception 'Unauthorized';end if;
 insert into public.rb_push_threads values(p_device,p_thread) on conflict do nothing;
end;$function$

CREATE OR REPLACE FUNCTION public.rb_push_claim()
 RETURNS SETOF rb_push_jobs
 LANGUAGE sql
 SET search_path TO ''
AS $function$ update public.rb_push_jobs set status='sending',available_at=now()+interval '5 minutes',attempts=attempts+1 where id in(select id from public.rb_push_jobs where status in ('pending','sending') and available_at<=now() and attempts<4 order by created_at for update skip locked limit 5) returning *; $function$

CREATE OR REPLACE FUNCTION public.rb_push_enqueue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare row_data jsonb:=to_jsonb(new);k text;ek text;event_id text;target_thread uuid;
begin
 if tg_table_name='rb_official_notices' then k:='official';ek:='notice:'||(row_data->>'id')||':'||(row_data->>'updated_at');
 elsif tg_table_name='rb_contact_messages' then if row_data->>'sender'<>'organizer' then return new;end if;k:='reply';ek:='reply:'||(row_data->>'id');target_thread:=(row_data->>'thread_id')::uuid;
 else if row_data->>'kind'<>'event-update' then return new;end if;k:='event';ek:='event:'||(row_data->>'id');event_id:=row_data->'metadata'->>'event_id';end if;
 insert into public.rb_push_jobs(device_id,event_key,kind,event_id,channel)
 select d.id,ek,k,event_id,c.channel from public.rb_push_devices d cross join lateral(values('push',d.subscription is not null),('sms',d.sms),('whatsapp',d.whatsapp)) c(channel,enabled)
 where c.enabled and (select count(*) from public.rb_push_jobs j where j.device_id=d.id and j.created_at>now()-interval '1 hour')<30 and d.updated_at>now()-interval '180 days' and (
 (k='official' and coalesce((d.preferences->>'official')::boolean,true)) or
 (k='reply' and coalesce((d.preferences->>'replies')::boolean,true) and exists(select 1 from public.rb_push_threads t where t.device_id=d.id and t.thread_id=target_thread)) or
 (k='event' and (d.preferences->'events') ? event_id)) on conflict do nothing;
 return new;
end;$function$

CREATE OR REPLACE FUNCTION public.rb_push_limit(p_key text, p_max integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n int;
begin
 insert into public.rb_push_limits(key,count,expires_at) values(p_key,1,now()+interval '1 hour')
 on conflict(key) do update set count=case when rb_push_limits.expires_at<now() then 1 else rb_push_limits.count+1 end,expires_at=case when rb_push_limits.expires_at<now() then now()+interval '1 hour' else rb_push_limits.expires_at end returning count into n;
 return n<=p_max;
end;$function$

