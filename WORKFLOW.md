# NewsFlow portable content-update workflow

This is the canonical, vendor-neutral procedure for updating NewsFlow evidence. Candidate packs conform to `schemas/content-candidate-pack.schema.json`; the machine-readable companion is `config/content-workflow.json`.

## One publication boundary

NewsFlow has one decisive publication gate:

> **Only the Editor-in-Chief decides what becomes NewsFlow public content.**

The stages are deliberately separate:

1. automated/manual research discovers and verifies evidence;
2. deterministic preflight decides whether an item is fit to become a **private Candidate**;
3. Editors produce advisory five-state opinions;
4. the Editor-in-Chief produces the final five-state decision;
5. only chief **封面文章 / 录用** becomes public adoption;
6. adopted Signals enter Reader Latest and can later freeze into a formal Issue.

A content-pipeline `accepted` result therefore means only **passed preflight for editorial review**. It never means Reader publication.

## Authority order

1. `public/data/edition.json` is the single canonical Edition constitution.
2. `config/content-workflow.json` defines the evidence-processing contract.
3. `config/content-sources.json`, discovery and scout registries define search/verification boundaries.
4. the JSON Schema defines the candidate exchange format.
5. `scripts/update-content.mjs` is a deterministic, read-only evaluator.
6. `scripts/apply-content.mjs` records reviewable Candidates and the run audit; it cannot publish.
7. Supabase `newsflow_candidates` is the private online Candidate catalog.
8. Supabase `newsflow_editorial_reviews` stores normalized Editor/Chief five-state records.
9. only the active owner / Editor-in-Chief review can create `newsflow_editorial_adoptions`.
10. `scripts/sync-adopted-signals.mjs` promotes chief-adopted Candidates to public Latest.
11. `scripts/publish-edition.mjs` freezes the 1st/15th formal Issue.
12. Agent-specific adapters may not weaken or extend this chain.

If two layers conflict, stop before applying and report the conflict.

## Procedure

### 1. Establish the run

- Read `public/data/edition.json`, current public Signals, Storylines and every `required_inputs` file.
- Reader profile can prioritize search only; it may never weaken sourcing/evidence thresholds.
- Declare `as_of`, `coverage_start`, `coverage_end` and `Asia/Shanghai` before searching.
- Record the required actor fields exactly.

### 2. Discover broadly, verify narrowly

- Search every active Storyline using normal and counter-evidence queries.
- Prefer primary records; use registered institutional/mainstream sources for context or corroboration.
- Social scouts are discovery-only; follow them to canonical evidence.
- Access full source material and verify dates, version, cutoff, methodology and project status where relevant.

### 3. Earn editorial attention

- Compare against existing **public** Signals and state the information delta.
- Score facts, source, timeliness, news quality and industry impact.
- Reject immaterial/repeated items.
- A zero-candidate pack is valid.

### 4. Produce the Candidate pack

Write one candidate pack to `content/inbox/`.

Include:

- canonical source URL;
- short/long summary;
- Section + Storyline routing;
- verification state;
- claim-level evidence;
- five preflight score dimensions.

Do not edit Edition judgment, Issues, public Signals or editorial decisions directly.

### 5. Deterministic preflight

Dry-run:

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json
```

Possible preflight states:

- `accepted` — passed deterministic gates and may enter private editorial review;
- `needs_review` — potentially material but requires human preflight attention;
- `rejected` — cannot enter the active Candidate set.

The evaluator is read-only. `scripts/update-content.mjs --apply` is retired and intentionally errors.

To persist reviewable Candidates:

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json --apply
npm run check
npm run build
```

`apply-content.mjs` updates only the private review queue and audit record. It never writes `public/data/news.json`.

### 6. Repository → private Supabase sync

Relevant changes on `main` trigger `.github/workflows/supabase-sync.yml`.

The server-side workflow:

- syncs public Signal catalog metadata;
- loads non-public Candidate snapshots from inbox/review state;
- preserves full candidate payload privately in `newsflow_candidates`;
- marks Candidates that disappear from the repository working set inactive.

The service-role key exists only in GitHub Actions.

### 7. Editor opinions

Appointed Editors enter the same Review Game and choose exactly one:

- 封面文章;
- 录用;
- 小修;
- 大修;
- 拒稿.

Their row in `newsflow_editorial_reviews` is advisory only. Editors can revise/undo their own opinion. They do not create adoption and do not see another individual's review record.

### 8. Editor-in-Chief decision

The chief reviews the same Candidate and may see aggregate opinion counts from Editors.

The chief's five-state row is final editorial judgment:

- `cover_story` / `accept` → database trigger creates/updates `newsflow_editorial_adoptions`;
- `minor_revision` / `major_revision` / `reject` → any pre-Issue adoption is removed.

No majority vote, recommendation score or automatic fallback can override the chief.

### 9. Chief adoption → Reader Latest

`.github/workflows/editorial-sync.yml` checks hourly.

`scripts/sync-adopted-signals.mjs`:

- reads chief adoption + private Candidate payload server-side;
- validates the registered source;
- promotes current adoption to `public/data/news.json`;
- withdraws a previously managed pre-Issue Signal if the chief reverses adoption;
- never deletes content already frozen into a historical Issue.

This gives the website continuous publication without exposing unadopted material.

### 10. Formal Issue publication

On the 1st and 15th, `scripts/publish-edition.mjs`:

- calculates the half-month window;
- reads `newsflow_editorial_adoptions`;
- admits only chief Cover/Accept decisions in-window;
- respects Issue/channel caps;
- persists Cover as `cover_signal_id`;
- ensures adopted Candidate data exists in public Signal state;
- freezes `public/data/issues.json`;
- permits a valid no-change Issue.

There is no quality-score publication fallback.

### 11. Chief governance changes

The chief can edit Edition judgment, active Storylines and trusted sources in **Publication Settings**.

- **Save draft** → private Supabase `newsflow_governance_drafts`, no Reader effect.
- **发布到 GitHub** → immutable-ish `newsflow_governance_publications` queue row.
- hourly editorial sync validates and applies the change to canonical GitHub files, runs checks/build, commits `main`, then normal Pages deployment follows.

The browser never carries a GitHub token or Supabase service-role key.

## Handoff

Report:

- run window + actor/workflow version;
- sources and Storylines checked;
- preflight counts;
- Candidates persisted;
- unresolved evidence uncertainty;
- validation/build status.

Do not report a Candidate as published unless the chief adoption/public GitHub state proves it.

## Terminal outcomes

- `completed_no_material_change` — research complete; no Candidate earned attention.
- `completed_dry_run` — Candidate pack evaluated; nothing persisted.
- `completed_applied` — reviewable Candidates persisted; no Reader publication implied.
- `needs_human_review` — at least one Candidate requires editorial judgment.
- `blocked` — required evidence/access/contract inputs unavailable; never fabricate a substitute.
