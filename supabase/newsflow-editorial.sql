-- NewsFlow Editorial Governance v2.
-- Canonical live-schema contract. GitHub stores the contract; Supabase stores private workflow state.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Final publication authority continues to come from the shared account owner.
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
      and role = 'owner'
  );
$$;
revoke all on function public.newsflow_is_authoritative_editor() from public, anon, service_role;
grant execute on function public.newsflow_is_authoritative_editor() to authenticated;

-- Permanent Editor appointments. The raw invitation token is never stored.
create table if not exists public.newsflow_editorial_invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists newsflow_editorial_invitations_created_by_idx on public.newsflow_editorial_invitations (created_by);
create index if not exists newsflow_editorial_invitations_accepted_by_idx on public.newsflow_editorial_invitations (accepted_by) where accepted_by is not null;
alter table public.newsflow_editorial_invitations enable row level security;
revoke all on table public.newsflow_editorial_invitations from anon, authenticated;
grant select, insert, delete on table public.newsflow_editorial_invitations to authenticated;

drop policy if exists "Editor in chief manages NewsFlow editor invitations" on public.newsflow_editorial_invitations;
create policy "Editor in chief manages NewsFlow editor invitations"
on public.newsflow_editorial_invitations
for all
to authenticated
using ((select public.newsflow_is_authoritative_editor()))
with check ((select public.newsflow_is_authoritative_editor()) and created_by = (select auth.uid()));

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
revoke all on function private.newsflow_editor_invite_valid(text) from public, anon, service_role;
grant execute on function private.newsflow_editor_invite_valid(text) to authenticated;

create table if not exists public.newsflow_editorial_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor_in_chief', 'editor')),
  active boolean not null default true,
  invitation_hash text unique,
  appointed_by uuid references auth.users(id) on delete set null,
  appointed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsflow_editorial_members_appointed_by_idx on public.newsflow_editorial_members (appointed_by) where appointed_by is not null;
alter table public.newsflow_editorial_members enable row level security;
revoke all on table public.newsflow_editorial_members from anon, authenticated;
grant select, insert, update, delete on table public.newsflow_editorial_members to authenticated;

drop policy if exists "Editorial members read own role or chief reads roster" on public.newsflow_editorial_members;
create policy "Editorial members read own role or chief reads roster"
on public.newsflow_editorial_members
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.newsflow_is_authoritative_editor()));

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

drop policy if exists "Editor in chief updates NewsFlow editorial roster" on public.newsflow_editorial_members;
create policy "Editor in chief updates NewsFlow editorial roster"
on public.newsflow_editorial_members
for update
to authenticated
using ((select public.newsflow_is_authoritative_editor()))
with check ((select public.newsflow_is_authoritative_editor()));

drop policy if exists "Editor in chief removes NewsFlow editorial members" on public.newsflow_editorial_members;
create policy "Editor in chief removes NewsFlow editorial members"
on public.newsflow_editorial_members
for delete
to authenticated
using ((select public.newsflow_is_authoritative_editor()));

insert into public.newsflow_editorial_members (user_id, role, active, appointed_by)
select user_id, 'editor_in_chief', true, user_id
from public.membership_admins
where active = true and role = 'owner'
on conflict (user_id) do update
set role = 'editor_in_chief', active = true, updated_at = now();

create or replace function private.newsflow_sync_owner_editorial_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  if tg_op = 'DELETE' or new.active is not true or new.role <> 'owner' then
    update public.newsflow_editorial_members
    set active = false, updated_at = now()
    where user_id = affected_user and role = 'editor_in_chief';
    return coalesce(new, old);
  end if;

  insert into public.newsflow_editorial_members (user_id, role, active, appointed_by, updated_at)
  values (new.user_id, 'editor_in_chief', true, new.user_id, now())
  on conflict (user_id) do update
    set role = 'editor_in_chief', active = true, appointed_by = excluded.appointed_by, updated_at = now();
  return new;
