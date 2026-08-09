import { access, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));

const requiredFiles = [
  'index.html', 'src/editorial-app.js', 'src/edition-layer.js', 'src/supabase-feedback.js',
  'public/startup-resilience.js', 'public/magazine-polish.js', 'public/reading-surface.js',
  'public/editorial-office.js', 'public/review-game.js', 'public/editorial-governance.js', 'public/sw.js',
  'public/manifest.webmanifest', 'public/data/news.json', 'public/data/topics.json', 'public/data/edition.json',
  'public/data/issues.json', 'public/data/storylines.json', 'public/data/data-status.json',
  'public/data/governance-status.json', 'public/data/editorial-reactions.json', 'public/data/supabase-config.json',
  'scripts/build.mjs', 'scripts/update-content.mjs', 'scripts/apply-content.mjs', 'scripts/sync-live-issue.mjs',
  'scripts/sync-adopted-signals.mjs', 'scripts/sync-editorial-governance.mjs', 'scripts/update-data-status.mjs',
  'scripts/pull-feedback.mjs', 'scripts/check-feedback-loop.mjs',
  'schemas/content-candidate-pack.schema.json', 'config/content-workflow.json', 'config/content-sources.json',
  'config/content-discovery.json', 'content/state/adoption-sync.json', 'content/state/governance-sync.json',
  'supabase/newsflow-editorial.sql', 'supabase/newsflow-publication-projection.sql',
  'supabase/migrations/20260809040109_close_feedback_loop_free_plan.sql', 'supabase/tests/feedback_rls_test.sql',
  'supabase/migrations/20260809061409_newsflow_editor_invite_grants_pro.sql',
  'supabase/migrations/20260809062526_newsflow_private_pro_editor_access.sql',
  'supabase/migrations/20260809062717_newsflow_pro_editor_role_visibility.sql',
  'supabase/migrations/20260809063350_pro_editor_access.sql',
  'supabase/migrations/20260809071339_restore_editor_access_function_execute.sql',
  'supabase/tests/feedback_rls_assertions.sql',
  '.github/workflows/pages.yml', '.github/workflows/publication-sync.yml',
  'WORKFLOW.md', 'DESIGN.md', 'README.md'
];
for (const file of requiredFiles) await access(resolve(root, file));

