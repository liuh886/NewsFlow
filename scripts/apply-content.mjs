import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evaluatorPath = resolve(root, 'scripts/update-content.mjs');
const aggregatePath = resolve(root, 'scripts/aggregate-pipeline-reviews.mjs');
const queuePath = resolve(root, 'content/state/pipeline-review-queue.json');
const rawArgs = process.argv.slice(2);
const apply = rawArgs.includes('--apply');
const stdinMode = rawArgs.includes('--stdin');

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const runNode = (script, args, input = undefined) => spawnSync(process.execPath, [script, ...args], {
  cwd: root,
  encoding: 'utf8',
  input,
  maxBuffer: 16 * 1024 * 1024
});

const printResult = (result) => {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
};

const sourceText = stdinMode
  ? await readStdin()
  : await (async () => {
      const inputArgument = rawArgs.find((entry) => entry.startsWith('--input='));
      if (!inputArgument) return '';
      return readFile(resolve(root, inputArgument.slice('--input='.length)), 'utf8');
    })();

if (!apply) {
  const result = runNode(evaluatorPath, rawArgs, stdinMode ? sourceText : undefined);
  printResult(result);
  process.exit(result.status ?? 1);
}

const dryArgs = rawArgs.filter((entry) => entry !== '--apply');
const dryRun = runNode(evaluatorPath, dryArgs, stdinMode ? sourceText : undefined);
if (dryRun.status !== 0) {
  printResult(dryRun);
  process.exit(dryRun.status ?? 1);
}

let report;
try {
  report = JSON.parse(dryRun.stdout);
} catch {
  printResult(dryRun);
  throw new Error('Content evaluator did not return a valid JSON report.');
}

const parseCandidates = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.candidates)) return parsed.candidates;
    if (parsed && typeof parsed.id === 'string') return [parsed];
  } catch {
    const candidates = text.split('\n')
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`NDJSON line ${index + 1} is not valid JSON: ${error.message}`);
        }
      });
    if (candidates.length && candidates.every((candidate) => typeof candidate?.id === 'string')) return candidates;
  }
  throw new Error('Apply requires a candidate pack, a single JSON candidate or NDJSON candidates.');
};
const candidates = parseCandidates(sourceText);
const normalizedPack = {
  schema_version: '1.0',
  edition_id: report.edition_id,
  run: report.run,
  candidates
};

const applied = runNode(evaluatorPath, ['--stdin', '--apply'], `${JSON.stringify(normalizedPack)}\n`);
if (applied.status !== 0) {
  printResult(applied);
  process.exit(applied.status ?? 1);
}

let queue = {
  schema_version: '1.0',
  edition_id: report.edition_id,
  updated_at: report.run.as_of,
  items: []
};
try {
  queue = JSON.parse(await readFile(queuePath, 'utf8'));
} catch {
  // The queue is created on first applied review candidate.
}

const byId = new Map((Array.isArray(queue.items) ? queue.items : []).map((item) => [String(item.id), item]));
const candidateById = new Map(candidates.map((candidate) => [String(candidate.id || ''), candidate]));
const auditMatch = applied.stdout.match(/Audit:\s*(.+\.json)\s*$/m);
const runId = auditMatch ? basename(auditMatch[1], '.json') : String(report.run.as_of || '').replace(/[-:]/g, '');

for (const decision of report.decisions || []) {
  const id = String(decision.id || '');
  if (!id) continue;
  if (decision.status !== 'needs_review') {
    byId.delete(id);
    continue;
  }
  const candidate = candidateById.get(id);
  if (!candidate) throw new Error(`Missing candidate snapshot for needs_review item ${id}.`);
  byId.set(id, {
    id,
    manuscript_key: id.slice(-8).toUpperCase(),
    candidate,
    decision: {
      status: decision.status,
      source_id: decision.source_id,
      reasons: decision.reasons || [],
      score_mean: decision.score_mean
    },
    run: {
      id: runId,
      as_of: report.run.as_of,
      coverage_start: report.run.coverage_start,
      coverage_end: report.run.coverage_end,
      timezone: report.run.timezone
    }
  });
}

queue = {
  schema_version: '1.0',
  edition_id: report.edition_id,
  updated_at: report.run.as_of,
  items: [...byId.values()].sort((left, right) =>
    String(right.run?.as_of || '').localeCompare(String(left.run?.as_of || ''))
      || String(left.id).localeCompare(String(right.id))
  )
};
await mkdir(dirname(queuePath), { recursive: true });
await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');

const aggregation = runNode(aggregatePath, []);
if (aggregation.status !== 0) {
  printResult(aggregation);
  process.exit(aggregation.status ?? 1);
}

printResult(applied);
if (aggregation.stdout) process.stdout.write(aggregation.stdout);
console.log(`Human preflight queue updated: ${queue.items.length} item(s).`);
