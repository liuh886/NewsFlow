begin;

-- Free-plan feedback keeps only the latest explicit state. Learned profiles are
-- derived in the browser/local Agent and never consume database rows.
drop table if exists public.reader_profiles;

alter table public.signal_feedback
  drop constraint if exists signal_feedback_edition_id_signal_id_fkey;

drop table if exists public.signal_catalog cascade;

alter table public.signal_feedback
  drop column if exists client_id;

delete from public.signal_feedback
where saved = false
  and preference = 0
  and hidden = false
  and reason_code is null
  and evidence_flag = false;

alter table public.signal_feedback
  alter column updated_at set default now();

alter table public.signal_feedback
  drop constraint if exists signal_feedback_signal_id_length;
alter table public.signal_feedback
  add constraint signal_feedback_signal_id_length
  check (char_length(signal_id) between 1 and 160);

alter table public.signal_feedback
  drop constraint if exists signal_feedback_edition_id_length;
alter table public.signal_feedback
  add constraint signal_feedback_edition_id_length
  check (char_length(edition_id) between 1 and 100);

alter table public.signal_feedback
  drop constraint if exists signal_feedback_reason_matches_preference;
alter table public.signal_feedback
  add constraint signal_feedback_reason_matches_preference
  check (reason_code is null or preference = -1);

alter table public.signal_feedback
  drop constraint if exists signal_feedback_non_neutral;
alter table public.signal_feedback
  add constraint signal_feedback_non_neutral
  check (saved or preference <> 0 or hidden or reason_code is not null or evidence_flag);

create schema if not exists private;
revoke all on schema private from public, anon;

create or replace function private.newsflow_prepare_signal_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing_rows integer;
begin
  if actor_id is null or actor_id <> new.user_id then
    raise exception 'feedback owner must match the authenticated user' using errcode = '42501';
  end if;

  new.updated_at := now();

  if tg_op = 'INSERT'
    and not exists (
      select 1
      from public.signal_feedback
      where user_id = new.user_id
        and edition_id = new.edition_id
        and signal_id = new.signal_id
    ) then
    select count(*) into existing_rows
    from public.signal_feedback
    where user_id = new.user_id;

    if existing_rows >= 256 then
      raise exception 'feedback row limit reached' using errcode = '54000';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.newsflow_prepare_signal_feedback() from public, anon, authenticated, service_role;

drop trigger if exists newsflow_prepare_signal_feedback on public.signal_feedback;
create trigger newsflow_prepare_signal_feedback
before insert or update on public.signal_feedback
for each row execute function private.newsflow_prepare_signal_feedback();

revoke all on table public.signal_feedback from anon, authenticated;
grant select, insert, update, delete on table public.signal_feedback to authenticated;

comment on table public.signal_feedback is
  'Bounded current reader feedback state: at most 256 non-neutral rows per account; no exposure analytics or server profile.';

commit;
