import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const policy = await readJson('config/recommendation-policy.json');
const profile = await readJson(String(args.get('profile') || 'content/state/reader-profile.json'));
const news = (await readJson(String(args.get('input') || 'public/data/news.json'))).filter((item) => item.status !== 'archived');
const limit = Math.max(1, Number(args.get('limit') || 10));
const asOf = args.get('as-of') ? new Date(String(args.get('as-of'))) : new Date(Math.max(...news.map((item) => new Date(item.published_at).getTime())));
if (Number.isNaN(asOf.getTime())) throw new Error('Invalid ranking as_of');
const maps = Object.fromEntries(Object.entries(profile.affinities || {}).map(([name, values]) => [name, new Map(values.map((item) => [item.key, item.score]))]));
const preferenceFor = (item) => {
  if (!profile.personalization_ready) return { value: 0, reasons: [] };
  const values = [
    ['channel', maps.channels?.get(item.channel_id)],
    ...(item.storyline_ids || []).map((key) => [`storyline:${key}`, maps.storylines?.get(key)]),
    ...(item.tags || []).map((key) => [`tag:${key}`, maps.tags?.get(key)]),
    [`source:${item.source}`, maps.sources?.get(item.source)]
  ].filter(([, value]) => Number.isFinite(value));
  if (!values.length) return { value: 0, reasons: [] };
  return {
    value: values.reduce((sum, [, value]) => sum + value, 0) / values.length,
    reasons: values.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([key, value]) => `${key} ${value >= 0 ? '+' : ''}${value}`)
  };
};

const ranked = news.map((item) => {
  const quality = Number(item.quality_index || 0) * Number(policy.ranking.quality_weight);
  const attention = Number(item.attention_score || 0) * Number(policy.ranking.attention_weight);
  const ageDays = Math.max(0, (asOf.getTime() - new Date(item.published_at).getTime()) / 86_400_000);
  const freshness = Number(policy.ranking.freshness_boost_max) * (0.5 ** (ageDays / Number(policy.ranking.freshness_half_life_days)));
  const preference = preferenceFor(item);
  const preferenceBoost = preference.value * Number(policy.ranking.preference_boost_max);
  const chiefBoost = item.editorial_decision === 'cover_story' ? Number(policy.ranking.chief_cover_boost || 0) : 0;
  const editorBoost = Math.max(
    -Number(policy.ranking.editor_consensus_boost_max || 0),
    Math.min(Number(policy.ranking.editor_consensus_boost_max || 0), Number(item.ranking?.editorial_boost || 0))
  );
  const readerBoost = Math.max(
    -Number(policy.ranking.reader_consensus_boost_max || 0),
    Math.min(Number(policy.ranking.reader_consensus_boost_max || 0), Number(item.ranking?.reader_boost || 0))
  );
  return {
    signal_id: item.id,
    title: item.title,
    channel_id: item.channel_id,
    recommendation_score: Math.round((quality + attention + freshness + chiefBoost + editorBoost + readerBoost + preferenceBoost) * 1000) / 1000,
    components: {
      quality: Math.round(quality * 1000) / 1000,
      attention: Math.round(attention * 1000) / 1000,
      freshness: Math.round(freshness * 1000) / 1000,
      chief: Math.round(chiefBoost * 1000) / 1000,
      editors: Math.round(editorBoost * 1000) / 1000,
      readers: Math.round(readerBoost * 1000) / 1000,
      preference: Math.round(preferenceBoost * 1000) / 1000
    },
    preference_reasons: preference.reasons
  };
}).sort((a, b) => b.recommendation_score - a.recommendation_score || a.signal_id.localeCompare(b.signal_id)).slice(0, limit);

console.log(JSON.stringify({
  schema_version: '1.0',
  policy_version: policy.policy_version,
  as_of: asOf.toISOString(),
  personalization_ready: profile.personalization_ready,
  ranked
}, null, 2));
