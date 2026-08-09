# Newsflow

Newsflow is a GitHub-native publication engine with a private editorial workflow behind a premium Reader experience.

> **Machines collect. Editors advise. The Editor-in-Chief decides. Readers see only adopted publication content.**

The reference publication is **Frontier Systems Review**, focused on AI infrastructure, CCUS and the energy transition.

## Product status

The product is considered **feature-stable** at the current Reader v3 + Editorial Governance v2 baseline.

Newsflow has three roles and one publication gate:

- **主编 / Editor-in-Chief** — the only final publication authority. Cover Story and Accept create public adoption. The chief also owns Edition judgment, Storylines, trusted-source policy and Editor appointments.
- **编辑 / Editor** — Newsflow Pro users use the same five-state Review Game, but every decision is advisory only. Accepting a chief invitation also grants three months of Newsflow Pro.
- **读者 / Reader** — sees only chief-adopted Signals, formal Issues, Sections, Storylines, evidence and Archive. Candidate manuscripts, review votes, revision states and rejected material remain private.

UI mode never grants authority. Editorial authority comes from authenticated Supabase membership.

## Reader Mode

Reader Mode is a premium academic-journal / boutique-magazine experience, not an analytics dashboard.

Reader navigation is:

`本期 | 最新 | AI 基建 | CCUS 与能源转型 | 长期议题 | 归档`

The hierarchy is:

1. Edition identity and publication navigation;
2. Current Issue as the homepage focal point;
3. Cover Story, Issue judgment and accepted stories;
4. compact changes since the Issue;
5. chronological **最新** containing only adopted/published Signals;
6. explicit AI and CCUS section pages;
7. Research Agenda / Storylines and Issue Archive;
8. full-page Reading Surface, with the side drawer retained only for quick evidence inspection.

The Reader artifact contains no unpublished Candidate packet, review vote, rejection/revision state or internal pre-publication score.

## Editorial Signal Desk

The public **最新** stream is the Reader-facing Editorial Signal Desk: newest-first by `published_at`, containing only content the Editor-in-Chief has already adopted or a formal Issue has frozen.

It is intentionally different from the private Candidate queue. Collection, scoring and review never make a manuscript public by themselves.

## Editor Mode

Editors and the Editor-in-Chief share one Review Game:

> **一屏一稿，一键裁决，一次反馈，然后下一稿。**

Five decisions:

1. 封面文章 / COVER STORY
2. 录用 / ACCEPT
3. 小修 / MINOR REVISION
4. 大修 / MAJOR REVISION
5. 拒稿 / REJECT

Desktop shortcuts are `←/→` for manuscripts, `↑/↓` for decisions and `Enter` to confirm; `1–5` decide directly and `Z` undoes the previous decision. Decision feedback remains visible for three seconds before auto-advance.

For an Editor, the five-state review is an opinion only. For the Editor-in-Chief, the same review row is the final editorial record. Only chief `cover_story` / `accept` is projected into `newsflow_editorial_adoptions`.

A final chief decision closes the Candidate. Undoing/removing that chief decision reopens it. Ordinary Editor opinions never close or publish a Candidate.

## Editorial governance

The chief has one **Publication Settings** surface:

- **刊物判断** — reader promise, editorial view and core questions;
- **长期议题** — title, research question, current view, watch items and falsifiers;
- **信源** — trusted source identity, routing, allowed uses and limitations;
- **编辑部** — permanent Editor appointments and role status.

Supabase is the private workflow layer. GitHub remains the canonical, auditable publication source.

Canonical public state:

- `public/data/edition.json`
- `public/data/storylines.json`
- `config/content-sources.json`
- `public/data/news.json`
- `public/data/issues.json`

Private workflow state:

- Supabase `newsflow_candidates`
- Supabase `newsflow_editorial_reviews`
- editorial membership and invitation records
- governance drafts/publication queue
- Supabase `signal_feedback` bounded reader current state

The browser never receives a GitHub token or Supabase service-role credential.

## Editorial information flow

```text
source research / automated discovery
  → transient candidate pack (local / Agent workspace, gitignored)
  → deterministic preflight
  → apply-content.mjs --apply
  → Supabase newsflow_candidates
  → Editors: advisory five-state reviews
  → Editor-in-Chief: final five-state decision
        ├─ minor / major / reject → private only
        └─ cover / accept
              → newsflow_editorial_adoptions
              → twice-hourly editorial sync
              → public/data/news.json → Reader Latest
              → live half-month Issue compiler
              → public/data/issues.json → Current / frozen Issue
```

