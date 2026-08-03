# DESIGN: NewsFlow

## Product position

NewsFlow is a GitHub-native autonomous publishing system. It does not merely summarize a high-volume feed. It executes an explicit editorial system over time so that continued reading builds domain expertise.

The engine and publication are separate concepts:

- **NewsFlow** supplies the static reader, data contracts, automation and publication runtime;
- an **Edition** defines the publication's reader promise, editorial view, scope, source policy, materiality rules, Storylines and schedule.

The Edition file is the editor. The interface, Agent and workflow execute it.

## Product principles

1. **Strong editor, bounded automation.** Automated workflows process evidence but do not silently change the editor's formal position.
2. **Continuity over novelty.** Every Signal is interpreted against persistent Storylines and prior Issues.
3. **Fixed rhythm, variable length.** Formal Issues appear on the 1st and 15th, including concise no-material-change issues.
4. **Traceability over authority theatre.** Git history, source links, cutoffs and method matter more than platform badges.
5. **GitHub first.** Forks, pull requests, Actions and Pages are the publication infrastructure; no separate certification system is required.
6. **Editorial restraint.** The system must be willing not to publish a low-value item.

## Reader questions

The product should help readers answer, in order:

1. What is the current Edition and what does its editor believe?
2. What changed during the latest publication period?
3. Did the evidence strengthen, weaken, complicate or leave the current view unchanged?
4. Which new Signals are appearing after the latest Issue?
5. How are the long-running Storylines evolving?
6. Where can every claim and source be inspected?

## Core objects

### Edition

The executable editorial constitution. Runtime metadata is read from `public/data/edition.json`; the readable source lives at `editions/reference/edition.yaml`.

### Signal

A normalized evidence item with identity, provenance, quality, layered summaries, tags and canonical source URL. A Signal may appear on the Desk without being adopted into an Issue.

### Editorial Desk

The continuous signal surface. It preserves the current search, filter, bookmark, list/grid and evidence-drawer interactions.

### Storyline

A persistent editorial question with a current view, evidence count, movement and next-watch items. Storylines replace disposable “trending topic” thinking with accumulated domain memory.

### Issue

A frozen semi-monthly publication artifact. It records a central judgment, adopted Signals, Storyline movement, next-watch items, coverage window, Edition version and methodology counts.

### Archive

A chronological record of Issues. It makes the publication's judgment history visible instead of continuously overwriting the present.

## Information architecture

### 1. Persistent top bar

Contains NewsFlow identity, autonomous-Edition status, global search, theme/help controls and mobile navigation. System configuration stays out of the public reading surface.

### 2. Edition identity rail

The left rail begins with the active Edition, GitHub-native status and automatic publication cadence. Existing data version, channels, reading queues and date controls remain below it.

### 3. Edition masthead

The masthead names the Edition rather than a generic daily feed. It states the reader promise, editor, current Issue number and publication cadence.

### 4. Latest Edition

A prominent formal-publication module appears before the Desk. It contains:

- Issue number and coverage dates;
- central title and standfirst;
- current judgment;
- candidate/adopted counts;
- whether the formal editorial view changed;
- direct entry points to adopted Signals.

This module must visually feel like a published front page, not another dashboard card.

### 5. Editorial Desk

The existing lead Signal and stream remain the fast-moving layer. They are explicitly labelled as the Desk so readers understand that not every visible Signal belongs to the formal Issue.

### 6. Storyline rail

The right rail prioritizes long-running questions, current views and evidence movement. High-frequency entities and source mix may remain secondary diagnostics.

### 7. Archive

The main column ends with Issue history, publication dates, automatic/manual provenance and concise standfirsts.

### 8. Evidence drawer

Deep reading preserves layered summaries, supporting evidence, metadata, original-source links and bookmarks. Facts and interpretation must remain distinguishable.

## Visual direction

Retain the Editorial Signal Desk system:

- warm paper canvas and near-black ink;
- restrained blue for evidence and active state;
- muted red only for meaningful movement or freshness;
- `Newsreader` for publication hierarchy;
- `DM Sans` for controls and summaries;
- `Roboto Mono` for dates, issue numbers, scores and method;
- modest radii, visible rules and editorial spacing;
- no neon, glassmorphism, decorative telemetry or stock-news imagery.

The Latest Edition uses stronger typographic hierarchy and horizontal rules. It must remain part of the same publication, not a visually unrelated hero banner.

## Responsive contract

- **Wide desktop:** Edition rail + main publication column + Storyline rail.
- **Compact desktop/tablet:** Edition rail + main column; Storyline rail may hide.
- **Mobile:** single column, full-width Latest Edition, off-canvas filters, bottom navigation and full-width evidence drawer.

No essential action may depend on hover. New buttons require visible focus states and mobile touch targets.

## Automatic publication contract

The reference workflow runs twice monthly and writes `public/data/issues.json`.

- On the 1st, coverage is the 16th through the final day of the previous month.
- On the 15th, coverage is the 1st through the 14th.
- Signals below `materiality.minimum_quality` are rejected.
- Adopted Signals are capped by `materiality.max_signals_per_issue`.
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

## Acceptance criteria

A release is complete only when:

1. `npm run check` passes;
2. `npm run build` produces the complete static site;
3. the Edition masthead, Latest Edition, Desk, Storylines and Archive render from repository payloads;
4. existing search, filters, bookmarks, theme, keyboard navigation and evidence drawer still work;
5. the Edition layer remains dependency-free and fails without breaking the base reader;
6. the semi-monthly workflow can produce both material-change and no-material-change Issues;
7. service-worker caching includes Edition assets and payloads;
8. README, Edition protocol, design contract and runtime describe the same implemented product.
