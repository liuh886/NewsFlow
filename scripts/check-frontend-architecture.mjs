import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [index, loader, app, polish, edition, reading, office, game, governance, startup, sw, build, pages, navigationCss, readingCss] = await Promise.all([
  read('index.html'), read('public/editorial-loader.js'), read('src/editorial-app.js'), read('src/polish.js'), read('src/edition-layer.js'), read('public/reading-surface.js'),
  read('public/editorial-office.js'), read('public/review-game.js'), read('public/editorial-governance.js'),
  read('public/startup-resilience.js'), read('public/sw.js'), read('scripts/build.mjs'), read('.github/workflows/pages.yml'),
  read('public/reader-navigation.css'), read('public/reading-surface.css')
]);

for (const [name, source] of Object.entries({ app, polish, edition, reading, office, game, governance, startup })) {
  if (source.includes('MutationObserver')) throw new Error(`${name} must use explicit lifecycle events.`);
}

for (const contract of ["loadJson('./data/news.json')", "new CustomEvent('newsflow:rendered')", 'AbortSignal.timeout(5000)', '按时间排序']) {
  if (!app.includes(contract)) throw new Error(`Reader missing ${contract}`);
}
for (const forbidden of ['verifiedFallbackItems', './data/ai_digest.json', '信号评分', '高置信度']) {
  if (app.includes(forbidden)) throw new Error(`Reader contains retired editorial state: ${forbidden}`);
}
for (const contract of ['ensureMobileReaderSearch', 'syncEditionDialogAccessibility', 'syncEditionRouteFromLocation']) {
  if (!polish.includes(contract)) throw new Error(`Reader polish missing ${contract}`);
}

for (const contract of [
  "from('newsflow_editorial_members')", "window.HaoAccount?.can?.('newsflow.pro')", 'isEditorialMember',
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
  '期刊目录', 'data-issue-current'
]) {
  if (!edition.includes(contract)) throw new Error(`Edition layer missing ${contract}`);
}
for (const retired of ['archivedIssues', 'data-target="latest-change"', 'renderPostIssueIntro', '最新更新']) {
  if (edition.includes(retired)) throw new Error(`Edition layer contains retired parallel publication path: ${retired}`);
}
for (const contract of ["const ROOT_ID = 'newsflow-reading-surface-root'", '#read/', 'canonicalArticleUrl', "window.addEventListener('newsflow:rendered'"]) {
  if (!reading.includes(contract)) throw new Error(`Reading Surface missing ${contract}`);
}
if (reading.includes('stopImmediatePropagation') || reading.includes('window.fetch =')) throw new Error('Reading Surface must not take global ownership.');
for (const contract of ['width: min(760px, 54vw)', 'background: var(--surface-raised)', '@keyframes nf-reading-sheet-in']) {
  if (!readingCss.includes(contract)) throw new Error(`Reading side sheet missing ${contract}`);
}
for (const contract of ['.mobile-menu-button::before', 'mask-image:', 'repeat(5, minmax(0, 1fr))']) {
  if (!navigationCss.includes(contract)) throw new Error(`Mobile navigation missing ${contract}`);
}
if (startup.includes('window.fetch =')) throw new Error('Startup resilience must not patch fetch.');

for (const asset of ['./startup-resilience.js?v=__NEWSFLOW_VERSION__', './editorial-app.js?v=__NEWSFLOW_VERSION__', './reading-surface.js?v=__NEWSFLOW_VERSION__', './editorial-loader.js?v=__NEWSFLOW_VERSION__', './reader-navigation.css?v=__NEWSFLOW_VERSION__']) {
  if (!index.includes(asset)) throw new Error(`Index missing current Reader asset ${asset}`);
}
for (const editorAsset of ['./review-game.js', './editorial-office.js', './editorial-governance.js']) {
  if (index.includes(editorAsset)) throw new Error(`Reader must not eagerly load editor-only asset ${editorAsset}`);
  if (!loader.includes(editorAsset)) throw new Error(`Lazy editor loader missing ${editorAsset}`);
}
for (const retired of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json', 'ai_digest.json', 'editorial-mode.css']) {
  if (index.includes(retired) || sw.includes(retired) || build.includes(retired) || loader.includes(retired)) throw new Error(`Reader artifact exposes retired data/state: ${retired}`);
}
for (const contract of ["const ASSET_VERSION = '__NEWSFLOW_VERSION__'", 'newsflow-reader-v${ASSET_VERSION}', './data/source-registry.json', './data/governance-status.json', './feed.xml', './rss.xml', 'reader-navigation.css']) {
  if (!sw.includes(contract)) throw new Error(`Service worker missing ${contract}`);
}
for (const editorAsset of ["versioned('./review-game.js')", "versioned('./editorial-office.js')", "versioned('./editorial-governance.js')"]) {
  if (sw.includes(editorAsset)) throw new Error(`Reader app shell must not precache editor-only asset ${editorAsset}`);
}
for (const contract of ['generatePublicationPages', "resolve(dist, 'feed.xml')", "resolve(dist, 'rss.xml')", "resolve(dist, 'sitemap.xml')"]) {
  if (!build.includes(contract)) throw new Error(`Build missing static publication contract ${contract}`);
}
if (!pages.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")) throw new Error('Pages main deployment cancellation policy regressed.');

console.log('NewsFlow frontend architecture contract passed: issue-first Reader, side-sheet reading, explicit mobile tools, permission-routed editorial dashboard and explicit lifecycle boundaries.');