-- NewsFlow Editorial Governance v2.
-- Canonical editorial base contract. The low-frequency audit, withdrawal and
-- ranking extension is versioned separately. GitHub stores the contract;
-- Supabase stores private workflow state.

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

-- Every formal editor owns one stable, public referral identifier. It identifies
-- the inviter; it is not an authentication secret or bearer credential.
create or replace function private.newsflow_new_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := 'NF-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.newsflow_editorial_members m where m.referral_code = candidate
    );
  end loop;
  return candidate;
end;
$$;
revoke all on function private.newsflow_new_referral_code() from public, anon, authenticated, service_role;

create table if not exists public.newsflow_editorial_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor_in_chief', 'editor')),
  active boolean not null default true,
  referral_code text not null unique default private.newsflow_new_referral_code()
    check (referral_code ~ '^NF-[A-F0-9]{8}$'),
  appointed_by uuid references auth.users(id) on delete set null,
  appointed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists newsflow_editorial_members_appointed_by_idx on public.newsflow_editorial_members (appointed_by) where appointed_by is not null;
alter table public.newsflow_editorial_members enable row level security;
revoke all on table public.newsflow_editorial_members from anon, authenticated;
grant select, update, delete on table public.newsflow_editorial_members to authenticated;

drop policy if exists "Editorial members read own role or chief reads roster" on public.newsflow_editorial_members;
create policy "Editorial members read own role or chief reads roster"
on public.newsflow_editorial_members
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.newsflow_is_authoritative_editor()));

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

-- One accepted inviter -> invitee edge per editor. This ledger is attribution only;
-- it does not carry authorization or benefit policy.
create table if not exists public.newsflow_editor_referrals (
  invitee_user_id uuid primary key references auth.users(id) on delete restrict,
  inviter_user_id uuid not null references auth.users(id) on delete restrict,
  referral_code text not null check (referral_code ~ '^NF-[A-F0-9]{8}$'),
  accepted_at timestamptz not null default now(),
  constraint newsflow_editor_referrals_no_self_referral check (invitee_user_id <> inviter_user_id)
);
create index if not exists newsflow_editor_referrals_inviter_user_id_idx on public.newsflow_editor_referrals (inviter_user_id);
alter table public.newsflow_editor_referrals enable row level security;
revoke all on table public.newsflow_editor_referrals from anon, authenticated;
grant select on table public.newsflow_editor_referrals to authenticated;

drop policy if exists "Editors read own referral edges or chief reads network" on public.newsflow_editor_referrals;
create policy "Editors read own referral edges or chief reads network"
on public.newsflow_editor_referrals
for select
to authenticated
using (
  (select public.newsflow_is_authoritative_editor())
  or inviter_user_id = (select auth.uid())
  or invitee_user_id = (select auth.uid())
);

