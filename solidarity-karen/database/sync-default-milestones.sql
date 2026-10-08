-- Default halfway/goal markers follow target changes; custom thresholds are preserved.
create or replace function public.solidarity_track_target_change()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.target_cents is distinct from old.target_cents then
    new.previous_target_cents := old.target_cents;
    new.target_updated_at := now();
    update public.solidarity_milestones
      set threshold_cents = new.target_cents
      where campaign_id = new.id and label_en = 'Goal reached' and threshold_cents = old.target_cents;
    update public.solidarity_milestones
      set threshold_cents = greatest(1,round(new.target_cents / 2.0)::integer)
      where campaign_id = new.id and label_en = 'Halfway there' and threshold_cents = round(old.target_cents / 2.0)::integer;
  else
    new.previous_target_cents := old.previous_target_cents;
    new.target_updated_at := old.target_updated_at;
  end if;
  return new;
end
$fn$;
revoke all on function public.solidarity_track_target_change() from public,anon,authenticated;
update public.solidarity_milestones m set threshold_cents=c.target_cents
from public.solidarity_campaigns c where m.campaign_id=c.id and m.label_en='Goal reached'
and m.threshold_cents=c.previous_target_cents;
update public.solidarity_milestones m set threshold_cents=greatest(1,round(c.target_cents/2.0)::integer)
from public.solidarity_campaigns c where m.campaign_id=c.id and m.label_en='Halfway there'
and m.threshold_cents=round(c.previous_target_cents/2.0)::integer;
