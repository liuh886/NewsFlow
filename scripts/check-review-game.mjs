import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const required = [
  'public/review-game.js', 'public/review-game.css', 'public/review-stamp.css', 'public/editorial-office.js',
  'public/editorial-loader.js', 'public/data/editorial-reactions.json'
];
for (const file of required) await access(resolve(root, file));

const [index, loader, game, gameCss, stampCss, office, sw, reactionsText] = await Promise.all([
  read('index.html'), read('public/editorial-loader.js'), read('public/review-game.js'), read('public/review-game.css'), read('public/review-stamp.css'),
  read('public/editorial-office.js'), read('public/sw.js'), read('public/data/editorial-reactions.json')
]);
for (const file of ['public/editorial-loader.js', 'public/review-game.js', 'public/editorial-office.js', 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}

if (!index.includes('./editorial-loader.js?v=__NEWSFLOW_VERSION__')) throw new Error('index must load the small editorial runtime loader.');
for (const eagerAsset of ['./review-game.css', './review-stamp.css', './review-game.js', './editorial-office.js']) {
  if (index.includes(eagerAsset)) throw new Error(`Reader must not eagerly load editor-only asset: ${eagerAsset}`);
  if (!loader.includes(eagerAsset)) throw new Error(`editorial-loader is missing ${eagerAsset}`);
}
if (index.includes('./editorial-mode.css') || loader.includes('./editorial-mode.css')) throw new Error('Retired identity-choice UI must stay deleted.');
for (const retired of ['guest-editor', 'review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json', 'newsflow_review_game_v4_guest']) {
  if (index.includes(retired) || sw.includes(retired) || game.includes(retired)) throw new Error(`retired/public editorial path still referenced: ${retired}`);
}

for (const contract of [
  'const REACTION_HOLD_MS = 3000', 'const openFormal = async', 'const openOverview = async', 'const renderOverview = () =>', 'const renderReview = () =>', 'const renderDecisionBar = (disabled = false) =>',
  "from('newsflow_candidates')", "from('newsflow_editorial_reviews')", "onConflict: 'candidate_id,reviewer_user_id'",
  "state.editorialRole === 'editor_in_chief'", 'opinionCounts', '尚无其他编辑完成本稿评议',
  'countdown: 3', 'nf-review-countdown', 'window.setTimeout(advance, REACTION_HOLD_MS)',
  'window.NewsFlowReviewGame', 'editor_review_game_open', 'editor_review_decision', 'newsflow:switch-role',
  "from('newsflow_editorial_consensus')", "from('newsflow_editorial_withdrawals')", "from('newsflow_editorial_events')",
  "client.rpc('newsflow_withdraw_candidate'", "client.rpc('newsflow_restore_withdrawn_candidate'",
  '决定档案', '退稿库', '编辑部总览', '信号与处理状态', 'editorial_boost', 'reader_boost',
  "event.key === 'ArrowLeft'", "event.key === 'ArrowRight'", "event.key === 'ArrowUp'", "event.key === 'ArrowDown'",
  "event.key === 'Enter'", 'renderShortcutGuide', 'is-keyboard-selected', '切换稿件', '确认当前裁决',
  'ownReviewFor(candidate.id)', 'nf-review-persistent-decision', 'EDITORIAL DECISION RECORDED', '主编已裁决'
]) if (!game.includes(contract)) throw new Error(`review game missing contract: ${contract}`);
if (game.includes('localStorage') || game.includes('saveProductData') || game.includes('FORMAL_STORAGE_KEY')) {
  throw new Error('Review decisions must live only in normalized Supabase review rows.');
}
if (game.includes('openSettlement') || game.includes('closeIssue') || game.includes('issueDraft')) throw new Error('Retired local Issue settlement must not return.');
for (const [id, key] of [['cover_story','1'],['accept','2'],['minor_revision','3'],['major_revision','4'],['reject','5']]) {
  if (!game.includes(`id: '${id}'`) || !game.includes(`key: '${key}'`)) throw new Error(`decision ${id} must use key ${key}`);
}

if (game.includes('MutationObserver') || office.includes('MutationObserver')) throw new Error('editorial runtime must stay lifecycle-driven and may not use MutationObserver.');
for (const contract of [
  "const INVITE_PARAM = 'editor-invite'", "from('newsflow_editorial_members')", "from('newsflow_editorial_invitations')", "role: 'editor'",
  "window.HaoAccount?.can?.('newsflow.pro')", 'isEditorialMember', 'openEditorialOverview', 'window.HaoAccount?.open?.()',
  'window.NewsFlowReviewGame?.openOverview?.()', '开通 Newsflow Pro，进入编辑部', 'createEditorInvite', 'openGovernance',
  'syncEditorialEntry', '[data-action="open-editorial-office"]', 'window.NewsFlowMode', 'window.HaoAccount?.refresh?.()'
]) if (!office.includes(contract)) throw new Error(`editorial permission router missing contract: ${contract}`);
for (const retired of ['MODE_STORAGE_KEY', 'newsflow_mode_v3', 'roleCard(', 'nf-mode-dialog', 'renderDialog', 'syncModePreference', '你以什么身份进入编辑部？']) {
  if (office.includes(retired) || loader.includes(retired)) throw new Error(`retired role-choice architecture returned: ${retired}`);
}
if (!loader.includes("launcher.style.display = 'inline-flex'") || !loader.includes("label.textContent = '编辑部'") || loader.includes('cachedMode') || loader.includes('localStorage')) {
  throw new Error('Editorial loader must expose one neutral 编辑部 entry without cached role modes.');
}
for (const contract of ['NEWSFLOW_EDITOR_ACCESS_REQUIRED', 'newsflow_pro_upgrade_prompt', 'data-review-action="upgrade-pro"', '开通 Newsflow Pro']) {
  if (!game.includes(contract)) throw new Error(`review access conversion missing contract: ${contract}`);
}

for (const selector of [
  '.nf-review-stack', '.nf-review-card', '.nf-review-decision-bar', 'grid-template-columns: repeat(5',
  '.nf-review-stamp', '.nf-review-countdown', 'zoom: 0.8', 'overflow: hidden',
  '.nf-review-tabs', '.nf-review-archive-card', '.nf-review-archive-workspace', '.nf-review-overview-card', '.nf-review-overview-stats', '.nf-review-withdrawal-dialog', '.nf-review-shortcut-guide',
  '@media (min-width: 761px)', '@media (max-width: 760px)', '@media (prefers-reduced-motion: reduce)'
]) if (!gameCss.includes(selector)) throw new Error(`review game CSS missing ${selector}`);
if (gameCss.includes('.nf-settlement')) throw new Error('Retired local Issue settlement CSS must be deleted.');
for (const selector of [
  '.nf-review-persistent-decision', '.nf-review-stamp.is-persistent', 'mix-blend-mode: multiply',
  '@media (max-width: 760px)', '@media (prefers-reduced-motion: reduce)'
]) if (!stampCss.includes(selector)) throw new Error(`persistent review stamp CSS missing ${selector}`);

if (!sw.includes("versioned('./editorial-loader.js')")) throw new Error('service worker must cache the small editorial loader.');
for (const editorAsset of ["versioned('./review-game.js')", "versioned('./review-game.css')", "versioned('./review-stamp.css')", "versioned('./editorial-office.js')"]) {
  if (sw.includes(editorAsset)) throw new Error(`Reader app shell must not precache editor-only asset: ${editorAsset}`);
}
for (const forbidden of ['./data/review-candidates.json', './data/pipeline-reviews.json', './data/guest-editor-invites.json']) if (sw.includes(forbidden)) throw new Error(`service worker must not cache private editorial data: ${forbidden}`);
if (!sw.includes("const ASSET_VERSION = '__NEWSFLOW_VERSION__'")) throw new Error('service worker version must come from package.json at build time.');

const reactions = JSON.parse(reactionsText);
for (const decision of ['cover_story', 'accept', 'minor_revision', 'major_revision', 'reject']) {
  if (!Array.isArray(reactions[decision]) || reactions[decision].length < 4) throw new Error(`reaction library is too shallow for ${decision}.`);
}
console.log('NewsFlow review game contract passed: lazy editor runtime, direct permission-routed dashboard entry, Pro conversion, durable Supabase-backed decision stamps, advisory reviews and chief-only authority.');