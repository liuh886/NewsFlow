import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for governance sync.');
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const writeJson = async (path, value) => writeFile(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const asLines = (value) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
const requireText = (value, label) => {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
};

const response = await fetch(`${supabaseUrl}/rest/v1/newsflow_governance_publications?select=id,kind,target_id,payload,published_at&order=published_at.asc,id.asc`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  }
});
if (!response.ok) throw new Error(`Governance publication fetch failed: ${response.status} ${await response.text()}`);
const publications = await response.json();

const syncState = await readJson('content/state/governance-sync.json');
const applied = new Set(Array.isArray(syncState.applied_publication_ids) ? syncState.applied_publication_ids : []);
const pending = (Array.isArray(publications) ? publications : []).filter((item) => !applied.has(String(item.id || '')));
if (!pending.length) {
  console.log('NewsFlow governance sync: no unpublished GitHub changes.');
  process.exit(0);
}

const edition = await readJson('public/data/edition.json');
const storylines = await readJson('public/data/storylines.json');
const sourceConfig = await readJson('config/content-sources.json');
if (!Array.isArray(edition.storylines) || !Array.isArray(storylines) || !Array.isArray(sourceConfig.sources)) {
  throw new Error('Governance canonical files are malformed.');
}

const allowedSourceFields = new Set([
  'name', 'domain', 'path_prefixes', 'class', 'tier', 'channels', 'storylines', 'allowed_uses',
  'limitations', 'report_source', 'stakeholder_source', 'report_families', 'leader_watch'
]);

for (const publication of pending) {
  const id = requireText(publication.id, 'publication id');
  const kind = requireText(publication.kind, 'publication kind');
  const targetId = requireText(publication.target_id, 'publication target');
  const payload = publication.payload && typeof publication.payload === 'object' && !Array.isArray(publication.payload)
    ? publication.payload
    : {};
  const publishedDay = String(publication.published_at || new Date().toISOString()).slice(0, 10);

  if (kind === 'edition') {
    if (targetId !== edition.id) throw new Error(`Unknown Edition target: ${targetId}`);
    if ('reader_promise' in payload) edition.reader_promise = requireText(payload.reader_promise, 'reader_promise');
    if ('editorial_view' in payload) edition.editorial_view = requireText(payload.editorial_view, 'editorial_view');
    if ('core_questions' in payload) {
      const questions = asLines(payload.core_questions);
      if (!questions.length) throw new Error('core_questions cannot be empty.');
      edition.core_questions = questions;
    }
  } else if (kind === 'storyline') {
    const editionItem = edition.storylines.find((item) => item.id === targetId);
    const runtimeItem = storylines.find((item) => item.id === targetId);
    if (!editionItem || !runtimeItem || runtimeItem.status === 'retired') {
      throw new Error(`Only active existing Storylines can be edited: ${targetId}`);
    }
    const title = requireText(payload.title ?? editionItem.title, `${targetId}.title`);
    const question = requireText(payload.question ?? editionItem.question, `${targetId}.question`);
    const currentView = requireText(payload.current_view ?? editionItem.baseline_view, `${targetId}.current_view`);
    const watchFor = asLines(payload.watch_for ?? editionItem.watch_for);
    const falsifiers = asLines(payload.falsifiers ?? editionItem.falsifiers);
    if (!watchFor.length || !falsifiers.length) throw new Error(`${targetId} requires watch_for and falsifiers.`);

    editionItem.title = title;
    editionItem.question = question;
    editionItem.baseline_view = currentView;
    editionItem.watch_for = watchFor;
    editionItem.falsifiers = falsifiers;
    if (Array.isArray(payload.keywords) && payload.keywords.length) editionItem.keywords = asLines(payload.keywords);

    runtimeItem.title = title;
    runtimeItem.question = question;
    runtimeItem.current_view = currentView;
    runtimeItem.watch_for = watchFor;
    runtimeItem.falsifiers = falsifiers;
    runtimeItem.last_updated = publishedDay;
  } else if (kind === 'source') {
    const existingIndex = sourceConfig.sources.findIndex((item) => item.id === targetId);
    const existing = existingIndex >= 0 ? sourceConfig.sources[existingIndex] : { id: targetId };
    const next = { ...existing, id: targetId };
    for (const [key, value] of Object.entries(payload)) {
      if (allowedSourceFields.has(key)) next[key] = value;
    }
    next.name = requireText(next.name, `${targetId}.name`);
    next.domain = requireText(next.domain, `${targetId}.domain`).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    next.class = requireText(next.class, `${targetId}.class`);
    next.tier = requireText(next.tier, `${targetId}.tier`);
    next.channels = asLines(next.channels);
    next.storylines = asLines(next.storylines);
    next.allowed_uses = asLines(next.allowed_uses);
    if (!next.channels.length || !next.storylines.length || !next.allowed_uses.length) {
      throw new Error(`${targetId} requires channels, storylines and allowed_uses.`);
    }
    if (next.path_prefixes) next.path_prefixes = asLines(next.path_prefixes);
    if (next.limitations) next.limitations = asLines(next.limitations);
    if (next.report_families) next.report_families = asLines(next.report_families);
    if (existingIndex >= 0) sourceConfig.sources[existingIndex] = next;
    else sourceConfig.sources.push(next);
  } else {
    throw new Error(`Unsupported governance kind: ${kind}`);
  }

  applied.add(id);
  syncState.last_applied_at = publication.published_at || new Date().toISOString();
}

syncState.schema_version = '1.0';
syncState.applied_publication_ids = [...applied];
syncState.applied_count = syncState.applied_publication_ids.length;
sourceConfig.sources.sort((left, right) => String(left.id).localeCompare(String(right.id)));

await writeJson('public/data/edition.json', edition);
await writeJson('public/data/storylines.json', storylines);
await writeJson('config/content-sources.json', sourceConfig);
await writeJson('content/state/governance-sync.json', syncState);
await writeJson('public/data/governance-status.json', {
  schema_version: '1.0',
  last_applied_at: syncState.last_applied_at || null,
  applied_count: syncState.applied_count,
  status: 'synced_to_github'
});

console.log(`NewsFlow governance sync applied ${pending.length} publication(s); ${syncState.applied_count} total revision(s) recorded.`);
