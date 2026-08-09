# Input map

## Research and update

Read every `required_inputs` entry in `/config/content-workflow.json`, then execute `/WORKFLOW.md`. Prefer gitignored `/content/state/reader-profile.local.json` when available; otherwise use `/content/state/reader-profile.json`. Profiles only prioritize search and rank evidence that already passed the quality gates.

## Feedback ingestion

Read:

- `/config/recommendation-policy.json`
- the exported `newsflow-feedback-*.json`
- `/content/feedback/events.json`

Run:

```bash
node skills/newsflow-recommender/scripts/import-feedback.mjs --input=<export.json>
node skills/newsflow-recommender/scripts/import-feedback.mjs --input=<export.json> --apply
```

The first command is a dry-run. Never import unexpected fields or personally identifying data.

## Preference learning

Read `/config/recommendation-policy.json`, `/content/feedback/events.json` and `/public/data/news.json`.

Run:

```bash
node skills/newsflow-recommender/scripts/build-profile.mjs
node skills/newsflow-recommender/scripts/build-profile.mjs --apply
```

The profile is generated state, not editorial authority.

When private Supabase access is explicitly authorized, refresh the bounded cloud snapshot and private local profile before research:

```bash
npm run feedback:refresh
```

This command uses the same local `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` needed for Candidate persistence. It selects no user identifiers, writes the current-state snapshot under gitignored `content/feedback/cloud/`, and writes the learned profile to gitignored `content/state/reader-profile.local.json`.

## Ranking

Read the generated profile and current Signals, then run:

```bash
npm run feedback:rank:local
```

Ranking cannot restore a Signal rejected by the content validator.

## Governance evaluation

Read the immutable events, generated profile, run audits and current policy. Separate:

- preference feedback from factual corrections;
- exposure from response, so unseen items are not counted as dislikes;
- short-term topic interest from durable editorial intent;
- proposed policy changes from automatically generated state.

For Supabase activation or review, additionally read `/docs/supabase-feedback-design.md`. Keep cloud sync optional and local-first; do not connect a remote project or create credentials without explicit authorization.
