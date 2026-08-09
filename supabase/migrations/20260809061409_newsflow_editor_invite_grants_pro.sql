-- Keep the browser invitation flow; make acceptance and the three-month Pro
-- grant one authoritative database transaction.
drop function if exists public.newsflow_accept_editor_invitation(text);

create or replace function private.newsflow_editor_invite_valid(candidate_hash text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.newsflow_editorial_invitations
    where token_hash = candidate_hash
      and expires_at > now()
      and accepted_by is null
  );
$$;
revoke all on function private.newsflow_editor_invite_valid(text) from public, anon, authenticated, service_role;

create or replace function private.newsflow_activate_editor_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  pro_until timestamptz := now() + interval '3 months';
begin
  if new.role <> 'editor' or new.active is not true or new.invitation_hash is null then
    return new;
  end if;

  select id into invitation_id
  from public.newsflow_editorial_invitations
  where token_hash = new.invitation_hash
    and expires_at > now()
    and accepted_by is null
  for update;

  if invitation_id is null then
    raise exception 'editor invitation is invalid, expired, or already used' using errcode = '23514';
  end if;

  update public.newsflow_editorial_invitations
  set accepted_by = new.user_id,
      accepted_at = now()
  where id = invitation_id;

  insert into public.entitlement_grants (
    user_id, entitlement_code, source, source_ref, active, valid_until, metadata, updated_at
  ) values (
    new.user_id,
    'newsflow.pro',
    'editor_invite',
    invitation_id::text,
    true,
    pro_until,
    jsonb_build_object('reason', 'NewsFlow editor appointment', 'months', 3),
    now()
  )
  on conflict (user_id, entitlement_code, source, source_ref) do update
  set active = true,
      valid_until = excluded.valid_until,
      metadata = excluded.metadata,
      updated_at = now();

  perform public.refresh_effective_entitlements(new.user_id);
  return new;
end;
$$;
revoke all on function private.newsflow_activate_editor_invitation() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_activate_editor_invitation on public.newsflow_editorial_members;
create trigger newsflow_activate_editor_invitation
after insert on public.newsflow_editorial_members
for each row execute function private.newsflow_activate_editor_invitation();

drop policy if exists "Editor in chief creates NewsFlow editorial members" on public.newsflow_editorial_members;
drop policy if exists "Editors accept a valid NewsFlow appointment" on public.newsflow_editorial_members;
create policy "Editors accept a valid NewsFlow appointment"
on public.newsflow_editorial_members
for insert
to authenticated
with check (
  (select public.newsflow_is_authoritative_editor())
  or (
    user_id = (select auth.uid())
    and role = 'editor'
    and active = true
    and invitation_hash is not null
    and (select private.newsflow_editor_invite_valid(invitation_hash))
  )
);
