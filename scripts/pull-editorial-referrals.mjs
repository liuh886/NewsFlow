import { createClient } from '@supabase/supabase-js';

const rawLimit = process.argv.find((entry) => entry.startsWith('--limit='))?.split('=')[1] || '1';
const limit = Math.max(1, Math.min(10, Number.parseInt(rawLimit, 10) || 1));
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Reading editorial referrals requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data, error } = await client
  .from('newsflow_editorial_referrals')
  .select('id,url,created_at')
  .eq('status', 'queued')
  .order('created_at', { ascending: true })
  .limit(limit);

if (error) throw error;

const referrals = (data || []).map((row) => ({
  id: row.id,
  url: row.url,
  created_at: row.created_at,
  editorial_priority: 'green_lane'
}));

process.stdout.write(`${JSON.stringify({
  schema_version: '1.0',
  queue: 'newsflow_editorial_referrals',
  count: referrals.length,
  referrals
}, null, 2)}\n`);
