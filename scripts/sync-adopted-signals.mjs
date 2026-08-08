import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for adoption sync.');
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const writeJson = async (path, value) => writeFile(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const news = await readJson('public/data/news.json');
const issues = await readJson('public/data/issues.json');
const sourceConfig = await readJson('config/content-sources.json');
const syncState = await readJson('content/state/adoption-sync.json');
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

const { data: adoptionRows, error: adoptionError } = await client
  .from('newsflow_editorial_adoptions')
  .select('candidate_id,decision,decided_at')
  .order('decided_at', { ascending: false, nullsFirst: false });
if (adoptionError) throw adoptionError;
const adoptions = Array.isArray(adoptionRows) ? adoptionRows : [];
const adoptionIds = adoptions.map((row) => String(row.candidate_id || '')).filter(Boolean);

let candidates = [];
if (adoptionIds.length) {
  const { data, error } = await client
    .from('newsflow_candidates')
    .select('candidate_id,title,short_summary,source,url,channel_id,storyline_ids,event_type,published_at,payload')
    .in('candidate_id', adoptionIds);
  if (error) throw error;
  candidates = Array.isArray(data) ? data : [];
}
const candidateById = new Map(candidates.map((candidate) => [String(candidate.candidate_id), candidate]));

const deriveQuality = (payload) => {
  const direct = Number(payload?.quality_index);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const scores = Object.values(payload?.scores || {}).map(Number).filter(Number.isFinite);
  return scores.length
    ? Number(((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 2).toFixed(1))
    : 8.0;
};

const normalizeAdoptedSignal = (candidate, adoption) => {
  const payload = candidate?.payload && typeof candidate.payload === 'object' && !Array.isArray(candidate.payload)
    ? candidate.payload
    : {};
  const url = String(payload.url || candidate.url || '');
  const registeredSource = sourceForUrl(url);
  if (!registeredSource) throw new Error(`Adopted candidate ${candidate.candidate_id} uses an unregistered source: ${url}`);
  const title = String(payload.title || candidate.title || '').trim();
  const shortSummary = String(payload.short_summary || candidate.short_summary || '').trim();
  const longSummary = String(payload.long_summary || shortSummary).trim();
  const publishedAt = String(payload.published_at || candidate.published_at || '');
  if (!title || !shortSummary || !longSummary || !publishedAt) {
    throw new Error(`Adopted candidate ${candidate.candidate_id} is missing publication fields.`);
  }
  return {
    id: String(candidate.candidate_id),
    channel_id: String(payload.channel_id || candidate.channel_id || ''),
    storyline_ids: Array.isArray(payload.storyline_ids) ? payload.storyline_ids.map(String) : (candidate.storyline_ids || []).map(String),
    event_type: String(payload.event_type || candidate.event_type || ''),
    event_date: String(payload.event_date || publishedAt).slice(0, 10),
    title,
    url,
    source: String(payload.source || candidate.source || registeredSource.name),
    published_at: publishedAt,
    quality_index: deriveQuality(payload),
    source_tier: String(payload.source_tier || registeredSource.tier || 'Tier B'),
    short_summary: shortSummary,
    long_summary: longSummary,
    key_quote: String(payload.key_quote || ''),
    supporting_quotes: Array.isArray(payload.supporting_quotes) ? payload.supporting_quotes.map(String) : [],
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    editorial_status: 'adopted',
    editorial_decision: String(adoption.decision),
    adopted_at: adoption.decided_at || null
  };
};

const issueSignalIds = new Set((issues || []).flatMap((issue) => issue.signal_ids || []).map(String));
const currentAdoptionIds = new Set(adoptionIds);
const previouslyManaged = new Set(Array.isArray(syncState.managed_signal_ids) ? syncState.managed_signal_ids.map(String) : []);
const nextById = new Map(news.map((item) => [String(item.id || ''), item]));

for (const adoption of adoptions) {
  const id = String(adoption.candidate_id || '');
  const candidate = candidateById.get(id);
  if (!candidate) throw new Error(`Adopted candidate ${id} is missing from the private candidate catalog.`);
  nextById.set(id, normalizeAdoptedSignal(candidate, adoption));
}

const withdrawn = [];
for (const id of previouslyManaged) {
  if (currentAdoptionIds.has(id) || issueSignalIds.has(id)) continue;
  if (nextById.delete(id)) withdrawn.push(id);
}

const nextNews = [...nextById.values()].sort((left, right) =>
  new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime()
    || String(left.id || '').localeCompare(String(right.id || ''))
);
const nextManaged = [...new Set([...currentAdoptionIds, ...[...previouslyManaged].filter((id) => issueSignalIds.has(id))])].sort();
const changed = JSON.stringify(nextNews) !== JSON.stringify(news)
  || JSON.stringify(nextManaged) !== JSON.stringify([...previouslyManaged].sort());

if (changed) await writeJson('public/data/news.json', nextNews);
await writeJson('content/state/adoption-sync.json', {
  schema_version: '1.0',
  managed_signal_ids: nextManaged,
  current_adoption_count: currentAdoptionIds.size,
  last_synced_at: new Date().toISOString()
});

console.log(`Editorial adoption sync: ${currentAdoptionIds.size} current adoption(s), ${withdrawn.length} pre-Issue withdrawal(s), ${changed ? 'Reader data changed' : 'no Reader change'}.`);
