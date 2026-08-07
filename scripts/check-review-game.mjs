import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const required = [
  'public/review-game.js',
  'public/review-game.css',
  'public/editorial-office.js',
  'public/editorial-mode.css',
  'public/data/guest-editor-invites.json',
  'public/data/editorial-reactions.json'
];
for (const file of required) await access(resolve(root, file));

const [index, game, gameCss, mode, modeCss, sw, invitesText, reactionsText] = await Promise.all([
  read('index.html'),
  read('public/review-game.js'),
  read('public/review-game.css'),
  read('public/editorial-office.js'),
  read('public/editorial-mode.css'),
  read('public/sw.js'),
  read('public/data/guest-editor-invites.json'),
  read('public/data/editorial-reactions.json')
]);

for (const file of ['public/review-game.js', 'public/editorial-office.js', 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}

for (const asset of ['./editorial-mode.css?v=2.7.0', './review-game.css?v=2.7.0', './review-game.js?v=2.7.0', './editorial-office.js?v=2.7.0']) {
  if (!index.includes(asset)) throw new Error(`index is missing ${asset}`);
}
for (const retired of ['./guest-editor.js', './guest-editor.css', './editorial-delight.js', './editorial-delight.css', './editorial-game-loop.css', './editorial-preflight.css', './editorial-office.css']) {
  if (index.includes(retired) || sw.includes(retired)) throw new Error(`retired editor runtime still referenced: ${retired}`);
}

for (const contract of [
  "const FORMAL_STORAGE_KEY = 'newsflow_review_game_v4'",
  "const GUEST_STORAGE_PREFIX = 'newsflow_review_game_v4_guest'",
  "const openFormal = async () =>",
  "const openGuest = async",
  "const renderReview = () =>",
  "const renderDecisionBar = () =>",
  "const openSettlement = () =>",
  "window.NewsFlowReviewGame",
  "guest_editor_invite_open",
  "editor_review_game_open",
  "editor_review_decision",
  "newsflow:switch-role"
]) {
  if (!game.includes(contract)) throw new Error(`review game missing contract: ${contract}`);
}

for (const [id, key] of [
  ['cover_story', '1'],
  ['accept', '2'],
  ['minor_revision', '3'],
  ['major_revision', '4'],
  ['reject', '5']
]) {
  if (!game.includes(`id: '${id}'`) || !game.includes(`key: '${key}'`)) {
    throw new Error(`decision ${id} must use key ${key}`);
  }
}

if (game.includes('MutationObserver') || mode.includes('MutationObserver')) {
  throw new Error('editor mode must stay lifecycle-driven and may not use MutationObserver.');
}
if (mode.includes("id: 'accept'") || mode.includes('renderDesk') || mode.includes('officeTab')) {
  throw new Error('mode controller must not own a second review implementation.');
}
for (const contract of [
  "const ROLE_STORAGE_KEY = 'newsflow_role_v2'",
  "roleCard('reader'",
  "roleCard('editor'",
  '一屏一稿 · 五档裁决 · 立即反馈。',
  'window.NewsFlowReviewGame?.openFormal?.()',
  "window.addEventListener('newsflow:switch-role'"
]) {
  if (!mode.includes(contract)) throw new Error(`mode controller missing contract: ${contract}`);
}

for (const selector of [
  '.nf-review-stack',
  '.nf-review-card',
  '.nf-review-decision-bar',
  'grid-template-columns: repeat(5',
  '.nf-review-stamp',
  '.nf-settlement-row',
  '@media (max-width: 760px)',
  '@media (prefers-reduced-motion: reduce)'
]) {
  if (!gameCss.includes(selector)) throw new Error(`review game CSS missing ${selector}`);
}
for (const selector of ['.nf-mode-trigger', '.nf-mode-dialog', '.nf-mode-grid', '@media (max-width: 720px)']) {
  if (!modeCss.includes(selector)) throw new Error(`mode CSS missing ${selector}`);
}

for (const asset of ['./review-game.js', './review-game.css', './editorial-office.js', './editorial-mode.css', './data/guest-editor-invites.json', './data/editorial-reactions.json']) {
  if (!sw.includes(asset)) throw new Error(`service worker missing ${asset}`);
}
if (!sw.includes("const ASSET_VERSION = '2.7.0'") || !sw.includes('reader-editor-modes')) {
  throw new Error('service worker cache version must advance for the mode architecture release.');
}

const invites = JSON.parse(invitesText);
if (!Array.isArray(invites.invites) || !invites.invites.some((invite) => invite.id === 'frontier-systems-review')) {
  throw new Error('reference guest editor invitation is missing.');
}
const reactions = JSON.parse(reactionsText);
for (const decision of ['cover_story', 'accept', 'minor_revision', 'major_revision', 'reject']) {
  if (!Array.isArray(reactions[decision]) || reactions[decision].length < 4) {
    throw new Error(`reaction library is too shallow for ${decision}.`);
  }
}

console.log('NewsFlow review game contract passed: reader website, editor game, one shared five-decision engine and post-game settlement.');
