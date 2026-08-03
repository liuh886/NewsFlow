import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'index.html',
  'src/app.js',
  'src/styles.css',
  'public/icon.svg',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/data/news.json',
  'public/data/ai_digest.json',
  'public/data/topics.json'
];

for (const file of requiredFiles) {
  await access(resolve(root, file));
}

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'src/app.js')], { encoding: 'utf8' });
if (syntax.status !== 0) {
  throw new Error(`JavaScript syntax check failed:\n${syntax.stderr}`);
}

const index = await readFile(resolve(root, 'index.html'), 'utf8');
for (const reference of ['./styles.css', './app.js', './manifest.webmanifest']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}

const news = JSON.parse(await readFile(resolve(root, 'public/data/news.json'), 'utf8'));
const topics = JSON.parse(await readFile(resolve(root, 'public/data/topics.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'public/manifest.webmanifest'), 'utf8'));

if (!Array.isArray(news) || news.length < 5) throw new Error('news.json must contain at least five items');
if (!Array.isArray(topics) || topics.length < 3) throw new Error('topics.json must contain the core channels');
if (!manifest.name || !manifest.start_url || !Array.isArray(manifest.icons)) throw new Error('manifest.webmanifest is incomplete');

const requiredFields = ['id', 'title', 'url', 'source', 'published_at', 'quality_index', 'short_summary', 'long_summary', 'tags'];
const ids = new Set();
for (const [indexNumber, item] of news.entries()) {
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || item[field] === '') {
      throw new Error(`news.json item ${indexNumber} is missing ${field}`);
    }
  }
  if (!Array.isArray(item.tags)) throw new Error(`news.json item ${indexNumber} tags must be an array`);
  if (!/^https?:\/\//.test(item.url)) throw new Error(`news.json item ${indexNumber} has an invalid URL`);
  if (ids.has(item.id)) throw new Error(`duplicate news id: ${item.id}`);
  ids.add(item.id);
}

const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
for (const selector of ['.topbar', '.lead-story', '.article-card', '.article-drawer', '@media (max-width: 920px)']) {
  if (!css.includes(selector)) throw new Error(`styles.css is missing ${selector}`);
}

const appSource = await readFile(resolve(root, 'src/app.js'), 'utf8');
if (appSource.includes('NEXUS INTELLIGENCE ONLINE')) throw new Error('legacy Nexus visual language remains in the new frontend');
if (!appSource.includes('escapeHtml')) throw new Error('rendered news content must be escaped');

console.log(`NewsFlow checks passed: ${news.length} data items, ${topics.length} channels, valid PWA shell.`);
