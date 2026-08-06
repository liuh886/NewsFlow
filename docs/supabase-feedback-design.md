# Supabase feedback sync for the Free plan

This is the optional cloud phase of the NewsFlow feedback loop. Its schema, browser client, local outbox and Pages deployment bridge are implemented. It is disabled by default because this repository does not contain a Supabase project URL or key.

## Design objective

Use Supabase Auth for identity and Postgres for cross-device current state while keeping GitHub as the editorial source of truth. A Supabase outage, free-project pause or quota limit must not prevent reading, local hiding, local feedback or JSON export.

## Store state, not exhaust

Do not upload page views, scroll events, dwell-time heartbeats, repeated impressions, source text, titles, summaries or evidence excerpts.

Use three bounded relations:

1. `signal_catalog`: valid Signal IDs and Edition IDs synchronized from the repository. The browser receives read-only access. Feedback rows reference this catalog, preventing arbitrary Signal IDs from filling the database.
2. `signal_feedback`: one current row per `(user_id, edition_id, signal_id)`. Repeated actions use `upsert`; they do not append rows. Suggested fields are `saved`, `preference`, `hidden`, `reason_code`, `evidence_flag` and `updated_at`.
3. `reader_profiles`: one generated JSON profile per `(user_id, edition_id)`. It is ranking state, not factual evidence.

Do not create a cloud raw-event table in the Free-plan phase. Keep the detailed append-only events in the browser and exported repository audit. If historical online evaluation later becomes necessary, add a sampled event table with a short retention period only after measuring actual volume.

## Write pattern

- Persist every action immediately to the local outbox.
- Debounce cloud writes for five seconds and upsert at most 20 rows per request.
- Sync on sign-in, app start, explicit retry and after a deliberate feedback action.
- Do not use Realtime subscriptions, Storage or one Edge Function invocation per event.
- Merge by `updated_at`; a later local state wins. Keep local export available after successful sync.
- Namespace browser feedback by authenticated user. Anonymous history may be adopted by the first account on that browser, but later account switches must not reuse another account's local state or pending outbox.
- Clearing the cloud copy suspends automatic snapshot re-upload for that account until the reader creates a new deliberate feedback action.

## Authentication

For this GitHub-hosted PWA, GitHub OAuth is the economical default. It avoids relying on the hosted trial email sender. If email/password or magic links are added, configure a production SMTP provider before opening registration.

Use only the project URL and a Supabase publishable key in the public client. A publishable key identifies the project but does not grant ownership by itself. Never expose a secret or `service_role` key; keep catalog synchronization credentials in GitHub Actions secrets.

## Required authorization

Every table exposed through the Data API must have Row Level Security enabled.

- `signal_catalog`: authenticated users may select; they cannot insert, update or delete.
- `signal_feedback`: authenticated users may select, insert, update and delete only where `(select auth.uid()) = user_id`.
- `reader_profiles`: the same ownership predicate applies.
- UPDATE policies require both `USING` and `WITH CHECK`, and UPDATE also needs a SELECT policy.
- Index `user_id` or make it the leading part of the primary key because it is used in every ownership policy.
- Do not authorize from user-editable metadata.

Run Supabase database and security advisors after applying the eventual migration.

## Capacity guardrails

- Set an internal operating ceiling well below the provider quota; start with 100,000 feedback rows and alert at 60%, 75% and 90% of that ceiling.
- Keep only current feedback state, so storage grows with distinct user–Signal pairs rather than clicks.
- Disable public anonymous writes. Require verified accounts and apply Auth abuse controls before wider release.
- Keep a repository-side export of the Signal catalog so the cloud table can be rebuilt.
- Expect a Free project to pause after inactivity; always degrade to local mode without an error loop.

## Activation checklist

The repository already contains the CLI-generated migration at `supabase/migrations/20260803232713_create_newsflow_feedback.sql`. To activate it:

1. Link the CLI to the intended development project and apply the migration. With Docker running, execute `npm run supabase:test` and `npm run supabase:advisors`; the pgTAP suite exercises two-user ownership isolation and anonymous denial.
2. In Supabase Auth, enable GitHub and add the exact production Pages URL plus the local `http://localhost:4173` URL to the redirect allow list. Add the Supabase callback URL to the GitHub OAuth App.
3. Create GitHub repository variables `NEWSFLOW_SUPABASE_URL` and `NEWSFLOW_SUPABASE_PUBLISHABLE_KEY`. The Pages build writes these public values into `dist/data/supabase-config.json`; never put a secret key there.
4. Create the repository secret `SUPABASE_SERVICE_ROLE_KEY`. It is consumed only by `scripts/sync-supabase-catalog.mjs` in CI to maintain the bounded Signal allowlist.
5. Push the current catalog once with `npm run supabase:catalog`, then verify offline, sign-out, clear-cloud and two-account RLS behavior before wider release.

Catalog synchronization is deliberately non-blocking in the Pages workflow: if a Free project is paused or temporarily unavailable, the static publication still deploys and feedback remains in the browser outbox for a later retry.

For a local production-like build:

```powershell
$env:NEWSFLOW_SUPABASE_URL='https://PROJECT_REF.supabase.co'
$env:NEWSFLOW_SUPABASE_PUBLISHABLE_KEY='sb_publishable_REPLACE_ME'
npm run build
```

The source config remains disabled; only the generated `dist` config is activated. A partial pair of deployment variables fails the build instead of silently producing a broken login.
