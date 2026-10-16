create or replace function public.rb_organizer_edit(p_credential text,p_campaign_id uuid,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; c public.solidarity_campaigns%rowtype; d date; u public.solidarity_updates%rowtype;
begin
 ctx:=public.solidarity_credential_context(p_credential);
 if coalesce(ctx->>'role','') not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
 select * into c from public.solidarity_campaigns where id=p_campaign_id and is_active for update;
 if not found then raise exception 'campaign_changed' using errcode='40001'; end if;
 if p_action->>'action'='campaign' then
  if nullif(p_action->>'expected_updated_at','')::timestamptz is distinct from c.updated_at then raise exception 'campaign_conflict' using errcode='40001'; end if;
  if nullif(trim(p_action->>'title'),'') is null then raise exception 'title_required'; end if;
  if length(p_action->>'title')>200 then raise exception 'title_too_long'; end if;
  if p_action->>'status' not in ('draft','active','goal_reached','closed','archived') then raise exception 'invalid_status'; end if;
  if nullif(p_action->>'payment_url','') is null or p_action->>'payment_url' !~ '^https://[^[:space:]/?#]+[^[:space:]]*$' then raise exception 'https_payment_url_required'; end if;
  if nullif(p_action->>'start_date','') is not null then
   if p_action->>'start_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid_start_date'; end if;
   d:=(p_action->>'start_date')::date;
   if d<date '2000-01-01' or d>date '2100-12-31' or (c.end_date is not null and d>c.end_date) then raise exception 'invalid_start_date'; end if;
  end if;
  perform public.karen_admin_action(p_credential,jsonb_set(p_action,'{action}','"update_campaign"'::jsonb));
  update public.solidarity_campaigns set start_date=d,updated_at=now() where id=c.id;
 elsif p_action->>'action'='milestone' then
  if nullif(trim(p_action->>'label_en'),'') is null or coalesce((p_action->>'threshold_cents')::integer,0)<=0 then raise exception 'invalid_milestone'; end if;
  update public.solidarity_milestones set label_en=left(trim(p_action->>'label_en'),160),label_fr=left(p_action->>'label_fr',160),threshold_cents=(p_action->>'threshold_cents')::integer,sort_order=coalesce((p_action->>'sort_order')::integer,0)
   where id=(p_action->>'id')::uuid and campaign_id=c.id;
  if not found then raise exception 'milestone_not_found'; end if;
 elsif p_action->>'action'='update' then
  select * into u from public.solidarity_updates where id=(p_action->>'id')::uuid and campaign_id=c.id for update;
  if not found or u.title_en like '__EVENT__:%' then raise exception 'update_not_found'; end if;
  if nullif(trim(p_action->>'title_en'),'') is null or p_action->>'title_en' like '__EVENT__:%' then raise exception 'invalid_update_title'; end if;
  update public.solidarity_updates set title_en=left(trim(p_action->>'title_en'),200),title_fr=left(p_action->>'title_fr',200),body_en=left(p_action->>'body_en',3000),body_fr=left(p_action->>'body_fr',3000),is_public=coalesce((p_action->>'is_public')::boolean,true) where id=u.id;
 else raise exception 'unknown_action'; end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.rb_organizer_edit(text,uuid,jsonb) from public;
grant execute on function public.rb_organizer_edit(text,uuid,jsonb) to anon,authenticated;

