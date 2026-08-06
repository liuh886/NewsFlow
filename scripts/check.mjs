import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = 'src/editorial-app.js';
const polishPath = 'src/polish.js';
const editionLayerPath = 'src/edition-layer.js';
const languagePolishPath = 'src/language-polish.js';
const publisherPath = 'scripts/publish-edition.mjs';
const contentUpdaterPath = 'scripts/update-content.mjs';
const feedbackImporterPath = 'skills/newsflow-recommender/scripts/import-feedback.mjs';
const profileBuilderPath = 'skills/newsflow-recommender/scripts/build-profile.mjs';
const signalRankerPath = 'skills/newsflow-recommender/scripts/rank-signals.mjs';
const supabaseClientPath = 'src/supabase-feedback.js';
const supabaseCatalogPath = 'scripts/sync-supabase-catalog.mjs';
const supabaseMigrationPath = 'supabase/migrations/20260803232713_create_newsflow_feedback.sql';
const requiredFiles = [
  'index.html',
  appPath,
  polishPath,
  editionLayerPath,
  languagePolishPath,
  supabaseClientPath,
  publisherPath,
  contentUpdaterPath,
  supabaseCatalogPath,
  'src/styles.css',
  'src/polish.css',
  'src/edition-layer.css',
  'public/icon.svg',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/data/news.json',
  'public/data/ai_digest.json',
  'public/data/topics.json',
  'public/data/edition.json',
  'public/data/issues.json',
  'public/data/storylines.json',
  'public/data/supabase-config.json',
  'config/content-sources.json',
  'config/content-discovery.json',
  'config/content-scouts.json',
  'config/content-workflow.json',
  'config/recommendation-policy.json',
  'schemas/content-candidate-pack.schema.json',
  'content/feedback/events.json',
  'content/state/reader-profile.json',
  'skills/newsflow-recommender/SKILL.md',
  'skills/newsflow-recommender/agents/openai.yaml',
  'skills/newsflow-recommender/references/input-map.md',
  feedbackImporterPath,
  profileBuilderPath,
  signalRankerPath,
  'test/fixtures/review-candidates.json',
  'test/fixtures/content-update-duplicate.json',
  'test/fixtures/content-update-actor.json',
  'test/fixtures/content-update-corporate.json',
  'test/fixtures/content-update-institutional.json',
  'test/fixtures/content-update-social-scout.json',
  'test/fixtures/content-update-attention.json',
  'test/fixtures/feedback-export.json',
  'docs/content-update.md',
  'docs/attention-policy.md',
  'docs/domain-watchlist.md',
  'docs/ai-five-layer-watchlist.md',
  'docs/x-scout-watchlist.md',
  'docs/ccus-report-watchlist.md',
  'docs/agent-handoff.md',
  'docs/feedback-loop.md',
  'docs/supabase-feedback-design.md',
  supabaseMigrationPath,
  'supabase/config.toml',
  'supabase/tests/feedback_rls_test.sql',
  '.env.example',
  'WORKFLOW.md',
  'AGENTS.md',
  '.agents/rules/newsflow-content.md',
  '.agents/workflows/update-content.md',
  'editions/reference/edition.yaml',
  'docs/edition-protocol.md',
  '.github/workflows/publish-edition.yml'
];

for (const file of requiredFiles) await access(resolve(root, file));

for (const scriptPath of [appPath, polishPath, editionLayerPath, languagePolishPath, supabaseClientPath, publisherPath, contentUpdaterPath, supabaseCatalogPath, feedbackImporterPath, profileBuilderPath, signalRankerPath, 'public/sw.js']) {
  const syntax = spawnSync(process.execPath, ['--check', resolve(root, scriptPath)], { encoding: 'utf8' });
  if (syntax.status !== 0) throw new Error(`${scriptPath} syntax check failed:\n${syntax.stderr}`);
}

