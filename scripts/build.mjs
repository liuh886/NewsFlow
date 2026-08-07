import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const index = await readFile(resolve(root, 'index.html'), 'utf8');
await writeFile(resolve(dist, 'index.html'), index, 'utf8');
await cp(resolve(root, 'src/editorial-app.js'), resolve(dist, 'editorial-app.js'));
await cp(resolve(root, 'src/polish.js'), resolve(dist, 'polish.js'));
await cp(resolve(root, 'src/edition-layer.js'), resolve(dist, 'edition-layer.js'));
await cp(resolve(root, 'src/language-polish.js'), resolve(dist, 'language-polish.js'));
await cp(resolve(root, 'src/styles.css'), resolve(dist, 'styles.css'));
await cp(resolve(root, 'src/polish.css'), resolve(dist, 'polish.css'));
await cp(resolve(root, 'src/edition-layer.css'), resolve(dist, 'edition-layer.css'));
await cp(resolve(root, 'public'), dist, { recursive: true });

const reviewCandidatesById = new Map();
const addReviewCandidate = (candidate, context = {}) => {
  const id = String(candidate?.id || '');
  if (!id) return;
  reviewCandidatesById.set(id, {
    id,
    title: candidate.title,
    url: candidate.url,
    channel_id: candidate.channel_id,
    event_type: candidate.event_type,
    event_date: candidate.event_date,
    published_at: candidate.published_at,
    short_summary: candidate.short_summary,
    tags: candidate.tags || [],
    storyline_ids: candidate.storyline_ids || [],
    scores: candidate.scores || {},
    source: context.source || candidate.source || '',
    edition_id: context.edition_id || '',
    coverage_start: context.coverage_start || '',
    coverage_end: context.coverage_end || ''
  });
};

// Merge transient inbox packs for candidates that have not yet been applied.
const inboxDir = resolve(root, 'content', 'inbox');
try {
  const inboxFiles = (await readdir(inboxDir)).filter((file) => file.endsWith('.json')).sort();
  for (const file of inboxFiles) {
    const pack = JSON.parse(await readFile(resolve(inboxDir, file), 'utf8'));
    for (const candidate of pack.candidates || []) {
      addReviewCandidate(candidate, {
        edition_id: pack.edition_id || '',
        coverage_start: pack.run?.coverage_start || '',
        coverage_end: pack.run?.coverage_end || ''
      });
    }
  }

  const distInboxDir = resolve(dist, 'data', 'inbox');
  await mkdir(distInboxDir, { recursive: true });
  for (const file of inboxFiles) {
    await cp(resolve(inboxDir, file), resolve(distInboxDir, file));
  }
} catch {
  // A repository may have no transient inbox.
}

// Durable needs_review items remain available after inbox cleanup.
try {
  const queue = JSON.parse(await readFile(resolve(root, 'content/state/pipeline-review-queue.json'), 'utf8'));
  for (const item of queue.items || []) {
    addReviewCandidate(item.candidate, {
      source: item.decision?.source_id || '',
      edition_id: queue.edition_id || '',
      coverage_start: item.run?.coverage_start || '',
      coverage_end: item.run?.coverage_end || ''
    });
  }
} catch {
  // The durable queue is created on first applied needs_review candidate.
}

const reviewCandidates = [...reviewCandidatesById.values()].sort((left, right) =>
  String(right.published_at || '').localeCompare(String(left.published_at || ''))
    || left.id.localeCompare(right.id)
);
const distDataDir = resolve(dist, 'data');
await mkdir(distDataDir, { recursive: true });
await writeFile(
  resolve(distDataDir, 'review-candidates.json'),
  `${JSON.stringify(reviewCandidates, null, 2)}\n`,
  'utf8'
);

const publicSupabaseConfigPath = resolve(root, 'public/data/supabase-config.json');
const supabaseConfig = JSON.parse(await readFile(publicSupabaseConfigPath, 'utf8'));
const deploymentUrl = process.env.NEWSFLOW_SUPABASE_URL?.trim();
const deploymentKey = process.env.NEWSFLOW_SUPABASE_PUBLISHABLE_KEY?.trim();
if (Boolean(deploymentUrl) !== Boolean(deploymentKey)) {
  throw new Error('NEWSFLOW_SUPABASE_URL and NEWSFLOW_SUPABASE_PUBLISHABLE_KEY must be configured together.');
}
if (deploymentUrl && deploymentKey) {
  supabaseConfig.enabled = true;
  supabaseConfig.url = deploymentUrl;
  supabaseConfig.publishable_key = deploymentKey;
}
await writeFile(resolve(dist, 'data/supabase-config.json'), `${JSON.stringify(supabaseConfig, null, 2)}\n`, 'utf8');
await build({
  entryPoints: [resolve(root, 'src/supabase-feedback.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: ['es2022'],
  outfile: resolve(dist, 'supabase-feedback.js')
});

console.log(`NewsFlow build complete: dist/ with ${reviewCandidates.length} editorial candidate(s) and Supabase sync ${supabaseConfig.enabled ? 'enabled' : 'disabled'}.`);
