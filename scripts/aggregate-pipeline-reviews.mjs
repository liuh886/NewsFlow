import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const queuePath = resolve(root, 'content/state/pipeline-review-queue.json');
const outputPath = resolve(root, 'public/data/pipeline-reviews.json');
const checkOnly = process.argv.includes('--check');

const queue = JSON.parse(await readFile(queuePath, 'utf8'));
if (queue.schema_version !== '1.0' || !Array.isArray(queue.items)) {
  throw new Error('content/state/pipeline-review-queue.json has an invalid contract.');
}

const candidates = queue.items.map((item) => {
  const candidate = item.candidate || {};
  const decision = item.decision || {};
  return {
    id: String(item.id || candidate.id || ''),
    manuscript_key: String(item.manuscript_key || item.id || '').slice(-8).toUpperCase(),
    title: String(candidate.title || ''),
    channel_id: String(candidate.channel_id || ''),
    source_id: String(decision.source_id || ''),
    score_mean: Number(decision.score_mean || 0),
    reasons: Array.isArray(decision.reasons) ? decision.reasons.map(String) : [],
    evidence: Array.isArray(candidate.evidence) ? candidate.evidence.map((evidence) => ({
      claim: String(evidence?.claim || ''),
      source_excerpt: String(evidence?.source_excerpt || ''),
      source_url: String(evidence?.source_url || '')
    })) : [],
    run_id: String(item.run?.id || ''),
    run_time: String(item.run?.as_of || '')
  };
}).sort((left, right) => right.run_time.localeCompare(left.run_time) || left.id.localeCompare(right.id));

const ids = new Set();
const manuscriptKeys = new Set();
for (const candidate of candidates) {
  if (!candidate.id || !candidate.title) throw new Error('Pipeline preflight items require id and title.');
  if (ids.has(candidate.id)) throw new Error(`Duplicate pipeline review id: ${candidate.id}`);
  if (manuscriptKeys.has(candidate.manuscript_key)) {
    throw new Error(`Pipeline review manuscript key collision: ${candidate.manuscript_key}`);
  }
  ids.add(candidate.id);
  manuscriptKeys.add(candidate.manuscript_key);
}

const report = {
  schema_version: '2.0',
  source: 'content-state',
  latest_run_at: String(queue.updated_at || ''),
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
    const currentLines = current.split('\n');
    const expectedLines = serialized.split('\n');
    const lineCount = Math.max(currentLines.length, expectedLines.length);
    let mismatch = 0;
    while (mismatch < lineCount && currentLines[mismatch] === expectedLines[mismatch]) mismatch += 1;
    throw new Error([
      'public/data/pipeline-reviews.json is stale. Run npm run content:status and commit the result.',
      `First mismatch at line ${mismatch + 1}.`,
      `Current: ${currentLines[mismatch] ?? '<missing>'}`,
      `Expected: ${expectedLines[mismatch] ?? '<missing>'}`
    ].join('\n'));
  }
  console.log(`Pipeline preflight contract passed: ${candidates.length} candidate(s) require human judgment.`);
  process.exit(0);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized, 'utf8');
console.log(`Pipeline preflight refreshed: ${candidates.length} candidate(s) require human judgment.`);
