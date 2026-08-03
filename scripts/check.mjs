import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = 'src/editorial-app.js';
const polishPath = 'src/polish.js';
const editionLayerPath = 'src/edition-layer.js';
const publisherPath = 'scripts/publish-edition.mjs';
const requiredFiles = [
  'index.html',
  appPath,
  polishPath,
  editionLayerPath,
  publisherPath,
  'src/styles.css',
  'src/polish.css',
  'src/edition-layer.css',
  'public/icon.svg',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/data/news.json',
  'public/data/ai_digest.json',
  'public/data/topics.json',
  'public/data/edition.json',
  'public/data/issues.json',
  'public/data/storylines.json',
  'editions/reference/edition.yaml',
  'docs/edition-protocol.md',
  '.github/workflows/publish-edition.yml'
];

for (const file of requiredFiles) await access(resolve(root, file));

for (const scriptPath of [appPath, polishPath, editionLayerPath, publisherPath, 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, scriptPath)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${scriptPath} syntax check failed:\n${syntax.stderr}`);
}

const index = await readFile(resolve(root, 'index.html'), 'utf8');
for (const reference of [
  './styles.css', './polish.css', './edition-layer.css', './editorial-app.js', './polish.js', './edition-layer.js', './manifest.webmanifest'
]) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
for (const contract of ['mobile-web-app-capable', 'apple-mobile-web-app-capable', 'id="app-status"', 'role="status"', 'aria-atomic="true"']) {
  if (!index.includes(contract)) throw new Error(`index.html is missing ${contract}`);
}
if (index.includes('id="app" aria-live=')) throw new Error('the whole application root must not be an aria-live region');
if (index.includes('./app.js')) throw new Error('index.html still loads the legacy frontend asset');

const news = JSON.parse(await readFile(resolve(root, 'public/data/news.json'), 'utf8'));
const digest = JSON.parse(await readFile(resolve(root, 'public/data/ai_digest.json'), 'utf8'));
const topics = JSON.parse(await readFile(resolve(root, 'public/data/topics.json'), 'utf8'));
const edition = JSON.parse(await readFile(resolve(root, 'public/data/edition.json'), 'utf8'));
const issues = JSON.parse(await readFile(resolve(root, 'public/data/issues.json'), 'utf8'));
const storylines = JSON.parse(await readFile(resolve(root, 'public/data/storylines.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'public/manifest.webmanifest'), 'utf8'));

if (!Array.isArray(news) || news.length < 5) throw new Error('news.json must contain at least five items');
if (!Array.isArray(digest)) throw new Error('ai_digest.json must be an array');
if (!Array.isArray(topics) || topics.length < 3) throw new Error('topics.json must contain the core channels');
if (!manifest.name || !manifest.id || !manifest.start_url || !Array.isArray(manifest.icons)) throw new Error('manifest.webmanifest is incomplete');
if (manifest.lang !== 'zh-CN') throw new Error('manifest language must match the Chinese application shell');
if (!Array.isArray(manifest.categories) || !manifest.categories.includes('news')) throw new Error('manifest must identify NewsFlow as a news application');

const requiredFields = ['id', 'title', 'url', 'source', 'published_at', 'quality_index', 'short_summary', 'long_summary', 'tags'];
const ids = new Set();
for (const [indexNumber, item] of news.entries()) {
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || item[field] === '') throw new Error(`news.json item ${indexNumber} is missing ${field}`);
  }
  if (!Array.isArray(item.tags)) throw new Error(`news.json item ${indexNumber} tags must be an array`);
  if (!/^https?:\/\//.test(item.url)) throw new Error(`news.json item ${indexNumber} has an invalid URL`);
  if (Number.isNaN(new Date(item.published_at).getTime())) throw new Error(`news.json item ${indexNumber} has an invalid publication date`);
  if (ids.has(item.id)) throw new Error(`duplicate news id: ${item.id}`);
  ids.add(item.id);
}

for (const field of ['schema_version', 'id', 'name', 'reader_promise', 'editorial_view', 'scope', 'source_policy', 'materiality', 'publishing', 'storylines']) {
  if (edition[field] === undefined || edition[field] === null || edition[field] === '') throw new Error(`edition.json is missing ${field}`);
}
if (edition.publishing?.edition?.cadence !== 'twice_monthly') throw new Error('Edition cadence must be twice_monthly');
if (edition.publishing?.edition?.automatic !== true) throw new Error('Edition publication must be automatic');
if (edition.publishing?.edition?.fixed_length !== false) throw new Error('Edition length must remain information-led');
if (edition.publishing?.edition?.manual_review_required !== false) throw new Error('reference Edition must publish without manual review');
if (JSON.stringify(edition.publishing?.edition?.days) !== JSON.stringify([1, 15])) throw new Error('Edition publication days must be 1 and 15');

if (!Array.isArray(storylines) || storylines.length < 3) throw new Error('storylines.json must contain persistent editorial questions');
const storylineIds = new Set(storylines.map((storyline) => storyline.id));
for (const storyline of storylines) {
  for (const field of ['id', 'title', 'question', 'current_view', 'movement', 'last_updated']) {
    if (!storyline[field]) throw new Error(`storyline ${storyline.id || 'unknown'} is missing ${field}`);
  }
}

if (!Array.isArray(issues) || issues.length < 1) throw new Error('issues.json must contain at least one published Issue');
const issueIds = new Set();
for (const issue of issues) {
  for (const field of ['id', 'issue_number', 'published_at', 'coverage_start', 'coverage_end', 'status', 'title', 'standfirst', 'judgment', 'signal_ids', 'storyline_updates', 'methodology']) {
    if (issue[field] === undefined || issue[field] === null || issue[field] === '') throw new Error(`Issue ${issue.id || 'unknown'} is missing ${field}`);
  }
  if (issueIds.has(issue.id)) throw new Error(`duplicate Issue id: ${issue.id}`);
  issueIds.add(issue.id);
  if (issue.auto_generated !== true) throw new Error(`Issue ${issue.id} must expose automatic provenance`);
  if (issue.methodology?.fixed_length !== false) throw new Error(`Issue ${issue.id} must not use fixed length`);
  if (issue.methodology?.editorial_view_changed !== false) throw new Error(`automatic Issue ${issue.id} must not rewrite the editorial view`);
  for (const update of issue.storyline_updates) {
    if (!storylineIds.has(update.storyline_id)) throw new Error(`Issue ${issue.id} references unknown storyline ${update.storyline_id}`);
  }
}

const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
for (const selector of ['.topbar', '.lead-story', '.article-card', '.article-drawer', '@media (max-width: 920px)']) {
  if (!css.includes(selector)) throw new Error(`styles.css is missing ${selector}`);
}

const polishCss = await readFile(resolve(root, 'src/polish.css'), 'utf8');
for (const contract of ['body.is-scrolled .topbar', 'var(--paper) 50%', '.brand-name', 'font-family: var(--font-editorial)', 'scrollbar-gutter: stable', 'content-visibility: auto', 'min-height: 44px', 'body.overlay-active', '@media (forced-colors: active)', '.mobile-search-backdrop', '.feed-list.list .article-tags', '.rail-card.prominent']) {
  if (!polishCss.includes(contract)) throw new Error(`polish.css is missing ${contract}`);
}
if (polishCss.includes('margin-inline: -14px')) throw new Error('polish layer must not reintroduce hover layout shift');
if (polishCss.includes('linear-gradient(155deg, #18283e')) throw new Error('simplified rail must not restore the heavy dashboard card');

const editionCss = await readFile(resolve(root, 'src/edition-layer.css'), 'utf8');
for (const selector of ['.latest-edition-panel', '.edition-identity-card', '.storyline-rail', '.edition-archive', '@media (max-width: 620px)']) {
  if (!editionCss.includes(selector)) throw new Error(`edition-layer.css is missing ${selector}`);
}

const appSource = await readFile(resolve(root, appPath), 'utf8');
if (appSource.includes('NEXUS INTELLIGENCE ONLINE')) throw new Error('legacy Nexus visual language remains in the new frontend');
if (!appSource.includes('escapeHtml')) throw new Error('rendered news content must be escaped');
if (!appSource.includes('repositoryPayload.length ? repositoryPayload : verifiedFallbackItems')) throw new Error('verified fallback must be exclusive and must not be merged into a valid repository payload');
if (appSource.includes('[...verifiedFallbackItems') || appSource.includes('...fallbackItems')) throw new Error('fallback content must not be concatenated with repository payloads');
if (appSource.includes('今日首要信号') || appSource.includes('今日版本')) throw new Error('freshness labels must come from the data snapshot rather than the current date');

const polishSource = await readFile(resolve(root, polishPath), 'utf8');
for (const contract of ["window.scrollY > 18", "classList.toggle('is-scrolled'", "observer.observe(appRoot, { childList: true })", 'appRoot.inert = inert', 'trapSearchFocus', "setAttribute('aria-pressed'", "setAttribute('role', 'search')", "window.addEventListener('offline'", "window.addEventListener('online'", 'mobile-search-backdrop', 'simplifyMasthead', 'simplifySidebar', 'simplifyFeed', 'simplifyRail', 'simplifyDrawer']) {
  if (!polishSource.includes(contract)) throw new Error(`polish.js is missing ${contract}`);
}
if (polishSource.includes('subtree: true')) throw new Error('root rendering observer must not scan the entire application subtree');

const editionSource = await readFile(resolve(root, editionLayerPath), 'utf8');
for (const contract of ['Autonomous edition', 'Latest Edition', 'Editorial Desk', '长期议题', '刊期与判断记录', "observer.observe(appRoot, { childList: true })", 'escapeEditionHtml']) {
  if (!editionSource.includes(contract)) throw new Error(`edition-layer.js is missing ${contract}`);
}
if (editionSource.includes('subtree: true')) throw new Error('Edition observer must stay on root child replacement only');

const publisherSource = await readFile(resolve(root, publisherPath), 'utf8');
for (const contract of ['[1, 15]', 'editorial_view_changed: false', '本期未发现足以改变现有判断的重大信息']) {
  if (!publisherSource.includes(contract)) throw new Error(`publish-edition.mjs is missing ${contract}`);
}

const serviceWorker = await readFile(resolve(root, 'public/sw.js'), 'utf8');
for (const asset of ['./editorial-app.js', './polish.js', './edition-layer.js', './styles.css', './polish.css', './edition-layer.css', './data/edition.json', './data/issues.json', './data/storylines.json']) {
  if (!serviceWorker.includes(asset)) throw new Error(`service worker is missing ${asset}`);
}
for (const contract of ['newsflow-editorial-v2.3.0', "event.request.mode === 'navigate'", 'networkFirst', "url.origin !== self.location.origin", 'event.waitUntil(networkUpdate']) {
  if (!serviceWorker.includes(contract)) throw new Error(`service worker is missing ${contract}`);
}
if (serviceWorker.includes("'./app.js'")) throw new Error('service worker still caches the legacy frontend asset');

console.log(`NewsFlow checks passed: ${news.length} Signals, ${storylines.length} Storylines, ${issues.length} autonomous Issues, Edition-defined publication, responsive reader and resilient PWA caching.`);
