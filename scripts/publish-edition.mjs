import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const minimumQuality = Number(edition.materiality?.minimum_quality || 0);
const maxSignals = Number(edition.materiality?.max_signals_per_issue || 5);
const coverageEndExclusive = new Date(coverageEnd.getTime() + 86_400_000);
const candidates = news.filter((item) => {
  const published = new Date(item.published_at);
  return !Number.isNaN(published.getTime()) && published >= coverageStart && published < coverageEndExclusive;
});
const selected = candidates
  .filter((item) => Number(item.quality_index || 0) >= minimumQuality)
  .sort((a, b) => Number(b.quality_index || 0) - Number(a.quality_index || 0))
  .slice(0, maxSignals);

const issueNumber = monthIndex * 2 + (day === 1 ? 1 : 2);
const issueId = `${edition.id}-${year}-${String(issueNumber).padStart(2, '0')}`;
if (issues.some((issue) => issue.id === issueId) && !force) {
  console.log(`Edition publication skipped: ${issueId} already exists.`);
  process.exit(0);
}

const selectedText = selected.map((item) => `${item.title} ${item.short_summary || ''} ${(item.tags || []).join(' ')}`).join(' ').toLowerCase();
const storylineUpdates = (edition.storylines || []).map((definition) => {
  const matches = (definition.keywords || []).filter((keyword) => selectedText.includes(String(keyword).toLowerCase()));
  return {
    storyline_id: definition.id,
    movement: matches.length ? 'evidence_added' : 'unchanged',
    note: matches.length
      ? `本期有 ${matches.length} 个关键词维度出现新增证据；自动流程记录变化，但不改写 Edition 文件中的主编判断。`
      : '本期未发现足以改变现有判断的新证据。'
  };
});

const noChange = selected.length === 0;
const title = noChange
  ? '本期未发现足以改变现有判断的重大信息'
  : selected.length === 1
    ? selected[0].title
    : `${selected[0].title}，${selected.length} 项变化进入本期`;
const standfirst = noChange
  ? '固定出版并不意味着固定篇幅。本期没有信号达到 Edition 的正式出版门槛，长期议题保持观察。'
  : `本期从 ${candidates.length} 条候选信息中采用 ${selected.length} 条。篇幅由信息价值决定，不为版面完整性补充低价值内容。`;
const judgment = noChange
  ? '自动流程没有发现足以挑战或强化主编判断的新增证据；Editorial Desk 继续运行。'
  : '新增证据已进入长期议题记录。主编的既有判断不会被自动流程改写，只有 Edition 文件的新版本能够正式改变刊物立场。';

const issue = {
  id: issueId,
  issue_number: issueNumber,
  published_at: `${isoDate(publicationDate)}T09:15:00+08:00`,
  coverage_start: isoDate(coverageStart),
  coverage_end: isoDate(coverageEnd),
  status: 'published',
  auto_generated: true,
  edition_version: edition.schema_version,
  title,
  standfirst,
  judgment,
  signal_ids: selected.map((item) => item.id),
  storyline_updates: storylineUpdates,
  what_to_watch: (storylines || []).flatMap((storyline) => storyline.watch_for || []).slice(0, 3),
  methodology: {
    candidate_count: candidates.length,
    selected_count: selected.length,
    primary_source_count: selected.filter((item) => /tier\s*a/i.test(String(item.source_tier || ''))).length,
    fixed_length: false,
    editorial_view_changed: false
  }
};

const nextIssues = [issue, ...issues.filter((entry) => entry.id !== issueId)]
  .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

if (dryRun) {
  console.log(JSON.stringify(issue, null, 2));
} else {
  await writeFile(resolve(root, 'public/data/issues.json'), `${JSON.stringify(nextIssues, null, 2)}\n`, 'utf8');
  console.log(`Edition published: ${issueId} (${selected.length}/${candidates.length} signals selected).`);
}
