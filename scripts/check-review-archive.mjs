import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const required = [
  'public/review-archive.css',
  'public/editorial-desk.js',
  'public/editorial-loader.js',
  'public/sw.js',
  'package.json'
];
for (const file of required) await access(resolve(root, file));

const [index, loader, archiveCss, deskJs, sw, packageManifest] = await Promise.all([
  read('index.html'),
  read('public/editorial-loader.js'),
  read('public/review-archive.css'),
  read('public/editorial-desk.js'),
  read('public/sw.js'),
  read('package.json').then(JSON.parse)
]);

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'public/editorial-desk.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`editorial-desk.js syntax failed:\n${syntax.stderr}`);

for (const asset of ['./review-archive.css', './editorial-desk.js']) {
  if (!loader.includes(asset)) throw new Error(`editorial-loader is missing ${asset}`);
  if (index.includes(asset)) throw new Error(`Reader must not eagerly load editor-only desk asset ${asset}`);
}
for (const asset of ["versioned('./review-archive.css')", "versioned('./editorial-desk.js')"]) {
  if (sw.includes(asset)) throw new Error(`Reader app shell must not precache editor-only desk asset ${asset}`);
}
if (loader.includes('./review-archive.js')) throw new Error('Obsolete archive-only controller must stay deleted.');

for (const contract of [
  '.nf-review-shell.is-archive',
  'grid-template-rows: auto auto minmax(0, 1fr)',
  '.nf-review-shell.is-archive > .nf-review-decision-bar',
  '.nf-review-shell.is-archive .nf-review-stack',
  'display: none',
  '.nf-review-shell.is-archive .nf-review-stage',
  'padding: 0',
  '.nf-review-shell.is-archive .nf-review-card',
  'max-width: none',
  'border: 0',
  'background: transparent',
  'box-shadow: none',
  '.nf-review-shell.is-archive .nf-review-archive-card::before',
  '.nf-review-shell.is-archive .nf-review-archive-workspace',
  'gap: 0',
  '.nf-review-shell.is-archive .nf-review-archive-list',
  'border: 0',
  '.nf-review-shell.is-archive .nf-review-archive-detail',
  'border-left: 1px solid',
  '.nf-review-shell.is-archive .nf-review-archive-detail aside',
  'border-left: 0',
  '.nf-review-shell.is-archive .nf-review-archive-actions .nf-review-retract-decision',
  '@media (max-width: 760px)',
  'max-height: 34dvh',
  'position: fixed',
  'bottom: calc(8px + env(safe-area-inset-bottom))',
  'padding: 18px 16px calc(104px + env(safe-area-inset-bottom))'
]) if (!archiveCss.includes(contract)) throw new Error(`flat/mobile decision archive layout missing contract: ${contract}`);

for (const contract of [
  "['ArrowUp', 'ArrowDown']",
  '[data-review-action="select-archive"]',
  "row.classList.contains('is-selected')",
  "event.key === 'ArrowUp' ? -1 : 1",
  'rows[nextIndex].click()',
  "scrollIntoView({ block: 'nearest' })",
  "focus({ preventScroll: true })",
  '[data-review-action="open-pending"]',
  "pendingCount(pendingButton) !== 0",
  '[data-review-action="open-overview"]',
  'event.stopPropagation()',
  'overviewButton.click()',
  '待审稿件已清空，仍停留在编辑部总览。',
  'revealArchiveDetailOnMobile',
  "scrollIntoView({ block: 'start', behavior: 'smooth' })",
  'syncRetractionAction',
  "from('newsflow_editorial_reviews')",
  "data-newsflow-desk-action=\"retract-decision\"",
  'openRetractionDialog',
  'retractDecision',
  '.delete()',
  ".eq('reviewer_user_id', userId)",
  'RETRACT DECISION',
  '撤回决定？',
  'window.NewsFlowReviewGame?.openOverview?.()',
  '决定已撤回，稿件已重新进入待审。'
]) if (!deskJs.includes(contract)) throw new Error(`editorial desk interaction missing contract: ${contract}`);

if (deskJs.includes('MutationObserver') || deskJs.includes('localStorage')) {
  throw new Error('Editorial desk interactions must remain DOM-scoped and avoid persistent UI state.');
}
if (!packageManifest.scripts?.check?.includes('check-review-archive.mjs')) {
  throw new Error('npm check must include the editorial desk contract.');
}

console.log('NewsFlow editorial desk contract passed: flat archive/reject workspace, mobile fixed action rail, explicit decision retraction, ArrowUp/ArrowDown navigation and empty-pending return to overview.');
