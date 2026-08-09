-- Restore the RLS helper call path for authenticated users. The helper stays
-- in the unexposed private schema, verifies auth.uid(), and only answers a
-- boolean authorization question.
create or replace function private.newsflow_has_editor_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.membership_admins a
        where a.user_id = (select auth.uid())
          and a.active = true
          and a.role = 'owner'
      )
      or exists (
        select 1
        from public.newsflow_editorial_members m
        where m.user_id = (select auth.uid())
          and m.active = true
          and m.role = 'editor_in_chief'
      )
      or exists (
        select 1
        from public.entitlements e
        where e.user_id = (select auth.uid())
          and e.entitlement_code = 'newsflow.pro'
          and e.active = true
          and (e.valid_until is null or e.valid_until > now())
      )
    );
$$;

revoke all on function private.newsflow_has_editor_access()
from public, anon, authenticated, service_role;
grant execute on function private.newsflow_has_editor_access() to authenticated;
