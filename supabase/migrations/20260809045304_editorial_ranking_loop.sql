begin;

-- The current review row stays deliberately compact. This append-only ledger
-- preserves low-frequency editorial actions without collecting exposure data.
create table public.newsflow_editorial_events (
  id bigint generated always as identity primary key,
  candidate_id text not null references public.newsflow_candidates(candidate_id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('editor_in_chief', 'editor')),
  event_type text not null check (event_type in (
    'decision_created', 'decision_changed', 'decision_reaffirmed',
    'decision_removed', 'withdrawn', 'withdrawal_reversed'
  )),
  decision text check (decision is null or decision in ('cover_story', 'accept', 'minor_revision', 'major_revision', 'reject')),
  previous_decision text check (previous_decision is null or previous_decision in ('cover_story', 'accept', 'minor_revision', 'major_revision', 'reject')),
  reason_code text check (reason_code is null or reason_code in ('evidence_update', 'factual_error', 'stale', 'editorial_judgment')),
  note text not null default '' check (char_length(note) <= 500),
  occurred_at timestamptz not null default now()
);
create index newsflow_editorial_events_candidate_time_idx
  on public.newsflow_editorial_events (candidate_id, occurred_at desc, id desc);
alter table public.newsflow_editorial_events enable row level security;
revoke all on table public.newsflow_editorial_events from anon, authenticated;
grant select on table public.newsflow_editorial_events to authenticated;
create policy "Editorial members read NewsFlow decision history"
on public.newsflow_editorial_events
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true
  )
);

-- One bounded current withdrawal state. The event ledger above preserves the
-- history when a withdrawal is later reversed.
create table public.newsflow_editorial_withdrawals (
  candidate_id text primary key references public.newsflow_candidates(candidate_id) on delete cascade,
  withdrawn_by uuid not null references auth.users(id) on delete restrict,
  reason_code text not null check (reason_code in ('evidence_update', 'factual_error', 'stale', 'editorial_judgment')),
  note text not null default '' check (char_length(note) <= 500),
  withdrawn_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.newsflow_editorial_withdrawals enable row level security;
revoke all on table public.newsflow_editorial_withdrawals from anon, authenticated;
grant select on table public.newsflow_editorial_withdrawals to authenticated;
create policy "Editorial members read NewsFlow withdrawals"
on public.newsflow_editorial_withdrawals
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true
  )
);

-- Aggregate editor opinion contains no reviewer identifiers and remains tiny:
-- exactly one current row per candidate.
create table public.newsflow_editorial_consensus (
  candidate_id text primary key references public.newsflow_candidates(candidate_id) on delete cascade,
  cover_story_count integer not null default 0 check (cover_story_count >= 0),
  accept_count integer not null default 0 check (accept_count >= 0),
  minor_revision_count integer not null default 0 check (minor_revision_count >= 0),
  major_revision_count integer not null default 0 check (major_revision_count >= 0),
  reject_count integer not null default 0 check (reject_count >= 0),
  editor_review_count integer not null default 0 check (editor_review_count >= 0),
  editorial_boost numeric(6,3) not null default 0 check (editorial_boost between -0.45 and 0.45),
  updated_at timestamptz not null default now()
);
alter table public.newsflow_editorial_consensus enable row level security;
revoke all on table public.newsflow_editorial_consensus from anon, authenticated;
grant select on table public.newsflow_editorial_consensus to authenticated;
create policy "Editorial members read NewsFlow consensus"
on public.newsflow_editorial_consensus
for select
to authenticated
using (
  exists (
    select 1 from public.newsflow_editorial_members
    where user_id = (select auth.uid()) and active = true
  )
);

create or replace function private.newsflow_reviewer_is_chief(reviewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membership_admins
    where user_id = reviewer_id and active = true and role = 'owner'
  );
$$;
revoke all on function private.newsflow_reviewer_is_chief(uuid) from public, anon, service_role;
grant execute on function private.newsflow_reviewer_is_chief(uuid) to authenticated;

drop policy if exists "Editors read own reviews and chief reads all" on public.newsflow_editorial_reviews;
create policy "Editors read own reviews and chief reads all"
on public.newsflow_editorial_reviews
for select
to authenticated
using (
  reviewer_user_id = (select auth.uid())
  or (select public.newsflow_is_authoritative_editor())
  or (select private.newsflow_reviewer_is_chief(reviewer_user_id))
);

create or replace function private.newsflow_record_review_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := coalesce(new.reviewer_user_id, old.reviewer_user_id);
  event_name text;
