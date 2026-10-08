alter table public.solidarity_campaigns
  add column if not exists previous_target_cents integer,
  add column if not exists target_updated_at timestamptz;

-- Recover the most recent target change from the existing audit trail.
with history as (
  select entity_id,created_at,(details->>'target_cents')::integer as target,
    lag((details->>'target_cents')::integer) over (partition by entity_id order by created_at,id) as previous
  from public.solidarity_audit
  where entity_type='solidarity_campaigns' and details->>'target_cents' ~ '^[0-9]+$'
), changes as (
  select distinct on (entity_id) entity_id,target,previous,created_at
  from history where previous is not null and previous<>target
  order by entity_id,created_at desc
)
update public.solidarity_campaigns c set previous_target_cents=h.previous,target_updated_at=h.created_at
from changes h where c.id::text=h.entity_id and c.target_cents=h.target and c.target_updated_at is null;

create or replace function public.solidarity_track_target_change()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.target_cents is distinct from old.target_cents then
    new.previous_target_cents := old.target_cents;
    new.target_updated_at := now();
  else
    new.previous_target_cents := old.previous_target_cents;
    new.target_updated_at := old.target_updated_at;
  end if;
  return new;
end
$fn$;
revoke all on function public.solidarity_track_target_change() from public,anon,authenticated;
drop trigger if exists track_target_change on public.solidarity_campaigns;
create trigger track_target_change before update on public.solidarity_campaigns
for each row execute function public.solidarity_track_target_change();

-- Extend existing RPCs in place, preserving their authorization and grants.
do $migration$
declare definition text; old_block text; new_block text;
begin
  select pg_get_functiondef('public.karen_public_state()'::regprocedure) into definition;
  if position('previousTargetCents' in definition)=0 then
    if position('''targetCents'',v_campaign.target_cents,''currency'',v_campaign.currency' in definition)=0 then
      raise exception 'Unexpected public state definition';
    end if;
    definition:=replace(definition,
      '''targetCents'',v_campaign.target_cents,''currency'',v_campaign.currency',
      '''targetCents'',v_campaign.target_cents,''previousTargetCents'',v_campaign.previous_target_cents,''targetUpdatedAt'',v_campaign.target_updated_at,''currency'',v_campaign.currency');
    execute definition;
  end if;

  select pg_get_functiondef('public.karen_admin_action(text,jsonb)'::regprocedure) into definition;
  old_block:=$old$    v_target:=(p_action->>'target_cents')::integer;
    if v_target<=0 then raise exception 'invalid_target'; end if;
    update public.solidarity_campaigns set target_cents=v_target,updated_at=now() where id=v_campaign_id;
    update public.karen_fund_settings set target_cents=v_target,updated_at=now() where singleton=true;
    return jsonb_build_object('ok',true);$old$;
  new_block:=$new$    if v_campaign_id is null then raise exception 'campaign_not_found'; end if;
    if jsonb_typeof(p_action->'target_cents') is distinct from 'number'
      or coalesce(p_action->>'target_cents','') !~ '^[0-9]+$'
      or (p_action->>'target_cents')::numeric not between 1 and 2147483647 then
      raise exception 'invalid_target' using errcode='22023';
    end if;
    v_target:=(p_action->>'target_cents')::integer;
    perform 1 from public.solidarity_campaigns where id=v_campaign_id for update;
    if p_action ? 'expected_target_cents' and (p_action->>'expected_target_cents')::integer
       is distinct from (select target_cents from public.solidarity_campaigns where id=v_campaign_id) then
      raise exception 'target_conflict' using errcode='40001';
    end if;
    update public.solidarity_campaigns set target_cents=v_target,updated_at=now()
      where id=v_campaign_id and target_cents is distinct from v_target;
    update public.karen_fund_settings set target_cents=v_target,updated_at=now()
      where singleton=true and target_cents is distinct from v_target;
    return (select jsonb_build_object('ok',true,'targetCents',target_cents,
      'previousTargetCents',previous_target_cents,'targetUpdatedAt',target_updated_at)
      from public.solidarity_campaigns where id=v_campaign_id);$new$;
  if position(old_block in definition)=0 then raise exception 'Unexpected target action definition'; end if;
  execute replace(definition,old_block,new_block);
end
$migration$;
