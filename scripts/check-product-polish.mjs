import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [index, appJs, startupJs, delightJs, delightCss, serviceWorker, statusText] = await Promise.all([
  read('index.html'),
  read('src/editorial-app.js'),
  read('public/startup-resilience.js'),
  read('public/editorial-delight.js'),
  read('public/editorial-delight.css'),
  read('public/sw.js'),
  read('public/data/data-status.json')
]);

for (const reference of ['./startup-resilience.js', './editorial-delight.css', './editorial-delight.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
  if (!serviceWorker.includes(reference)) throw new Error(`Service worker is missing ${reference}`);
}
if (index.indexOf('./startup-resilience.js') > index.indexOf('./editorial-app.js')) {
  throw new Error('startup-resilience.js must run before editorial-app.js');
}
if (!serviceWorker.includes('./data/data-status.json')) throw new Error('Service worker is missing data-status.json.');

for (const path of ['src/editorial-app.js', 'public/startup-resilience.js', 'public/editorial-delight.js', 'public/sw.js']) {
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
  'NETWORK_TIMEOUT_MS = 5000',
  'fetchWithTimeout',
  'warmAppShell',
  'serious-play-v2.6.0'
]) {
  if (!serviceWorker.includes(contract)) throw new Error(`Service worker startup contract is missing ${contract}`);
}

for (const contract of [
  '情绪反馈 · 不写入评审档案',
  'data-editorial-action="decision"',
  'newsflow_editorial_round_count',
  'nf-data-date',
  'prefers-reduced-motion'
]) {
  if (!`${delightJs}\n${delightCss}`.includes(contract)) throw new Error(`Product polish contract is missing ${contract}`);
}

const rejectSection = delightJs.match(/reject:\s*\{[\s\S]*?lines:\s*\[([\s\S]*?)\]\s*\n\s*\}/)?.[1] || '';
const rejectionReasons = [...rejectSection.matchAll(/^\s*'[^']+',?$/gm)].length;
if (rejectionReasons < 12) throw new Error(`Expected at least 12 rejection emotion lines, found ${rejectionReasons}.`);

const status = JSON.parse(statusText);
if (status.schema_version !== '1.0' || !status.updated_at || status.timezone !== 'Asia/Shanghai') {
  throw new Error('data-status.json has an invalid contract.');
}
if (!Number.isInteger(status.signal_count) || status.signal_count < 1) throw new Error('data-status.json has no signal_count.');

const statusCheck = spawnSync(process.execPath, [resolve(root, 'scripts/update-data-status.mjs'), '--check'], { encoding: 'utf8' });
if (statusCheck.status !== 0) throw new Error(statusCheck.stderr || statusCheck.stdout);

console.log(`NewsFlow serious-play product contract passed: bounded data ownership, ${rejectionReasons} rejection events and live data badge.`);