end;
$$;
revoke all on function private.newsflow_sync_owner_editorial_membership() from public, anon, authenticated, service_role;
drop trigger if exists newsflow_sync_owner_editorial_membership on public.membership_admins;
create trigger newsflow_sync_owner_editorial_membership
after insert or update of role, active or delete on public.membership_admins
for each row execute function private.newsflow_sync_owner_editorial_membership();

create or replace function private.newsflow_mark_editor_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invitation_hash is not null then
    update public.newsflow_editorial_invitations
    set accepted_by = new.user_id, accepted_at = now()
    where token_hash = new.invitation_hash and accepted_by is null;
  end if;
  return new;
end;
$$;
revoke all on function private.newsflow_mark_editor_invitation_accepted() from public, anon, authenticated, service_role;
drop trigger if exists newsflow_mark_editor_invitation_accepted on public.newsflow_editorial_members;
create trigger newsflow_mark_editor_invitation_accepted
after insert on public.newsflow_editorial_members
for each row execute function private.newsflow_mark_editor_invitation_accepted();

-- Unpublished manuscripts are private editorial data and never part of the Reader static artifact.
create table if not exists public.newsflow_candidates (
  candidate_id text primary key,
  edition_id text not null,
  title text not null,
  short_summary text not null default '',
  source text not null default '',
  url text not null default '',
  channel_id text not null default '',
  storyline_ids text[] not null default '{}',
  event_type text not null default '',
  published_at timestamptz,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  active boolean not null default true,
  synced_at timestamptz not null default now()
);
alter table public.newsflow_candidates add column if not exists payload jsonb not null default '{}'::jsonb;
create index if not exists newsflow_candidates_active_published_idx on public.newsflow_candidates (active, published_at desc);
alter table public.newsflow_candidates enable row level security;
revoke all on table public.newsflow_candidates from anon, authenticated;
grant select on table public.newsflow_candidates to authenticated;
grant select, insert, update, delete on table public.newsflow_candidates to service_role;

drop policy if exists "Editorial members read NewsFlow candidates" on public.newsflow_candidates;
create policy "Editorial members read NewsFlow candidates"
on public.newsflow_candidates
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true
  )
);

-- Every Editor gets one normalized five-state opinion per candidate.
create table if not exists public.newsflow_editorial_reviews (
  candidate_id text not null references public.newsflow_candidates(candidate_id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('cover_story', 'accept', 'minor_revision', 'major_revision', 'reject')),
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, reviewer_user_id)
);
create index if not exists newsflow_editorial_reviews_reviewer_idx on public.newsflow_editorial_reviews (reviewer_user_id, decided_at desc);
alter table public.newsflow_editorial_reviews enable row level security;
revoke all on table public.newsflow_editorial_reviews from anon, authenticated;
grant select, insert, update, delete on table public.newsflow_editorial_reviews to authenticated;

drop policy if exists "Editors read own reviews and chief reads all" on public.newsflow_editorial_reviews;
create policy "Editors read own reviews and chief reads all"
on public.newsflow_editorial_reviews
for select
to authenticated
using (reviewer_user_id = (select auth.uid()) or (select public.newsflow_is_authoritative_editor()));

drop policy if exists "Editorial members create own reviews" on public.newsflow_editorial_reviews;
create policy "Editorial members create own reviews"
on public.newsflow_editorial_reviews
for insert
to authenticated
with check (
  reviewer_user_id = (select auth.uid())
  and exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true
  )
);

drop policy if exists "Editorial members update own reviews" on public.newsflow_editorial_reviews;
create policy "Editorial members update own reviews"
on public.newsflow_editorial_reviews
for update
to authenticated
using (reviewer_user_id = (select auth.uid()))
with check (
  reviewer_user_id = (select auth.uid())
  and exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true
  )
);

drop policy if exists "Editorial members delete own reviews" on public.newsflow_editorial_reviews;
create policy "Editorial members delete own reviews"
on public.newsflow_editorial_reviews
for delete
to authenticated
using (reviewer_user_id = (select auth.uid()));

