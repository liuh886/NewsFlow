import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const apply = args.has('apply');
const editionId = String(args.get('edition') || 'frontier-systems-review');
const outputPath = resolve(root, String(args.get('output') || 'content/feedback/cloud/current-state.json'));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

const news = await readJson('public/data/news.json');
const byId = new Map(news.map((item) => [String(item.id), item]));
let rows;

if (args.has('input')) {
  const input = await readJson(String(args.get('input')));
  rows = Array.isArray(input) ? input : input.rows;
} else {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to pull private feedback.');
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data, error } = await client
    .from('signal_feedback')
    .select('edition_id,signal_id,saved,preference,hidden,reason_code,evidence_flag,updated_at')
    .eq('edition_id', editionId)
    .order('updated_at', { ascending: true });
  if (error) throw error;
  rows = data;
}

if (!Array.isArray(rows)) throw new Error('Feedback snapshot must be an array.');
const events = [];
const addEvent = (row, action, index) => {
  const item = byId.get(String(row.signal_id));
  if (!item) return;
  const occurredAt = new Date(row.updated_at);
  if (Number.isNaN(occurredAt.getTime())) return;
  const digest = createHash('sha256')
    .update(`${row.edition_id}:${row.signal_id}:${action}:${occurredAt.toISOString()}:${index}`)
    .digest('hex')
    .slice(0, 20);
  events.push({
    event_id: `cloud-${digest}`,
    occurred_at: occurredAt.toISOString(),
    edition_id: editionId,
    signal_id: String(row.signal_id),
    action,
    surface: 'cloud-current-state',
    channel_id: String(item.channel_id || ''),
    storyline_ids: [...new Set(item.storyline_ids || [])],
    tags: [...new Set(item.tags || [])],
    source: String(item.source || '')
  });
};

rows.forEach((row, index) => {
  if (row.edition_id !== editionId) return;
  if (Number(row.preference) > 0) addEvent(row, 'useful', index);
  if (Number(row.preference) < 0) addEvent(row, row.reason_code || 'not_interested', index);
  if (row.saved === true) addEvent(row, 'bookmark', index);
  if (row.hidden === true) addEvent(row, 'hide', index);
  if (row.evidence_flag === true) addEvent(row, 'evidence_issue', index);
});

const timestamps = rows.map((row) => new Date(row.updated_at)).filter((date) => !Number.isNaN(date.getTime()));
const exportedAt = timestamps.length
  ? new Date(Math.max(...timestamps.map((date) => date.getTime()))).toISOString()
  : null;
const payload = {
  schema_version: '1.0',
  source: 'supabase-current-state',
  edition_id: editionId,
  exported_at: exportedAt,
  row_count: rows.length,
  event_count: events.length,
  contains_user_identifiers: false,
  events
};

if (apply) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Pulled ${rows.length} bounded feedback rows into ${events.length} anonymous preference events.`);
} else {
  console.log(JSON.stringify(payload, null, 2));
}
