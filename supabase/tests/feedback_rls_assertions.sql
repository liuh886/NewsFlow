begin;

do $$
begin
  if to_regclass('public.signal_feedback') is null then
    raise exception 'signal_feedback table is missing';
  end if;
  if to_regclass('public.signal_catalog') is not null then
    raise exception 'signal_catalog must not exist in the Free-plan schema';
  end if;
  if to_regclass('public.reader_profiles') is not null then
    raise exception 'reader_profiles must not exist in the Free-plan schema';
  end if;
end;
$$;

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'newsflow-rls-a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'newsflow-rls-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.signal_feedback (user_id, edition_id, signal_id, preference)
values (
  '11111111-1111-4111-8111-111111111111',
  'frontier-systems-review',
  'owned-signal',
  1
);

do $$
declare
  visible_rows integer;
  changed_rows integer;
begin
  select count(*) into visible_rows from public.signal_feedback;
  if visible_rows <> 1 then
    raise exception 'reader must see exactly one owned row, saw %', visible_rows;
  end if;

  update public.signal_feedback
  set saved = true
  where user_id = '22222222-2222-4222-8222-222222222222';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'reader updated another account row';
  end if;

  begin
    insert into public.signal_feedback (user_id, edition_id, signal_id, preference)
    values (
      '22222222-2222-4222-8222-222222222222',
      'frontier-systems-review',
      'foreign-signal',
      -1
    );
    raise exception 'reader inserted feedback for another account';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.signal_feedback (user_id, edition_id, signal_id)
    values (
      '11111111-1111-4111-8111-111111111111',
      'frontier-systems-review',
      'neutral-signal'
    );
    raise exception 'neutral feedback row was accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

insert into public.signal_feedback (user_id, edition_id, signal_id, preference)
select
  '11111111-1111-4111-8111-111111111111',
  'frontier-systems-review',
  'bounded-' || value,
  1
from generate_series(1, 255) as value;

do $$
begin
  begin
    insert into public.signal_feedback (user_id, edition_id, signal_id, preference)
    values (
      '11111111-1111-4111-8111-111111111111',
      'frontier-systems-review',
      'over-limit',
      1
    );
    raise exception 'feedback row cap was not enforced';
  exception when sqlstate '54000' then
    null;
  end;
end;
$$;

reset role;
set local role anon;

do $$
begin
  begin
    perform count(*) from public.signal_feedback;
    raise exception 'anonymous reader accessed signal_feedback';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select 'feedback_rls_assertions_passed' as result;
rollback;
