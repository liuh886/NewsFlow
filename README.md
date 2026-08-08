# NewsFlow

NewsFlow is a GitHub-native professional publication with a private editorial workflow behind a premium Reader experience.

> **Machines collect. Editors advise. The Editor-in-Chief decides. Readers see only adopted publication content.**

The reference publication is **Frontier Systems Review**, focused on AI infrastructure, CCUS and the energy transition.

## Product status

NewsFlow has three explicit editorial roles and one publication gate:

- **主编 / Editor-in-Chief** — final publication authority. Cover Story and Accept decisions control public adoption. The chief also owns Edition judgment, long-running Storylines, trusted-source policy and Editor appointments.
- **编辑 / Editor** — reviews the same five-state manuscript game, but every decision is advisory only.
- **读者 / Reader** — sees only chief-adopted Signals, formal Issues, Sections, Storylines, evidence and Archive. Candidate manuscripts, review votes, revision states and rejected material are private.

UI mode never grants authority. An Editor seat is an authenticated, database-backed appointment.

## Reader Mode

Reader Mode is a premium academic journal / boutique magazine rather than an analytics dashboard.

The hierarchy is:

1. Edition identity and publication navigation;
2. Current Issue as the homepage focal point;
3. Cover Story / Issue judgment and accepted stories;
4. compact changes since the Issue;
5. chronological **最新** containing only public adopted/published Signals;
6. section pages for **AI 基建** and **CCUS 与能源转型**;
7. Research Agenda / Storylines and Issue Archive;
8. full-page Reading Surface, with the side drawer retained for quick evidence inspection.

Reader navigation remains:

`本期 | 最新 | AI 基建 | CCUS 与能源转型 | 长期议题 | 归档`

The Reader static artifact does **not** contain unpublished Candidate packets or editorial review projections.

## Editorial Signal Desk

The public **最新** stream is newest-first by `published_at`; recommendation score only breaks ties. It contains content that the Editor-in-Chief has already adopted, even when the next formal Issue has not yet frozen.

This is intentionally different from the private editorial queue. Being collected, scored or reviewed never makes a manuscript public.

## Editor Mode

Editors and the Editor-in-Chief share one Review Game:

> 一屏一稿，一键裁决，一次反馈，然后下一稿。

The five decisions are:

1. 封面文章 / COVER STORY
2. 录用 / ACCEPT
3. 小修 / MINOR REVISION
4. 大修 / MAJOR REVISION
5. 拒稿 / REJECT

Desktop shortcuts are `1–5`; `Z` undoes the previous decision. After each decision, the stamp/reaction remains for three seconds with `（3）→（2）→（1）` before auto-advance.

For an **Editor**, all five choices are opinions stored in `newsflow_editorial_reviews`. They never publish automatically.

For the **Editor-in-Chief**, the same review row is the final editorial record. A database trigger projects only chief `cover_story` / `accept` decisions to `newsflow_editorial_adoptions`. Revision/reject decisions remove any pre-Issue adoption. The chief can see aggregate Editor opinion counts on the manuscript, but no majority rule or automated vote determines publication.

## Editorial governance

The Editor-in-Chief has a dedicated **Publication Settings** surface with four areas:

- **刊物判断** — Reader promise, editorial view and core questions;
- **长期议题** — title, research question, current chief view, watch items and falsifiers;
- **信源** — trusted source identity, domain/path, class/tier, routed Sections/Storylines, allowed uses and limitations;
- **编辑部** — permanent Editor appointments and role status.

These settings are not edited directly in GitHub from the browser.

### Why Supabase + GitHub

Supabase is the private workflow layer:

- editorial membership and one-time appointment tokens;
- private Candidate manuscripts;
- normalized Editor/Chief reviews;
- private governance drafts;
- published governance-change queue.

GitHub remains the canonical, auditable publication source:

- `public/data/edition.json`
- `public/data/storylines.json`
- `config/content-sources.json`
- `public/data/news.json`
- `public/data/issues.json`

When the chief presses **发布到 GitHub**, the browser writes only to a private Supabase governance row. `.github/workflows/editorial-sync.yml` checks hourly, pulls published chief changes with the existing server-side Supabase service-role secret, validates them, commits the canonical files to `main`, and lets the normal Pages flow deploy them. No GitHub token or service-role credential is shipped to the browser.

`public/data/edition.json` is the single Edition authority. The retired duplicate YAML Edition is not retained.

## Editorial information flow

```text
source research / automated discovery
  → candidate pack
  → validation, scoring, source/evidence checks
  → private Candidate queue
  → Supabase newsflow_candidates
  → Editors: advisory five-state reviews
  → Editor-in-Chief: final five-state decision
        ├─ minor / major / reject → remains private
        └─ cover / accept
              → newsflow_editorial_adoptions
              → hourly GitHub adoption sync
              → public/data/news.json → Reader Latest
              → 1st / 15th publisher
              → public/data/issues.json → formal Issue
```

Collection has no direct write path to `public/data/news.json`. `scripts/update-content.mjs` is a read-only evaluator; `scripts/apply-content.mjs --apply` queues reviewable Candidates and writes an audit record only.

## Formal publication

`.github/workflows/publish-edition.yml` runs at 09:15 Asia/Shanghai on the 1st and 15th.

- 1st: coverage is the 16th through the final day of the previous month.
- 15th: coverage is the 1st through the 14th.
- Only chief `cover_story` / `accept` adoptions are eligible.
- Edition caps bound total and per-channel Issue size.
- A no-change Issue is valid.
- Cover Story becomes `cover_signal_id`.
- Quality scores support discovery and review; there is no score-only publication fallback.

## Main runtime ownership

- `src/editorial-app.js` — Reader Signals, chronological Latest and quick evidence;
- `src/edition-layer.js` — Edition identity, Current Issue, Sections, Storylines and Archive;
- `public/reading-surface.js/.css` — premium article reading;
- `public/editorial-office.js` — Reader/editorial mode and membership-backed appointment entry;
- `public/review-game.js` — the single five-state review engine;
- `public/editorial-governance.js/.css` — chief-only Publication Settings;
- `supabase/newsflow-editorial.sql` — roles, private candidates/reviews, adoption and governance queues;
- `scripts/sync-supabase.mjs` — GitHub candidate/publication state → Supabase;
- `scripts/sync-adopted-signals.mjs` — chief adoption → Reader Latest;
- `scripts/sync-editorial-governance.mjs` — chief governance publication → canonical GitHub files;
- `scripts/publish-edition.mjs` — semi-monthly Issue compiler.

Retired architecture is deleted rather than wrapped: anonymous Guest review packets, public Candidate/review JSON, local review decision stores, product-account publication projection, local Issue settlement, catalog-only sync and duplicate Edition YAML are not retained.

## Local development

```bash
npm ci
npm run check
npm run build
python -m http.server 4173 --directory dist
```

Server-side sync commands require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Browser builds receive only the configured publishable Supabase key.

## CI and deployment

- `NewsFlow Repository Contract` protects data, privacy, authority and publication boundaries.
- `NewsFlow Frontend` validates JavaScript, product behavior and the static build.
- `CI Governance` enforces workflow/package policy.
- `Sync NewsFlow to Supabase` syncs public catalog + private Candidate snapshots on relevant main changes.
- `Sync chief editorial state` pulls chief adoption/governance back to GitHub only when state changed.
- `Publish autonomous edition` freezes formal Issues twice monthly.
- GitHub Pages deploys the built artifact only from `main`.

See `DESIGN.md`, `WORKFLOW.md`, `docs/edition-protocol.md` and `docs/ci-governance.md` for the enforceable contracts.
