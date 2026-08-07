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

const [index, script, css, readingCss, serviceWorker, packageSource] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'public/magazine-polish.js'), 'utf8'),
  readFile(resolve(root, 'public/magazine-polish.css'), 'utf8'),
  readFile(resolve(root, 'public/reading-surface.css'), 'utf8'),
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
  'setMagazineBackgroundInert',
  'restoreMagazineTrigger',
  "intro.dataset.empty = 'true'",
  "const STATUS_PATH = './data/data-status.json'",
  'AbortSignal.timeout(5000)',
  'decorateDataFreshness',
  "brandName?.closest('.brand-copy')",
  "brandCopy.querySelectorAll('.nf-brand-row')",
  "brandCopy.querySelectorAll('.nf-data-date')",
  'candidate !== badge',
  'nf-data-date',
  "window.addEventListener('newsflow:rendered', decorateMagazine)",
  "window.addEventListener('newsflow:edition-rendered', decorateMagazine)"
]) {
  if (!script.includes(contract)) throw new Error(`magazine interaction layer is missing ${contract}`);
}
if (script.includes('MutationObserver') || script.includes('stopImmediatePropagation')) {
  throw new Error('magazine polish must not observe or intercept the Edition rendering lifecycle.');
}

for (const selector of [
  "[data-empty='true']",
  "[data-action='feedback-center']",
  "[data-action='open-editorial-office']",
  '.nf-mode-trigger',
  "[data-edition-layer='section-view'] .issue-hero-copy > h2",
  ".issue-section-heading .masthead-sections button[aria-pressed='true']",
  "[data-action='feedback-hide']",
  '@media (max-width: 920px)',
  '@media (max-width: 720px)',
  '@media (max-width: 430px)',
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

for (const selector of [
  'width: min(740px, 100%)',
  '@media (max-width: 720px)',
  '.nf-reading-article h1',
  '.nf-reading-section > p'
]) {
  if (!readingCss.includes(selector)) throw new Error(`reading typography/responsive contract is missing ${selector}`);
}

for (const identity of [
  'Frontier Systems Review — AI 基建、CCUS 与能源转型',
  'Frontier Systems Review：聚焦 AI 基建、CCUS 与能源转型的专业半月刊'
]) {
  if (!index.includes(identity)) throw new Error(`Edition-first browser identity is missing: ${identity}`);
}

if (packageManifest.version !== '2.4.1') throw new Error('package release contract must remain pinned until a package release is intentionally cut');
if (!packageManifest.scripts?.check?.includes('check-magazine-polish.mjs')) {
  throw new Error('npm check must include the magazine polish contract');
}
for (const releaseContract of ["const ASSET_VERSION = '2.7.0'", 'reader-editor-modes', 'reader-v3-c']) {
  if (!serviceWorker.includes(releaseContract)) {
    throw new Error(`service worker is missing reader/editor release contract: ${releaseContract}`);
  }
}

console.log('NewsFlow magazine polish contract passed: Edition-first identity, restrained Reader chrome, section hierarchy and responsive reading typography.');
