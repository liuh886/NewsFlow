import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const apply = args.has('apply');
const checkOnly = args.has('check');
const inputArgument = args.get('input');

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const workflowConfig = await readJson('config/content-workflow.json');
const sourceConfig = await readJson('config/content-sources.json');
const discoveryConfig = await readJson('config/content-discovery.json');
const scoutConfig = await readJson('config/content-scouts.json');
const edition = await readJson('public/data/edition.json');
const news = await readJson('public/data/news.json');
const storylines = await readJson('public/data/storylines.json');

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
const hostnameFor = (value) => parsedUrlFor(value)?.hostname.toLowerCase() || '';
const sourceForUrl = (value) => {
  const url = parsedUrlFor(value);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  return sourceConfig.sources.find((source) => {
    const domainMatches = hostname === source.domain || hostname.endsWith(`.${source.domain}`);
    const pathMatches = !source.path_prefixes?.length
      || source.path_prefixes.some((prefix) => pathname.startsWith(String(prefix).toLowerCase()));
    return domainMatches && pathMatches;
  });
};
const scoutForUrl = (value) => {
  const url = parsedUrlFor(value);
  if (!url || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname.toLowerCase())) return null;
  const handle = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  return scoutConfig.scouts?.find((scout) => scout.handle.toLowerCase() === handle) || null;
};
const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|campaign$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim();
  }
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

