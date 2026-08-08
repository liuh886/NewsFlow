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
  'schemas/content-candidate-pack.schema.json', 'config/content-workflow.json', 'config/content-sources.json',
  'config/content-discovery.json', 'content/state/adoption-sync.json', 'content/state/governance-sync.json',
  'supabase/newsflow-editorial.sql', '.github/workflows/pages.yml', '.github/workflows/publication-sync.yml',
  'WORKFLOW.md', 'DESIGN.md', 'README.md'
];
for (const file of requiredFiles) await access(resolve(root, file));

const retiredFiles = [
  'public/data/ai_digest.json', 'public/data/review-candidates.json', 'public/data/pipeline-reviews.json',
  'public/data/guest-editor-invites.json', 'content/state/pipeline-review-queue.json', 'scripts/sync-supabase.mjs',
  '.github/workflows/supabase-sync.yml', 'scripts/aggregate-pipeline-reviews.mjs',
  'scripts/sync-supabase-catalog.mjs', 'editions/reference/edition.yaml',
  'scripts/publish-edition.mjs', '.github/workflows/publish-edition.yml', '.github/workflows/editorial-sync.yml'
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
  'scripts/sync-editorial-governance.mjs', 'scripts/update-data-status.mjs'
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
if (!packageManifest.scripts?.['editorial:sync'] || !packageManifest.scripts?.['content:update'] || !packageManifest.scripts?.['issue:sync']) throw new Error('Core editorial scripts are missing.');
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

const adoptionCompiler = await read('scripts/sync-adopted-signals.mjs');
for (const contract of [
  "from('newsflow_editorial_adoptions')", "from('newsflow_candidates')", 'frozenIssueSignalIds',
  ".filter((issue) => issue?.lifecycle !== 'live')", "editorial_status: 'adopted'", 'unregistered source'
]) if (!adoptionCompiler.includes(contract)) throw new Error(`Adoption compiler missing live/frozen boundary: ${contract}`);

const liveCompiler = await read('scripts/sync-live-issue.mjs');
for (const contract of [
  "item?.editorial_status !== 'adopted'", "lifecycle: 'live'", "lifecycle: 'frozen'",
  'rankIssueSignals', 'chief_cover_then_quality_then_recency', "writeJson('public/data/issues.json'",
  'maxSignalsPerChannel', 'coverage_start:', 'coverage_end:'
]) if (!liveCompiler.includes(contract)) throw new Error(`Live Issue compiler missing contract: ${contract}`);
if (liveCompiler.includes("from('newsflow_editorial_adoptions')") || liveCompiler.includes('SUPABASE_SERVICE_ROLE_KEY')) throw new Error('Live Issue compiler must consume authoritative public Signals, not create a second Supabase read path.');

const [pagesWorkflow, publicationWorkflow] = await Promise.all([
  read('.github/workflows/pages.yml'), read('.github/workflows/publication-sync.yml')
]);
if (!pagesWorkflow.includes('npm run check') || !pagesWorkflow.includes('npm run build')) throw new Error('Pages workflow must validate before building.');
for (const contract of [
  "cron: '17,47 * * * *'", 'group: newsflow-publication-writer', 'SUPABASE_SERVICE_ROLE_KEY',
  'NEWSFLOW_SUPABASE_PUBLISHABLE_KEY', 'npm run editorial:sync', 'npm run issue:sync', 'npm run content:status',
  'npm run check', 'npm run build', 'public/data/issues.json', 'actions/upload-pages-artifact@v4',
  'actions/deploy-pages@v4', 'git pull --rebase origin main'
]) if (!publicationWorkflow.includes(contract)) throw new Error(`Publication sync workflow missing ${contract}`);
if (publicationWorkflow.includes('npm run supabase:sync')) throw new Error('Publication sync must not resurrect repository Candidate synchronization.');

const runFiles = await readdir(resolve(root, 'content/runs'));
for (const name of runFiles.filter((file) => file.endsWith('.json'))) {
  const run = await readJson(`content/runs/${name}`);
  if ('decisions' in run || 'candidates' in run) throw new Error(`Public scan audit exposes Candidate detail: ${name}`);
}

console.log(`NewsFlow repository contract passed: ${news.length} authoritative public Signals, ${storylines.length} Storylines, Supabase-private Candidates, live Current Issue and frozen historical Issues.`);
