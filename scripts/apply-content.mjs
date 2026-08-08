import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evaluatorPath = resolve(root, 'scripts/update-content.mjs');
const queuePath = resolve(root, 'content/state/pipeline-review-queue.json');
const rawArgs = process.argv.slice(2);
const apply = rawArgs.includes('--apply');
const stdinMode = rawArgs.includes('--stdin');

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const runEvaluator = (args, input = undefined) => spawnSync(process.execPath, [evaluatorPath, ...args], {
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

const dryArgs = rawArgs.filter((entry) => entry !== '--apply');
const dryRun = runEvaluator(dryArgs, stdinMode ? sourceText : undefined);
if (dryRun.status !== 0) {
  printResult(dryRun);
  process.exit(dryRun.status ?? 1);
}
if (!apply) {
  printResult(dryRun);
  process.exit(0);
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
const candidateById = new Map(candidates.map((candidate) => [String(candidate.id || ''), candidate]));
let queue = {
  schema_version: '1.0',
  edition_id: report.edition_id,
  updated_at: report.run.as_of,
  items: []
};
try {
  queue = JSON.parse(await readFile(queuePath, 'utf8'));
} catch {
  // The private review queue is created on first applied candidate pack.
}

const byId = new Map((Array.isArray(queue.items) ? queue.items : []).map((item) => [String(item.id), item]));
for (const decision of report.decisions || []) {
  const id = String(decision.id || '');
  if (!id) continue;
  if (decision.status === 'rejected') {
    byId.delete(id);
    continue;
  }
  const candidate = candidateById.get(id);
  if (!candidate) throw new Error(`Missing candidate snapshot for reviewable item ${id}.`);
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

const appliedReport = {
  ...report,
  applied: true,
  publication_effect: 'none',
  editorial_effect: 'candidate_queue_only'
};
const inputHash = createHash('sha256').update(JSON.stringify({ report: appliedReport, candidates })).digest('hex').slice(0, 10);
const asOf = new Date(report.run.as_of);
if (Number.isNaN(asOf.getTime())) throw new Error('Content report has invalid run.as_of.');
const compactTime = asOf.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');
const reportPath = resolve(root, 'content', 'runs', `${compactTime}-${inputHash}.json`);
await mkdir(dirname(reportPath), { recursive: true });
try {
  await access(reportPath);
  throw new Error(`This candidate pack was already applied: ${reportPath}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await writeFile(reportPath, `${JSON.stringify(appliedReport, null, 2)}\n`, 'utf8');

const reviewableCount = (report.decisions || []).filter((decision) => decision.status !== 'rejected').length;
console.log(`Content candidate pack applied: ${reviewableCount}/${report.decisions?.length || 0} item(s) entered the private editorial queue; no Reader publication changed. Audit: ${reportPath}`);
