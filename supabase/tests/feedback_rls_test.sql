begin;
select plan(10);

select has_table('public', 'signal_feedback', 'Feedback state exists');
select hasnt_table('public', 'signal_catalog', 'Free-plan schema has no catalog mirror');
select hasnt_table('public', 'reader_profiles', 'Profiles are generated outside Postgres');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'reader-a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'reader-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.signal_feedback (
      user_id, edition_id, signal_id, preference
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'frontier-systems-review',
      'signal-a',
      1
    )$$,
  'Authenticated reader can insert owned feedback'
);

select throws_ok(
  $$insert into public.signal_feedback (
      user_id, edition_id, signal_id, preference
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'frontier-systems-review',
      'signal-b',
      -1
  )$$,
  '42501',
  null,
  'Reader cannot insert feedback for another account'
);

reset role;
insert into public.signal_feedback (
  user_id, edition_id, signal_id, preference
) values (
  '22222222-2222-4222-8222-222222222222',
  'frontier-systems-review',
  'signal-b',
  -1
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.signal_feedback),
  1,
  'Reader sees only owned feedback'
);

select lives_ok(
  $$update public.signal_feedback set saved = true
    where edition_id = 'frontier-systems-review' and signal_id = 'signal-a'$$,
  'Reader can update owned feedback'
);

select is_empty(
  $$update public.signal_feedback set saved = true
    where edition_id = 'frontier-systems-review' and signal_id = 'signal-b'
    returning signal_id$$,
  'Reader cannot update another account feedback'
);

select throws_ok(
  $$insert into public.signal_feedback (
      user_id, edition_id, signal_id
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'frontier-systems-review',
      'neutral-signal'
  )$$,
  '23514',
  null,
  'Neutral rows cannot consume free-plan capacity'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.signal_feedback$$,
  '42501',
  null,
  'Anonymous clients cannot read the catalog'
);

select * from finish();
rollback;