const configProblems = [];
if (workflowConfig.schema_version !== '1.0') configProblems.push('unsupported content workflow schema_version');
if (workflowConfig.workflow_id !== 'newsflow-content-update') configProblems.push('unsupported content workflow_id');
if (workflowConfig.workflow_version !== '1.0.0') configProblems.push('unsupported content workflow_version');
if (workflowConfig.timezone !== 'Asia/Shanghai') configProblems.push('content workflow timezone must be Asia/Shanghai');
if (workflowConfig.entrypoint !== 'WORKFLOW.md') configProblems.push('content workflow must use WORKFLOW.md as its entrypoint');
if (workflowConfig.exchange_contract?.candidate_pack_schema !== 'schemas/content-candidate-pack.schema.json') {
  configProblems.push('content workflow has an invalid candidate pack schema path');
}
for (const field of ['agent_id', 'runtime', 'workflow_id', 'workflow_version']) {
  if (!workflowConfig.exchange_contract?.required_actor_fields?.includes(field)) configProblems.push(`content workflow actor is missing ${field}`);
}
if (sourceConfig.schema_version !== '1.1') configProblems.push('unsupported source config schema_version');
if (!Array.isArray(sourceConfig.sources) || sourceConfig.sources.length === 0) configProblems.push('source registry is empty');
if (!Array.isArray(sourceConfig.score_dimensions) || sourceConfig.score_dimensions.length !== 5) configProblems.push('score_dimensions must define exactly five dimensions');
for (const field of ['score_min_per_dimension', 'score_mean_min', 'title_similarity_review', 'max_evidence_excerpt_chars']) {
  if (!Number.isFinite(Number(sourceConfig.thresholds?.[field]))) configProblems.push(`invalid threshold ${field}`);
}
const sourceIds = new Set();
const sourceDomains = new Set();
const editionChannelIds = new Set((edition.channels || []).map((channel) => channel.id));
const storylineIds = new Set(storylines.map((storyline) => storyline.id));
for (const source of sourceConfig.sources || []) {
  for (const field of ['id', 'name', 'domain', 'class', 'tier']) requireText(source, field, configProblems);
  if (sourceIds.has(source.id)) configProblems.push(`duplicate source id ${source.id}`);
  if (sourceDomains.has(source.domain)) configProblems.push(`duplicate source domain ${source.domain}`);
  sourceIds.add(source.id);
  sourceDomains.add(source.domain);
  if (!Array.isArray(source.channels) || source.channels.length === 0) configProblems.push(`source ${source.id} has no channels`);
  for (const channelId of source.channels || []) if (!editionChannelIds.has(channelId)) configProblems.push(`source ${source.id} uses unknown channel ${channelId}`);
  if (!Array.isArray(source.storylines) || source.storylines.length === 0) configProblems.push(`source ${source.id} has no Storylines`);
  for (const storylineId of source.storylines || []) if (!storylineIds.has(storylineId)) configProblems.push(`source ${source.id} uses unknown Storyline ${storylineId}`);
  if (!Array.isArray(source.allowed_uses) || source.allowed_uses.length === 0) configProblems.push(`source ${source.id} has no allowed_uses`);
  if (source.path_prefixes?.some((prefix) => typeof prefix !== 'string' || !prefix.startsWith('/'))) configProblems.push(`source ${source.id} has invalid path_prefixes`);
  if (source.class === 'corporate_primary' && !source.leader_watch?.role) configProblems.push(`corporate source ${source.id} has no leader_watch role`);
  if (source.class === 'corporate_primary' && (!Array.isArray(source.limitations) || source.limitations.length === 0)) {
    configProblems.push(`corporate source ${source.id} has no limitations`);
  }
  if (source.report_source === true && (!Array.isArray(source.report_families) || source.report_families.length === 0)) {
    configProblems.push(`report source ${source.id} has no report_families`);
  }
  if ((source.report_source === true || source.stakeholder_source === true) && (!Array.isArray(source.limitations) || source.limitations.length === 0)) {
    configProblems.push(`institutional source ${source.id} has no limitations`);
  }
}
for (const item of news) {
  if (!sourceForUrl(item.url)) configProblems.push(`existing Signal uses unregistered source: ${item.url}`);
}
if (scoutConfig.schema_version !== '1.0') configProblems.push('unsupported scout config schema_version');
if (scoutConfig.platform !== 'X') configProblems.push('scout platform must be X');
if (scoutConfig.default_policy?.promotion !== 'discovery_only'
  || scoutConfig.default_policy?.post_as_evidence !== false
  || scoutConfig.default_policy?.require_canonical_source !== true) {
  configProblems.push('X scouts must remain discovery-only and require canonical sources');
}
const scoutIds = new Set();
const scoutHandles = new Set();
const scoutLayers = new Set(scoutConfig.layers || []);
for (const scout of scoutConfig.scouts || []) {
  for (const field of ['id', 'name', 'handle', 'x_url', 'evidence_family', 'promotion_policy']) requireText(scout, field, configProblems);
  if (scoutIds.has(scout.id)) configProblems.push(`duplicate scout id ${scout.id}`);
  if (scoutHandles.has(String(scout.handle).toLowerCase())) configProblems.push(`duplicate scout handle ${scout.handle}`);
  scoutIds.add(scout.id);
  scoutHandles.add(String(scout.handle).toLowerCase());
  if (scout.promotion_policy !== 'discovery_only') configProblems.push(`scout ${scout.id} is not discovery_only`);
  if (!Array.isArray(scout.layers) || scout.layers.length === 0 || scout.layers.some((layer) => !scoutLayers.has(layer))) {
    configProblems.push(`scout ${scout.id} has invalid layers`);
  }
  if (!Array.isArray(scout.topics) || scout.topics.length === 0) configProblems.push(`scout ${scout.id} has no topics`);
  if (!Array.isArray(scout.allowed_uses) || scout.allowed_uses.length === 0) configProblems.push(`scout ${scout.id} has no allowed_uses`);
  if (!Array.isArray(scout.limitations) || scout.limitations.length === 0) configProblems.push(`scout ${scout.id} has no limitations`);
  if (!Array.isArray(scout.canonical_sources) || scout.canonical_sources.length === 0
    || scout.canonical_sources.some((url) => !parsedUrlFor(url) || /(^|\.)x\.com$|(^|\.)twitter\.com$/i.test(hostnameFor(url)))) {
    configProblems.push(`scout ${scout.id} has invalid canonical_sources`);
  }
  if (scoutForUrl(scout.x_url)?.id !== scout.id) configProblems.push(`scout ${scout.id} x_url does not match its handle`);
}
if (discoveryConfig.schema_version !== '1.0') configProblems.push('unsupported discovery config schema_version');
if (discoveryConfig.timezone !== 'Asia/Shanghai') configProblems.push('discovery timezone must be Asia/Shanghai');
for (const channelId of editionChannelIds) {
  const channelPlan = discoveryConfig.channels?.[channelId];
  if (!channelPlan) {
    configProblems.push(`missing discovery channel ${channelId}`);
    continue;
  }
  if (!channelPlan.cadence || !Number.isFinite(Number(channelPlan.lookback_days))) configProblems.push(`invalid discovery schedule for ${channelId}`);
  for (const storyline of edition.storylines.filter((item) => item.channel_id === channelId)) {
    const plan = channelPlan.storylines?.[storyline.id];
    if (!plan) {
      configProblems.push(`missing discovery plan for ${storyline.id}`);
      continue;
    }
    for (const field of ['source_ids', 'event_types', 'queries', 'counter_queries']) {
      if (!Array.isArray(plan[field]) || plan[field].length === 0) configProblems.push(`discovery ${storyline.id} has no ${field}`);
    }
    for (const sourceId of plan.source_ids || []) {
      const source = sourceConfig.sources.find((item) => item.id === sourceId);
      if (!source) configProblems.push(`discovery ${storyline.id} uses unknown source ${sourceId}`);
      else if (!source.channels.includes(channelId) || !source.storylines.includes(storyline.id)) {
        configProblems.push(`source ${sourceId} is not routed to ${storyline.id}`);
      }
    }
  }
}
if (configProblems.length) throw new Error(`Content source configuration failed:\n- ${configProblems.join('\n- ')}`);

