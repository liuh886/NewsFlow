# TASKS: NewsFlow

## V2.1 — Editorial Signal Desk

### Product and visual direction

- [x] Replace the generic black-and-gold Nexus cockpit with the Editorial Signal Desk direction.
- [x] Establish warm paper surfaces, editorial typography, restrained blue/red signal accents and a coherent dark mode.
- [x] Remove decorative telemetry, glow, stock imagery and oversized dashboard language from the public reading experience.
- [x] Keep the main reading column visually dominant at every desktop breakpoint.

### Information architecture

- [x] Build a minimal persistent top bar with identity, search, theme and keyboard help.
- [x] Build the left edition/channel/filter/date rail.
- [x] Build the masthead, lead signal and non-duplicated article stream.
- [x] Build the lightweight editorial brief rail.
- [x] Build a source-aware evidence drawer for deep reading.
- [x] Add explicit empty and loading states.

### Interaction

- [x] Support full-text search across titles, summaries, evidence and tags.
- [x] Support topic, source tier, quality, bookmark, entity and date filters.
- [x] Persist bookmarks, theme and list/grid layout locally.
- [x] Add keyboard search, navigation, open, save, theme, layout and help controls.
- [x] Add mobile off-canvas filters and bottom navigation.
- [x] Respect reduced-motion preferences and visible keyboard focus.

### Engineering and delivery

- [x] Replace the incomplete frontend entry path with a dependency-free static production build.
- [x] Add deterministic `check` and `build` scripts with a single lockfile.
- [x] Add structured sample payloads and runtime compatibility fallbacks.
- [x] Escape payload content and harden outbound links.
- [x] Add an installable PWA shell and offline caching.
- [x] Add pull-request validation and GitHub Pages deployment from `main`.
- [x] Update README, DESIGN and CI governance to the implemented product stage.
- [ ] Confirm the pull-request workflows pass.
- [ ] Merge the release branch into `main`.
- [ ] Confirm the post-merge Pages deployment succeeds.

## Follow-up backlog

These items are intentionally outside the visual redesign release:

- [ ] Add browser screenshot regression only after a stable cross-platform baseline is available.
- [ ] Connect the production ingestion pipeline to the normalized frontend payload without weakening provenance fields.
- [ ] Add live-origin smoke tests when GitHub Pages deployment settings are stable.
- [ ] Review legacy React/Nexus source for deletion after the static frontend has completed a stable release cycle.
