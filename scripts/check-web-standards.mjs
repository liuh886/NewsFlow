import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [index, buildSource, readingSurface, polish, serviceWorker, loader, pwaInstall, manifest, packageManifest] = await Promise.all([
  read('index.html'),
  read('scripts/build.mjs'),
  read('public/reading-surface.js'),
  read('src/polish.js'),
  read('public/sw.js'),
  read('public/editorial-loader.js'),
  read('public/pwa-install.js'),
  read('public/manifest.webmanifest').then(JSON.parse),
  read('package.json').then(JSON.parse)
]);

for (const contract of [
  'rel="canonical"',
  'property="og:title"',
  'name="twitter:card"',
  'type="application/atom+xml"',
  '__NEWSFLOW_VERSION__',
  'editorial-loader.js',
  'pwa-install.js'
]) assert(index.includes(contract), `index.html missing modern publication contract: ${contract}`);

for (const eagerEditorAsset of [
  '<script src="./review-game.js',
  '<script src="./editorial-desk.js',
  '<script src="./editorial-governance.js',
  '<script src="./editorial-office.js',
  '<link rel="stylesheet" href="./editorial-mode.css',
  '<link rel="stylesheet" href="./review-game.css',
  '<link rel="stylesheet" href="./review-archive.css',
  '<link rel="stylesheet" href="./editorial-governance.css'
]) assert(!index.includes(eagerEditorAsset), `Reader still eagerly loads editor-only asset: ${eagerEditorAsset}`);

for (const contract of [
  'generatePublicationPages',
  "'NewsArticle'",
  "'PublicationIssue'",
  "resolve(dist, 'feed.xml')",
  "resolve(dist, 'rss.xml')",
  "resolve(dist, 'sitemap.xml')",
  "resolve(dist, 'robots.txt')",
  "replaceAll('__NEWSFLOW_VERSION__', appVersion)"
]) assert(buildSource.includes(contract), `build.mjs missing publication build contract: ${contract}`);

for (const contract of ['canonicalArticleUrl', 'anchor.href = canonicalArticleUrl(id)', 'setDocumentIdentity']) {
  assert(readingSurface.includes(contract), `Reading Surface missing canonical-link contract: ${contract}`);
}
for (const contract of ['captureEditionPanelScroll', 'restoreEditionPanelScroll', "event.key === 'ArrowUp'", "event.key === 'ArrowDown'", 'shell.scrollBy']) {
  assert(readingSurface.includes(contract), `Reading Surface missing interaction-continuity contract: ${contract}`);
}

for (const contract of [
  'ensureMobileReaderSearch', 'syncEditionDialogAccessibility', 'trapEditionFocus', 'syncEditionRouteFromLocation',
  'rememberEditionPanelScroll', 'restoreEditionPanelScroll', 'newsflowEditionScrollTop', 'scrollEditionPanelWithKeyboard',
  "['ArrowUp', 'ArrowDown']", 'panel.scrollBy'
]) {
  assert(polish.includes(contract), `Reader polish missing interaction contract: ${contract}`);
}

for (const contract of [
  './review-game.css', './review-archive.css', './review-stamp.css', './editorial-governance.css',
  './review-game.js', './editorial-desk.js', './editorial-governance.js', './editorial-office.js'
]) {
  assert(loader.includes(contract), `Editorial lazy loader missing asset: ${contract}`);
}
for (const contract of ['syncEditorialEntry', 'data-action="open-editorial-office"', "launcher.style.display = 'inline-flex'", 'newsflow:edition-rendered', "label.textContent = '编辑部'"]) {
  assert(loader.includes(contract), `Editorial lazy loader missing direct-entry contract: ${contract}`);
}
for (const retired of ['./editorial-mode.css', './review-archive.js', 'newsflow_mode_v3', 'cachedMode', '当前为读者模式', 'roleTrigger']) {
  assert(!loader.includes(retired), `Retired editorial contract returned: ${retired}`);
}

for (const contract of [
  "const INSTALL_ENTRY_MODE = 'persistent'",
  'beforeinstallprompt',
  'appinstalled',
  'data-newsflow-install-action',
  'data-newsflow-install-help',
  'promptEvent.prompt()',
  '安装应用'
]) {
  assert(pwaInstall.includes(contract), `PWA install controller missing install-flow contract: ${contract}`);
}

assert(serviceWorker.includes("const ASSET_VERSION = '__NEWSFLOW_VERSION__'"), 'Service Worker must derive its deployed version from package.json at build time.');
assert(serviceWorker.includes("versioned('./editorial-loader.js')"), 'Reader app shell must cache the small editorial loader.');
assert(serviceWorker.includes("versioned('./pwa-install.js')"), 'Reader app shell must cache the PWA install controller.');
for (const eagerEditorAsset of [
  "versioned('./editorial-mode.css')", "versioned('./review-game.css')", "versioned('./review-archive.css')",
  "versioned('./editorial-governance.css')", "versioned('./review-game.js')", "versioned('./editorial-desk.js')",
  "versioned('./editorial-governance.js')", "versioned('./editorial-office.js')"
]) {
  assert(!serviceWorker.includes(eagerEditorAsset), `Service Worker still precaches editor-only asset: ${eagerEditorAsset}`);
}

assert(manifest.name === 'Frontier Systems Review', 'PWA manifest name must match the publication identity.');
assert(manifest.short_name === 'Newsflow', 'PWA short_name must retain the Newsflow product identity.');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.purpose === 'any') && manifest.icons.some((icon) => icon.purpose === 'maskable'), 'PWA manifest must declare separate any and maskable icon purposes.');
assert(manifest.icons.some((icon) => icon.sizes === '192x192'), 'PWA manifest must declare a 192x192 install icon.');
assert(manifest.icons.some((icon) => icon.sizes === '512x512'), 'PWA manifest must declare a 512x512 install icon.');
assert(/^\d+\.\d+\.\d+$/.test(String(packageManifest.version || '')), 'package.json must remain the single semantic version source.');

console.log(`NewsFlow web standards contract passed for v${packageManifest.version}: canonical publication pages, feed/sitemap, lazy permission-routed editor runtime, persistent PWA install entry, mobile search, accessible edition dialogs, reader and nested panel interaction continuity, and unified build versioning.`);