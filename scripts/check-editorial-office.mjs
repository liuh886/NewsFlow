import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'public/editorial-office.js',
  'public/editorial-office.css',
  'public/editorial-game-loop.css',
  'docs/editorial-office-design.md',
  'scripts/check-editorial-office.mjs'
];
for (const file of files) await access(resolve(root, file));

const [index, script, officeCss, gameCss, serviceWorker, packageSource, design] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'public/editorial-office.js'), 'utf8'),
  readFile(resolve(root, 'public/editorial-office.css'), 'utf8'),
  readFile(resolve(root, 'public/editorial-game-loop.css'), 'utf8'),
  readFile(resolve(root, 'public/sw.js'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(resolve(root, 'docs/editorial-office-design.md'), 'utf8')
]);
const packageManifest = JSON.parse(packageSource);

for (const reference of ['./editorial-office.css', './editorial-game-loop.css', './editorial-office.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
  if (!serviceWorker.includes(reference)) throw new Error(`service worker is missing ${reference}`);
}
if (index.indexOf('./editorial-game-loop.css') < index.indexOf('./editorial-office.css')) {
  throw new Error('editorial-game-loop.css must load after editorial-office.css');
}
if (index.indexOf('./editorial-office.js') < index.indexOf('account-shell.js')) {
  throw new Error('editorial-office.js must load after the shared account shell');
}

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'public/editorial-office.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`editorial-office.js syntax check failed:\n${syntax.stderr}`);

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
if (script.includes("id: 'cover_story'")) {
  throw new Error('cover story must be an Issue Desk designation, not an editorial decision');
}
if (script.includes('subtree: true')) throw new Error('editorial office must not observe the full application subtree');

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

if (!packageManifest.scripts?.check?.includes('check-editorial-office.mjs')) {
  throw new Error('npm check must include the editorial office contract');
}
if (!serviceWorker.includes('newsflow-editorial-v2.5-serious-play-v1')) {
  throw new Error('service worker cache must advance for the serious-play editorial release');
}

console.log('NewsFlow editorial game contract passed: roles, four-state review, finite Issue Desk, cover designation, close-issue record and mobile feedback.');
