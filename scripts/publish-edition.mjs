import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const force = args.has('force');
const dryRun = args.has('dry-run');
const publicationDate = new Date(args.get('date') || new Date().toISOString().slice(0, 10));

if (Number.isNaN(publicationDate.getTime())) throw new Error('Invalid publication date');

const day = publicationDate.getUTCDate();
if (![1, 15].includes(day) && !force) {
  console.log('Edition publication skipped: today is not the 1st or 15th.');
  process.exit(0);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const edition = await readJson('public/data/edition.json');
const news = await readJson('public/data/news.json');
const storylines = await readJson('public/data/storylines.json');
const issues = await readJson('public/data/issues.json');

const isoDate = (date) => date.toISOString().slice(0, 10);
const dateAtUtc = (year, monthIndex, date) => new Date(Date.UTC(year, monthIndex, date));
const year = publicationDate.getUTCFullYear();
const monthIndex = publicationDate.getUTCMonth();
let coverageStart;
let coverageEnd;

if (day === 15) {
  coverageStart = dateAtUtc(year, monthIndex, 1);
  coverageEnd = dateAtUtc(year, monthIndex, 14);
} else {
  coverageStart = dateAtUtc(year, monthIndex - 1, 16);
  coverageEnd = dateAtUtc(year, monthIndex, 0);
}
const coverageEndExclusive = new Date(coverageEnd.getTime() + 86_400_000);

const issueNumber = monthIndex * 2 + (day === 1 ? 1 : 2);
const issueId = `${edition.id}-${year}-${String(issueNumber).padStart(2, '0')}`;
if (issues.some((issue) => issue.id === issueId) && !force) {
  console.log(`Edition publication skipped: ${issueId} already exists.`);
  process.exit(0);
}

const supabaseUrl = String(process.env.NEWSFLOW_SUPABASE_URL || '').trim();
const supabaseKey = String(process.env.NEWSFLOW_SUPABASE_PUBLISHABLE_KEY || '').trim();
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Formal publication requires NEWSFLOW_SUPABASE_URL and NEWSFLOW_SUPABASE_PUBLISHABLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const { data: adoptionRows, error: adoptionError } = await supabase
  .from('newsflow_editorial_adoptions')
  .select('candidate_id,decision,decided_at')
  .order('decision', { ascending: true })
  .order('decided_at', { ascending: false, nullsFirst: false });
if (adoptionError) throw new Error(`Editorial adoption projection failed: ${adoptionError.message}`);
const adoptions = (Array.isArray(adoptionRows) ? adoptionRows : []).sort((left, right) => {
  const decisionOrder = Number(right.decision === 'cover_story') - Number(left.decision === 'cover_story');
  if (decisionOrder) return decisionOrder;
  return new Date(right.decided_at || 0).getTime() - new Date(left.decided_at || 0).getTime();
});

const candidateById = new Map(news.map((item) => [String(item.id || ''), item]));
const inboxDir = resolve(root, 'content', 'inbox');
try {
  const files = (await readdir(inboxDir)).filter((file) => file.endsWith('.json')).sort();
  for (const file of files) {
    const pack = JSON.parse(await readFile(resolve(inboxDir, file), 'utf8'));
    for (const candidate of pack.candidates || []) {
      const id = String(candidate?.id || '');
      if (id) candidateById.set(id, candidate);
    }
  }
} catch {
  // A publication may have no transient inbox packs yet.
}

const validPublishedAt = (candidate) => {
  const value = candidate?.published_at || candidate?.event_date || '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const inCoverage = (candidate) => {
  const date = validPublishedAt(candidate);
  return Boolean(date && date >= coverageStart && date < coverageEndExclusive);
};

const maxSignals = Math.max(1, Number(edition.materiality?.max_signals_per_issue || 5));
const maxSignalsPerChannel = Math.max(1, Number(edition.materiality?.max_signals_per_channel || maxSignals));
const selected = [];
const selectedByChannel = new Map();
const seen = new Set();
for (const adoption of adoptions) {
  const id = String(adoption?.candidate_id || '');
  if (!id || seen.has(id)) continue;
  const candidate = candidateById.get(id);
  if (!candidate || !inCoverage(candidate)) continue;
  const channelId = String(candidate.channel_id || 'unassigned');
  const channelCount = selectedByChannel.get(channelId) || 0;
  if (channelCount >= maxSignalsPerChannel || selected.length >= maxSignals) continue;
  selected.push({ candidate, adoption });
  selectedByChannel.set(channelId, channelCount + 1);
  seen.add(id);
}

const coverSelection = selected.find(({ adoption }) => adoption.decision === 'cover_story') || null;
const orderedSelected = coverSelection
  ? [coverSelection, ...selected.filter((entry) => entry !== coverSelection)]
  : selected;

const deriveSource = (candidate) => {
  if (candidate.source) return String(candidate.source);
  try {
    const host = new URL(String(candidate.url || '')).hostname.replace(/^www\./, '');
    if (host === 'reuters.com') return 'Reuters';
    if (host.endsWith('energy.gov')) return 'U.S. Department of Energy';
    return host || 'Editorial source';
  } catch {
    return 'Editorial source';
  }
};
const deriveQuality = (candidate) => {
  const direct = Number(candidate.quality_index);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const scores = Object.values(candidate.scores || {}).map(Number).filter(Number.isFinite);
  return scores.length
    ? Number(((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 2).toFixed(1))
    : 8.0;
};
const normalizePublishedSignal = (candidate) => ({
  id: String(candidate.id),
  channel_id: String(candidate.channel_id || ''),
  storyline_ids: Array.isArray(candidate.storyline_ids) ? candidate.storyline_ids.map(String) : [],
  event_type: String(candidate.event_type || ''),
  event_date: String(candidate.event_date || candidate.published_at || '').slice(0, 10),
  title: String(candidate.title || ''),
  url: String(candidate.url || ''),
  source: deriveSource(candidate),
  published_at: String(candidate.published_at || candidate.event_date || ''),
  quality_index: deriveQuality(candidate),
  source_tier: String(candidate.source_tier || 'Tier B'),
  short_summary: String(candidate.short_summary || candidate.summary || ''),
  long_summary: String(candidate.long_summary || candidate.short_summary || candidate.summary || ''),
  key_quote: String(candidate.key_quote || ''),
  supporting_quotes: Array.isArray(candidate.supporting_quotes) ? candidate.supporting_quotes.map(String) : [],
  tags: Array.isArray(candidate.tags) ? candidate.tags.map(String) : []
});

const publishedNewsById = new Map(news.map((item) => [String(item.id || ''), item]));
for (const { candidate } of orderedSelected) {
  const id = String(candidate.id || '');
  if (!id) continue;
  const existing = publishedNewsById.get(id);
  publishedNewsById.set(id, existing ? { ...existing, ...normalizePublishedSignal(candidate) } : normalizePublishedSignal(candidate));
}
const nextNews = [...publishedNewsById.values()].sort((left, right) =>
  (validPublishedAt(right)?.getTime() || 0) - (validPublishedAt(left)?.getTime() || 0)
    || String(left.id || '').localeCompare(String(right.id || ''))
);

const selectedSignals = orderedSelected.map(({ candidate }) => normalizePublishedSignal(candidate));
const storylineUpdates = (edition.storylines || []).map((definition) => {
  const explicitMatches = selectedSignals.filter((item) => (item.storyline_ids || []).includes(definition.id));
  const keywordMatches = selectedSignals.filter((item) => {
    if (Array.isArray(item.storyline_ids) && item.storyline_ids.length) return false;
    const itemText = `${item.title} ${item.short_summary || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
    return (definition.keywords || []).some((keyword) => itemText.includes(String(keyword).toLowerCase()));
  });
  const evidenceCount = explicitMatches.length + keywordMatches.length;
  return {
    storyline_id: definition.id,
    movement: evidenceCount ? 'evidence_added' : 'unchanged',
    note: evidenceCount
      ? `本期有 ${evidenceCount} 条主编录用信号进入该长期议题；自动流程记录变化，但不改写 Edition 文件中的主编判断。`
      : '本期未发现足以改变现有判断的新证据。'
  };
});

const noChange = selectedSignals.length === 0;
const leadSignal = selectedSignals[0] || null;
const title = noChange
  ? '本期未录用足以进入正式刊物的重大信息'
  : leadSignal.title;
const standfirst = noChange
  ? '固定出版并不意味着固定篇幅。本期没有稿件获得主编“封面文章”或“录用”决定，编辑台继续观察。'
  : coverSelection
    ? `本期由主编选定 1 篇封面文章，并录用 ${Math.max(0, selectedSignals.length - 1)} 篇其他稿件。正式刊物只采用明确签发的编辑决定。`
    : `本期由主编录用 ${selectedSignals.length} 篇稿件。正式刊物只采用明确签发的编辑决定。`;
const judgment = noChange
  ? '本期没有新的主编录用决定进入正式刊物；长期议题保持观察。'
  : '主编录用结果已进入正式刊物并更新相关长期议题证据。Edition 文件中的长期判断仍需由主编显式修改。';

const issue = {
  id: issueId,
  issue_number: issueNumber,
  published_at: `${isoDate(publicationDate)}T09:15:00+08:00`,
  coverage_start: isoDate(coverageStart),
  coverage_end: isoDate(coverageEnd),
  status: 'published',
  auto_generated: true,
  selection_mode: 'owner_editorial_decisions',
  edition_version: edition.schema_version,
  title,
  standfirst,
  judgment,
  cover_signal_id: coverSelection ? String(coverSelection.candidate.id) : '',
  signal_ids: selectedSignals.map((item) => item.id),
  storyline_updates: storylineUpdates,
  what_to_watch: (storylines || []).flatMap((storyline) => storyline.watch_for || []).slice(0, 3),
  methodology: {
    candidate_count: [...candidateById.values()].filter(inCoverage).length,
    selected_count: selectedSignals.length,
    editorial_adoption_count: selectedSignals.length,
    cover_story_count: coverSelection ? 1 : 0,
    selected_by_channel: Object.fromEntries(selectedByChannel),
    primary_source_count: selectedSignals.filter((item) => /tier\s*a/i.test(String(item.source_tier || ''))).length,
    fixed_length: false,
    editorial_view_changed: false
  }
};

const nextIssues = [issue, ...issues.filter((entry) => entry.id !== issueId)]
  .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

if (dryRun) {
  console.log(JSON.stringify({ issue, promoted_signal_ids: selectedSignals.map((item) => item.id) }, null, 2));
} else {
  await Promise.all([
    writeFile(resolve(root, 'public/data/news.json'), `${JSON.stringify(nextNews, null, 2)}\n`, 'utf8'),
    writeFile(resolve(root, 'public/data/issues.json'), `${JSON.stringify(nextIssues, null, 2)}\n`, 'utf8')
  ]);
  console.log(`Edition published: ${issueId} (${selectedSignals.length} owner-adopted signals, cover ${issue.cover_signal_id || 'none'}).`);
}
