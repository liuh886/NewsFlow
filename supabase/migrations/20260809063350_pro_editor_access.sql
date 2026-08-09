-- NewsFlow Pro unlocks advisory Editor access. Editor-in-Chief authority still
-- comes exclusively from membership_admins/newsflow_editorial_members.

drop policy if exists "Editorial members read NewsFlow candidates" on public.newsflow_candidates;
drop policy if exists "Pro editorial members read NewsFlow candidates" on public.newsflow_candidates;
drop policy if exists "Editorial members or Pro users read NewsFlow candidates" on public.newsflow_candidates;
create policy "Editorial members or Pro users read NewsFlow candidates"
on public.newsflow_candidates
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
  )
  or exists (
    select 1 from public.entitlements
    where user_id = (select auth.uid())
      and entitlement_code = 'newsflow.pro'
      and active = true
      and (valid_until is null or valid_until > now())
  )
);

drop policy if exists "Editorial members create own reviews" on public.newsflow_editorial_reviews;
drop policy if exists "Pro editorial members create own reviews" on public.newsflow_editorial_reviews;
drop policy if exists "Editorial members or Pro users create own reviews" on public.newsflow_editorial_reviews;
create policy "Editorial members or Pro users create own reviews"
on public.newsflow_editorial_reviews
for insert
to authenticated
with check (
  reviewer_user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.newsflow_editorial_members
      where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
    )
    or exists (
      select 1 from public.entitlements
      where user_id = (select auth.uid())
        and entitlement_code = 'newsflow.pro'
        and active = true
        and (valid_until is null or valid_until > now())
    )
  )
);

drop policy if exists "Editorial members update own reviews" on public.newsflow_editorial_reviews;
drop policy if exists "Pro editorial members update own reviews" on public.newsflow_editorial_reviews;
drop policy if exists "Editorial members or Pro users update own reviews" on public.newsflow_editorial_reviews;
create policy "Editorial members or Pro users update own reviews"
on public.newsflow_editorial_reviews
for update
to authenticated
using (
  reviewer_user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.newsflow_editorial_members
      where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
    )
    or exists (
      select 1 from public.entitlements
      where user_id = (select auth.uid())
        and entitlement_code = 'newsflow.pro'
        and active = true
        and (valid_until is null or valid_until > now())
    )
  )
)
with check (
  reviewer_user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.newsflow_editorial_members
      where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
    )
    or exists (
      select 1 from public.entitlements
      where user_id = (select auth.uid())
        and entitlement_code = 'newsflow.pro'
        and active = true
        and (valid_until is null or valid_until > now())
    )
  )
);

drop policy if exists "Editorial members delete own reviews" on public.newsflow_editorial_reviews;
drop policy if exists "Pro editorial members delete own reviews" on public.newsflow_editorial_reviews;
drop policy if exists "Editorial members or Pro users delete own reviews" on public.newsflow_editorial_reviews;
create policy "Editorial members or Pro users delete own reviews"
on public.newsflow_editorial_reviews
for delete
to authenticated
using (
  reviewer_user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.newsflow_editorial_members
      where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
    )
    or exists (
      select 1 from public.entitlements
      where user_id = (select auth.uid())
        and entitlement_code = 'newsflow.pro'
        and active = true
        and (valid_until is null or valid_until > now())
    )
  )
);

drop policy if exists "Editorial members read NewsFlow decision history" on public.newsflow_editorial_events;
drop policy if exists "Pro editorial members read NewsFlow decision history" on public.newsflow_editorial_events;
drop policy if exists "Editorial members or Pro users read NewsFlow decision history" on public.newsflow_editorial_events;
create policy "Editorial members or Pro users read NewsFlow decision history"
on public.newsflow_editorial_events
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
  )
  or exists (
    select 1 from public.entitlements
    where user_id = (select auth.uid())
      and entitlement_code = 'newsflow.pro'
      and active = true
      and (valid_until is null or valid_until > now())
  )
);

drop policy if exists "Editorial members read NewsFlow withdrawals" on public.newsflow_editorial_withdrawals;
drop policy if exists "Pro editorial members read NewsFlow withdrawals" on public.newsflow_editorial_withdrawals;
drop policy if exists "Editorial members or Pro users read NewsFlow withdrawals" on public.newsflow_editorial_withdrawals;
create policy "Editorial members or Pro users read NewsFlow withdrawals"
on public.newsflow_editorial_withdrawals
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
  )
  or exists (
    select 1 from public.entitlements
    where user_id = (select auth.uid())
      and entitlement_code = 'newsflow.pro'
      and active = true
      and (valid_until is null or valid_until > now())
  )
);

