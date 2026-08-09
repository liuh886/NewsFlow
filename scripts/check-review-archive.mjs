import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const required = [
  'public/review-archive.css',
  'public/review-archive.js',
  'public/editorial-loader.js',
  'public/sw.js',
  'package.json'
];
for (const file of required) await access(resolve(root, file));

const [index, loader, archiveCss, archiveJs, sw, packageManifest] = await Promise.all([
  read('index.html'),
  read('public/editorial-loader.js'),
  read('public/review-archive.css'),
  read('public/review-archive.js'),
  read('public/sw.js'),
  read('package.json').then(JSON.parse)
]);

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'public/review-archive.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`review-archive.js syntax failed:\n${syntax.stderr}`);

for (const asset of ['./review-archive.css', './review-archive.js']) {
  if (!loader.includes(asset)) throw new Error(`editorial-loader is missing ${asset}`);
  if (index.includes(asset)) throw new Error(`Reader must not eagerly load editor-only archive asset ${asset}`);
}
for (const asset of ["versioned('./review-archive.css')", "versioned('./review-archive.js')"]) {
  if (sw.includes(asset)) throw new Error(`Reader app shell must not precache editor-only archive asset ${asset}`);
}

for (const contract of [
  '.nf-review-shell.is-archive .nf-review-stage',
  'place-items: stretch',
  '.nf-review-shell.is-archive .nf-review-stack',
  'display: none',
  '.nf-review-shell.is-archive .nf-review-card',
  'zoom: 1',
  '.nf-review-shell.is-archive .nf-review-archive-card',
  'width: 100%',
  'border: 0',
  'box-shadow: none',
  '.nf-review-shell.is-archive .nf-review-archive-detail h2',
  'font-size: clamp(36px, 3.35vw, 52px)'
]) if (!archiveCss.includes(contract)) throw new Error(`decision archive layout missing contract: ${contract}`);

for (const contract of [
  "['ArrowUp', 'ArrowDown']",
  '[data-review-action="select-archive"]',
  "row.classList.contains('is-selected')",
  "event.key === 'ArrowUp' ? -1 : 1",
  'rows[nextIndex].click()',
  "scrollIntoView({ block: 'nearest' })",
  "focus({ preventScroll: true })"
]) if (!archiveJs.includes(contract)) throw new Error(`decision archive keyboard navigation missing contract: ${contract}`);

if (archiveJs.includes('MutationObserver') || archiveJs.includes('localStorage')) {
  throw new Error('Decision archive polish must remain DOM-scoped and stateless.');
}
if (!packageManifest.scripts?.check?.includes('check-review-archive.mjs')) {
  throw new Error('npm check must include the decision archive contract.');
}

console.log('NewsFlow decision archive contract passed: full-scale desk layout, reduced framing and ArrowUp/ArrowDown record navigation.');
