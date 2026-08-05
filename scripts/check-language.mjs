import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const [index, manifestSource, editionSource, layerSource, polishSource, serviceWorker] = await Promise.all([
  read('index.html'),
  read('public/manifest.webmanifest'),
  read('public/data/edition.json'),
  read('src/edition-layer.js'),
  read('src/language-polish.js'),
  read('public/sw.js'),
]);

const manifest = JSON.parse(manifestSource);
const edition = JSON.parse(editionSource);

if (!index.includes('<html lang="zh-CN"')) throw new Error('NewsFlow HTML language must be zh-CN.');
if (!index.includes('./language-polish.js')) throw new Error('NewsFlow must load the language consistency layer.');
if (manifest.lang !== edition.language) throw new Error('PWA manifest language must match Edition language.');
if (edition.language !== 'zh-CN') throw new Error('The reference Edition is explicitly Chinese.');

for (const leak of ['Latest Edition', 'Editorial Desk', 'Autonomous edition', 'Strong editor mode', '>Archive<']) {
  if (layerSource.includes(leak)) throw new Error(`English Edition chrome remains: ${leak}`);
}

for (const contract of ['信号评分', '机构 / 一手源', 'NewsFlow · 证据视图', "replaceAll('Score ', '评分 ')"]) {
  if (!polishSource.includes(contract)) throw new Error(`Language consistency layer is missing: ${contract}`);
}

if (!serviceWorker.includes('./language-polish.js')) throw new Error('Service worker must cache language-polish.js.');
if (!serviceWorker.includes('newsflow-editorial-v2.3.1')) throw new Error('Service worker cache must be bumped for language changes.');

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'src/language-polish.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`language-polish.js syntax check failed:\n${syntax.stderr}`);

console.log('NewsFlow language contract passed: Chinese Edition, localized chrome, matching PWA metadata.');
