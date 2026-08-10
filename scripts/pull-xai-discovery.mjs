import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(resolve(root, 'config/content-scouts.json'), 'utf8'));
const apiKey = process.env.XAI_API_KEY?.trim();
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));

const parseIds = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const mode = String(args.get('mode') || process.env.XAI_DISCOVERY_MODE || 'topics');
if (!['topics', 'scouts'].includes(mode)) throw new Error('--mode must be topics or scouts');

const days = clampInteger(args.get('days') || process.env.XAI_DISCOVERY_DAYS, 3, 1, 7);
const maxLeads = clampInteger(args.get('max-leads') || process.env.XAI_DISCOVERY_MAX_LEADS, 6, 1, 8);
const topicById = new Map((config.topic_queries || []).map((item) => [item.id, item]));
const scoutById = new Map((config.scouts || []).map((item) => [item.id, item]));

const requestedTopicIds = parseIds(args.get('topic-ids') || process.env.XAI_DISCOVERY_TOPIC_IDS);
const requestedScoutIds = parseIds(args.get('scout-ids') || process.env.XAI_DISCOVERY_SCOUT_IDS);
for (const id of requestedTopicIds) if (!topicById.has(id)) throw new Error(`Unknown X topic query: ${id}`);
for (const id of requestedScoutIds) if (!scoutById.has(id)) throw new Error(`Unknown X scout: ${id}`);

const defaultTopics = () => {
  const ai = (config.topic_queries || []).find((item) => !(item.layers || []).some((layer) => String(layer).startsWith('ccus-')));
  const ccus = (config.topic_queries || []).find((item) => (item.layers || []).some((layer) => String(layer).startsWith('ccus-')));
  return [ai, ccus].filter(Boolean);
};
const defaultScouts = () => {
  const selected = [];
  const families = new Set();
  for (const scout of config.scouts || []) {
    if (selected.length >= 4) break;
    if (families.has(scout.evidence_family)) continue;
    selected.push(scout);
    families.add(scout.evidence_family);
  }
  return selected;
};

const topics = requestedTopicIds.length ? requestedTopicIds.map((id) => topicById.get(id)) : defaultTopics();
const scouts = requestedScoutIds.length ? requestedScoutIds.map((id) => scoutById.get(id)) : defaultScouts();
const selected = mode === 'topics' ? topics : scouts;
if (!selected.length) throw new Error(`No ${mode} selected`);

const now = new Date();
const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const dateOnly = (value) => value.toISOString().slice(0, 10);
const base = {
  schema_version: '1.0',
  provider: 'xai',
  surface: 'X',
  runtime: apiKey ? 'native_x' : 'not_run',
  mode,
  from_date: dateOnly(from),
  to_date: dateOnly(now),
  topic_query_ids: mode === 'topics' ? selected.map((item) => item.id) : [],
  scout_ids: mode === 'scouts' ? selected.map((item) => item.id) : [],
  request_count: 0,
  x_search_tool_call_count: 0,
  citation_count: 0,
  cost_usd: 0,
  max_leads: maxLeads,
  leads: []
};

if (!apiKey) {
  console.log(JSON.stringify({ ...base, reason: 'missing_xai_api_key' }, null, 2));
  process.exit(0);
}

const searchIntent = mode === 'topics'
  ? selected.map((item) => `- ${item.id}: ${item.native_query}\n  Purpose: ${item.purpose}`).join('\n')
  : selected.map((item) => `- ${item.id}: @${item.handle}; topics: ${(item.topics || []).join(', ')}`).join('\n');

const prompt = `You are a bounded discovery worker for NewsFlow. Use the X Search tool exactly once. Search only the date range configured on the tool.\n\n${mode === 'topics' ? 'Investigate these topic intents' : 'Inspect the allowed scout accounts'}:\n${searchIntent}\n\nReturn a compact answer with at most ${maxLeads} genuinely material leads. Each lead must identify the X post/thread URL, what new problem or claim it surfaces, and any linked canonical artifact worth opening. Do not treat X as evidence and do not invent URLs. If nothing material is found, say so. No web search, images, videos, code execution, or extra research.`;

const tool = {
  type: 'x_search',
  from_date: dateOnly(from),
  to_date: dateOnly(now),
  enable_image_understanding: false,
  enable_video_understanding: false
};
if (mode === 'scouts') tool.allowed_x_handles = selected.map((item) => item.handle).slice(0, 20);

let response;
try {
  response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'grok-4.5',
      input: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: 'required',
      parallel_tool_calls: false,
      reasoning_effort: 'low',
      max_output_tokens: 900,
      store: false
    }),
    signal: AbortSignal.timeout(30_000)
  });
} catch (error) {
  console.log(JSON.stringify({ ...base, runtime: 'not_run', reason: 'xai_request_failed', error: error.message }, null, 2));
  process.exit(0);
}

const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.log(JSON.stringify({
    ...base,
    runtime: 'not_run',
    reason: 'xai_api_failed',
    error: payload?.error?.message || payload?.detail || payload?.message || `HTTP ${response.status}`
  }, null, 2));
  process.exit(0);
}

const output = Array.isArray(payload.output) ? payload.output : [];
const text = output.flatMap((item) => Array.isArray(item.content) ? item.content : [])
  .filter((part) => part?.type === 'output_text' && typeof part.text === 'string')
  .map((part) => part.text)
  .join('\n')
  .trim();
const xSearchCalls = output.filter((item) => item?.type === 'x_search_call').length;
const urls = new Set();
const visit = (value) => {
  if (!value) return;
  if (typeof value === 'string') {
    const matches = value.match(/https:\/\/[^\s)\]}>"']+/g) || [];
    for (const url of matches) if (/^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\//i.test(url)) urls.add(url);
    return;
  }
  if (Array.isArray(value)) return value.forEach(visit);
  if (typeof value === 'object') return Object.values(value).forEach(visit);
};
visit(payload);
const ticks = Number(payload?.usage?.cost_in_usd_ticks || 0);
const costUsd = Number.isFinite(ticks) ? ticks / 10_000_000_000 : 0;

console.log(JSON.stringify({
  ...base,
  runtime: 'native_x',
  request_count: 1,
  x_search_tool_call_count: xSearchCalls,
  citation_count: urls.size,
  cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
  x_urls: [...urls].slice(0, maxLeads),
  synthesis: text
}, null, 2));
