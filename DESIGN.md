# DESIGN: NewsFlow

## Product position

NewsFlow is one editorial system with two deliberately different product experiences:

> **Reader Mode is a publication. Editor Mode is a game.**

The product must never collapse those two jobs into a generic dashboard.

- **Reader Mode** presents a serious professional journal: Issue, Signals, Storylines, Archive and evidence.
- **Editor Mode** is a focused card-review game: one manuscript, one decision, immediate consequence, next manuscript.
- **Edition** remains the editorial constitution: reader promise, worldview, scope, source policy, materiality boundaries, Storylines and cadence.
- Automation processes evidence and compiles publication artifacts, but does not silently rewrite the Edition's formal long-term view.

## Core principles

1. **Publication before tooling.** Reader Mode must feel like a journal before it feels like software.
2. **Editor means game mode.** Entering Editor Mode immediately hands the viewport to the review loop.
3. **One review engine.** Formal and invited guest editors share one manuscript renderer and five-decision interaction.
4. **One manuscript, one decision.** No review dashboard, score sheet or duplicate settlement step competes with the manuscript.
5. **Serious surface, playful consequence.** Humour appears after the decision, not before judgment.
6. **Decision is publication intent.** For an authorised editor, Cover Story and Accept are the publication decisions; there is no second `CLOSE ISSUE` judgment.
7. **UI role is not authority.** The Editor experience is broadly usable, while formal publication is restricted to the active owner projection.
8. **New evidence stays attached to prior judgment.** Signals are interpreted against the current Issue and persistent Storylines.
9. **Fixed rhythm, variable length.** Formal Issues publish on the 1st and 15th, including no-change Issues.
10. **Editorial restraint.** The system must be willing not to publish.

## Shared objects

### Edition

The editorial constitution. Runtime metadata comes from `public/data/edition.json`; the readable source lives in `editions/reference/edition.yaml`.

### Signal

A normalized evidence item with provenance, quality, summaries, tags and canonical source URL. A Signal can exist on the continuous Desk without entering a formal Issue.

### Storyline

A persistent editorial question with current view, evidence movement, watch items and falsifiers.

### Review candidate

A manuscript-like candidate assembled from the content pipeline and durable human-preflight state. It is the unit shown in Editor Mode.

### Review record

One editor's five-state decision on one candidate. Formal and guest records share vocabulary but not authority.

### Editorial adoption

The minimal public projection of an active owner's formal publication decision. It contains only candidate ID, `cover_story` or `accept`, and decision time.

### Issue

A frozen semi-monthly publication artifact. It records adopted Signals, optional `cover_signal_id`, Storyline movement, coverage window and publication provenance.

## Mode 1: Reader

Reader Mode is a traditional professional web publication.

### Reader hierarchy

1. publication identity;
2. latest material change since the current Issue;
3. Current Issue;
4. additional Signals accumulating toward the next Issue;
5. Storylines;
6. Archive;
7. evidence and original sources.

### Reader ordering

The homepage and Editorial Desk deliberately use different ordering rules:

- **Homepage lead:** editorial importance can select the strongest current Signal so the publication has a point of view.
- **Editorial Desk:** newest first by `published_at`; recommendation score is only a tie-breaker.
- **Current Issue:** when `cover_signal_id` exists, the cover story receives the strongest visual hierarchy and is followed by ordinary accepted Signals.

This keeps the page from becoming either a raw timestamp feed or an opaque recommendation list.

### Reader visual language

- warm paper canvas and near-black ink;
- restrained evidence blue and editorial red;
- `Newsreader` for publication hierarchy;
- `DM Sans` for controls and summaries;
- `Roboto Mono` for dates, issue numbers and method;
- large headlines and whitespace for the Issue;
- numbered compact rows for the Editorial Desk;
- research-brief treatment for evidence;
- no game HUD or review controls in Reader Mode.

## Mode 2: Editor

The core loop is:

> **一屏一稿，一键裁决，一次反馈，然后下一稿。**

Entering Editor Mode opens the current manuscript rather than tabs, queues, analytics or Issue-management controls.

### Manuscript card

Each viewport contains one dominant card with:

- manuscript number;
- title;
- concise abstract/editorial summary;
- source, date and section;
- one optional original-source link;
- progress such as `03 / 12`.

On desktop the manuscript/card stack uses approximately 80% visual scale while the top identity/progress and bottom decision controls remain full interactive size. The objective is to keep ordinary review within one viewport.

### Five decisions

1. **封面文章 / COVER STORY** — strongest endorsement and preferred Issue lead.
2. **录用 / ACCEPT** — publishable and worth adopting.
3. **小修 / MINOR REVISION** — bounded clarification/evidence work remains.
4. **大修 / MAJOR REVISION** — substantial argument/evidence/framing work remains.
5. **拒稿 / REJECT** — does not meet the current editorial threshold.

Desktop shortcuts are `1–5`; `Z` undoes the immediately previous decision. Mobile keeps the same five choices fixed at the bottom.

### Decision feedback

`read → decide → stamp / quip → (3) → (2) → (1) → next manuscript`

Every decision holds for three seconds unless the editor manually advances or undoes. The feedback beat contains the stamp and a short academic-circle reaction. Reduced-motion removes decorative animation without removing the decision state or three-second rhythm.

