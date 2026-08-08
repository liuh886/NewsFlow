import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const requiredFiles = [
  'index.html',
  'src/editorial-app.js',
  'src/polish.js',
  'src/edition-layer.js',
  'src/supabase-feedback.js',
  'src/styles.css',
  'src/polish.css',
  'src/edition-layer.css',
  'public/startup-resilience.js',
  'public/magazine-polish.js',
  'public/reading-surface.js',
  'public/editorial-office.js',
  'public/editorial-mode.css',
  'public/review-game.js',
  'public/review-game.css',
  'public/editorial-governance.js',
  'public/editorial-governance.css',
  'public/sw.js',
  'public/manifest.webmanifest',
  'public/data/news.json',
  'public/data/ai_digest.json',
  'public/data/topics.json',
  'public/data/edition.json',
  'public/data/issues.json',
  'public/data/storylines.json',
  'public/data/governance-status.json',
  'public/data/editorial-reactions.json',
  'public/data/supabase-config.json',
  'scripts/build.mjs',
  'scripts/update-content.mjs',
  'scripts/apply-content.mjs',
  'scripts/publish-edition.mjs',
  'scripts/sync-supabase.mjs',
  'scripts/sync-adopted-signals.mjs',
  'scripts/sync-editorial-governance.mjs',
  'scripts/update-data-status.mjs',
  'schemas/content-candidate-pack.schema.json',
  'config/content-workflow.json',
  'config/content-sources.json',
  'config/recommendation-policy.json',
  'content/state/pipeline-review-queue.json',
  'content/state/adoption-sync.json',
  'content/state/governance-sync.json',
  'content/state/reader-profile.json',
  'content/feedback/events.json',
  'supabase/migrations/20260803232713_create_newsflow_feedback.sql',
  'supabase/newsflow-editorial.sql',
  '.github/workflows/pages.yml',
  '.github/workflows/publish-edition.yml',
  '.github/workflows/supabase-sync.yml',
  '.github/workflows/editorial-sync.yml',
  'WORKFLOW.md',
  'AGENTS.md',
  'DESIGN.md',
  'README.md'
];
for (const file of requiredFiles) await access(resolve(root, file));

