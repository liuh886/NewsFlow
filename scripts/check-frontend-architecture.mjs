import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const runtimeFiles = [
  'src/editorial-app.js',
  'src/polish.js',
  'src/edition-layer.js',
  'public/magazine-polish.js',
  'public/reading-surface.js',
  'public/editorial-office.js',
  'public/review-game.js',
  'public/editorial-governance.js',
  'public/account-integration.js',
  'public/startup-resilience.js'
];
for (const file of runtimeFiles) await access(resolve(root, file));
const sources = Object.fromEntries(await Promise.all(runtimeFiles.map(async (path) => [path, await read(path)])));
const [index, buildSource, serviceWorker, pagesWorkflow] = await Promise.all([
  read('index.html'),
  read('scripts/build.mjs'),
  read('public/sw.js'),
  read('.github/workflows/pages.yml')
]);

for (const [path, source] of Object.entries(sources)) {
  if (source.includes('MutationObserver')) throw new Error(`${path} must use explicit lifecycle events instead of MutationObserver.`);
}

const app = sources['src/editorial-app.js'];
for (const contract of [
  "new CustomEvent('newsflow:rendered')",
  "new CustomEvent('newsflow:open-editorial-office')",
  'AbortSignal.timeout(5000)',
  '按时间排序',
  "(validDate(b.published_at)?.getTime() || 0) - (validDate(a.published_at)?.getTime() || 0)"
]) {
  if (!app.includes(contract)) throw new Error(`reader app is missing architecture contract: ${contract}`);
}

const mode = sources['public/editorial-office.js'];
for (const contract of [
  "const MODE_STORAGE_KEY = 'newsflow_mode_v3'",
  "const INVITE_PARAM = 'editor-invite'",
  "from('newsflow_editorial_members')",
  "from('newsflow_editorial_invitations')",
  'createEditorInvite',
  'openGovernance',
  '编辑模式需要主编任命',
  "window.NewsFlowReviewGame?.openFormal?.()",
  "window.addEventListener('newsflow:rendered', mountModeTrigger)",
  "window.addEventListener('newsflow:switch-role'",
  'window.NewsFlowMode'
]) {
  if (!mode.includes(contract)) throw new Error(`editor mode controller missing contract: ${contract}`);
}
for (const retired of ['renderDesk', 'renderIssueDesk', 'officeTab', "id: 'accept'", 'AUTOMATED PRE-REVIEW', 'syncFormalEditorialState', 'FORMAL_STORAGE_KEY']) {
  if (mode.includes(retired)) throw new Error(`editor mode controller still owns retired authority/review UI: ${retired}`);
}

const game = sources['public/review-game.js'];
for (const contract of [
  'const openFormal = async',
  'const renderReview = () =>',
  'const renderDecisionBar = () =>',
  "from('newsflow_candidates')",
  "from('newsflow_editorial_reviews')",
  "state.editorialRole === 'editor_in_chief'",
  'opinionCounts',
  'window.NewsFlowReviewGame'
]) {
  if (!game.includes(contract)) throw new Error(`review game missing architecture contract: ${contract}`);
}
for (const retired of ['openGuest', 'GUEST_STORAGE_PREFIX', 'FORMAL_STORAGE_KEY', 'openSettlement', 'closeIssue', 'issueDraft', 'CLOSE ISSUE', 'saveProductData']) {
  if (game.includes(retired)) throw new Error(`review game still contains retired duplicate/private authority path: ${retired}`);
}

const governance = sources['public/editorial-governance.js'];
for (const contract of [
  "{ id: 'edition', label: '刊物判断'",
  "{ id: 'storyline', label: '长期议题'",
  "{ id: 'source', label: '信源'",
  "{ id: 'editorial', label: '编辑部'",
  "from('newsflow_governance_drafts')",
  "from('newsflow_editorial_members')",
  '发布到 GitHub',
  '主编当前判断',
  'window.NewsFlowGovernance'
]) {
  if (!governance.includes(contract)) throw new Error(`governance surface missing architecture contract: ${contract}`);
}

