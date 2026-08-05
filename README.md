# NewsFlow

NewsFlow is a GitHub-native autonomous publishing system for high-quality domain Editions.

An editor defines a publication once through an Edition file: its reader promise, editorial view, scope, source policy, materiality rules and long-running questions. NewsFlow then keeps a continuous Editorial Desk and automatically publishes a formal issue on the 1st and 15th of each month.

> Define the editorial system once. Let the publication keep observing.

## Product status

NewsFlow 2.3.0 is an implemented, installable static web product. It now combines the mature signal-reading frontend with an Edition-native publication layer, persistent Storylines, formal Issue artifacts and a scheduled semi-monthly compiler. The frontend remains dependency-free, builds deterministically and deploys through GitHub Pages.

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

The reader now exposes four distinct layers while retaining the established Editorial Signal Desk visual system:

1. **Latest Edition** — the most recent formal semi-monthly issue and its central judgment;
2. **Editorial Desk** — continuously updated material Signals;
3. **Storylines** — persistent questions and current evidence movement;
4. **Archive** — frozen Issue artifacts and publication history.

The visual system remains a calm editorial workspace: warm paper surfaces, restrained signal accents, serif headlines, compact metadata, evidence drawers, keyboard navigation, mobile navigation, dark mode and PWA installation.

## Automatic publication

`.github/workflows/publish-edition.yml` runs at 09:15 Asia/Shanghai on the 1st and 15th of each month.

The deterministic reference compiler:

- calculates the correct half-month coverage window;
- applies the Edition's quality threshold and maximum Signal count;
- records Storyline evidence movement;
- publishes a no-material-change Issue when no Signal reaches the threshold;
- never changes the Edition file or claims that the editor's formal view changed;
- commits the generated Issue artifact and triggers the normal Pages deployment path.

Run it locally with:

```bash
npm run publish:edition:dry-run
node scripts/publish-edition.mjs --date=2026-08-15 --force --dry-run
```

## Supabase activity heartbeat

NewsFlow shares the portfolio membership database hosted on Supabase. `.github/workflows/supabase-activity.yml` performs three minimal, read-only database queries every day at 11:17 Asia/Shanghai.

The heartbeat:

- uses only the public Supabase publishable key;
- remains constrained by existing grants and Row Level Security;
- reads the active NewsFlow product, price and entitlement metadata;
- never inserts synthetic rows or touches customer, subscription or payment records;
- fails visibly when any request is unsuccessful;
- records each successful run in the GitHub Actions history and step summary.

The daily cadence provides a wider safety margin than waiting until the sixth day of Supabase's seven-day inactivity window. It is an operational safeguard, not a paid availability guarantee. See `docs/supabase-activity.md` for the security boundary and runbook.

## Agent-assisted content updates

Local agents research into a temporary candidate evidence pack; they do not edit the public Signal dataset directly. A deterministic promotion command enforces the run cutoff, trusted-source registry, claim-level evidence, novelty, independent evidence/editorial thresholds and duplicate review before writing accepted Signals and a durable audit trail.

The workflow is agent-neutral. Start Codex, Antigravity or another repository-capable agent at the project root and ask it to read `WORKFLOW.md`. Every runtime writes the same schema-valid candidate pack, records its identity and workflow version, and submits to the same validator. Antigravity can invoke the repository adapter with `/update-content`.

The repository-local `newsflow-recommender` Skill adds an adaptive layer without weakening evidence gates. The PWA can record anonymous local feedback, hide a Signal only on the current device, export events for a local Agent, regenerate a reader profile and rank verified Signals. See `docs/feedback-loop.md` for the GitHub Pages boundary and feedback bridge.

Optional Supabase account sync is implemented and remains Free-plan conscious: current-state upserts only, no high-frequency analytics, no Realtime dependency and strict owner-based RLS. It is disabled by default and activates during deployment only when both public repository variables are configured. See `docs/supabase-feedback-design.md` for setup and verification.

```bash
node scripts/update-content.mjs --input=content/inbox/2026-08-03.json
node scripts/update-content.mjs --input=content/inbox/2026-08-03.json --apply
```

Dry-run is the default. See `WORKFLOW.md` for the portable procedure, `docs/agent-handoff.md` for reusable launch requests, `docs/content-update.md` for the candidate contract, `docs/attention-policy.md` for the scarce-attention gate, `config/content-discovery.json` for the two-channel search plan, `docs/ai-five-layer-watchlist.md` for the Energy → Chips → Infrastructure → Models → Applications framework, `docs/x-scout-watchlist.md` for discovery-only X accounts, `docs/domain-watchlist.md` for current leader-company coverage, `docs/ccus-report-watchlist.md` for CCUS institutions and recurring reports, and `AGENTS.md` for the generic content-agent boundary.

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
- `config/content-sources.json`
- `config/content-discovery.json`
- `content/runs/`

### Formal publication artifacts

- `public/data/issues.json`
- `scripts/publish-edition.mjs`
- `.github/workflows/publish-edition.yml`

### Operational automation

- `.github/workflows/supabase-activity.yml`
- `docs/supabase-activity.md`

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
- `Supabase activity heartbeat` performs read-only database health queries with `contents: read` repository permissions.
- `NewsFlow Frontend` deploys the built artifact to GitHub Pages only from `main`.

## Data and trust boundaries

- A valid repository news payload is never mixed with embedded fallback stories.
- The visible data cutoff comes from the active dataset, not the browser clock.
- Facts, source metadata and editorial interpretation remain distinguishable.
- Direct quotes are rendered only when present in the payload.
- External text is escaped and external links use safe target attributes.
- Source tiers and quality scores do not imply independent factual verification.
- Fixed publication rhythm does not imply fixed issue length.
- Supabase publishable credentials never replace RLS as the data-access boundary.

See `DESIGN.md`, `docs/edition-protocol.md`, `docs/editorial-signal-desk.md`, `docs/supabase-activity.md` and `docs/ci-governance.md` for the enforceable product, design and engineering contracts.
