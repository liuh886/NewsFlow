begin;

create table public.signal_catalog (
  edition_id text not null,
  signal_id text not null,
  channel_id text not null,
  published_at timestamptz not null,
  active boolean not null default true,
  synced_at timestamptz not null default now(),
  primary key (edition_id, signal_id),
  constraint signal_catalog_edition_id_length check (char_length(edition_id) between 1 and 100),
  constraint signal_catalog_signal_id_length check (char_length(signal_id) between 1 and 160),
  constraint signal_catalog_channel_id_length check (char_length(channel_id) between 1 and 100)
);

create table public.signal_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  edition_id text not null,
  signal_id text not null,
  saved boolean not null default false,
  preference smallint not null default 0,
  hidden boolean not null default false,
  reason_code text,
  evidence_flag boolean not null default false,
  client_id uuid not null,
  updated_at timestamptz not null,
  primary key (user_id, edition_id, signal_id),
  foreign key (edition_id, signal_id)
    references public.signal_catalog (edition_id, signal_id)
    on update cascade
    on delete cascade,
  constraint signal_feedback_preference check (preference between -1 and 1),
  constraint signal_feedback_reason check (
    reason_code is null or reason_code in (
      'not_interested',
      'already_known',
      'too_shallow',
      'too_late'
    )
  )
);

create table public.reader_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  edition_id text not null,
  policy_version text not null,
  feedback_count integer not null default 0,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null,
  primary key (user_id, edition_id),
  constraint reader_profiles_feedback_count check (feedback_count >= 0),
  constraint reader_profiles_size check (octet_length(profile::text) <= 65536)
);

alter table public.signal_catalog enable row level security;
alter table public.signal_feedback enable row level security;
alter table public.reader_profiles enable row level security;

alter table public.signal_catalog force row level security;
alter table public.signal_feedback force row level security;
alter table public.reader_profiles force row level security;

revoke all on table public.signal_catalog from anon, authenticated;
revoke all on table public.signal_feedback from anon, authenticated;
revoke all on table public.reader_profiles from anon, authenticated;

grant select on table public.signal_catalog to authenticated;
grant select, insert, update, delete on table public.signal_feedback to authenticated;
grant select, insert, update, delete on table public.reader_profiles to authenticated;

create policy "Authenticated readers can view the Signal catalog"
on public.signal_catalog
for select
to authenticated
using (true);

create policy "Readers can view their own feedback"
on public.signal_feedback
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Readers can insert their own feedback"
on public.signal_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Readers can update their own feedback"
on public.signal_feedback
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Readers can delete their own feedback"
on public.signal_feedback
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Readers can view their own profile"
on public.reader_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Readers can insert their own profile"
on public.reader_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Readers can update their own profile"
on public.reader_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Readers can delete their own profile"
on public.reader_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.signal_catalog is 'Repository-controlled allowlist for bounded reader feedback.';
comment on table public.signal_feedback is 'One current feedback state per reader and Signal; no high-frequency analytics.';
comment on table public.reader_profiles is 'Generated recommendation state; never factual or editorial authority.';

commit;
