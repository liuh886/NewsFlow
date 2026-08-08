import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runsDir = resolve(root, 'content', 'runs');
const inboxDir = resolve(root, 'content', 'inbox');
const outputPath = resolve(root, 'public', 'data', 'data-status.json');
const checkOnly = process.argv.includes('--check');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const validDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const news = await readJson(resolve(root, 'public', 'data', 'news.json'));
const activities = [];

const runFiles = (await readdir(runsDir)).filter((name) => name.endsWith('.json'));
for (const name of runFiles) {
  try {
    const run = await readJson(resolve(runsDir, name));
    const asOf = validDate(run?.run?.as_of);
    if (asOf && run?.applied === true) activities.push({ name, asOf, timezone: run?.run?.timezone, source: 'content-run' });
  } catch {
    // Invalid audit artifacts are handled by repository checks; ignore them here.
  }
}

try {
  const inboxFiles = (await readdir(inboxDir)).filter((name) => name.endsWith('.json'));
  for (const name of inboxFiles) {
    try {
      const pack = await readJson(resolve(inboxDir, name));
      const asOf = validDate(pack?.run?.as_of);
      if (asOf) activities.push({ name, asOf, timezone: pack?.run?.timezone, source: 'content-scan' });
    } catch {
      // Invalid candidate packs are handled by repository checks; ignore them here.
    }
  }
} catch {
  // An empty inbox is valid.
}

const latestSignalDate = [...news]
  .map((item) => validDate(item.published_at || item.event_date))
  .filter(Boolean)
  .sort((left, right) => right.getTime() - left.getTime())[0] || null;
if (latestSignalDate) activities.push({ name: null, asOf: latestSignalDate, timezone: 'Asia/Shanghai', source: 'latest-signal' });

activities.sort((left, right) => right.asOf.getTime() - left.asOf.getTime());
const latestActivity = activities[0] || null;
if (!latestActivity) throw new Error('Cannot derive a NewsFlow data update date.');

const payload = {
  schema_version: '1.0',
  edition_id: 'frontier-systems-review',
  updated_at: latestActivity.asOf.toISOString(),
  timezone: latestActivity.timezone || 'Asia/Shanghai',
  source: latestActivity.source,
  signal_count: news.length,
  latest_signal_at: latestSignalDate?.toISOString() || null,
  audit_artifact: latestActivity.name || null
};
const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(outputPath, 'utf8');
  if (current !== serialized) {
    throw new Error('public/data/data-status.json is stale. Run npm run content:status after every completed scan or applied content change.');
  }
  console.log(`NewsFlow data status is current through ${payload.updated_at} with ${payload.signal_count} public Signals.`);
} else {
  await writeFile(outputPath, serialized, 'utf8');
  console.log(`Updated NewsFlow data status through ${payload.updated_at} with ${payload.signal_count} public Signals.`);
}
