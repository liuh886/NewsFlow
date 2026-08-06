begin;
select plan(11);

select has_table('public', 'signal_catalog', 'Signal catalog exists');
select has_table('public', 'signal_feedback', 'Feedback state exists');
select has_table('public', 'reader_profiles', 'Reader profile exists');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'reader-a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'reader-b@example.invalid');

insert into public.signal_catalog (edition_id, signal_id, channel_id, published_at)
values
  ('frontier-systems-review', 'signal-a', 'ai-infrastructure', now()),
  ('frontier-systems-review', 'signal-b', 'ccus-energy-transition', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.signal_feedback (
      user_id, edition_id, signal_id, preference, client_id, updated_at
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'frontier-systems-review',
      'signal-a',
      1,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      now()
    )$$,
  'Authenticated reader can insert owned feedback'
);

select throws_ok(
  $$insert into public.signal_feedback (
      user_id, edition_id, signal_id, preference, client_id, updated_at
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'frontier-systems-review',
      'signal-b',
      -1,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      now()
  )$$,
  '42501',
  null,
  'Reader cannot insert feedback for another account'
);

reset role;
insert into public.signal_feedback (
  user_id, edition_id, signal_id, preference, client_id, updated_at
) values (
  '22222222-2222-4222-8222-222222222222',
  'frontier-systems-review',
  'signal-b',
  -1,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  now()
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

select lives_ok(
  $$insert into public.reader_profiles (
      user_id, edition_id, policy_version, feedback_count, profile, updated_at
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'frontier-systems-review',
      '1.0.0',
      1,
      '{"channels":{"ai-infrastructure":1}}'::jsonb,
      now()
    )$$,
  'Reader can insert an owned profile'
);

select throws_ok(
  $$insert into public.reader_profiles (
      user_id, edition_id, policy_version, feedback_count, profile, updated_at
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'frontier-systems-review',
      '1.0.0',
      1,
      '{}'::jsonb,
      now()
  )$$,
  '42501',
  null,
  'Reader cannot insert a profile for another account'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.signal_catalog$$,
  '42501',
  null,
  'Anonymous clients cannot read the catalog'
);

select * from finish();
rollback;
