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
const previousDayKey = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
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
const newsById = new Map(news.map((item) => [String(item.id || ''), item]));

const maxSignals = Math.max(1, Number(edition.materiality?.max_signals_per_issue || 24));
const maxSignalsPerChannel = Math.max(1, Number(edition.materiality?.max_signals_per_channel || 8));

const eligibleForCoverage = (start, end) => news.filter((item) => {
  if (item?.editorial_status !== 'adopted') return false;
  const key = shanghaiDateKey(item.published_at || item.event_date || '');
  return key && key >= start && key <= end;
});

const rankIssueSignals = (left, right) => {
  const coverPriority = Number(right.editorial_decision === 'cover_story') - Number(left.editorial_decision === 'cover_story');
  if (coverPriority) return coverPriority;
  const importance = (item) => Number(item.quality_index || 0)
    + Number(item.ranking?.editorial_boost || 0)
    + Number(item.ranking?.reader_boost || 0);
  const importanceDifference = importance(right) - importance(left);
  if (importanceDifference) return importanceDifference;
  const adopted = new Date(right.adopted_at || 0).getTime() - new Date(left.adopted_at || 0).getTime();
  if (adopted) return adopted;
  return new Date(right.published_at || 0).getTime() - new Date(left.published_at || 0).getTime();
};

const channelCounts = (items) => {
  const counts = new Map();
  for (const item of items) {
    const channelId = String(item.channel_id || 'unassigned');
    counts.set(channelId, (counts.get(channelId) || 0) + 1);
  }
  return counts;
};

const selectFinalSignals = (items) => {
  const selected = [];
  const selectedByChannel = new Map();
  for (const item of [...items].sort(rankIssueSignals)) {
    const channelId = String(item.channel_id || 'unassigned');
    const channelCount = selectedByChannel.get(channelId) || 0;
    if (channelCount >= maxSignalsPerChannel || selected.length >= maxSignals) continue;
    selected.push(item);
    selectedByChannel.set(channelId, channelCount + 1);
  }
  return { selected, selectedByChannel };
};

const finalizeIssue = (issue) => {
  const eligible = eligibleForCoverage(issue.coverage_start, issue.coverage_end);
  const { selected, selectedByChannel } = selectFinalSignals(eligible);
  const cover = selected[0] || null;
  return {
    ...issue,
    status: 'published',
    lifecycle: 'frozen',
    frozen_at: issue.frozen_at || cycle.opened_at,
    selection_mode: 'final_editorial_ranking',
    cover_signal_id: cover ? String(cover.id) : '',
    signal_ids: selected.map((item) => String(item.id)),
    methodology: {
      ...(issue.methodology || {}),
      candidate_count: eligible.length,
      selected_count: selected.length,
      editorial_adoption_count: eligible.length,
      cover_story_count: selected.filter((item) => item.editorial_decision === 'cover_story').length,
      editor_review_count: selected.reduce((sum, item) => sum + Number(item.ranking?.editor_review_count || 0), 0),
      qualified_reader_feedback_count: selected.reduce((sum, item) => sum + Number(item.ranking?.reader_feedback_count || 0), 0),
      selected_by_channel: Object.fromEntries(selectedByChannel),
      final_issue_max_signals: maxSignals,
      final_channel_max_signals: maxSignalsPerChannel,
      finalized: true,
      fixed_length: false
    }
  };
};

const amendPreviousFrozenIssue = (issue) => {
  const eligible = eligibleForCoverage(issue.coverage_start, issue.coverage_end);
  const existingIds = (issue.signal_ids || []).map(String);
  const existingIdSet = new Set(existingIds);
  const lateAdoptions = [...eligible]
    .filter((item) => !existingIdSet.has(String(item.id || '')))
    .sort(rankIssueSignals);
  if (!lateAdoptions.length) return issue;

  const amendedIds = [...existingIds, ...lateAdoptions.map((item) => String(item.id))];
  const amendedSignals = amendedIds.map((id) => newsById.get(id)).filter(Boolean);
  const selectedByChannel = channelCounts(amendedSignals);
  return {
    ...issue,
    signal_ids: amendedIds,
    editorially_revised_at: now.toISOString(),
    revision_note: issue.revision_note || '主编在下一刊期内补录属于本刊期覆盖窗口的迟到录用稿件；原封面与既有篇目顺序保持不变。',
    methodology: {
      ...(issue.methodology || {}),
      candidate_count: eligible.length,
      selected_count: amendedSignals.length,
      editorial_adoption_count: eligible.length,
      cover_story_count: amendedSignals.filter((item) => item.editorial_decision === 'cover_story').length,
      editor_review_count: amendedSignals.reduce((sum, item) => sum + Number(item.ranking?.editor_review_count || 0), 0),
      qualified_reader_feedback_count: amendedSignals.reduce((sum, item) => sum + Number(item.ranking?.reader_feedback_count || 0), 0),
      selected_by_channel: Object.fromEntries(selectedByChannel),
      editorial_view_changed: true,
      post_freeze_amendment_count: Number(issue.methodology?.post_freeze_amendment_count || 0) + lateAdoptions.length
    }
  };
};

