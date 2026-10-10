-- Scoped community roles. New roles deliberately receive no legacy finance/inbox access.
alter table public.solidarity_organizer_accounts drop constraint solidarity_organizer_accounts_role_check;
alter table public.solidarity_organizer_accounts add constraint solidarity_organizer_accounts_role_check check(role in ('owner','organizer','treasurer','auditor','reader','editor','developer'));
create table if not exists public.rb_official_notices (
 id uuid primary key default gen_random_uuid(),title text not null check(length(btrim(title)) between 1 and 120),
 body text not null check(length(btrim(body)) between 1 and 2000),updated_at timestamptz not null default now()
);
alter table public.rb_official_notices enable row level security;
revoke all on public.rb_official_notices from public,anon,authenticated;
grant select on public.rb_official_notices to anon,authenticated;
create policy rb_official_notices_public_read on public.rb_official_notices for select to anon,authenticated using(true);
create or replace function public.rb_role_workspace(p_credential text,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; r text; perms text[]:=array['notice.read']; notices jsonb; kind text:=p_action->>'action';
begin
 ctx:=public.solidarity_credential_context(p_credential);r:=ctx->>'role';
 if r is null or r not in ('owner','organizer','treasurer','auditor','reader','editor','developer') then raise exception 'Role denied' using errcode='42501'; end if;
 if r in ('owner','organizer','editor') then perms:=array_append(perms,'notice.edit');end if;
 if r in ('owner','developer') then perms:=array_append(perms,'features.read');end if;
 if kind='save_notice' then
  if not('notice.edit'=any(perms)) then raise exception 'Editing denied' using errcode='42501';end if;
  if p_action->>'id' is null then insert into public.rb_official_notices(title,body) values(btrim(p_action->>'title'),btrim(p_action->>'body'));
  else update public.rb_official_notices set title=btrim(p_action->>'title'),body=btrim(p_action->>'body'),updated_at=now() where id=(p_action->>'id')::uuid;if not found then raise exception 'Notice not found';end if;end if;
 elsif kind is distinct from 'read' then raise exception 'Unknown action';end if;
 select coalesce(jsonb_agg(row_to_json(n) order by updated_at desc),'[]'::jsonb) into notices from(select id,title,body,updated_at from public.rb_official_notices order by updated_at desc limit 100)n;
 return jsonb_build_object('rolesVersion',4,'permissions',perms,'notices',notices,'features',case when 'features.read'=any(perms) then jsonb_build_object('privateInbox',to_regclass('public.rb_contact_threads') is not null,'identityPoll',to_regclass('public.rb_poll_identities') is not null,'roleWorkspaces',true) else null end);
end $$;
revoke all on function public.rb_role_workspace(text,jsonb) from public;
grant execute on function public.rb_role_workspace(text,jsonb) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.solidarity_organizer_accounts_action(p_owner_credential text, p_action jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_ctx jsonb;
  v_action text:=coalesce(p_action->>'action','');
  v_id uuid;
  v_rows jsonb;
  v_digest text;
  v_role text;
begin
  v_ctx:=public.solidarity_require_roles(p_owner_credential,array['owner']);

  if v_action='list' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,'username',a.username,'displayName',a.display_name,
      'role',a.role,'active',a.active,'createdAt',a.created_at,
      'sessionCount',(select count(*) from public.solidarity_organizer_sessions s where s.account_id=a.id and s.revoked_at is null and s.expires_at>now())
    ) order by a.created_at),'[]'::jsonb)
    into v_rows
    from public.solidarity_organizer_accounts a;

    return jsonb_build_object('ok',true,'accounts',v_rows);

  elsif v_action='create' then
    v_digest:=lower(coalesce(p_action->>'secret_digest',''));
    v_role:=coalesce(p_action->>'role','auditor');
    if v_digest!~'^[0-9a-f]{64}$' then raise exception 'invalid_secret'; end if;
    if v_role not in ('owner','treasurer','organizer','auditor','reader','editor','developer') then raise exception 'invalid_role'; end if;

    insert into public.solidarity_organizer_accounts(
      username,display_name,role,secret_hash
    ) values(
      lower(trim(p_action->>'username')),
      left(trim(p_action->>'display_name'),120),
      v_role,
      crypt(v_digest,gen_salt('bf',12))
    ) returning id into v_id;

    return jsonb_build_object('ok',true,'id',v_id);

  elsif v_action='update' then
    v_id:=(p_action->>'id')::uuid;
    v_role:=coalesce(p_action->>'role','auditor');
    if v_role not in ('owner','treasurer','organizer','auditor','reader','editor','developer') then raise exception 'invalid_role'; end if;

    update public.solidarity_organizer_accounts
    set display_name=left(trim(p_action->>'display_name'),120),
        role=v_role,
        active=coalesce((p_action->>'active')::boolean,active),
        updated_at=now()
    where id=v_id;

    return jsonb_build_object('ok',true);

  elsif v_action='reset_password' then
    v_id:=(p_action->>'id')::uuid;
    v_digest:=lower(coalesce(p_action->>'secret_digest',''));
    if v_digest!~'^[0-9a-f]{64}$' then raise exception 'invalid_secret'; end if;

    update public.solidarity_organizer_accounts
    set secret_hash=crypt(v_digest,gen_salt('bf',12)),
        updated_at=now()
    where id=v_id;

    update public.solidarity_organizer_sessions
    set revoked_at=now()
    where account_id=v_id and revoked_at is null;

    return jsonb_build_object('ok',true);

  elsif v_action='revoke_sessions' then
    v_id:=(p_action->>'id')::uuid;
    update public.solidarity_organizer_sessions
    set revoked_at=now()
    where account_id=v_id and revoked_at is null;
    return jsonb_build_object('ok',true);

  else
    raise exception 'unknown_action';
  end if;
end
$function$
