# NewsFlow

NewsFlow is a GitHub-native professional publication with two deliberately different experiences on one editorial system:

> **Reader Mode is a publication. Editor Mode is a game.**

An Edition defines the reader promise, editorial view, scope, source policy, materiality boundaries and long-running Storylines. NewsFlow continuously gathers candidate evidence, lets editors judge it through a card-review game, and publishes a formal Issue on the 1st and 15th of each month.

## Product status

NewsFlow now has one coherent editorial pipeline connecting evidence discovery, the five-state Review Game and the formal semi-monthly publication. Reader and Editor remain separate experiences, while the same content and authority model connects them underneath.

### Reader Mode

Reader Mode is the normal NewsFlow website. Its hierarchy is:

1. Edition identity and publication context;
2. the most important change since the latest Issue;
3. the current formal Issue;
4. the continuous Editorial Desk;
5. Storylines and Archive;
6. evidence and original sources.

The homepage remains editorial rather than chronological: one important post-Issue Signal can lead the page. When a formal Issue contains a `cover_signal_id`, the cover story receives visibly stronger treatment inside the Current Issue. Ordinary accepted Signals remain secondary entries beneath it.

### Editor Mode

Selecting **Editor** opens the full-screen Review Game rather than an admin dashboard:

> 一屏一稿，一键裁决，一次反馈，然后下一稿。

Every manuscript receives exactly one decision:

1. 封面文章 / COVER STORY
2. 录用 / ACCEPT
3. 小修 / MINOR REVISION
4. 大修 / MAJOR REVISION
5. 拒稿 / REJECT

Desktop shortcuts are `1–5`; `Z` undoes the previous decision. On desktop the manuscript itself is rendered at roughly 80% visual scale so the review remains a one-screen task. After every decision, the stamp and editorial reaction remain visible for three seconds with `（3）→（2）→（1）` before the next manuscript advances.

Formal editors and Guest Editors share the same Review Game renderer. **UI mode is not publication authority.** Anyone may use the editor experience, while formal publication is restricted by the shared account authority model.

## Editorial Signal Desk

The Editorial Signal Desk is the continuous evidence stream between formal Issues. It is **chronological by default**, newest first by `published_at`; recommendation score is used only as a tie-breaker. This differs intentionally from the single homepage lead, which may be selected by editorial importance.

Search, filters, bookmarks, evidence views and Storylines remain supporting reader tools. The Desk can expose strong evidence before it is adopted into a formal Issue; appearing in the Desk does not equal formal publication.

## Editorial information flow

```text
source research
  → content/inbox candidate pack
  → review-candidates.json
  → Editor Review Game
  → editor decision saved to shared account state
  → active owner decision projected to newsflow_editorial_adoptions
  → 1st / 15th publisher
  → public/data/news.json + public/data/issues.json
  → Reader Mode
```

Publication semantics:

- **封面文章** → eligible for the next formal Issue and becomes `cover_signal_id` when selected as the cover;
- **录用** → eligible for the next formal Issue;
- **小修 / 大修 / 拒稿** → do not automatically enter the formal Issue;
- Guest Editor decisions remain parallel opinions and never enter formal publication automatically;
- non-owner Editor-mode decisions may be saved for continuity, but formal publication reads only the active owner's adoption projection.

There is no second `CLOSE ISSUE` judgment after review. The editorial decision is the publication intent.

## Formal publication

`.github/workflows/publish-edition.yml` runs at 09:15 Asia/Shanghai on the 1st and 15th.

- On the 1st, coverage is the 16th through the final day of the previous month.
- On the 15th, coverage is the 1st through the 14th.
- The publisher reads the public, read-only `newsflow_editorial_adoptions` projection.
- Only active-owner `cover_story` and `accept` decisions inside the coverage window can enter the Issue.
- Edition caps still bound maximum Signals per Issue and per channel.
- A no-change Issue is valid when the owner has not adopted any eligible Signal.
- Selected inbox candidates are promoted into `public/data/news.json`; the frozen formal Issue is written to `public/data/issues.json`.
- Automation records evidence movement but never silently rewrites the Edition's long-term editorial view.

Quality scores help candidate discovery and review, but **formal Issue adoption has no quality-score fallback**.

## Publication authority

Shared account state is private. The database projects only the minimum publication record required by the publisher.

`supabase/newsflow-editorial.sql` defines the boundary:

- signed-in users may read only their own admin-role record;
- `newsflow_is_authoritative_editor()` is a security-invoker authority check;
- an internal trigger projects active-owner Cover/Accept decisions into `newsflow_editorial_adoptions`;
- the projection is public read-only;
- the trigger itself is not executable by public client roles.

No service-role credential is shipped to the frontend or invitation URL.

## Guest Editor invitation

A Guest Editor invitation is a public appointment, not an authority token. The reference invitation uses:

`?guest-editor=frontier-systems-review`

The invitee accepts an `EDITORIAL APPOINTMENT` and enters the same five-decision game. Guest judgments remain parallel opinions. If the live packet is sparse, already-public Signals may appear only as clearly labeled blind editorial exercises.

## Main runtime ownership

- `src/editorial-app.js` — Reader data, filters, chronological Desk and evidence interactions;
- `src/edition-layer.js` — Edition, Current Issue, cover hierarchy, Storylines and Archive;
- `public/magazine-polish.js` — reader lifecycle polish and idempotent data-freshness branding;
- `public/editorial-office.js` — Reader / Editor mode and shared-account state sync;
- `public/review-game.js` — the single formal/guest review state machine;
- `public/data/editorial-reactions.json` — serious-play editorial reactions;
- `supabase/newsflow-editorial.sql` — publication authority and adoption projection;
- `scripts/publish-edition.mjs` — owner-selected semi-monthly compiler.

The retired four-state review path, guest-only review renderer, separate decision-feedback decorator, old candidate-review aggregator and local post-game Issue settlement are not retained.

## Local development

```bash
npm ci
npm run check
npm run build
python -m http.server 4173 --directory dist
```

The formal publication compiler additionally requires the public Supabase URL and publishable key so it can read `newsflow_editorial_adoptions`.

## CI and deployment

- `NewsFlow Repository Contract` protects data, authority and publication contracts.
- `NewsFlow Frontend` validates JavaScript, product behavior and the static build.
- `CI Governance` enforces workflow and package-manager policy.
- `Publish autonomous edition` executes the owner-selected 1st/15th publication path.
- GitHub Pages deploys the built artifact only from `main`.

See `DESIGN.md`, `WORKFLOW.md`, `docs/edition-protocol.md` and `docs/ci-governance.md` for the enforceable product and engineering contracts.
