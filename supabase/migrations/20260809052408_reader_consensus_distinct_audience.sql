begin;

-- A Signal can recur across Editions, while feedback is stored as one current
-- row per reader + Edition + Signal. Collapse those rows to each reader's most
-- recent stance before enforcing the three-reader public-consensus threshold.
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

  with latest_reader_stance as (
    select distinct on (f.user_id)
      f.user_id,
      greatest(-1, least(1,
        f.preference::numeric
          + case when f.saved then 0.20 else 0 end
          - case when f.evidence_flag then 0.50 else 0 end
      )) as stance
    from public.signal_feedback f
    where f.signal_id = target_candidate_id
      and (f.preference <> 0 or f.saved or f.evidence_flag)
    order by f.user_id, f.updated_at desc, f.edition_id desc
  )
  select count(*), coalesce(sum(stance), 0)
  into audience_count, audience_sum
  from latest_reader_stance;

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

select private.newsflow_refresh_adoption_ranking(candidate_id)
from public.newsflow_editorial_adoptions;

comment on function private.newsflow_ranking_snapshot(text) is
  'Returns bounded anonymous ranking inputs; recurring Edition feedback is reduced to one latest stance per reader.';

commit;
