# NewsFlow portable content-update workflow

This is the canonical procedure for updating NewsFlow evidence. Candidate packs conform to `schemas/content-candidate-pack.schema.json`; the machine-readable companion is `config/content-workflow.json`.

## One publication boundary

NewsFlow has one decisive publication gate:

> **Only the Editor-in-Chief decides what becomes NewsFlow public content.**

The stages are deliberately separate:

1. automated/manual research discovers questions, arguments and verifiable evidence, with Editor Green Lane referrals receiving first-pass discovery priority;
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

1. `public/data/edition.json` is the single canonical Edition constitution, including long-horizon Storylines and cross-cutting research lenses.
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
- Read the Edition's `cross_cutting_lenses`; every material lead should be understood through at least one of these lenses rather than as an isolated headline.
- Reader profile can prioritize search only; it may never weaken sourcing/evidence thresholds.
- Declare `as_of`, `coverage_start`, `coverage_end` and `Asia/Shanghai` before searching.
- Record the required actor fields exactly.
- Read each channel's `deep_review_cadence`, `surface_rotation`, Storyline `lens_priority` and `evidence_surfaces` from `config/content-discovery.json`.
- When the runtime can observe collection activity, populate `run.collection_observations`. Record source/scout IDs, Storylines, evidence-surface types and X topic-query IDs actually checked plus bounded counts for material leads and full-text reviews. These observations are telemetry only; they do not change source weights or editorial thresholds.

### 2. Check the Editor Green Lane, then collect questions and evidence

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

Then collect every active Storyline through four bounded passes. `source_ids` in `config/content-discovery.json` deliberately mix authoritative records, registered specialist analysis and independent media because NewsFlow needs both **events** and **questions worth thinking about**.

**Pass A — problem discovery and emerging arguments**

- Scan relevant registered long-form specialist sources every normal run. They are the stable problem-discovery surface when social-platform access is unavailable.
- Scan a bounded subset of registered X scouts and run configured X `topic_queries` only when native X search/timeline access is actually available. Fixed accounts tell us what known experts are thinking; topic search is specifically there to discover unfamiliar people, new terminology and problems outside the current network.
- X has only two runtime states: `native_x` or `not_run`. Do not simulate X collection with indexed web search, cached snippets or generic `site:x.com` queries. If native X is unavailable, record `not_run` and continue the run through canonical blogs, reports, primary records and independent media.
- Rotate toward under-covered layers before repeatedly scanning the same high-yield accounts.
- Their value is often the framing itself: a bottleneck, failure mode, engineering trade-off, market contradiction or new way to formulate the problem may be material even when no conventional news event occurred.
- X posts remain discovery-only under `config/content-scouts.json`; follow factual claims to the linked paper, filing, dataset, benchmark, repository, company document or other canonical evidence.
- A registered long-form specialist article may itself become a Candidate when its analytical diagnosis is the material contribution, the full text is accessible, authorship is clear, factual claims are traceable and the piece passes the same quality gate as any other source. Use `expert_analysis` or `technical_diagnosis` rather than pretending it is an event announcement.
- Do not force a specialist argument into a primary-source URL when doing so would erase the actual intellectual contribution. Primary evidence verifies facts; it does not replace the analyst's argument.

**Pass B — primary records and measurable evidence**

- Check `primary`, `standards_body`, `intergovernmental` and relevant `corporate_primary` sources for evidence that confirms, complicates or falsifies the questions surfaced in Pass A and for material developments that did not first appear in commentary.
- Treat datasets, benchmarks, field experiments, permits, filings, procurement/engineering records and operating measurements as first-class evidence surfaces rather than waiting for them to be summarized by media.
- For grid and energy stories, prefer system-operator or regulator records over summaries of those records.
- For semiconductor supply, distinguish sample, qualification, high-volume production, commercial shipment and delivered system capacity.
- For model deployment, prefer system cards, deployment-safety records and first-party technical documentation when the claim is about that provider's model.
- For applications, distinguish a demo or customer logo from paid usage, retained workload, measured productivity or repeatable task completion.
- Corporate sources prove facts about the reporting company only; keep forecasts and leadership claims attributed.

For **CCUS**, every run must cover two distinct evidence tracks:

1. **project state** — FID, financing, permit, FEED/EPC, construction, commissioning, injection, operating data, delay and cancellation;
2. **industry state** — pipeline-to-FID conversion, capital allocation, cost curves, equipment/vendor capacity, network utilisation, developer entry/exit, regional divergence, policy durability and changes in the industry's dominant thesis.

A CCUS industry Signal does **not** need a single project announcement as its trigger. A high-quality institutional report, technical cost study, industry analysis or well-supported argument can earn attention when it changes how the sector should be understood. Procurement awards, vendor backlogs, financing terms, insurance, storage appraisal, capacity reservations and permit queues can be leading indicators before a project reaches a headline milestone. Separate observed deployment from modeled forecasts and attribute stakeholder views.

**Pass C — independent reporting and corroboration**

