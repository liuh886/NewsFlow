# DESIGN: NewsFlow

## Product position

NewsFlow is a GitHub-native autonomous publishing system. It does not merely summarize a high-volume feed. It executes an explicit editorial system over time so that continued reading builds domain expertise.

The engine and publication remain separate concepts:

- **NewsFlow** supplies the static reader, data contracts, automation and publication runtime;
- an **Edition** defines the publication's reader promise, editorial view, scope, source policy, materiality rules, Storylines and schedule.

The Edition file is the editor. The interface, Agent and workflow execute it.

## Reader promise

The public reader must feel like a professional publication before it feels like a tool.

NewsFlow should answer, in order:

1. What publication am I reading?
2. What important evidence appeared after the latest formal Issue?
3. What did the current Issue conclude?
4. What additional Signals are still accumulating toward the next Issue?
5. How are the long-running Storylines changing?
6. Where can the source and evidence be inspected?

## Design decision

The magazine-first direction is defined by four choices:

- the product is perceived first as a professional journal;
- the homepage focal point is the latest major Signal, not the previous Issue cover;
- the visual system combines premium-magazine pacing with different densities for different tasks;
- the formal Issue remains the interaction centre, while Storylines and Archive open beside it.

The concise design statement is:

> NewsFlow looks like a professional journal, but it continues observing between formal Issues.

## Core principles

1. **Publication before tooling.** Search, filters, scores and automation metadata must not determine the first visual impression.
2. **New evidence stays attached to prior judgment.** A Signal is presented as a change since an Issue, not as an isolated headline.
3. **Different surfaces use different densities.** The homepage reads like a magazine, the Desk scans like a newspaper and deep reading behaves like a research brief.
4. **Issue-centred interaction.** Storylines, Archive and evidence open around the publication rather than becoming competing dashboard pages.
5. **Strong editor, bounded automation.** Automated workflows process evidence but do not silently change the editor's formal position.
6. **Continuity over novelty.** Every Signal is interpreted against persistent Storylines and prior Issues.
7. **Fixed rhythm, variable length.** Formal Issues appear on the 1st and 15th, including concise no-material-change Issues.
8. **Editorial restraint.** The system must be willing not to publish a low-value item.
9. **Serious surface, playful consequence.** Game-like emotion belongs in the consequence of an editorial decision, not in decorative chrome or a busy control system.
10. **One manuscript, one decision.** Guest Editor mode must never become a dashboard: one screen presents one manuscript and one five-level editorial decision.

## Core objects

### Edition

The executable editorial constitution. Runtime metadata is read from `public/data/edition.json`; the readable source lives at `editions/reference/edition.yaml`.

### Signal

A normalized evidence item with identity, provenance, quality, layered summaries, tags and a canonical source URL. A Signal may appear on the Desk without being adopted into an Issue.

### Editorial Desk

The continuous evidence surface between formal publication dates. It preserves search, filtering, bookmarks, feedback and evidence-drawer interactions, but does not visually compete with the Issue.

### Storyline

A persistent editorial question with a current view, evidence count, movement, watch items and falsifiers. Storylines replace disposable trending-topic thinking with accumulated domain memory.

### Issue

A frozen semi-monthly publication artifact. It records a central judgment, adopted Signals, Storyline movement, next-watch items, coverage window, Edition version and methodology counts.

### Archive

A chronological record of Issues. It makes the publication's judgment history visible instead of continuously overwriting the present.

### Guest Editor Session

A temporary editorial game session entered through an invitation link. It gives a guest a bounded set of manuscripts to judge without turning the public reader into an admin interface.

A Guest Editor Session records the invited Issue or review batch, manuscript queue, decisions and completion progress. Guest judgments are editorial inputs; they do not silently rewrite the Edition or published Issue.

## Information architecture

### 1. Persistent publication bar

The top bar contains:

- NewsFlow identity and quiet automatic-publication status;
- direct anchors to Current Issue and Editorial Desk;
- controls that open Storylines and Archive in side panels;
- global search;
- feedback, theme, help and filter controls.

The bar must read as publication navigation, not a product dashboard header.

### 2. On-demand filter drawer

Channels, reading queues, date filters and bookmarks remain fully available, but no longer occupy a permanent desktop column.

The drawer opens from the publication bar and mobile navigation. This preserves power-user functionality while returning horizontal space to editorial content.

### 3. Edition masthead

The masthead establishes:

- Edition name;
- reader promise;
- Issue number and publication date;
- next scheduled publication.

GitHub, Agent and configuration details remain provenance metadata rather than headline content.

### 4. New since the Issue

The most important Signal after the latest formal Issue is the homepage visual centre.

It must include:

- an explicit “刊期之后的新变化” label;
- source and publication time;
- headline and editorial summary;
- a quiet indication that the Signal is still being observed before the next Issue;
- direct access to the evidence view and original source.

