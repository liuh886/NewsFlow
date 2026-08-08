import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const writeJson = async (path, value) => writeFile(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const pad2 = (value) => String(value).padStart(2, '0');
const dateKey = (year, monthIndex, day) => `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
const asShanghaiParts = (date) => {
  const local = new Date(date.getTime() + TIMEZONE_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    monthIndex: local.getUTCMonth(),
    day: local.getUTCDate()
  };
};
const shanghaiDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const { year, monthIndex, day } = asShanghaiParts(date);
  return dateKey(year, monthIndex, day);
};
const cycleFor = (now = new Date()) => {
  const { year, monthIndex, day } = asShanghaiParts(now);
  const startDay = day < 15 ? 1 : 15;
  const endDay = day < 15 ? 14 : new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const start = dateKey(year, monthIndex, startDay);
  const end = dateKey(year, monthIndex, endDay);
  return {
    year,
    monthIndex,
    start,
    end,
    opened_at: `${start}T00:00:00+08:00`
  };
};

const edition = await readJson('public/data/edition.json');
const news = await readJson('public/data/news.json');
const issues = await readJson('public/data/issues.json');
const now = new Date();
const cycle = cycleFor(now);

const maxSignals = Math.max(1, Number(edition.materiality?.max_signals_per_issue || 5));
const maxSignalsPerChannel = Math.max(1, Number(edition.materiality?.max_signals_per_channel || maxSignals));
const eligible = news.filter((item) => {
  if (item?.editorial_status !== 'adopted') return false;
  const key = shanghaiDateKey(item.published_at || item.event_date || '');
  return key && key >= cycle.start && key <= cycle.end;
});

const rankIssueSignals = (left, right) => {
  const coverPriority = Number(right.editorial_decision === 'cover_story') - Number(left.editorial_decision === 'cover_story');
  if (coverPriority) return coverPriority;
  const quality = Number(right.quality_index || 0) - Number(left.quality_index || 0);
  if (quality) return quality;
  const adopted = new Date(right.adopted_at || 0).getTime() - new Date(left.adopted_at || 0).getTime();
  if (adopted) return adopted;
  return new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime();
};

const selected = [];
const selectedByChannel = new Map();
for (const item of [...eligible].sort(rankIssueSignals)) {
  const channelId = String(item.channel_id || 'unassigned');
  const channelCount = selectedByChannel.get(channelId) || 0;
  if (channelCount >= maxSignalsPerChannel || selected.length >= maxSignals) continue;
  selected.push(item);
  selectedByChannel.set(channelId, channelCount + 1);
}

const frozenIssues = issues.map((issue) => {
  if (issue?.lifecycle !== 'live') return issue;
  if (issue.coverage_start === cycle.start && issue.coverage_end === cycle.end) return issue;
  return {
    ...issue,
    lifecycle: 'frozen',
    frozen_at: issue.frozen_at || cycle.opened_at
  };
});
const currentIndex = frozenIssues.findIndex((issue) => issue.coverage_start === cycle.start && issue.coverage_end === cycle.end);
const currentExisting = currentIndex >= 0 ? frozenIssues[currentIndex] : null;
const maxIssueNumber = frozenIssues.reduce((max, issue) => Math.max(max, Number(issue.issue_number || 0)), 0);
const issueNumber = Number(currentExisting?.issue_number || (maxIssueNumber + 1));
const cover = selected[0] || null;
const selectedIds = selected.map((item) => String(item.id));
const issue = {
  ...(currentExisting || {}),
  id: currentExisting?.id || `${edition.id}-${cycle.year}-${pad2(issueNumber)}`,
  issue_number: issueNumber,
  published_at: currentExisting?.published_at || cycle.opened_at,
  coverage_start: cycle.start,
  coverage_end: cycle.end,
  status: 'published',
  lifecycle: 'live',
  frozen_at: null,
  auto_generated: true,
  selection_mode: 'live_editorial_ranking',
  edition_version: edition.schema_version,
  title: cover?.title || `Issue ${issueNumber} · 本期编选中`,
  standfirst: cover
    ? `${cover.short_summary || cover.long_summary || ''} 本期持续追踪相关进展，封面与篇目将随重要性更新。`
    : '本期已进入出版周期。重要进展将在完成编辑审阅后陆续进入本期。',
  judgment: selected.length
    ? '本期关注正在发生的关键变化；当前封面聚焦此刻最具影响力的进展，后续重大事件可能改变版面重点。'
    : '本期尚无入选文章，编辑部持续追踪关键进展。',
  cover_signal_id: cover ? String(cover.id) : '',
  signal_ids: selectedIds,
  storyline_updates: [],
  what_to_watch: (edition.storylines || []).flatMap((storyline) => storyline.watch_for || []).slice(0, 3),
  ranking: {
    version: 'live-v1',
    policy: 'chief_cover_then_quality_then_recency',
    future_inputs: ['editor_consensus', 'reader_preference']
  },
  methodology: {
    candidate_count: eligible.length,
    selected_count: selected.length,
    editorial_adoption_count: eligible.length,
    cover_story_count: selected.filter((item) => item.editorial_decision === 'cover_story').length,
    selected_by_channel: Object.fromEntries(selectedByChannel),
    fixed_length: false,
    editorial_view_changed: false
  }
};

const comparable = (value) => {
  const clone = structuredClone(value);
  delete clone.updated_at;
  return clone;
};
const semanticChanged = JSON.stringify(comparable(currentExisting || {})) !== JSON.stringify(comparable(issue));
if (semanticChanged) issue.updated_at = now.toISOString();
else if (currentExisting?.updated_at) issue.updated_at = currentExisting.updated_at;

const nextIssues = currentIndex >= 0
  ? frozenIssues.map((entry, index) => index === currentIndex ? issue : entry)
  : [issue, ...frozenIssues];
nextIssues.sort((a, b) => new Date(b.coverage_start || b.published_at || 0).getTime() - new Date(a.coverage_start || a.published_at || 0).getTime());

if (JSON.stringify(nextIssues) !== JSON.stringify(issues)) {
  await writeJson('public/data/issues.json', nextIssues);
  console.log(`Live Issue ${issueNumber} synced: ${selected.length} Signal(s), cover ${issue.cover_signal_id || 'none'}, coverage ${cycle.start}..${cycle.end}.`);
} else {
  console.log(`Live Issue ${issueNumber}: no semantic change.`);
}
