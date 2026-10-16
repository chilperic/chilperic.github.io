-- Capability-authenticated deadline editing; preserves all other campaign settings.
create or replace function public.rb_campaign_deadline(
 p_credential text, p_campaign_id uuid, p_end_date text, p_expected_end_date text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_context jsonb;
 v_campaign public.solidarity_campaigns%rowtype;
 v_date date;
begin
 v_context := public.solidarity_credential_context(p_credential);
 if coalesce(v_context->>'role','') not in ('owner','organizer') then
  raise exception 'forbidden' using errcode='42501';
 end if;
 if p_end_date is null or p_end_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  raise exception 'invalid_deadline' using errcode='22023';
 end if;
 begin v_date := p_end_date::date;
 exception when others then raise exception 'invalid_deadline' using errcode='22023'; end;
 if v_date < date '2000-01-01' or v_date > date '2100-12-31' then
  raise exception 'invalid_deadline' using errcode='22023';
 end if;
 select * into v_campaign from public.solidarity_campaigns where id=p_campaign_id and is_active for update;
 if not found then raise exception 'campaign_changed' using errcode='40001'; end if;
 if v_campaign.end_date::text is distinct from nullif(p_expected_end_date,'') then
  raise exception 'deadline_conflict' using errcode='40001';
 end if;
 if v_campaign.start_date is not null and v_date < v_campaign.start_date then
  raise exception 'deadline_before_start' using errcode='22023';
 end if;
 update public.solidarity_campaigns set end_date=v_date,updated_at=now()
 where id=v_campaign.id and end_date is distinct from v_date;
 return jsonb_build_object('ok',true,'campaignId',v_campaign.id,'endDate',v_date,
  'status',v_campaign.status);
end
$$;
revoke all on function public.rb_campaign_deadline(text,uuid,text,text) from public;
grant execute on function public.rb_campaign_deadline(text,uuid,text,text) to anon,authenticated;
