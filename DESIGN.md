# DESIGN: NewsFlow

## Product position

NewsFlow is one editorial system with two deliberately different product experiences:

> **Reader Mode is a publication. Editor Mode is a game.**

The product must never collapse those two jobs into a generic dashboard.

- **Reader Mode** presents a premium professional journal: Edition, Issue, Sections, Signals, Storylines, Archive and evidence.
- **Editor Mode** is a focused card-review game: one manuscript, one decision, immediate consequence, next manuscript.
- **Edition** remains the editorial constitution: reader promise, worldview, scope, source policy, materiality boundaries, Storylines and cadence.
- Automation processes evidence and compiles publication artifacts, but does not silently rewrite the Edition's formal long-term view.

The reference Reader identity is **Frontier Systems Review**. `NewsFlow` appears as the publishing engine, not as a competing Reader masthead.

## Core principles

1. **Publication before tooling.** Reader Mode must feel like a journal before it feels like software.
2. **One editorial focal point.** The Current Issue is the homepage anchor; post-Issue updates remain visible but secondary.
3. **Taxonomy is visible.** Readers can reach AI 基建 and CCUS 与能源转型 without opening a filter drawer.
4. **Reading is a first-class surface.** Formal reading uses a full-page article surface; the side drawer is quick evidence inspection.
5. **Editor means game mode.** Entering Editor Mode immediately hands the viewport to the review loop.
6. **One review engine.** Formal and invited guest editors share one manuscript renderer and five-decision interaction.
7. **One manuscript, one decision.** No review dashboard, score sheet or duplicate settlement step competes with the manuscript.
8. **Serious surface, playful consequence.** Humour appears after the decision, not before judgment.
9. **Decision is publication intent.** For an authorised editor, Cover Story and Accept are the publication decisions; there is no second `CLOSE ISSUE` judgment.
10. **UI role is not authority.** The Editor experience is broadly usable, while formal publication is restricted to the active owner projection.
11. **Fixed rhythm, variable length.** Formal Issues publish on the 1st and 15th, including no-change Issues.
12. **Editorial restraint.** The system must be willing not to publish and must not pad thin historical Issues.

## Shared objects

### Edition

The editorial constitution. Runtime metadata comes from `public/data/edition.json`; the readable source lives in `editions/reference/edition.yaml`.

### Signal

A normalized evidence item with provenance, quality, summaries, tags and canonical source URL. A Signal can exist in Latest without entering a formal Issue.

### Storyline

A persistent editorial question with current view, evidence movement, watch items and falsifiers. Storylines also provide the existing second-level Reader taxonomy.

### Review candidate

A manuscript-like candidate assembled from the content pipeline and durable human-preflight state. It is the unit shown in Editor Mode.

### Review record

One editor's five-state decision on one candidate. Formal and guest records share vocabulary but not authority.

### Editorial adoption

The minimal public projection of an active owner's formal publication decision. It contains only candidate ID, `cover_story` or `accept`, and decision time.

### Issue

A frozen semi-monthly publication artifact. It records adopted Signals, optional `cover_signal_id`, Storyline movement, coverage window and publication provenance.

## Mode 1: Reader

Reader Mode is a premium academic journal / boutique magazine website.

### Reader hierarchy

1. Edition identity and publication navigation;
2. Current Issue as the first major editorial event;
3. Cover Story / Issue judgment and accepted stories;
4. compact changes since the current Issue;
5. chronological Latest stream;
6. explicit section landing pages;
7. Research Agenda / Storylines;
8. Archive;
9. full-page Reading Surface and original evidence.

The first viewport should answer, within seconds: **What publication is this? Which Issue is current? What is its central judgment? What are the main sections?**

### Global navigation

Reader navigation is:

`本期 | 最新 | AI 基建 | CCUS 与能源转型 | 长期议题 | 归档`

Right-side product chrome is secondary. Search stays compact until focused; theme/account remain available; Reader/Editor mode switching is a quiet text-level control. Feedback/help/editor shortcuts do not compete with publication navigation.

### Current Issue

The Current Issue is the only homepage hero.

- `cover_signal_id`, when present, determines the preferred Cover Story action.
- The Issue title/judgment and standfirst carry the strongest typography.
- Ordinary accepted Signals sit below as secondary Issue entries.
- Cover headlines are not repeated as a second oversized row.
- Internal selection metrics, score meters and verification badges do not compete with editorial content.