for (const retired of [
  'public/data/guest-editor-invites.json',
  'public/data/pipeline-reviews.json',
  'scripts/aggregate-pipeline-reviews.mjs',
  'scripts/sync-supabase-catalog.mjs',
  'editions/reference/edition.yaml'
]) {
  try {
    await access(resolve(root, retired));
    throw new Error(`Retired governance artifact must be deleted: ${retired}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const syntaxFiles = [
  'src/editorial-app.js', 'src/polish.js', 'src/edition-layer.js', 'src/supabase-feedback.js',
  'public/startup-resilience.js', 'public/magazine-polish.js', 'public/reading-surface.js',
  'public/editorial-office.js', 'public/review-game.js', 'public/editorial-governance.js', 'public/sw.js',
  'scripts/build.mjs', 'scripts/update-content.mjs', 'scripts/apply-content.mjs', 'scripts/publish-edition.mjs',
  'scripts/sync-supabase.mjs', 'scripts/sync-adopted-signals.mjs', 'scripts/sync-editorial-governance.mjs', 'scripts/update-data-status.mjs'
];
for (const file of syntaxFiles) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [news, digest, topics, edition, issues, storylines, manifest, supabaseConfig, packageManifest, queue, adoptionState, governanceState, workflowConfig] = await Promise.all([
  readJson('public/data/news.json'), readJson('public/data/ai_digest.json'), readJson('public/data/topics.json'),
  readJson('public/data/edition.json'), readJson('public/data/issues.json'), readJson('public/data/storylines.json'),
  readJson('public/manifest.webmanifest'), readJson('public/data/supabase-config.json'), readJson('package.json'),
  readJson('content/state/pipeline-review-queue.json'), readJson('content/state/adoption-sync.json'),
  readJson('content/state/governance-sync.json'), readJson('config/content-workflow.json')
]);

if (!Array.isArray(news) || news.length < 5) throw new Error('news.json must contain at least five published/adopted Signals.');
if (!Array.isArray(digest)) throw new Error('ai_digest.json must be an array.');
if (!Array.isArray(topics) || topics.length < 3) throw new Error('topics.json must contain the core channels.');
if (!edition?.id || edition.language !== 'zh-CN' || !Array.isArray(edition.storylines)) throw new Error('edition.json must be the canonical Chinese Edition.');
if (!Array.isArray(issues) || !Array.isArray(storylines)) throw new Error('issues.json and storylines.json must be arrays.');
if (!manifest.name || !manifest.id || manifest.lang !== 'zh-CN' || !Array.isArray(manifest.icons)) throw new Error('manifest.webmanifest is incomplete.');
if (queue.schema_version !== '1.0' || !Array.isArray(queue.items)) throw new Error('private pipeline review queue contract is invalid.');
if (adoptionState.schema_version !== '1.0' || !Array.isArray(adoptionState.managed_signal_ids)) throw new Error('adoption sync state is invalid.');
if (governanceState.schema_version !== '1.0' || !Array.isArray(governanceState.applied_publication_ids)) throw new Error('governance sync state is invalid.');
if (workflowConfig.required_inputs?.includes('editions/reference/edition.yaml')) throw new Error('Edition YAML duplicate authority must not return.');
if (workflowConfig.apply_writes?.includes('public/data/news.json')) throw new Error('collection apply must never write Reader news.json.');
if (!workflowConfig.commands?.apply?.includes('apply-content.mjs')) throw new Error('candidate application must use apply-content.mjs.');

if (supabaseConfig.schema_version !== '1.0' || supabaseConfig.enabled !== false || supabaseConfig.url !== '' || supabaseConfig.publishable_key !== '') {
  throw new Error('source Supabase config must remain disabled and credential-free.');
}
if (packageManifest.version !== '2.4.1') throw new Error('package release remains pinned until intentionally cut.');
if (packageManifest.dependencies?.['@supabase/supabase-js'] !== '2.112.0'
  || packageManifest.devDependencies?.supabase !== '2.111.0'
  || packageManifest.devDependencies?.esbuild !== '0.28.1') throw new Error('Supabase client, CLI and esbuild must remain exactly pinned.');
for (const command of ['supabase:sync', 'editorial:sync']) if (!packageManifest.scripts?.[command]) throw new Error(`package script missing ${command}.`);
for (const retired of ['aggregate-pipeline-reviews', 'supabase:catalog', 'review:process']) {
  if (JSON.stringify(packageManifest.scripts || {}).includes(retired)) throw new Error(`retired script returned: ${retired}`);
}

const index = await readFile(resolve(root, 'index.html'), 'utf8');
for (const reference of [
  './styles.css', './polish.css', './edition-layer.css', './editorial-app.js', './polish.js', './edition-layer.js',
  './supabase-feedback.js', './editorial-mode.css', './review-game.css', './review-game.js',
  './editorial-governance.css', './editorial-governance.js', './manifest.webmanifest'
]) if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
for (const contract of ['mobile-web-app-capable', 'apple-mobile-web-app-capable', 'id="app-status"', 'role="status"']) if (!index.includes(contract)) throw new Error(`index.html is missing ${contract}`);

const contentContract = spawnSync(process.execPath, [resolve(root, 'scripts/update-content.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
if (contentContract.status !== 0) throw new Error(`content evaluator contract failed:\n${contentContract.stderr || contentContract.stdout}`);
for (const fixture of [
  ['test/fixtures/content-update-duplicate.json', 'rejected'],
  ['test/fixtures/content-update-corporate.json', 'accepted'],
  ['test/fixtures/content-update-institutional.json', 'rejected'],
  ['test/fixtures/content-update-social-scout.json', 'rejected']
]) {
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/update-content.mjs'), `--input=${fixture[0]}`], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${fixture[0]} contract execution failed:\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  if (!report.decisions?.some((decision) => decision.status === fixture[1])) throw new Error(`${fixture[0]} did not produce expected ${fixture[1]} decision.`);
  if (report.applied !== false || report.publication_effect !== 'none') throw new Error('content evaluator must remain read-only.');
}

const feedbackMigration = await readFile(resolve(root, 'supabase/migrations/20260803232713_create_newsflow_feedback.sql'), 'utf8');
for (const contract of ['enable row level security', 'to authenticated', 'auth.uid()']) if (!feedbackMigration.toLowerCase().includes(contract.toLowerCase())) throw new Error(`Supabase feedback RLS contract missing ${contract}`);

const editorialSql = await readFile(resolve(root, 'supabase/newsflow-editorial.sql'), 'utf8');
for (const contract of [
  'newsflow_editorial_members', 'editor_in_chief', 'newsflow_editorial_invitations', 'token_hash',
  'newsflow_candidates', 'payload jsonb', 'newsflow_editorial_reviews', 'minor_revision', 'major_revision',
  'newsflow_sync_chief_adoption', "role = 'owner'", 'newsflow_editorial_adoptions',
  'newsflow_governance_drafts', 'newsflow_governance_publications', 'newsflow_publish_governance_change',
  "revoke all on table public.newsflow_candidates from anon, authenticated"
]) if (!editorialSql.toLowerCase().includes(contract.toLowerCase())) throw new Error(`NewsFlow editorial SQL missing ${contract}`);
if (editorialSql.includes('newsflow_sync_editorial_adoptions()') || editorialSql.includes('after insert or update of state on public.product_accounts')) throw new Error('Product-account adoption compatibility path must not return.');

const buildSource = await readFile(resolve(root, 'scripts/build.mjs'), 'utf8');
for (const forbidden of ['review-candidates.json', 'pipeline-reviews.json', 'guest-editor-invites.json']) if (buildSource.includes(forbidden)) throw new Error(`Reader build must not emit ${forbidden}`);
if (!buildSource.includes('source-registry.json')) throw new Error('Reader build must emit the public trusted-source registry.');

const evaluatorSource = await readFile(resolve(root, 'scripts/update-content.mjs'), 'utf8');
if (evaluatorSource.includes("writeFile(resolve(root, 'public/data/news.json')") || !evaluatorSource.includes('Direct evaluator apply is retired')) throw new Error('content evaluator must not contain a direct publication path.');
const applySource = await readFile(resolve(root, 'scripts/apply-content.mjs'), 'utf8');
if (applySource.includes("['--stdin', '--apply']") || applySource.includes('public/data/news.json')) throw new Error('candidate apply must not invoke or write publication state.');

const publisher = await readFile(resolve(root, 'scripts/publish-edition.mjs'), 'utf8');
for (const contract of [".from('newsflow_editorial_adoptions')", ".select('candidate_id,decision,decided_at')", 'cover_signal_id:', "writeFile(resolve(root, 'public/data/news.json')", "writeFile(resolve(root, 'public/data/issues.json')"]) {
  if (!publisher.includes(contract)) throw new Error(`Formal publisher missing contract: ${contract}`);
}
if (publisher.includes('minimum_quality') || publisher.includes('minimumQuality')) throw new Error('Formal Issue selection must not fall back to quality-only adoption.');

const [pagesWorkflow, publishWorkflow, supabaseWorkflow, editorialWorkflow] = await Promise.all([
  read('.github/workflows/pages.yml'), read('.github/workflows/publish-edition.yml'), read('.github/workflows/supabase-sync.yml'), read('.github/workflows/editorial-sync.yml')
]);
if (!pagesWorkflow.includes('npm run check') || !pagesWorkflow.includes('npm run build')) throw new Error('Pages workflow must validate before building.');
for (const contract of ['NEWSFLOW_SUPABASE_URL:', 'NEWSFLOW_SUPABASE_PUBLISHABLE_KEY:', 'git add public/data/issues.json public/data/news.json']) if (!publishWorkflow.includes(contract)) throw new Error(`Publish workflow missing ${contract}`);
for (const contract of ['SUPABASE_SERVICE_ROLE_KEY', 'npm run supabase:sync', 'content/inbox/**']) if (!supabaseWorkflow.includes(contract)) throw new Error(`Supabase sync workflow missing ${contract}`);
for (const contract of ["cron: '17 * * * *'", 'contents: write', 'npm run editorial:sync', 'npm run check', 'git push origin HEAD:main']) if (!editorialWorkflow.includes(contract)) throw new Error(`Editorial sync workflow missing ${contract}`);

console.log(`NewsFlow repository contract passed: ${news.length} public Signals, ${storylines.length} Storylines, private Candidates, advisory Editors and one Editor-in-Chief publication authority.`);