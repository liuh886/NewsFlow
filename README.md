# NewsFlow

NewsFlow turns high-volume news streams into a focused, reviewable information flow. It is designed for people who need to identify material changes, understand why they matter, and retain a traceable path back to the source.

## Product status

NewsFlow 2.1.1 is an implemented, installable static web product. The frontend is dependency-free, builds deterministically, works on GitHub Pages, and retains an exclusive verified fallback only when repository payloads are completely unavailable.

## Editorial Signal Desk

The frontend uses the **Editorial Signal Desk** visual system rather than a generic AI dashboard:

- warm paper surfaces and restrained blue/red signal accents;
- editorial serif headlines with compact sans-serif interface text;
- a lead story, fast-scanning stream, light editorial brief rail, and evidence drawer;
- source-tier, quality, topic, date, search, bookmark, and entity filters;
- list/grid layouts, dark mode, keyboard navigation, mobile navigation, and PWA installation;
- escaped content rendering and safe external-link handling.

The product keeps information density high without turning the reading experience into a glowing cockpit or an image-heavy news portal.

## Local development

```bash
npm ci
npm run check
npm run build
python -m http.server 4173 --directory dist
```

Open `http://localhost:4173` after the build completes.

## Data contract

The static frontend reads:

- `public/data/news.json`
- `public/data/ai_digest.json`
- `public/data/topics.json`

A news item supports layered summaries, direct quotes, source tier, quality score, tags, publication time, and a canonical source URL. Historical payloads continue to render through runtime normalization.

Data handling follows two strict rules:

1. A valid repository payload is rendered by itself and is never mixed with embedded fallback stories.
2. The interface reports the latest publication date in the active dataset as the data cutoff; it does not label an older snapshot as “today”.

If both repository news payloads are missing or empty, the frontend activates a small fallback snapshot whose entries link directly to traceable institutional or author sources.

## Production entrypoints

- `index.html` — document shell and metadata
- `src/editorial-app.js` — state, normalization, filtering, rendering and interactions
- `src/styles.css` — Editorial Signal Desk visual system
- `public/` — structured data and PWA assets
- `scripts/check.mjs` — product, data and integrity validation
- `scripts/build.mjs` — deterministic static compiler

## CI and deployment

Two progressive workflows protect the repository:

1. `NewsFlow Repository Contract` verifies the implemented product boundary, package-manager contract, and required files.
2. `NewsFlow Frontend` runs the frontend/data checks, builds `dist/`, and deploys the artifact to GitHub Pages from `main`.

Deployment permissions are isolated to the Pages workflow. Pull requests run validation and build steps without deploying.

## Development boundary

- Changes are proposed through pull requests.
- Exactly one recognized lockfile is committed.
- `check` and `build` remain deterministic and repository-local.
- Generated or external news data must preserve provenance fields and must not be treated as verified merely because it renders successfully.
- Fallback data must remain exclusive, traceable and secondary to repository payloads.
- `node_modules/`, `dist/`, Python caches, secrets, and local environment files are not committed.

See `docs/ci-governance.md` and `docs/editorial-signal-desk.md` for the enforceable engineering and design contracts.