Post-Issue updates are deliberately compact. They demonstrate that NewsFlow keeps observing between fixed publication dates without making the site feel like a breaking-news dashboard.

### Sections

Top-level Reader sections come directly from the Edition:

- **AI 基建**
- **CCUS 与能源转型**

Second-level taxonomy reuses existing Storylines rather than creating another taxonomy configuration.

AI:

`能源 | 芯片 | 基础设施 | 模型 | 应用`

CCUS:

`项目交付 | CO₂ 网络与商业结构 | 制度、证据与责任`

Section routes use `#section/<channel-id>`. They expose only two ordering choices:

- **最新** — newest first;
- **精选** — formally adopted Signals first, then the existing editorial quality signal as tie-break.

No new recommendation engine is introduced.

### Latest

The continuous Editorial Signal Desk is reader-facing as **最新**.

- newest first by `published_at`;
- recommendation score only breaks ties;
- compact numbered newspaper rows;
- title click opens the full Reading Surface;
- the small article action remains quick evidence inspection.

### Reading Surface

Formal deep reading uses `#read/<signal-id>`.

Desktop body measure is approximately **740px**. The article hierarchy is:

1. channel / date / source;
2. headline;
3. standfirst;
4. `NewsFlow Editorial Desk` byline;
5. 发生了什么;
6. 为什么重要;
7. 证据与来源;
8. 长期议题;
9. 相关阅读;
10. same-channel previous / next.

The original source is always directly reachable. Related reading uses existing channel/Storyline relationships only. The Reading Surface does not invent another recommendation model.

The legacy side drawer remains valuable as **quick evidence**, not as the primary magazine-reading experience.

### Reader visual language

- warm paper canvas and near-black ink;
- one restrained editorial blue plus semantic red only where needed;
- `Newsreader` for publication hierarchy;
- `DM Sans` for reading/UI copy;
- `Roboto Mono` mainly for dates and provenance;
- strong whitespace and editorial rules;
- fewer pills, badges and rounded controls;
- no score meters in the main publication hierarchy;
- no game HUD or review controls in Reader Mode.

### Responsive contract

- wide desktop: publication column plus quiet Storyline margin;
- around **920px**: one publication column and contextual panels;
- around **720px**: one-column article/publication layout with simplified controls;
- around **430px**: compact mobile typography, no horizontal overflow, source/meta wrapping and readable 17px+ Reading Surface body copy.

## Mode 2: Editor

The core loop is:

> **一屏一稿，一键裁决，一次反馈，然后下一稿。**

Entering Editor Mode opens the current manuscript rather than tabs, queues, analytics or Issue-management controls.

### Manuscript card

Each viewport contains one dominant card with manuscript number, title, concise summary, source/date/section, original-source link and progress such as `03 / 12`.

On desktop the manuscript/card stack uses approximately 80% visual scale while top identity/progress and bottom decisions remain full interactive size. The objective is ordinary review within one viewport.

### Five decisions

1. **封面文章 / COVER STORY** — strongest endorsement and preferred Issue lead.
2. **录用 / ACCEPT** — publishable and worth adopting.
3. **小修 / MINOR REVISION** — bounded clarification/evidence work remains.
4. **大修 / MAJOR REVISION** — substantial argument/evidence/framing work remains.
5. **拒稿 / REJECT** — does not meet the current editorial threshold.

Desktop shortcuts are `1–5`; `Z` undoes the previous decision. Mobile keeps all five choices fixed at the bottom.

### Decision feedback

`read → decide → stamp / quip → (3) → (2) → (1) → next manuscript`

Every decision holds for three seconds unless manually advanced or undone. Reduced-motion removes decorative animation without removing the decision state or timing.

## Formal editor, non-authoritative editor and guest editor

All use the same Review Game.

### Authorised formal editor

- verified through shared-account authority, not the visual mode selector;
- reviews real pending candidates only;
- decisions synchronize into private NewsFlow account state;
- `cover_story` and `accept` project into the public read-only publication queue;
- `minor_revision`, `major_revision` and `reject` do not enter formal publication;
- can create Guest Editor invitations.

### Editor-mode user without formal authority

- receives the same game experience;
- can preserve personal editorial continuity;
- does not gain formal publication authority by selecting Editor Mode.

### Guest editor

- enters through a public appointment URL;
- does not need registration before the first review loop;
- uses the same card and five-decision bar;
- produces parallel opinions only;
- may receive clearly labeled blind exercises from already public Signals when the live packet is sparse;
- never changes the formal publication queue automatically.

