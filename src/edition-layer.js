const appRoot = document.querySelector('#app');
const DATA_TIMEOUT_MS = 5000;

const escapeEditionHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const editionState = {
  edition: null,
  issues: [],
  storylines: [],
  news: [],
  activeStorylineId: '',
  activeIssueId: '',
  activeChannelId: '',
  channelSort: 'newest',
  archiveOpen: false
};

const movementLabel = (movement = '') => ({
  strengthened: '强化',
  weakened: '削弱',
  complicated: '复杂化',
  unchanged: '未改变',
  evidence_added: '新增证据'
}[movement] || '观察中');

const formatEditionDate = (value, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日期未知';
  return new Intl.DateTimeFormat('zh-CN', options).format(date);
};

const loadEditionJson = async (path) => {
  const response = await fetch(path, {
    cache: 'no-store',
    signal: AbortSignal.timeout(DATA_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};

const publishedIssues = () => editionState.issues
  .filter((issue) => issue?.status === 'published')
  .sort((a, b) => new Date(b.coverage_start || b.published_at || 0).getTime() - new Date(a.coverage_start || a.published_at || 0).getTime());

const latestIssue = () => publishedIssues().find((issue) => issue?.lifecycle === 'live') || publishedIssues()[0] || null;
const publishedIssueById = (id) => publishedIssues().find((issue) => String(issue.id || '') === String(id || '')) || null;

const nextPublicationLabel = (issue) => {
  const base = issue?.published_at ? new Date(issue.published_at) : new Date();
  if (Number.isNaN(base.getTime())) return '下一期按半月节奏出版';
  const next = new Date(base);
  if (base.getDate() < 15) next.setDate(15);
  else next.setMonth(base.getMonth() + 1, 1);
  return `下一期 · ${formatEditionDate(next)}`;
};

const signalById = (id) => editionState.news.find((item) => String(item.id || '') === String(id || '')) || null;

const issueSignals = (issue) => {
  const ids = Array.isArray(issue?.signal_ids) ? issue.signal_ids : [];
  return ids.map((id) => {
    const item = signalById(id);
    return { id: String(id), title: String(item?.title || '') };
  });
};

const selectedSignalIds = () => new Set(publishedIssues().flatMap((issue) => issue.signal_ids || []).map(String));

const channelDefinition = (channelId) => (editionState.edition?.channels || []).find((channel) => channel.id === channelId) || null;
const channelStorylines = (channelId) => editionState.storylines.filter((storyline) => storyline.channel_id === channelId);
const channelSignals = (channelId) => editionState.news.filter((item) => item.channel_id === channelId);
const taxonomyLabel = (title = '') => String(title).replace(/^第[一二三四五六七八九十]+层[：:]\s*/, '');

const sortedChannelSignals = (channelId) => {
  const selected = selectedSignalIds();
  const items = [...channelSignals(channelId)];
  if (editionState.channelSort === 'selected') {
    return items.sort((a, b) => Number(selected.has(String(b.id))) - Number(selected.has(String(a.id)))
      || Number(b.quality_index || 0) - Number(a.quality_index || 0)
      || new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
  }
  return items.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    || Number(b.quality_index || 0) - Number(a.quality_index || 0));
};

const readerUtilityState = () => {
  const query = appRoot?.querySelector('#global-search')?.value.trim() || '';
  const activeTopic = appRoot?.querySelector('.sidebar [data-action="topic"].active')?.dataset.value || 'all';
  const activeFilter = appRoot?.querySelector('.sidebar [data-action="filter"].active')?.dataset.value || 'all';
  const activeDate = appRoot?.querySelector('.sidebar [data-action="date"].active')?.dataset.value || 'all';
  const activeEntity = appRoot?.querySelector('.entity-button.active')?.dataset.value || '';
  const active = Boolean(query || activeTopic !== 'all' || activeFilter !== 'all' || activeDate !== 'all' || activeEntity);
  const label = query
    ? `搜索：${query}`
    : activeFilter === 'saved'
      ? '已收藏'
      : activeEntity
        ? `主题：${activeEntity}`
        : '筛选结果';
  return { active, label };
};

const renderPublicationNav = () => `
  <nav class="publication-nav" data-edition-layer="navigation" aria-label="刊物导航">
    <button type="button" data-edition-action="go-home" data-target="current-issue">本期</button>
    <button type="button" data-edition-action="open-section" data-channel-id="ai-infrastructure">AI 基建</button>
    <button type="button" data-edition-action="open-section" data-channel-id="ccus-energy-transition">CCUS 与能源转型</button>
    <button type="button" data-edition-action="open-storylines">长期议题</button>
    <button type="button" data-edition-action="open-archive">目录</button>
  </nav>`;

const renderMastheadSections = () => `
  <div class="masthead-sections" data-edition-layer="masthead-sections" aria-label="主要栏目">
    <button type="button" data-edition-action="open-section" data-channel-id="ai-infrastructure">AI 基建</button>
    <span aria-hidden="true">/</span>
    <button type="button" data-edition-action="open-section" data-channel-id="ccus-energy-transition">CCUS 与能源转型</button>
  </div>`;

const renderFilterHeading = () => `
  <div class="filter-drawer-heading" data-edition-layer="filter-heading">
    <div><span class="section-label">阅读工具</span><strong>筛选与收藏</strong></div>
    <button type="button" data-action="mobile-close" aria-label="关闭筛选">×</button>
  </div>`;

const renderCurrentIssue = (edition, issue) => {
  if (!issue) {
    return `<section class="latest-edition-panel" id="current-issue" data-edition-layer="latest"><div class="issue-empty"><span>Current Issue</span><h2>首期正在准备</h2><p>重要进展将在完成编辑审阅后进入刊物。</p></div></section>`;
  }

  const signals = issueSignals(issue);
  const coverSignalId = String(issue.cover_signal_id || '');
  const coverSignal = signals.find((signal) => signal.id === coverSignalId) || null;
  const secondarySignals = coverSignalId ? signals.filter((signal) => signal.id !== coverSignalId) : signals;
  const signalButtons = secondarySignals.map((signal, index) => `
    <button class="issue-signal-link" data-action="open" data-id="${escapeEditionHtml(signal.id)}">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <span>${escapeEditionHtml(signal.title || `打开本期文章 ${index + 1}`)}</span>
    </button>`).join('');
  const live = issue.lifecycle === 'live';
  const selectionRecord = live
    ? 'LIVE · 动态编排'
    : issue.selection_mode === 'owner_editorial_decisions'
      ? '主编精选'
      : issue.auto_generated ? '正式刊期' : '编辑出版';
  const issueDate = issue.coverage_start && issue.coverage_end
    ? `${formatEditionDate(issue.coverage_start, { month: 'numeric', day: 'numeric' })}—${formatEditionDate(issue.coverage_end, { month: 'numeric', day: 'numeric' })}`
    : formatEditionDate(issue.published_at);

  return `<section class="latest-edition-panel ${coverSignalId ? 'has-cover' : ''}" id="current-issue" data-edition-layer="latest" aria-labelledby="latest-edition-title">
    <div class="issue-topline">
      <span>Issue ${escapeEditionHtml(issue.issue_number)}${live ? ' · CURRENT' : ''}</span>
      <span>${escapeEditionHtml(issueDate)} · ${selectionRecord}</span>
    </div>
    <div class="issue-hero-copy">
      <h2 id="latest-edition-title">${escapeEditionHtml(issue.title)}</h2>
      <p class="issue-standfirst">${escapeEditionHtml(issue.standfirst)}</p>
      ${coverSignal ? `<button class="issue-cover-action" data-action="open" data-id="${escapeEditionHtml(coverSignal.id)}">阅读封面文章 →</button>` : ''}
    </div>
    <div class="issue-judgment-band">
      <span class="section-label">${live ? '当前判断' : '本期判断'}</span>
      <p>${escapeEditionHtml(issue.judgment)}</p>
    </div>
    ${signalButtons ? `<div class="issue-signals"><div class="issue-section-heading"><span>In this issue</span><span>${secondarySignals.length} 篇</span></div>${signalButtons}</div>` : ''}
    <div class="issue-footer"><span>${escapeEditionHtml(edition.name)}</span><button type="button" data-edition-action="open-archive">查看期刊目录 →</button></div>
  </section>`;
};

const renderChannelView = () => {
  const channel = channelDefinition(editionState.activeChannelId);
  if (!channel) return '';
  const storylines = channelStorylines(channel.id);
  const signals = sortedChannelSignals(channel.id);
  const selected = selectedSignalIds();
  const list = signals.slice(0, 10).map((item, index) => `
    <button class="issue-signal-link" data-action="open" data-id="${escapeEditionHtml(item.id)}">
      <span>${selected.has(String(item.id)) ? '选' : String(index + 1).padStart(2, '0')}</span>
      <span>${escapeEditionHtml(item.title)}</span>
    </button>`).join('');

  return `<section class="latest-edition-panel" data-edition-layer="section-view" aria-labelledby="channel-view-title">
    <div class="issue-topline">
      <button type="button" data-edition-action="go-home">← ${escapeEditionHtml(editionState.edition.name)}</button>
      <span>${signals.length} 条信号</span>
    </div>
    <div class="issue-hero-copy">
      <h2 id="channel-view-title">${escapeEditionHtml(channel.name)}</h2>
      <p class="issue-standfirst">${escapeEditionHtml(channel.promise)}</p>
      <div class="masthead-sections" aria-label="${escapeEditionHtml(channel.name)} 子栏目">
        ${storylines.map((storyline, index) => `${index ? '<span aria-hidden="true">/</span>' : ''}<button type="button" data-edition-action="open-storyline" data-storyline-id="${escapeEditionHtml(storyline.id)}">${escapeEditionHtml(taxonomyLabel(storyline.title))}</button>`).join('')}
      </div>
    </div>
    <div class="issue-signals">
      <div class="issue-section-heading">
        <span>${editionState.channelSort === 'selected' ? 'Selected' : 'Chronological'}</span>
        <span class="masthead-sections"><button type="button" data-edition-action="section-sort" data-sort="newest" aria-pressed="${editionState.channelSort === 'newest'}">时间</button><span>/</span><button type="button" data-edition-action="section-sort" data-sort="selected" aria-pressed="${editionState.channelSort === 'selected'}">精选</button></span>
      </div>
      ${list || '<p class="storyline-index-empty">该栏目暂时没有可阅读信号。</p>'}
    </div>
  </section>`;
};

const renderStorylines = () => `
  <section class="rail-card storyline-rail" id="storylines" data-edition-layer="storylines">
    <div class="storyline-heading"><div><p class="section-label">Research Agenda</p><h2>正在演化的判断</h2></div><span>${editionState.storylines.length}</span></div>
    <div class="storyline-list">
      ${editionState.storylines.map((storyline) => `
        <button class="storyline-item" type="button" data-edition-action="open-storyline" data-storyline-id="${escapeEditionHtml(storyline.id)}">
          <div class="storyline-meta"><span class="movement ${escapeEditionHtml(storyline.movement)}">${escapeEditionHtml(movementLabel(storyline.movement))}</span><span>${escapeEditionHtml(storyline.evidence_count || 0)} 条证据</span></div>
          <h3>${escapeEditionHtml(storyline.title)}</h3>
          <p>${escapeEditionHtml(storyline.current_view)}</p>
          <span class="storyline-open">展开证据历史 →</span>
        </button>`).join('')}
    </div>
    <button class="storyline-all" type="button" data-edition-action="open-storylines">查看全部长期议题</button>
  </section>`;

const archiveIssueMeta = (issue) => {
  const start = formatEditionDate(issue.coverage_start || issue.published_at, { year: 'numeric', month: 'numeric', day: 'numeric' });
  const end = issue.coverage_end ? formatEditionDate(issue.coverage_end, { month: 'numeric', day: 'numeric' }) : '';
  if (issue.lifecycle === 'live') return `${start}${end ? `—${end}` : ''} · 本期 · 动态编排`;
  const selection = issue.selection_mode === 'owner_editorial_decisions' ? '主编精选' : issue.auto_generated ? '正式刊期' : '编辑出版';
  return `${start}${end ? `—${end}` : ''} · ${selection}`;
};

const renderArchive = () => {
  const issues = publishedIssues();
  return `<section class="edition-archive" data-edition-layer="archive" aria-labelledby="archive-title">
    <div class="archive-heading"><div><span class="section-label">Contents</span><h2 id="archive-title">期刊目录</h2></div><button type="button" data-edition-action="open-archive">查看全部刊期 →</button></div>
    <div class="archive-list">
      ${issues.slice(0, 4).map((issue) => `<article class="archive-row" data-issue-current="${issue.lifecycle === 'live'}"><span class="archive-number">${String(issue.issue_number).padStart(2, '0')}</span><div><h3>${escapeEditionHtml(issue.title)}</h3><p>${escapeEditionHtml(issue.standfirst)}</p><button class="issue-cover-action" type="button" data-edition-action="open-issue" data-issue-id="${escapeEditionHtml(issue.id)}">${issue.lifecycle === 'live' ? '查看本期' : '阅读本期'} →</button></div><div class="archive-date">${escapeEditionHtml(archiveIssueMeta(issue))}</div></article>`).join('') || '<p class="archive-empty">刊期正在整理。</p>'}
    </div>
  </section>`;
};

const renderStorylineDrawer = () => {
  const storyline = editionState.storylines.find((item) => item.id === editionState.activeStorylineId);
  if (!storyline) return '';
  const watchItems = Array.isArray(storyline.watch_for)
    ? storyline.watch_for
    : (Array.isArray(storyline.watch_next) ? storyline.watch_next : []);
  const falsifiers = Array.isArray(storyline.falsifiers) ? storyline.falsifiers : [];
  return `<div class="edition-overlay" data-edition-action="close-panel"></div><aside class="edition-panel" role="dialog" aria-modal="true" aria-labelledby="storyline-panel-title">
    <div class="edition-panel-head"><span>${escapeEditionHtml(editionState.edition?.short_name || 'Frontier Systems')} · 长期议题</span><button type="button" data-edition-action="close-panel" aria-label="关闭长期议题">×</button></div>
    <div class="edition-panel-body">
      <div class="storyline-meta"><span class="movement ${escapeEditionHtml(storyline.movement)}">${escapeEditionHtml(movementLabel(storyline.movement))}</span><span>${escapeEditionHtml(storyline.evidence_count || 0)} 条证据</span></div>
      <h2 id="storyline-panel-title">${escapeEditionHtml(storyline.title)}</h2>
      <p class="panel-question">${escapeEditionHtml(storyline.question || '')}</p>
      <section><span class="section-label">当前判断</span><p>${escapeEditionHtml(storyline.current_view)}</p></section>
      <section><span class="section-label">下一步观察</span>${watchItems.length ? `<ul>${watchItems.map((item) => `<li>${escapeEditionHtml(item)}</li>`).join('')}</ul>` : '<p>等待新的关键证据。</p>'}</section>
      <section><span class="section-label">可能改变判断的证据</span>${falsifiers.length ? `<ul>${falsifiers.map((item) => `<li>${escapeEditionHtml(item)}</li>`).join('')}</ul>` : '<p>当前没有明确的反向证据条件。</p>'}</section>
      <section><span class="section-label">观察框架</span><p>这里记录证据如何强化、削弱或复杂化当前观点，让长期判断可以沿时间持续检验。</p></section>
    </div>
  </aside>`;
};

const renderIssueDrawer = () => {
  const issue = publishedIssueById(editionState.activeIssueId);
  if (!issue) return '';
  const signals = issueSignals(issue);
  const coverSignalId = String(issue.cover_signal_id || '');
  const coverSignal = signals.find((signal) => signal.id === coverSignalId) || null;
  const otherSignals = coverSignalId ? signals.filter((signal) => signal.id !== coverSignalId) : signals;
  const watchItems = Array.isArray(issue.what_to_watch) ? issue.what_to_watch.filter(Boolean) : [];

  return `<div class="edition-overlay" data-edition-action="close-panel"></div><aside class="edition-panel archive-panel" role="dialog" aria-modal="true" aria-labelledby="issue-panel-title">
    <div class="edition-panel-head"><span>${escapeEditionHtml(editionState.edition?.short_name || 'Frontier Systems')} · Issue ${escapeEditionHtml(issue.issue_number)}${issue.lifecycle === 'live' ? ' · Current' : ''}</span><button type="button" data-edition-action="close-panel" aria-label="关闭刊期">×</button></div>
    <div class="edition-panel-body">
      <span class="section-label">${escapeEditionHtml(archiveIssueMeta(issue))}</span>
      <h2 id="issue-panel-title">${escapeEditionHtml(issue.title)}</h2>
      <p class="panel-question">${escapeEditionHtml(issue.standfirst)}</p>
      <section><span class="section-label">${issue.lifecycle === 'live' ? '当前判断' : '本期判断'}</span><p>${escapeEditionHtml(issue.judgment)}</p></section>
      ${coverSignal ? `<section><span class="section-label">封面文章</span><button class="issue-signal-link" data-action="open" data-id="${escapeEditionHtml(coverSignal.id)}"><span>封面</span><span>${escapeEditionHtml(coverSignal.title || '阅读封面文章')}</span></button></section>` : ''}
      ${otherSignals.length ? `<section><span class="section-label">本期文章</span>${otherSignals.map((signal, index) => `<button class="issue-signal-link" data-action="open" data-id="${escapeEditionHtml(signal.id)}"><span>${String(index + 1).padStart(2, '0')}</span><span>${escapeEditionHtml(signal.title || `本期文章 ${index + 1}`)}</span></button>`).join('')}</section>` : ''}
      ${watchItems.length ? `<section><span class="section-label">接下来关注</span><ul>${watchItems.map((item) => `<li>${escapeEditionHtml(item)}</li>`).join('')}</ul></section>` : ''}
    </div>
  </aside>`;
};

const renderArchiveDrawer = () => {
  if (!editionState.archiveOpen) return '';
  const issues = publishedIssues();
  return `<div class="edition-overlay" data-edition-action="close-panel"></div><aside class="edition-panel archive-panel" role="dialog" aria-modal="true" aria-labelledby="archive-panel-title">
    <div class="edition-panel-head"><span>${escapeEditionHtml(editionState.edition?.short_name || 'Frontier Systems')} · 期刊目录</span><button type="button" data-edition-action="close-panel" aria-label="关闭期刊目录">×</button></div>
    <div class="edition-panel-body">
      <span class="section-label">Table of Contents</span><h2 id="archive-panel-title">全部刊期</h2>
      <p class="panel-question">从正在更新的本期开始，按时间回看每一期的核心判断、封面文章与入选内容。</p>
      <div class="archive-panel-list">${issues.map((issue) => `<article data-issue-current="${issue.lifecycle === 'live'}"><span>${String(issue.issue_number).padStart(2, '0')}</span><div><h3>${escapeEditionHtml(issue.title)}</h3><p>${escapeEditionHtml(issue.standfirst)}</p><small>${escapeEditionHtml(archiveIssueMeta(issue))}</small><button class="issue-cover-action" type="button" data-edition-action="open-issue" data-issue-id="${escapeEditionHtml(issue.id)}">${issue.lifecycle === 'live' ? '查看本期' : '阅读本期'} →</button></div></article>`).join('') || '<p>刊期正在整理。</p>'}</div>
    </div>
  </aside>`;
};

const emitEditionRendered = () => window.dispatchEvent(new CustomEvent('newsflow:edition-rendered'));

const syncEditionPanels = () => {
  const shell = appRoot?.querySelector('.app-shell');
  if (!shell) return;
  shell.querySelectorAll('[data-edition-layer="panel"]').forEach((node) => node.remove());
  const panelMarkup = editionState.activeIssueId
    ? renderIssueDrawer()
    : editionState.activeStorylineId
      ? renderStorylineDrawer()
      : renderArchiveDrawer();
  if (!panelMarkup) {
    emitEditionRendered();
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.dataset.editionLayer = 'panel';
  wrapper.innerHTML = panelMarkup;
  shell.append(wrapper);
  document.body.classList.add('overlay-active');
  requestAnimationFrame(() => wrapper.querySelector('.edition-panel button')?.focus());
  emitEditionRendered();
};

const closeEditionPanels = () => {
  editionState.activeStorylineId = '';
  editionState.activeIssueId = '';
  editionState.archiveOpen = false;
  appRoot?.querySelector('[data-edition-layer="panel"]')?.remove();
  document.body.classList.remove('overlay-active');
  emitEditionRendered();
};

const syncSectionView = (main, masthead, issue, utility) => {
  main.querySelector('[data-edition-layer="section-view"]')?.remove();
  const publicationNodes = [
    main.querySelector('[data-edition-layer="latest"]'),
    main.querySelector('[data-edition-layer="archive"]')
  ].filter(Boolean);
  const utilityNodes = [
    main.querySelector('.lead-story'),
    main.querySelector('.feed-toolbar'),
    main.querySelector('.feed-list'),
    main.querySelector('.empty-state')
  ].filter(Boolean);
  const channel = channelDefinition(editionState.activeChannelId);
  publicationNodes.forEach((node) => { node.hidden = Boolean(channel || utility.active); });
  utilityNodes.forEach((node) => { node.hidden = Boolean(channel || !utility.active); });

  const title = masthead.querySelector('.masthead-title');
  const deck = masthead.querySelector('.masthead-deck');
  const kicker = masthead.querySelector('.masthead-kicker');
  const meta = masthead.querySelector('.masthead-meta');
  const sections = masthead.querySelector('[data-edition-layer="masthead-sections"]');

  if (channel) {
    if (kicker) kicker.textContent = `${editionState.edition.name} · 栏目`;
    if (title) title.textContent = channel.name;
    if (deck) deck.textContent = channel.promise;
    if (meta) meta.innerHTML = `${channelSignals(channel.id).length} signals<br>${editionState.channelSort === 'selected' ? '精选优先' : '按时间排序'}<br>Published with NewsFlow`;
    if (sections) sections.hidden = true;
    masthead.insertAdjacentHTML('afterend', renderChannelView());
  } else {
    const live = issue?.lifecycle === 'live';
    if (kicker) kicker.textContent = utility.active ? `${editionState.edition.name} · 阅读工具` : 'Independent editorial review · 半月刊';
    if (title) title.textContent = editionState.edition.name;
    if (deck) deck.textContent = utility.active ? utility.label : (editionState.edition.strapline || editionState.edition.reader_promise);
    if (meta) meta.innerHTML = utility.active
      ? `Reader tools<br>${escapeEditionHtml(utility.label)}<br>Published with NewsFlow`
      : `${issue ? `Issue ${escapeEditionHtml(issue.issue_number)}` : '刊期准备中'}<br>${issue ? escapeEditionHtml(formatEditionDate(issue.coverage_start || issue.published_at)) : '首期准备中'}<br>${live ? 'Current · 动态更新' : escapeEditionHtml(nextPublicationLabel(issue))}`;
    if (sections) sections.hidden = utility.active;
  }
};

const applyEditionLayer = () => {
  const edition = editionState.edition;
  if (!edition || !appRoot?.firstElementChild) return;

  const shell = appRoot.querySelector('.app-shell');
  const main = appRoot.querySelector('.main-column');
  const masthead = appRoot.querySelector('.masthead');
  const sidebar = appRoot.querySelector('.sidebar');
  const rail = appRoot.querySelector('.brief-rail');
  const lead = appRoot.querySelector('.lead-story');
  const feedToolbar = appRoot.querySelector('.feed-toolbar');
  if (!shell || !main || !masthead || !sidebar) return;

  shell.dataset.productModel = 'magazine-edition';
  const issue = latestIssue();
  const utility = readerUtilityState();

  const brand = appRoot.querySelector('.brand');
  const brandName = appRoot.querySelector('.brand-name');
  const brandStatus = appRoot.querySelector('.brand-status');
  if (brandName) brandName.textContent = edition.short_name || edition.name;
  if (brandStatus) brandStatus.innerHTML = '<span class="status-dot"></span>Published with NewsFlow';
  if (brand) brand.setAttribute('aria-label', `返回 ${edition.name} 首页`);

  const topbarInner = appRoot.querySelector('.topbar-inner');
  if (topbarInner && brand && !topbarInner.querySelector('[data-edition-layer="navigation"]')) {
    brand.insertAdjacentHTML('afterend', renderPublicationNav());
  }

  const mobileMenu = appRoot.querySelector('.mobile-menu-button');
  if (mobileMenu) mobileMenu.setAttribute('aria-label', '打开筛选与收藏');

  if (!sidebar.querySelector('[data-edition-layer="filter-heading"]')) {
    sidebar.insertAdjacentHTML('afterbegin', renderFilterHeading());
  }

  if (!masthead.dataset.editionLayer) masthead.dataset.editionLayer = 'magazine';
  const mastheadCopy = masthead.firstElementChild;
  if (mastheadCopy && !mastheadCopy.querySelector('[data-edition-layer="masthead-sections"]')) {
    mastheadCopy.insertAdjacentHTML('beforeend', renderMastheadSections());
  }

  const firstEditorialAnchor = lead || feedToolbar || main.querySelector('.empty-state');
  if (firstEditorialAnchor && !main.querySelector('[data-edition-layer="latest"]')) {
    firstEditorialAnchor.insertAdjacentHTML('beforebegin', renderCurrentIssue(edition, issue));
  }

  if (lead) {
    const leadLabel = lead.querySelector('.eyebrow-primary');
    if (leadLabel) leadLabel.textContent = utility.label;
    lead.removeAttribute('id');
  }

  let editionSortLabel = '按时间排序';
  if (feedToolbar) {
    feedToolbar.id = 'reader-results';
    const heading = feedToolbar.querySelector('.feed-heading h2');
    const count = feedToolbar.querySelector('.feed-heading span');
    if (heading) heading.textContent = utility.label;
    if (count) {
      if (count.textContent?.includes('按你的反馈排序')) editionSortLabel = '按你的反馈排序';
      const countValue = count.textContent?.match(/\d+/)?.[0] || '0';
      count.textContent = `${editionSortLabel} · ${countValue} 条`;
    }
  }

  const feedList = appRoot.querySelector('.feed-list');
  if (feedList) {
    feedList.classList.add('publication-list');
    feedList.setAttribute('aria-label', `${editionSortLabel}的阅读结果`);
  }

  if (rail) rail.innerHTML = renderStorylines();
  if (!main.querySelector('[data-edition-layer="archive"]')) main.insertAdjacentHTML('beforeend', renderArchive());

  const mobileNav = appRoot.querySelector('.mobile-nav');
  if (mobileNav && !mobileNav.dataset.editionLayer) {
    mobileNav.dataset.editionLayer = 'magazine';
    mobileNav.innerHTML = '<button data-edition-action="go-home" data-target="current-issue"><span>本期</span></button><button data-edition-action="open-section" data-channel-id="ai-infrastructure"><span>AI 基建</span></button><button data-edition-action="open-section" data-channel-id="ccus-energy-transition"><span>CCUS</span></button><button data-edition-action="open-storylines"><span>议题</span></button><button data-edition-action="open-archive"><span>目录</span></button>';
  }

  syncSectionView(main, masthead, issue, utility);
  emitEditionRendered();
};

const setActiveChannel = (channelId, pushHistory = true) => {
  editionState.activeChannelId = channelDefinition(channelId) ? channelId : '';
  editionState.channelSort = 'newest';
  if (pushHistory) {
    const nextHash = editionState.activeChannelId ? `#section/${editionState.activeChannelId}` : `${window.location.pathname}${window.location.search}`;
    if (editionState.activeChannelId) window.history.pushState({ newsflowSection: editionState.activeChannelId }, '', nextHash);
    else window.history.pushState({}, '', `${window.location.pathname}${window.location.search}`);
  }
  applyEditionLayer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const channelFromHash = () => {
  const match = window.location.hash.match(/^#section\/(.+)$/);
  return match && channelDefinition(match[1]) ? match[1] : '';
};

const initializeEditionLayer = async () => {
  try {
    const [edition, issues, storylines, news] = await Promise.all([
      loadEditionJson('./data/edition.json'),
      loadEditionJson('./data/issues.json'),
      loadEditionJson('./data/storylines.json'),
      loadEditionJson('./data/news.json')
    ]);
    editionState.edition = edition;
    editionState.issues = Array.isArray(issues) ? issues : [];
    editionState.storylines = Array.isArray(storylines) ? storylines.filter((storyline) => storyline.status !== 'retired') : [];
    editionState.news = Array.isArray(news) ? news : [];
    editionState.activeChannelId = channelFromHash();
    applyEditionLayer();
  } catch (error) {
    console.warn('NewsFlow Edition layer unavailable:', error);
  }
};

appRoot?.addEventListener('click', (event) => {
  const target = event.target.closest('[data-edition-action]');
  if (!target) return;
  const action = target.dataset.editionAction;
  if (action === 'open-section') {
    setActiveChannel(target.dataset.channelId || '');
  } else if (action === 'go-home') {
    const anchorId = target.dataset.target || '';
    setActiveChannel('', true);
    if (anchorId) requestAnimationFrame(() => document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else if (action === 'section-sort') {
    editionState.channelSort = target.dataset.sort === 'selected' ? 'selected' : 'newest';
    applyEditionLayer();
  } else if (action === 'open-storyline') {
    editionState.activeStorylineId = target.dataset.storylineId || editionState.storylines[0]?.id || '';
    editionState.activeIssueId = '';
    editionState.archiveOpen = false;
    syncEditionPanels();
  } else if (action === 'open-storylines') {
    editionState.activeStorylineId = editionState.storylines[0]?.id || '';
    editionState.activeIssueId = '';
    editionState.archiveOpen = false;
    syncEditionPanels();
  } else if (action === 'open-archive') {
    editionState.archiveOpen = true;
    editionState.activeStorylineId = '';
    editionState.activeIssueId = '';
    syncEditionPanels();
  } else if (action === 'open-issue') {
    editionState.activeIssueId = target.dataset.issueId || '';
    editionState.activeStorylineId = '';
    editionState.archiveOpen = false;
    syncEditionPanels();
  } else if (action === 'close-panel') {
    closeEditionPanels();
  }
});

window.addEventListener('popstate', () => {
  editionState.activeChannelId = channelFromHash();
  applyEditionLayer();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (editionState.activeStorylineId || editionState.activeIssueId || editionState.archiveOpen)) closeEditionPanels();
  else if (event.key === 'Escape' && editionState.activeChannelId) setActiveChannel('', true);
});

window.addEventListener('newsflow:rendered', applyEditionLayer);
initializeEditionLayer();