if (checkOnly) {
  console.log(`Content update contract ${workflowConfig.workflow_id}@${workflowConfig.workflow_version} passed: ${sourceConfig.sources.length} trusted sources and ${edition.storylines.length} discovery plans cover ${news.length} existing Signals.`);
  process.exit(0);
}

if (!inputArgument) {
  throw new Error('Missing --input=<candidate-pack.json>. The command is dry-run by default; add --apply to promote accepted Signals.');
}

const inputPath = resolve(root, String(inputArgument));
const inputText = await readFile(inputPath, 'utf8');
const candidatePack = JSON.parse(inputText);
const packProblems = [];
if (candidatePack.schema_version !== '1.0') packProblems.push('unsupported candidate pack schema_version');
if (candidatePack.edition_id !== edition.id) packProblems.push(`edition_id must be ${edition.id}`);
if (!isObject(candidatePack.run)) packProblems.push('missing run');
if (!Array.isArray(candidatePack.candidates)) packProblems.push('candidates must be an array');
const actor = candidatePack.run?.actor;
if (!isObject(actor)) {
  packProblems.push('missing run.actor');
} else {
  for (const field of workflowConfig.exchange_contract.required_actor_fields) requireText(actor, field, packProblems);
  if (actor.workflow_id !== workflowConfig.workflow_id) packProblems.push(`run.actor.workflow_id must be ${workflowConfig.workflow_id}`);
  if (actor.workflow_version !== workflowConfig.workflow_version) packProblems.push(`run.actor.workflow_version must be ${workflowConfig.workflow_version}`);
}

const asOf = toDate(candidatePack.run?.as_of);
const coverageStart = toDate(candidatePack.run?.coverage_start);
const coverageEnd = toDate(candidatePack.run?.coverage_end);
const now = new Date();
const dateInShanghai = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};
if (!asOf) packProblems.push('invalid run.as_of');
if (!coverageStart) packProblems.push('invalid run.coverage_start');
if (!coverageEnd) packProblems.push('invalid run.coverage_end');
if (candidatePack.run?.timezone !== 'Asia/Shanghai') packProblems.push('run.timezone must be Asia/Shanghai');
if (asOf && asOf.getTime() > now.getTime() + 300_000) packProblems.push('as_of must not be in the future');
if (asOf && coverageEnd && coverageEnd > asOf) packProblems.push('coverage_end must not be later than as_of');
if (coverageStart && coverageEnd && coverageStart > coverageEnd) packProblems.push('coverage_start must not be later than coverage_end');
if (packProblems.length) throw new Error(`Candidate pack failed:\n- ${packProblems.join('\n- ')}`);

