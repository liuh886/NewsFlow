# TASKS: Newsflow

## 🚀 Launch Blockers (High Priority)

### [V1.3] Unified CLI & Web Configuration Integration
- [x] **Root-Level CLI**: Implement the `newsflow` root-level Python wrapper for unified project management.
    - [x] `update <topic>`: Redirect to `agent-backend/agent/cli.py full --topic <topic>`.
    - [x] `web`: Execute `npm run preview`.
    - [x] `config`: Start the `config_server.py`.
- [x] **Config Backend Bridge**:
    - [x] Create `agent-backend/config_server.py` using Flask.
    - [x] Implement `GET /api/config` to read from `skills/newsflow/config/`.
    - [x] Implement `POST /api/config` to save back to `skills/newsflow/config/`.
- [x] **UI Config Integration**:
    - [x] Add `ConfigButton.tsx` in `src/components/`.
    - [x] Integrate into `src/App.tsx` top-right action bar.
    - [x] Implement `ConfigModal` to fetch and update JSON settings via the Flask bridge.

### [V1.4] Production Hardening
- [x] **Environment Validation**: Add a startup check for required environment variables (`DEEPSEEK_API_KEY`, `PPLX_API_KEY`).
- [x] **CLI Inconsistency**: Resolve the missing `card` command in `agent-backend/agent/cli.py` referenced by GitHub Actions.
- [x] **Landing Page**: Verify `dist/index.html` and assets work correctly on a static host (GitHub Pages).

---

## ✅ Completed Tasks

### [V1.2] Information Source Architecture & Hardening
- [x] Update `DESIGN.md` with "Strategic Energy Intelligence" and "Information Source Architecture"
- [x] Install `feedparser` dependency in `agent-backend`
- [x] Update `energy.json` with geopolitical queries and primary RSS feeds (IEA, EIA, Reuters, etc.)
- [x] Update `ai_digest.json` with AI/Tech specific RSS feeds
- [x] Verify discovery results (Confirmed: enriched items on oil prices, LNG, and Hormuz)

---

## 📈 Post-Launch Improvements & Hardening
- [x] **[V1.5] Backend Card Generation**: Professional Python renderer for high-fidelity news cards.
- [x] **[V1.5] Environment-Driven Frontend**: Backend URLs in `ConfigModal.tsx` now use environment variables.
- [x] **[V1.5] CLI UX Improvement**: `newsflow web/config` now optionally open the browser.
- [x] **[V1.5] Security & Validation**: 
    - [x] Restricted `config_server.py` CORS origins.
    - [x] JSON structure validation for configuration updates.
- [x] **UI Refactor**: Extracted inline styles in `ConfigModal.tsx` to `ConfigModal.module.css`.
- [x] **Skill Expansion**: Added `tech.json` and integrated it into the backend bridge and `DESIGN.md`.
- [x] **Monitoring**: Added `agent/test_config.py` for autonomous backend and config validation.

### [V1.6] Content Expansion & Card Depth Upgrade
- [x] **Design Anchor Update**: Record the unified content schema, mixed source pool, and quote-aware presentation contract in `DESIGN.md`.
- [x] **Source Catalog Expansion**:
    - [x] Expand `energy.json` with tiered institutional, industry, and analyst feeds. (IEA, EIA, Reuters Energy, Carbon Pulse, CarbonCredits, TradeWinds, CSIS, RMI, Canary Media).
    - [x] Expand `tech.json` with official, builder, and engineering-blog feeds.
    - [x] Expand `ai_digest.json` with official, builder, and research/blogger feeds.
    - [x] **Metadata Mapping**: Ensure every `rss.sources` item in config includes `label`, `tier`, and `kind`.
- [x] **Backend Data Generation Upgrade**:
    - [x] **Discovery Logic**: Update `discovery.py` to map items to their config metadata (tier/kind) based on URL matching.
    - [x] **RSS Cleaning**: Implement robust HTML stripping before passing text to the LLM for enrichment.
    - [x] **Enrichment Prompt**: Refine the prompt in `enrichment.py` to strictly enforce the "layered summary" format and include a "no-hallucination" quote constraint.
    - [x] **Quote Verification**: Add an optional substring check to verify extracted quotes in `enrichment.py`.
- [x] **Frontend React Component Upgrades**:
    - [x] **Schema Support**: Ensure `src/types.ts` is fully aligned with the backend's new `NewsItem` payload.
    - [x] **Card Surface (NewsCard.tsx)**:
        - [x] Display `short_summary` as the primary text.
        - [x] Render `key_quote` prominently with stylized blockquote.
        - [x] Add `Tier A` visual badge for high-signal sources.
    - [x] **Expanded View (NewsCard.tsx)**:
        - [x] Render `long_summary` with improved typography and spacing.
        - [x] Show `supporting_quotes` stack if available.
        - [x] Ensure mobile-friendly layout for expanded content.
    - [x] **Search Logic (App.tsx)**: Extend the search filter to include `long_summary` and quotes.
- [x] **UI State & UX Enhancements**:
    - [x] **Progress Feedback**: Implement "Processing..." state in `ConfigModal.tsx` for manual updates.
    - [x] **Zero-Data State**: Add a user-friendly placeholder for empty topics.
- [ ] **Validation & Verification**:
    - [ ] Execute `newsflow update` for all topics and verify JSON output contains the new fields.
    - [ ] Perform a "Zero Breaking" check to ensure legacy items still render via fallbacks.
    - [ ] Verify search performance with expanded text fields.