const contentContract = spawnSync(process.execPath, [resolve(root, contentUpdaterPath), '--check'], { encoding: 'utf8' });
if (contentContract.status !== 0) throw new Error(`content update contract failed:\n${contentContract.stderr}`);
const actorFixture = spawnSync(process.execPath, [
  resolve(root, contentUpdaterPath),
  '--input=test/fixtures/content-update-actor.json'
], { cwd: root, encoding: 'utf8' });
if (actorFixture.status === 0 || !actorFixture.stderr.includes('missing run.actor')) {
  throw new Error('candidate pack without portable agent provenance must fail');
}
const duplicateFixture = spawnSync(process.execPath, [
  resolve(root, contentUpdaterPath),
  '--input=test/fixtures/content-update-duplicate.json'
], { cwd: root, encoding: 'utf8' });
if (duplicateFixture.status !== 0) throw new Error(`content update duplicate fixture failed:\n${duplicateFixture.stderr}`);
const duplicateReport = JSON.parse(duplicateFixture.stdout);
if (duplicateReport.summary?.accepted_count !== 0 || duplicateReport.decisions?.[0]?.status !== 'rejected') {
  throw new Error('content update duplicate fixture must be rejected');
}
const corporateFixture = spawnSync(process.execPath, [
  resolve(root, contentUpdaterPath),
  '--input=test/fixtures/content-update-corporate.json'
], { cwd: root, encoding: 'utf8' });
if (corporateFixture.status !== 0) throw new Error(`content update corporate fixture failed:\n${corporateFixture.stderr}`);
const corporateReport = JSON.parse(corporateFixture.stdout);
if (corporateReport.workflow?.id !== 'newsflow-content-update'
  || corporateReport.workflow?.version !== '1.0.0'
  || corporateReport.workflow?.actor?.agent_id !== 'fixture-runner') {
  throw new Error('content update report must preserve portable workflow and actor provenance');
}
const corporateStatuses = corporateReport.decisions?.map((decision) => decision.status);
if (JSON.stringify(corporateStatuses) !== JSON.stringify(['accepted', 'needs_review', 'rejected'])) {
  throw new Error(`content update corporate fixture returned unexpected statuses: ${JSON.stringify(corporateStatuses)}`);
}
const institutionalFixture = spawnSync(process.execPath, [
  resolve(root, contentUpdaterPath),
  '--input=test/fixtures/content-update-institutional.json'
], { cwd: root, encoding: 'utf8' });
if (institutionalFixture.status !== 0) throw new Error(`content update institutional fixture failed:\n${institutionalFixture.stderr}`);
const institutionalReport = JSON.parse(institutionalFixture.stdout);
if (institutionalReport.decisions?.[0]?.status !== 'rejected'
  || !institutionalReport.decisions[0].reasons.includes('institutional report requires verification.report_context')) {
  throw new Error('institutional report fixture must fail without report context');
}
const socialScoutFixture = spawnSync(process.execPath, [
  resolve(root, contentUpdaterPath),
  '--input=test/fixtures/content-update-social-scout.json'
], { cwd: root, encoding: 'utf8' });
if (socialScoutFixture.status !== 0) throw new Error(`content update social scout fixture failed:\n${socialScoutFixture.stderr}`);
const socialScoutReport = JSON.parse(socialScoutFixture.stdout);
if (socialScoutReport.decisions?.[0]?.status !== 'rejected'
  || !socialScoutReport.decisions[0].reasons.includes('X scout simonw is discovery-only; use the canonical source')) {
  throw new Error('X scout fixture must be rejected as a candidate source');
}
const attentionFixture = spawnSync(process.execPath, [
  resolve(root, contentUpdaterPath),
  '--input=test/fixtures/content-update-attention.json'
], { cwd: root, encoding: 'utf8' });
if (attentionFixture.status !== 0) throw new Error(`content update attention fixture failed:\n${attentionFixture.stderr}`);
const attentionReport = JSON.parse(attentionFixture.stdout);
if (attentionReport.decisions?.[0]?.status !== 'rejected'
  || !attentionReport.decisions[0].reasons.includes('missing scores')) {
  throw new Error('candidate without five-dimension scores must be rejected');
}

