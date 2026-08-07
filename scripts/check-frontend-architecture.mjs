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
  'public/editorial-office.js',
  'public/review-game.js',
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
  'AbortSignal.timeout(5000)'
]) {
  if (!app.includes(contract)) throw new Error(`reader app is missing architecture contract: ${contract}`);
}

const mode = sources['public/editorial-office.js'];
for (const contract of [
  "const ROLE_STORAGE_KEY = 'newsflow_role_v2'",
  "window.NewsFlowReviewGame?.openFormal?.()",
  "window.addEventListener('newsflow:rendered', mountModeTrigger)",
  "window.addEventListener('newsflow:switch-role'"
]) {
  if (!mode.includes(contract)) throw new Error(`editor mode controller missing contract: ${contract}`);
}
for (const retired of ['renderDesk', 'renderIssueDesk', 'officeTab', "id: 'accept'", 'AUTOMATED PRE-REVIEW']) {
  if (mode.includes(retired)) throw new Error(`editor mode controller still owns retired review UI: ${retired}`);
}

const game = sources['public/review-game.js'];
for (const contract of [
  'const openFormal = async () =>',
  'const openGuest = async',
  'const renderReview = () =>',
  'const renderDecisionBar = () =>',
  'const openSettlement = () =>',
  'window.NewsFlowReviewGame'
]) {
  if (!game.includes(contract)) throw new Error(`review game missing architecture contract: ${contract}`);
}

for (const contract of [
  "window.addEventListener('newsflow:rendered', applyEditionLayer)",
  "new CustomEvent('newsflow:edition-rendered')",
  'AbortSignal.timeout(DATA_TIMEOUT_MS)'
]) {
  if (!sources['src/edition-layer.js'].includes(contract)) throw new Error(`edition layer missing contract: ${contract}`);
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
  './startup-resilience.js?v=2.7.0',
  './editorial-app.js?v=2.7.0',
  './review-game.js?v=2.7.0',
  './editorial-office.js?v=2.7.0',
  '<script async src="https://liuh886.github.io/admin/shared/account-shell.js?v=2"></script>'
]) {
  if (!index.includes(contract)) throw new Error(`index startup shell missing contract: ${contract}`);
}

for (const retiredPath of ['./guest-editor.js', './editorial-delight.js', './editorial-preflight.js', './language-polish.js']) {
  if (index.includes(retiredPath) || serviceWorker.includes(retiredPath) || buildSource.includes(retiredPath)) {
    throw new Error(`retired runtime layer still referenced: ${retiredPath}`);
  }
}

for (const contract of [
  "const ASSET_VERSION = '2.7.0'",
  'reader-editor-modes',
  'event.respondWith(networkFirst(event.request))'
]) {
  if (!serviceWorker.includes(contract)) throw new Error(`service worker release coherence missing: ${contract}`);
}
if (!pagesWorkflow.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")) {
  throw new Error('Pages may cancel superseded PR runs, but active main deployments must be preserved.');
}

console.log('NewsFlow frontend architecture contract passed: reader owns publication, one review game owns editor interaction, mode controller owns identity only.');
