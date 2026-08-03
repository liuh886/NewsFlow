# NewsFlow

NewsFlow turns high-volume news streams into a focused, reviewable information flow. It is designed for people who need to identify material changes, understand why they matter, and retain a traceable path back to the source.

## Product status

NewsFlow is now an implemented, installable static web product. The frontend is dependency-free, builds deterministically, works on GitHub Pages, and retains a local fallback feed when generated payloads are temporarily unavailable.

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

A news item supports layered summaries, direct quotes, source tier, quality score, tags, publication time, and a canonical source URL. Historical payloads continue to render through normalized fallbacks.

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
- `node_modules/`, `dist/`, Python caches, secrets, and local environment files are not committed.

See `docs/ci-governance.md` and `docs/editorial-signal-desk.md` for the enforceable engineering and design contracts.
