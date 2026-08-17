import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [
  index, loader, app, interactions, edition, magazine, latest, reading, shareCard, office, game, governance,
  startup, sw, build, pages, navigationCss, readingCss, readerRuntime, readerCssEntry, design
] = await Promise.all([
  read('index.html'), read('public/editorial-loader.js'), read('src/reader/core.js'), read('src/reader/interactions.js'),
  read('src/reader/edition.js'), read('src/reader/magazine.js'), read('public/latest-surface.js'), read('public/reading-surface.js'),
  read('public/share-card.js'), read('public/editorial-office.js'), read('public/review-game.js'), read('public/editorial-governance.js'),
  read('public/startup-resilience.js'), read('public/sw.js'), read('scripts/build.mjs'), read('.github/workflows/pages.yml'),
  read('src/reader/navigation.css'), read('src/reader/reading.css'), read('src/reader-runtime.js'), read('src/reader.css'), read('DESIGN.md')
]);

for (const [name, source] of Object.entries({ app, interactions, edition, magazine, latest, reading, shareCard, office, game, governance, startup })) {
  if (source.includes('MutationObserver')) throw new Error(`${name} must use explicit lifecycle events.`);
}

for (const contract of ["loadJson('./data/news.json')", "new CustomEvent('newsflow:rendered')", 'AbortSignal.timeout(5000)', '按时间排序']) {
  if (!app.includes(contract)) throw new Error(`Reader missing ${contract}`);
}
for (const forbidden of ['verifiedFallbackItems', './data/ai_digest.json', '信号评分', '高置信度']) {
  if (app.includes(forbidden)) throw new Error(`Reader contains retired editorial state: ${forbidden}`);
}
for (const contract of ['ensureMobileReaderSearch', 'syncEditionDialogAccessibility', 'syncEditionRouteFromLocation', 'trapFocusWithin', 'NewsFlowA11y']) {
  if (!interactions.includes(contract)) throw new Error(`Reader interactions missing ${contract}`);
}

for (const contract of ["from('newsflow_editorial_members')", "window.HaoAccount?.can?.('newsflow.pro')", 'isEditorialMember',
  'openEditorialOverview', 'window.HaoAccount?.open?.()', 'window.NewsFlowReviewGame?.openOverview?.()', 'window.NewsFlowMode'
]) if (!office.includes(contract)) throw new Error(`Editorial permission router missing ${contract}`);
for (const retired of ['MODE_STORAGE_KEY', 'newsflow_mode_v3', 'roleCard(', 'renderDialog', '你以什么身份进入编辑部？']) {
  if (office.includes(retired) || loader.includes(retired)) throw new Error(`Retired identity-mode path returned: ${retired}`);
}
if (!office.includes("removeAttribute('data-newsflow-role')") || !loader.includes("removeAttribute('data-newsflow-role')")) {
  throw new Error('Editorial permission must not leak into Reader navigation controls.');
}

for (const contract of ["from('newsflow_candidates')", "from('newsflow_editorial_reviews')", "state.editorialRole === 'editor_in_chief'", 'openOverview', 'window.NewsFlowReviewGame']) {
  if (!game.includes(contract)) throw new Error(`Review Game missing ${contract}`);
}
for (const retired of ['openGuest', 'openSettlement', 'CLOSE ISSUE', 'saveProductData']) {
  if (game.includes(retired)) throw new Error(`Review Game contains retired path: ${retired}`);
}

