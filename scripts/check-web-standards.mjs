import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [index, buildSource, readingSurface, polish, serviceWorker, loader, manifest, packageManifest] = await Promise.all([
  read('index.html'),
  read('scripts/build.mjs'),
  read('public/reading-surface.js'),
  read('src/polish.js'),
  read('public/sw.js'),
  read('public/editorial-loader.js'),
  read('public/manifest.webmanifest').then(JSON.parse),
  read('package.json').then(JSON.parse)
]);

for (const contract of [
  'rel="canonical"',
  'property="og:title"',
  'name="twitter:card"',
  'type="application/atom+xml"',
  '__NEWSFLOW_VERSION__',
  'editorial-loader.js'
]) assert(index.includes(contract), `index.html missing modern publication contract: ${contract}`);

for (const eagerEditorAsset of [
  '<script src="./review-game.js',
  '<script src="./editorial-governance.js',
  '<script src="./editorial-office.js',
  '<link rel="stylesheet" href="./editorial-mode.css',
  '<link rel="stylesheet" href="./review-game.css',
  '<link rel="stylesheet" href="./editorial-governance.css'
]) assert(!index.includes(eagerEditorAsset), `Reader still eagerly loads editor-only asset: ${eagerEditorAsset}`);

for (const contract of [
  'generatePublicationPages',
  "'NewsArticle'",
  "'PublicationIssue'",
  "resolve(dist, 'feed.xml')",
  "resolve(dist, 'sitemap.xml')",
  "resolve(dist, 'robots.txt')",
  "replaceAll('__NEWSFLOW_VERSION__', appVersion)"
]) assert(buildSource.includes(contract), `build.mjs missing publication build contract: ${contract}`);

for (const contract of ['canonicalArticleUrl', 'anchor.href = canonicalArticleUrl(id)', 'setDocumentIdentity']) {
  assert(readingSurface.includes(contract), `Reading Surface missing canonical-link contract: ${contract}`);
}

for (const contract of ['ensureMobileReaderSearch', 'syncEditionDialogAccessibility', 'trapEditionFocus', 'syncEditionRouteFromLocation']) {
  assert(polish.includes(contract), `Reader polish missing interaction contract: ${contract}`);
}

for (const contract of ['./editorial-mode.css', './review-game.css', './editorial-governance.css', './review-game.js', './editorial-governance.js', './editorial-office.js']) {
  assert(loader.includes(contract), `Editorial lazy loader missing asset: ${contract}`);
}

assert(serviceWorker.includes("const ASSET_VERSION = '__NEWSFLOW_VERSION__'"), 'Service Worker must derive its deployed version from package.json at build time.');
assert(serviceWorker.includes("versioned('./editorial-loader.js')"), 'Reader app shell must cache the small editorial loader.');
for (const eagerEditorAsset of ["versioned('./editorial-mode.css')", "versioned('./review-game.css')", "versioned('./editorial-governance.css')", "versioned('./review-game.js')", "versioned('./editorial-governance.js')", "versioned('./editorial-office.js')"]) {
  assert(!serviceWorker.includes(eagerEditorAsset), `Service Worker still precaches editor-only asset: ${eagerEditorAsset}`);
}

assert(manifest.name === 'Frontier Systems Review', 'PWA manifest name must match the publication identity.');
assert(manifest.short_name === 'NewsFlow', 'PWA short_name must retain the NewsFlow product identity.');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.purpose === 'any') && manifest.icons.some((icon) => icon.purpose === 'maskable'), 'PWA manifest must declare separate any and maskable icon purposes.');
assert(/^\d+\.\d+\.\d+$/.test(String(packageManifest.version || '')), 'package.json must remain the single semantic version source.');

console.log(`NewsFlow web standards contract passed for v${packageManifest.version}: canonical publication pages, feed/sitemap, lazy editor runtime, mobile search, accessible edition dialogs and unified build versioning.`);
