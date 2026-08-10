import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv2020 as Ajv } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
if (args.has('apply')) {
  throw new Error('Direct evaluator apply is retired. Use scripts/apply-content.mjs --apply; collection may create Candidates but cannot publish Reader Signals.');
}
const checkOnly = args.has('check');
const inputArgument = args.get('input');
const stdin = args.has('stdin');

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [workflowConfig, sourceConfig, discoveryConfig, scoutConfig, edition, news, storylines, candidatePackSchema] = await Promise.all([
  readJson('config/content-workflow.json'),
  readJson('config/content-sources.json'),
  readJson('config/content-discovery.json'),
  readJson('config/content-scouts.json'),
  readJson('public/data/edition.json'),
  readJson('public/data/news.json'),
  readJson('public/data/storylines.json'),
  readJson('schemas/content-candidate-pack.schema.json')
]);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateCandidatePack = ajv.compile(candidatePackSchema);
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const requireText = (object, field, reasons) => {
  if (typeof object?.[field] !== 'string' || !object[field].trim()) reasons.push(`missing ${field}`);
};
const parsedUrlFor = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};
const hostnameFor = (value) => parsedUrlFor(value)?.hostname.toLowerCase().replace(/^www\./, '') || '';
const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.replace(/^www\./, '');
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|campaign$)/i.test(key)) url.searchParams.delete(key);
    }
    const result = url.toString();
    return result.endsWith('/') && url.pathname === '/' ? result.slice(0, -1) : result;
  } catch {
    return String(value || '').trim();
  }
};
const sourceForUrl = (value) => {
  const url = parsedUrlFor(value);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname.toLowerCase();
  return sourceConfig.sources.find((source) => {
    const domain = String(source.domain || '').toLowerCase().replace(/^www\./, '');
    const domainMatches = hostname === domain || hostname.endsWith(`.${domain}`);
    const pathMatches = !source.path_prefixes?.length
      || source.path_prefixes.some((prefix) => pathname.startsWith(String(prefix).toLowerCase()));
    return domainMatches && pathMatches;
  }) || null;
};
const scoutForUrl = (value) => {
  const url = parsedUrlFor(value);
  if (!url || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname.toLowerCase())) return null;
  const handle = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  return scoutConfig.scouts?.find((scout) => scout.handle.toLowerCase() === handle) || null;
};
const titleBigrams = (value) => {
  const normalized = String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
  if (normalized.length < 2) return new Set(normalized ? [normalized] : []);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
};
const titleSimilarity = (left, right) => {
  const a = titleBigrams(left);
  const b = titleBigrams(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((part) => b.has(part)).length;
  return (2 * intersection) / (a.size + b.size);
};
const dateInShanghai = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};
const formatTimeForError = (date) => {
  const shanghai = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
  return `${shanghai} CST (${date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')} UTC)`;
};

const configProblems = [];
if (workflowConfig.schema_version !== '1.0') configProblems.push('unsupported content workflow schema_version');
if (workflowConfig.workflow_id !== 'newsflow-content-update') configProblems.push('unsupported content workflow_id');
if (workflowConfig.workflow_version !== '1.0.0') configProblems.push('unsupported content workflow_version');
if (workflowConfig.timezone !== 'Asia/Shanghai') configProblems.push('content workflow timezone must be Asia/Shanghai');
if (workflowConfig.entrypoint !== 'WORKFLOW.md') configProblems.push('content workflow must use WORKFLOW.md as its entrypoint');
if (workflowConfig.exchange_contract?.candidate_pack_schema !== 'schemas/content-candidate-pack.schema.json') configProblems.push('invalid candidate pack schema path');
for (const field of ['agent_id', 'runtime', 'workflow_id', 'workflow_version']) {
  if (!workflowConfig.exchange_contract?.required_actor_fields?.includes(field)) configProblems.push(`content workflow actor is missing ${field}`);
}
if (workflowConfig.apply_writes?.includes('public/data/news.json')) configProblems.push('content collection must not publish directly to news.json');
if (workflowConfig.commands?.apply?.includes('update-content.mjs')) configProblems.push('content apply must go through candidate-only apply-content.mjs');
if (sourceConfig.schema_version !== '1.1') configProblems.push('unsupported source config schema_version');
if (!Array.isArray(sourceConfig.sources) || !sourceConfig.sources.length) configProblems.push('source registry is empty');
if (!Array.isArray(sourceConfig.score_dimensions) || sourceConfig.score_dimensions.length !== 5) configProblems.push('score_dimensions must define exactly five dimensions');
for (const field of ['score_min_per_dimension', 'score_mean_min', 'title_similarity_review', 'max_evidence_excerpt_chars']) {
  if (!Number.isFinite(Number(sourceConfig.thresholds?.[field]))) configProblems.push(`invalid threshold ${field}`);
}