for (const contract of ["from('newsflow_governance_drafts')", '刊物判断', '长期议题', '信源', '编辑部', '发布到 GitHub']) {
  if (!governance.includes(contract)) throw new Error(`Governance surface missing ${contract}`);
}
for (const contract of [
  'cover_signal_id', 'Published with Newsflow', "new CustomEvent('newsflow:edition-rendered')", '#section/',
  "issue?.lifecycle === 'live'", 'publishedIssueById', 'const issues = publishedIssues();', 'readerUtilityState',
  '期刊目录', 'data-issue-current', '<span>最新</span>'
]) {
  if (!edition.includes(contract)) throw new Error(`Reader edition owner missing ${contract}`);
}
for (const retired of ['archivedIssues', 'data-target="latest-change"', 'renderPostIssueIntro', '最新更新']) {
  if (edition.includes(retired)) throw new Error(`Reader edition owner contains retired parallel publication path: ${retired}`);
}
for (const contract of [
  'let latestOpen = false', "dataset.latestAction = 'open'", 'Latest adopted signals', "window.addEventListener('newsflow:edition-rendered'",
  "new CustomEvent('newsflow:latest-closed')", "classList.toggle('is-latest-hidden'", "data-edition-layer=\"latest\""
]) {
  if (!latest.includes(contract)) throw new Error(`Latest Surface missing ${contract}`);
}
if (latest.includes('MutationObserver') || latest.includes('window.fetch =') || latest.includes("new CustomEvent('newsflow:rendered')")) throw new Error('Latest Surface must remain a scoped presentation owner.');
if (!edition.includes("window.addEventListener('newsflow:latest-closed', applyEditionLayer)")) throw new Error('Edition owner must restore itself after Latest closes.');
for (const contract of [
  "const ROOT_ID = 'newsflow-reading-surface-root'", '#read/', 'canonicalArticleUrl', "window.addEventListener('newsflow:rendered'", 'nf-reading-progress',
  "data-reading-action=\"open-share\"", 'NewsFlowShareCard', 'navigator.share', 'copy-link', 'renderController', 'AbortController',
  'syncShareDialogAccessibility', 'NewsFlowA11y?.trapFocusWithin'
]) {
  if (!reading.includes(contract)) throw new Error(`Reading Surface missing ${contract}`);
}
if (reading.includes('<h2>发生了什么</h2>')) throw new Error('Reading Surface must not repeat the standfirst as a second summary section.');
if (reading.includes('stopImmediatePropagation') || reading.includes('window.fetch =')) throw new Error('Reading Surface must not take global ownership.');
for (const contract of ['width: min(760px, 54vw)', 'background: var(--surface-raised)', '@keyframes nf-reading-sheet-in', '.nf-share-dialog', '.nf-reading-progress']) {
  if (!readingCss.includes(contract)) throw new Error(`Reading surface styling missing ${contract}`);
}
for (const contract of ['SHARE_WIDTH = 1080', 'SHARE_HEIGHT = 1440', 'WHY IT MATTERS', 'window.NewsFlowShareCard']) {
  if (!shareCard.includes(contract)) throw new Error(`Share card renderer missing ${contract}`);
}
for (const contract of ['.mobile-menu-button::before', 'mask-image:', 'repeat(4, minmax(0, 1fr))']) {
  if (!navigationCss.includes(contract)) throw new Error(`Mobile navigation missing ${contract}`);
}
if (startup.includes('window.fetch =')) throw new Error('Startup resilience must not patch fetch.');

const runtimeModules = ['./reader/core.js', './reader/interactions.js', './reader/edition.js', './reader/magazine.js'];
for (const modulePath of runtimeModules) {
  if (!readerRuntime.includes(`import '${modulePath}';`)) throw new Error(`Canonical Reader runtime missing ${modulePath}`);
}
for (let index = 1; index < runtimeModules.length; index += 1) {
  if (readerRuntime.indexOf(runtimeModules[index - 1]) > readerRuntime.indexOf(runtimeModules[index])) {
    throw new Error('Canonical Reader runtime module order changed.');
  }
}
const visualModules = ['./reader/base.css', './reader/interactions.css', './reader/edition.css', './reader/magazine.css', './reader/navigation.css', './reader/reading.css'];
for (const modulePath of visualModules) {
  if (!readerCssEntry.includes(`@import '${modulePath}';`)) throw new Error(`Canonical Reader visual entry missing ${modulePath}`);
}
for (let index = 1; index < visualModules.length; index += 1) {
  if (readerCssEntry.indexOf(visualModules[index - 1]) > readerCssEntry.indexOf(visualModules[index])) {
    throw new Error('Canonical Reader visual cascade order changed.');
  }
}

