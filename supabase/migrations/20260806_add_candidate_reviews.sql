begin;

create table public.candidate_reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  candidate_id text not null,
  edition_id text not null,
  verdict text not null check (verdict in ('accept', 'reject', 'skip')),
  reviewed_at timestamptz not null default now(),
  client_id uuid not null,
  primary key (user_id, candidate_id),
  constraint candidate_reviews_candidate_id_length check (char_length(candidate_id) between 1 and 160),
  constraint candidate_reviews_edition_id_length check (char_length(edition_id) between 1 and 100)
);

alter table public.candidate_reviews enable row level security;
alter table public.candidate_reviews force row level security;

revoke all on table public.candidate_reviews from anon, authenticated;

grant select, insert, update on table public.candidate_reviews to authenticated;

create policy "Reviewers can view their own reviews"
  on public.candidate_reviews
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Reviewers can insert their own reviews"
  on public.candidate_reviews
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Reviewers can update their own reviews"
  on public.candidate_reviews
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.candidate_reviews is 'One review per user and candidate. Candidates are pending-review items, not yet in signal_catalog.';

commit;