Humour targets academic rituals and editorial situations, never authors' identities or protected traits.

## Formal editor, non-authoritative editor and guest editor

All use the same Review Game.

### Authorised formal editor

- is verified through shared-account authority, not by the visual mode selector;
- reviews real pending candidates only;
- decisions are synchronized into private NewsFlow account state;
- `cover_story` and `accept` are projected into the public read-only publication queue;
- `minor_revision`, `major_revision` and `reject` are retained as decisions but do not enter the formal publication queue;
- can create the Guest Editor invitation.

### Editor-mode user without formal authority

- receives the same game experience;
- can preserve personal editorial continuity;
- does not gain formal Edition publication authority merely by selecting Editor Mode.

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
- `newsflow_editorial_adoptions` exposes only active-owner Cover/Accept records needed by publication;
- the browser never receives a service-role credential;
- the compiler reads only the public adoption projection with the publishable key.

## Formal publication contract

The reference workflow runs twice monthly.

- **1st:** coverage is the 16th through the final day of the previous month.
- **15th:** coverage is the 1st through the 14th.
- Only active-owner `cover_story` and `accept` decisions inside the coverage window are eligible.
- Edition maximum-per-Issue and per-channel caps still apply.
- A `cover_story` becomes `cover_signal_id` and the first adopted Signal when selected.
- Selected inbox candidates are promoted into `public/data/news.json` so reader evidence links remain coherent.
- The frozen formal artifact is written to `public/data/issues.json`.
- A no-change Issue is valid when no eligible adoption exists.
- Quality scores support discovery/review but never silently substitute for the owner's publication decision.
- Automation may record Storyline evidence movement but cannot silently alter the Edition's formal worldview.

## Homepage focus

A strong Reader homepage depends on a strong Current Issue, not decorative widgets.

The hierarchy is:

- one important post-Issue change can lead above the Issue;
- the Current Issue remains the stable editorial anchor;
- when a cover exists, it is visually dominant within the Issue;
- ordinary accepted Signals support the cover rather than competing with it;
- the chronological Editorial Desk follows as the continuing evidence stream.

A historically thin Issue remains thin; the product must not pad it retroactively with weaker content merely to create visual volume.

## Branding freshness

The data-freshness badge in the NewsFlow branding is a single idempotent element. Repeated render lifecycle events must update or reuse the same badge, never nest another brand row or append duplicate dates.

## Invitation experience

A Guest Editor invitation opens as a formal `EDITORIAL APPOINTMENT`, not a registration page. It communicates publication identity, role, manuscript count and one primary action: **接受任命**. After acceptance, the guest enters the same Review Game.

## What Editor Mode intentionally excludes

- points, coins or XP;
- streak pressure or daily quests;
- loot boxes or marketplace mechanics;
- leaderboards;
- multi-factor scoring forms;
- reviewer dashboards during the game;
- a second Issue-settlement decision surface.

The game must earn engagement through editorial role-play, rapid judgment and emotional feedback.

## Responsive contract

### Reader

- wide desktop: publication column plus quiet Storyline margin;
- compact desktop/tablet: one publication column and contextual panels;
- mobile: one-column journal with full-width evidence panels.

### Editor

- desktop: centered 80%-scale manuscript/card stack plus full-size five-wide decision rail;
- mobile: manuscript fills usable height and all five decisions remain reachable;
- no essential action depends on hover;
- reduced-motion preserves feedback meaning and timing.

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

1. The reader application owns Signal rendering and chronological Desk order.
2. The Edition layer owns formal Issue hierarchy, cover presentation, Storylines and Archive.
3. The mode controller owns Reader/Editor selection and account-state synchronization, not a second review UI.
4. `review-game.js` owns all formal and guest review interaction.
5. There is no four-state editor path or guest-only duplicate renderer.
6. There is no local post-game `CLOSE ISSUE` workflow.
7. An internal database trigger owns active-owner adoption projection.
8. The publisher reads the public projection; it does not inspect private account state directly.
9. Runtime coordination uses explicit lifecycle events; no `MutationObserver` patch layers.
10. No backward-compatibility layer is retained for retired review architecture.

## Acceptance criteria

A release is complete only when:

1. `npm run check` passes;
2. `npm run build` produces the complete static site;
3. branding freshness remains one date after repeated renders;
4. Reader Mode preserves search, filters, bookmarks and evidence behavior;
5. Editorial Desk is visibly and structurally newest-first;
6. selecting Editor Mode immediately opens the shared Review Game;
7. the five decisions are exactly 封面文章、录用、小修、大修、拒稿;
8. feedback holds for three seconds with `（3）（2）（1）` and then auto-advances;
9. formal review uses real pending candidates and does not silently substitute training cases;
10. Guest review clearly labels any blind exercise fallback;
11. active-owner Cover/Accept decisions synchronize to the public adoption projection;
12. non-owner and Guest decisions do not enter formal publication automatically;
13. the 1st/15th compiler reads only the adoption projection and has no quality-only adoption fallback;
14. a formal cover is persisted as `cover_signal_id` and receives visibly stronger Current Issue treatment;
15. retired local settlement and old candidate-review aggregation are absent;
16. README, design contract and runtime describe the same implemented product.
