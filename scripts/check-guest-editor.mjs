import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const [index, guestSource, guestCss, inviteText, reactionText, serviceWorker] = await Promise.all([
  read('index.html'),
  read('public/guest-editor.js'),
  read('public/guest-editor.css'),
  read('public/data/guest-editor-invites.json'),
  read('public/data/editorial-reactions.json'),
  read('public/sw.js')
]);

for (const asset of ['./guest-editor.css?v=2.6.1', './guest-editor.js?v=2.6.1']) {
  if (!index.includes(asset)) throw new Error(`index.html is missing Guest Editor asset ${asset}`);
}
for (const asset of ['./guest-editor.css', './guest-editor.js', './data/guest-editor-invites.json', './data/editorial-reactions.json']) {
  if (!serviceWorker.includes(asset)) throw new Error(`service worker is missing Guest Editor asset ${asset}`);
}

const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'public/guest-editor.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`guest-editor.js syntax failed:\n${syntax.stderr}`);

if (guestSource.includes('MutationObserver')) throw new Error('Guest Editor must use explicit NewsFlow lifecycle events, not MutationObserver.');
if (guestSource.includes('service_role') || guestSource.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('Guest Editor invitation flow must never reference privileged credentials.');
}

for (const contract of [
  "const QUERY_PARAM = 'guest-editor'",
  "window.addEventListener('newsflow:rendered', mountInviteTrigger)",
  "window.addEventListener('newsflow:editorial-rendered', mountInviteTrigger)",
  "guest_editor_invite_open",
  "guest_editor_appointment_accept",
  "guest_editor_decision",
  "guest_editor_complete",
  "newsflow_guest_editor_v1",
  "exercise_fallback",
  "BLIND EDITORIAL EXERCISE",
  "data-guest-action=\"decision\"",
  "DECISIONS"
]) {
  if (!guestSource.includes(contract)) throw new Error(`Guest Editor runtime is missing contract: ${contract}`);
}

for (const [id, key] of [
  ['cover_story', '1'],
  ['accept', '2'],
  ['minor_revision', '3'],
  ['major_revision', '4'],
  ['reject', '5']
]) {
  if (!guestSource.includes(`id: '${id}'`) || !guestSource.includes(`key: '${key}'`)) {
    throw new Error(`Guest Editor decision ${id} must be bound to key ${key}.`);
  }
}

for (const contract of [
  '.nf-guest-decision-bar',
  'grid-template-columns: repeat(5',
  '.nf-guest-stamp',
  '@media (max-width: 760px)',
  '@media (prefers-reduced-motion: reduce)',
  'min-height: 44px'
]) {
  if (!guestCss.includes(contract)) throw new Error(`Guest Editor CSS is missing contract: ${contract}`);
}

const inviteRegistry = JSON.parse(inviteText);
if (inviteRegistry.schema_version !== '1.0' || !Array.isArray(inviteRegistry.invites) || !inviteRegistry.invites.length) {
  throw new Error('Guest Editor invitation registry is invalid.');
}
const referenceInvite = inviteRegistry.invites.find((invite) => invite.id === 'frontier-systems-review');
if (!referenceInvite || referenceInvite.edition_id !== 'frontier-systems-review' || referenceInvite.packet_size < 5) {
  throw new Error('Reference Guest Editor invitation is missing or too small.');
}
if (referenceInvite.exercise_fallback !== true) throw new Error('Reference invite must remain playable when the live review queue is sparse.');

const reactions = JSON.parse(reactionText);
for (const decision of ['cover_story', 'accept', 'minor_revision', 'major_revision', 'reject']) {
  if (!Array.isArray(reactions[decision]) || reactions[decision].length < 4) {
    throw new Error(`Guest Editor reaction library needs at least four lines for ${decision}.`);
  }
}
if (reactions.reject.length < 8) throw new Error('Reject needs a deeper emotion-feedback pool.');

console.log(`NewsFlow Guest Editor contract passed: five decisions, ${referenceInvite.packet_size}-manuscript appointment, invitation sharing, serious-play reactions and local-only guest authority.`);