- Use Reuters, Financial Times and Associated Press to discover material events, quantify disputes and independently corroborate company or institutional claims.
- When a media report points to an accessible regulator filing, company release, system card or project record containing the material fact, follow it and prefer that canonical primary URL when the Candidate is fundamentally about that fact.
- Keep the media source as corroboration when it adds independent facts, unnamed-source reporting or conflict context that the primary record does not contain.
- Do not create duplicate Candidates for the primary record and the media report about the same event.

**Pass D — counter-evidence**

- Run the configured `counter_queries` as an explicit attempt to weaken the current editorial view, not as a second copy of the normal scan.
- Revisit scouts, specialist analysis and stakeholder reports when they surface credible counter-theses or implementation failures.
- Apply the Edition's `substitution-falsification` lens deliberately: look for efficiency gains, substitution, demand shortfalls, policy reversals and implementation failures that could make the current thesis wrong.
- A disagreement is useful only when the underlying evidence or reasoning is inspectable; do not reward contrarianism by itself.

### 3. Control breadth without collapsing back to a narrow feed

Routine collection should be broad **by surface**, not exhaustive by URL.

- Every active Storyline gets its core query pass plus at least one evidence surface from its `surface_rotation` that was not the dominant surface in the previous run when that history is available.
- Do not scan every registered source merely because it exists. Use the Storyline's `research_questions`, `lens_priority` and `evidence_surfaces` to decide what kind of evidence is missing, then inspect the best sources for that gap.
- The weekly `deep_review_cadence` is different from a normal update: revisit the Storyline thesis itself, rotate through all six cross-cutting lenses, and search for important evidence classes that produced no headlines during the week.
- For CCUS, do not stop after finding project announcements; complete at least one industry-state query and one non-project evidence surface in each run.
- For AI, do not let the five-layer model become five independent news feeds. Cross-layer evidence is especially valuable when it shows a bottleneck moving from one layer to another or when application demand changes upstream capacity economics.
- Access full source material before scoring. Search snippets, headlines and inaccessible summaries are not evidence.
- Normalize URLs before comparison and compare the event or argument against existing public Signals before spending time drafting a Candidate.
- Recency alone is not novelty. A new article about an already-covered event is not a new Signal unless it adds a material fact, stage change, metric, contradiction, analytical framework or implementation consequence.
- A zero-candidate run is a valid and often preferable result.

### 4. Earn editorial attention

- Compare against existing **public** Signals and state the information delta.
- Name the Storyline and the most relevant cross-cutting lens. This prevents a project announcement or model release from being treated as meaningful without explaining what long-horizon question it changes.
- For analytical pieces, state the thesis delta as clearly as an event delta: what question or causal mechanism is newly sharpened, and what evidence would falsify it?
- Score facts, source, timeliness, news quality and industry impact.
- Reject immaterial/repeated items.
- A zero-candidate pack is valid.

### 5. Produce the transient Candidate pack

Write one Candidate pack to gitignored `content/inbox/` or another local/Agent workspace.

Include:

- canonical source URL;
- short/long summary;
- Section + Storyline routing;
- verification state;
- claim-level evidence;
- five preflight score dimensions;
- `discovery_origin` when known, so later analysis can distinguish Green Lane, X scout/topic search, specialist analysis, primary records, datasets, papers, filings, engineering/procurement surfaces and mainstream discovery.

When available, also include sanitized collection telemetry in `run.collection_observations`:

- `source_ids_scanned` — registered source IDs actually checked;
- `scout_ids_scanned` — registered fixed X-scout IDs actually checked;
- `storyline_ids_scanned` — long-horizon Storylines actually covered;
- `surface_types_scanned` — evidence-surface classes actually inspected;
- `x_topic_query_ids_run` — configured X topic searches actually executed; leave this empty when native X was unavailable;
- `x_query_runtime` — `native_x` when X was genuinely queried, otherwise `not_run`;
- `origin_yield` — per discovery origin, record `lead_count`, `full_text_review_count` and `candidate_count`; this is the bridge needed to learn whether a fixed scout, topic query, specialist source or other surface actually contributes useful material;
- `material_lead_count` — leads that survived the initial relevance/novelty screen;
- `full_text_review_count` — sources whose full text was actually inspected.

`origin_yield` is attribution, not a ranking signal. Do not auto-remove, auto-demote or auto-promote a source because of a small sample or a low-yield run. Compare sources only after enough runs exist.

Telemetry must be internally consistent. `scripts/update-content.mjs` rejects unknown source/scout/topic IDs, duplicate origin rows, impossible count order (`Candidate > full text > lead`), X topic activity marked as `not_run`, and Candidate origins that are not represented in the run's `origin_yield` when that telemetry is supplied.

This telemetry is accumulated for later source-yield and coverage analysis only. Do **not** use it yet to auto-remove, auto-demote or auto-promote sources.

The pack is an exchange artifact, not durable editorial storage. Do not commit it to the public repository.

Do not edit Edition judgment, Issues, public Signals or editorial decisions directly.

### 6. Deterministic preflight

