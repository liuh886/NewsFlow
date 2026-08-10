import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evaluator = resolve(root, 'scripts', 'update-content.mjs');
const yieldReporter = resolve(root, 'scripts', 'report-discovery-yield.mjs');
const xDiscovery = resolve(root, 'scripts', 'pull-x-discovery.mjs');
const now = new Date();
const coverageStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const actor = {
  agent_id: 'contract-test',
  runtime: 'Node.js',
  workflow_id: 'newsflow-content-update',
  workflow_version: '1.0.0'
};

const basePack = {
  schema_version: '1.0',
  edition_id: 'frontier-systems-review',
  run: {
    as_of: now.toISOString(),
    coverage_start: coverageStart.toISOString(),
    coverage_end: now.toISOString(),
    timezone: 'Asia/Shanghai',
    actor,
    collection_observations: {
      source_ids_scanned: ['reuters'],
      scout_ids_scanned: [],
      storyline_ids_scanned: ['ai-infrastructure-layer'],
      surface_types_scanned: ['independent-reporting'],
      x_topic_query_ids_run: [],
      x_query_runtime: 'not_run',
      x_post_read_count: 0,
      origin_yield: [
        { type: 'mainstream', id: 'reuters', lead_count: 0, full_text_review_count: 0, candidate_count: 0 }
      ],
      material_lead_count: 0,
      full_text_review_count: 0
    }
  },
  candidates: []
};

const run = (pack) => spawnSync(process.execPath, [evaluator, '--stdin'], {
  cwd: root,
  input: JSON.stringify(pack),
  encoding: 'utf8'
});
const clone = (value) => JSON.parse(JSON.stringify(value));
const expectPass = (pack, label) => {
  const result = run(pack);
  if (result.status !== 0) throw new Error(`${label} should pass:\n${result.stderr || result.stdout}`);
};
const expectFail = (pack, pattern, label) => {
  const result = run(pack);
  const output = `${result.stderr || ''}\n${result.stdout || ''}`;
  if (result.status === 0) throw new Error(`${label} should fail`);
  if (!pattern.test(output)) throw new Error(`${label} failed for the wrong reason:\n${output}`);
};

expectPass(basePack, 'valid not_run telemetry');

const missingReadCount = clone(basePack);
delete missingReadCount.run.collection_observations.x_post_read_count;
expectFail(missingReadCount, /x_post_read_count/i, 'telemetry without X read count');

const fakeXRun = clone(basePack);
fakeXRun.run.collection_observations.x_topic_query_ids_run = ['ai-energy-problems'];
expectFail(fakeXRun, /native_x|not_run/i, 'not_run with X topic activity');

const impossibleYield = clone(basePack);
impossibleYield.run.collection_observations.origin_yield = [
  { type: 'mainstream', id: 'reuters', lead_count: 0, full_text_review_count: 1, candidate_count: 0 }
];
expectFail(impossibleYield, /full_text_review_count exceeds lead_count/i, 'impossible origin yield');

const xResult = spawnSync(process.execPath, [xDiscovery], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, X_BEARER_TOKEN: '' }
});
if (xResult.status !== 0) throw new Error(`X discovery without credentials should not fail the content run:\n${xResult.stderr || xResult.stdout}`);
let xReport;
try {
  xReport = JSON.parse(xResult.stdout);
} catch {
  throw new Error(`X discovery must emit JSON:\n${xResult.stdout}`);
}
if (xReport.runtime !== 'not_run' || xReport.reason !== 'missing_x_bearer_token') throw new Error('X discovery without credentials must report not_run/missing_x_bearer_token');
if (xReport.post_read_count !== 0 || !Array.isArray(xReport.leads) || xReport.leads.length !== 0) throw new Error('X discovery without credentials must not fabricate reads or leads');

const yieldResult = spawnSync(process.execPath, [yieldReporter], { cwd: root, encoding: 'utf8' });
if (yieldResult.status !== 0) throw new Error(`discovery yield report should run:\n${yieldResult.stderr || yieldResult.stdout}`);
let yieldReport;
try {
  yieldReport = JSON.parse(yieldResult.stdout);
} catch {
  throw new Error(`discovery yield report must emit JSON:\n${yieldResult.stdout}`);
}
if (!Number.isInteger(yieldReport.telemetry_run_count) || yieldReport.telemetry_run_count < 1) throw new Error('discovery yield report must include at least one telemetry run');
if (!Array.isArray(yieldReport.origins) || !yieldReport.origins.length) throw new Error('discovery yield report must expose aggregated origins');

console.log('NewsFlow discovery telemetry contract passed: native X Recent Search degrades to not_run without credentials, X read counts are explicit, and origin-yield invariants remain enforced.');