drop policy if exists "Editorial members read NewsFlow consensus" on public.newsflow_editorial_consensus;
drop policy if exists "Pro editorial members read NewsFlow consensus" on public.newsflow_editorial_consensus;
drop policy if exists "Editorial members or Pro users read NewsFlow consensus" on public.newsflow_editorial_consensus;
create policy "Editorial members or Pro users read NewsFlow consensus"
on public.newsflow_editorial_consensus
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true and role = 'editor_in_chief'
  )
  or exists (
    select 1 from public.entitlements
    where user_id = (select auth.uid())
      and entitlement_code = 'newsflow.pro'
      and active = true
      and (valid_until is null or valid_until > now())
  )
);

create or replace function private.newsflow_refresh_editorial_consensus(target_candidate_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cover_count integer := 0;
  accepted_count integer := 0;
  minor_count integer := 0;
  major_count integer := 0;
  rejected_count integer := 0;
  review_count integer := 0;
  weighted_sum numeric := 0;
  confidence numeric := 0;
  boost numeric := 0;
begin
  select
    count(*) filter (where r.decision = 'cover_story'),
    count(*) filter (where r.decision = 'accept'),
    count(*) filter (where r.decision = 'minor_revision'),
    count(*) filter (where r.decision = 'major_revision'),
    count(*) filter (where r.decision = 'reject'),
    count(*),
    coalesce(sum(case r.decision
      when 'cover_story' then 1.00
      when 'accept' then 0.75
      when 'minor_revision' then 0.20
      when 'major_revision' then -0.35
      when 'reject' then -1.00
      else 0 end), 0)
  into cover_count, accepted_count, minor_count, major_count, rejected_count, review_count, weighted_sum
  from public.newsflow_editorial_reviews r
  where r.candidate_id = target_candidate_id
    and not private.newsflow_reviewer_is_chief(r.reviewer_user_id);

  if review_count > 0 then
    confidence := review_count::numeric / (review_count + 2);
    boost := round((weighted_sum / review_count) * confidence * 0.45, 3);
  end if;

  insert into public.newsflow_editorial_consensus (
    candidate_id, cover_story_count, accept_count, minor_revision_count,
    major_revision_count, reject_count, editor_review_count, editorial_boost, updated_at
  ) values (
    target_candidate_id, cover_count, accepted_count, minor_count,
    major_count, rejected_count, review_count, boost, now()
  )
  on conflict (candidate_id) do update set
    cover_story_count = excluded.cover_story_count,
    accept_count = excluded.accept_count,
    minor_revision_count = excluded.minor_revision_count,
    major_revision_count = excluded.major_revision_count,
    reject_count = excluded.reject_count,
    editor_review_count = excluded.editor_review_count,
    editorial_boost = excluded.editorial_boost,
    updated_at = now();
end;
$$;
revoke all on function private.newsflow_refresh_editorial_consensus(text) from public, anon, authenticated, service_role;

-- Recalculate compact current consensus once so any existing Pro reviews are
-- included without creating additional tables or background jobs.
do $$
declare
  candidate record;
begin
  for candidate in select candidate_id from public.newsflow_candidates loop
    perform private.newsflow_refresh_editorial_consensus(candidate.candidate_id);
  end loop;
end;
$$;

-- The previous migration owns invitation acceptance and its three-month grant
-- in entitlement_grants. Remove the short-lived direct entitlement fallback if
-- this migration is replayed after an interrupted rollout.
drop trigger if exists newsflow_grant_invited_editor_pro on public.newsflow_editorial_members;
drop function if exists private.newsflow_grant_invited_editor_pro();

insert into public.entitlement_grants (
  user_id, entitlement_code, source, source_ref, active, valid_until, metadata, updated_at
)
select
  user_id, 'newsflow.pro', 'editor_invite', invitation_hash, true,
  now() + interval '3 months',
  jsonb_build_object('reason', 'NewsFlow editor appointment', 'months', 3, 'backfill', true),
  now()
from public.newsflow_editorial_members
where role = 'editor' and active = true and invitation_hash is not null
on conflict (user_id, entitlement_code, source, source_ref) do nothing;

delete from public.entitlements where source = 'newsflow_editor_invite';

do $$
declare
  invited record;
begin
  for invited in
    select user_id from public.newsflow_editorial_members
    where role = 'editor' and active = true and invitation_hash is not null
  loop
    perform public.refresh_effective_entitlements(invited.user_id);
  end loop;
end;
$$;
