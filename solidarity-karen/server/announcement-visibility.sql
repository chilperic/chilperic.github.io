alter table public.solidarity_campaigns add column if not exists show_karen_announcement boolean not null default false;

create or replace function public.rb_announcement_visibility(
 p_credential text,p_campaign_id uuid,p_visible boolean,p_expected_visible boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; c public.solidarity_campaigns%rowtype;
begin
 ctx:=public.solidarity_credential_context(p_credential);
 if coalesce(ctx->>'role','') not in ('owner','organizer') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_visible is null or p_expected_visible is null then raise exception 'invalid_visibility'; end if;
 select * into c from public.solidarity_campaigns where id=p_campaign_id and is_active for update;
 if not found then raise exception 'campaign_changed' using errcode='40001'; end if;
 if c.show_karen_announcement is distinct from p_expected_visible then raise exception 'visibility_conflict' using errcode='40001'; end if;
 update public.solidarity_campaigns set show_karen_announcement=p_visible,updated_at=now()
 where id=c.id and show_karen_announcement is distinct from p_visible;
 return jsonb_build_object('ok',true,'visible',p_visible,'updatedAt',(select updated_at from public.solidarity_campaigns where id=c.id));
end $$;
revoke all on function public.rb_announcement_visibility(text,uuid,boolean,boolean) from public;
grant execute on function public.rb_announcement_visibility(text,uuid,boolean,boolean) to anon,authenticated;

do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('public.karen_public_state()'::regprocedure);
 if position('showKarenAnnouncement' in definition)=0 then
  if position('''status'',v_campaign.status' in definition)=0 then raise exception 'public_state_patch_anchor_missing'; end if;
  definition:=replace(definition,'''status'',v_campaign.status','''showKarenAnnouncement'',v_campaign.show_karen_announcement,''status'',v_campaign.status');
  execute definition;
 end if;
end $patch$;