-- Reader-facing adoption projection: only Editor-in-Chief Cover/Accept decisions can reach it.
create table if not exists public.newsflow_editorial_adoptions (
  candidate_id text primary key,
  decision text not null check (decision in ('cover_story', 'accept')),
  decided_at timestamptz,
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

create or replace function private.newsflow_sync_chief_adoption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_user uuid := coalesce(new.reviewer_user_id, old.reviewer_user_id);
  review_candidate text := coalesce(new.candidate_id, old.candidate_id);
begin
  if not exists (
    select 1 from public.membership_admins
    where user_id = review_user and active = true and role = 'owner'
  ) then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    delete from public.newsflow_editorial_adoptions where candidate_id = review_candidate;
    update public.newsflow_candidates set active = true, synced_at = now() where candidate_id = review_candidate;
    return old;
  end if;

  update public.newsflow_candidates set active = false, synced_at = now() where candidate_id = new.candidate_id;

  if new.decision in ('cover_story', 'accept') then
    insert into public.newsflow_editorial_adoptions (candidate_id, decision, decided_at, updated_at)
    values (new.candidate_id, new.decision, new.decided_at, now())
    on conflict (candidate_id) do update
      set decision = excluded.decision,
          decided_at = excluded.decided_at,
          updated_at = now();
  else
    delete from public.newsflow_editorial_adoptions where candidate_id = new.candidate_id;
  end if;
  return new;
end;
$$;
revoke all on function private.newsflow_sync_chief_adoption() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_sync_editorial_adoptions on public.product_accounts;
drop function if exists public.newsflow_sync_editorial_adoptions();
drop trigger if exists newsflow_sync_chief_adoption on public.newsflow_editorial_reviews;
create trigger newsflow_sync_chief_adoption
after insert or update of decision, decided_at or delete on public.newsflow_editorial_reviews
for each row execute function private.newsflow_sync_chief_adoption();

-- Online governance editor. Drafts stay private; published rows are read only by server-side GitHub sync.
create table if not exists public.newsflow_governance_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('edition', 'storyline', 'source')),
  target_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (kind, target_id)
);
create index if not exists newsflow_governance_drafts_created_by_idx on public.newsflow_governance_drafts (created_by);
create index if not exists newsflow_governance_drafts_updated_by_idx on public.newsflow_governance_drafts (updated_by);
alter table public.newsflow_governance_drafts enable row level security;
revoke all on table public.newsflow_governance_drafts from anon, authenticated;
grant select, insert, update, delete on table public.newsflow_governance_drafts to authenticated;

drop policy if exists "Editor in chief manages NewsFlow governance drafts" on public.newsflow_governance_drafts;
create policy "Editor in chief manages NewsFlow governance drafts"
on public.newsflow_governance_drafts
for all
to authenticated
using ((select public.newsflow_is_authoritative_editor()))
with check (
  (select public.newsflow_is_authoritative_editor())
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create table if not exists public.newsflow_governance_publications (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.newsflow_governance_drafts(id) on delete cascade,
  kind text not null check (kind in ('edition', 'storyline', 'source')),
  target_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  published_at timestamptz not null default now()
);
create index if not exists newsflow_governance_publications_time_idx on public.newsflow_governance_publications (published_at, id);
create index if not exists newsflow_governance_publications_draft_id_idx on public.newsflow_governance_publications (draft_id);
alter table public.newsflow_governance_publications enable row level security;
revoke all on table public.newsflow_governance_publications from anon, authenticated;
grant select, insert, update, delete on table public.newsflow_governance_publications to service_role;

drop policy if exists "Service role reads NewsFlow governance publications" on public.newsflow_governance_publications;
create policy "Service role reads NewsFlow governance publications"
on public.newsflow_governance_publications
for select
to service_role
using (true);

create or replace function private.newsflow_publish_governance_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
    insert into public.newsflow_governance_publications (draft_id, kind, target_id, payload, published_at)
    values (new.id, new.kind, new.target_id, new.payload, new.published_at);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.newsflow_publish_governance_change() from public, anon, authenticated, service_role;
drop trigger if exists newsflow_publish_governance_change on public.newsflow_governance_drafts;
create trigger newsflow_publish_governance_change
before insert or update of status on public.newsflow_governance_drafts
for each row execute function private.newsflow_publish_governance_change();
