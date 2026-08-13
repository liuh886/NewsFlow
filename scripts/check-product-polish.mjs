import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const [index, loader, appJs, polishJs, editionJs, editionCss, navigationCss, readingJs, readingCss, shareCardJs, startupJs, gameJs, gameCss, governanceJs, governanceCss, serviceWorker, statusText, reactionsText] = await Promise.all([
  read('index.html'), read('public/editorial-loader.js'), read('src/editorial-app.js'), read('src/polish.js'), read('src/edition-layer.js'), read('src/edition-layer.css'),
  read('public/reader-navigation.css'), read('public/reading-surface.js'), read('public/reading-surface.css'), read('public/share-card.js'), read('public/startup-resilience.js'),
  read('public/review-game.js'), read('public/review-game.css'), read('public/editorial-governance.js'), read('public/editorial-governance.css'),
  read('public/sw.js'), read('public/data/data-status.json'), read('public/data/editorial-reactions.json')
]);

for (const reference of ['./startup-resilience.js', './reader-navigation.css', './reading-surface.css', './share-card.js', './reading-surface.js', './editorial-loader.js']) {
  if (!index.includes(reference)) throw new Error(`index.html is missing Reader reference ${reference}`);
  if (!serviceWorker.includes(reference)) throw new Error(`service worker is missing Reader reference ${reference}`);
}
for (const editorAsset of ['./review-game.css', './review-game.js', './editorial-governance.css', './editorial-governance.js']) {
  if (index.includes(editorAsset)) throw new Error(`Reader must not eagerly load ${editorAsset}`);
  if (!loader.includes(editorAsset)) throw new Error(`editorial-loader is missing ${editorAsset}`);
}
if (index.includes('./editorial-mode.css') || loader.includes('./editorial-mode.css')) throw new Error('Retired role-choice UI must stay deleted.');
if (index.indexOf('./startup-resilience.js') > index.indexOf('./editorial-app.js')) throw new Error('startup-resilience.js must run before editorial-app.js');
if (!serviceWorker.includes('./data/data-status.json')) throw new Error('Service worker is missing data-status.json.');

