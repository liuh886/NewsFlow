import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const apply = args.has('apply');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const policy = await readJson('config/recommendation-policy.json');
const eventInput = await readJson(String(args.get('events') || 'content/feedback/events.json'));
const events = Array.isArray(eventInput) ? eventInput : eventInput.events;
if (!Array.isArray(events)) throw new Error('Feedback events input must be an array or an export containing events');
const news = await readJson('public/data/news.json');
const byId = new Map(news.map((item) => [item.id, item]));
const eventDates = events.map((event) => new Date(event.occurred_at)).filter((date) => !Number.isNaN(date.getTime()));
const defaultAsOf = eventDates.length ? new Date(Math.max(...eventDates.map((date) => date.getTime()))) : null;
const asOf = args.get('as-of') ? new Date(String(args.get('as-of'))) : defaultAsOf;
if (asOf && Number.isNaN(asOf.getTime())) throw new Error('Invalid --as-of timestamp');

const halfLife = Number(policy.learning.half_life_days);
const affinityScale = Number(policy.learning.affinity_scale);
const maxAffinity = Number(policy.learning.maximum_absolute_affinity);
const actionCounts = {};
const qualityFlags = [];
const dimensions = { channels: new Map(), storylines: new Map(), tags: new Map(), sources: new Map() };
const touchedSignals = new Set();
const reversedEventIds = new Set(events.filter((event) => event.action === 'restore' && event.target_event_id).map((event) => event.target_event_id));
const activePreferenceEvents = events.filter((event) => !reversedEventIds.has(event.event_id)
  && event.action !== 'restore'
  && Number.isFinite(Number(policy.feedback.allowed_actions[event.action]))
  && Number(policy.feedback.allowed_actions[event.action]) !== 0);
const add = (map, key, weight) => {
  if (!key) return;
  const current = map.get(key) || { weighted_sum: 0, count: 0 };
  current.weighted_sum += weight;
  current.count += 1;
  map.set(key, current);
};

for (const event of events) {
  const item = byId.get(event.signal_id) || {};
  const eventDate = new Date(event.occurred_at);
  if (Number.isNaN(eventDate.getTime()) || !asOf) continue;
  const ageDays = Math.max(0, (asOf.getTime() - eventDate.getTime()) / 86_400_000);
  const decay = 0.5 ** (ageDays / halfLife);
  const baseWeight = Number(policy.feedback.allowed_actions[event.action] ?? 0);
  const weight = baseWeight * decay;
  actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
  if (reversedEventIds.has(event.event_id) || event.action === 'restore') continue;
  touchedSignals.add(event.signal_id);
  if (event.action === 'evidence_issue') qualityFlags.push({ signal_id: event.signal_id, occurred_at: event.occurred_at });
  add(dimensions.channels, event.channel_id || item.channel_id, weight);
  for (const value of event.storyline_ids?.length ? event.storyline_ids : (item.storyline_ids || [])) add(dimensions.storylines, value, weight);
  for (const value of event.tags?.length ? event.tags : (item.tags || [])) add(dimensions.tags, value, weight);
  add(dimensions.sources, event.source || item.source, weight);
}

const serialize = (map) => [...map.entries()].map(([key, value]) => ({
  key,
  score: Math.round(Math.max(-maxAffinity, Math.min(maxAffinity, Math.tanh(value.weighted_sum / affinityScale))) * 1000) / 1000,
  event_count: value.count
})).sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || a.key.localeCompare(b.key));

const profile = {
  schema_version: '1.0',
  policy_version: policy.policy_version,
  generated_as_of: asOf?.toISOString() || null,
  event_count: events.length,
  signal_count: touchedSignals.size,
  personalization_ready: activePreferenceEvents.length >= Number(policy.learning.minimum_events_before_personalization),
  action_counts: actionCounts,
  affinities: {
    channels: serialize(dimensions.channels),
    storylines: serialize(dimensions.storylines),
    tags: serialize(dimensions.tags),
    sources: serialize(dimensions.sources)
  },
  quality_flags: qualityFlags
};

if (apply) {
  await writeFile(resolve(root, 'content/state/reader-profile.json'), `${JSON.stringify(profile, null, 2)}\n`, 'utf8');
  console.log(`Recommendation profile updated from ${events.length} feedback events.`);
} else {
  console.log(JSON.stringify(profile, null, 2));
}
