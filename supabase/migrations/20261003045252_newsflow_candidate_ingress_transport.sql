create table public.newsflow_candidate_ingress (
  request_id text primary key,
  payload_text text not null,
  payload_sha256 text not null,
  payload_bytes integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  claimed_at timestamptz,
  consumed_at timestamptz,
  failed_at timestamptz,
  error_code text,
  constraint newsflow_candidate_ingress_request_id_check
    check (request_id ~ '^[A-Za-z0-9_-]{8,80}$'),
  constraint newsflow_candidate_ingress_sha256_check
    check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  constraint newsflow_candidate_ingress_bytes_check
    check (payload_bytes between 1 and 32768),
  constraint newsflow_candidate_ingress_payload_bytes_match
    check (payload_bytes = octet_length(payload_text)),
  constraint newsflow_candidate_ingress_payload_sha256_match
    check (payload_sha256 = encode(extensions.digest(payload_text, 'sha256'), 'hex')),
  constraint newsflow_candidate_ingress_status_check
    check (status in ('pending', 'claimed', 'consumed', 'failed')),
  constraint newsflow_candidate_ingress_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '48 hours'),
  constraint newsflow_candidate_ingress_error_code_check
    check (error_code is null or error_code ~ '^[a-z0-9_]{1,80}$')
);

alter table public.newsflow_candidate_ingress enable row level security;

revoke all on table public.newsflow_candidate_ingress from anon, authenticated, service_role;
grant select, update, delete on table public.newsflow_candidate_ingress to service_role;

create policy "Service role manages NewsFlow candidate ingress"
  on public.newsflow_candidate_ingress
  for all
  to service_role
  using (true)
  with check (true);

create index newsflow_candidate_ingress_status_expiry_idx
  on public.newsflow_candidate_ingress (status, expires_at);