The reader should understand that this is a provisional update to the publication's current picture, not an independent news alert.

### 5. Current Issue

The formal Issue follows the latest major change and acts as the stable interpretive anchor.

It includes:

- Issue number and coverage period;
- central title and standfirst;
- formal judgment;
- candidate and adopted counts;
- adopted Signals;
- entry to the full Archive.

The Issue is styled with large editorial typography, horizontal rules and open paper space. It must not look like an elevated analytics card.

### 6. Editorial Desk

The Desk follows the Current Issue and contains Signals still accumulating toward the next publication.

The default treatment is a single numbered editorial list:

- no visible list/grid switch;
- restrained source, time and score metadata;
- two-line summaries;
- hidden topic chips unless needed in deep reading;
- actions remain discoverable on hover, focus and touch.

### 7. Storyline margin and panel

On wide desktop, a quiet right margin shows a small set of evolving Storylines. Selecting one opens a side panel without losing the reader's position.

The panel presents:

- the current view;
- evidence movement;
- watch items;
- falsifiers or judgment boundaries;
- the rule that automation cannot silently rewrite the Edition's formal view.

On compact layouts, the margin disappears and the same panel remains available from publication navigation.

### 8. Archive preview and panel

The main reading column ends with a compact preview of recent Issues. The complete Archive opens in a side panel.

This keeps publication history visible without turning the homepage into a database browser.

### 9. Evidence drawer

Deep reading preserves layered summaries, supporting evidence, metadata, original-source links, feedback and bookmarks.

The content sequence should read like a research brief:

1. what changed;
2. why it matters;
3. supporting evidence;
4. relationship to the current editorial view;
5. unresolved uncertainty;
6. original source.

## Guest Editor mode: 严肃得不正经

Guest Editor mode is the product's primary game loop. It should feel like a real editorial appointment and a real manuscript decision system, while the consequence of each decision delivers the humour and emotional reward.

The design rule is:

> 一屏一稿，一键裁决，一次反馈，然后下一稿。

### Invitation entry

An invitation link opens directly into a formal appointment screen rather than a generic account or dashboard page.

The appointment surface contains only:

- Edition and Issue identity;
- the guest role, for example “客座主编”;
- the number of manuscripts waiting for judgment;
- one primary action: **接受任命**.

Authentication must not block the first game loop unless required for security. Identity persistence can be offered after the review session.

### Manuscript card

After accepting the appointment, every viewport presents exactly one manuscript card.

The card contains only the information needed to make an editorial judgment:

- manuscript number;
- title;
- a concise abstract or editorial summary, normally 3–5 lines;
- source, date and channel or section;
- at most one secondary action to inspect evidence or the original source;
- progress such as `7 / 12`.

Do not place score sliders, analytics, filters, Storyline panels, sidebars, dashboards or multi-factor forms on this screen. The guest is here to decide, not configure the system.

### Five editorial decisions

Every manuscript receives exactly one of five decisions:

1. **封面文章 / COVER STORY** — the strongest editorial endorsement; candidate for the Issue lead or cover treatment.
2. **录用 / ACCEPT** — publishable and worth adopting into the Issue.
3. **小修 / MINOR REVISION** — fundamentally acceptable, but needs a bounded clarification, evidence improvement or presentation fix.
4. **大修 / MAJOR REVISION** — potentially valuable, but the argument, evidence or framing needs material work before adoption.
5. **拒稿 / REJECT** — does not meet the Edition's editorial threshold or fit.

The five decisions are the main controls. Desktop may expose keyboard shortcuts `1–5`; touch layouts keep the same five decisions immediately reachable at the bottom of the screen. No secondary confirmation is required for ordinary review decisions.

### Decision feedback

The moment after a decision is where the game lives.

Each decision produces a short, tactile editorial response before the next manuscript arrives:

- **封面文章:** premium cover stamp, brief celebratory treatment and a rare high-value editorial quip;
- **录用:** authoritative `ACCEPTED` stamp and restrained positive response;
- **小修:** `MINOR REVISION` mark with dry academic humour;
- **大修:** heavier `MAJOR REVISION` treatment with a suitably ominous editor note;
- **拒稿:** decisive red `REJECTED` stamp plus a randomly selected academic-circle rejection joke.

The joke is not a separate entertainment panel. It is a one- or two-line editorial aside attached to the decision animation. The visual language stays serious enough that the absurdity comes from contrast.

Examples of the intended humour register include:

- “感谢投稿。本刊与本文的缘分止于摘要。”
- “审稿人二号虽然没有出现，但我们决定尊重他的意见。”
- “小修。理论上。”
- “这是大修，不是让你换一个标题再投回来。”

Humour must target academic rituals and editorial situations, not authors' personal traits, identities or protected characteristics.

### Loop timing

The interaction loop should be fast enough to feel like a game:

`read → decide → stamp / quip → next manuscript`