const edition = sources['src/edition-layer.js'];
for (const contract of [
  "window.addEventListener('newsflow:rendered', applyEditionLayer)",
  "new CustomEvent('newsflow:edition-rendered')",
  'AbortSignal.timeout(DATA_TIMEOUT_MS)',
  'cover_signal_id',
  '阅读封面文章',
  'Published with NewsFlow',
  "heading.textContent = '最新'",
  "firstEditorialAnchor.insertAdjacentHTML('beforebegin', renderCurrentIssue(edition, issue))",
  "issueNode.insertAdjacentHTML('afterend', renderPostIssueIntro(issue))",
  'renderChannelView',
  '#section/',
  "channelSort: 'newest'"
]) {
  if (!edition.includes(contract)) throw new Error(`edition layer missing contract: ${contract}`);
}
if (edition.includes('issue-signal-link ${isCover')) {
  throw new Error('Reader must not repeat the cover headline as a second oversized Issue row.');
}

const reading = sources['public/reading-surface.js'];
for (const contract of [
  "const ROOT_ID = 'newsflow-reading-surface-root'",
  '#read/',
  'renderReadingSurface',
  'decorateReadingLinks',
  "document.addEventListener('click'",
  "window.addEventListener('newsflow:rendered'",
  "window.addEventListener('newsflow:edition-rendered'",
  "event.stopPropagation()"
]) {
  if (!reading.includes(contract)) throw new Error(`reading surface missing architecture contract: ${contract}`);
}
if (reading.includes('stopImmediatePropagation') || reading.includes('window.fetch =')) {
  throw new Error('Reading Surface must not take global event or fetch ownership.');
}

for (const contract of [
  "window.addEventListener('newsflow:rendered', decorateMagazine)",
  "window.addEventListener('newsflow:edition-rendered', decorateMagazine)"
]) {
  if (!sources['public/magazine-polish.js'].includes(contract)) throw new Error(`magazine polish missing contract: ${contract}`);
}

const startup = sources['public/startup-resilience.js'];
if (startup.includes('window.fetch =') || startup.includes('nativeFetch')) throw new Error('startup bootstrap must never monkey-patch global fetch.');
for (const contract of [
  'STARTUP_WATCHDOG_MS = 8000',
  "serviceWorker.register('./sw.js', { updateViaCache: 'none' })",
  "window.addEventListener('newsflow:rendered'",
  "key.startsWith('newsflow-')"
]) {
  if (!startup.includes(contract)) throw new Error(`startup bootstrap missing contract: ${contract}`);
}

for (const contract of [
  'data-startup-shell="true"',
  './startup-resilience.js?v=2.8.0',
  './editorial-app.js?v=2.8.0',
  './reading-surface.js?v=2.8.0',
  './review-game.js?v=2.8.0',
  './editorial-governance.js?v=2.8.0',
  './editorial-office.js?v=2.8.0',
  '<script async src="https://liuh886.github.io/admin/shared/account-shell.js?v=2"></script>'
]) {
  if (!index.includes(contract)) throw new Error(`index startup shell missing contract: ${contract}`);
}

for (const retiredPath of ['./guest-editor.js', './editorial-delight.js', './editorial-preflight.js', './language-polish.js']) {
  if (index.includes(retiredPath) || serviceWorker.includes(retiredPath) || buildSource.includes(retiredPath)) {
    throw new Error(`retired runtime layer still referenced: ${retiredPath}`);
  }
}
for (const privateArtifact of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json']) {
  if (index.includes(privateArtifact) || serviceWorker.includes(privateArtifact) || buildSource.includes(privateArtifact)) {
    throw new Error(`Reader artifact exposes private editorial data: ${privateArtifact}`);
  }
}

for (const contract of [
  "const ASSET_VERSION = '2.8.0'",
  'editorial-governance-v2.8.0',
  'event.respondWith(networkFirst(event.request))',
  "versioned('./reading-surface.css')",
  "versioned('./reading-surface.js')",
  "versioned('./editorial-governance.css')",
  "versioned('./editorial-governance.js')",
  './data/source-registry.json',
  './data/governance-status.json'
]) {
  if (!serviceWorker.includes(contract)) throw new Error(`service worker release coherence missing: ${contract}`);
}
if (!pagesWorkflow.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")) {
  throw new Error('Pages may cancel superseded PR runs, but active main deployments must be preserved.');
}

console.log('NewsFlow frontend architecture contract passed: publication-only Reader, private candidate Review Game, chief governance surface and one Editor-in-Chief authority.');