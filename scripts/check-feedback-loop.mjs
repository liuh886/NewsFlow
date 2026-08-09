import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const migration = await read('supabase/migrations/20260809040109_close_feedback_loop_free_plan.sql');
const rankingMigration = await read('supabase/migrations/20260809045304_editorial_ranking_loop.sql');
const distinctAudienceMigration = await read('supabase/migrations/20260809052408_reader_consensus_distinct_audience.sql');
const client = await read('src/supabase-feedback.js');
const app = await read('src/editorial-app.js');
const editionLayer = await read('src/edition-layer.js');
const policy = JSON.parse(await read('config/recommendation-policy.json'));
const publicConfig = JSON.parse(await read('public/data/supabase-config.json'));

for (const contract of [
  'drop table if exists public.reader_profiles',
  'drop table if exists public.signal_catalog cascade',
  'signal_feedback_non_neutral',
  'existing_rows >= 256',
  'security definer',
  "set search_path = ''",
  'enable row level security'
]) {
  const combined = `${await read('supabase/migrations/20260803232713_create_newsflow_feedback.sql')}\n${migration}`;
  if (!combined.toLowerCase().includes(contract.toLowerCase())) throw new Error(`Feedback SQL missing contract: ${contract}`);
}
for (const contract of ['neutralRow', ".from('signal_feedback')", "newsflow:remote-feedback", 'ignoreDuplicates: false']) {
  if (!client.includes(contract)) throw new Error(`Feedback client missing contract: ${contract}`);
}
for (const contract of ['personalizationReady', '按你的反馈排序', 'localPreferenceScore']) {
  if (!app.includes(contract)) throw new Error(`Reader recommendation loop missing contract: ${contract}`);
}
for (const contract of [
  'newsflow_editorial_consensus', 'newsflow_editorial_events', 'newsflow_editorial_withdrawals',
  'newsflow_refresh_reader_ranking', 'reader_minimum', 'audience_count >= 3',
  'newsflow_withdraw_candidate', 'newsflow_restore_withdrawn_candidate',
  "set search_path = ''", 'enable row level security'
]) if (!rankingMigration.includes(contract)) throw new Error(`Editorial ranking SQL missing contract: ${contract}`);
for (const contract of ['latest_reader_stance', 'distinct on (f.user_id)', 'f.updated_at desc']) {
  if (!distinctAudienceMigration.includes(contract)) throw new Error(`Reader consensus SQL missing contract: ${contract}`);
}
for (const contract of ["count.textContent?.includes('按你的反馈排序')", 'editionSortLabel']) {
  if (!editionLayer.includes(contract)) throw new Error(`Edition layer overwrites adaptive ranking contract: ${contract}`);
}
if (policy.cloud_sync.mode !== 'current_state_upsert' || policy.cloud_sync.maximum_rows_per_reader !== 256) {
  throw new Error('Recommendation policy must bound cloud current-state storage to 256 rows per reader.');
}
if (policy.cloud_sync.sync_realtime !== false || policy.cloud_sync.upload_exposure_events !== false || policy.cloud_sync.store_server_profiles !== false) {
  throw new Error('Free-plan feedback must not use Realtime, exposure analytics or server-side profiles.');
}
if (!(policy.ranking.chief_cover_boost > policy.ranking.editor_consensus_boost_max
  && policy.ranking.editor_consensus_boost_max > policy.ranking.reader_consensus_boost_max
  && policy.ranking.reader_consensus_boost_max >= policy.ranking.preference_boost_max)) {
  throw new Error('Ranking authority must remain chief > editors > readers, with personal preference no stronger than the bounded reader layer.');
}
if (policy.ranking.reader_consensus_minimum !== 3 || !app.includes('按编辑重要性排序') || !app.includes('globalRankingScore')) {
  throw new Error('Reader ranking must consume the qualified, low-priority editorial projection.');
}
if (publicConfig.enabled !== false || publicConfig.url !== '' || publicConfig.publishable_key !== '') {
  throw new Error('Committed public Supabase config must remain credential-free.');
}
const pullCheck = spawnSync(process.execPath, [
  resolve(root, 'scripts/pull-feedback.mjs'),
  '--input=tests/fixtures/supabase-feedback-rows.json'
], { cwd: root, encoding: 'utf8' });
if (pullCheck.status !== 0) throw new Error(pullCheck.stderr || pullCheck.stdout);
const pulled = JSON.parse(pullCheck.stdout);
if (pulled.row_count !== 3 || pulled.event_count !== 5 || pulled.contains_user_identifiers !== false) {
  throw new Error('Private feedback pull must produce the bounded anonymous event bridge.');
}
if (JSON.stringify(pulled.events).includes('user_id')) throw new Error('Feedback Agent bridge must not expose user identifiers.');
try {
  await access(resolve(root, '.github/workflows/review-pipeline.yml'));
  throw new Error('Retired review-pipeline workflow must be removed.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log('NewsFlow feedback loop contract passed: bounded current state, owner-only RLS, local-first ranking and no server profile.');
