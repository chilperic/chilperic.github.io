create or replace function public.rb_push_claim() returns setof public.rb_push_jobs language sql set search_path='' as $$
update public.rb_push_jobs set status='sending',available_at=now()+interval '5 minutes',attempts=attempts+1
where id in(select id from public.rb_push_jobs where status in ('pending','sending') and available_at<=now() and attempts<4 order by created_at for update skip locked limit 5) returning *;
$$;
create or replace function public.rb_push_tick() returns bigint language plpgsql security definer set search_path='' as $$
declare token text; request_id bigint;
begin
select worker_token into token from public.rb_push_config where id;
if token is null or not exists(select 1 from public.rb_push_jobs where status in ('pending','sending') and available_at<=now() and attempts<4) then return null; end if;
select net.http_post(url:='https://btygzxeyesnaxljfciqv.supabase.co/functions/v1/red-banner-notifications',headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',token),body:='{}'::jsonb,timeout_milliseconds:=80000) into request_id;
return request_id;
end;$$;
revoke all on function public.rb_push_tick() from public,anon,authenticated;
select cron.schedule('red-banner-push-delivery','*/2 * * * *','select public.rb_push_tick();');