Collection has no direct publication path. `scripts/update-content.mjs` is read-only. `scripts/apply-content.mjs --apply` writes reviewable Candidates directly to private Supabase and records only a sanitized public scan audit.

## Formal publication

`.github/workflows/publication-sync.yml` is the sole publication writer. It synchronizes twice hourly and checks the Shanghai half-month boundary at midnight.

- 1st: previous month 16th through month-end.
- 15th: current month 1st through 14th.
- Only chief Cover/Accept adoptions are eligible.
- Edition caps bound total and per-channel Issue size.
- A no-change Issue is valid.
- Cover Story becomes `cover_signal_id`.
- Quality scores support discovery/review only; there is no score-only publication fallback.

Publication synchronization uses one writer lock. It commits canonical state to `main`; the separate Frontend workflow is the sole Pages builder/deployer.

## Adaptive reader feedback

The PWA stores explicit feedback locally first. Signed-in readers may synchronize one current row per Signal through owner-only Supabase RLS. Neutral rows are deleted, each account is capped at 256 rows, and no passive analytics or server-side profile is stored. After three preference-bearing actions, the Reader reorders already-published Signals using quality, freshness and bounded preference affinity. Feedback cannot weaken evidence gates or publish.

An authorized local Agent can run `npm run feedback:refresh` before research. The resulting snapshot and profile are gitignored ranking state without user identifiers.

## Syndication and email delivery

Every build emits both Atom (`feed.xml`) and RSS 2.0 (`rss.xml`) from chief-adopted public Signals. The Reader does not expose a subscription control yet, but either endpoint can be connected to a feed-to-email provider without adding subscriber data, background jobs or database usage to Newsflow itself.

## Runtime ownership

- `src/editorial-app.js` — public Signals, local-first adaptive Latest and quick evidence;
- `src/supabase-feedback.js` — bounded authenticated current-state synchronization;
- `src/edition-layer.js` — Edition, Current Issue, Sections, Storylines and Archive;
- `public/reading-surface.js/.css` — premium article reading;
- `public/editorial-office.js` — mode selection, editorial identity and appointment entry;
- `public/review-game.js` — the single five-state review engine;
- `public/editorial-governance.js/.css` — chief-only Publication Settings;
- `supabase/newsflow-editorial.sql` — roles, private Candidates/reviews, adoption and governance queues;
- `scripts/apply-content.mjs` — direct private Candidate submission;
- `scripts/sync-adopted-signals.mjs` — chief adoption → Reader Latest;
- `scripts/sync-editorial-governance.mjs` — chief governance publication → canonical GitHub files;
- `scripts/sync-live-issue.mjs` — live/frozen half-month Issue compiler;
- `scripts/pull-feedback.mjs` — private identifier-free bridge from Supabase current state to the local Agent.

Retired architecture is deleted rather than wrapped: public Candidate/review JSON, repository-to-Supabase Candidate synchronization, local editorial decision stores, product-account publication projection, local Issue settlement, anonymous Guest real-Candidate packets, catalog-only sync and duplicate Edition YAML must not return.

## Local development

```bash
npm ci
npm run check
npm run build
python -m http.server 4173 --directory dist
```

Direct Candidate submission and private Agent feedback refresh require local `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Browser builds receive only repository-variable project URL and publishable key.

## CI and deployment

The stable CI surface is intentionally small:

- **NewsFlow Repository Contract** — publication, privacy and authority invariants;
- **NewsFlow Frontend** — contracts, static build and one real-browser acceptance smoke against the built `dist` artifact;
- **CI Governance** — workflow/package policy;
- **Sync publication state** — only meaningful chief adoption/governance or Issue-boundary changes write back to GitHub;
- **NewsFlow Frontend** — the sole Pages build/deploy path;
- **Supabase activity heartbeat** — read-only project activity guard.

The browser acceptance gate verifies Reader startup, opens/closes a Reading Surface article, checks mobile horizontal overflow and fails on uncaught runtime errors. It lives inside the existing Frontend workflow; there is no browser matrix or duplicate CI workflow.

## Change policy

The current product surface is the baseline, not an invitation to continuous redesign.

A new feature or architecture change should start only from a concrete problem, user evidence or editorial requirement. Do not create speculative roadmap Issues. Prefer fixing the existing owner/module in place, and delete superseded paths instead of introducing compatibility layers.

Operational content scans, Editor reviews and twice-monthly publication are normal product use, not feature backlog.

See `DESIGN.md`, `WORKFLOW.md`, `TASKS.md`, `docs/edition-protocol.md` and `docs/ci-governance.md` for the enforceable contracts.