const feedbackImport = spawnSync(process.execPath, [
  resolve(root, feedbackImporterPath),
  '--input=test/fixtures/feedback-export.json'
], { cwd: root, encoding: 'utf8' });
if (feedbackImport.status !== 0) throw new Error(`feedback import fixture failed:\n${feedbackImport.stderr}`);
const feedbackImportReport = JSON.parse(feedbackImport.stdout);
if (feedbackImportReport.accepted_count !== 5 || feedbackImportReport.rejected_count !== 0 || feedbackImportReport.applied !== false) {
  throw new Error('feedback importer must dry-run and accept the five valid fixture events');
}
const profileBuild = spawnSync(process.execPath, [
  resolve(root, profileBuilderPath),
  '--events=test/fixtures/feedback-export.json'
], { cwd: root, encoding: 'utf8' });
if (profileBuild.status !== 0) throw new Error(`feedback profile fixture failed:\n${profileBuild.stderr}`);
const feedbackProfile = JSON.parse(profileBuild.stdout);
if (feedbackProfile.personalization_ready !== true || feedbackProfile.event_count !== 5
  || feedbackProfile.affinities?.sources?.some((item) => item.key === 'Global CCS Institute')) {
  throw new Error('feedback profile must learn three active preferences and reverse the targeted negative event');
}
const signalRanking = spawnSync(process.execPath, [resolve(root, signalRankerPath), '--limit=3'], { cwd: root, encoding: 'utf8' });
if (signalRanking.status !== 0) throw new Error(`signal ranking failed:\n${signalRanking.stderr}`);
const rankingReport = JSON.parse(signalRanking.stdout);
if (rankingReport.ranked?.length !== 3 || rankingReport.ranked.some((item) => !Number.isFinite(item.recommendation_score))) {
  throw new Error('signal ranking must return deterministic scores');
}

const index = await readFile(resolve(root, 'index.html'), 'utf8');
for (const reference of [
  './styles.css', './polish.css', './edition-layer.css', './editorial-app.js', './supabase-feedback.js', './polish.js', './edition-layer.js', './language-polish.js', './manifest.webmanifest'
]) {
  if (!index.includes(reference)) throw new Error(`index.html is missing ${reference}`);
}
for (const contract of ['mobile-web-app-capable', 'apple-mobile-web-app-capable', 'id="app-status"', 'role="status"', 'aria-atomic="true"']) {
  if (!index.includes(contract)) throw new Error(`index.html is missing ${contract}`);
}
if (index.includes('id="app" aria-live=')) throw new Error('the whole application root must not be an aria-live region');
if (index.includes('./app.js')) throw new Error('index.html still loads the legacy frontend asset');

