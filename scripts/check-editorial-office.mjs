import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'public/editorial-office.js',
  'public/editorial-office.css',
  'public/editorial-game-loop.css',
  'public/editorial-preflight.css',
  'public/data/pipeline-reviews.json',
  'content/state/pipeline-review-queue.json',
  'scripts/apply-content.mjs',
  'scripts/aggregate-pipeline-reviews.mjs',
  'docs/editorial-office-design.md',
  'scripts/check-editorial-office.mjs'
];
for (const file of files) await access(resolve(root, file));

const [index, script, officeCss, gameCss, preflightCss, serviceWorker, packageSource, design, buildSource, applySource, queueText] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'public/editorial-office.js'), 'utf8'),
  readFile(resolve(root, 'public/editorial-office.css'), 'utf8'),
  readFile(resolve(root, 'public/editorial-game-loop.css'), 'utf8'),
  readFile(resolve(root, 'public/editorial-preflight.css'), 'utf8'),
  readFile(resolve(root, 'public/sw.js'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(resolve(root, 'docs/editorial-office-design.md'), 'utf8'),
  readFile(resolve(root, 'scripts/build.mjs'), 'utf8'),
  readFile(resolve(root, 'scripts/apply-content.mjs'), 'utf8'),
  readFile(resolve(root, 'content/state/pipeline-review-queue.json'), 'utf8')
]);
const packageManifest = JSON.parse(packageSource);
const queue = JSON.parse(queueText);

for (const reference of [
  './editorial-office.css',
  './editorial-game-loop.css',
  './editorial-preflight.css',
  './editorial-office.js'
]) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
for (const reference of ['./data/pipeline-reviews.json', './editorial-office.js']) {
  if (!serviceWorker.includes(reference)) throw new Error(`service worker is missing ${reference}`);
}
if (index.includes('./editorial-preflight.js') || serviceWorker.includes('./editorial-preflight.js')) {
  throw new Error('editorial preflight must be rendered inside editorial-office.js, not as a DOM decorator.');
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

for (const path of ['public/editorial-office.js', 'scripts/apply-content.mjs', 'scripts/aggregate-pipeline-reviews.mjs']) {
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
  "fetchJson('./data/storylines.json')",
  "fetchJson('./data/review-candidates.json')",
  "fetchJson('./data/pipeline-reviews.json')",
  'const renderIssueDesk = () =>',
  'const publishIssue = () =>',
  'const undoDecision = () =>',
  'const renderReaderReceipt = () =>',
  "schema_version: '3.0'",
  "window.addEventListener('newsflow:open-editorial-office'",
  "window.addEventListener('newsflow:rendered', mountRoleTrigger)",
  'window.HaoAccount.saveProductData',
  'AUTOMATED PRE-REVIEW',
  '需要主编判断',
  '不构成编辑决定'
]) {
  if (!script.includes(contract)) throw new Error(`editorial office is missing contract: ${contract}`);
}
for (const forbidden of [
  "id: 'cover_story'",
  'PIPELINE_REVIEW_STORAGE',
  "data-tab=\"pipeline\"",
  'pipeline-export',
  'editorial_override',
  'handleReviewCapture',
  'decorateReviewEntrances',
  'MutationObserver'
]) {
  if (script.includes(forbidden)) throw new Error(`editorial office contains duplicate or retired architecture: ${forbidden}`);
}

for (const contract of [
  "const evaluatorPath = resolve(root, 'scripts/update-content.mjs')",
  "const queuePath = resolve(root, 'content/state/pipeline-review-queue.json')",
  "decision.status !== 'needs_review'",
  'byId.delete(id)',
  'aggregate-pipeline-reviews.mjs'
]) {
  if (!applySource.includes(contract)) throw new Error(`content apply orchestration is missing ${contract}`);
}
if (queue.schema_version !== '1.0' || !Array.isArray(queue.items)) {
  throw new Error('durable pipeline review queue has an invalid contract');
}

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
if (!packageManifest.scripts?.['content:update']?.includes('apply-content.mjs')) {
  throw new Error('content:update must persist the human preflight queue');
}
if (!packageManifest.scripts?.['content:status']?.includes('aggregate-pipeline-reviews.mjs')) {
  throw new Error('content:status must refresh pipeline preflight data');
}
if (buildSource.includes('aggregate-pipeline-reviews.mjs') || buildSource.includes('spawnSync')) {
  throw new Error('static builds must not mutate content snapshots or start aggregation subprocesses');
}
for (const contract of ['pipeline-review-queue.json', 'reviewCandidatesById', 'addReviewCandidate']) {
  if (!buildSource.includes(contract)) throw new Error(`build must include durable review candidates: ${contract}`);
}
if (!serviceWorker.includes('serious-play-v2.6.0')) {
  throw new Error('service worker cache must advance for the frontend architecture reset release');
}

console.log('NewsFlow editorial contract passed: one four-state decision path, inline machine preflight and finite Issue Desk.');
