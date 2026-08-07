# NewsFlow

NewsFlow is a GitHub-native autonomous publishing system for high-quality domain Editions.

An Edition defines the reader promise, editorial view, scope, source policy, materiality rules and long-running questions. NewsFlow keeps a continuous evidence desk and automatically publishes a formal Issue on the 1st and 15th of each month.

> Define the editorial system once. Let the publication keep observing.

## Product status

NewsFlow now has two deliberately different product modes built on the same content system:

> **Reader Mode is a publication. Editor Mode is a game.**

### Reader Mode

Reader Mode is the normal NewsFlow website. It keeps the magazine-first hierarchy:

1. Edition identity and publication context;
2. the most important change since the latest Issue;
3. the current formal semi-monthly Issue;
4. the continuous Editorial Desk;
5. Storylines and Archive;
6. evidence and original sources.

Search, filters, bookmarks, local feedback, evidence drawers, dark mode, keyboard navigation, account integration and PWA installation remain supporting reader capabilities.

### Editor Mode

Selecting **Editor** no longer opens an admin dashboard. It immediately opens the full-screen Review Game:

> 一屏一稿，一键裁决，一次反馈，然后下一稿。

Every manuscript uses one shared five-decision model:

1. 封面文章 / COVER STORY
2. 录用 / ACCEPT
3. 小修 / MINOR REVISION
4. 大修 / MAJOR REVISION
5. 拒稿 / REJECT

Desktop shortcuts are `1–5`. Mobile keeps the same five decisions fixed at the bottom of the viewport. After a decision, an editorial stamp and a short academic-circle reaction appear before the next manuscript advances automatically. `Z` undoes the immediately previous decision.

Formal editors and invited Guest Editors use the **same Review Game renderer and decision model**. The difference is authority, not UI:

- formal editors review real pending candidates and their Cover Story / Accept decisions can enter post-game Issue composition;
- Guest Editors enter through a public appointment link and produce parallel opinions that do not gain Edition authority;
- when a guest packet needs filler, already public Signals can appear only as clearly labeled blind editorial exercises.

Issue composition is intentionally post-game. It appears after the review queue has been processed rather than competing with the manuscript during judgment.

## Product model

NewsFlow is the engine. An **Edition** is the reader-facing publication.

The reference product uses a strong-editor model:

- the Edition file is the formal editorial authority;
- Signals record traceable new evidence;
- the Editorial Desk runs continuously;
- Storylines accumulate evidence across publication cycles;
- a semi-monthly Issue settles what changed, what did not change and what to watch next;
- automated workflows may describe evidence movement but may not silently rewrite the editor's position.

The first-stage platform remains GitHub-first. The optional shared membership widget is separate from the Edition, Signal and Issue data model.

## Reader visual system

The reader retains the Editorial Signal Desk foundation: warm paper surfaces, restrained signal accents, `Newsreader` headlines, compact mono metadata and traceable evidence views.

- **Publication before tooling.** The masthead establishes a professional journal while GitHub and automation remain quiet provenance metadata.
- **New since the Issue.** The latest major Signal is framed as an update after the latest formal publication.
- **Current Issue.** Formal publication uses editorial typography and rules rather than dashboard-card elevation.
- **Editorial Desk.** The continuing stream scans as a compact numbered list.
- **Issue-centric panels.** Storylines and Archive open beside the publication.
- **Filters on demand.** Channels, queues, dates and bookmarks stay in a drawer.

The reader should feel like a magazine from a distance, a newspaper while scanning and a research brief when opened deeply.

## Review Game architecture

The frontend deliberately has one review engine:

- `public/editorial-office.js` — Reader / Editor identity controller only;
- `public/editorial-mode.css` — mode-switch presentation;
- `public/review-game.js` — shared formal and guest review state machine;
- `public/review-game.css` — card stack, five-decision rail, stamps, completion and post-game settlement;
- `public/data/editorial-reactions.json` — bounded serious-play reaction library;
- `public/data/guest-editor-invites.json` — public Guest Editor appointment registry.

The retired four-state Editorial Office renderer, guest-only review renderer and separate decision-feedback decorator are not retained.

## Guest Editor invitation

A Guest Editor invitation is a public appointment link, not an authority token. The reference invitation uses:

`?guest-editor=frontier-systems-review`

The invitee sees an `EDITORIAL APPOINTMENT`, accepts the role and enters the same card-review experience as a formal editor. Invitation URLs must never include privileged Supabase credentials.

## Automatic publication

`.github/workflows/publish-edition.yml` runs at 09:15 Asia/Shanghai on the 1st and 15th of each month.

The deterministic reference compiler:

- calculates the correct half-month coverage window;
- applies the Edition's quality threshold and per-channel Signal cap;
- records Storyline evidence movement;
- publishes a no-material-change Issue when no Signal reaches the threshold;
- never changes the Edition file or claims that the editor's formal view changed;
- commits the generated Issue artifact and triggers the normal Pages deployment path.

Run it locally with:

```bash
npm run publish:edition:dry-run
node scripts/publish-edition.mjs --date=2026-08-15 --force --dry-run
```

## Repository contracts

### Human-maintained editorial authority

- `editions/reference/edition.yaml` — readable Edition source;
- `public/data/edition.json` — runtime projection used by the frontend;
- `docs/edition-protocol.md` — product and governance contract.

### Continuously updated evidence

- `public/data/news.json`
- `public/data/ai_digest.json`
- `public/data/topics.json`
- `public/data/storylines.json`
- `content/state/pipeline-review-queue.json`

### Formal publication artifacts

- `public/data/issues.json`
- `scripts/publish-edition.mjs`
- `.github/workflows/publish-edition.yml`

### Frontend

- `index.html`
- `src/editorial-app.js`
- `src/polish.js`
- `src/edition-layer.js`
- `public/editorial-office.js`
- `public/review-game.js`
- `public/editorial-mode.css`
- `public/review-game.css`

## Local development

```bash
npm ci
npm run check
npm run build
python -m http.server 4173 --directory dist
```

Open `http://localhost:4173` after the build completes.

## CI and deployment

- `NewsFlow Repository Contract` protects repository and documentation boundaries.
- `NewsFlow Frontend` validates data, JavaScript, product contracts and the deterministic build.
- `CI Governance` enforces workflow authority and package-manager policy.
- `Publish autonomous edition` runs on schedule or manual dispatch with bounded write authority.
- `Supabase activity heartbeat` performs bounded public reads to keep the shared free project active.
- `NewsFlow Frontend` deploys the built artifact to GitHub Pages only from `main`.

## Data and trust boundaries

- A valid repository news payload is never mixed with embedded fallback stories.
- Visible data cutoff comes from the active dataset, not the browser clock.
- Facts, source metadata and editorial interpretation remain distinguishable.
- External text is escaped and external links use safe target attributes.
- Source tiers and quality scores do not imply independent factual verification.
- Public reading controls never receive service-role or secret Supabase credentials.
- Formal and guest review records remain distinguishable.

See `DESIGN.md`, `docs/edition-protocol.md`, `docs/editorial-signal-desk.md` and `docs/ci-governance.md` for the enforceable product, design and engineering contracts.
