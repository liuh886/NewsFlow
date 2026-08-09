# Adaptive recommendation feedback loop

NewsFlow uses local-first explicit feedback to improve recommendation without confusing preference with truth.

## GitHub Pages boundary

GitHub Pages serves static HTML, CSS and JavaScript. It does not provide an application database or a trusted server process that can append reader events to the repository. The PWA must not embed a GitHub personal access token or pretend that a service worker can create a backend.

The reference implementation writes feedback to origin-scoped `localStorage` first. It works offline and persists across ordinary browser restarts. Signed-in readers may additionally synchronize a bounded current-state copy through Supabase; failure of that optional copy never blocks local use.

## Feedback semantics

- `useful`: positive preference evidence.
- `bookmark` / `unbookmark`: weaker explicit preference evidence.
- `not_interested`: negative preference evidence and local hiding.
- `hide`: remove from the local feed without interpreting the topic as unwanted.
- `restore`: reverse a specific hide or negative event.
- `already_known`, `too_shallow`, `too_late`: future structured negative reasons.
- `evidence_issue`: a quality-review flag, never a preference weight.

“Delete” means a local tombstone. It does not remove the public Signal or alter the Edition's evidence history.

## Agent bridge

The feedback center exports a schema-versioned JSON file with no account identifier. Import it in two stages:

```bash
node skills/newsflow-recommender/scripts/import-feedback.mjs --input=<newsflow-feedback.json>
node skills/newsflow-recommender/scripts/import-feedback.mjs --input=<newsflow-feedback.json> --apply
node skills/newsflow-recommender/scripts/build-profile.mjs --apply
node skills/newsflow-recommender/scripts/rank-signals.mjs --limit=10
```

The importer rejects unexpected fields, invalid dates and unsupported actions, then deduplicates by event ID. Raw events remain the audit record; the reader profile is regenerated state.

## Account synchronization

Supabase Auth and owner-only RLS provide the authenticated write boundary. The browser debounces explicit actions, upserts only current state and deletes neutral rows. It does not upload passive behavioral analytics or rely on Background Sync, Realtime, Storage or Edge Functions.

After three preference-bearing actions, the Reader uses the synchronized/local state to reorder already-published Signals. An authorized local Agent may run `npm run feedback:refresh` to generate a private local profile before research. Preference may change search priority and ranking, but never evidence validity or publication authority. See `docs/supabase-feedback-design.md` for the Free-plan schema, RLS and capacity guardrails.
