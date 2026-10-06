-- Preserve the campaign ledger and apply the organizer's confirmed programme.
update public.solidarity_campaigns set end_date='2026-10-22',updated_at=now()
where slug='karen-solidarity';
update public.solidarity_updates u
set body_en=(u.body_en::jsonb || jsonb_build_object(
 'status','published','startsAt','2026-10-17T09:30:00.000Z',
 'endsAt','2026-10-17T11:30:00.000Z','timeZone','Europe/Berlin',
 'venueName','Functional Garage 0211',
 'venueAddress','In der Hött 8b, 40223 Düsseldorf, Germany',
 'fundraising',true,'showOnCampaign',true,
 'title',(u.body_en::jsonb->'title')||jsonb_build_object(
  'es','Entrenamiento solidario para Karen','it','Allenamento solidale per Karen',
  'pt','Treino solidário para Karen','nl','Solidariteitstraining voor Karen','ar','تدريب تضامني من أجل كارين'),
 'description',(u.body_en::jsonb->'description')||jsonb_build_object(
  'es','Entrenamiento colectivo en apoyo a Karen. Aporta lo que puedas: esta sesión convierte el entrenamiento en apoyo material directo.',
  'it','Allenamento collettivo a sostegno di Karen. Contribuisci quanto puoi: la sessione trasforma l’allenamento in sostegno materiale diretto.',
  'pt','Treino coletivo em apoio a Karen. Contribui com o que puderes: a sessão transforma o treino em apoio material direto.',
  'nl','Samen trainen ter ondersteuning van Karen. Geef wat je kunt: deze sessie maakt van training directe materiële steun.',
  'ar','تدريب جماعي لدعم كارين. ساهم بما تستطيع: تحول هذه الجلسة التدريب إلى دعم مادي مباشر.')
 ))::text,is_public=true
where title_en='__EVENT__:training-functional-garage-0211-karen'
 and campaign_id=(select id from public.solidarity_campaigns where slug='karen-solidarity');

-- A valid named session can choose a permanent password. Revoke earlier sessions
-- and return a replacement session atomically so the user keeps access.
create or replace function public.solidarity_organizer_change_password(p_token text,p_new_secret_digest text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $function$
declare v_ctx jsonb; v_digest text:=lower(coalesce(p_new_secret_digest,''));
begin
 v_ctx:=public.solidarity_credential_context(p_token);
 if coalesce((v_ctx->>'breakGlass')::boolean,true) or v_ctx->>'accountId' is null then
  raise exception 'named_account_required' using errcode='42501';
 end if;
 if v_digest!~'^[0-9a-f]{64}$' then raise exception 'invalid_secret'; end if;
 update public.solidarity_organizer_accounts
 set secret_hash=crypt(v_digest,gen_salt('bf',12)),updated_at=now()
 where id=(v_ctx->>'accountId')::uuid and active=true;
 update public.solidarity_organizer_sessions set revoked_at=now()
 where account_id=(v_ctx->>'accountId')::uuid and revoked_at is null;
 return public.solidarity_organizer_login(v_ctx->>'username',v_digest);
end
$function$;
revoke all on function public.solidarity_organizer_change_password(text,text) from public;
grant execute on function public.solidarity_organizer_change_password(text,text) to anon,authenticated;