const editionChannelIds = new Set((edition.channels || []).map((channel) => channel.id));
const storylineIds = new Set(storylines.map((storyline) => storyline.id));
const sourceIds = new Set();
for (const source of sourceConfig.sources || []) {
  for (const field of ['id', 'name', 'domain', 'class', 'tier']) requireText(source, field, configProblems);
  if (sourceIds.has(source.id)) configProblems.push(`duplicate source id ${source.id}`);
  sourceIds.add(source.id);
  if (!Array.isArray(source.channels) || !source.channels.length) configProblems.push(`source ${source.id} has no channels`);
  for (const channelId of source.channels || []) if (!editionChannelIds.has(channelId)) configProblems.push(`source ${source.id} uses unknown channel ${channelId}`);
  if (!Array.isArray(source.storylines) || !source.storylines.length) configProblems.push(`source ${source.id} has no Storylines`);
  for (const storylineId of source.storylines || []) if (!storylineIds.has(storylineId)) configProblems.push(`source ${source.id} uses unknown Storyline ${storylineId}`);
  if (!Array.isArray(source.allowed_uses) || !source.allowed_uses.length) configProblems.push(`source ${source.id} has no allowed_uses`);
  if (source.path_prefixes?.some((prefix) => typeof prefix !== 'string' || !prefix.startsWith('/'))) configProblems.push(`source ${source.id} has invalid path_prefixes`);
  if (source.class === 'corporate_primary' && !source.leader_watch?.role) configProblems.push(`corporate source ${source.id} has no leader_watch role`);
  if ((source.class === 'corporate_primary' || source.report_source === true || source.stakeholder_source === true)
    && (!Array.isArray(source.limitations) || !source.limitations.length)) configProblems.push(`source ${source.id} requires limitations`);
  if (source.report_source === true && (!Array.isArray(source.report_families) || !source.report_families.length)) configProblems.push(`report source ${source.id} has no report_families`);
}
for (const item of news) if (!sourceForUrl(item.url)) configProblems.push(`existing Signal uses unregistered source: ${item.url}`);

if (scoutConfig.schema_version !== '1.0' || scoutConfig.platform !== 'X') configProblems.push('invalid X scout configuration');
if (scoutConfig.default_policy?.promotion !== 'discovery_only'
  || scoutConfig.default_policy?.post_as_evidence !== false
  || scoutConfig.default_policy?.require_canonical_source !== true) configProblems.push('X scouts must remain discovery-only');
if (scoutConfig.rotation_policy?.runtime_query_selection !== 'native_x_only_else_not_run') configProblems.push('X discovery must be native-only when available, otherwise not_run');
const scoutLayers = new Set(scoutConfig.layers || []);
const scoutIds = new Set();
const scoutHandles = new Set();
for (const scout of scoutConfig.scouts || []) {
  for (const field of ['id', 'name', 'handle', 'x_url', 'evidence_family', 'promotion_policy']) requireText(scout, field, configProblems);
  if (scoutIds.has(scout.id)) configProblems.push(`duplicate scout id ${scout.id}`);
  if (scoutHandles.has(String(scout.handle).toLowerCase())) configProblems.push(`duplicate scout handle ${scout.handle}`);
  scoutIds.add(scout.id);
  scoutHandles.add(String(scout.handle).toLowerCase());
  if (scout.promotion_policy !== 'discovery_only') configProblems.push(`scout ${scout.id} is not discovery_only`);
  if (!Array.isArray(scout.layers) || !scout.layers.length || scout.layers.some((layer) => !scoutLayers.has(layer))) configProblems.push(`scout ${scout.id} has invalid layers`);
  if (!Array.isArray(scout.canonical_sources) || !scout.canonical_sources.length) configProblems.push(`scout ${scout.id} has no canonical sources`);
}
const topicQueryIds = new Set();
for (const topicQuery of scoutConfig.topic_queries || []) {
  for (const field of ['id', 'native_query', 'purpose']) requireText(topicQuery, field, configProblems);
  if (topicQueryIds.has(topicQuery.id)) configProblems.push(`duplicate X topic query id ${topicQuery.id}`);
  topicQueryIds.add(topicQuery.id);
  if (!Array.isArray(topicQuery.layers) || !topicQuery.layers.length || topicQuery.layers.some((layer) => !scoutLayers.has(layer))) configProblems.push(`X topic query ${topicQuery.id} has invalid layers`);
  if (Object.hasOwn(topicQuery, 'web_query')) configProblems.push(`X topic query ${topicQuery.id} contains retired web_query fallback`);
}
if (!topicQueryIds.size) configProblems.push('X topic query registry is empty');