begin
  if tg_op = 'INSERT' then
    event_name := 'decision_created';
  elsif tg_op = 'DELETE' then
    event_name := 'decision_removed';
  elsif new.decision is distinct from old.decision then
    event_name := 'decision_changed';
  else
    event_name := 'decision_reaffirmed';
  end if;

  insert into public.newsflow_editorial_events (
    candidate_id, actor_user_id, actor_role, event_type, decision, previous_decision, occurred_at
  ) values (
    coalesce(new.candidate_id, old.candidate_id),
    actor_id,
    case when private.newsflow_reviewer_is_chief(actor_id) then 'editor_in_chief' else 'editor' end,
    event_name,
    case when tg_op = 'DELETE' then null else new.decision end,
    case when tg_op = 'INSERT' then null else old.decision end,
    now()
  );
  return coalesce(new, old);
end;
$$;
revoke all on function private.newsflow_record_review_event() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_record_review_event on public.newsflow_editorial_reviews;
create trigger newsflow_record_review_event
after insert or update of decision or delete on public.newsflow_editorial_reviews
for each row execute function private.newsflow_record_review_event();

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
    and exists (
      select 1 from public.newsflow_editorial_members m
      where m.user_id = r.reviewer_user_id and m.active = true and m.role = 'editor'
    );

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

