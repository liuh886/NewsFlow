const appRoot = document.querySelector('#app');

const escapeEditionHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const editionState = {
  edition: null,
  issues: [],
  storylines: []
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
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};

const latestIssue = () => editionState.issues
  .filter((issue) => issue?.status === 'published')
  .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())[0] || null;

const issueSignals = (issue) => {
  const ids = Array.isArray(issue?.signal_ids) ? issue.signal_ids : [];
  return ids.map((id) => {
    const item = [...document.querySelectorAll('[data-id]')].find((node) => node.dataset.id === id);
    return item ? { id, title: item.getAttribute('aria-label')?.replace(/^深读\s*/, '') || '' } : { id, title: '' };
  });
};

const renderEditionIdentity = (edition) => `
  <section class="sidebar-section edition-identity-section" data-edition-layer="identity">
    <p class="section-label">当前 Edition</p>
    <div class="edition-identity-card">
      <div class="edition-identity-topline"><span>GitHub 原生</span><span class="edition-auto"><span></span>自动出版</span></div>
      <strong>${escapeEditionHtml(edition.short_name || edition.name)}</strong>
      <p>${escapeEditionHtml(edition.strapline || edition.reader_promise)}</p>
      <div class="edition-schedule">每月 1 日与 15 日 · 篇幅服从信息价值</div>
    </div>
  </section>`;

const renderLatestIssue = (edition, issue) => {
  if (!issue) {
    return `<section class="latest-edition-panel" data-edition-layer="latest"><div class="issue-empty"><span>最新刊期</span><h2>首期正在由自动出版流程准备</h2><p>编辑台会继续运行；正式刊期只收录达到 Edition 重要性规则的变化。</p></div></section>`;
  }

  const signals = issueSignals(issue);
  const signalButtons = signals.map((signal, index) => `
    <button class="issue-signal-link" data-action="open" data-id="${escapeEditionHtml(signal.id)}">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <span>${escapeEditionHtml(signal.title || `打开本期信号 ${index + 1}`)}</span>
    </button>`).join('');

  return `<section class="latest-edition-panel" id="latest-edition" data-edition-layer="latest" aria-labelledby="latest-edition-title">
    <div class="issue-header">
      <div>
        <div class="issue-kicker">最新刊期 · 第 ${escapeEditionHtml(issue.issue_number)} 期</div>
        <h2 id="latest-edition-title">${escapeEditionHtml(issue.title)}</h2>
      </div>
      <div class="issue-dates">${escapeEditionHtml(formatEditionDate(issue.coverage_start, { month: 'short', day: 'numeric' }))}—${escapeEditionHtml(formatEditionDate(issue.coverage_end, { month: 'short', day: 'numeric' }))}<br>自动发布于 ${escapeEditionHtml(formatEditionDate(issue.published_at))}</div>
    </div>
    <p class="issue-standfirst">${escapeEditionHtml(issue.standfirst)}</p>
    <div class="issue-grid">
      <div class="issue-judgment"><span class="section-label">本期判断</span><p>${escapeEditionHtml(issue.judgment)}</p></div>
      <div class="issue-method"><span class="section-label">出版记录</span><dl><div><dt>候选</dt><dd>${escapeEditionHtml(issue.methodology?.candidate_count ?? 0)}</dd></div><div><dt>采用</dt><dd>${escapeEditionHtml(issue.methodology?.selected_count ?? 0)}</dd></div><div><dt>主编判断</dt><dd>${issue.methodology?.editorial_view_changed ? '已更新' : '保持不变'}</dd></div></dl></div>
    </div>
    ${signalButtons ? `<div class="issue-signals"><span class="section-label">本期采用信号</span>${signalButtons}</div>` : ''}
    <div class="issue-footer"><span>${escapeEditionHtml(edition.name)}</span><span>固定节奏 · 不固定篇幅 · 可追溯</span></div>
  </section>`;
};

const renderStorylines = () => `
  <section class="rail-card storyline-rail" data-edition-layer="storylines">
    <div class="storyline-heading"><p class="section-label">长期议题</p><span>${editionState.storylines.length}</span></div>
    <div class="storyline-list">
      ${editionState.storylines.map((storyline) => `
        <article class="storyline-item">
          <div class="storyline-meta"><span class="movement ${escapeEditionHtml(storyline.movement)}">${escapeEditionHtml(movementLabel(storyline.movement))}</span><span>${escapeEditionHtml(storyline.evidence_count || 0)} 条证据</span></div>
          <h3>${escapeEditionHtml(storyline.title)}</h3>
          <p>${escapeEditionHtml(storyline.current_view)}</p>
        </article>`).join('')}
    </div>
  </section>`;