if (discoveryConfig.schema_version !== '1.0' || discoveryConfig.timezone !== 'Asia/Shanghai') configProblems.push('invalid discovery configuration');
for (const channelId of editionChannelIds) {
  const channelPlan = discoveryConfig.channels?.[channelId];
  if (!channelPlan) {
    configProblems.push(`missing discovery channel ${channelId}`);
    continue;
  }
  for (const storyline of edition.storylines.filter((item) => item.channel_id === channelId)) {
    const plan = channelPlan.storylines?.[storyline.id];
    if (!plan) {
      configProblems.push(`missing discovery plan for ${storyline.id}`);
      continue;
    }
    for (const field of ['source_ids', 'event_types', 'queries', 'counter_queries']) {
      if (!Array.isArray(plan[field]) || !plan[field].length) configProblems.push(`discovery ${storyline.id} has no ${field}`);
    }
    for (const sourceId of plan.source_ids || []) {
      const source = sourceConfig.sources.find((item) => item.id === sourceId);
      if (!source) configProblems.push(`discovery ${storyline.id} uses unknown source ${sourceId}`);
      else if (!source.channels.includes(channelId) || !source.storylines.includes(storyline.id)) configProblems.push(`source ${sourceId} is not routed to ${storyline.id}`);
    }
  }
}

if (configProblems.length) throw new Error(`Content source configuration failed:\n- ${configProblems.join('\n- ')}`);
if (checkOnly) {
  console.log(`Content evaluator contract passed: ${sourceConfig.sources.length} trusted sources, ${scoutIds.size} fixed X scouts and ${topicQueryIds.size} native X topic queries cover ${edition.storylines.length} discovery plans and ${news.length} published Signals; collection cannot publish.`);
  process.exit(0);
}

