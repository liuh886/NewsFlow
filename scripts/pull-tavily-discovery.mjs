const apiKey = process.env.TAVILY_API_KEY?.trim();
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));

const purpose = String(args.get('purpose') || process.env.TAVILY_PURPOSE || '').trim();
const query = String(args.get('query') || process.env.TAVILY_QUERY || '').trim();
if (!['verify', 'gap', 'social-x'].includes(purpose)) throw new Error('--purpose must be verify, gap, or social-x');
if (!query) throw new Error('--query is required');

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const maxResults = clampInteger(args.get('max-results') || process.env.TAVILY_MAX_RESULTS, 5, 1, 5);
const reserveCredits = clampInteger(args.get('reserve-credits') || process.env.TAVILY_RESERVE_CREDITS, 100, 0, 1000000);
const days = clampInteger(args.get('days') || process.env.TAVILY_DAYS, purpose === 'verify' ? 14 : 7, 1, 31);
const parseDomains = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const includeDomains = purpose === 'social-x' ? ['x.com'] : parseDomains(args.get('include-domains') || process.env.TAVILY_INCLUDE_DOMAINS);
const excludeDomains = parseDomains(args.get('exclude-domains') || process.env.TAVILY_EXCLUDE_DOMAINS);

const base = {
  schema_version: '1.0',
  provider: 'tavily',
  purpose,
  runtime: apiKey ? 'tavily_search' : 'not_run',
  query,
  search_depth: 'basic',
  max_results: maxResults,
  credits_used: 0,
  results: []
};

if (!apiKey) {
  console.log(JSON.stringify({ ...base, reason: 'missing_tavily_api_key' }, null, 2));
  process.exit(0);
}

const headers = { Authorization: `Bearer ${apiKey}` };
let usagePayload;
try {
  const usageResponse = await fetch('https://api.tavily.com/usage', {
    headers,
    signal: AbortSignal.timeout(10_000)
  });
  usagePayload = await usageResponse.json().catch(() => ({}));
  if (!usageResponse.ok) throw new Error(usagePayload?.detail || `HTTP ${usageResponse.status}`);
} catch (error) {
  console.log(JSON.stringify({ ...base, runtime: 'not_run', reason: 'tavily_usage_check_failed', error: error.message }, null, 2));
  process.exit(0);
}

const keyUsage = numberOrZero(usagePayload?.key?.usage);
const keyLimit = numberOrZero(usagePayload?.key?.limit);
const accountPlanUsage = numberOrZero(usagePayload?.account?.plan_usage);
const accountPlanLimit = numberOrZero(usagePayload?.account?.plan_limit);
const budget = keyLimit > 0
  ? { source: 'key', usage: keyUsage, limit: keyLimit }
  : accountPlanLimit > 0
    ? { source: 'account_plan', usage: accountPlanUsage, limit: accountPlanLimit }
    : { source: 'unavailable', usage: 0, limit: 0 };
const remaining = budget.limit > 0 ? Math.max(0, budget.limit - budget.usage) : null;
if (remaining !== null && remaining <= reserveCredits) {
  console.log(JSON.stringify({
    ...base,
    runtime: 'not_run',
    reason: 'tavily_credit_reserve_reached',
    budget_limit_source: budget.source,
    budget_usage: budget.usage,
    budget_limit: budget.limit,
    remaining_credits: remaining,
    reserve_credits: reserveCredits
  }, null, 2));
  process.exit(0);
}

const now = new Date();
const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const end = now.toISOString().slice(0, 10);
const body = {
  query,
  search_depth: 'basic',
  auto_parameters: false,
  max_results: maxResults,
  include_answer: false,
  include_raw_content: false,
  include_usage: true,
  start_date: start,
  end_date: end
};
if (includeDomains.length) body.include_domains = includeDomains;
if (excludeDomains.length) body.exclude_domains = excludeDomains;
if (purpose === 'verify') body.topic = 'news';

let response;
try {
  response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000)
  });
} catch (error) {
  console.log(JSON.stringify({ ...base, runtime: 'not_run', reason: 'tavily_request_failed', error: error.message }, null, 2));
  process.exit(0);
}

const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.log(JSON.stringify({
    ...base,
    runtime: 'not_run',
    reason: 'tavily_api_failed',
    error: payload?.detail || payload?.message || `HTTP ${response.status}`
  }, null, 2));
  process.exit(0);
}

const results = (payload.results || []).slice(0, maxResults).map((item) => ({
  title: item.title || '',
  url: item.url || '',
  published_date: item.published_date || null,
  score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
  content: item.content || ''
}));
const credits = numberOrZero(payload?.usage?.credits);

console.log(JSON.stringify({
  ...base,
  runtime: 'tavily_search',
  credits_used: credits,
  budget_limit_source: budget.source,
  budget_usage_before: budget.usage,
  budget_limit: budget.limit,
  remaining_credits_before: remaining,
  reserve_credits: reserveCredits,
  budget_guard: budget.limit > 0 ? 'provider_limit_and_per_request' : 'per_request_only',
  date_range: { start, end },
  results
}, null, 2));
