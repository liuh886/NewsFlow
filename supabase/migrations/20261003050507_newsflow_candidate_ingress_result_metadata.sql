alter table public.newsflow_candidate_ingress
  add column payload_type text,
  add column candidate_count integer,
  add column reviewable_count integer,
  add column audit_path text,
  add column result_at timestamptz;

alter table public.newsflow_candidate_ingress
  add constraint newsflow_candidate_ingress_payload_type_check
    check (payload_type is null or payload_type in ('candidate_pack','single_candidate','ndjson','json_object','json_array','json_scalar')),
  add constraint newsflow_candidate_ingress_candidate_count_check
    check (candidate_count is null or candidate_count >= 0),
  add constraint newsflow_candidate_ingress_reviewable_count_check
    check (reviewable_count is null or reviewable_count >= 0),
  add constraint newsflow_candidate_ingress_audit_path_check
    check (audit_path is null or audit_path ~ '^content/runs/[A-Za-z0-9._-]+[.]json$');