create or replace function private.newsflow_ranking_snapshot(target_candidate_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  consensus public.newsflow_editorial_consensus%rowtype;
  audience_count integer := 0;
  audience_sum numeric := 0;
  audience_boost numeric := 0;
begin
  select * into consensus
  from public.newsflow_editorial_consensus
  where candidate_id = target_candidate_id;

  select count(*), coalesce(sum(greatest(-1, least(1,
    f.preference::numeric
      + case when f.saved then 0.20 else 0 end
      - case when f.evidence_flag then 0.50 else 0 end
  ))), 0)
  into audience_count, audience_sum
  from public.signal_feedback f
  where f.signal_id = target_candidate_id
    and (f.preference <> 0 or f.saved or f.evidence_flag);

  -- A public crowd signal starts at three readers and is heavily damped. It can
  -- reorder close calls, never override evidence or the chief publication gate.
  if audience_count >= 3 then
    audience_boost := round(
      (audience_sum / audience_count)
      * (audience_count::numeric / (audience_count + 12))
      * 0.15,
      3
    );
  end if;

  return jsonb_build_object(
    'version', 'ranking-v2',
    'editorial_boost', coalesce(consensus.editorial_boost, 0),
    'editor_review_count', coalesce(consensus.editor_review_count, 0),
    'reader_boost', audience_boost,
    'reader_feedback_count', case when audience_count >= 3 then audience_count else 0 end,
    'reader_minimum', 3
  );
end;
$$;
revoke all on function private.newsflow_ranking_snapshot(text) from public, anon, authenticated, service_role;

create or replace function private.newsflow_refresh_adoption_ranking(target_candidate_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.newsflow_editorial_adoptions
  set publication = jsonb_set(
        coalesce(publication, '{}'::jsonb),
        '{ranking}',
        private.newsflow_ranking_snapshot(target_candidate_id),
        true
      ),
      updated_at = now()
  where candidate_id = target_candidate_id;
$$;
revoke all on function private.newsflow_refresh_adoption_ranking(text) from public, anon, authenticated, service_role;

create or replace function private.newsflow_after_review_ranking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_candidate text := coalesce(new.candidate_id, old.candidate_id);
begin
  perform private.newsflow_refresh_editorial_consensus(target_candidate);
  perform private.newsflow_refresh_adoption_ranking(target_candidate);
  return coalesce(new, old);
end;
$$;
revoke all on function private.newsflow_after_review_ranking() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_refresh_editorial_ranking on public.newsflow_editorial_reviews;
create trigger newsflow_refresh_editorial_ranking
after insert or update of decision or delete on public.newsflow_editorial_reviews
for each row execute function private.newsflow_after_review_ranking();

create or replace function private.newsflow_after_reader_feedback_ranking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.signal_id is distinct from new.signal_id then
    perform private.newsflow_refresh_adoption_ranking(old.signal_id);
  end if;
  perform private.newsflow_refresh_adoption_ranking(coalesce(new.signal_id, old.signal_id));
  return coalesce(new, old);
end;
$$;
revoke all on function private.newsflow_after_reader_feedback_ranking() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_refresh_reader_ranking on public.signal_feedback;
create trigger newsflow_refresh_reader_ranking
after insert or update or delete on public.signal_feedback
for each row execute function private.newsflow_after_reader_feedback_ranking();

-- Replace the publication snapshot so every adopted Signal carries a compact,
-- anonymous explanation of the ranking inputs.
create or replace function private.newsflow_publication_snapshot(target_candidate_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate public.newsflow_candidates%rowtype;
  direct_quality numeric;
  score_quality numeric;
  quality numeric;
begin
  select * into candidate from public.newsflow_candidates where candidate_id = target_candidate_id;
  if not found then
    raise exception 'NewsFlow candidate % not found for publication projection', target_candidate_id;
  end if;

  if coalesce(candidate.payload ->> 'quality_index', '') ~ '^[0-9]+([.][0-9]+)?$' then
    direct_quality := (candidate.payload ->> 'quality_index')::numeric;
  end if;
  select avg(value::numeric) * 2 into score_quality
  from jsonb_each_text(coalesce(candidate.payload -> 'scores', '{}'::jsonb))
  where value ~ '^[0-9]+([.][0-9]+)?$';
  quality := round(coalesce(nullif(direct_quality, 0), score_quality, 8.0), 1);

  return jsonb_build_object(
    'id', candidate.candidate_id,
    'channel_id', coalesce(nullif(candidate.payload ->> 'channel_id', ''), candidate.channel_id),
    'storyline_ids', case when jsonb_typeof(candidate.payload -> 'storyline_ids') = 'array' then candidate.payload -> 'storyline_ids' else to_jsonb(candidate.storyline_ids) end,
    'event_type', coalesce(nullif(candidate.payload ->> 'event_type', ''), candidate.event_type),
    'event_date', coalesce(nullif(candidate.payload ->> 'event_date', ''), to_char(candidate.published_at at time zone 'UTC', 'YYYY-MM-DD')),
    'title', coalesce(nullif(candidate.payload ->> 'title', ''), candidate.title),
    'url', coalesce(nullif(candidate.payload ->> 'url', ''), candidate.url),
    'source', coalesce(nullif(candidate.payload ->> 'source', ''), candidate.source),
    'published_at', coalesce(nullif(candidate.payload ->> 'published_at', ''), to_char(candidate.published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    'quality_index', quality,
    'source_tier', coalesce(nullif(candidate.payload ->> 'source_tier', ''), 'Tier B'),
    'short_summary', coalesce(nullif(candidate.payload ->> 'short_summary', ''), candidate.short_summary),
    'long_summary', coalesce(nullif(candidate.payload ->> 'long_summary', ''), nullif(candidate.payload ->> 'short_summary', ''), candidate.short_summary),
    'key_quote', coalesce(candidate.payload ->> 'key_quote', ''),
    'supporting_quotes', case when jsonb_typeof(candidate.payload -> 'supporting_quotes') = 'array' then candidate.payload -> 'supporting_quotes' else '[]'::jsonb end,
    'tags', case when jsonb_typeof(candidate.payload -> 'tags') = 'array' then candidate.payload -> 'tags' else '[]'::jsonb end,
    'ranking', private.newsflow_ranking_snapshot(target_candidate_id)
  );
end;
$$;
revoke all on function private.newsflow_publication_snapshot(text) from public, anon, authenticated, service_role;

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

  if exists (select 1 from public.newsflow_editorial_withdrawals where candidate_id = new.candidate_id) then
    delete from public.newsflow_editorial_adoptions where candidate_id = new.candidate_id;
  elsif new.decision in ('cover_story', 'accept') then
    insert into public.newsflow_editorial_adoptions (candidate_id, decision, decided_at, publication, updated_at)
    values (new.candidate_id, new.decision, new.decided_at, private.newsflow_publication_snapshot(new.candidate_id), now())
    on conflict (candidate_id) do update set
      decision = excluded.decision,
      decided_at = excluded.decided_at,
      publication = excluded.publication,
      updated_at = now();
  else
    delete from public.newsflow_editorial_adoptions where candidate_id = new.candidate_id;
  end if;
  return new;
end;
$$;
revoke all on function private.newsflow_sync_chief_adoption() from public, anon, authenticated, service_role;

create or replace function public.newsflow_withdraw_candidate(
  target_candidate_id text,
  withdrawal_reason text,
  withdrawal_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  chief_decision text;
begin
  if actor_id is null or not public.newsflow_is_authoritative_editor() then
    raise exception 'only the Editor-in-Chief may withdraw an adopted Signal' using errcode = '42501';
  end if;
  if withdrawal_reason not in ('evidence_update', 'factual_error', 'stale', 'editorial_judgment') then
    raise exception 'invalid withdrawal reason' using errcode = '22023';
  end if;
  if char_length(coalesce(withdrawal_note, '')) > 500 then
    raise exception 'withdrawal note is too long' using errcode = '22001';
  end if;

  select decision into chief_decision
  from public.newsflow_editorial_reviews
  where candidate_id = target_candidate_id and reviewer_user_id = actor_id;
  if chief_decision not in ('cover_story', 'accept') then
    raise exception 'candidate is not currently adopted by the Editor-in-Chief' using errcode = '23514';
  end if;

  insert into public.newsflow_editorial_withdrawals (candidate_id, withdrawn_by, reason_code, note, withdrawn_at, updated_at)
  values (target_candidate_id, actor_id, withdrawal_reason, coalesce(withdrawal_note, ''), now(), now())
  on conflict (candidate_id) do update set
    withdrawn_by = excluded.withdrawn_by,
    reason_code = excluded.reason_code,
    note = excluded.note,
    withdrawn_at = now(),
    updated_at = now();

  delete from public.newsflow_editorial_adoptions where candidate_id = target_candidate_id;
  update public.newsflow_candidates set active = false, synced_at = now() where candidate_id = target_candidate_id;
  insert into public.newsflow_editorial_events (
    candidate_id, actor_user_id, actor_role, event_type, decision, reason_code, note, occurred_at
  ) values (
    target_candidate_id, actor_id, 'editor_in_chief', 'withdrawn', chief_decision,
    withdrawal_reason, coalesce(withdrawal_note, ''), now()
  );
end;
$$;
revoke all on function public.newsflow_withdraw_candidate(text, text, text) from public, anon, service_role;
grant execute on function public.newsflow_withdraw_candidate(text, text, text) to authenticated;

create or replace function public.newsflow_restore_withdrawn_candidate(target_candidate_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  chief_decision text;
  chief_decided_at timestamptz;
begin
  if actor_id is null or not public.newsflow_is_authoritative_editor() then
    raise exception 'only the Editor-in-Chief may restore an adopted Signal' using errcode = '42501';
  end if;
  select decision, decided_at into chief_decision, chief_decided_at
  from public.newsflow_editorial_reviews
  where candidate_id = target_candidate_id and reviewer_user_id = actor_id;
  if chief_decision not in ('cover_story', 'accept') then
    raise exception 'candidate has no restorable chief adoption' using errcode = '23514';
  end if;
  if not exists (select 1 from public.newsflow_editorial_withdrawals where candidate_id = target_candidate_id) then
    raise exception 'candidate is not withdrawn' using errcode = '23514';
  end if;

  delete from public.newsflow_editorial_withdrawals where candidate_id = target_candidate_id;
  insert into public.newsflow_editorial_adoptions (candidate_id, decision, decided_at, publication, updated_at)
  values (target_candidate_id, chief_decision, chief_decided_at, private.newsflow_publication_snapshot(target_candidate_id), now())
  on conflict (candidate_id) do update set
    decision = excluded.decision,
    decided_at = excluded.decided_at,
    publication = excluded.publication,
    updated_at = now();
  update public.newsflow_candidates set active = false, synced_at = now() where candidate_id = target_candidate_id;
  insert into public.newsflow_editorial_events (
    candidate_id, actor_user_id, actor_role, event_type, decision, occurred_at
  ) values (target_candidate_id, actor_id, 'editor_in_chief', 'withdrawal_reversed', chief_decision, now());
end;
$$;
revoke all on function public.newsflow_restore_withdrawn_candidate(text) from public, anon, service_role;
grant execute on function public.newsflow_restore_withdrawn_candidate(text) to authenticated;

-- Seed current consensus and refresh existing adoption snapshots.
select private.newsflow_refresh_editorial_consensus(candidate_id)
from public.newsflow_candidates;
update public.newsflow_editorial_adoptions a
set publication = jsonb_set(
      coalesce(a.publication, '{}'::jsonb),
      '{ranking}',
      private.newsflow_ranking_snapshot(a.candidate_id),
      true
    ),
    updated_at = now();

comment on table public.newsflow_editorial_events is
  'Append-only low-frequency editorial audit; no exposure analytics and no publication authority.';
comment on table public.newsflow_editorial_consensus is
  'Bounded current editor consensus used only as a capped ranking input.';
comment on table public.newsflow_editorial_withdrawals is
  'One current chief withdrawal state per Candidate; history remains in editorial events.';

commit;
