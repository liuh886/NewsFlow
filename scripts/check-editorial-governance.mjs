import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
for (const file of [
  'public/editorial-governance.js', 'public/editorial-governance.css',
  'scripts/sync-editorial-governance.mjs', 'scripts/sync-adopted-signals.mjs',
  'content/state/governance-sync.json', 'content/state/adoption-sync.json',
  'public/data/governance-status.json'
]) await access(resolve(root, file));

const [index, governance, css, game, mode, build, sw, governanceSync, adoptionSync, sql] = await Promise.all([
  read('index.html'), read('public/editorial-governance.js'), read('public/editorial-governance.css'),
  read('public/review-game.js'), read('public/editorial-office.js'), read('scripts/build.mjs'), read('public/sw.js'),
  read('scripts/sync-editorial-governance.mjs'), read('scripts/sync-adopted-signals.mjs'), read('supabase/newsflow-editorial.sql')
]);
for (const file of ['public/editorial-governance.js', 'scripts/sync-editorial-governance.mjs', 'scripts/sync-adopted-signals.mjs']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}
for (const asset of ['./editorial-governance.css?v=2.8.0', './editorial-governance.js?v=2.8.0']) if (!index.includes(asset)) throw new Error(`index is missing ${asset}`);

for (const contract of [
  "{ id: 'edition', label: '刊物判断'", "{ id: 'storyline', label: '长期议题'", "{ id: 'source', label: '信源'", "{ id: 'editorial', label: '编辑部'",
  "from('newsflow_governance_drafts')", "from('newsflow_editorial_members')", "from('newsflow_editorial_invitations')",
  "status: 'draft'", "status: 'published'", '发布到 GitHub', 'source-registry.json', 'governance-status.json',
  '主编当前判断', '反证条件', 'Allowed uses', 'Limitations', '任命编辑', 'window.NewsFlowGovernance'
]) if (!governance.includes(contract)) throw new Error(`governance UI missing contract: ${contract}`);
if (governance.includes('service_role') || governance.includes('github_token') || governance.includes('GITHUB_TOKEN')) throw new Error('browser governance UI must never contain privileged credentials.');

for (const selector of [
  '.nf-governance-shell', '.nf-gov-tabs', '.nf-gov-split', '.nf-gov-index', '.nf-gov-editor', '.nf-gov-field',
  '.nf-gov-board-stats', '.nf-review-opinions', '@media (max-width: 900px)', '@media (max-width: 720px)'
]) if (!css.includes(selector)) throw new Error(`governance CSS missing ${selector}`);

for (const contract of ["state.editorialRole === 'editor_in_chief'", 'opinionCounts', '尚无其他编辑完成本稿评议']) if (!game.includes(contract)) throw new Error(`chief review view missing ${contract}`);
for (const contract of ["from('newsflow_editorial_members')", "const INVITE_PARAM = 'editor-invite'", 'createEditorInvite', 'openGovernance']) if (!mode.includes(contract)) throw new Error(`mode authority missing ${contract}`);

for (const forbidden of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json']) {
  if (build.includes(forbidden) || sw.includes(forbidden)) throw new Error(`Reader bundle exposes private editorial data: ${forbidden}`);
}
for (const publicAsset of ['source-registry.json', 'governance-status.json', 'editorial-governance.js', 'editorial-governance.css']) if (!sw.includes(publicAsset)) throw new Error(`PWA governance asset missing ${publicAsset}`);

for (const contract of [
  'newsflow_governance_publications', 'public/data/edition.json', 'public/data/storylines.json',
  'config/content-sources.json', 'config/content-discovery.json', 'syncDiscoveryRouting', 'plan.source_ids',
  'applied_publication_ids'
]) if (!governanceSync.includes(contract)) throw new Error(`GitHub governance compiler missing ${contract}`);
for (const contract of [
  "from('newsflow_editorial_adoptions')", "from('newsflow_candidates')", 'managed_signal_ids',
  'issueSignalIds', 'allowedPublicIds', "editorial_status: 'adopted'", 'non-authoritative public Signal(s) removed', 'unregistered source'
]) if (!adoptionSync.includes(contract)) throw new Error(`adoption compiler missing ${contract}`);

for (const contract of [
  'newsflow_editorial_members', 'newsflow_editorial_reviews', 'newsflow_candidates', 'payload jsonb',
  'newsflow_governance_drafts', 'newsflow_governance_publications', 'newsflow_sync_chief_adoption'
]) if (!sql.includes(contract)) throw new Error(`Supabase governance schema missing ${contract}`);
if (!sql.includes("role = 'owner'")) throw new Error('Only the shared owner may be Editor-in-Chief publication authority.');

console.log('NewsFlow editorial governance contract passed: chief-only publication/governance, governed source discovery routing, advisory Editors and authoritative-only Reader Signals.');