if (!inputArgument && !stdin) throw new Error('Missing --input=<candidate-pack.json> or --stdin. The evaluator is read-only; use apply-content.mjs --apply to queue reviewable Candidates.');
if (inputArgument && stdin) throw new Error('--input and --stdin are mutually exclusive.');
let inputText;
if (stdin) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  inputText = Buffer.concat(chunks).toString('utf8');
} else {
  const inputPath = resolve(root, String(inputArgument));
  try {
    await access(inputPath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Input file not found: ${inputArgument}`);
    throw error;
  }
  inputText = await readFile(inputPath, 'utf8');
}

let parsedInput;
try { parsedInput = JSON.parse(inputText); } catch { parsedInput = null; }
const candidatePack = (() => {
  if (parsedInput?.candidates) return parsedInput;
  const now = new Date();
  const coverageStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const run = {
    as_of: now.toISOString(), coverage_start: coverageStart.toISOString(), coverage_end: now.toISOString(), timezone: 'Asia/Shanghai',
    actor: { agent_id: 'cli-candidate', runtime: 'NewsFlow CLI', workflow_id: workflowConfig.workflow_id, workflow_version: workflowConfig.workflow_version }
  };
  if (parsedInput && typeof parsedInput.id === 'string' && typeof parsedInput.title === 'string' && typeof parsedInput.url === 'string') {
    return { schema_version: '1.0', edition_id: edition.id, run, candidates: [parsedInput] };
  }
  const candidates = inputText.split('\n').filter((line) => line.trim()).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`NDJSON line ${index + 1} is not valid JSON: ${error.message}`); }
  });
  if (candidates.length && candidates.every((candidate) => typeof candidate?.id === 'string')) return { schema_version: '1.0', edition_id: edition.id, run, candidates };
  throw new Error('Input must be a candidate pack, single candidate or NDJSON candidates.');
})();

if (!validateCandidatePack(candidatePack)) {
  const errors = validateCandidatePack.errors.map((error) => `${error.instancePath || '<root>'} ${error.message}`);
  throw new Error(`Candidate pack failed JSON Schema validation:\n- ${errors.join('\n- ')}`);
}
const packProblems = [];
if (candidatePack.schema_version !== '1.0') packProblems.push('unsupported candidate pack schema_version');
if (candidatePack.edition_id !== edition.id) packProblems.push(`edition_id must be ${edition.id}`);
const actor = candidatePack.run?.actor;
if (!isObject(actor)) packProblems.push('missing run.actor');
else {
  for (const field of workflowConfig.exchange_contract.required_actor_fields) requireText(actor, field, packProblems);
  if (actor.workflow_id !== workflowConfig.workflow_id) packProblems.push(`run.actor.workflow_id must be ${workflowConfig.workflow_id}`);
  if (actor.workflow_version !== workflowConfig.workflow_version) packProblems.push(`run.actor.workflow_version must be ${workflowConfig.workflow_version}`);
}
const asOf = toDate(candidatePack.run?.as_of);
const coverageStart = toDate(candidatePack.run?.coverage_start);
const coverageEnd = toDate(candidatePack.run?.coverage_end);
const now = new Date();
if (!asOf) packProblems.push('invalid run.as_of');
if (!coverageStart) packProblems.push('invalid run.coverage_start');
if (!coverageEnd) packProblems.push('invalid run.coverage_end');
if (candidatePack.run?.timezone !== 'Asia/Shanghai') packProblems.push('run.timezone must be Asia/Shanghai');
if (asOf && asOf.getTime() > now.getTime() + 300_000) packProblems.push(`as_of (${formatTimeForError(asOf)}) must not be in the future`);
if (asOf && coverageEnd && coverageEnd > asOf) packProblems.push('coverage_end must not be later than as_of');
if (coverageStart && coverageEnd && coverageStart > coverageEnd) packProblems.push('coverage_start must not be later than coverage_end');

const observations = candidatePack.run?.collection_observations;
const originRows = observations?.origin_yield || [];
const originRowByKey = new Map();
const candidateOriginCounts = new Map();
const sourceBackedOriginTypes = new Set(['specialist', 'primary', 'institutional', 'mainstream']);
const validateOriginId = (origin, reasons, label) => {
  if (!origin) return;
  if (origin.type === 'x_scout' && !scoutIds.has(origin.id)) reasons.push(`${label} uses unknown X scout ${origin.id}`);
  if (origin.type === 'x_topic' && !topicQueryIds.has(origin.id)) reasons.push(`${label} uses unknown X topic query ${origin.id}`);
  if (sourceBackedOriginTypes.has(origin.type) && !sourceIds.has(origin.id)) reasons.push(`${label} uses unknown registered source ${origin.id}`);
};
for (const candidate of candidatePack.candidates) {
  if (!candidate.discovery_origin) continue;
  validateOriginId(candidate.discovery_origin, packProblems, `Candidate ${candidate.id} discovery_origin`);
  const key = `${candidate.discovery_origin.type}:${candidate.discovery_origin.id}`;
  candidateOriginCounts.set(key, (candidateOriginCounts.get(key) || 0) + 1);
}
if (observations) {
  for (const id of observations.source_ids_scanned || []) if (!sourceIds.has(id)) packProblems.push(`collection_observations uses unknown source ${id}`);
  for (const id of observations.scout_ids_scanned || []) if (!scoutIds.has(id)) packProblems.push(`collection_observations uses unknown X scout ${id}`);
  for (const id of observations.storyline_ids_scanned || []) if (!storylineIds.has(id)) packProblems.push(`collection_observations uses unknown Storyline ${id}`);
  for (const id of observations.x_topic_query_ids_run || []) if (!topicQueryIds.has(id)) packProblems.push(`collection_observations uses unknown X topic query ${id}`);
  const xTopicIdsRun = observations.x_topic_query_ids_run || [];
  if (xTopicIdsRun.length && observations.x_query_runtime !== 'native_x') packProblems.push('X topic queries may run only with x_query_runtime=native_x');
  if (observations.x_query_runtime === 'not_run' && (xTopicIdsRun.length || (observations.scout_ids_scanned || []).length)) packProblems.push('x_query_runtime=not_run cannot record X scouts or X topic queries as scanned');
  if (observations.material_lead_count < candidatePack.candidates.length) packProblems.push('material_lead_count cannot be lower than Candidate count');
  if (observations.full_text_review_count < candidatePack.candidates.length) packProblems.push('full_text_review_count cannot be lower than Candidate count');
  for (const row of originRows) {
    validateOriginId(row, packProblems, 'origin_yield');
    const key = `${row.type}:${row.id}`;
    if (originRowByKey.has(key)) packProblems.push(`duplicate origin_yield row ${key}`);
    originRowByKey.set(key, row);
    if (row.full_text_review_count > row.lead_count) packProblems.push(`origin_yield ${key} full_text_review_count exceeds lead_count`);
    if (row.candidate_count > row.full_text_review_count) packProblems.push(`origin_yield ${key} candidate_count exceeds full_text_review_count`);
    if (observations.x_query_runtime === 'not_run' && (row.type === 'x_scout' || row.type === 'x_topic') && (row.lead_count || row.full_text_review_count || row.candidate_count)) packProblems.push(`origin_yield ${key} records X activity while x_query_runtime=not_run`);
  }
  if (originRows.length) {
    for (const candidate of candidatePack.candidates) {
      if (!candidate.discovery_origin) {
        packProblems.push(`Candidate ${candidate.id} must declare discovery_origin when origin_yield telemetry is supplied`);
        continue;
      }
      const key = `${candidate.discovery_origin.type}:${candidate.discovery_origin.id}`;
      if (!originRowByKey.has(key)) packProblems.push(`Candidate ${candidate.id} discovery_origin ${key} is missing from origin_yield`);
    }
    for (const [key, count] of candidateOriginCounts) {
      const row = originRowByKey.get(key);
      if (row && row.candidate_count !== count) packProblems.push(`origin_yield ${key} candidate_count ${row.candidate_count} does not match Candidate pack count ${count}`);
    }
    for (const [key, row] of originRowByKey) {
      const count = candidateOriginCounts.get(key) || 0;
      if (row.candidate_count !== count) packProblems.push(`origin_yield ${key} candidate_count ${row.candidate_count} does not match Candidate pack count ${count}`);
    }
  }
}
if (packProblems.length) throw new Error(`Candidate pack failed:\n- ${packProblems.join('\n- ')}`);

const existingIds = new Set(news.map((item) => item.id));
const existingUrls = new Set(news.map((item) => normalizeUrl(item.url)));
const candidateIds = new Set();
const candidateUrls = new Set();
const dimensionIds = sourceConfig.score_dimensions.map((dimension) => dimension.id);
const decisions = [];

for (const candidate of candidatePack.candidates) {
  const rejected = [];
  const review = [];
  for (const field of ['id', 'channel_id', 'event_type', 'event_date', 'title', 'url', 'published_at', 'retrieved_at', 'short_summary', 'long_summary']) requireText(candidate, field, rejected);
  if (candidateIds.has(candidate.id)) rejected.push(`duplicate candidate id ${candidate.id}`);
  candidateIds.add(candidate.id);
  const normalizedCandidateUrl = normalizeUrl(candidate.url);
  if (candidateUrls.has(normalizedCandidateUrl)) rejected.push('duplicate source URL in candidate pack');
  candidateUrls.add(normalizedCandidateUrl);
  if (existingIds.has(candidate.id)) rejected.push(`Signal id already exists: ${candidate.id}`);
  if (!hostnameFor(candidate.url)) rejected.push('url must be a valid HTTPS URL');
  if (existingUrls.has(normalizedCandidateUrl)) rejected.push('source URL already exists');

  const registeredSource = sourceForUrl(candidate.url);
  const socialScout = scoutForUrl(candidate.url);
  if (socialScout) rejected.push(`X scout ${socialScout.handle} is discovery-only; use the canonical source`);
  if (!registeredSource) review.push('source domain is not in the trusted registry');
  if (!editionChannelIds.has(candidate.channel_id)) rejected.push(`unknown channel ${candidate.channel_id}`);
  if (registeredSource && !registeredSource.channels.includes(candidate.channel_id)) review.push(`source ${registeredSource.id} is not approved for channel ${candidate.channel_id}`);

  const publishedAt = toDate(candidate.published_at);
  const retrievedAt = toDate(candidate.retrieved_at);
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(candidate.event_date || '') ? candidate.event_date : null;
  if (!publishedAt) rejected.push('invalid published_at');
  if (!retrievedAt) rejected.push('invalid retrieved_at');
  if (!eventDate) rejected.push('invalid event_date');
  if (publishedAt && coverageStart && coverageEnd && (publishedAt < coverageStart || publishedAt > coverageEnd)) rejected.push('published_at is outside the coverage window');
  if (publishedAt && asOf && publishedAt > asOf) rejected.push('published_at is later than as_of');
  if (retrievedAt && asOf && retrievedAt > asOf) rejected.push('retrieved_at is later than as_of');
  if (publishedAt && retrievedAt && retrievedAt < publishedAt) rejected.push('retrieved_at is earlier than published_at');
  if (eventDate && asOf && eventDate > dateInShanghai(asOf)) rejected.push('event_date is later than as_of');

  if (candidate.verification?.full_text_accessed !== true) rejected.push('verification.full_text_accessed must be true');
  if (candidate.verification?.summary_supported_sentence_by_sentence !== true) rejected.push('verification.summary_supported_sentence_by_sentence must be true');
  if (registeredSource?.class === 'corporate_primary' && candidate.verification?.attributed_to_source !== true) rejected.push('corporate disclosure requires verification.attributed_to_source=true');
  if (registeredSource?.report_source === true) {
    if (candidate.verification?.attributed_to_source !== true) rejected.push('institutional report requires verification.attributed_to_source=true');
    const context = candidate.verification?.report_context;
    if (!isObject(context)) rejected.push('institutional report requires verification.report_context');
    else {
      for (const field of ['report_title', 'report_version', 'data_cutoff']) requireText(context, field, rejected);
      if (context.publication_date_verified !== true) rejected.push('report publication date must be verified');
      if (context.methodology_reviewed !== true) rejected.push('report methodology must be reviewed');
      if (context.observed_and_modeled_separated !== true) rejected.push('report facts and modeled outputs must be separated');
      const cutoff = String(context.data_cutoff || '').trim().toLowerCase();
      if (cutoff === 'not_disclosed') review.push('report data cutoff is not disclosed');
      else if (cutoff && !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) rejected.push('report data_cutoff must be YYYY-MM-DD or not_disclosed');
    }
  }
  if (registeredSource?.stakeholder_source === true && candidate.verification?.stakeholder_position_attributed !== true) rejected.push('stakeholder report requires verification.stakeholder_position_attributed=true');

  if (!Array.isArray(candidate.tags) || !candidate.tags.length || candidate.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) rejected.push('tags must contain at least one non-empty string');
  if (!Array.isArray(candidate.storyline_ids) || !candidate.storyline_ids.length) rejected.push('storyline_ids must contain at least one Storyline');
  else {
    for (const id of candidate.storyline_ids) {
      const storyline = storylines.find((item) => item.id === id);
      if (!storyline) rejected.push(`unknown Storyline ${id}`);
      else if (storyline.channel_id !== candidate.channel_id) rejected.push(`Storyline ${id} does not belong to channel ${candidate.channel_id}`);
      else if (storyline.status === 'retired') rejected.push(`Storyline ${id} is retired`);
      if (registeredSource && !registeredSource.storylines.includes(id)) review.push(`source ${registeredSource.id} is not approved for Storyline ${id}`);
    }
  }
  const matchingPlans = (candidate.storyline_ids || []).flatMap((id) => {
    const plan = discoveryConfig.channels?.[candidate.channel_id]?.storylines?.[id];
    return plan ? [plan] : [];
  });
  if (matchingPlans.length && !matchingPlans.some((plan) => plan.event_types.includes(candidate.event_type))) review.push(`event_type ${candidate.event_type} is not defined for the selected Storylines`);

  const scores = candidate.scores;
  const scoreValues = [];
  if (!isObject(scores)) rejected.push('missing scores');
  else {
    for (const dimension of dimensionIds) {
      const value = Number(scores[dimension]);
      if (!Number.isFinite(value) || value < 0 || value > 5) rejected.push(`score ${dimension} must be between 0 and 5`);
      else {
        scoreValues.push(value);
        if (value < sourceConfig.thresholds.score_min_per_dimension) rejected.push(`score ${dimension} is below minimum ${sourceConfig.thresholds.score_min_per_dimension}`);
      }
    }
    if (scoreValues.length === dimensionIds.length) {
      const mean = scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length;
      if (mean < sourceConfig.thresholds.score_mean_min) rejected.push(`score mean ${mean.toFixed(1)} is below threshold ${sourceConfig.thresholds.score_mean_min}`);
    }
  }

  if (!Array.isArray(candidate.evidence) || !candidate.evidence.length) rejected.push('evidence must contain at least one claim-level citation');
  else {
    for (const [index, evidence] of candidate.evidence.entries()) {
      for (const field of ['claim', 'source_excerpt', 'source_url']) requireText(evidence, field, rejected);
      if (String(evidence.source_excerpt || '').length > sourceConfig.thresholds.max_evidence_excerpt_chars) rejected.push(`evidence ${index + 1} excerpt is too long`);
      if (!hostnameFor(evidence.source_url)) rejected.push(`evidence ${index + 1} source_url must be HTTPS`);
      const evidenceScout = scoutForUrl(evidence.source_url);
      if (evidenceScout) rejected.push(`evidence ${index + 1} uses discovery-only X scout ${evidenceScout.handle}`);
      if (!sourceForUrl(evidence.source_url)) review.push(`evidence ${index + 1} source is not trusted`);
    }
    if (!candidate.evidence.some((evidence) => normalizeUrl(evidence.source_url) === normalizedCandidateUrl)) rejected.push('at least one claim-level citation must point to the candidate source URL');
    const independentEvidence = candidate.evidence.some((evidence) => {
      const evidenceSource = sourceForUrl(evidence.source_url);
      return evidenceSource && registeredSource && evidenceSource.id !== registeredSource.id && evidenceSource.class !== 'corporate_primary';
    });
    if (registeredSource?.class === 'corporate_primary' && Number(scores?.facts) > 4.5 && !independentEvidence) review.push('corporate disclosure needs independent evidence for facts score above 4.5');
  }

  const closest = news.map((item) => ({ id: item.id, similarity: titleSimilarity(candidate.title, item.title) })).sort((a, b) => b.similarity - a.similarity)[0];
  if (closest && closest.similarity >= sourceConfig.thresholds.title_similarity_review) review.push(`title resembles existing Signal ${closest.id} (${closest.similarity.toFixed(2)})`);

  const scoreMean = scoreValues.length === dimensionIds.length
    ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length
    : null;
  const status = rejected.length ? 'rejected' : review.length ? 'needs_review' : 'accepted';
  decisions.push({
    id: candidate.id || null,
    status,
    source_id: registeredSource?.id || null,
    discovery_origin: candidate.discovery_origin || null,
    reasons: [...rejected, ...review],
    scores: Object.fromEntries(dimensionIds.map((dimension) => [dimension, Number(scores?.[dimension]) || null])),
    score_mean: scoreMean === null ? null : Math.round(scoreMean * 10) / 10,
    storyline_ids: candidate.storyline_ids || [],
    verification: candidate.verification || null,
    evidence: candidate.evidence || []
  });
}

const duplicateCandidates = [];
for (let i = 0; i < candidatePack.candidates.length; i += 1) {
  for (let j = i + 1; j < candidatePack.candidates.length; j += 1) {
    const a = candidatePack.candidates[i];
    const b = candidatePack.candidates[j];
    if (!a?.title || !b?.title) continue;
    const similarity = titleSimilarity(a.title, b.title);
    if (similarity >= sourceConfig.thresholds.title_similarity_review) duplicateCandidates.push({ candidate_a: a.id, candidate_b: b.id, similarity: Math.round(similarity * 100) / 100 });
  }
}

console.log(JSON.stringify({
  schema_version: '1.0',
  edition_id: edition.id,
  workflow: { id: workflowConfig.workflow_id, version: workflowConfig.workflow_version, actor },
  run: candidatePack.run,
  applied: false,
  publication_effect: 'none',
  summary: {
    candidate_count: decisions.length,
    accepted_count: decisions.filter((decision) => decision.status === 'accepted').length,
    needs_review_count: decisions.filter((decision) => decision.status === 'needs_review').length,
    rejected_count: decisions.filter((decision) => decision.status === 'rejected').length
  },
  duplicate_candidates: duplicateCandidates,
  decisions
}, null, 2));
