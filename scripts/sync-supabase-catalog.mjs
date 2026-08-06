import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Keep the service role key outside the browser and repository.');
}

const edition = JSON.parse(await readFile(resolve(root, 'public/data/edition.json'), 'utf8'));
const news = JSON.parse(await readFile(resolve(root, 'public/data/news.json'), 'utf8'));
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const syncedAt = new Date().toISOString();
const rows = news.map((item) => ({
  edition_id: edition.id,
  signal_id: item.id,
  channel_id: item.channel_id,
  published_at: new Date(item.published_at).toISOString(),
  active: item.status !== 'archived',
  synced_at: syncedAt
}));
if (rows.length) {
  const { error: upsertError } = await client.from('signal_catalog').upsert(rows, {
    onConflict: 'edition_id,signal_id',
    ignoreDuplicates: false
  });
  if (upsertError) throw upsertError;
}

const activeIds = rows.map((row) => row.signal_id);
const { data: existingRows, error: selectError } = await client
  .from('signal_catalog')
  .eq('edition_id', edition.id)
  .select('signal_id');
if (selectError) throw selectError;
const activeIdSet = new Set(activeIds);
const retiredIds = (existingRows || []).map((row) => row.signal_id).filter((id) => !activeIdSet.has(id));
if (retiredIds.length) {
  const { error: retireError } = await client
    .from('signal_catalog')
    .update({ active: false, synced_at: syncedAt })
    .eq('edition_id', edition.id)
    .in('signal_id', retiredIds);
  if (retireError) throw retireError;
}
console.log(`Supabase Signal catalog synchronized: ${rows.length} rows for ${edition.id}.`);
