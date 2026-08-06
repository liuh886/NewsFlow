import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'public/magazine-polish.js',
  'public/magazine-polish.css',
  'scripts/check-magazine-polish.mjs'
];
for (const file of files) await access(resolve(root, file));

const [index, script, css, serviceWorker, packageSource] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'public/magazine-polish.js'), 'utf8'),
  readFile(resolve(root, 'public/magazine-polish.css'), 'utf8'),
  readFile(resolve(root, 'public/sw.js'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8')
]);
const packageManifest = JSON.parse(packageSource);

for (const reference of ['./magazine-polish.css', './magazine-polish.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
  if (!serviceWorker.includes(reference)) throw new Error(`service worker is missing ${reference}`);
}
if (index.indexOf('./magazine-polish.css') < index.indexOf('./edition-layer.css')) {
  throw new Error('magazine-polish.css must load after edition-layer.css');
}
if (index.indexOf('./magazine-polish.js') < index.indexOf('./edition-layer.js')) {
  throw new Error('magazine-polish.js must load after edition-layer.js');
}

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'public/magazine-polish.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`magazine-polish.js syntax check failed:\n${syntax.stderr}`);

for (const contract of [
  'storyline-index-panel',
  'trapMagazinePanelFocus',
  'setMagazineBackgroundInert',
  'restoreMagazineTrigger',
  "intro.dataset.empty = 'true'",
  "shellObserver.observe(shell, { childList: true })"
]) {
  if (!script.includes(contract)) throw new Error(`magazine interaction layer is missing ${contract}`);
}
if (script.includes('subtree: true')) throw new Error('magazine polish must not add a full-subtree observer');

for (const selector of [
  '.storyline-index-panel',
  '.storyline-index-item',
  "[data-empty='true']",
  '@media (max-width: 720px)',
  '@media print',
  '@media (prefers-reduced-motion: reduce)',
  'overflow-x: clip',
  'grid-template-columns: 28px minmax(0, 1fr)',
  '.article-body',
  '.article-meta',
  'grid-column: 2'
]) {
  if (!css.includes(selector)) throw new Error(`magazine polish CSS is missing ${selector}`);
}

if (packageManifest.version !== '2.4.1') throw new Error('magazine polish release must be version 2.4.1');
if (!packageManifest.scripts?.check?.includes('check-magazine-polish.mjs')) {
  throw new Error('npm check must include the magazine polish contract');
}
if (!serviceWorker.includes('newsflow-editorial-v2.5-serious-play-v1')) {
  throw new Error('service worker cache must include the serious-play editorial release');
}

console.log('NewsFlow magazine polish contract passed: storyline panels, focus loop, stable mobile editorial rows and serious-play cache.');
