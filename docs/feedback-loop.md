# Adaptive recommendation feedback loop

NewsFlow uses local-first explicit feedback to improve recommendation without confusing preference with truth.

## GitHub Pages boundary

GitHub Pages serves static HTML, CSS and JavaScript. It does not provide an application database or a trusted server process that can append reader events to the repository. The PWA must not embed a GitHub personal access token or pretend that a service worker can create a backend.

The reference implementation therefore stores feedback in the browser's origin-scoped `localStorage`. It works offline and persists across ordinary browser restarts, but it remains local to that browser profile and can be cleared by the user or browser. The feedback center states this boundary explicitly.

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

## Future synchronization

Cross-device automatic synchronization requires a real authenticated write endpoint, such as a small serverless function plus a database. Background Sync may later retry delivery, but it does not replace that endpoint and has uneven browser support. Any remote phase should add consent, retention and deletion controls before collecting data.

The recommended optional backend is Supabase Auth plus a compact current-state table. It deliberately avoids uploading high-frequency analytics. See `docs/supabase-feedback-design.md` for the Free-plan schema, RLS and capacity guardrails.
