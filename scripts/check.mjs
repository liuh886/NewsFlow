import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = resolve(new URL('..', import.meta.url).pathname);
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
  'public/editorial-office.js',
  'public/editorial-mode.css',
  'public/review-game.js',
  'public/review-game.css',
  'public/sw.js',
  'public/manifest.webmanifest',
  'public/data/news.json',
  'public/data/ai_digest.json',
  'public/data/topics.json',
  'public/data/edition.json',
  'public/data/issues.json',
  'public/data/storylines.json',
  'public/data/pipeline-reviews.json',
  'public/data/guest-editor-invites.json',
  'public/data/editorial-reactions.json',
  'public/data/supabase-config.json',
  'scripts/build.mjs',
  'scripts/update-content.mjs',
  'scripts/apply-content.mjs',
  'scripts/publish-edition.mjs',
  'scripts/process-reviews.mjs',
  'scripts/sync-supabase-catalog.mjs',
  'schemas/content-candidate-pack.schema.json',
  'config/content-workflow.json',
  'config/recommendation-policy.json',
  'content/state/pipeline-review-queue.json',
  'content/state/reader-profile.json',
  'content/feedback/events.json',
  'supabase/migrations/20260803232713_create_newsflow_feedback.sql',
  'supabase/migrations/20260806_add_candidate_reviews.sql',
  '.github/workflows/pages.yml',
  '.github/workflows/publish-edition.yml',
  'WORKFLOW.md',
  'AGENTS.md'
];

for (const file of requiredFiles) await access(resolve(root, file));

const syntaxFiles = [
  'src/editorial-app.js',
  'src/polish.js',
  'src/edition-layer.js',
  'src/supabase-feedback.js',
  'public/startup-resilience.js',
  'public/magazine-polish.js',
  'public/editorial-office.js',
  'public/review-game.js',
  'public/sw.js',
  'scripts/build.mjs',
  'scripts/update-content.mjs',
  'scripts/apply-content.mjs',
  'scripts/publish-edition.mjs',
  'scripts/process-reviews.mjs',
  'scripts/sync-supabase-catalog.mjs'
];
for (const file of syntaxFiles) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${file} syntax failed:\n${syntax.stderr}`);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [news, digest, topics, edition, issues, storylines, manifest, supabaseConfig, packageManifest, queue] = await Promise.all([
  readJson('public/data/news.json'),
  readJson('public/data/ai_digest.json'),
  readJson('public/data/topics.json'),
  readJson('public/data/edition.json'),
  readJson('public/data/issues.json'),
  readJson('public/data/storylines.json'),
  readJson('public/manifest.webmanifest'),
  readJson('public/data/supabase-config.json'),
  readJson('package.json'),
  readJson('content/state/pipeline-review-queue.json')
]);

if (!Array.isArray(news) || news.length < 5) throw new Error('news.json must contain at least five signals.');
if (!Array.isArray(digest)) throw new Error('ai_digest.json must be an array.');
if (!Array.isArray(topics) || topics.length < 3) throw new Error('topics.json must contain the core channels.');
if (!edition?.id || edition.language !== 'zh-CN') throw new Error('edition.json must identify the Chinese reference edition.');
if (!Array.isArray(issues) || !Array.isArray(storylines)) throw new Error('issues.json and storylines.json must be arrays.');
if (!manifest.name || !manifest.id || manifest.lang !== 'zh-CN' || !Array.isArray(manifest.icons)) {
  throw new Error('manifest.webmanifest is incomplete or has the wrong language.');
}
if (queue.schema_version !== '1.0' || !Array.isArray(queue.items)) throw new Error('pipeline review queue contract is invalid.');

if (supabaseConfig.schema_version !== '1.0'
  || supabaseConfig.enabled !== false
  || supabaseConfig.url !== ''
  || supabaseConfig.publishable_key !== '') {
  throw new Error('source Supabase config must remain disabled and credential-free.');
}
if (packageManifest.dependencies?.['@supabase/supabase-js'] !== '2.112.0'
  || packageManifest.devDependencies?.supabase !== '2.111.0'
  || packageManifest.devDependencies?.esbuild !== '0.28.1') {
  throw new Error('Supabase client, CLI and esbuild must remain exactly pinned.');
}

const index = await readFile(resolve(root, 'index.html'), 'utf8');
for (const reference of [
  './styles.css',
  './polish.css',
  './edition-layer.css',
  './editorial-app.js',
  './polish.js',
  './edition-layer.js',
  './supabase-feedback.js',
  './editorial-mode.css',
  './review-game.css',
  './review-game.js',
  './editorial-office.js',
  './manifest.webmanifest'
]) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
for (const contract of ['mobile-web-app-capable', 'apple-mobile-web-app-capable', 'id="app-status"', 'role="status"']) {
  if (!index.includes(contract)) throw new Error(`index.html is missing ${contract}`);
}

const contentContract = spawnSync(process.execPath, [resolve(root, 'scripts/update-content.mjs'), '--check'], {
  cwd: root,
  encoding: 'utf8'
});
if (contentContract.status !== 0) throw new Error(`content update contract failed:\n${contentContract.stderr || contentContract.stdout}`);

for (const fixture of [
  ['test/fixtures/content-update-duplicate.json', 'rejected'],
  ['test/fixtures/content-update-corporate.json', 'accepted'],
  ['test/fixtures/content-update-institutional.json', 'rejected'],
  ['test/fixtures/content-update-social-scout.json', 'rejected']
]) {
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/update-content.mjs'), `--input=${fixture[0]}`], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.status !== 0) throw new Error(`${fixture[0]} contract execution failed:\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  if (!report.decisions?.some((decision) => decision.status === fixture[1])) {
    throw new Error(`${fixture[0]} did not produce expected ${fixture[1]} decision.`);
  }
}

const migration = await readFile(resolve(root, 'supabase/migrations/20260803232713_create_newsflow_feedback.sql'), 'utf8');
for (const contract of [
  'alter table public.signal_catalog enable row level security',
  'alter table public.signal_feedback enable row level security',
  'alter table public.reader_profiles enable row level security',
  'to authenticated',
  'using ((select auth.uid()) = user_id)',
  'with check ((select auth.uid()) = user_id)'
]) {
  if (!migration.includes(contract)) throw new Error(`Supabase RLS contract is missing: ${contract}`);
}

const buildSource = await readFile(resolve(root, 'scripts/build.mjs'), 'utf8');
if (buildSource.includes('spawnSync') || buildSource.includes('aggregate-pipeline-reviews.mjs')) {
  throw new Error('Static build must remain deterministic and non-mutating.');
}
const pagesWorkflow = await readFile(resolve(root, '.github/workflows/pages.yml'), 'utf8');
if (!pagesWorkflow.includes('npm run check') || !pagesWorkflow.includes('npm run build')) {
  throw new Error('Pages workflow must validate contracts before building.');
}

console.log(`NewsFlow repository contract passed: ${news.length} signals, ${storylines.length} storylines, one review engine and bounded frontend architecture.`);