const retiredFiles = [
  'public/data/ai_digest.json', 'public/data/review-candidates.json', 'public/data/pipeline-reviews.json',
  'public/data/guest-editor-invites.json', 'content/state/pipeline-review-queue.json', 'scripts/sync-supabase.mjs',
  '.github/workflows/supabase-sync.yml', 'scripts/aggregate-pipeline-reviews.mjs',
  'scripts/sync-supabase-catalog.mjs', 'editions/reference/edition.yaml',
  'scripts/publish-edition.mjs', '.github/workflows/publish-edition.yml', '.github/workflows/editorial-sync.yml',
  '.github/workflows/review-pipeline.yml'
];
for (const file of retiredFiles) {
  try {
    await access(resolve(root, file));
    throw new Error(`Retired architecture artifact must be deleted: ${file}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const trackedInbox = spawnSync('git', ['ls-files', 'content/inbox'], { cwd: root, encoding: 'utf8' });
if (trackedInbox.status !== 0) throw new Error(trackedInbox.stderr || 'Unable to inspect tracked Candidate packs.');
if (trackedInbox.stdout.trim()) throw new Error(`Private Candidate packs must not be Git-tracked:\n${trackedInbox.stdout}`);

const syntaxFiles = [
  'src/editorial-app.js', 'src/edition-layer.js', 'src/supabase-feedback.js', 'public/startup-resilience.js',
  'public/magazine-polish.js', 'public/reading-surface.js', 'public/editorial-office.js', 'public/review-game.js',
  'public/editorial-governance.js', 'public/sw.js', 'scripts/build.mjs', 'scripts/update-content.mjs',
  'scripts/apply-content.mjs', 'scripts/sync-live-issue.mjs', 'scripts/sync-adopted-signals.mjs',
  'scripts/sync-editorial-governance.mjs', 'scripts/update-data-status.mjs', 'scripts/pull-feedback.mjs',
  'scripts/check-feedback-loop.mjs'
];
for (const file of syntaxFiles) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}

const [news, topics, edition, issues, storylines, manifest, supabaseConfig, packageManifest, adoptionState, governanceState, workflowConfig] = await Promise.all([
  readJson('public/data/news.json'), readJson('public/data/topics.json'), readJson('public/data/edition.json'),
  readJson('public/data/issues.json'), readJson('public/data/storylines.json'), readJson('public/manifest.webmanifest'),
  readJson('public/data/supabase-config.json'), readJson('package.json'), readJson('content/state/adoption-sync.json'),
  readJson('content/state/governance-sync.json'), readJson('config/content-workflow.json')
]);
if (!Array.isArray(news) || news.length < 5) throw new Error('news.json must contain the authoritative public Signal set.');
if (!Array.isArray(topics) || topics.length < 3) throw new Error('topics.json must contain the core channels.');
if (!edition?.id || edition.language !== 'zh-CN' || !Array.isArray(edition.storylines)) throw new Error('edition.json must be the canonical Chinese Edition.');
if (!Array.isArray(issues) || !Array.isArray(storylines)) throw new Error('issues.json and storylines.json must be arrays.');
if (!manifest.name || !manifest.id || manifest.lang !== 'zh-CN' || !Array.isArray(manifest.icons)) throw new Error('manifest.webmanifest is incomplete.');
if (adoptionState.schema_version !== '1.0' || !Array.isArray(adoptionState.managed_signal_ids)) throw new Error('adoption sync state is invalid.');
if (governanceState.schema_version !== '1.0' || !Array.isArray(governanceState.applied_publication_ids)) throw new Error('governance sync state is invalid.');
if (workflowConfig.private_candidate_store !== 'supabase:public.newsflow_candidates' || workflowConfig.public_audit_excludes_candidate_content !== true) throw new Error('Content workflow must keep Candidate manuscripts private.');
if ((workflowConfig.apply_writes || []).some((value) => String(value).includes('public/data/news.json'))) throw new Error('Collection apply must never write Reader publication data.');

if (supabaseConfig.schema_version !== '1.0' || supabaseConfig.enabled !== false || supabaseConfig.url !== '' || supabaseConfig.publishable_key !== '') throw new Error('Committed Supabase config must remain credential-free.');
if (packageManifest.dependencies?.['@supabase/supabase-js'] !== '2.112.0'
  || packageManifest.devDependencies?.supabase !== '2.111.0'
  || packageManifest.devDependencies?.esbuild !== '0.28.1') throw new Error('Pinned runtime/toolchain dependencies changed unexpectedly.');
if (!packageManifest.scripts?.['editorial:sync'] || !packageManifest.scripts?.['content:update'] || !packageManifest.scripts?.['issue:sync']
  || !packageManifest.scripts?.['feedback:refresh'] || !packageManifest.scripts?.['feedback:rank']) throw new Error('Core editorial or recommendation scripts are missing.');
if (packageManifest.scripts?.['publish:edition'] || packageManifest.scripts?.['publish:edition:dry-run']) throw new Error('Retired frozen-edition publisher scripts must not return.');
if (packageManifest.scripts?.['supabase:sync']) throw new Error('Repository-to-Supabase Candidate synchronization must not return.');

const appSource = await read('src/editorial-app.js');
for (const required of ["loadJson('./data/news.json')", "new CustomEvent('newsflow:rendered')", 'AbortSignal.timeout(5000)', '按时间排序']) {
  if (!appSource.includes(required)) throw new Error(`Reader app missing publication contract: ${required}`);
}
for (const forbidden of ['verifiedFallbackItems', './data/ai_digest.json', '信号评分', '高置信度', '评分 ${getQuality']) {
  if (appSource.includes(forbidden)) throw new Error(`Reader exposes non-authoritative/editorial-only state: ${forbidden}`);
}

const contentContract = spawnSync(process.execPath, [resolve(root, 'scripts/update-content.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
if (contentContract.status !== 0) throw new Error(`content evaluator contract failed:\n${contentContract.stderr || contentContract.stdout}`);
const evaluatorSource = await read('scripts/update-content.mjs');
if (evaluatorSource.includes("writeFile(resolve(root, 'public/data/news.json')") || !evaluatorSource.includes('Direct evaluator apply is retired')) throw new Error('Content evaluator must remain read-only.');
const applySource = await read('scripts/apply-content.mjs');
for (const required of ["from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY', "editorial_effect: 'supabase_private_candidates_only'"]) {
  if (!applySource.includes(required)) throw new Error(`Candidate apply missing private-store contract: ${required}`);
}
for (const forbidden of ['public/data/news.json', 'pipeline-review-queue.json']) if (applySource.includes(forbidden)) throw new Error(`Candidate apply contains retired public write: ${forbidden}`);

const editorialSql = await read('supabase/newsflow-editorial.sql');
for (const contract of [
  'newsflow_editorial_members', 'editor_in_chief', 'newsflow_candidates', 'newsflow_editorial_reviews',
  'newsflow_sync_chief_adoption', "role = 'owner'", 'newsflow_editorial_adoptions',
  'newsflow_governance_drafts', 'newsflow_governance_publications'
]) if (!editorialSql.toLowerCase().includes(contract.toLowerCase())) throw new Error(`Editorial SQL missing ${contract}`);
if (!editorialSql.includes('update public.newsflow_candidates set active = false') || !editorialSql.includes('update public.newsflow_candidates set active = true')) throw new Error('Canonical editorial SQL must close/reopen Candidates with the chief decision lifecycle.');

const editorAccessFix = await read('supabase/migrations/20260809071339_restore_editor_access_function_execute.sql');
for (const contract of [
  'create or replace function private.newsflow_has_editor_access()',
  "a.role = 'owner'", "m.role = 'editor_in_chief'", "e.entitlement_code = 'newsflow.pro'",
  'grant execute on function private.newsflow_has_editor_access() to authenticated'
]) if (!editorAccessFix.includes(contract)) throw new Error(`Editor access repair missing ${contract}`);
if (/grant execute on function private\.newsflow_has_editor_access\(\) to (?:anon|public|service_role)/i.test(editorAccessFix)) {
  throw new Error('Editor access helper may only be executable by authenticated users.');
}

const projectionSql = await read('supabase/newsflow-publication-projection.sql');
for (const contract of [
  'publication jsonb', 'private.newsflow_publication_snapshot', 'private.newsflow_sync_chief_adoption',
  'publication = private.newsflow_publication_snapshot', 'Public reads published NewsFlow governance changes'
]) if (!projectionSql.includes(contract)) throw new Error(`Public publication projection missing ${contract}`);
if (projectionSql.includes('grant select on table public.newsflow_candidates to anon')) throw new Error('Public publication projection must not expose private Candidates.');

const adoptionCompiler = await read('scripts/sync-adopted-signals.mjs');
for (const contract of [
  "from('newsflow_editorial_adoptions')", ".select('candidate_id,decision,decided_at,publication')", 'SUPABASE_PUBLISHABLE_KEY',
  'frozenIssueSignalIds', ".filter((issue) => issue?.lifecycle !== 'live')", "editorial_status: 'adopted'", 'unregistered source'
]) if (!adoptionCompiler.includes(contract)) throw new Error(`Adoption compiler missing public-projection contract: ${contract}`);
for (const forbidden of ["from('newsflow_candidates')", 'SUPABASE_SERVICE_ROLE_KEY']) if (adoptionCompiler.includes(forbidden)) throw new Error(`Adoption compiler must not read private Candidate state: ${forbidden}`);

const governanceCompiler = await read('scripts/sync-editorial-governance.mjs');
if (!governanceCompiler.includes('SUPABASE_PUBLISHABLE_KEY') || governanceCompiler.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('Governance publication sync must read the explicitly published queue with the publishable key only.');
}

const liveCompiler = await read('scripts/sync-live-issue.mjs');
for (const contract of [
  "item?.editorial_status !== 'adopted'", "lifecycle: 'live'", "lifecycle: 'frozen'",
  'rankIssueSignals', 'chief_cover_then_evidence_quality_then_editor_consensus_then_reader_signal_then_recency', "writeJson('public/data/issues.json'",
  'maxSignalsPerChannel', 'coverage_start:', 'coverage_end:'
]) if (!liveCompiler.includes(contract)) throw new Error(`Live Issue compiler missing contract: ${contract}`);
if (liveCompiler.includes("from('newsflow_editorial_adoptions')") || liveCompiler.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Live Issue compiler must consume authoritative public Signals, not create a second Supabase read path.');

const editionLayer = await read('src/edition-layer.js');
for (const contract of [
  'renderIssueDrawer', 'publishedIssueById', 'const issues = publishedIssues();', 'readerUtilityState',
  "data-edition-action=\"open-issue\"", 'data-issue-current', '期刊目录', '全部刊期', '查看本期'
]) {
  if (!editionLayer.includes(contract)) throw new Error(`Issue-first publication contract missing: ${contract}`);
}
for (const retiredUi of ['data-target="latest-change"', '最新更新', '历期精选', '历期刊物']) {
  if (editionLayer.includes(retiredUi)) throw new Error(`Retired parallel-latest/archive UI returned: ${retiredUi}`);
}
for (const operatorCopy of ['冻结后不再改写', '已经冻结的刊期', '自动流程不会自行改写']) {
  if (editionLayer.includes(operatorCopy)) throw new Error(`Reader exposes operator-facing implementation copy: ${operatorCopy}`);
}

const [pagesWorkflow, publicationWorkflow] = await Promise.all([
  read('.github/workflows/pages.yml'), read('.github/workflows/publication-sync.yml')
]);
if (!pagesWorkflow.includes('npm run check') || !pagesWorkflow.includes('npm run build')) throw new Error('Pages workflow must validate before building.');
for (const contract of ['vars.NEWSFLOW_SUPABASE_URL', 'vars.NEWSFLOW_SUPABASE_PUBLISHABLE_KEY', 'actions/deploy-pages@v4']) {
  if (!pagesWorkflow.includes(contract)) throw new Error(`Pages workflow missing deployment contract: ${contract}`);
}
for (const contract of [
  "cron: '17,47 * * * *'", "cron: '0 16 * * *'", 'group: newsflow-publication-writer', 'SUPABASE_PUBLISHABLE_KEY',
  'npm run editorial:sync', 'npm run issue:sync', 'npm run content:status', 'npm run check', 'npm run build',
  'public/data/issues.json', 'vars.NEWSFLOW_SUPABASE_URL', 'vars.NEWSFLOW_SUPABASE_PUBLISHABLE_KEY', 'git pull --rebase origin main'
]) if (!publicationWorkflow.includes(contract)) throw new Error(`Publication sync workflow missing ${contract}`);
if (publicationWorkflow.includes('SUPABASE_SERVICE_ROLE_KEY') || publicationWorkflow.includes('npm run supabase:sync')
  || publicationWorkflow.includes('actions/upload-pages-artifact') || publicationWorkflow.includes('actions/deploy-pages')) {
  throw new Error('Publication sync must not carry service-role credentials or resurrect Candidate synchronization.');
}

const runFiles = await readdir(resolve(root, 'content/runs'));
for (const name of runFiles.filter((file) => file.endsWith('.json'))) {
  const run = await readJson(`content/runs/${name}`);
  if ('decisions' in run || 'candidates' in run) throw new Error(`Public scan audit exposes Candidate detail: ${name}`);
}

console.log(`NewsFlow repository contract passed: ${news.length} authoritative public Signals, ${storylines.length} Storylines, Supabase-private Candidates, public publication projection, issue-first homepage and current-inclusive TOC.`);