const news = JSON.parse(await readFile(resolve(root, 'public/data/news.json'), 'utf8'));
const digest = JSON.parse(await readFile(resolve(root, 'public/data/ai_digest.json'), 'utf8'));
const topics = JSON.parse(await readFile(resolve(root, 'public/data/topics.json'), 'utf8'));
const edition = JSON.parse(await readFile(resolve(root, 'public/data/edition.json'), 'utf8'));
const issues = JSON.parse(await readFile(resolve(root, 'public/data/issues.json'), 'utf8'));
const storylines = JSON.parse(await readFile(resolve(root, 'public/data/storylines.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'public/manifest.webmanifest'), 'utf8'));
const editionYaml = await readFile(resolve(root, 'editions/reference/edition.yaml'), 'utf8');
const workflow = JSON.parse(await readFile(resolve(root, 'config/content-workflow.json'), 'utf8'));
const recommendationPolicy = JSON.parse(await readFile(resolve(root, 'config/recommendation-policy.json'), 'utf8'));
const feedbackEvents = JSON.parse(await readFile(resolve(root, 'content/feedback/events.json'), 'utf8'));
const readerProfile = JSON.parse(await readFile(resolve(root, 'content/state/reader-profile.json'), 'utf8'));
const supabaseConfig = JSON.parse(await readFile(resolve(root, 'public/data/supabase-config.json'), 'utf8'));
const packageManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const supabaseMigration = await readFile(resolve(root, supabaseMigrationPath), 'utf8');
const supabaseClient = await readFile(resolve(root, supabaseClientPath), 'utf8');
const supabaseCatalog = await readFile(resolve(root, supabaseCatalogPath), 'utf8');
const buildSource = await readFile(resolve(root, 'scripts/build.mjs'), 'utf8');
const pagesWorkflow = await readFile(resolve(root, '.github/workflows/pages.yml'), 'utf8');
const candidateSchema = JSON.parse(await readFile(resolve(root, 'schemas/content-candidate-pack.schema.json'), 'utf8'));
const portableWorkflow = await readFile(resolve(root, 'WORKFLOW.md'), 'utf8');
const antigravityRule = await readFile(resolve(root, '.agents/rules/newsflow-content.md'), 'utf8');
const antigravityWorkflow = await readFile(resolve(root, '.agents/workflows/update-content.md'), 'utf8');

if (!Array.isArray(news) || news.length < 5) throw new Error('news.json must contain at least five items');
if (!Array.isArray(digest)) throw new Error('ai_digest.json must be an array');
if (!Array.isArray(topics) || topics.length < 3) throw new Error('topics.json must contain the core channels');
if (!manifest.name || !manifest.id || !manifest.start_url || !Array.isArray(manifest.icons)) throw new Error('manifest.webmanifest is incomplete');
if (manifest.lang !== 'zh-CN') throw new Error('manifest language must match the Chinese application shell');
if (!Array.isArray(manifest.categories) || !manifest.categories.includes('news')) throw new Error('manifest must identify NewsFlow as a news application');
if (recommendationPolicy.schema_version !== '1.0' || recommendationPolicy.policy_version !== '1.0.0') {
  throw new Error('recommendation policy identity is invalid');
}
if (recommendationPolicy.cloud_sync?.enabled !== false
  || recommendationPolicy.cloud_sync?.provider !== 'supabase'
  || recommendationPolicy.cloud_sync?.mode !== 'current_state_upsert'
  || recommendationPolicy.cloud_sync?.sync_realtime !== false
  || recommendationPolicy.cloud_sync?.upload_exposure_events !== false) {
  throw new Error('Free-plan cloud feedback must remain disabled, local-first and bounded by current-state upserts');
}
if (!Array.isArray(feedbackEvents) || readerProfile.policy_version !== recommendationPolicy.policy_version) {
  throw new Error('feedback log and generated reader profile are invalid');
}
if (supabaseConfig.schema_version !== '1.0'
  || supabaseConfig.enabled !== false
  || supabaseConfig.url !== ''
  || supabaseConfig.publishable_key !== ''
  || supabaseConfig.maximum_batch_rows > 20
  || supabaseConfig.debounce_seconds < 1) {
  throw new Error('source Supabase configuration must be disabled, credential-free and batch-bounded');
}
if (packageManifest.dependencies?.['@supabase/supabase-js'] !== '2.112.0'
  || packageManifest.devDependencies?.supabase !== '2.111.0'
  || packageManifest.devDependencies?.esbuild !== '0.28.1') {
  throw new Error('Supabase client, CLI and browser bundler must remain exactly pinned');
}
for (const contract of [
  'create table public.signal_catalog',
  'create table public.signal_feedback',
  'create table public.reader_profiles',
  'alter table public.signal_catalog enable row level security',
  'alter table public.signal_feedback enable row level security',
  'alter table public.reader_profiles enable row level security',
  'to authenticated',
  'using ((select auth.uid()) = user_id)',
  'with check ((select auth.uid()) = user_id)',
  'primary key (user_id, edition_id, signal_id)',
  'foreign key (edition_id, signal_id)'
]) {
  if (!supabaseMigration.includes(contract)) throw new Error(`Supabase migration is missing ${contract}`);
}
for (const contract of [
  "createClient(config.url, config.publishable_key",
  "from('signal_feedback').upsert",
  "from('signal_feedback').delete()",
  "signInWithOAuth",
  "provider: config.auth_provider || 'github'",
  'maximum_batch_rows',
  'newsflow_supabase_outbox_v1',
  'newsflow_supabase_sync_suspended_v1'
]) {
  if (!supabaseClient.includes(contract)) throw new Error(`Supabase browser client is missing ${contract}`);
}
if (supabaseClient.includes('SUPABASE_SERVICE_ROLE_KEY') || index.includes('service_role')) {
  throw new Error('privileged Supabase credentials must not be referenced by browser assets');
}
for (const contract of ['SUPABASE_SERVICE_ROLE_KEY', "from('signal_catalog').upsert", "from('signal_catalog')", ".in('signal_id', retiredIds)"]) {
  if (!supabaseCatalog.includes(contract)) throw new Error(`Signal catalog synchronizer is missing ${contract}`);
}
for (const contract of ['NEWSFLOW_SUPABASE_URL', 'NEWSFLOW_SUPABASE_PUBLISHABLE_KEY', "supabaseConfig.enabled = true", "dist, 'data/supabase-config.json'"]) {
  if (!buildSource.includes(contract)) throw new Error(`deployment-only Supabase configuration is missing ${contract}`);
}
for (const contract of ['NEWSFLOW_SUPABASE_URL', 'NEWSFLOW_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'npm run supabase:catalog']) {
  if (!pagesWorkflow.includes(contract)) throw new Error(`Pages workflow is missing ${contract}`);
}
if (workflow.workflow_id !== 'newsflow-content-update' || workflow.workflow_version !== '1.0.0') {
  throw new Error('portable content workflow identity is invalid');
}
if (candidateSchema.properties?.run?.properties?.actor?.properties?.workflow_id?.const !== workflow.workflow_id
  || candidateSchema.properties?.run?.properties?.actor?.properties?.workflow_version?.const !== workflow.workflow_version) {
  throw new Error('candidate schema and portable workflow identity are out of sync');
}
if (!portableWorkflow.includes(workflow.workflow_id) || !portableWorkflow.includes(workflow.exchange_contract.candidate_pack_schema)) {
  throw new Error('WORKFLOW.md does not declare the machine workflow and exchange contract');
}
for (const adapter of [antigravityRule, antigravityWorkflow]) {
  if (!adapter.includes('WORKFLOW.md') || !adapter.includes('content-workflow.json')) {
    throw new Error('Antigravity adapter must delegate to the portable workflow and manifest');
  }
}

const requiredFields = ['id', 'channel_id', 'storyline_ids', 'event_type', 'event_date', 'title', 'url', 'source', 'published_at', 'quality_index', 'short_summary', 'long_summary', 'tags'];
const editionChannelIds = new Set((edition.channels || []).map((channel) => channel.id));
const ids = new Set();
for (const [indexNumber, item] of news.entries()) {
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || item[field] === '') throw new Error(`news.json item ${indexNumber} is missing ${field}`);
  }
  if (!Array.isArray(item.tags)) throw new Error(`news.json item ${indexNumber} tags must be an array`);
  if (!editionChannelIds.has(item.channel_id)) throw new Error(`news.json item ${indexNumber} has an invalid channel_id`);
  if (!Array.isArray(item.storyline_ids) || item.storyline_ids.length === 0) throw new Error(`news.json item ${indexNumber} storyline_ids must be a non-empty array`);
  if (!/^https?:\/\//.test(item.url)) throw new Error(`news.json item ${indexNumber} has an invalid URL`);
  if (Number.isNaN(new Date(item.published_at).getTime())) throw new Error(`news.json item ${indexNumber} has an invalid publication date`);
  if (Number.isNaN(new Date(item.event_date).getTime())) throw new Error(`news.json item ${indexNumber} has an invalid event date`);
  if (ids.has(item.id)) throw new Error(`duplicate news id: ${item.id}`);
  ids.add(item.id);
}

for (const field of ['schema_version', 'id', 'name', 'reader_promise', 'editorial_view', 'channels', 'scope', 'source_policy', 'materiality', 'publishing', 'storylines']) {
  if (edition[field] === undefined || edition[field] === null || edition[field] === '') throw new Error(`edition.json is missing ${field}`);
}
if (edition.publishing?.edition?.cadence !== 'twice_monthly') throw new Error('Edition cadence must be twice_monthly');
if (edition.publishing?.edition?.automatic !== true) throw new Error('Edition publication must be automatic');
if (edition.publishing?.edition?.fixed_length !== false) throw new Error('Edition length must remain information-led');
if (edition.publishing?.edition?.manual_review_required !== false) throw new Error('reference Edition must publish without manual review');
if (JSON.stringify(edition.publishing?.edition?.days) !== JSON.stringify([1, 15])) throw new Error('Edition publication days must be 1 and 15');
if (JSON.stringify((edition.channels || []).map((channel) => channel.id)) !== JSON.stringify(['ai-infrastructure', 'ccus-energy-transition'])) {
  throw new Error('Edition must define the AI infrastructure and CCUS/energy transition channels');
}
const fiveLayerStorylines = ['ai-energy-foundation', 'ai-chip-layer', 'ai-infrastructure-layer', 'ai-model-layer', 'ai-application-layer'];
const activeAiStorylineIds = (edition.storylines || [])
  .filter((storyline) => storyline.channel_id === 'ai-infrastructure')
  .map((storyline) => storyline.id);
if (JSON.stringify(activeAiStorylineIds) !== JSON.stringify(fiveLayerStorylines)) {
  throw new Error('AI coverage must follow the Energy, Chips, Infrastructure, Models and Applications layers');
}
if (Number(edition.materiality?.max_signals_per_channel) < 1) throw new Error('Edition must cap Signals per channel');
for (const contract of [
  `schema_version: '${edition.schema_version}'`,
  `id: ${edition.id}`,
  ...(edition.channels || []).map((channel) => `id: ${channel.id}`),
  ...(edition.storylines || []).map((storyline) => `id: ${storyline.id}`)
]) {
  if (!editionYaml.includes(contract)) throw new Error(`edition.yaml and edition.json are out of sync: missing ${contract}`);
}

if (!Array.isArray(storylines) || storylines.length < 3) throw new Error('storylines.json must contain persistent editorial questions');
const storylineIds = new Set(storylines.map((storyline) => storyline.id));
for (const storyline of storylines) {
  for (const field of ['id', 'title', 'question', 'current_view', 'movement', 'last_updated']) {
    if (!storyline[field]) throw new Error(`storyline ${storyline.id || 'unknown'} is missing ${field}`);
  }
  if (!editionChannelIds.has(storyline.channel_id)) throw new Error(`storyline ${storyline.id} has an invalid channel_id`);
}
for (const item of news) {
  for (const storylineId of item.storyline_ids) {
    if (!storylineIds.has(storylineId)) throw new Error(`Signal ${item.id} references unknown storyline ${storylineId}`);
    const storyline = storylines.find((entry) => entry.id === storylineId);
    if (storyline.channel_id !== item.channel_id) throw new Error(`Signal ${item.id} crosses channel boundary through ${storylineId}`);
    if (item.status !== 'archived' && storyline.status === 'retired') throw new Error(`active Signal ${item.id} references retired storyline ${storylineId}`);
  }
}

if (!Array.isArray(issues) || issues.length < 1) throw new Error('issues.json must contain at least one published Issue');
const issueIds = new Set();
for (const issue of issues) {
  for (const field of ['id', 'issue_number', 'published_at', 'coverage_start', 'coverage_end', 'status', 'title', 'standfirst', 'judgment', 'signal_ids', 'storyline_updates', 'methodology']) {
    if (issue[field] === undefined || issue[field] === null || issue[field] === '') throw new Error(`Issue ${issue.id || 'unknown'} is missing ${field}`);
  }
  if (issueIds.has(issue.id)) throw new Error(`duplicate Issue id: ${issue.id}`);
  issueIds.add(issue.id);
  if (issue.auto_generated !== true) throw new Error(`Issue ${issue.id} must expose automatic provenance`);
  if (issue.methodology?.fixed_length !== false) throw new Error(`Issue ${issue.id} must not use fixed length`);
  if (issue.methodology?.editorial_view_changed !== false) throw new Error(`automatic Issue ${issue.id} must not rewrite the editorial view`);
  for (const update of issue.storyline_updates) {
    if (!storylineIds.has(update.storyline_id)) throw new Error(`Issue ${issue.id} references unknown storyline ${update.storyline_id}`);
  }
}

const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
for (const selector of ['.topbar', '.lead-story', '.article-card', '.article-drawer', '@media (max-width: 920px)']) {
  if (!css.includes(selector)) throw new Error(`styles.css is missing ${selector}`);
}

const polishCss = await readFile(resolve(root, 'src/polish.css'), 'utf8');
for (const contract of ['body.is-scrolled .topbar', 'var(--paper) 50%', '.brand-name', 'font-family: var(--font-editorial)', 'scrollbar-gutter: stable', 'content-visibility: auto', 'min-height: 44px', 'body.overlay-active', '@media (forced-colors: active)', '.mobile-search-backdrop', '.feed-list.list .article-tags', '.rail-card.prominent']) {
  if (!polishCss.includes(contract)) throw new Error(`polish.css is missing ${contract}`);
}
if (polishCss.includes('margin-inline: -14px')) throw new Error('polish layer must not reintroduce hover layout shift');
if (polishCss.includes('linear-gradient(155deg, #18283e')) throw new Error('simplified rail must not restore the heavy dashboard card');

const editionCss = await readFile(resolve(root, 'src/edition-layer.css'), 'utf8');
for (const selector of ['.latest-edition-panel', '.edition-identity-card', '.storyline-rail', '.edition-archive', '@media (max-width: 620px)']) {
  if (!editionCss.includes(selector)) throw new Error(`edition-layer.css is missing ${selector}`);
}

const appSource = await readFile(resolve(root, appPath), 'utf8');
if (appSource.includes('SUPABASE_SERVICE_ROLE_KEY') || appSource.includes('service_role')) {
  throw new Error('privileged Supabase credentials must not be referenced by the editorial browser client');
}
if (appSource.includes('NEXUS INTELLIGENCE ONLINE')) throw new Error('legacy Nexus visual language remains in the new frontend');
if (!appSource.includes('escapeHtml')) throw new Error('rendered news content must be escaped');
if (!appSource.includes('repositoryPayload.length ? repositoryPayload : verifiedFallbackItems')) throw new Error('verified fallback must be exclusive and must not be merged into a valid repository payload');
if (appSource.includes('[...verifiedFallbackItems') || appSource.includes('...fallbackItems')) throw new Error('fallback content must not be concatenated with repository payloads');
if (appSource.includes('今日首要信号') || appSource.includes('今日版本')) throw new Error('freshness labels must come from the data snapshot rather than the current date');
for (const contract of [
  recommendationPolicy.feedback.storage_key,
  recommendationPolicy.feedback.hidden_key,
  'feedback-not-interested',
  'feedback-hide',
  'export-feedback',
  'target_event_id',
  '公共记录未删除',
  'newsflow:feedback-changed',
  'newsflow:request-feedback-snapshot',
  'newsflow:sync-status',
  'newsflow:remote-feedback',
  'cloud-sign-in',
  'cloud-clear'
]) {
  if (!appSource.includes(contract)) throw new Error(`PWA feedback loop is missing ${contract}`);
}

const polishSource = await readFile(resolve(root, polishPath), 'utf8');
for (const contract of ["window.scrollY > 18", "classList.toggle('is-scrolled'", "observer.observe(appRoot, { childList: true })", 'appRoot.inert = inert', 'trapSearchFocus', "setAttribute('aria-pressed'", "setAttribute('role', 'search')", "window.addEventListener('offline'", "window.addEventListener('online'", 'mobile-search-backdrop', 'simplifyMasthead', 'simplifySidebar', 'simplifyFeed', 'simplifyRail', 'simplifyDrawer']) {
  if (!polishSource.includes(contract)) throw new Error(`polish.js is missing ${contract}`);
}
if (polishSource.includes('subtree: true')) throw new Error('root rendering observer must not scan the entire application subtree');

const editionSource = await readFile(resolve(root, editionLayerPath), 'utf8');
for (const contract of ['自动出版', '最新刊期', '编辑台', '长期议题', '刊期与判断记录', "observer.observe(appRoot, { childList: true })", 'escapeEditionHtml']) {
  if (!editionSource.includes(contract)) throw new Error(`edition-layer.js is missing ${contract}`);
}
if (editionSource.includes('subtree: true')) throw new Error('Edition observer must stay on root child replacement only');

const languagePolishSource = await readFile(resolve(root, languagePolishPath), 'utf8');
for (const contract of ['信号评分', '机构 / 一手源', 'NewsFlow · 证据视图', "replaceAll('Score ', '评分 ')"]) {
  if (!languagePolishSource.includes(contract)) throw new Error(`language-polish.js is missing ${contract}`);
}
if (languagePolishSource.includes('subtree: true')) throw new Error('language observer must stay on root child replacement only');

const publisherSource = await readFile(resolve(root, publisherPath), 'utf8');
for (const contract of ['[1, 15]', 'max_signals_per_channel', 'storyline_ids', 'selected_by_channel', 'editorial_view_changed: false', '本期未发现足以改变现有判断的重大信息']) {
  if (!publisherSource.includes(contract)) throw new Error(`publish-edition.mjs is missing ${contract}`);
}

const serviceWorker = await readFile(resolve(root, 'public/sw.js'), 'utf8');
for (const asset of ['./editorial-app.js', './supabase-feedback.js', './polish.js', './edition-layer.js', './language-polish.js', './styles.css', './polish.css', './edition-layer.css', './data/edition.json', './data/issues.json', './data/storylines.json', './data/supabase-config.json']) {
  if (!serviceWorker.includes(asset)) throw new Error(`service worker is missing ${asset}`);
}
for (const contract of ['newsflow-editorial-v2.3.1', "event.request.mode === 'navigate'", 'networkFirst', "url.origin !== self.location.origin", 'event.waitUntil(networkUpdate']) {
  if (!serviceWorker.includes(contract)) throw new Error(`service worker is missing ${contract}`);
}
if (serviceWorker.includes("'./app.js'")) throw new Error('service worker still caches the legacy frontend asset');

console.log(`NewsFlow checks passed: ${news.length} Signals, ${storylines.length} Storylines, ${issues.length} autonomous Issues, Edition-defined publication, responsive reader and resilient PWA caching.`);
