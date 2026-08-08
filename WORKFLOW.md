# NewsFlow portable content-update workflow

This is the canonical, vendor-neutral procedure for updating NewsFlow evidence. Candidate packs conform to `schemas/content-candidate-pack.schema.json`; the machine-readable companion is `config/content-workflow.json`.

## One publication boundary

NewsFlow has one decisive publication gate:

> **Only the Editor-in-Chief decides what becomes NewsFlow public content.**

The stages are deliberately separate:

1. automated/manual research discovers and verifies evidence;
2. deterministic preflight decides whether an item is fit to become a **private Candidate**;
3. reviewable Candidates are written directly to private Supabase;
4. Editors produce advisory five-state opinions;
5. the Editor-in-Chief produces the final five-state decision;
6. only chief **封面文章 / 录用** becomes public adoption;
7. adopted Signals enter Reader Latest and can later freeze into a formal Issue.

A content-pipeline `accepted` result means only **passed preflight for editorial review**. It never means Reader publication.

## Authority order

1. `public/data/edition.json` is the single canonical Edition constitution.
2. `config/content-workflow.json` defines the evidence-processing contract.
3. source/discovery/scout registries define search and verification boundaries.
4. the JSON Schema defines the transient Candidate exchange format.
5. `scripts/update-content.mjs` is the deterministic, read-only evaluator.
6. `scripts/apply-content.mjs --apply` writes reviewable Candidates directly to Supabase and records a sanitized audit; it cannot publish.
7. Supabase `newsflow_candidates` is the durable private Candidate authority.
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

### 4. Produce the transient Candidate pack

Write one Candidate pack to gitignored `content/inbox/` or another local/Agent workspace.

Include:

- canonical source URL;
- short/long summary;
- Section + Storyline routing;
- verification state;
- claim-level evidence;
- five preflight score dimensions.

The pack is an exchange artifact, not durable editorial storage. Do not commit it to the public repository.

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

### 6. Persist reviewable Candidates directly to Supabase

Use server-side credentials only:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run content:update -- --input=content/inbox/<candidate-pack>.json --apply
```

`apply-content.mjs`:

- re-runs deterministic evaluation;
- writes accepted/reviewable Candidate payloads directly to private `newsflow_candidates`;
- never writes `public/data/news.json`;
- emits only sanitized run metadata/counts to the public audit surface;
- leaves the transient Candidate pack outside durable Git history.

After application:

```bash
npm run check
npm run build
```

There is **no repository → Supabase Candidate sync workflow**. Do not recreate one.

### 7. Editor opinions

Appointed Editors enter the same Review Game and choose exactly one:

- 封面文章;
- 录用;
- 小修;
- 大修;
- 拒稿.

Their row in `newsflow_editorial_reviews` is advisory only. Editors can revise/undo their own opinion. They do not create adoption, do not close the Candidate and do not see another individual's review record.

### 8. Editor-in-Chief decision

The chief reviews the same Candidate and may see aggregate opinion counts from Editors.

The chief's five-state row is final editorial judgment:

- any final chief decision closes the Candidate;
- `cover_story` / `accept` → database trigger creates/updates `newsflow_editorial_adoptions`;
- `minor_revision` / `major_revision` / `reject` → any pre-Issue adoption is removed;
- deleting/undoing the chief review reopens the Candidate and removes its pre-Issue adoption.

No majority vote, recommendation score or automatic fallback can override the chief.

### 9. Chief adoption → Reader Latest

`.github/workflows/editorial-sync.yml` checks hourly.

`scripts/sync-adopted-signals.mjs`:

- reads chief adoption + private Candidate payload server-side;
- validates the registered source;
- promotes current adoption to `public/data/news.json`;
- withdraws a previously managed pre-Issue Signal if the chief reverses adoption;
- never deletes content already frozen into a historical Issue;
- writes GitHub only when semantic publication state changed.

The same workflow also applies published chief governance changes and deploys the validated build when there is a real change.

### 10. Formal Issue publication

On the 1st and 15th, `scripts/publish-edition.mjs`:

- calculates the half-month window;
- reads `newsflow_editorial_adoptions`;
- admits only chief Cover/Accept decisions in-window;
- respects Issue/channel caps;
- persists Cover as `cover_signal_id`;
- ensures adopted Candidate data exists in public Signal state;
- freezes `public/data/issues.json`;
- refreshes deterministic `data-status.json`;
- permits a valid no-change Issue.

There is no quality-score publication fallback.

Formal publication and hourly editorial synchronization share one publication-writer concurrency lock.

### 11. Chief governance changes

The chief can edit Edition judgment, active Storylines and trusted sources in **Publication Settings**.

- **Save draft** → private Supabase `newsflow_governance_drafts`, no Reader effect.
- **发布到 GitHub** → `newsflow_governance_publications` queue row.
- hourly editorial sync validates and applies the change to canonical GitHub files, runs checks/build, commits `main` only when state changed, then deploys Pages.

The browser never carries a GitHub token or Supabase service-role key.

### 12. Clean transient input

After the Candidate pack has been evaluated/persisted, remove the transient local file unless it is still needed for the active run. Candidate durability belongs to Supabase; public Git history is not an editorial manuscript archive.

## Handoff

Report:

- run window + actor/workflow version;
- sources and Storylines checked;
- preflight counts;
- Candidates persisted;
- unresolved evidence uncertainty;
- validation/build status.

Do not report a Candidate as published unless chief adoption and public GitHub state prove it.

## Terminal outcomes

- `completed_no_material_change` — research complete; no Candidate earned attention.
- `completed_dry_run` — Candidate pack evaluated; nothing persisted.
- `completed_applied` — reviewable Candidates persisted privately; no Reader publication implied.
- `needs_human_review` — at least one Candidate requires editorial judgment.
- `blocked` — required evidence/access/contract inputs unavailable; never fabricate a substitute.