const normalizedIssues = issues.map((issue) => {
  if (issue?.lifecycle !== 'live') return issue;
  if (issue.coverage_start === cycle.start && issue.coverage_end === cycle.end) return issue;
  return finalizeIssue(issue);
});

// A frozen Issue is normally immutable. The immediately preceding Issue gets one
// bounded grace window: while the next Issue is live, chief adoptions whose source
// date belongs to that previous coverage window are appended as explicit amendments.
// Older Issues remain hard-frozen, and existing cover/order are never recomputed.
const previousCoverageEnd = previousDayKey(cycle.start);
const previousFrozenIssue = normalizedIssues.find((issue) =>
  issue?.lifecycle === 'frozen' && issue.coverage_end === previousCoverageEnd
) || null;
const amendedIssues = previousFrozenIssue
  ? normalizedIssues.map((issue) => String(issue.id || '') === String(previousFrozenIssue.id || '') ? amendPreviousFrozenIssue(issue) : issue)
  : normalizedIssues;

const eligible = eligibleForCoverage(cycle.start, cycle.end);
const liveSelected = [...eligible].sort(rankIssueSignals);
const liveSelectedByChannel = channelCounts(liveSelected);
const currentIndex = amendedIssues.findIndex((issue) => issue.coverage_start === cycle.start && issue.coverage_end === cycle.end);
const currentExisting = currentIndex >= 0 ? amendedIssues[currentIndex] : null;
const maxIssueNumber = amendedIssues.reduce((max, issue) => Math.max(max, Number(issue.issue_number || 0)), 0);
const issueNumber = Number(currentExisting?.issue_number || (maxIssueNumber + 1));
const cover = liveSelected[0] || null;
const selectedIds = liveSelected.map((item) => String(item.id));
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
  selection_mode: 'live_editorial_evaluation',
  edition_version: edition.schema_version,
  title: cover?.title || `Issue ${issueNumber} · 本期编选中`,
  standfirst: cover
    ? `${cover.short_summary || cover.long_summary || ''} 本期持续追踪相关进展，封面与篇目将随重要性更新。`
    : '本期已进入出版周期。重要进展将在完成编辑审阅后陆续进入本期。',
  judgment: liveSelected.length
    ? '本期刊期仍在开放评估中；所有已录用进展均向读者与编辑开放，封面与最终篇目将在刊期结束时按重要性收敛。'
    : '本期尚无已录用文章，编辑部持续追踪关键进展。',
  cover_signal_id: cover ? String(cover.id) : '',
  signal_ids: selectedIds,
  storyline_updates: [],
  what_to_watch: (edition.storylines || []).flatMap((storyline) => storyline.watch_for || []).slice(0, 3),
  ranking: {
    version: 'live-v3',
    policy: 'all_adopted_visible_until_freeze_then_chief_cover_then_evidence_quality_then_editor_consensus_then_reader_signal_then_recency',
    authority_order: ['evidence_gate', 'editor_in_chief', 'editor_consensus', 'reader_consensus']
  },
  methodology: {
    candidate_count: eligible.length,
    selected_count: liveSelected.length,
    editorial_adoption_count: eligible.length,
    evaluation_pool_count: liveSelected.length,
    cover_story_count: liveSelected.filter((item) => item.editorial_decision === 'cover_story').length,
    editor_review_count: liveSelected.reduce((sum, item) => sum + Number(item.ranking?.editor_review_count || 0), 0),
    qualified_reader_feedback_count: liveSelected.reduce((sum, item) => sum + Number(item.ranking?.reader_feedback_count || 0), 0),
    selected_by_channel: Object.fromEntries(liveSelectedByChannel),
    final_issue_max_signals: maxSignals,
    final_channel_max_signals: maxSignalsPerChannel,
    finalized: false,
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
  ? amendedIssues.map((entry, index) => index === currentIndex ? issue : entry)
  : [issue, ...amendedIssues];
nextIssues.sort((a, b) => new Date(b.coverage_start || b.published_at || 0).getTime() - new Date(a.coverage_start || a.published_at || 0).getTime());

if (JSON.stringify(nextIssues) !== JSON.stringify(issues)) {
  await writeJson('public/data/issues.json', nextIssues);
  console.log(`Live Issue ${issueNumber} synced: ${liveSelected.length} adopted Signal(s) visible for evaluation, cover ${issue.cover_signal_id || 'none'}, coverage ${cycle.start}..${cycle.end}. Final cap ${maxSignals}/${maxSignalsPerChannel} per channel.`);
  if (previousFrozenIssue) {
    const amendedPrevious = nextIssues.find((entry) => String(entry.id || '') === String(previousFrozenIssue.id || ''));
    const amendmentCount = Number(amendedPrevious?.methodology?.post_freeze_amendment_count || 0)
      - Number(previousFrozenIssue.methodology?.post_freeze_amendment_count || 0);
    if (amendmentCount > 0) console.log(`Previous frozen Issue ${previousFrozenIssue.issue_number} amended with ${amendmentCount} late chief adoption(s).`);
  }
} else {
  console.log(`Live Issue ${issueNumber}: no semantic change.`);
}
