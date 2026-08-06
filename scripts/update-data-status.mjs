import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runsDir = resolve(root, 'content', 'runs');
const outputPath = resolve(root, 'public', 'data', 'data-status.json');
const checkOnly = process.argv.includes('--check');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const validDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const news = await readJson(resolve(root, 'public', 'data', 'news.json'));
const runFiles = (await readdir(runsDir)).filter((name) => name.endsWith('.json'));
const runs = [];
for (const name of runFiles) {
  try {
    const run = await readJson(resolve(runsDir, name));
    const asOf = validDate(run?.run?.as_of);
    if (asOf && run?.applied === true) runs.push({ name, run, asOf });
  } catch {
    // Invalid audit artifacts are handled by repository checks; ignore them here.
  }
}

runs.sort((left, right) => right.asOf.getTime() - left.asOf.getTime());
const latestRun = runs[0] || null;
const latestSignalDate = [...news]
  .map((item) => validDate(item.published_at || item.event_date))
  .filter(Boolean)
  .sort((left, right) => right.getTime() - left.getTime())[0] || null;
const updatedAt = latestRun?.run?.run?.as_of || latestSignalDate?.toISOString();
if (!updatedAt) throw new Error('Cannot derive a NewsFlow data update date.');

const payload = {
  schema_version: '1.0',
  edition_id: 'frontier-systems-review',
  updated_at: updatedAt,
  timezone: latestRun?.run?.run?.timezone || 'Asia/Shanghai',
  source: latestRun ? 'content-run' : 'latest-signal',
  signal_count: news.length,
  latest_signal_at: latestSignalDate?.toISOString() || null,
  audit_artifact: latestRun?.name || null
};
const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(outputPath, 'utf8');
  if (current !== serialized) {
    throw new Error('public/data/data-status.json is stale. Run npm run content:status after applying content changes.');
  }
  console.log(`NewsFlow data status is current through ${payload.updated_at} with ${payload.signal_count} Signals.`);
} else {
  await writeFile(outputPath, serialized, 'utf8');
  console.log(`Updated NewsFlow data status through ${payload.updated_at} with ${payload.signal_count} Signals.`);
}