-- Referral acceptance is a single server-owned transaction: caller identity,
-- inviter, editor role and complimentary Pro duration are never browser supplied.
create or replace function private.newsflow_accept_editor_referral(candidate_code text)
returns table (new_referral_code text, pro_valid_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_code text := upper(trim(candidate_code));
  inviter_id uuid;
  own_code text;
  pro_until timestamptz := now() + interval '3 months';
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if normalized_code !~ '^NF-[A-F0-9]{8}$' then
    raise exception 'editor referral code is invalid' using errcode = '23514';
  end if;

  select m.user_id into inviter_id
  from public.newsflow_editorial_members m
  where m.referral_code = normalized_code
    and m.active = true
    and m.role in ('editor_in_chief', 'editor');

  if inviter_id is null then
    raise exception 'editor referral code is invalid or inactive' using errcode = '23514';
  end if;
  if inviter_id = caller_id then
    raise exception 'self-referral is not allowed' using errcode = '23514';
  end if;
  if exists (select 1 from public.newsflow_editorial_members m where m.user_id = caller_id) then
    raise exception 'account already has an editorial appointment' using errcode = '23505';
  end if;
  if exists (select 1 from public.newsflow_editor_referrals r where r.invitee_user_id = caller_id) then
    raise exception 'account already accepted an editor referral' using errcode = '23505';
  end if;

  insert into public.newsflow_editorial_members (user_id, role, active, appointed_by, appointed_at, updated_at)
  values (caller_id, 'editor', true, inviter_id, now(), now())
  returning referral_code into own_code;

  insert into public.newsflow_editor_referrals (inviter_user_id, invitee_user_id, referral_code, accepted_at)
  values (inviter_id, caller_id, normalized_code, now());

  insert into public.entitlement_grants (
    user_id, entitlement_code, source, source_ref, active, valid_until, metadata, updated_at
  ) values (
    caller_id, 'newsflow.pro', 'editor_referral', normalized_code, true, pro_until,
    jsonb_build_object(
      'reason', 'NewsFlow editor referral appointment',
      'months', 3,
      'inviter_user_id', inviter_id,
      'referral_code', normalized_code
    ),
    now()
  )
  on conflict (user_id, entitlement_code, source, source_ref) do update
  set active = true,
      valid_until = excluded.valid_until,
      metadata = excluded.metadata,
      updated_at = now();

  perform public.refresh_effective_entitlements(caller_id);
  return query select own_code, pro_until;
end;
$$;
revoke all on function private.newsflow_accept_editor_referral(text) from public, anon;
grant execute on function private.newsflow_accept_editor_referral(text) to authenticated;

create or replace function public.newsflow_accept_editor_referral(referral_code text)
returns table (new_referral_code text, pro_valid_until timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from private.newsflow_accept_editor_referral(referral_code);
$$;
revoke all on function public.newsflow_accept_editor_referral(text) from public, anon;
grant execute on function public.newsflow_accept_editor_referral(text) to authenticated;

-- Chief-only recursive view of the accepted propagation graph. Public profile
-- display names are included when available; email/Auth identity is never exposed.
create or replace function private.newsflow_editor_referral_network()
returns table (
  user_id uuid,
  parent_user_id uuid,
  display_name text,
  referral_code text,
  role text,
  active boolean,
  joined_at timestamptz,
  depth integer,
  direct_referrals bigint,
  total_descendants bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.newsflow_is_authoritative_editor() then
    raise exception 'editor-in-chief access required' using errcode = '42501';
  end if;

  return query
  with recursive
  tree as (
    select m.user_id, null::uuid as parent_user_id, 0 as depth
    from public.newsflow_editorial_members m
    where not exists (
      select 1 from public.newsflow_editor_referrals r where r.invitee_user_id = m.user_id
    )
    union all
    select child.user_id, r.inviter_user_id, tree.depth + 1
    from tree
    join public.newsflow_editor_referrals r on r.inviter_user_id = tree.user_id
    join public.newsflow_editorial_members child on child.user_id = r.invitee_user_id
  ),
  descendants as (
    select r.inviter_user_id as root_user_id, r.invitee_user_id as descendant_user_id
    from public.newsflow_editor_referrals r
    union all
    select d.root_user_id, r.invitee_user_id
    from descendants d
    join public.newsflow_editor_referrals r on r.inviter_user_id = d.descendant_user_id
  ),
  direct_counts as (
    select r.inviter_user_id, count(*)::bigint as direct_referrals
    from public.newsflow_editor_referrals r
    group by r.inviter_user_id
  ),
  descendant_counts as (
    select d.root_user_id, count(*)::bigint as total_descendants
    from descendants d
    group by d.root_user_id
  )
  select
    m.user_id,
    tree.parent_user_id,
    nullif(trim(p.display_name), '') as display_name,
    m.referral_code,
    m.role,
    m.active,
    m.appointed_at as joined_at,
    coalesce(tree.depth, 0)::integer as depth,
    coalesce(dc.direct_referrals, 0)::bigint as direct_referrals,
    coalesce(tc.total_descendants, 0)::bigint as total_descendants
  from public.newsflow_editorial_members m
  left join tree on tree.user_id = m.user_id
  left join public.profiles p on p.id = m.user_id
  left join direct_counts dc on dc.inviter_user_id = m.user_id
  left join descendant_counts tc on tc.root_user_id = m.user_id
  order by coalesce(tree.depth, 0), m.appointed_at, m.user_id;
end;
$$;
revoke all on function private.newsflow_editor_referral_network() from public, anon;
grant execute on function private.newsflow_editor_referral_network() to authenticated;

create or replace function public.newsflow_editor_referral_network()
returns table (
  user_id uuid,
  parent_user_id uuid,
  display_name text,
  referral_code text,
  role text,
  active boolean,
  joined_at timestamptz,
  depth integer,
  direct_referrals bigint,
  total_descendants bigint
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.newsflow_editor_referral_network();
$$;
revoke all on function public.newsflow_editor_referral_network() from public, anon;
grant execute on function public.newsflow_editor_referral_network() to authenticated;

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