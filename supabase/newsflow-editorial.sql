-- NewsFlow editorial authority and public adoption projection.
-- Canonical SQL for the live schema. This is intentionally not a migration.

create table if not exists public.newsflow_editorial_adoptions (
  candidate_id text primary key,
  decision text not null check (decision in ('cover_story', 'accept')),
  decided_at timestamptz,
  editor_user_id uuid not null,
  updated_at timestamptz not null default now()
);

alter table public.newsflow_editorial_adoptions enable row level security;
revoke all on table public.newsflow_editorial_adoptions from anon, authenticated;
grant select on table public.newsflow_editorial_adoptions to anon, authenticated;

drop policy if exists "Public can read NewsFlow editorial adoptions" on public.newsflow_editorial_adoptions;
create policy "Public can read NewsFlow editorial adoptions"
on public.newsflow_editorial_adoptions
for select
to anon, authenticated
using (true);

-- The previous blanket deny policy is unnecessary: RLS denies every action that
-- lacks an allowing policy. Keep one precise authenticated SELECT policy instead.
drop policy if exists "Clients cannot access membership admins" on public.membership_admins;
drop policy if exists "Users can read their own admin role" on public.membership_admins;
create policy "Users can read their own admin role"
on public.membership_admins
for select
to authenticated
using ((select auth.uid()) = user_id);
grant select on table public.membership_admins to authenticated;

create or replace function public.newsflow_is_authoritative_editor()
returns boolean
language sql
stable
security invoker
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
revoke all on function public.newsflow_is_authoritative_editor() from public, anon, service_role;
grant execute on function public.newsflow_is_authoritative_editor() to authenticated;

create or replace function public.newsflow_sync_editorial_adoptions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.product_code <> 'newsflow' then
    return new;
  end if;

  if exists (
    select 1
    from public.membership_admins
    where user_id = new.user_id
      and active = true
      and role = 'owner'
  ) then
    delete from public.newsflow_editorial_adoptions;
    insert into public.newsflow_editorial_adoptions (candidate_id, decision, decided_at, editor_user_id, updated_at)
    select
      entry.key::text,
      entry.value ->> 'decision',
      case
        when coalesce(entry.value ->> 'decided_at', '') ~ '^\d{4}-\d{2}-\d{2}T'
          then (entry.value ->> 'decided_at')::timestamptz
        else null
      end,
      new.user_id,
      now()
    from jsonb_each(coalesce(new.state -> 'newsflow_editorial' -> 'decisions', '{}'::jsonb)) as entry
    where entry.value ->> 'decision' in ('cover_story', 'accept');
  end if;

  return new;
end;
$$;
revoke all on function public.newsflow_sync_editorial_adoptions() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_sync_editorial_adoptions on public.product_accounts;
create trigger newsflow_sync_editorial_adoptions
after insert or update of state on public.product_accounts
for each row execute function public.newsflow_sync_editorial_adoptions();
