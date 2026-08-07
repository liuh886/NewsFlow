# NewsFlow

NewsFlow is a GitHub-native professional publication with two deliberately different experiences on one editorial system:

> **Reader Mode is a publication. Editor Mode is a game.**

An Edition defines the reader promise, editorial view, scope, source policy, materiality boundaries and long-running Storylines. NewsFlow continuously gathers candidate evidence, lets editors judge it through a card-review game, and publishes a formal Issue on the 1st and 15th of each month.

## Product status

NewsFlow has one coherent editorial pipeline connecting evidence discovery, the five-state Review Game and formal semi-monthly publication. Reader and Editor remain separate experiences, while the same content and authority model connects them underneath.

### Reader Mode

Reader Mode is designed as a premium academic journal / boutique magazine rather than an analytics dashboard. The reference Edition is **Frontier Systems Review**; NewsFlow is the publishing engine beneath it.

The Reader hierarchy is now:

1. Edition identity and explicit publication navigation;
2. the Current Issue as the homepage focal point;
3. the Cover Story / Issue judgment and accepted stories;
4. compact updates since the Issue;
5. the chronological Latest stream;
6. explicit section pages for **AI 基建** and **CCUS 与能源转型**;
7. Research Agenda / Storylines and Issue Archive;
8. a full-page Reading Surface for long-form reading, with the evidence drawer retained as quick inspection.

The global Reader navigation is intentionally simple:

`本期 | 最新 | AI 基建 | CCUS 与能源转型 | 长期议题 | 归档`

The two top-level sections reuse the Edition's existing Storylines as second-level taxonomy. AI exposes 能源 / 芯片 / 基础设施 / 模型 / 应用; CCUS exposes 项目交付 / CO₂ 网络与商业结构 / 制度、证据与责任. Section pages support only `最新 / 精选` ordering and use hash routes rather than a router framework.

A formal `cover_signal_id` makes the Current Issue the one dominant homepage editorial event. Post-Issue changes remain visible, but they no longer compete with the Issue for first visual priority.

The Reading Surface uses `#read/<signal-id>` and a 740px desktop reading measure. Its hierarchy is channel/date/source → headline → standfirst → NewsFlow Editorial Desk → 发生了什么 → 为什么重要 → 证据与来源 → 长期议题 → 相关阅读 → same-channel navigation. The small article action remains the quick evidence drawer.

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

The Editorial Signal Desk is the continuous evidence stream between formal Issues. In Reader Mode it is presented simply as **最新** and is chronological by default, newest first by `published_at`; recommendation score is used only as a tie-breaker.

Search, filters, bookmarks, quick evidence views and Storylines remain supporting reader tools. The Desk can expose strong evidence before it is adopted into a formal Issue; appearing in the Desk does not equal formal publication.

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

The invitee accepts an `EDITORIAL APPOINTMENT` and enters the same five-decision game. Guest judgments remain parallel editorial opinions. If the live packet is sparse, already-public Signals may appear only as clearly labeled blind editorial exercises.

## Main runtime ownership

- `src/editorial-app.js` — Reader data, filters, chronological Latest stream and quick evidence drawer;
- `src/edition-layer.js` — Edition identity, Current Issue, section landing pages, Storylines and Archive;
- `public/magazine-polish.js/.css` — Reader lifecycle, idempotent freshness branding and final editorial visual restraint;
- `public/reading-surface.js/.css` — full-page article routing, reading hierarchy and related reading;
- `public/editorial-office.js` — Reader / Editor mode and shared-account state sync;
- `public/review-game.js` — the single formal/guest review state machine;
- `public/data/editorial-reactions.json` — serious-play editorial reactions;
- `supabase/newsflow-editorial.sql` — publication authority and adoption projection;
- `scripts/publish-edition.mjs` — owner-selected semi-monthly compiler.

The retired four-state review path, guest-only review renderer, separate decision-feedback decorator, old candidate-review aggregator and local post-game Issue settlement are not retained.

## Reader v3 visual contract

The Reader deliberately keeps typography and page composition stronger than software chrome:

- Newsreader carries publication hierarchy; DM Sans carries reading/UI copy; Roboto Mono is limited to dates/provenance;
- warm paper, near-black ink and one editorial blue remain the primary palette;
- Current Issue has exactly one dominant focal point;
- score meters and verification badges do not compete with editorial content;
- section names are not repeated as two competing hero headings;
- search is visually secondary until focused;
- Reader mode switching is a quiet text control rather than a pill/button centerpiece;
- desktop, tablet and mobile rules are explicitly maintained at ~920px, 720px and 430px boundaries;
- the Reading Surface keeps a 740px desktop measure and 17px+ mobile body type.

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
