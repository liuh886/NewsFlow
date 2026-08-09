# NewsFlow portable content-update workflow

This is the canonical procedure for updating NewsFlow evidence. Candidate packs conform to `schemas/content-candidate-pack.schema.json`; the machine-readable companion is `config/content-workflow.json`.

## One publication boundary

NewsFlow has one decisive publication gate:

> **Only the Editor-in-Chief decides what becomes NewsFlow public content.**

The stages are deliberately separate:

1. automated/manual research discovers and verifies evidence, with Editor Green Lane referrals receiving first-pass discovery priority;
2. deterministic preflight decides whether an item is fit to become a **private Candidate**;
3. reviewable Candidates are written directly to private Supabase;
4. Editors produce advisory five-state scores and may revise them repeatedly, including after the chief has made a publication decision;
5. the Editor-in-Chief produces the final five-state publication decision;
6. chief **封面文章 / 录用** creates a sanitized public adoption projection in Supabase;
7. GitHub publication sync reads only that public projection and updates Reader Latest;
8. adopted Signals are ranked into the active half-month Current Issue;
9. when the next half-month starts, the previous Issue becomes historical and the new period becomes Current Issue immediately.

A content-pipeline `accepted` result means only **passed preflight for editorial review**. It never means Reader publication.

## Authority order

1. `public/data/edition.json` is the single canonical Edition constitution.
2. `config/content-workflow.json` defines the evidence-processing contract.
3. source/discovery/scout registries define search and verification boundaries.
4. Supabase `newsflow_editorial_referrals` is the private Editor Green Lane queue; it prioritizes discovery but never grants publication authority.
5. the JSON Schema defines the transient Candidate exchange format.
6. `scripts/update-content.mjs` is the deterministic, read-only evaluator.
7. `scripts/apply-content.mjs --apply` writes reviewable Candidates directly to Supabase and records a sanitized audit; it cannot publish.
8. Supabase `newsflow_candidates` is the durable private Candidate authority.
9. Supabase `newsflow_editorial_reviews` stores normalized Editor/Chief five-state records.
10. only the active owner / Editor-in-Chief review can create `newsflow_editorial_adoptions`.
11. `supabase/newsflow-publication-projection.sql` turns an adopted private Candidate into the sanitized public `publication` snapshot; private Candidate rows remain inaccessible to Reader/publication workers.
12. `scripts/sync-adopted-signals.mjs` consumes only the public adoption projection and updates public Reader Signals.
13. `scripts/sync-live-issue.mjs` owns the live Current Issue lifecycle and ranking.
14. `.github/workflows/publication-sync.yml` is the only GitHub publication writer and deployer.
15. Agent-specific adapters may not weaken or extend this chain.

If two layers conflict, stop before applying and report the conflict.

## Procedure

### 1. Establish the run

- Read `public/data/edition.json`, current public Signals, Storylines and every `required_inputs` file.
- Reader profile can prioritize search only; it may never weaken sourcing/evidence thresholds.
- Declare `as_of`, `coverage_start`, `coverage_end` and `Asia/Shanghai` before searching.
- Record the required actor fields exactly.

### 2. Check the Editor Green Lane, then discover broadly

