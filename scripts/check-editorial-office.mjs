import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'public/editorial-office.js',
  'public/editorial-office.css',
  'public/editorial-game-loop.css',
  'public/editorial-preflight.js',
  'public/editorial-preflight.css',
  'public/data/pipeline-reviews.json',
  'scripts/aggregate-pipeline-reviews.mjs',
  'docs/editorial-office-design.md',
  'scripts/check-editorial-office.mjs'
];
for (const file of files) await access(resolve(root, file));

const [index, script, officeCss, gameCss, preflightScript, preflightCss, serviceWorker, packageSource, design, buildSource] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'public/editorial-office.js'), 'utf8'),
  readFile(resolve(root, 'public/editorial-office.css'), 'utf8'),
  readFile(resolve(root, 'public/editorial-game-loop.css'), 'utf8'),
  readFile(resolve(root, 'public/editorial-preflight.js'), 'utf8'),
  readFile(resolve(root, 'public/editorial-preflight.css'), 'utf8'),
  readFile(resolve(root, 'public/sw.js'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(resolve(root, 'docs/editorial-office-design.md'), 'utf8'),
  readFile(resolve(root, 'scripts/build.mjs'), 'utf8')
]);
const packageManifest = JSON.parse(packageSource);

for (const reference of [
  './editorial-office.css',
  './editorial-game-loop.css',
  './editorial-preflight.css',
  './editorial-office.js',
  './editorial-preflight.js',
  './data/pipeline-reviews.json'
]) {
  if (!index.includes(reference) && !serviceWorker.includes(reference)) {
    throw new Error(`NewsFlow shell is missing ${reference}`);
  }
  if (reference.startsWith('./data/') && !serviceWorker.includes(reference)) {
    throw new Error(`service worker is missing ${reference}`);
  }
  if (!reference.startsWith('./data/') && !index.includes(reference)) {
    throw new Error(`index.html is missing ${reference}`);
  }
}
if (index.indexOf('./editorial-game-loop.css') < index.indexOf('./editorial-office.css')) {
  throw new Error('editorial-game-loop.css must load after editorial-office.css');
}
if (index.indexOf('./editorial-preflight.css') < index.indexOf('./editorial-game-loop.css')) {
  throw new Error('editorial-preflight.css must load after the core editorial styles');
}
if (index.indexOf('./editorial-office.js') < index.indexOf('account-shell.js')) {
  throw new Error('editorial-office.js must load after the shared account shell');
}
if (index.indexOf('./editorial-preflight.js') < index.indexOf('./editorial-office.js')) {
  throw new Error('editorial-preflight.js must load after the formal editorial office');
}

for (const path of ['public/editorial-office.js', 'public/editorial-preflight.js', 'scripts/aggregate-pipeline-reviews.mjs']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${path} syntax check failed:\n${syntax.stderr}`);
}

for (const contract of [
  "const EDITORIAL_STORAGE_KEY = 'newsflow_editorial_game_v3'",
  'const ISSUE_CAPACITY = 5',
  "id: 'accept'",
  "id: 'minor_revision'",
  "id: 'major_revision'",
  "id: 'reject'",
  "fetch('./data/storylines.json'",
  "fetch('./data/review-candidates.json'",
  'const renderIssueDesk = () =>',
  'const publishIssue = () =>',
  'const undoDecision = () =>',
  'const renderReaderReceipt = () =>',
  "schema_version: '3.0'",
  "document.addEventListener('click', handleReviewCapture, true)",
  "new MutationObserver(decorateApp).observe(appRoot, { childList: true })",
  'window.HaoAccount.saveProductData'
]) {
  if (!script.includes(contract)) throw new Error(`editorial office is missing contract: ${contract}`);
}
for (const forbidden of [
  "id: 'cover_story'",
  'PIPELINE_REVIEW_STORAGE',
  "data-tab=\"pipeline\"",
  'pipeline-export',
  'editorial_override'
]) {
  if (script.includes(forbidden)) throw new Error(`editorial office contains a duplicate or retired review path: ${forbidden}`);
}
if (script.includes('subtree: true')) throw new Error('editorial office must not observe the full application subtree');

for (const contract of [
  "const DATA_PATH = './data/pipeline-reviews.json'",
  'AUTOMATED PRE-REVIEW',
  '需要主编判断',
  '不构成编辑决定',
  "observe(root, { childList: true })"
]) {
  if (!preflightScript.includes(contract)) throw new Error(`editorial preflight is missing contract: ${contract}`);
}
if (preflightScript.includes('localStorage.setItem') || preflightScript.includes('data-editorial-action')) {
  throw new Error('pipeline preflight must remain read-only and may not create a second decision state');
}
if (preflightScript.includes('subtree: true')) throw new Error('pipeline preflight must not observe the full subtree');

for (const selector of [
  '.nf-role-trigger',
  '.nf-role-dialog',
  '.nf-office-shell',
  '.nf-decision-grid',
  '.nf-special-issue-banner',
  '.nf-archive-table',
  '@media (max-width: 720px)',
  '@media (prefers-reduced-motion: reduce)',
  '@media print'
]) {
  if (!officeCss.includes(selector)) throw new Error(`editorial office CSS is missing ${selector}`);
}

for (const selector of [
  '.nf-reader-receipt',
  '.nf-editorial-toast',
  '.nf-issue-status',
  '.nf-issue-slots',
  '.nf-issue-candidate',
  '.nf-close-issue',
  '.nf-published-issues',
  '@media (max-width: 720px)'
]) {
  if (!gameCss.includes(selector)) throw new Error(`editorial game CSS is missing ${selector}`);
}
for (const selector of [
  '.nf-manuscript-preflight',
  '.nf-preflight-reasons',
  '.nf-preflight-evidence',
  'border-top: 4px double',
  '@media (max-width: 720px)',
  '@media print'
]) {
  if (!preflightCss.includes(selector)) throw new Error(`editorial preflight CSS is missing ${selector}`);
}
for (const forbidden of ['border-radius: 999px', '.nf-pipeline-card', '.nf-pipeline-badge', '.nf-score-track']) {
  if (preflightCss.includes(forbidden)) throw new Error(`editorial preflight restored generic dashboard styling: ${forbidden}`);
}

for (const phrase of [
  'Institutional Editorial Roleplay',
  'Reader',
  'Editor-in-Chief',
  'Special Issue 01: CCUS',
  'Accept / Minor Revision / Major Revision / Reject',
  'Issue Desk',
  'Close Issue',
  'Editorial Record'
]) {
  if (!design.includes(phrase)) throw new Error(`editorial office design contract is missing ${phrase}`);
}

if (!packageManifest.scripts?.check?.includes('aggregate-pipeline-reviews.mjs --check')) {
  throw new Error('npm check must reject a stale pipeline preflight snapshot');
}
if (!packageManifest.scripts?.['content:status']?.includes('aggregate-pipeline-reviews.mjs')) {
  throw new Error('content:status must refresh pipeline preflight data');
}
if (buildSource.includes('aggregate-pipeline-reviews.mjs') || buildSource.includes('spawnSync')) {
  throw new Error('static builds must not mutate content snapshots or start aggregation subprocesses');
}
if (!serviceWorker.includes('newsflow-editorial-v2.3.1-magazine-v2.4.1-serious-play-v2.5.1')) {
  throw new Error('service worker cache must advance for the unified preflight release');
}

console.log('NewsFlow editorial contract passed: one four-state decision path, read-only machine preflight, finite Issue Desk and serious-play feedback.');