Decision feedback should be brief and skippable. The interface must not require closing a modal before continuing. The next manuscript should become available automatically after the feedback beat, while still allowing the user to undo the immediately previous decision if needed.

### What the MVP intentionally excludes

The first Guest Editor release does not need:

- points or coins;
- levels or XP;
- a skill tree;
- daily quests or streak pressure;
- loot boxes;
- a marketplace;
- complicated reviewer profiles;
- multi-stage decision forms;
- leaderboards that distort editorial judgment.

The core game must prove itself through decision rhythm, editorial role-play and emotional feedback before any meta-game is considered.

## Visual language

Retain the Editorial Signal Desk foundation:

- warm paper canvas and near-black ink;
- restrained blue for evidence and active state;
- muted red only for meaningful movement or freshness;
- `Newsreader` for publication hierarchy;
- `DM Sans` for controls and summaries;
- `Roboto Mono` for dates, issue numbers, scores and method;
- visible editorial rules;
- no neon, glassmorphism, decorative telemetry or stock-news imagery.

### Magazine layer

Used for the masthead, latest major change and Current Issue:

- large headlines;
- generous vertical rhythm;
- one dominant judgment per viewport;
- minimal framing;
- double or heavy editorial rules instead of cards and shadows.

### Newspaper layer

Used for the Editorial Desk:

- numbered rows;
- compact metadata;
- strong headline scanning;
- consistent horizontal rhythm;
- limited summaries.

### Research-brief layer

Used for evidence and Storyline panels:

- labeled analytical sections;
- explicit fact/interpretation boundaries;
- evidence and uncertainty;
- clear provenance.

### Guest Editor game layer

Used only during invited review sessions:

- one manuscript card dominates the viewport;
- no permanent side navigation;
- five decisions form the only strong control group;
- typography and paper surfaces remain journal-like;
- decision stamps, page movement and brief editorial asides provide the game feel;
- animation is short, tactile and optional under reduced-motion settings;
- humour appears only after a decision, never as decorative clutter before one.

## Responsive contract

- **Wide desktop:** publication column plus a quiet Storyline margin; filters remain in a drawer.
- **Compact desktop/tablet:** single publication column; Storylines and Archive open from the top bar.
- **Mobile:** single-column journal, bottom navigation for new change, Current Issue, filters and Archive, full-width evidence and Storyline panels.
- **Guest Editor:** one manuscript fills the usable viewport at every size; the five decisions stay reachable without scrolling away from the manuscript context.

No essential action may depend on hover. New buttons require visible focus states and mobile touch targets.

## Automatic publication contract

The reference workflow runs twice monthly and writes `public/data/issues.json`.

- On the 1st, coverage is the 16th through the final day of the previous month.
- On the 15th, coverage is the 1st through the 14th.
- Signals below `materiality.minimum_quality` are rejected.
- Adopted Signals are capped per channel and per Issue.
- A no-change Issue is valid and required when nothing qualifies.
- Automation records evidence movement but sets `editorial_view_changed: false` unless a committed Edition-file change explicitly says otherwise.

## Trust and quality requirements

- Repository data and fallback data remain mutually exclusive.
- Visible freshness comes from payload dates.
- Source tiers and quality scores do not claim independent verification.
- Generated Issues expose candidate count, selected count, primary-source count, Edition version and automation provenance.
- All external text is escaped before insertion into HTML.
- Original source links remain safely reachable.
- The Edition layer must fail softly: if Edition payloads are unavailable, the base Signal Desk remains usable.
- Public clients never receive Supabase secret or service-role credentials.
- Guest Editor decisions are recorded separately from the Edition's formal editorial authority until an explicit publication workflow adopts them.
- Invitation tokens must be revocable or time-bounded and must not embed privileged credentials in the URL.

## Acceptance criteria

A release is complete only when:

1. `npm run check` passes;
2. `npm run build` produces the complete static site;
3. the Edition masthead, latest post-Issue Signal, Current Issue, Desk, Storyline panel and Archive panel render from repository payloads;
4. existing search, filters, bookmarks, feedback, theme, keyboard navigation and evidence drawer still work;
5. the permanent desktop filter column is removed without removing filter access;
6. the Current Issue no longer uses dashboard-card elevation;
7. desktop and mobile preserve the hierarchy “new change → Issue → Desk”;
8. the Edition layer remains dependency-free and fails without breaking the base reader;
9. the semi-monthly workflow can produce both material-change and no-material-change Issues;
10. README, Edition protocol, design contract and runtime describe the same implemented product;
11. Guest Editor mode renders exactly one manuscript as the primary task per screen;
12. every manuscript exposes exactly the five decisions 封面文章、录用、小修、大修、拒稿;
13. every decision produces an immediate editorial feedback beat and then advances without a blocking modal;
14. the Guest Editor screen remains usable on mobile without introducing a dashboard or secondary navigation hierarchy.
