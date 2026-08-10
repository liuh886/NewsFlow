import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scoutConfig = JSON.parse(await readFile(resolve(root, 'config/content-scouts.json'), 'utf8'));
const token = process.env.X_BEARER_TOKEN?.trim();

const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const parseIds = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const maxResults = clampInteger(args.get('max-results'), 10, 10, 100);
const scoutLimit = clampInteger(args.get('scout-limit'), 4, 0, 20);
const deep = args.has('deep');
const configuredTopics = scoutConfig.topic_queries || [];
const configuredScouts = scoutConfig.scouts || [];

const topicById = new Map(configuredTopics.map((item) => [item.id, item]));
const scoutById = new Map(configuredScouts.map((item) => [item.id, item]));

const requestedTopicIds = parseIds(args.get('topic-ids'));
const requestedScoutIds = parseIds(args.get('scout-ids'));
for (const id of requestedTopicIds) if (!topicById.has(id)) throw new Error(`Unknown X topic query: ${id}`);
for (const id of requestedScoutIds) if (!scoutById.has(id)) throw new Error(`Unknown X scout: ${id}`);

const defaultTopics = () => {
  const ai = configuredTopics.find((item) => !(item.layers || []).some((layer) => String(layer).startsWith('ccus-')));
  const ccus = configuredTopics.find((item) => (item.layers || []).some((layer) => String(layer).startsWith('ccus-')));
  return [ai, ccus].filter(Boolean);
};
const scoutBucket = (scout) => {
  const layers = scout.layers || [];
  if (layers.some((layer) => String(layer).startsWith('ccus-'))) return 'ccus';
  if (layers.includes('energy')) return 'energy';
  if (layers.includes('chips') || layers.includes('infrastructure')) return 'chips-infrastructure';
  if (layers.includes('models') || layers.includes('applications')) return 'models-applications';
  return 'other';
};
const defaultScouts = () => {
  const selected = [];
  const families = new Set();
  const buckets = new Set();
  for (const scout of configuredScouts) {
    if (selected.length >= scoutLimit) break;
    const bucket = scoutBucket(scout);
    if (buckets.has(bucket) || families.has(scout.evidence_family)) continue;
    selected.push(scout);
    buckets.add(bucket);
    families.add(scout.evidence_family);
  }
  for (const scout of configuredScouts) {
    if (selected.length >= scoutLimit) break;
    if (selected.some((item) => item.id === scout.id) || families.has(scout.evidence_family)) continue;
    selected.push(scout);
    families.add(scout.evidence_family);
  }
  return selected;
};

const topics = requestedTopicIds.length
  ? requestedTopicIds.map((id) => topicById.get(id))
  : deep ? configuredTopics : defaultTopics();
const scouts = requestedScoutIds.length
  ? requestedScoutIds.map((id) => scoutById.get(id))
  : defaultScouts();

const baseReport = {
  schema_version: '1.0',
  platform: 'X',
  endpoint: 'GET /2/tweets/search/recent',
  runtime: token ? 'native_x' : 'not_run',
  requested_topic_query_ids: topics.map((item) => item.id),
  requested_scout_ids: scouts.map((item) => item.id),
  max_results_per_query: maxResults,
  post_read_count: 0,
  unique_post_count: 0,
  query_runs: [],
  leads: []
};

if (!token) {
  console.log(JSON.stringify({ ...baseReport, reason: 'missing_x_bearer_token' }, null, 2));
  process.exit(0);
}

const leads = new Map();
const queryRuns = [];
let postReadCount = 0;

const extractUrls = (post) => [...new Set((post.entities?.urls || [])
  .map((entry) => entry.unwound_url || entry.expanded_url || entry.url)
  .filter((url) => typeof url === 'string' && /^https:\/\//i.test(url)))];

const runSearch = async ({ type, id, query }) => {
  const url = new URL('https://api.x.com/2/tweets/search/recent');
  url.searchParams.set('query', query);
  url.searchParams.set('max_results', String(maxResults));
  url.searchParams.set('tweet.fields', 'created_at,author_id,entities');
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'name,username');

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000)
    });
  } catch (error) {
    throw new Error(`${type}:${id} request failed: ${error.message}`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.title || `HTTP ${response.status}`;
    throw new Error(`${type}:${id} X API failed: ${detail}`);
  }

  const posts = Array.isArray(payload.data) ? payload.data : [];
  postReadCount += posts.length;
  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  queryRuns.push({ type, id, result_count: posts.length });

  for (const post of posts) {
    const user = users.get(post.author_id) || null;
    const username = user?.username || null;
    const existing = leads.get(post.id) || {
      post_id: post.id,
      created_at: post.created_at || null,
      author_id: post.author_id || null,
      author_username: username,
      author_name: user?.name || null,
      text: post.text || '',
      x_url: username ? `https://x.com/${username}/status/${post.id}` : null,
      linked_urls: extractUrls(post),
      origins: []
    };
    if (!existing.origins.some((origin) => origin.type === type && origin.id === id)) existing.origins.push({ type, id });
    leads.set(post.id, existing);
  }
};

try {
  for (const topic of topics) await runSearch({ type: 'x_topic', id: topic.id, query: topic.native_query });
  for (const scout of scouts) await runSearch({ type: 'x_scout', id: scout.id, query: `from:${scout.handle} -is:retweet` });
} catch (error) {
  console.log(JSON.stringify({
    ...baseReport,
    runtime: 'not_run',
    reason: 'native_x_request_failed',
    error: error.message,
    post_read_count: postReadCount,
    unique_post_count: leads.size,
    query_runs: queryRuns,
    leads: []
  }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({
  ...baseReport,
  runtime: 'native_x',
  post_read_count: postReadCount,
  unique_post_count: leads.size,
  query_runs: queryRuns,
  leads: [...leads.values()].sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
}, null, 2));
