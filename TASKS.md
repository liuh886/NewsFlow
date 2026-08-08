# TASKS: NewsFlow

## Stable product baseline

NewsFlow is currently considered **feature-stable** at the Reader v3 + Editorial Governance v2 baseline.

There is no standing feature backlog. Open work should represent a real defect, observed user/editor friction, a concrete editorial requirement, a security/privacy/data-integrity risk, or a measured operational reliability issue.

## Completed product surface

### Reader

- [x] Edition-first Frontier Systems Review identity.
- [x] Current Issue is the homepage focal point.
- [x] Cover Story and accepted-story hierarchy.
- [x] `本期 / 最新 / AI 基建 / CCUS 与能源转型 / 长期议题 / 归档` navigation.
- [x] Explicit AI and CCUS section landing pages with existing Storyline taxonomy.
- [x] Premium full-page Reading Surface plus quick evidence drawer.
- [x] Search, bookmarks, feedback, dark mode and responsive mobile reading.
- [x] Reader contains only adopted/frozen publication content.
- [x] No visible internal pre-publication scoring.
- [x] No hard-coded publication fallback or secondary Reader content source.

### Editorial workflow

- [x] One five-state Review Game for Editor and Editor-in-Chief.
- [x] Editor reviews are advisory only.
- [x] Editor-in-Chief is the sole final publication authority.
- [x] Any final chief decision closes the Candidate; undo/removal reopens it.
- [x] Only chief Cover/Accept creates public adoption.
- [x] Candidate/review state is private Supabase data under RLS.
- [x] Candidate packs are transient/gitignored rather than durable public-repo storage.
- [x] `apply-content.mjs --apply` writes reviewable Candidates directly to Supabase.
- [x] Repository-to-Supabase Candidate synchronization is retired.
- [x] Chief Publication Settings cover Edition, Storylines, Sources and Editor appointments.

### Publication

- [x] Adopted Signals enter Reader Latest through semantic, idempotent chief-state sync.
- [x] Formal Issues freeze automatically on the 1st and 15th.
- [x] Cover Story maps to `cover_signal_id`.
- [x] No-change Issues are valid.
- [x] Historical Issue content remains frozen.
- [x] Formal publication and hourly editorial sync share one writer lock.
- [x] Data freshness is generated deterministically.

### Engineering and delivery

- [x] Dependency-light static architecture retained; no framework migration.
- [x] One root Reader render owner with explicit lifecycle events.
- [x] No MutationObserver feature layers or global fetch monkey patches.
- [x] PWA release/cache identity is explicit and versioned.
- [x] Repository Contract passes.
- [x] Frontend contracts and static build pass.
- [x] CI Governance passes.
- [x] Real-browser acceptance smoke runs against the validated `dist` artifact.
- [x] Browser smoke verifies startup, Reading Surface open/close, mobile overflow and uncaught runtime errors.
- [x] GitHub Pages deployment is bounded and main deployments do not cancel one another.
- [x] Canonical README / DESIGN / WORKFLOW match the implemented architecture.

## Normal operations — not backlog

The following are routine product use and should not be tracked as standing feature Issues:

- evidence discovery and content scans;
- private Candidate submission;
- Editor opinions;
- Editor-in-Chief decisions;
- hourly semantic adoption/governance sync;
- 1st/15th Issue publication;
- data freshness updates;
- Supabase activity heartbeat.

Open an Issue only when one of these operations fails or reveals a concrete product requirement.

## Explicit non-goals

Do not create backlog items for:

- React / Next / Vite migration without a proven product need;
- compatibility layers for retired architecture;
- duplicate publication/Candidate stores;
- generic CMS construction;
- recommendation-engine expansion without measured need;
- dashboard/bento redesign of Reader Mode;
- points, XP, streaks, leaderboards or marketplace mechanics in Editor Mode;
- publishing based on majority vote or quality score;
- restoring anonymous Guest access to real private Candidates.

## Change gate

Before opening a new feature Issue, state all three:

1. **Problem** — what is observably wrong or missing now?
2. **Evidence** — which user behavior, editorial requirement, failure or measurement proves it matters?
3. **Smallest durable outcome** — what is the simplest change that solves it inside the current architecture?

If those cannot be stated, do not open the Issue yet.

## Historical note

Old Candidate payloads may still exist in historical commits from before the private-Candidate boundary was corrected. Removing those would require destructive Git history rewriting and is intentionally **not** part of the stable product backlog. Treat it as a separate repository-history operation only if explicitly requested.