Dry-run:

```bash
npm run content:update -- --input=content/inbox/<candidate-pack>.json
```

Possible preflight states:

- `accepted` — passed deterministic gates and may enter private editorial review;
- `needs_review` — potentially material but requires human preflight attention;
- `rejected` — cannot enter the active Candidate set.

The evaluator is read-only. `scripts/update-content.mjs --apply` is retired and intentionally errors.

### 7. Persist reviewable Candidates directly to Supabase

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
- preserves `run.collection_observations` inside that sanitized run audit when supplied;
- preserves Candidate `discovery_origin` in the private Candidate payload when supplied;
- leaves the transient Candidate pack outside durable Git history.

A zero-Candidate run may still be applied when it carries useful collection observations; it records the scan without creating a manuscript or changing Reader state.

If a newly persisted Candidate URL matches a queued Green Lane referral, the database marks that referral `ingested` and links its `candidate_id` automatically.

After application:

```bash
npm run check
npm run build
```

There is **no repository → Supabase Candidate sync workflow**. Do not recreate one.

### 8. Editor scores

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

### 9. Editor Green Lane referrals

Editors and the chief may submit a recommended article URL from the Editorial Desk **绿色通道**.

- The browser stores only the normalized HTTPS URL, submitter and queue status in private Supabase.
- Successful submission is stamped **“拟录用，请等待系统更新”**.
- That stamp means “priority discovery lead”, not formal publication acceptance.
- The next content-collection run reads the oldest queued referral first via `npm run editorial:referrals -- --limit=1`.
- The referral still has to pass normal source/evidence/preflight rules before becoming a Candidate.
- Candidate insertion with the same canonical URL automatically changes the referral to `ingested`.

Do not write Green Lane links into public Git history or directly into `public/data/news.json`.

### 10. Editor-in-Chief decision

The chief reviews private Candidates and may see aggregate opinion counts from Editors.

The chief's five-state row is the final publication judgment:

- a final chief decision closes the Candidate for the chief publication queue, but does **not** close Editor scoring for current-Issue adopted manuscripts;
- `cover_story` / `accept` → database trigger creates/updates `newsflow_editorial_adoptions` and stores a sanitized public `publication` snapshot;
- `minor_revision` / `major_revision` / `reject` → any pre-Issue adoption is removed;
- deleting/undoing the chief review reopens the Candidate and removes its pre-Issue adoption.

No majority vote, recommendation score or automatic fallback can override the chief.

### 11. Chief adoption → Reader Latest

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

### 12. Live Current Issue

`scripts/sync-live-issue.mjs` owns the half-month lifecycle:

- 1st–14th is one active Issue window; 15th–month-end is the next;
- at Shanghai midnight when a new window begins, that window becomes Current Issue immediately, even with zero articles;
- during the window, adopted Signals are re-ranked as publication state changes;
- explicit chief `cover_story` ranks first; otherwise editorial quality and recency determine current order;
- the first ranked Signal is the current cover article;
- channel and Issue caps remain in force;
- when the next window begins, the previous Issue becomes historical and retains its published article set.

`publication-sync.yml` runs an idempotent Shanghai-midnight boundary check plus twice-hourly in-period synchronization. There is no second formal-Issue publisher.

### 13. Chief governance changes

The chief can edit Edition judgment, active Storylines and trusted sources in **Publication Settings**.

- **Save draft** → private Supabase `newsflow_governance_drafts`, no Reader effect.
- **发布到 GitHub** → `newsflow_governance_publications` row containing only a change explicitly destined for public canonical files.
- publication sync reads this published queue with the publishable key and applies it to canonical GitHub files.

The browser and publication worker never carry a GitHub token or Supabase service-role key for public publication reads.

### 14. Clean transient input

After the Candidate pack has been evaluated/persisted, remove the transient local file unless it is still needed for the active run. Candidate durability belongs to Supabase; public Git history is not an editorial manuscript archive.

## Handoff

Report:

- run window + actor/workflow version;
- Green Lane referral checked, if any;
- fixed X scouts and X topic-query discovery checked only when native X access was available;
- X query runtime (`native_x` or `not_run`);
- Storylines and cross-cutting lenses covered;
- primary, specialist, dataset/technical and independent evidence surfaces checked;
- for CCUS, both project-state and industry-state coverage;
- collection observation counts plus origin-yield counts when available;
- preflight counts;
- Candidates persisted and their discovery origins when known;
- unresolved evidence uncertainty;
- validation/build status.

Do not report a Candidate as published unless chief adoption and public GitHub state prove it.

## Terminal outcomes

- `completed_no_material_change` — research complete; no Candidate earned attention; an observation-only audit may still be recorded.
- `completed_dry_run` — Candidate pack evaluated; nothing persisted.
- `completed_applied` — reviewable Candidates and/or sanitized collection observations were persisted; no Reader publication implied.
- `needs_human_review` — at least one Candidate requires editorial judgment.
- `blocked` — required evidence/access/contract inputs unavailable; never fabricate a substitute.
