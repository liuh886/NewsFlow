# DESIGN: NewsFlow

## Product goal

NewsFlow turns high-volume news streams into a focused, reviewable information flow. The product helps a reader answer four questions in order:

1. What changed?
2. Why does it matter?
3. How strong is the source and evidence?
4. Where can the original material be inspected?

The frontend is not a general news portal and not an AI cockpit. It is a personal editorial desk for scanning, judging, saving and deep-reading signals.

## Current product architecture

### Static frontend

The production frontend is a dependency-free static application:

- `index.html` — document shell and metadata;
- `src/styles.css` — Editorial Signal Desk visual system;
- `src/editorial-app.js` — state, normalization, rendering, filtering and interaction logic;
- `public/` — PWA assets and structured data;
- `scripts/check.mjs` — frontend, data and integrity validation;
- `scripts/build.mjs` — deterministic `dist/` compiler.

The previous incomplete React/Nexus source is not part of the production build. New frontend work must target the static entrypoints above unless a future migration replaces them atomically with an equally complete build and deployment path.

### Data layer

The frontend reads three compatible payloads:

- `public/data/news.json`
- `public/data/ai_digest.json`
- `public/data/topics.json`

A normalized news item supports:

- identity: `id`, `title`, `url`;
- provenance: `source`, `source_tier`, `published_at`;
- judgment: `quality_index`, `tags`;
- layered reading: `short_summary`, `long_summary`;
- evidence: `key_quote`, `supporting_quotes`.

Historical payloads are normalized at runtime. All externally supplied text is escaped before rendering. Direct quotes may be empty and must never be fabricated merely to fill the interface.

### Payload precedence and fallback

Repository data and fallback data are mutually exclusive:

1. If `news.json` or `ai_digest.json` contains usable entries, only those repository entries are rendered.
2. If both repository payloads are unavailable or empty, a small verified fallback snapshot is activated.
3. Fallback entries must use traceable institutional or author URLs and must never be concatenated with a valid repository payload.
4. Deduplication occurs only inside the selected source set.

This rule prevents demonstration content from silently entering a real information stream.

### Freshness semantics

The interface must not infer freshness from the browser clock. It derives a dataset cutoff from the latest valid `published_at` value in the active source set.

- Sidebar label: **数据版本**.
- Masthead metadata: **Data through [dataset date]**.
- Lead label: **首要信号**, not “今日首要信号”.

A stale dataset can still be browsed, but it must never be presented as current merely because the page was opened today.

### Deployment

`npm run check` validates the product, data and integrity contracts. `npm run build` produces `dist/`. The Pages workflow deploys `dist/` only from `main` and keeps pull-request runs read-only. Versioned frontend filenames and service-worker cache names are used when data or runtime semantics change.

## Visual direction: Editorial Signal Desk

### Design principle

The interface should feel like a modern editorial workspace: calm, literate, precise and highly scannable. Professional quality comes from hierarchy, rhythm, typography and restraint rather than glassmorphism, glow, decorative dashboards or large stock imagery.

### Visual foundations

- **Primary canvas:** warm paper rather than pure white.
- **Core ink:** near-black with restrained gray hierarchy.
- **Signal accent:** editorial blue for active filters, evidence and actions.
- **Live accent:** muted red used only for status and freshness indicators.
- **Headlines:** `Newsreader`, with compact line height and strong optical hierarchy.
- **Interface text:** `DM Sans`, optimized for controls and summaries.
- **Metadata:** `Roboto Mono`, reserved for dates, scores, tiers and keyboard hints.
- **Corners:** modest radii; round pills only for compact controls and tags.
- **Shadows:** used only for floating drawers, mobile navigation and elevated dialogs.

Dark mode preserves the same hierarchy and does not become a neon variant.

## Information architecture

### 1. Persistent top bar

The top bar contains only:

- NewsFlow identity and status;
- global search;
- theme and keyboard-help controls;
- mobile navigation trigger.

Configuration and system operations must not dominate the public reading interface.

### 2. Left navigation rail

The left rail contains:

- data-version summary and source mode;
- topic channels;
- reading queues: all, high conviction, primary sources and bookmarks;
- compact date-density navigation.

On mobile it becomes an off-canvas sheet.

### 3. Main editorial column

The main column contains:

- a typographic masthead with the dataset cutoff;
- one lead signal selected by quality, source tier and evidence depth;
- a list or grid stream of remaining signals;
- an explicit empty state with a reset action.

The lead signal is not repeated in the stream.

### 4. Brief rail

The right rail is secondary and visually quiet. It contains:

- three editorial highlights;
- high-frequency entities;
- source-tier distribution.

It disappears on narrower desktop layouts rather than compressing the reading column.

### 5. Evidence drawer

Deep reading opens in a right-side drawer that preserves the user’s place in the stream. It presents:

- source and publication metadata;
- layered summaries;
- direct and supporting quotes when available;
- tags and source classification;
- original-source and bookmark actions.

## Interaction contract

The frontend supports:

- topic, source-tier, quality, bookmark, entity and date filters;
- full-text search across titles, summaries, quotes and tags;
- local bookmark persistence;
- list/grid persistence;
- light/dark theme persistence;
- keyboard navigation: search, previous/next, open, save, theme, layout and help;
- mobile bottom navigation and off-canvas filters;
- installable PWA and offline app shell.

Animations must be short, functional and removed under `prefers-reduced-motion`.

## Responsive contract

- **Wide desktop:** left rail + main editorial column + brief rail.
- **Compact desktop/tablet:** left rail + main column; brief rail hidden.
- **Mobile:** single main column, off-canvas filters, bottom navigation and full-width evidence drawer.

No essential function may depend on hover. Tap targets should remain usable at mobile sizes, and focus-visible states must be clearly identifiable.

## Quality and trust requirements

- The interface may distinguish source tier and quality score without implying independent factual verification.
- Source links open safely with `noopener noreferrer`.
- Payload text is escaped before insertion into HTML.
- Empty or malformed payloads fall back gracefully and exclusively.
- Dataset freshness is always represented by the payload cutoff date.
- Legacy terminology such as “Nexus”, “HUD”, “cockpit”, “live synthesis” and “intelligence station” must not return to the primary UI.
- New decorative modules must justify their value to reading, judgment or traceability.

## Acceptance criteria

A release is complete only when:

1. `npm run check` passes;
2. `npm run build` produces a complete `dist/` site;
3. desktop and mobile layouts preserve the hierarchy above;
4. search, filters, bookmarks, theme, keyboard navigation and evidence drawer work without a framework runtime;
5. repository payloads and fallback data cannot be mixed;
6. the visible cutoff date comes from the active dataset;
7. the Pages workflow can deploy the artifact from `main`;
8. README, design and CI documents describe the same implemented architecture.
