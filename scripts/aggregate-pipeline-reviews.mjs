import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const readJson = async (path) => {
  try { return JSON.parse(await readFile(resolve(root, path), 'utf8')); } catch { return null; }
};

const resolutionStatePath = 'content/state/pipeline-review-resolutions.json';
const resolutions = await readJson(resolutionStatePath) || {};
const resolvedIds = new Set(Object.keys(resolutions));

const runsDir = resolve(root, 'content', 'runs');
let runFiles = [];
try {
  runFiles = (await readdir(runsDir)).filter((f) => f.endsWith('.json')).sort().reverse();
} catch {
  console.log('No run audits found. Skipping pipeline review aggregation.');
  process.exit(0);
}

const inboxDir = resolve(root, 'content', 'inbox');
let inboxFiles = [];
try {
  inboxFiles = (await readdir(inboxDir)).filter((f) => f.endsWith('.json'));
} catch {
  inboxFiles = [];
}

const inboxCandidates = new Map();
for (const file of inboxFiles) {
  const pack = await readJson(`content/inbox/${file}`);
  if (!pack?.candidates) continue;
  for (const c of pack.candidates) {
    if (c.id) inboxCandidates.set(c.id, c);
  }
}

const latestRun = runFiles[0];
if (!latestRun) {
  console.log('No run audits found.');
  process.exit(0);
}

const audit = await readJson(`content/runs/${latestRun}`);
if (!audit?.decisions) {
  console.log('Run audit has no decisions array.');
  process.exit(0);
}

const needsReview = audit.decisions.filter((d) => d.status === 'needs_review' && !resolvedIds.has(d.id));

const candidates = needsReview.map((d) => {
  const full = inboxCandidates.get(d.id) || {};
  return {
    id: d.id,
    title: full.title || d.id,
    short_summary: full.short_summary || '',
    long_summary: full.long_summary || '',
    channel_id: full.channel_id || '',
    storyline_ids: d.storyline_ids || [],
    event_type: full.event_type || '',
    event_date: full.event_date || '',
    source_id: d.source_id || '',
    scores: d.scores || {},
    score_mean: d.score_mean || 0,
    reasons: d.reasons || [],
    evidence: d.evidence || [],
    verification: d.verification || null,
    published_at: full.published_at || audit.run?.as_of || '',
    url: full.url || ''
  };
});

const report = {
  schema_version: '1.0',
  run_id: latestRun.replace(/\.json$/, ''),
  run_time: audit.run?.as_of || '',
  applied: audit.applied || false,
  candidates
};

const outDir = resolve(root, 'public', 'data');
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'pipeline-reviews.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Pipeline review aggregated: ${candidates.length} needs_review candidate(s) from run ${report.run_id}.`);
