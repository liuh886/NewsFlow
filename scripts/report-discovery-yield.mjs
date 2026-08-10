import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runsDir = resolve(root, 'content', 'runs');
const rows = new Map();

for (const name of (await readdir(runsDir)).filter((entry) => entry.endsWith('.json')).sort()) {
  let audit;
  try {
    audit = JSON.parse(await readFile(resolve(runsDir, name), 'utf8'));
  } catch {
    continue;
  }
  if (audit?.applied !== true) continue;
  const observations = audit?.run?.collection_observations;
  const scannedAt = audit?.run?.as_of || null;
  const xRuntime = observations?.x_query_runtime || null;
  for (const origin of observations?.origin_yield || []) {
    const key = `${origin.type}:${origin.id}`;
    const current = rows.get(key) || {
      type: origin.type,
      id: origin.id,
      runs_scanned: 0,
      material_leads: 0,
      full_text_reviews: 0,
      candidates: 0,
      latest_scan_at: null,
      x_runtimes: new Set()
    };
    current.runs_scanned += 1;
    current.material_leads += Number(origin.lead_count || 0);
    current.full_text_reviews += Number(origin.full_text_review_count || 0);
    current.candidates += Number(origin.candidate_count || 0);
    if (scannedAt && (!current.latest_scan_at || scannedAt > current.latest_scan_at)) current.latest_scan_at = scannedAt;
    if ((origin.type === 'x_scout' || origin.type === 'x_topic') && xRuntime) current.x_runtimes.add(xRuntime);
    rows.set(key, current);
  }
}

const report = [...rows.values()]
  .map((row) => ({
    type: row.type,
    id: row.id,
    runs_scanned: row.runs_scanned,
    material_leads: row.material_leads,
    full_text_reviews: row.full_text_reviews,
    candidates: row.candidates,
    latest_scan_at: row.latest_scan_at,
    x_runtimes: [...row.x_runtimes].sort()
  }))
  .sort((left, right) => right.candidates - left.candidates
    || right.material_leads - left.material_leads
    || left.type.localeCompare(right.type)
    || left.id.localeCompare(right.id));

console.log(JSON.stringify({
  schema_version: '1.0',
  source: 'content/runs/*.json',
  generated_from_run_count: new Set(report.flatMap(() => [])).size,
  note: 'Observation only. This report must not auto-rank, promote, demote or remove discovery sources.',
  origins: report
}, null, 2));