const renderArchive = () => {
  const issues = editionState.issues
    .filter((issue) => issue?.status === 'published')
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  return `<section class="edition-archive" data-edition-layer="archive" aria-labelledby="archive-title">
    <div class="archive-heading"><div><span class="section-label">刊期归档</span><h2 id="archive-title">刊期与判断记录</h2></div><p>每一期都是 Edition 文件、数据截止时间与自动出版结果的可追溯快照。</p></div>
    <div class="archive-list">
      ${issues.map((issue) => `<article class="archive-row"><span class="archive-number">${String(issue.issue_number).padStart(2, '0')}</span><div><h3>${escapeEditionHtml(issue.title)}</h3><p>${escapeEditionHtml(issue.standfirst)}</p></div><div class="archive-date">${escapeEditionHtml(formatEditionDate(issue.published_at))}<br>${issue.auto_generated ? '自动生成' : '人工生成'}</div></article>`).join('') || '<p class="archive-empty">尚无已出版刊期。</p>'}
    </div>
  </section>`;
};

const applyEditionLayer = () => {
  const edition = editionState.edition;
  if (!edition || !appRoot?.firstElementChild) return;

  const shell = appRoot.querySelector('.app-shell');
  const main = appRoot.querySelector('.main-column');
  const masthead = appRoot.querySelector('.masthead');
  const sidebar = appRoot.querySelector('.sidebar');
  const rail = appRoot.querySelector('.brief-rail');
  if (!shell || !main || !masthead || !sidebar) return;

  shell.dataset.productModel = 'autonomous-edition';

  const brandStatus = appRoot.querySelector('.brand-status');
  if (brandStatus && !brandStatus.dataset.editionLayer) {
    brandStatus.dataset.editionLayer = 'true';
    brandStatus.innerHTML = '<span class="status-dot"></span>自动出版';
  }

  if (!sidebar.querySelector('[data-edition-layer="identity"]')) {
    sidebar.insertAdjacentHTML('afterbegin', renderEditionIdentity(edition));
  }

  if (!masthead.dataset.editionLayer) {
    masthead.dataset.editionLayer = 'true';
    const kicker = masthead.querySelector('.masthead-kicker');
    const title = masthead.querySelector('.masthead-title');
    const deck = masthead.querySelector('.masthead-deck');
    const meta = masthead.querySelector('.masthead-meta');
    if (kicker) kicker.textContent = 'Edition 定义的情报系统 · GitHub 原生出版';
    if (title) title.textContent = edition.name;
    if (deck) deck.textContent = edition.reader_promise;
    const issue = latestIssue();
    if (meta) meta.innerHTML = `强主编模式<br>${escapeEditionHtml(edition.owner?.editor || '仓库主编')}<br>${issue ? `第 ${escapeEditionHtml(issue.issue_number)} 期` : '出版准备中'}<br>每月 1 日 / 15 日自动出版`;
  }

  if (!main.querySelector('[data-edition-layer="latest"]')) {
    masthead.insertAdjacentHTML('afterend', renderLatestIssue(edition, latestIssue()));
  }

  const leadLabel = appRoot.querySelector('.eyebrow-primary');
  if (leadLabel) leadLabel.textContent = '编辑台首要信号';

  const feedToolbar = appRoot.querySelector('.feed-toolbar');
  if (feedToolbar && !feedToolbar.previousElementSibling?.matches('[data-edition-layer="desk"]')) {
    feedToolbar.insertAdjacentHTML('beforebegin', '<div class="desk-intro" data-edition-layer="desk"><span class="section-label">编辑台</span><p>持续运行的新信号。正式半月刊只采用达到 Edition 重要性门槛的内容。</p></div>');
  }

  if (rail && !rail.querySelector('[data-edition-layer="storylines"]')) {
    rail.insertAdjacentHTML('afterbegin', renderStorylines());
  }

  if (!main.querySelector('[data-edition-layer="archive"]')) {
    main.insertAdjacentHTML('beforeend', renderArchive());
  }
};

const initializeEditionLayer = async () => {
  try {
    const [edition, issues, storylines] = await Promise.all([
      loadEditionJson('./data/edition.json'),
      loadEditionJson('./data/issues.json'),
      loadEditionJson('./data/storylines.json')
    ]);
    editionState.edition = edition;
    editionState.issues = Array.isArray(issues) ? issues : [];
    editionState.storylines = Array.isArray(storylines)
      ? storylines.filter((storyline) => storyline.status !== 'retired')
      : [];
    applyEditionLayer();
  } catch (error) {
    console.warn('NewsFlow Edition layer unavailable:', error);
  }
};

const observer = new MutationObserver(() => applyEditionLayer());
if (appRoot) observer.observe(appRoot, { childList: true });
initializeEditionLayer();
