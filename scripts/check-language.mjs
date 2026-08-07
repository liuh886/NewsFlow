import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const [index, manifestSource, editionSource, appSource, layerSource, serviceWorker] = await Promise.all([
  read('index.html'),
  read('public/manifest.webmanifest'),
  read('public/data/edition.json'),
  read('src/editorial-app.js'),
  read('src/edition-layer.js'),
  read('public/sw.js')
]);

const manifest = JSON.parse(manifestSource);
const edition = JSON.parse(editionSource);

if (!index.includes('<html lang="zh-CN"')) throw new Error('NewsFlow HTML language must be zh-CN.');
if (manifest.lang !== edition.language) throw new Error('PWA manifest language must match Edition language.');
if (edition.language !== 'zh-CN') throw new Error('The reference Edition is explicitly Chinese.');

for (const contract of ['信号评分', '机构 / 一手源', 'NewsFlow · 证据视图', '评分 ${getQuality(item).toFixed(1)}']) {
  if (!appSource.includes(contract)) throw new Error(`Reader render source is missing localized contract: ${contract}`);
}

for (const leak of ['Latest Edition', 'Editorial Desk', 'Autonomous edition', 'Strong editor mode', '>Archive<']) {
  if (layerSource.includes(leak)) throw new Error(`English Edition chrome remains: ${leak}`);
}

for (const retired of ['./language-polish.js', 'src/language-polish.js']) {
  if (index.includes(retired) || serviceWorker.includes(retired)) {
    throw new Error(`Retired language patch is still referenced: ${retired}`);
  }
}
try {
  await access(resolve(root, 'src/language-polish.js'));
  throw new Error('Language consistency must be rendered directly; src/language-polish.js must not exist.');
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

console.log('NewsFlow language contract passed: Chinese is rendered at source with no DOM translation patch.');
