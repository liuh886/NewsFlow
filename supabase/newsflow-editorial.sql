-- NewsFlow editorial authority contract.
-- This file is the canonical SQL definition for the two RPCs used by the
-- editor game and semi-monthly publisher. It is intentionally not a migration.

create or replace function public.newsflow_is_authoritative_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membership_admins
    where user_id = (select auth.uid())
      and active = true
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.newsflow_is_authoritative_editor() from public;
grant execute on function public.newsflow_is_authoritative_editor() to authenticated;

create or replace function public.newsflow_public_editorial_adoptions()
returns table(candidate_id text, decision text, decided_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    entry.key::text as candidate_id,
    entry.value ->> 'decision' as decision,
    case
      when coalesce(entry.value ->> 'decided_at', '') ~ '^\d{4}-\d{2}-\d{2}T'
        then (entry.value ->> 'decided_at')::timestamptz
      else null
    end as decided_at
  from public.membership_admins as admin
  join public.product_accounts as account
    on account.user_id = admin.user_id
   and account.product_code = 'newsflow'
  cross join lateral jsonb_each(
    coalesce(account.state -> 'newsflow_editorial' -> 'decisions', '{}'::jsonb)
  ) as entry
  where admin.active = true
    and admin.role = 'owner'
    and entry.value ->> 'decision' in ('cover_story', 'accept')
  order by
    case when entry.value ->> 'decision' = 'cover_story' then 0 else 1 end,
    decided_at desc nulls last,
    candidate_id;
$$;

revoke all on function public.newsflow_public_editorial_adoptions() from public;
grant execute on function public.newsflow_public_editorial_adoptions() to anon, authenticated, service_role;
