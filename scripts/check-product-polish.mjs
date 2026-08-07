import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [index, appJs, editionJs, editionCss, startupJs, gameJs, gameCss, serviceWorker, statusText, reactionsText] = await Promise.all([
  read('index.html'),
  read('src/editorial-app.js'),
  read('src/edition-layer.js'),
  read('src/edition-layer.css'),
  read('public/startup-resilience.js'),
  read('public/review-game.js'),
  read('public/review-game.css'),
  read('public/sw.js'),
  read('public/data/data-status.json'),
  read('public/data/editorial-reactions.json')
]);

for (const reference of ['./startup-resilience.js', './review-game.css', './review-game.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
  if (!serviceWorker.includes(reference)) throw new Error(`service worker is missing ${reference}`);
}
if (index.indexOf('./startup-resilience.js') > index.indexOf('./editorial-app.js')) {
  throw new Error('startup-resilience.js must run before editorial-app.js');
}
if (!serviceWorker.includes('./data/data-status.json')) throw new Error('Service worker is missing data-status.json.');

for (const path of ['src/editorial-app.js', 'src/edition-layer.js', 'public/startup-resilience.js', 'public/review-game.js', 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${path} syntax failed:\n${syntax.stderr}`);
}

for (const contract of [
  'STARTUP_WATCHDOG_MS = 8000',
  'data-startup-recovery="true"',
  "serviceWorker.register('./sw.js', { updateViaCache: 'none' })"
]) {
  if (!startupJs.includes(contract)) throw new Error(`Startup resilience is missing ${contract}`);
}
if (startupJs.includes('window.fetch =') || startupJs.includes('nativeFetch')) {
  throw new Error('Startup resilience must not own or monkey-patch application data fetching.');
}
if (!appJs.includes('AbortSignal.timeout(5000)')) {
  throw new Error('Reader data owner must bound repository data requests directly.');
}
for (const contract of [
  '按时间排序',
  "(validDate(b.published_at)?.getTime() || 0) - (validDate(a.published_at)?.getTime() || 0)",
  'recommendationScore(b) - recommendationScore(a)'
]) {
  if (!appJs.includes(contract)) throw new Error(`Editorial Desk chronological contract is missing ${contract}`);
}
for (const contract of ['NETWORK_TIMEOUT_MS = 5000', 'fetchWithTimeout', 'warmAppShell', 'reader-editor-modes']) {
  if (!serviceWorker.includes(contract)) throw new Error(`Service worker startup contract is missing ${contract}`);
}

for (const contract of [
  '一屏一稿',
  'EDITORIAL DISPOSITION REPORT',
  'data-review-action="decision"',
  'nf-review-stamp',
  'prefers-reduced-motion',
  'grid-template-columns: repeat(5',
  "client.rpc('newsflow_is_authoritative_editor')"
]) {
  if (!`${gameJs}\n${gameCss}`.includes(contract)) throw new Error(`Review game polish contract is missing ${contract}`);
}

for (const contract of [
  'cover_signal_id',
  '封面已定',
  '主编选稿',
  '按时间排序'
]) {
  if (!editionJs.includes(contract)) throw new Error(`Issue focus contract is missing ${contract}`);
}
for (const selector of [
  '.issue-signal-link.is-cover',
  'font-size: clamp(30px, 4vw, 43px)',
  'border-top: 4px double var(--ink)'
]) {
  if (!editionCss.includes(selector)) throw new Error(`Cover story visual hierarchy is missing ${selector}`);
}

const reactions = JSON.parse(reactionsText);
if (!Array.isArray(reactions.reject) || reactions.reject.length < 8) {
  throw new Error('Reject needs a deep editorial emotion-feedback pool.');
}
for (const decision of ['cover_story', 'accept', 'minor_revision', 'major_revision', 'reject']) {
  if (!Array.isArray(reactions[decision]) || reactions[decision].length < 4) {
    throw new Error(`Decision ${decision} needs at least four reaction lines.`);
  }
}

const status = JSON.parse(statusText);
if (status.schema_version !== '1.0' || !status.updated_at || status.timezone !== 'Asia/Shanghai') {
  throw new Error('data-status.json has an invalid contract.');
}
if (!Number.isInteger(status.signal_count) || status.signal_count < 1) throw new Error('data-status.json has no signal_count.');

const statusCheck = spawnSync(process.execPath, [resolve(root, 'scripts/update-data-status.mjs'), '--check'], { encoding: 'utf8' });
if (statusCheck.status !== 0) throw new Error(statusCheck.stderr || statusCheck.stdout);

console.log('NewsFlow product polish passed: chronological reader desk, cover-led Issue hierarchy, secure editor publication and live freshness.');