Before normal discovery, read at most one queued Editor referral:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run editorial:referrals -- --limit=1
```

If the queue returns an item:

- treat that URL as the first discovery lead for the run;
- access the source and verify it exactly like any other item;
- do not waive source registration, evidence, timeliness, duplication or quality gates;
- if it earns a Candidate, preserve its canonical URL so the database can close the matching referral automatically;
- if it does not earn a Candidate, leave it queued unless the editorial team explicitly dismisses it later.

Then search every active Storyline using normal and counter-evidence queries.

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

Use server-side credentials only for writing private Candidate state:

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

If a newly persisted Candidate URL matches a queued Green Lane referral, the database marks that referral `ingested` and links its `candidate_id` automatically.

After application:

```bash
npm run check
npm run build
```

There is **no repository → Supabase Candidate sync workflow**. Do not recreate one.

### 7. Editor scores

Appointed Editors enter **本期评议**, which is driven by the current half-month chief-adoption set rather than `newsflow_candidates.active`.

For every manuscript the chief has collected in the current Issue window, Editors can repeatedly choose one advisory score:

- 封面推荐 (`cover_story`);
- 推荐 (`accept`);
- 小修后推荐 (`minor_revision`);
- 大修后再评 (`major_revision`);
- 不推荐 (`reject`).

Editor behavior is deliberately different from chief behavior:

- an Editor score is advisory only;
- an Editor may score a manuscript even after the chief has already accepted it and the Candidate is no longer active;
- an Editor may change the score repeatedly; the normalized review row is updated in place;
- Editor scores feed editorial consensus/ranking signals but never create or remove adoption;
- Editors do not obtain publication authority by majority vote.

The older archive/review views remain useful for inspecting and retracting the Editor's own record, but the normal Editor work surface is the repeatable current-Issue scorecard.

### 8. Editor Green Lane referrals

Editors and the chief may submit a recommended article URL from the Editorial Desk **绿色通道**.

- The browser stores only the normalized HTTPS URL, submitter and queue status in private Supabase.
- Successful submission is stamped **“拟录用，请等待系统更新”**.
- That stamp means “priority discovery lead”, not formal publication acceptance.
- The next content-collection run reads the oldest queued referral first via `npm run editorial:referrals -- --limit=1`.
- The referral still has to pass normal source/evidence/preflight rules before becoming a Candidate.
- Candidate insertion with the same canonical URL automatically changes the referral to `ingested`.

Do not write Green Lane links into public Git history or directly into `public/data/news.json`.

### 9. Editor-in-Chief decision

The chief reviews private Candidates and may see aggregate opinion counts from Editors.

The chief's five-state row is the final publication judgment:

- a final chief decision closes the Candidate for the chief publication queue, but does **not** close Editor scoring for current-Issue adopted manuscripts;
- `cover_story` / `accept` → database trigger creates/updates `newsflow_editorial_adoptions` and stores a sanitized public `publication` snapshot;
- `minor_revision` / `major_revision` / `reject` → any pre-Issue adoption is removed;
- deleting/undoing the chief review reopens the Candidate and removes its pre-Issue adoption.

No majority vote, recommendation score or automatic fallback can override the chief.

### 10. Chief adoption → Reader Latest

`.github/workflows/publication-sync.yml` is the sole publication worker.

`scripts/sync-adopted-signals.mjs`:

- uses the Supabase publishable key only;
- reads `newsflow_editorial_adoptions.publication`, never private `newsflow_candidates`;
- validates the registered source;
- promotes current adoption to `public/data/news.json`;
- withdraws a previously managed live Signal if the chief reverses adoption;
- retains Signals already belonging to historical Issues;
- writes GitHub only when semantic publication state changed.

The same workflow applies explicitly published governance changes, validates/builds when state changes, commits main and deploys Pages.

### 11. Live Current Issue

`scripts/sync-live-issue.mjs` owns the half-month lifecycle:

- 1st–14th is one active Issue window; 15th–month-end is the next;
- at Shanghai midnight when a new window begins, that window becomes Current Issue immediately, even with zero articles;
- during the window, adopted Signals are re-ranked as publication state changes;
- explicit chief `cover_story` ranks first; otherwise editorial quality and recency determine current order;
- the first ranked Signal is the current cover article;
- channel and Issue caps remain in force;
- when the next window begins, the previous Issue becomes historical and retains its published article set.

`publication-sync.yml` runs an idempotent Shanghai-midnight boundary check plus twice-hourly in-period synchronization. There is no second formal-Issue publisher.

### 12. Chief governance changes

The chief can edit Edition judgment, active Storylines and trusted sources in **Publication Settings**.

- **Save draft** → private Supabase `newsflow_governance_drafts`, no Reader effect.
- **发布到 GitHub** → `newsflow_governance_publications` row containing only a change explicitly destined for public canonical files.
- publication sync reads this published queue with the publishable key and applies it to canonical GitHub files.

The browser and publication worker never carry a GitHub token or Supabase service-role key for public publication reads.

### 13. Clean transient input

After the Candidate pack has been evaluated/persisted, remove the transient local file unless it is still needed for the active run. Candidate durability belongs to Supabase; public Git history is not an editorial manuscript archive.

## Handoff

Report:

- run window + actor/workflow version;
- Green Lane referral checked, if any;
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
