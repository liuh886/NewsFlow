# NewsFlow

NewsFlow is a GitHub-native autonomous publishing system for high-quality domain Editions.

An editor defines a publication once through an Edition file: its reader promise, editorial view, scope, source policy, materiality rules and long-running questions. NewsFlow then keeps a continuous Editorial Desk and automatically publishes a formal issue on the 1st and 15th of each month.

> Define the editorial system once. Let the publication keep observing.

## Product status

NewsFlow 2.4 introduces a magazine-first reader for the Edition-native publication model. The product remains an installable, dependency-light static web application, but its public hierarchy is no longer shaped like an editorial dashboard.

The default reading order is now:

1. the Edition identity and current publication context;
2. the most important change since the latest Issue;
3. the current formal semi-monthly Issue;
4. the continuous Editorial Desk;
5. compact publication history.

Search, filters, bookmarks, feedback, evidence drawers, dark mode, keyboard navigation, Supabase-backed preference sync and PWA installation remain available.

## Product model

NewsFlow is the engine. An **Edition** is the reader-facing publication.

The reference product uses a strong-editor model:

- the Edition file is the formal editorial authority;
- Signals record traceable new evidence;
- the Editorial Desk runs continuously;
- Storylines accumulate evidence across publication cycles;
- a semi-monthly Issue settles what changed, what did not change and what to watch next;
- automated workflows may describe evidence movement but may not silently rewrite the editor's position.

The first-stage platform remains GitHub-first. There is no separate account, certification or Edition marketplace. Anyone may fork the protocol, while the official interface stays a small, editor-selected publication shelf.

## Editorial Signal Desk

The established Editorial Signal Desk visual language remains the foundation: warm paper surfaces, restrained signal accents, `Newsreader` headlines, compact mono metadata and traceable evidence views.

The 2.4 reader changes its emphasis:

- **Publication before tooling.** The masthead establishes a professional journal, while GitHub and automation remain quiet provenance metadata.
- **New since the Issue.** The latest major Signal is the homepage focal point and is explicitly framed as an update after the latest formal publication.
- **Current Issue.** The formal Issue uses large editorial typography and horizontal rules instead of an elevated dashboard card.
- **Editorial Desk.** The continuing stream becomes a compact numbered reading list; list/grid controls and topic chips no longer dominate the page.
- **Issue-centric panels.** Storylines and the full Archive open beside the publication, preserving the reader's place.
- **Filters on demand.** Channels, queues, dates and bookmarks remain available in a drawer instead of occupying a permanent desktop column.

The resulting experience is intended to feel like a magazine from a distance, a newspaper while scanning and a research brief when opened deeply.

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

### Formal publication artifacts

- `public/data/issues.json`
- `scripts/publish-edition.mjs`
- `.github/workflows/publish-edition.yml`

### Frontend

- `index.html`
- `src/editorial-app.js`
- `src/polish.js`
- `src/edition-layer.js`
- `src/styles.css`
- `src/polish.css`
- `src/edition-layer.css`

## Local development

```bash
npm ci
npm run check
npm run build
python -m http.server 4173 --directory dist
```

Open `http://localhost:4173` after the build completes.

## CI and deployment

- `NewsFlow Repository Contract` protects the repository and documentation boundary.
- `NewsFlow Frontend` validates data, JavaScript, Edition contracts and the deterministic build.
- `CI Governance` enforces workflow authority and package-manager policy.
- `Publish autonomous edition` runs only on schedule or manual dispatch and has the minimum write authority needed to commit a generated Issue.
- `Supabase activity heartbeat` performs bounded public reads to keep the shared free project active.
- `NewsFlow Frontend` deploys the built artifact to GitHub Pages only from `main`.

## Data and trust boundaries

- A valid repository news payload is never mixed with embedded fallback stories.
- The visible data cutoff comes from the active dataset, not the browser clock.
- Facts, source metadata and editorial interpretation remain distinguishable.
- Direct quotes are rendered only when present in the payload.
- External text is escaped and external links use safe target attributes.
- Source tiers and quality scores do not imply independent factual verification.
- Fixed publication rhythm does not imply fixed issue length.
- Public reading controls never receive a service-role or secret Supabase credential.

See `DESIGN.md`, `docs/edition-protocol.md`, `docs/editorial-signal-desk.md` and `docs/ci-governance.md` for the enforceable product, design and engineering contracts.
