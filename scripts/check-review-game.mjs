import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const required = [
  'public/review-game.js', 'public/review-game.css', 'public/editorial-office.js',
  'public/editorial-mode.css', 'public/editorial-loader.js', 'public/data/editorial-reactions.json'
];
for (const file of required) await access(resolve(root, file));

const [index, loader, game, gameCss, mode, modeCss, sw, reactionsText] = await Promise.all([
  read('index.html'), read('public/editorial-loader.js'), read('public/review-game.js'), read('public/review-game.css'),
  read('public/editorial-office.js'), read('public/editorial-mode.css'), read('public/sw.js'),
  read('public/data/editorial-reactions.json')
]);
for (const file of ['public/editorial-loader.js', 'public/review-game.js', 'public/editorial-office.js', 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}

if (!index.includes('./editorial-loader.js?v=__NEWSFLOW_VERSION__')) throw new Error('index must load the small editorial runtime loader.');
for (const eagerAsset of ['./editorial-mode.css', './review-game.css', './review-game.js', './editorial-office.js']) {
  if (index.includes(eagerAsset)) throw new Error(`Reader must not eagerly load editor-only asset: ${eagerAsset}`);
  if (!loader.includes(eagerAsset)) throw new Error(`editorial-loader is missing ${eagerAsset}`);
}
for (const retired of ['guest-editor', 'review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json', 'newsflow_review_game_v4_guest']) {
  if (index.includes(retired) || sw.includes(retired) || game.includes(retired)) throw new Error(`retired/public editorial path still referenced: ${retired}`);
}

for (const contract of [
  'const REACTION_HOLD_MS = 3000', 'const openFormal = async', 'const renderReview = () =>', 'const renderDecisionBar = () =>',
  "from('newsflow_candidates')", "from('newsflow_editorial_reviews')", "onConflict: 'candidate_id,reviewer_user_id'",
  "state.editorialRole === 'editor_in_chief'", 'opinionCounts', '尚无其他编辑完成本稿评议',
  'countdown: 3', 'nf-review-countdown', 'window.setTimeout(advance, REACTION_HOLD_MS)',
  'window.NewsFlowReviewGame', 'editor_review_game_open', 'editor_review_decision', 'newsflow:switch-role'
]) if (!game.includes(contract)) throw new Error(`review game missing contract: ${contract}`);
if (game.includes('localStorage') || game.includes('saveProductData') || game.includes('FORMAL_STORAGE_KEY')) {
  throw new Error('Review decisions must live only in normalized Supabase review rows.');
}
if (game.includes('openSettlement') || game.includes('closeIssue') || game.includes('issueDraft')) throw new Error('Retired local Issue settlement must not return.');
for (const [id, key] of [['cover_story','1'],['accept','2'],['minor_revision','3'],['major_revision','4'],['reject','5']]) {
  if (!game.includes(`id: '${id}'`) || !game.includes(`key: '${key}'`)) throw new Error(`decision ${id} must use key ${key}`);
}

if (game.includes('MutationObserver') || mode.includes('MutationObserver')) throw new Error('editor mode must stay lifecycle-driven and may not use MutationObserver.');
if (mode.includes("id: 'accept'") || mode.includes('renderDesk') || mode.includes('officeTab')) throw new Error('mode controller must not own a second review implementation.');
for (const contract of [
  "const MODE_STORAGE_KEY = 'newsflow_mode_v3'", "const INVITE_PARAM = 'editor-invite'",
  "from('newsflow_editorial_members')", "from('newsflow_editorial_invitations')", "role: 'editor'",
  "roleCard('reader'", "roleCard('editor'", '编辑模式需要主编任命',
  'window.NewsFlowReviewGame?.isOpen?.()', 'window.NewsFlowReviewGame?.openFormal?.()', 'createEditorInvite', 'openGovernance', 'window.NewsFlowMode'
]) if (!mode.includes(contract)) throw new Error(`mode controller missing contract: ${contract}`);
if (mode.includes('syncFormalEditorialState') || mode.includes('FORMAL_STORAGE_KEY')) throw new Error('Mode controller must not persist a second editorial decision store.');
if (mode.includes("void syncModePreference('editor')") || mode.includes('window.setTimeout(openEditorGame')) {
  throw new Error('Account preference updates must never recursively reopen the Review Game.');
}

for (const selector of [
  '.nf-review-stack', '.nf-review-card', '.nf-review-decision-bar', 'grid-template-columns: repeat(5',
  '.nf-review-stamp', '.nf-review-countdown', 'zoom: 0.8', 'overflow: hidden',
  '@media (min-width: 761px)', '@media (max-width: 760px)', '@media (prefers-reduced-motion: reduce)'
]) if (!gameCss.includes(selector)) throw new Error(`review game CSS missing ${selector}`);
if (gameCss.includes('.nf-settlement')) throw new Error('Retired local Issue settlement CSS must be deleted.');
for (const selector of ['.nf-mode-trigger', '.nf-mode-dialog', '.nf-mode-grid', '@media (max-width: 720px)']) if (!modeCss.includes(selector)) throw new Error(`mode CSS missing ${selector}`);

if (!sw.includes("versioned('./editorial-loader.js')")) throw new Error('service worker must cache the small editorial loader.');
for (const editorAsset of ["versioned('./review-game.js')", "versioned('./review-game.css')", "versioned('./editorial-office.js')", "versioned('./editorial-mode.css')"]) {
  if (sw.includes(editorAsset)) throw new Error(`Reader app shell must not precache editor-only asset: ${editorAsset}`);
}
for (const forbidden of ['./data/review-candidates.json', './data/pipeline-reviews.json', './data/guest-editor-invites.json']) if (sw.includes(forbidden)) throw new Error(`service worker must not cache private editorial data: ${forbidden}`);
if (!sw.includes("const ASSET_VERSION = '__NEWSFLOW_VERSION__'")) throw new Error('service worker version must come from package.json at build time.');

const reactions = JSON.parse(reactionsText);
for (const decision of ['cover_story', 'accept', 'minor_revision', 'major_revision', 'reject']) {
  if (!Array.isArray(reactions[decision]) || reactions[decision].length < 4) throw new Error(`reaction library is too shallow for ${decision}.`);
}
console.log('NewsFlow review game contract passed: lazy editor runtime, permanent membership, advisory reviews, chief-only authority and three-second five-state review.');
