import { readdir, readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Keep the service role key outside the browser and repository.');
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const edition = await readJson('public/data/edition.json');
const news = await readJson('public/data/news.json');
const sourceConfig = await readJson('config/content-sources.json');
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const syncedAt = new Date().toISOString();

const sourceForUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = url.pathname.toLowerCase();
    return (sourceConfig.sources || []).find((source) => {
      const domain = String(source.domain || '').toLowerCase().replace(/^www\./, '');
      const domainMatches = hostname === domain || hostname.endsWith(`.${domain}`);
      const pathMatches = !source.path_prefixes?.length
        || source.path_prefixes.some((prefix) => pathname.startsWith(String(prefix).toLowerCase()));
      return domainMatches && pathMatches;
    }) || null;
  } catch {
    return null;
  }
};

const signalRows = news.map((item) => ({
  edition_id: edition.id,
  signal_id: item.id,
  channel_id: item.channel_id,
  published_at: new Date(item.published_at).toISOString(),
  active: item.status !== 'archived',
  synced_at: syncedAt
}));
if (signalRows.length) {
  const { error } = await client.from('signal_catalog').upsert(signalRows, {
    onConflict: 'edition_id,signal_id',
    ignoreDuplicates: false
  });
  if (error) throw error;
}

const { data: existingSignals, error: signalSelectError } = await client
  .from('signal_catalog')
  .eq('edition_id', edition.id)
  .select('signal_id');
if (signalSelectError) throw signalSelectError;
const activeSignalIds = new Set(signalRows.map((row) => row.signal_id));
const retiredSignalIds = (existingSignals || [])
  .map((row) => row.signal_id)
  .filter((id) => !activeSignalIds.has(id));
if (retiredSignalIds.length) {
  const { error } = await client
    .from('signal_catalog')
    .update({ active: false, synced_at: syncedAt })
    .eq('edition_id', edition.id)
    .in('signal_id', retiredSignalIds);
  if (error) throw error;
}

const publishedSignalIds = new Set(news.map((item) => String(item.id || '')).filter(Boolean));
const candidates = new Map();
const addCandidate = (candidate, sourceHint = '') => {
  const id = String(candidate?.id || '');
  if (!id || !candidate?.title || publishedSignalIds.has(id)) return;
  const rawDate = candidate.published_at || candidate.event_date || null;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const registeredSource = sourceForUrl(candidate.url);
  const source = String(sourceHint || candidate.source || registeredSource?.name || '');
  const payload = {
    ...candidate,
    id,
    source,
    source_tier: String(candidate.source_tier || registeredSource?.tier || ''),
    source_id: String(registeredSource?.id || sourceHint || '')
  };
  candidates.set(id, {
    candidate_id: id,
    edition_id: edition.id,
    title: String(candidate.title),
    short_summary: String(candidate.short_summary || ''),
    source,
    url: String(candidate.url || ''),
    channel_id: String(candidate.channel_id || ''),
    storyline_ids: Array.isArray(candidate.storyline_ids) ? candidate.storyline_ids.map(String) : [],
    event_type: String(candidate.event_type || ''),
    published_at: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    payload,
    active: true,
    synced_at: syncedAt
  });
};

try {
  const inboxDir = resolve(root, 'content', 'inbox');
  const files = (await readdir(inboxDir)).filter((name) => name.endsWith('.json')).sort();
  for (const name of files) {
    const pack = JSON.parse(await readFile(resolve(inboxDir, name), 'utf8'));
    for (const candidate of pack.candidates || []) addCandidate(candidate);
  }
} catch {
  // An empty inbox is valid.
}

try {
  const queue = await readJson('content/state/pipeline-review-queue.json');
  for (const item of queue.items || []) addCandidate(item.candidate, item.decision?.source_id || '');
} catch {
  // The durable review queue is optional.
}

const candidateRows = [...candidates.values()];
if (candidateRows.length) {
  const { error } = await client.from('newsflow_candidates').upsert(candidateRows, {
    onConflict: 'candidate_id',
    ignoreDuplicates: false
  });
  if (error) throw error;
}

const { data: existingCandidates, error: candidateSelectError } = await client
  .from('newsflow_candidates')
  .eq('edition_id', edition.id)
  .select('candidate_id');
if (candidateSelectError) throw candidateSelectError;
const currentCandidateIds = new Set(candidateRows.map((row) => row.candidate_id));
const retiredCandidateIds = (existingCandidates || [])
  .map((row) => row.candidate_id)
  .filter((id) => !currentCandidateIds.has(id));
if (retiredCandidateIds.length) {
  const { error } = await client
    .from('newsflow_candidates')
    .update({ active: false, synced_at: syncedAt })
    .eq('edition_id', edition.id)
    .in('candidate_id', retiredCandidateIds);
  if (error) throw error;
}

console.log(`Supabase synchronized: ${signalRows.length} public Signal(s), ${candidateRows.length} private active candidate(s) for ${edition.id}.`);