const existingIds = new Set(news.map((item) => item.id));
const existingUrls = new Set(news.map((item) => normalizeUrl(item.url)));
const candidateIds = new Set();
const candidateUrls = new Set();
const decisions = [];

for (const candidate of candidatePack.candidates) {
  const rejected = [];
  const review = [];
  for (const field of ['id', 'channel_id', 'event_type', 'event_date', 'title', 'url', 'published_at', 'retrieved_at', 'short_summary', 'long_summary']) {
    requireText(candidate, field, rejected);
  }
  if (candidateIds.has(candidate.id)) rejected.push(`duplicate candidate id ${candidate.id}`);
  candidateIds.add(candidate.id);
  const normalizedCandidateUrl = normalizeUrl(candidate.url);
  if (candidateUrls.has(normalizedCandidateUrl)) rejected.push('duplicate source URL in candidate pack');
  candidateUrls.add(normalizedCandidateUrl);
  if (existingIds.has(candidate.id)) rejected.push(`Signal id already exists: ${candidate.id}`);
  if (!hostnameFor(candidate.url)) rejected.push('url must be a valid HTTPS URL');
  if (existingUrls.has(normalizeUrl(candidate.url))) rejected.push('source URL already exists');

  const registeredSource = sourceForUrl(candidate.url);
  const socialScout = scoutForUrl(candidate.url);
  if (socialScout) rejected.push(`X scout ${socialScout.handle} is discovery-only; use the canonical source`);
  if (!registeredSource) review.push('source domain is not in the trusted registry');
  if (!editionChannelIds.has(candidate.channel_id)) rejected.push(`unknown channel ${candidate.channel_id}`);
  if (registeredSource && !registeredSource.channels.includes(candidate.channel_id)) {
    review.push(`source ${registeredSource.id} is not approved for channel ${candidate.channel_id}`);
  }
  const publishedAt = toDate(candidate.published_at);
  const retrievedAt = toDate(candidate.retrieved_at);
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(candidate.event_date || '') ? candidate.event_date : null;
  if (!publishedAt) rejected.push('invalid published_at');
  if (!retrievedAt) rejected.push('invalid retrieved_at');
  if (!eventDate) rejected.push('invalid event_date');
  if (publishedAt && (publishedAt < coverageStart || publishedAt > coverageEnd)) rejected.push('published_at is outside the coverage window');
  if (publishedAt && publishedAt > asOf) rejected.push('published_at is later than as_of');
  if (retrievedAt && retrievedAt > asOf) rejected.push('retrieved_at is later than as_of');
  if (publishedAt && retrievedAt && retrievedAt < publishedAt) rejected.push('retrieved_at is earlier than published_at');
  if (eventDate && eventDate > dateInShanghai(asOf)) rejected.push('event_date is later than as_of in Asia/Shanghai');

  if (candidate.verification?.full_text_accessed !== true) rejected.push('verification.full_text_accessed must be true');
  if (candidate.verification?.summary_supported_sentence_by_sentence !== true) {
    rejected.push('verification.summary_supported_sentence_by_sentence must be true');
  }
  if (registeredSource?.class === 'corporate_primary' && candidate.verification?.attributed_to_source !== true) {
    rejected.push('corporate disclosure requires verification.attributed_to_source=true');
  }
  if (registeredSource?.report_source === true) {
    if (candidate.verification?.attributed_to_source !== true) {
      rejected.push('institutional report requires verification.attributed_to_source=true');
    }
    const reportContext = candidate.verification?.report_context;
    if (!isObject(reportContext)) {
      rejected.push('institutional report requires verification.report_context');
    } else {
      requireText(reportContext, 'report_title', rejected);
      requireText(reportContext, 'report_version', rejected);
      if (reportContext.publication_date_verified !== true) rejected.push('report publication date must be verified');
      requireText(reportContext, 'data_cutoff', rejected);
      const reportDataCutoff = String(reportContext.data_cutoff || '').trim().toLowerCase();
      if (reportDataCutoff && reportDataCutoff !== 'not_disclosed' && !/^\d{4}-\d{2}-\d{2}$/.test(reportDataCutoff)) {
        rejected.push('report data_cutoff must be YYYY-MM-DD or not_disclosed');
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(reportDataCutoff) && reportDataCutoff > dateInShanghai(asOf)) {
        rejected.push('report data_cutoff is later than as_of');
      }
      if (reportContext.methodology_reviewed !== true) rejected.push('report methodology must be reviewed');
      if (reportContext.observed_and_modeled_separated !== true) rejected.push('report facts and modeled outputs must be separated');
      if (reportDataCutoff === 'not_disclosed') {
        review.push('report data cutoff is not disclosed');
      }
    }
  }
  if (registeredSource?.stakeholder_source === true && candidate.verification?.stakeholder_position_attributed !== true) {
    rejected.push('stakeholder report requires verification.stakeholder_position_attributed=true');
  }

  if (!Array.isArray(candidate.tags) || candidate.tags.length === 0 || candidate.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    rejected.push('tags must contain at least one non-empty string');
  }
  if (!Array.isArray(candidate.storyline_ids) || candidate.storyline_ids.length === 0) {
    rejected.push('storyline_ids must contain at least one Storyline');
  } else {
    for (const id of candidate.storyline_ids) {
      if (!storylineIds.has(id)) rejected.push(`unknown Storyline ${id}`);
      const storyline = storylines.find((item) => item.id === id);
      if (storyline && storyline.channel_id !== candidate.channel_id) rejected.push(`Storyline ${id} does not belong to channel ${candidate.channel_id}`);
      if (storyline?.status === 'retired') rejected.push(`Storyline ${id} is retired`);
      if (registeredSource && !registeredSource.storylines.includes(id)) review.push(`source ${registeredSource.id} is not approved for Storyline ${id}`);
    }
  }

  const matchingPlans = (candidate.storyline_ids || []).flatMap((id) => {
    const plan = discoveryConfig.channels?.[candidate.channel_id]?.storylines?.[id];
    return plan ? [plan] : [];
  });
  if (matchingPlans.length && !matchingPlans.some((plan) => plan.event_types.includes(candidate.event_type))) {
    review.push(`event_type ${candidate.event_type} is not defined for the selected Storylines`);
  }

  const dimensionIds = sourceConfig.score_dimensions.map((d) => d.id);
  const scores = candidate.scores;
  if (!isObject(scores)) {
    rejected.push('missing scores');
  } else {
    const scoreValues = [];
    for (const dim of dimensionIds) {
      const value = Number(scores[dim]);
      if (!Number.isFinite(value) || value < 0 || value > 5) {
        rejected.push(`score ${dim} must be between 0 and 5`);
      } else if (value < sourceConfig.thresholds.score_min_per_dimension) {
        rejected.push(`score ${dim} is below minimum ${sourceConfig.thresholds.score_min_per_dimension}`);
      } else {
        scoreValues.push(value);
      }
    }
    const scoreMean = scoreValues.length === dimensionIds.length
      ? scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length
      : null;
    if (scoreMean !== null && scoreMean < sourceConfig.thresholds.score_mean_min) {
      rejected.push(`score mean ${scoreMean.toFixed(1)} is below threshold ${sourceConfig.thresholds.score_mean_min}`);
    }
  }

  if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) {
    rejected.push('evidence must contain at least one claim-level citation');
  } else {
    for (const [index, evidence] of candidate.evidence.entries()) {
      requireText(evidence, 'claim', rejected);
      requireText(evidence, 'source_excerpt', rejected);
      requireText(evidence, 'source_url', rejected);
      if (String(evidence.source_excerpt || '').length > sourceConfig.thresholds.max_evidence_excerpt_chars) {
        rejected.push(`evidence ${index + 1} excerpt is too long`);
      }
      if (!hostnameFor(evidence.source_url)) rejected.push(`evidence ${index + 1} source_url must be HTTPS`);
      const evidenceScout = scoutForUrl(evidence.source_url);
      if (evidenceScout) rejected.push(`evidence ${index + 1} uses discovery-only X scout ${evidenceScout.handle}`);
      if (!sourceForUrl(evidence.source_url)) review.push(`evidence ${index + 1} source is not trusted`);
    }
    if (!candidate.evidence.some((evidence) => normalizeUrl(evidence.source_url) === normalizeUrl(candidate.url))) {
      rejected.push('at least one claim-level citation must point to the candidate source URL');
    }
    const independentEvidence = candidate.evidence.some((evidence) => {
      const evidenceSource = sourceForUrl(evidence.source_url);
      return evidenceSource && registeredSource && evidenceSource.id !== registeredSource.id && evidenceSource.class !== 'corporate_primary';
    });
    const factsScore = Number(scores?.facts);
    if (registeredSource?.class === 'corporate_primary' && factsScore > 4.5 && !independentEvidence) {
      review.push('corporate disclosure needs independent evidence for facts score above 4.5');
    }
  }

  const closest = news
    .map((item) => ({ id: item.id, similarity: titleSimilarity(candidate.title, item.title) }))
    .sort((a, b) => b.similarity - a.similarity)[0];
  if (closest && closest.similarity >= sourceConfig.thresholds.title_similarity_review) {
    review.push(`title resembles existing Signal ${closest.id} (${closest.similarity.toFixed(2)})`);
  }

  const scoreValues = dimensionIds.map((dim) => Number(scores?.[dim])).filter(Number.isFinite);
  const scoreMean = scoreValues.length === dimensionIds.length
    ? scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length
    : 0;
  const status = rejected.length ? 'rejected' : review.length ? 'needs_review' : 'accepted';
  const projectedSignal = status === 'accepted' ? {
    id: candidate.id,
    channel_id: candidate.channel_id,
    storyline_ids: [...new Set(candidate.storyline_ids)],
    event_type: candidate.event_type,
    event_date: candidate.event_date,
    title: candidate.title.trim(),
    url: normalizeUrl(candidate.url),
    source: registeredSource.name,
    published_at: new Date(candidate.published_at).toISOString(),
    quality_index: Math.round(scoreMean * 20) / 10,
    source_tier: registeredSource.tier,
    short_summary: candidate.short_summary.trim(),
    long_summary: candidate.long_summary.trim(),
    key_quote: '',
    supporting_quotes: [],
    tags: [...new Set(candidate.tags.map((tag) => tag.trim()))]
  } : null;
  decisions.push({
    id: candidate.id || null,
    status,
    source_id: registeredSource?.id || null,
    reasons: [...rejected, ...review],
    scores: Object.fromEntries(dimensionIds.map((dim) => [dim, Number(scores?.[dim]) || null])),
    score_mean: scoreValues.length === dimensionIds.length ? Math.round(scoreMean * 10) / 10 : null,
    storyline_ids: candidate.storyline_ids || [],
    verification: candidate.verification || null,
    evidence: candidate.evidence || [],
    projected_signal: projectedSignal
  });
}

