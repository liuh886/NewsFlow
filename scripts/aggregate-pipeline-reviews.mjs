import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'public/data/pipeline-reviews.json');
const checkOnly = process.argv.includes('--check');

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const readJsonOrNull = async (path) => {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
};

const timeValue = (value) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const inboxCandidates = new Map();
const inboxDir = resolve(root, 'content/inbox');
try {
  const files = (await readdir(inboxDir)).filter((file) => file.endsWith('.json')).sort();
  for (const file of files) {
    const pack = await readJsonOrNull(`content/inbox/${file}`);
    const packTime = timeValue(pack?.run?.as_of);
    for (const candidate of pack?.candidates || []) {
      const id = String(candidate?.id || '');
      if (!id) continue;
      const current = inboxCandidates.get(id);
      if (!current || packTime >= current.packTime) inboxCandidates.set(id, { candidate, packTime });
    }
  }
} catch {
  // A new repository may not have an inbox yet.
}

const latestDecisionById = new Map();
let latestRunAt = '';
const runsDir = resolve(root, 'content/runs');
try {
  const files = (await readdir(runsDir)).filter((file) => file.endsWith('.json')).sort();
  for (const file of files) {
    const audit = await readJsonOrNull(`content/runs/${file}`);
    if (!audit?.applied || !Array.isArray(audit.decisions)) continue;
    const runAt = String(audit.run?.as_of || '');
    const runTime = timeValue(runAt);
    if (runTime > timeValue(latestRunAt)) latestRunAt = runAt;

    for (const decision of audit.decisions) {
      const id = String(decision?.id || '');
      if (!id) continue;
      const current = latestDecisionById.get(id);
      if (!current || runTime >= current.runTime) {
        latestDecisionById.set(id, {
          decision,
          runTime,
          runAt,
          runId: file.replace(/\.json$/, '')
        });
      }
    }
  }
} catch {
  // Empty run history produces an empty, valid report.
}

const candidates = [...latestDecisionById.entries()]
  .filter(([, entry]) => entry.decision.status === 'needs_review')
  .map(([id, entry]) => {
    const source = inboxCandidates.get(id)?.candidate || {};
    const evidence = (entry.decision.evidence || []).map((item) => ({
      claim: String(item?.claim || ''),
      source_excerpt: String(item?.source_excerpt || ''),
      source_url: String(item?.source_url || '')
    }));
    return {
      id,
      manuscript_key: id.slice(-8).toUpperCase(),
      title: String(source.title || id),
      channel_id: String(source.channel_id || ''),
      source_id: String(entry.decision.source_id || ''),
      score_mean: Number(entry.decision.score_mean || 0),
      reasons: (entry.decision.reasons || []).map(String),
      evidence,
      run_id: entry.runId,
      run_time: entry.runAt
    };
  })
  .sort((left, right) => right.run_time.localeCompare(left.run_time) || left.id.localeCompare(right.id));

const manuscriptKeys = new Set();
for (const candidate of candidates) {
  if (manuscriptKeys.has(candidate.manuscript_key)) {
    throw new Error(`Pipeline review manuscript key collision: ${candidate.manuscript_key}`);
  }
  manuscriptKeys.add(candidate.manuscript_key);
}

const report = {
  schema_version: '2.0',
  source: 'applied-content-runs',
  latest_run_at: latestRunAt,
  candidate_count: candidates.length,
  candidates
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (checkOnly) {
  let current = '';
  try {
    current = await readFile(outputPath, 'utf8');
  } catch {
    // Missing output is reported below.
  }
  if (current !== serialized) {
    throw new Error('public/data/pipeline-reviews.json is stale. Run npm run content:status and commit the result.');
  }
  console.log(`Pipeline preflight contract passed: ${candidates.length} candidate(s) require human judgment.`);
  process.exit(0);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized, 'utf8');
console.log(`Pipeline preflight refreshed: ${candidates.length} candidate(s) require human judgment.`);
