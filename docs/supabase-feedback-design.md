# Supabase feedback sync on the Free plan

NewsFlow uses Supabase only for authenticated cross-device **current state**. GitHub remains the editorial system of record, and the browser remains usable when Supabase is unavailable or paused.

## Storage budget

The live feedback schema contains one table: `public.signal_feedback`.

- One row per `(user_id, edition_id, signal_id)`; repeated actions overwrite that row.
- A database trigger limits each account to 256 non-neutral rows.
- Returning a Signal to a neutral state deletes the row.
- No page views, impressions, scroll depth, dwell time, source text, titles or summaries are uploaded.
- No Realtime subscriptions, Storage, Edge Functions, catalog mirror, raw-event table or server-side profile table are used.
- Learned profiles are calculated in the browser or in a gitignored local Agent file.

This makes database growth proportional to readers who deliberately provide feedback, rather than traffic volume.

## Security boundary

`signal_feedback` has Row Level Security enabled and forced. Authenticated readers may select, insert, update and delete only rows where `(select auth.uid()) = user_id`. Anonymous users have no table privileges. A private trigger verifies the owner again, assigns server time and enforces the row cap.

The public PWA receives only the Supabase project URL and publishable key. These values identify the project but do not bypass grants or RLS. Never expose a secret key or `service_role` key in Pages, JavaScript, repository variables or workflow logs.

## Runtime flow

1. Every deliberate action is written to local storage immediately.
2. When signed in, the browser debounces for eight seconds and upserts at most 12 rows per request.
3. Neutral states are deleted instead of retained.
4. On login or explicit synchronization, the user reads only their own current rows.
5. After three preference-bearing actions, the Reader ranks eligible public Signals using quality, freshness and bounded preference affinity.
6. Feedback never changes public facts, source policy, Edition judgment or the Editor-in-Chief publication gate.

## Agent bridge

An authorized local Agent may run:

```powershell
$env:SUPABASE_URL='https://PROJECT_REF.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY='LOCAL_SECRET_ONLY'
npm run feedback:refresh
npm run feedback:rank:local
```

`feedback:refresh` selects no user identifier. It creates a transient current-state snapshot under gitignored `content/feedback/cloud/` and a gitignored learned profile. The Agent may use that profile to prioritize search and rank already-qualified evidence; it may not weaken evidence gates or publish.

## Deployment

Apply the migrations in timestamp order and run the RLS tests before enabling Pages:

```bash
npx supabase login
npx supabase link --project-ref blgwlycfcwvsupmqyqwn
npx supabase db push
npx supabase test db
```

Then configure these GitHub repository variables:

- `NEWSFLOW_SUPABASE_URL`
- `NEWSFLOW_SUPABASE_PUBLISHABLE_KEY`

The committed `public/data/supabase-config.json` deliberately stays disabled and credential-free. The sole Pages build injects those public deployment values into `dist/data/supabase-config.json`.

Configure the Supabase Auth redirect allowlist for both the production Pages URL and local preview. GitHub OAuth is the economical default; do not depend on the trial email sender for production authentication.

## Verification

Verify all four boundaries after deployment:

1. Anonymous REST access to `signal_feedback` is denied.
2. User A cannot read or mutate User B's row.
3. An authenticated upsert appears on a second signed-in device.
4. The deployed `data/supabase-config.json` is enabled while the committed source file remains disabled.

If Supabase is unavailable, Reader feedback must continue locally and the public publication experience must remain readable.