const acceptedSignals = decisions.flatMap((decision) => decision.projected_signal ? [decision.projected_signal] : []);
const report = {
  schema_version: '1.0',
  edition_id: edition.id,
  workflow: {
    id: workflowConfig.workflow_id,
    version: workflowConfig.workflow_version,
    actor
  },
  run: candidatePack.run,
  applied: apply,
  summary: {
    candidate_count: decisions.length,
    accepted_count: acceptedSignals.length,
    needs_review_count: decisions.filter((decision) => decision.status === 'needs_review').length,
    rejected_count: decisions.filter((decision) => decision.status === 'rejected').length
  },
  decisions
};

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const inputHash = createHash('sha256').update(inputText).digest('hex').slice(0, 10);
const compactTime = asOf.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');
const reportPath = resolve(root, 'content', 'runs', `${compactTime}-${inputHash}.json`);
await mkdir(dirname(reportPath), { recursive: true });
try {
  await access(reportPath);
  throw new Error(`This candidate pack was already applied: ${reportPath}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const nextNews = [...acceptedSignals, ...news]
  .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
if (acceptedSignals.length) {
  await writeFile(resolve(root, 'public/data/news.json'), `${JSON.stringify(nextNews, null, 2)}\n`, 'utf8');
}
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Content update applied: ${acceptedSignals.length}/${decisions.length} Signals accepted. Audit: ${reportPath}`);
