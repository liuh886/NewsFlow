import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [index, loader, app, polish, edition, reading, mode, game, governance, startup, sw, build, pages] = await Promise.all([
  read('index.html'), read('public/editorial-loader.js'), read('src/editorial-app.js'), read('src/polish.js'), read('src/edition-layer.js'), read('public/reading-surface.js'),
  read('public/editorial-office.js'), read('public/review-game.js'), read('public/editorial-governance.js'),
  read('public/startup-resilience.js'), read('public/sw.js'), read('scripts/build.mjs'), read('.github/workflows/pages.yml')
]);

for (const [name, source] of Object.entries({ app, polish, edition, reading, mode, game, governance, startup })) {
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

for (const contract of ["from('newsflow_editorial_members')", 'window.NewsFlowReviewGame?.isOpen?.()', 'window.NewsFlowReviewGame?.openFormal?.()', 'window.NewsFlowMode']) {
  if (!mode.includes(contract)) throw new Error(`Mode controller missing ${contract}`);
}
if (mode.includes('window.setTimeout(openEditorGame')) throw new Error('Account hydration must not reopen the Review Game.');

for (const contract of ["from('newsflow_candidates')", "from('newsflow_editorial_reviews')", "state.editorialRole === 'editor_in_chief'", 'window.NewsFlowReviewGame']) {
  if (!game.includes(contract)) throw new Error(`Review Game missing ${contract}`);
}
for (const retired of ['openGuest', 'openSettlement', 'CLOSE ISSUE', 'saveProductData']) {
  if (game.includes(retired)) throw new Error(`Review Game contains retired path: ${retired}`);
}

for (const contract of ["from('newsflow_governance_drafts')", '刊物判断', '长期议题', '信源', '编辑部', '发布到 GitHub']) {
  if (!governance.includes(contract)) throw new Error(`Governance surface missing ${contract}`);
}
for (const contract of ['cover_signal_id', 'Published with NewsFlow', "new CustomEvent('newsflow:edition-rendered')", '#section/', "issue?.lifecycle === 'live'", 'archivedIssues']) {
  if (!edition.includes(contract)) throw new Error(`Edition layer missing ${contract}`);
}
for (const contract of ["const ROOT_ID = 'newsflow-reading-surface-root'", '#read/', 'canonicalArticleUrl', "window.addEventListener('newsflow:rendered'"]) {
  if (!reading.includes(contract)) throw new Error(`Reading Surface missing ${contract}`);
}
if (reading.includes('stopImmediatePropagation') || reading.includes('window.fetch =')) throw new Error('Reading Surface must not take global ownership.');
if (startup.includes('window.fetch =')) throw new Error('Startup resilience must not patch fetch.');

for (const asset of ['./startup-resilience.js?v=__NEWSFLOW_VERSION__', './editorial-app.js?v=__NEWSFLOW_VERSION__', './reading-surface.js?v=__NEWSFLOW_VERSION__', './editorial-loader.js?v=__NEWSFLOW_VERSION__']) {
  if (!index.includes(asset)) throw new Error(`Index missing current Reader asset ${asset}`);
}
for (const editorAsset of ['./review-game.js', './editorial-office.js', './editorial-governance.js']) {
  if (index.includes(editorAsset)) throw new Error(`Reader must not eagerly load editor-only asset ${editorAsset}`);
  if (!loader.includes(editorAsset)) throw new Error(`Lazy editor loader missing ${editorAsset}`);
}
for (const retired of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json', 'ai_digest.json']) {
  if (index.includes(retired) || sw.includes(retired) || build.includes(retired)) throw new Error(`Reader artifact exposes retired data: ${retired}`);
}
for (const contract of ["const ASSET_VERSION = '__NEWSFLOW_VERSION__'", 'newsflow-reader-v${ASSET_VERSION}', './data/source-registry.json', './data/governance-status.json', './feed.xml']) {
  if (!sw.includes(contract)) throw new Error(`Service worker missing ${contract}`);
}
for (const editorAsset of ["versioned('./review-game.js')", "versioned('./editorial-office.js')", "versioned('./editorial-governance.js')"]) {
  if (sw.includes(editorAsset)) throw new Error(`Reader app shell must not precache editor-only asset ${editorAsset}`);
}
for (const contract of ['generatePublicationPages', "resolve(dist, 'feed.xml')", "resolve(dist, 'sitemap.xml')"]) {
  if (!build.includes(contract)) throw new Error(`Build missing static publication contract ${contract}`);
}
if (!pages.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")) throw new Error('Pages main deployment cancellation policy regressed.');

console.log('NewsFlow frontend architecture contract passed: lean Reader, lazy editorial runtime, static publication routes and explicit lifecycle boundaries.');