Invitation URLs never contain privileged credentials.

## Publication flow

```text
research
  → candidate pack
  → review queue
  → Review Game
  → private editor state
  → active-owner adoption projection
  → scheduled compiler
  → Signal + Issue artifacts
  → Reader Mode
```

The authority boundary is intentionally asymmetric:

- private account state can contain all five editor decisions;
- `newsflow_editorial_adoptions` exposes only active-owner Cover/Accept records required by publication;
- the browser never receives a service-role credential;
- the compiler reads only the public adoption projection with the publishable key.

## Formal publication contract

- **1st:** coverage is the 16th through the final day of the previous month.
- **15th:** coverage is the 1st through the 14th.
- Only active-owner `cover_story` and `accept` decisions inside the coverage window are eligible.
- Edition maximum-per-Issue and per-channel caps still apply.
- A `cover_story` becomes `cover_signal_id` and the first adopted Signal when selected.
- Selected inbox candidates are promoted into `public/data/news.json` so Reader links remain coherent.
- The frozen Issue is written to `public/data/issues.json`.
- A no-change Issue is valid when no eligible adoption exists.
- Quality scores support discovery/review but never substitute for the owner's publication decision.
- Automation may record Storyline evidence movement but cannot silently alter the Edition's worldview.

## Branding freshness

The data-freshness badge is one idempotent element. Repeated render lifecycle events update or reuse it; they never nest another brand row or append duplicate dates.

## What Editor Mode intentionally excludes

- points, coins or XP;
- streak pressure or daily quests;
- loot boxes or marketplace mechanics;
- leaderboards;
- multi-factor scoring forms;
- reviewer dashboards during the game;
- a second Issue-settlement decision surface.

## Trust and quality requirements

- Repository data and fallback data remain mutually exclusive.
- Visible freshness comes from payload dates.
- Source tiers and quality scores do not claim independent verification.
- External text is escaped before HTML insertion.
- Original-source links remain safely reachable.
- Public clients never receive Supabase service-role credentials.
- Formal, non-authoritative and guest decisions remain distinguishable.
- Public adoption rows expose only publication-safe metadata.
- Guest invitations are appointments, not authority tokens.

## Architecture constraints

1. `editorial-app.js` owns Signal data, chronological Latest rendering and quick evidence drawer.
2. `edition-layer.js` owns Edition identity, Issue hierarchy, section landing pages, Storylines and Archive.
3. `reading-surface.js` owns full-page article route/state/rendering only.
4. `magazine-polish.js/.css` owns Reader lifecycle and final publication polish, not core content state.
5. The mode controller owns Reader/Editor selection and account sync, not a second review UI.
6. `review-game.js` owns all formal and guest review interaction.
7. There is no four-state editor path, guest-only duplicate renderer or local post-game `CLOSE ISSUE` workflow.
8. An internal database trigger owns active-owner adoption projection.
9. The publisher reads the public projection; it does not inspect private account state directly.
10. Runtime coordination uses explicit lifecycle events; no `MutationObserver` patch layers.
11. No backward-compatibility layer is retained for retired architecture.

## Acceptance criteria

A Reader v3 release is complete only when:

1. `npm run check` passes;
2. `npm run build` produces the complete static site;
3. branding freshness remains one date after repeated renders;
4. Reader browser identity and masthead are Edition-first;
5. Current Issue appears before post-Issue updates and is the single homepage focal point;
6. AI 基建 and CCUS 与能源转型 are directly reachable Reader sections;
7. second-level taxonomy comes from existing Storylines;
8. Latest is visibly and structurally newest-first;
9. section ordering exposes only 最新 / 精选;
10. title/deep-read actions open a full-page 740px Reading Surface;
11. the small article action remains quick evidence inspection;
12. Reader score meters/tool chrome do not compete with publication hierarchy;
13. ~920px / 720px / 430px responsive boundaries preserve hierarchy without horizontal overflow;
14. selecting Editor Mode immediately opens the shared Review Game;
15. the five decisions remain exactly 封面文章、录用、小修、大修、拒稿;
16. feedback remains three seconds with `（3）（2）（1）` before auto-advance;
17. active-owner Cover/Accept drives formal publication and non-owner/Guest decisions do not;
18. README, DESIGN and runtime describe the same implemented product.