for (const path of ['src/editorial-app.js', 'src/polish.js', 'src/edition-layer.js', 'public/share-card.js', 'public/reading-surface.js', 'public/startup-resilience.js', 'public/editorial-loader.js', 'public/review-game.js', 'public/editorial-governance.js', 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, path)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${path} syntax failed:\n${syntax.stderr}`);
}

for (const contract of ['STARTUP_WATCHDOG_MS = 8000', 'data-startup-recovery="true"', "serviceWorker.register('./sw.js', { updateViaCache: 'none' })"]) {
  if (!startupJs.includes(contract)) throw new Error(`Startup resilience is missing ${contract}`);
}
if (startupJs.includes('window.fetch =') || startupJs.includes('nativeFetch')) throw new Error('Startup resilience must not own or monkey-patch application data fetching.');
if (!appJs.includes('AbortSignal.timeout(5000)')) throw new Error('Reader data owner must bound publication requests directly.');
for (const contract of ['按时间排序', '按你的反馈排序', 'personalizationReady', 'recommendationScore(b) - recommendationScore(a)']) {
  if (!appJs.includes(contract)) throw new Error(`Reader utility ranking contract is missing ${contract}`);
}
if (!appJs.includes('data-channel-id="${escapeHtml(item.channel_id || \'\')}"')) throw new Error('Reader cards must expose their canonical channel for topic numbering.');
for (const forbidden of ['verifiedFallbackItems', './data/ai_digest.json', '信号评分', '高置信度', '评分 ${getQuality']) {
  if (appJs.includes(forbidden)) throw new Error(`Reader must not expose or synthesize internal editorial content: ${forbidden}`);
}
for (const contract of ['NETWORK_TIMEOUT_MS = 5000', 'fetchWithTimeout', 'warmAppShell', "const ASSET_VERSION = '__NEWSFLOW_VERSION__'", 'newsflow-reader-v${ASSET_VERSION}', "versioned('./share-card.js')"]) {
  if (!serviceWorker.includes(contract)) throw new Error(`Service worker startup contract is missing ${contract}`);
}
for (const contract of ['ensureMobileReaderSearch', 'syncEditionDialogAccessibility', 'trapEditionFocus']) {
  if (!polishJs.includes(contract)) throw new Error(`Reader interaction polish is missing ${contract}`);
}
for (const contract of ['.mobile-menu-button::before', 'mask-image:', 'grid-template-columns: repeat(4, minmax(0, 1fr))']) {
  if (!navigationCss.includes(contract)) throw new Error(`Reader mobile navigation contract is missing ${contract}`);
}

for (const contract of [
  'EDITORIAL DISPOSITION REPORT', 'data-review-action="decision"', 'nf-review-stamp',
  'prefers-reduced-motion', 'grid-template-columns: repeat(5', "from('newsflow_candidates')", "from('newsflow_editorial_reviews')",
  '编辑意见', 'FINAL EDITORIAL RECORD'
]) if (!`${gameJs}\n${gameCss}\n${governanceCss}`.includes(contract)) throw new Error(`Review game polish contract is missing ${contract}`);
if (gameJs.includes('openGuest') || gameJs.includes('localStorage')) throw new Error('Review game may not reintroduce public guest packets or local editorial decisions.');

for (const contract of [
  'cover_signal_id', '阅读封面文章', 'Published with Newsflow', 'AI 基建', 'CCUS 与能源转型',
  "firstEditorialAnchor.insertAdjacentHTML('beforebegin', renderCurrentIssue(edition, issue))", '#section/', "channelSort: 'newest'", "data-sort=\"selected\"",
  'readerUtilityState', 'publishedIssueById', 'const issues = publishedIssues();', '期刊目录', '全部刊期', 'data-issue-current', '<span>最新</span>'
]) if (!editionJs.includes(contract)) throw new Error(`Premium Reader IA/section contract is missing ${contract}`);
for (const retired of ['renderPostIssueIntro', 'data-target="latest-change"', '最新更新', 'archivedIssues']) {
  if (editionJs.includes(retired)) throw new Error(`Retired parallel latest/archive path returned: ${retired}`);
}
for (const selector of ['.issue-hero-copy h2', 'font-size: clamp(48px, 6.2vw, 76px)', '.issue-judgment-band', '.global-search:focus-within']) {
  if (!editionCss.includes(selector)) throw new Error(`Premium Reader visual hierarchy is missing ${selector}`);
}
for (const contract of ["data-channel-id='ccus-energy-transition'", "data-channel-id='ai-infrastructure'", "brandName.textContent = 'Newsflow'", 'font-size: 28px']) {
  if (!`${editionJs}\n${editionCss}`.includes(contract)) throw new Error(`Reader topic/brand distinction is missing ${contract}`);
}
if (!editionJs.includes("<span>${String(index + 1).padStart(2, '0')}</span>") || editionJs.includes("? '选' : String(index + 1)")) {
  throw new Error('Channel article markers must remain numeric in every sort mode.');
}
if (!editionCss.includes('.source-verification')) throw new Error('Reader source provenance styling is missing.');

for (const contract of [
  "const ROOT_ID = 'newsflow-reading-surface-root'", '#read/', 'canonicalArticleUrl', 'Newsflow Editorial Desk', '为什么重要',
  '证据与来源', '长期议题', '相关阅读', 'decorateReadingLinks', "window.addEventListener('newsflow:rendered'",
  "window.addEventListener('newsflow:edition-rendered'", 'nf-reading-progress', 'share-signal', 'navigator.share', 'quickEvidence?.remove()', "querySelector('.article-action[data-action=\"feedback-hide\"]')?.remove()"
]) if (!readingJs.includes(contract)) throw new Error(`Reading Surface is missing ${contract}`);
if (readingJs.includes('<h2>发生了什么</h2>')) throw new Error('Reading Surface must not duplicate the standfirst.');
if (readingJs.includes('MutationObserver') || readingJs.includes('stopImmediatePropagation')) throw new Error('Reading Surface must integrate through explicit lifecycle events and scoped capture.');
for (const contract of [
  '#newsflow-reading-surface-root:not([hidden])::before', 'width: min(760px, 54vw)', 'background: var(--surface-raised)',
  '.nf-reading-article h1', '.nf-reading-standfirst', '.nf-reading-section > p', '.nf-reading-progress', '.nf-share-dialog', '@media (max-width: 720px)',
  '@media (prefers-reduced-motion: reduce)', '@media print', '@keyframes nf-reading-sheet-in'
]) if (!readingCss.includes(contract)) throw new Error(`Reading side-sheet CSS is missing ${contract}`);
for (const contract of ['SHARE_WIDTH = 1080', 'SHARE_HEIGHT = 1440', 'WHY IT MATTERS', 'KEY QUOTE', 'window.NewsFlowShareCard']) {
  if (!shareCardJs.includes(contract)) throw new Error(`Editorial share card is missing ${contract}`);
}

for (const contract of ['Publication Settings', '刊物判断', '长期议题', '信源', '编辑部', '发布到 GitHub', '主编当前判断', '传播链']) {
  if (!governanceJs.includes(contract)) throw new Error(`Chief governance polish is missing ${contract}`);
}
for (const selector of ['.nf-governance-shell', '.nf-gov-tabs', '.nf-gov-editor', '.nf-gov-index', '.nf-gov-board-stats', '@media (max-width: 720px)']) {
  if (!governanceCss.includes(selector)) throw new Error(`Chief governance CSS is missing ${selector}`);
}
for (const privateArtifact of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json', 'ai_digest.json', 'editorial-mode.css']) {
  if (serviceWorker.includes(privateArtifact) || index.includes(privateArtifact) || loader.includes(privateArtifact)) throw new Error(`Reader artifact exposes retired/private state: ${privateArtifact}`);
}

const reactions = JSON.parse(reactionsText);
if (!Array.isArray(reactions.reject) || reactions.reject.length < 8) throw new Error('Reject needs a deep editorial emotion-feedback pool.');
for (const decision of ['cover_story', 'accept', 'minor_revision', 'major_revision', 'reject']) {
  if (!Array.isArray(reactions[decision]) || reactions[decision].length < 4) throw new Error(`Decision ${decision} needs at least four reaction lines.`);
}

const status = JSON.parse(statusText);
if (status.schema_version !== '1.0' || !status.updated_at || status.timezone !== 'Asia/Shanghai') throw new Error('data-status.json has an invalid contract.');
if (!Number.isInteger(status.signal_count) || status.signal_count < 1) throw new Error('data-status.json has no signal_count.');
const statusCheck = spawnSync(process.execPath, [resolve(root, 'scripts/update-data-status.mjs'), '--check'], { encoding: 'utf8' });
if (statusCheck.status !== 0) throw new Error(statusCheck.stderr || statusCheck.stdout);

console.log('NewsFlow product polish passed: issue-first Reader, canonical continuous reading, two-action cards, four-task mobile navigation, editorial sharing, permission-routed editorial dashboard and live freshness.');