for (const asset of ['./startup-resilience.js?v=__NEWSFLOW_VERSION__', './reader-runtime.js?v=__NEWSFLOW_VERSION__', './latest-surface.js?v=__NEWSFLOW_VERSION__', './share-card.js?v=__NEWSFLOW_VERSION__', './reading-surface.js?v=__NEWSFLOW_VERSION__', './editorial-loader.js?v=__NEWSFLOW_VERSION__', './reader.css?v=__NEWSFLOW_VERSION__']) {
  if (!index.includes(asset)) throw new Error(`Index missing current Reader asset ${asset}`);
}
for (const retiredAsset of ['./editorial-app.js', './polish.js', './edition-layer.js', './magazine-polish.js', './styles.css', './polish.css', './edition-layer.css', './magazine-polish.css', './reader-navigation.css', './reading-surface.css']) {
  if (index.includes(retiredAsset) || sw.includes(retiredAsset) || build.includes(retiredAsset)) throw new Error(`Historical Reader layer returned: ${retiredAsset}`);
}
for (const editorAsset of ['./review-game.js', './editorial-office.js', './editorial-governance.js']) {
  if (index.includes(editorAsset)) throw new Error(`Reader must not eagerly load editor-only asset ${editorAsset}`);
  if (!loader.includes(editorAsset)) throw new Error(`Lazy editor loader missing ${editorAsset}`);
}
for (const retired of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json', 'ai_digest.json', 'editorial-mode.css']) {
  if (index.includes(retired) || sw.includes(retired) || build.includes(retired) || loader.includes(retired)) throw new Error(`Reader artifact exposes retired data/state: ${retired}`);
}
for (const contract of ["const ASSET_VERSION = '__NEWSFLOW_VERSION__'", 'newsflow-reader-v${ASSET_VERSION}', './data/source-registry.json', './data/governance-status.json', './feed.xml', './rss.xml', 'reader.css', 'reader-runtime.js', "versioned('./latest-surface.js')", "versioned('./share-card.js')"]) {
  if (!sw.includes(contract)) throw new Error(`Service worker missing ${contract}`);
}
for (const editorAsset of ["versioned('./review-game.js')", "versioned('./editorial-office.js')", "versioned('./editorial-governance.js')"]) {
  if (sw.includes(editorAsset)) throw new Error(`Reader app shell must not precache editor-only asset ${editorAsset}`);
}
for (const contract of ['generatePublicationPages', "resolve(dist, 'feed.xml')", "resolve(dist, 'rss.xml')", "resolve(dist, 'sitemap.xml')", "entryPoints: [resolve(root, 'src/reader.css')]", "resolve(dist, 'reader-runtime.js')", 'READER_RUNTIME_GZIP_BUDGET', 'svgTextLines(body, 28, 5)']) {
  if (!build.includes(contract)) throw new Error(`Build missing static publication/Reader contract ${contract}`);
}
if (build.includes('readerStylePaths')) throw new Error('Build must consume src/reader.css instead of owning a second cascade list.');
if (!build.includes('minify: true')) throw new Error('Production Reader runtime must be minified.');
for (const contract of ['/articles/<signal-id>/', 'Share contract', 'the React `App.tsx` / `src/components/*.tsx` Reader prototype']) {
  if (!design.includes(contract)) throw new Error(`DESIGN missing current Reader contract ${contract}`);
}
if (!pages.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")) throw new Error('Pages main deployment cancellation policy regressed.');

console.log('NewsFlow frontend architecture contract passed: one canonical Reader runtime, one canonical Reader visual entry, issue-first publication, explicit Latest, canonical article reading, editorial sharing, four-task mobile navigation and explicit lifecycle boundaries.');
