-- NewsFlow public publication projection.
-- Chief decisions remain private workflow events; this table exposes only the
-- sanitized article snapshot that GitHub publication sync is allowed to read.

alter table public.newsflow_editorial_adoptions
  add column if not exists publication jsonb not null default '{}'::jsonb;

alter table public.newsflow_editorial_adoptions
  drop constraint if exists newsflow_editorial_adoptions_publication_object;
alter table public.newsflow_editorial_adoptions
  add constraint newsflow_editorial_adoptions_publication_object
  check (jsonb_typeof(publication) = 'object');

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
  select * into candidate
  from public.newsflow_candidates
  where candidate_id = target_candidate_id;

  if not found then
    raise exception 'NewsFlow candidate % not found for publication projection', target_candidate_id;
  end if;

  if coalesce(candidate.payload ->> 'quality_index', '') ~ '^[0-9]+([.][0-9]+)?$' then
    direct_quality := (candidate.payload ->> 'quality_index')::numeric;
  end if;

  select avg(value::numeric) * 2
  into score_quality
  from jsonb_each_text(coalesce(candidate.payload -> 'scores', '{}'::jsonb))
  where value ~ '^[0-9]+([.][0-9]+)?$';

  quality := round(coalesce(nullif(direct_quality, 0), score_quality, 8.0), 1);

  return jsonb_build_object(
    'id', candidate.candidate_id,
    'channel_id', coalesce(nullif(candidate.payload ->> 'channel_id', ''), candidate.channel_id),
    'storyline_ids', case
      when jsonb_typeof(candidate.payload -> 'storyline_ids') = 'array' then candidate.payload -> 'storyline_ids'
      else to_jsonb(candidate.storyline_ids)
    end,
    'event_type', coalesce(nullif(candidate.payload ->> 'event_type', ''), candidate.event_type),
    'event_date', coalesce(
      nullif(candidate.payload ->> 'event_date', ''),
      to_char(candidate.published_at at time zone 'UTC', 'YYYY-MM-DD')
    ),
    'title', coalesce(nullif(candidate.payload ->> 'title', ''), candidate.title),
    'url', coalesce(nullif(candidate.payload ->> 'url', ''), candidate.url),
    'source', coalesce(nullif(candidate.payload ->> 'source', ''), candidate.source),
    'published_at', coalesce(
      nullif(candidate.payload ->> 'published_at', ''),
      to_char(candidate.published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    'quality_index', quality,
    'source_tier', coalesce(nullif(candidate.payload ->> 'source_tier', ''), 'Tier B'),
    'short_summary', coalesce(nullif(candidate.payload ->> 'short_summary', ''), candidate.short_summary),
    'long_summary', coalesce(nullif(candidate.payload ->> 'long_summary', ''), nullif(candidate.payload ->> 'short_summary', ''), candidate.short_summary),
    'key_quote', coalesce(candidate.payload ->> 'key_quote', ''),
    'supporting_quotes', case
      when jsonb_typeof(candidate.payload -> 'supporting_quotes') = 'array' then candidate.payload -> 'supporting_quotes'
      else '[]'::jsonb
    end,
    'tags', case
      when jsonb_typeof(candidate.payload -> 'tags') = 'array' then candidate.payload -> 'tags'
      else '[]'::jsonb
    end
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

  if new.decision in ('cover_story', 'accept') then
    insert into public.newsflow_editorial_adoptions (candidate_id, decision, decided_at, publication, updated_at)
    values (
      new.candidate_id,
      new.decision,
      new.decided_at,
      private.newsflow_publication_snapshot(new.candidate_id),
      now()
    )
    on conflict (candidate_id) do update
      set decision = excluded.decision,
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

update public.newsflow_editorial_adoptions
set publication = private.newsflow_publication_snapshot(candidate_id),
    updated_at = now();
