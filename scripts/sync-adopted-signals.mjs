import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
if (!supabaseUrl || !publishableKey) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for adoption sync.');
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const writeJson = async (path, value) => writeFile(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const news = await readJson('public/data/news.json');
const issues = await readJson('public/data/issues.json');
const sourceConfig = await readJson('config/content-sources.json');
let previousSync = {};
try {
  previousSync = await readJson('content/state/adoption-sync.json');
} catch {
  previousSync = {};
}
const client = createClient(supabaseUrl, publishableKey, {
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
  .select('candidate_id,decision,decided_at,publication')
  .order('decided_at', { ascending: false, nullsFirst: false });
if (adoptionError) throw adoptionError;
const adoptions = Array.isArray(adoptionRows) ? adoptionRows : [];
const adoptionIds = adoptions.map((row) => String(row.candidate_id || '')).filter(Boolean);

const normalizeAdoptedSignal = (adoption) => {
  const publication = adoption?.publication && typeof adoption.publication === 'object' && !Array.isArray(adoption.publication)
    ? adoption.publication
    : null;
  if (!publication || !Object.keys(publication).length) {
    throw new Error(`Adoption ${adoption.candidate_id} is missing its public publication snapshot.`);
  }

  const url = String(publication.url || '').trim();
  const registeredSource = sourceForUrl(url);
  if (!registeredSource) throw new Error(`Adopted candidate ${adoption.candidate_id} uses an unregistered source: ${url}`);

  const title = String(publication.title || '').trim();
  const shortSummary = String(publication.short_summary || '').trim();
  const longSummary = String(publication.long_summary || shortSummary).trim();
  const publishedAt = String(publication.published_at || '').trim();
  if (!title || !shortSummary || !longSummary || !publishedAt) {
    throw new Error(`Adopted candidate ${adoption.candidate_id} is missing publication fields.`);
  }

  const quality = Number(publication.quality_index);
  return {
    id: String(adoption.candidate_id),
    channel_id: String(publication.channel_id || ''),
    storyline_ids: Array.isArray(publication.storyline_ids) ? publication.storyline_ids.map(String) : [],
    event_type: String(publication.event_type || ''),
    event_date: String(publication.event_date || publishedAt).slice(0, 10),
    title,
    url,
    source: String(publication.source || registeredSource.name),
    published_at: publishedAt,
    quality_index: Number.isFinite(quality) && quality > 0 ? quality : 8.0,
    source_tier: String(publication.source_tier || registeredSource.tier || 'Tier B'),
    short_summary: shortSummary,
    long_summary: longSummary,
    key_quote: String(publication.key_quote || ''),
    supporting_quotes: Array.isArray(publication.supporting_quotes) ? publication.supporting_quotes.map(String) : [],
    tags: Array.isArray(publication.tags) ? publication.tags.map(String) : [],
    editorial_status: 'adopted',
    editorial_decision: String(adoption.decision),
    adopted_at: adoption.decided_at || null
  };
};

// Historical Issues retain their published Signals. The live Issue is rebuilt from
// the current public adoption projection, so reversed chief decisions leave it.
const frozenIssueSignalIds = new Set((issues || [])
  .filter((issue) => issue?.lifecycle !== 'live')
  .flatMap((issue) => issue.signal_ids || [])
  .map(String));
const currentAdoptionIds = new Set(adoptionIds);
const allowedPublicIds = new Set([...frozenIssueSignalIds, ...currentAdoptionIds]);
const nextById = new Map(
  news
    .filter((item) => allowedPublicIds.has(String(item.id || '')))
    .map((item) => [String(item.id || ''), item])
);

for (const adoption of adoptions) {
  const id = String(adoption.candidate_id || '');
  nextById.set(id, normalizeAdoptedSignal(adoption));
}

const removedLegacyOrWithdrawn = news
  .map((item) => String(item.id || ''))
  .filter((id) => id && !nextById.has(id));
const nextNews = [...nextById.values()].sort((left, right) =>
  new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime()
    || String(left.id || '').localeCompare(String(right.id || ''))
);
const nextManaged = [...currentAdoptionIds].sort();
const newsChanged = JSON.stringify(nextNews) !== JSON.stringify(news);
const semanticSync = {
  schema_version: '1.0',
  managed_signal_ids: nextManaged,
  current_adoption_count: currentAdoptionIds.size,
  formal_issue_signal_count: frozenIssueSignalIds.size
};
const previousSemanticSync = {
  schema_version: previousSync.schema_version || '1.0',
  managed_signal_ids: Array.isArray(previousSync.managed_signal_ids) ? previousSync.managed_signal_ids : [],
  current_adoption_count: Number(previousSync.current_adoption_count || 0),
  formal_issue_signal_count: Number(previousSync.formal_issue_signal_count || 0)
};
const stateChanged = JSON.stringify(semanticSync) !== JSON.stringify(previousSemanticSync);

if (newsChanged) await writeJson('public/data/news.json', nextNews);
if (stateChanged) {
  await writeJson('content/state/adoption-sync.json', {
    ...semanticSync,
    last_synced_at: new Date().toISOString()
  });
}

console.log(`Editorial adoption sync: ${currentAdoptionIds.size} current adoption(s), ${frozenIssueSignalIds.size} historical Issue Signal(s), ${removedLegacyOrWithdrawn.length} non-authoritative public Signal(s) removed, ${newsChanged || stateChanged ? 'state changed' : 'no semantic change'}.`);
