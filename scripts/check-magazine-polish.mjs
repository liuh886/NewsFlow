import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'public/magazine-polish.js',
  'public/magazine-polish.css',
  'public/reader-navigation.css',
  'public/latest-surface.js',
  'public/editorial-loader.js',
  'scripts/check-magazine-polish.mjs'
];
for (const file of files) await access(resolve(root, file));

const [index, loader, script, css, navigationCss, latestJs, readingCss, serviceWorker, packageSource] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'public/editorial-loader.js'), 'utf8'),
  readFile(resolve(root, 'public/magazine-polish.js'), 'utf8'),
  readFile(resolve(root, 'public/magazine-polish.css'), 'utf8'),
  readFile(resolve(root, 'public/reader-navigation.css'), 'utf8'),
  readFile(resolve(root, 'public/latest-surface.js'), 'utf8'),
  readFile(resolve(root, 'public/reading-surface.css'), 'utf8'),
  readFile(resolve(root, 'public/sw.js'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8')
]);
const packageManifest = JSON.parse(packageSource);

for (const reference of ['./magazine-polish.css', './magazine-polish.js', './reader-navigation.css', './latest-surface.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
  if (!serviceWorker.includes(reference)) throw new Error(`service worker is missing ${reference}`);
}
if (!index.includes('./editorial-loader.js?v=__NEWSFLOW_VERSION__')) throw new Error('Reader must load the lazy editorial entrypoint.');
for (const editorAsset of [
  './review-game.css', './review-archive.css', './review-stamp.css', './review-game.js', './editorial-desk.js',
  './editorial-governance.css', './editorial-governance.js', './editorial-office.js'
]) {
  if (index.includes(editorAsset)) throw new Error(`Reader must not eagerly load ${editorAsset}`);
  if (!loader.includes(editorAsset)) throw new Error(`editorial-loader is missing ${editorAsset}`);
}
if (index.includes('./editorial-mode.css') || loader.includes('./editorial-mode.css') || loader.includes('./review-archive.js')) {
  throw new Error('Retired role-choice/archive-controller assets must not return.');
}
if (index.indexOf('./magazine-polish.css') < index.indexOf('./edition-layer.css')) throw new Error('magazine-polish.css must load after edition-layer.css');
if (index.indexOf('./magazine-polish.js') < index.indexOf('./edition-layer.js')) throw new Error('magazine-polish.js must load after edition-layer.js');

for (const path of ['public/magazine-polish.js', 'public/latest-surface.js', 'public/editorial-loader.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${path} syntax check failed:\n${syntax.stderr}`);
}

for (const contract of [
  'setMagazineBackgroundInert', 'restoreMagazineTrigger',
  "const STATUS_PATH = './data/data-status.json'", 'AbortSignal.timeout(5000)', 'decorateDataFreshness',
  "brandName?.closest('.brand-copy')", "brandCopy.querySelectorAll('.nf-brand-row')", "brandCopy.querySelectorAll('.nf-data-date')",
  'candidate !== badge', 'nf-data-date',
  "window.addEventListener('newsflow:rendered', decorateMagazine)", "window.addEventListener('newsflow:edition-rendered', decorateMagazine)"
]) if (!script.includes(contract)) throw new Error(`magazine interaction layer is missing ${contract}`);
if (script.includes('updateLatestChangeState') || script.includes('post-issue-intro')) throw new Error('Retired parallel latest-update polish must not return.');
if (script.includes('MutationObserver') || script.includes('stopImmediatePropagation')) throw new Error('magazine polish must not observe or intercept the Edition rendering lifecycle.');
for (const contract of ['let latestOpen = false', "dataset.latestAction = 'open'", 'Latest adopted signals', '主编已经采用、但不必等待下一正式刊期的最新公开信号。']) {
  if (!latestJs.includes(contract)) throw new Error(`Latest Surface is missing ${contract}`);
}

for (const selector of [
  "[data-action='feedback-center']", "[data-action='open-editorial-office']",
  '.nf-brand-row', '.nf-data-date', ".global-search:not(:focus-within) input::placeholder", '.global-search:focus-within input::placeholder',
  "[data-edition-layer='section-view'] .issue-hero-copy > h2", ".issue-section-heading .masthead-sections button[aria-pressed='true']",
  "[data-action='feedback-hide']", '@media (max-width: 920px)', '@media (max-width: 720px)', '@media (max-width: 430px)',
  '@media print', '@media (prefers-reduced-motion: reduce)', 'overflow-x: clip',
  'grid-template-columns: 28px minmax(0, 1fr)', '.article-body', '.article-meta', 'grid-column: 2'
]) if (!css.includes(selector)) throw new Error(`magazine polish CSS is missing ${selector}`);

for (const contract of ['.mobile-menu-button::before', 'mask-image:', 'grid-template-columns: repeat(4, minmax(0, 1fr))']) {
  if (!navigationCss.includes(contract)) throw new Error(`mobile reader navigation is missing ${contract}`);
}
for (const selector of [
  '#newsflow-reading-surface-root:not([hidden])::before', 'width: min(760px, 54vw)', 'background: var(--surface-raised)',
  '.nf-reading-article h1', '.nf-reading-section > p', '@media (max-width: 720px)', '@keyframes nf-reading-sheet-in',
  '.nf-reading-progress', '.nf-share-dialog'
]) if (!readingCss.includes(selector)) throw new Error(`side-sheet reading contract is missing ${selector}`);

for (const identity of [
  'Frontier Systems Review — AI 基建、CCUS 与能源转型',
  'Frontier Systems Review：聚焦 AI 基建、CCUS 与能源转型的专业半月刊'
]) if (!index.includes(identity)) throw new Error(`Edition-first browser identity is missing: ${identity}`);

if (!/^\d+\.\d+\.\d+$/.test(String(packageManifest.version || ''))) throw new Error('package release contract must remain semantic and drive Reader asset versioning');
if (!packageManifest.scripts?.check?.includes('check-magazine-polish.mjs')) throw new Error('npm check must include the magazine polish contract');
for (const releaseContract of ["const ASSET_VERSION = '__NEWSFLOW_VERSION__'", 'newsflow-reader-v${ASSET_VERSION}', 'reader-navigation.css', 'reading-surface.css', 'latest-surface.js', 'share-card.js', 'editorial-loader.js']) {
  if (!serviceWorker.includes(releaseContract)) throw new Error(`service worker is missing Reader release contract: ${releaseContract}`);
}
for (const eagerEditorAsset of [
  "versioned('./editorial-governance.css')", "versioned('./editorial-governance.js')", "versioned('./review-game.css')",
  "versioned('./review-archive.css')", "versioned('./review-stamp.css')", "versioned('./review-game.js')", "versioned('./editorial-desk.js')"
]) {
  if (serviceWorker.includes(eagerEditorAsset)) throw new Error(`service worker must not precache editor-only asset ${eagerEditorAsset}`);
}

console.log('NewsFlow magazine polish contract passed: Edition-first identity, explicit Latest, explicit mobile tools trigger, four-task publication navigation, continuous reading, editorial sharing and lazy permission-routed editorial access.');
