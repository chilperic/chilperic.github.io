revoke all on function public.rb_push_limit(text,integer),public.rb_push_bind_thread(uuid,uuid,text),public.rb_push_claim(),public.rb_push_enqueue() from public,anon,authenticated;
grant execute on function public.rb_push_limit(text,integer),public.rb_push_bind_thread(uuid,uuid,text),public.rb_push_claim() to service_role;
drop trigger if exists rb_push_notice on public.rb_official_notices;
create trigger rb_push_notice after insert or update on public.rb_official_notices for each row execute function public.rb_push_enqueue();
drop trigger if exists rb_push_reply on public.rb_contact_messages;
create trigger rb_push_reply after insert on public.rb_contact_messages for each row execute function public.rb_push_enqueue();
drop trigger if exists rb_push_event on public.rb_community_posts;
create trigger rb_push_event after insert on public.rb_community_posts for each row execute function public.rb_push_enqueue();