### [V1.7] PWA & GitHub Pages Automated Deployment
- [x] **PWA Integration & Configuration**:
    - [x] Install `vite-plugin-pwa` dev dependency.
    - [x] Configure `VitePWA` in `vite.config.ts` with manifest and Workbox caching strategies (`StaleWhileRevalidate` for `public/data/*.json`, `CacheFirst` for static assets).
    - [x] Generate high-fidelity PWA icons (192x192, 512x512, 512x512 maskable, apple-touch-icon, favicon.svg).
    - [x] Update `index.html` with mobile/PWA meta tags (`theme-color`, `apple-mobile-web-app-capable`, `viewport-fit=cover`).
    - [x] Adapt `index.css` for standalone mobile safe area padding.
- [x] **GitHub Pages & CI/CD Pipeline**:
    - [x] Update `.github/workflows/newsflow-sync.yml` with GitHub Pages build and deploy steps (`upload-pages-artifact`, `deploy-pages`).
    - [x] Configure appropriate workflow permissions (`pages: write`, `id-token: write`, `contents: write`).
- [x] **Graceful Degradation**:
    - [x] Enhance `ConfigModal.tsx` for static deployment (show read-only offline/cloud mode status instead of generic connection failure).
- [x] **Verification & Validation**:
    - [x] Verify `npm run build` succeeds and produces `dist/sw.js`, `dist/manifest.webmanifest`, and cached assets.

### [V1.8] Command Palette & Cockpit Navigation
- [x] **Command Palette Component (`src/components/CommandPalette.tsx`)**:
    - [x] Global `Cmd+K` / `Ctrl+K` keylistener and top search bar trigger button with `<kbd>` indicator.
    - [x] Obsidian Pro styling with dark glassmorphism, glowing borders, and smooth framer-motion animations.
    - [x] Fast fuzzy/keyword filtering across Topics, News Items, Actions, and Feeds.
    - [x] Full keyboard support (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- [x] **Cockpit Keyboard Shortcuts (`src/App.tsx`)**:
    - [x] `j` / `k` (or `↓` / `↑`) card-by-card focus navigation with scroll-into-view and glowing border highlight.
    - [x] `Enter` / `Space` to expand/collapse focused card's deep analysis (`long_summary` + quotes).
    - [x] `s` to trigger sharing/poster modal for focused card.
    - [x] `t` to toggle theme, `l` to toggle grid/list layout.
    - [x] `?` to toggle keyboard shortcuts cheat sheet.
- [x] **UI Integration & Header Search Upgrade**:
    - [x] Upgrade header search bar to interactive Command Palette trigger.
    - [x] Add shortcuts helper badge in bottom-right/header.
- [x] **Verification**:
    - [x] Verify `npm run build` and ensure zero TypeScript/linter errors.

### [V2.0] Nexus Design System & 3-Column Intelligence Station Overhaul
- [x] **Design Token System (`src/index.css`)**:
    - [x] Establish strict Nexus CSS tokens: `--bg-canvas`, `--bg-surface-1`, `--bg-surface-2`, `--border-subtle`, `--border-default`, `--text-primary`, `--text-secondary`, channel accents (`--channel-ai`, `--channel-energy`, `--channel-tech`).
    - [x] Enforce consistent typography hierarchy (`Plus Jakarta Sans` for display, `Inter` for body, `JetBrains Mono` for metadata/HUD).
    - [x] Create standardized component classes: `.nexus-card`, `.nexus-pill`, `.nexus-modal`, `.nexus-btn`, `.nexus-input`.
- [x] **Lead Signal Hero Section (`src/components/LeadSignalHero.tsx`)**:
    - [x] Build editorial anchor hero component displaying the day's highest-signal breakthrough (`★ 8.5+`).
    - [x] Include high-impact headline, structured executive takeaway, full verified quote block, and quick actions.
- [x] **Intelligence Radar & Trend Cockpit (`src/components/IntelligenceRadar.tsx`)**:
    - [x] Build right-hand intelligence drawer with:
        - Executive Daily Brief (今日 3 大趋势洞察)
        - Entity & Theme Cloud (实体词云: DeepSeek, NVIDIA, SMR, VRAM, Grid...) with one-click filtering
        - Signal Health & Source Tier breakdown.
- [x] **3-Column Station Layout & Navigation Rail (`src/App.tsx`)**:
    - [x] Left Rail: Channel selector with live count badges, signal quality filter slider (`All` / `Tier A` / `★ 8.0+` / `⭐ Bookmarks`), interactive date timeline.
    - [x] Center Stream: Hero lead signal + grid/list card stream with bookmarking support (`localStorage`).
    - [x] Right Drawer: Intelligence Radar & Executive Briefs.
    - [x] Top Mission Control Header: Unified search bar, live telemetry pulse, view & theme switcher.
- [x] **Unified NewsCard Archetype (`src/components/NewsCard.tsx`)**:
    - [x] Standardize layout: Channel Pill + Source Tier Badge + Star Quality Badge + Relative Time (`2h ago`).
    - [x] High-readability takeaway with keyword emphasis, verified quote callout box, and deep analysis accordion.
    - [x] Bookmark / favorite toggle with local persistence.
- [x] **Standardize All Modals (`CommandPalette.tsx`, `ShareModal.tsx`, `ConfigModal.tsx`, `ShortcutsModal.tsx`)**:
    - [x] Unify backdrop blur, border radiuses, modal header with ESC badge, and action button styles across all dialogs.
- [x] **Verification & Validation**:
    - [x] Run `npm run build` and ensure zero errors.
    - [x] Commit and push to GitHub repository.

