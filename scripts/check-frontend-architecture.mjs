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
  'public/editorial-delight.js',
  'public/account-integration.js',
  'public/startup-resilience.js'
];

const sources = Object.fromEntries(await Promise.all(runtimeFiles.map(async (path) => [path, await read(path)])));
const [index, buildSource, serviceWorker, pagesWorkflow] = await Promise.all([
  read('index.html'),
  read('scripts/build.mjs'),
  read('public/sw.js'),
  read('.github/workflows/pages.yml')
]);

for (const [path, source] of Object.entries(sources)) {
  if (source.includes('MutationObserver')) {
    throw new Error(`${path} must use explicit NewsFlow lifecycle events instead of MutationObserver.`);
  }
}

const app = sources['src/editorial-app.js'];
for (const contract of [
  "new CustomEvent('newsflow:rendered')",
  "new CustomEvent('newsflow:open-editorial-office')",
  "data-action=\"open-editorial-office\"",
  'AbortSignal.timeout(5000)'
]) {
  if (!app.includes(contract)) throw new Error(`reader app is missing architecture contract: ${contract}`);
}
for (const retired of [
  'newsflow_review_v1',
  'reviewActive',
  'reviewQueue',
  'reviewVerdicts',
  'renderReviewCard',
  'recordVerdict',
  'open-review'
]) {
  if (app.includes(retired)) throw new Error(`reader app still contains retired review architecture: ${retired}`);
}

const office = sources['public/editorial-office.js'];
for (const contract of [
  "window.addEventListener('newsflow:open-editorial-office'",
  "window.addEventListener('newsflow:rendered', mountRoleTrigger)",
  "new CustomEvent('newsflow:editorial-rendered')",
  "fetchJson('./data/pipeline-reviews.json')",
  'AUTOMATED PRE-REVIEW',
  'AbortSignal.timeout(DATA_TIMEOUT_MS)'
]) {
  if (!office.includes(contract)) throw new Error(`editorial office is missing architecture contract: ${contract}`);
}
for (const retired of ['handleReviewCapture', 'decorateReviewEntrances', "addEventListener('click', handleReviewCapture, true)"]) {
  if (office.includes(retired)) throw new Error(`editorial office still intercepts the retired review path: ${retired}`);
}

for (const contract of [
  "window.addEventListener('newsflow:rendered', applyEditionLayer)",
  "new CustomEvent('newsflow:edition-rendered')",
  'AbortSignal.timeout(DATA_TIMEOUT_MS)'
]) {
  if (!sources['src/edition-layer.js'].includes(contract)) throw new Error(`edition layer is missing lifecycle contract: ${contract}`);
}
for (const contract of [
  "window.addEventListener('newsflow:rendered', decorateMagazine)",
  "window.addEventListener('newsflow:edition-rendered', decorateMagazine)"
]) {
  if (!sources['public/magazine-polish.js'].includes(contract)) throw new Error(`magazine polish is missing lifecycle contract: ${contract}`);
}

const startup = sources['public/startup-resilience.js'];
if (startup.includes('window.fetch =') || startup.includes('nativeFetch')) {
  throw new Error('startup bootstrap must never monkey-patch global fetch.');
}
for (const contract of [
  'STARTUP_WATCHDOG_MS = 8000',
  'const watchdogTimer = window.setTimeout(showRecovery, STARTUP_WATCHDOG_MS)',
  "serviceWorker.register('./sw.js', { updateViaCache: 'none' })",
  "window.addEventListener('newsflow:rendered'",
  "key.startsWith('newsflow-')"
]) {
  if (!startup.includes(contract)) throw new Error(`startup bootstrap is missing contract: ${contract}`);
}
if (startup.includes("window.addEventListener('DOMContentLoaded'")) {
  throw new Error('startup watchdog must begin immediately and may not wait for DOMContentLoaded.');
}

for (const contract of [
  'data-startup-shell="true"',
  './startup-resilience.js?v=2.6.1',
  './editorial-app.js?v=2.6.1',
  '<script async src="https://liuh886.github.io/admin/shared/account-shell.js?v=2"></script>'
]) {
  if (!index.includes(contract)) throw new Error(`index startup shell is missing contract: ${contract}`);
}

for (const retiredPath of ['./language-polish.js', './editorial-preflight.js']) {
  if (index.includes(retiredPath) || serviceWorker.includes(retiredPath) || buildSource.includes(retiredPath)) {
    throw new Error(`retired runtime layer is still referenced: ${retiredPath}`);
  }
}
for (const path of ['src/language-polish.js', 'public/editorial-preflight.js']) {
  try {
    await access(resolve(root, path));
    throw new Error(`retired runtime file still exists: ${path}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

for (const contract of [
  "const ASSET_VERSION = '2.6.1'",
  'startup-v2.6.1',
  'const isRuntimeAsset = /\\.(?:js|css)$/i.test(url.pathname)',
  'event.respondWith(networkFirst(event.request))'
]) {
  if (!serviceWorker.includes(contract)) throw new Error(`service worker release coherence is missing: ${contract}`);
}
if (!pagesWorkflow.includes('cancel-in-progress: true')) {
  throw new Error('Pages must cancel obsolete queued deployments and publish only the latest ref state.');
}
if (pagesWorkflow.includes("- 'content/**'")) {
  throw new Error('Pages must not redeploy for unrelated content history changes.');
}

console.log('NewsFlow frontend architecture contract passed: explicit lifecycle, coherent runtime release, immediate watchdog and latest-only Pages deployment.');
