const icon = (name) => {
  const icons = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5 8.5 8.5 0 1 0 20.5 15.4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.8 9a2.3 2.3 0 1 1 3.4 2c-.8.45-1.2.9-1.2 2m0 3.25v.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21l-5-3-5 3V4.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    bookmarkFill: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21l-5-3-5 3V4.5Z" fill="currentColor"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7m-7 0h7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reader: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 8H16m-7.5 4H16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="4" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="14" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="14" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  return icons[name] || '';
};

const fallbackItems = [
  {
    id: 'signal-prompts-tech-debt',
    title: '提示词也是技术债务',
    url: 'https://seangoedecke.com/prompts-are-technical-debt-too/',
    source: 'Sean Goedecke',
    published_at: '2026-05-20T00:00:00Z',
    quality_index: 8.7,
    source_tier: 'Tier B',
    short_summary: '提示词并不是一次性配置。随着系统增长，它们会形成隐性依赖、行为耦合与回归风险，需要像代码一样被版本化、测试和维护。',
    long_summary: '文章将提示词视为软件系统的一部分，而不是模型调用之外的临时文本。每一次增加约束、例外或示例，都会扩大后续修改的影响面。对生产级 AI 产品而言，更可靠的做法是为提示词建立版本、评估集、回归测试与清晰的责任边界。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['AI & Tech', 'Engineering', 'LLM']
  },
  {
    id: 'signal-framework-arm',
    title: '适用于 Framework 笔记本电脑的 Arm 主板',
    url: 'https://www.jeffgeerling.com/blog/2026/arm-mainboard-for-framework-laptop/',
    source: 'Jeff Geerling',
    published_at: '2026-04-15T14:49:00Z',
    quality_index: 8.3,
    source_tier: 'Tier B',
    short_summary: 'Framework 13 在同一可维修平台上测试 x86、RISC-V 与 Arm 主板，展示模块化电脑如何把处理器架构选择从整机更换中拆分出来。',
    long_summary: '这项测试的价值不只在性能比较，也在于验证可替换主板能否延长设备生命周期。Arm 主板采用 12 核 SoC 与焊接内存，带来功耗与兼容性之间的新取舍。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['AI & Tech', 'Hardware', 'Arm']
  },
  {
    id: 'signal-raspberry-connect',
    title: '树莓派连接服务或将很快支持控制 Windows 系统',
    url: 'https://www.jeffgeerling.com/blog/2026/raspberry-pi-connect-may-control-windows-soon/',
    source: 'Jeff Geerling',
    published_at: '2026-04-29T17:00:00Z',
    quality_index: 7.8,
    source_tier: 'Tier B',
    short_summary: 'Pi Connect 可能从树莓派远程访问工具扩展到 Windows PC，意味着该服务正在从设备附属功能走向更通用的远程工作入口。',
    long_summary: '服务最初用于解决 Wayland 环境下的远程访问问题。若 Windows 支持正式落地，其产品边界将明显扩大，同时也需要更严格地处理身份验证、端到端安全和设备管理。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['AI & Tech', 'Raspberry Pi', 'Remote Access']
  },
  {
    id: 'signal-token-burn',
    title: '你今天烧掉了多少 Token？',
    url: 'https://idiallo.com/blog/how-many-tokens-did-you-burn-today?src=feed',
    source: 'Ibrahim Diallo',
    published_at: '2026-05-27T00:31:22Z',
    quality_index: 8.1,
    source_tier: 'Tier B',
    short_summary: '用 Token 数衡量开发者价值，和过去用代码行数评价产出一样危险：指标越容易计算，越可能替代真正需要判断的工作质量。',
    long_summary: '文章借用早期管理者统计代码行数的荒谬案例，提醒团队不要把模型调用量直接当作 AI 生产力。更有效的衡量方式应关注任务完成、缺陷率、复用程度与维护成本。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['AI & Tech', 'Productivity', 'Metrics']
  },
  {
    id: 'signal-space-datacenter',
    title: '太空中的 AI 数据中心真的没有散热问题吗？',
    url: 'https://seangoedecke.com/space-ai-datacenters-do-not-have-a-cooling-problem/',
    source: 'Sean Goedecke',
    published_at: '2026-05-13T00:00:00Z',
    quality_index: 8.4,
    source_tier: 'Tier B',
    short_summary: '太空数据中心的约束并不是简单的“没有空气所以无法散热”。真正需要比较的是辐射散热、供电、发射成本与维护难度的组合。',
    long_summary: '讨论把一个看似直觉的问题拆成工程系统：高效散热依赖辐射面积和工作温度，太阳能供电与轨道环境又改变了能源条件。即使热管理可解，经济性和可维护性仍是更大的门槛。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['AI & Tech', 'Energy & Transition', 'Data Center']
  },
  {
    id: 'signal-microsoft-brookfield',
    title: '微软与布鲁克菲尔德签署大型清洁电力协议，为 AI 计算锁定长期供能',
    url: 'https://www.reuters.com/business/energy/microsoft-brookfield-mega-deal-ai-power-2026',
    source: 'Reuters Energy',
    published_at: '2026-03-03T08:00:00Z',
    quality_index: 9.0,
    source_tier: 'Tier A',
    short_summary: 'AI 基础设施正在把电力从一般运营成本变成战略原材料。长期、可交付的清洁电力协议开始承担容量确定性和电网风险管理功能。',
    long_summary: '传统购电协议更关注年度电量匹配，而高负荷 AI 设施需要更稳定的地点、容量和时间属性。大型协议把开发、并网和交付风险更早地纳入供需双方的长期安排。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['Energy & Transition', 'AI Infrastructure', 'Power']
  },
  {
    id: 'signal-superhot-rock',
    title: '地热“超热岩石”路线瞄准高密度、全天候基荷电力',
    url: 'https://www.pnas.org/doi/10.1073/pnas.2400156123',
    source: 'PNAS',
    published_at: '2026-03-10T08:00:00Z',
    quality_index: 8.8,
    source_tier: 'Tier A',
    short_summary: '更高温度意味着单井可获得更大的能量密度。若深部钻井和储层控制能够稳定复制，地热可能突破传统资源区位限制。',
    long_summary: '超热岩石路线试图通过更深、更高温的地层提高每口井的输出，并提供接近基荷的容量因子。关键不确定性仍包括钻井寿命、材料耐久性、储层管理和全生命周期成本。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['Energy & Transition', 'Geothermal', 'Baseload']
  },
  {
    id: 'signal-csrd-greenhushing',
    title: 'CSRD 数据暴露“绿色沉默”：企业披露更多，却减少前瞻性承诺',
    url: 'https://www.reuters.com/sustainability/eu-csrd-year-two-data-greenhushing-2026-03-10/',
    source: 'Reuters Sustainability',
    published_at: '2026-03-10T09:00:00Z',
    quality_index: 8.0,
    source_tier: 'Tier A',
    short_summary: '更严格、可审计的披露制度提高了事实透明度，也可能让企业对未经验证的长期目标更加谨慎，形成“数据更多、口号更少”的新均衡。',
    long_summary: '当目标表述进入审计、诉讼和竞争环境后，企业倾向于保留可验证的历史数据，同时减少具体但难以保证实现的远期承诺。这并不必然代表减排投入下降，却改变了可持续传播方式。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['Energy & Transition', 'ESG', 'Disclosure']
  },
  {
    id: 'signal-cbam-issb',
    title: '企业开始复用 ISSB 数据完成 CBAM 碳成本计算',
    url: 'https://www.energypost.eu/eu-cbam-phase-two-issb-reports-carbon-cost-calculation-2026-04-05/',
    source: 'Energy Post',
    published_at: '2026-04-05T08:00:00Z',
    quality_index: 7.6,
    source_tier: 'Tier B',
    short_summary: '可持续披露正在从报告负担转化为可复用的数据底座。相同的设施级排放数据可以服务财务披露、跨境碳成本与内部经营决策。',
    long_summary: 'ISSB 与 CBAM 对排放边界、设施和活动数据存在可衔接部分。统一数据治理能够减少重复收集与口径冲突，也让高质量碳数据产生更直接的商业价值。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['Energy & Transition', 'CBAM', 'ISSB']
  },
  {
    id: 'signal-gulf-ccus',
    title: '美国墨西哥湾沿岸 CCUS 枢纽集中推进，网络效应成为项目经济性的关键',
    url: 'https://www.bloomberg.com/news/articles/2026-03-10/gulf-coast-carbon-capture-hubs-fid-louisiana-texas',
    source: 'Bloomberg',
    published_at: '2026-03-10T10:00:00Z',
    quality_index: 8.2,
    source_tier: 'Tier A',
    short_summary: '多个排放源共享运输和封存基础设施，可以分摊首发成本并提高利用率，但也把接口、调度与长期责任推到治理前台。',
    long_summary: '枢纽化使 CCUS 从单项目工程转向跨主体网络。投资决策不仅取决于捕集成本，还受到运输容量、注入节奏、合同分配、政策激励和封存责任安排影响。',
    key_quote: '',
    supporting_quotes: [],
    tags: ['Energy & Transition', 'CCUS', 'Infrastructure']
  }
];

const state = {
  items: [],
  topics: [
    { id: 'all', name: '全部信号' },
    { id: 'ai-tech', name: 'AI 与科技' },
    { id: 'energy', name: '能源与转型' }
  ],
  topic: 'all',
  filter: 'all',
  query: '',
  entity: '',
  date: 'all',
  view: localStorage.getItem('newsflow_view') || 'list',
  theme: localStorage.getItem('newsflow_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  bookmarks: new Set(JSON.parse(localStorage.getItem('newsflow_bookmarks') || '[]')),
  activeArticle: null,
  focusedIndex: -1,
  helpOpen: false,
  mobileOpen: false,
  loading: true,
  toast: ''
};

const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const safeUrl = (value = '') => {
  try {
    const parsed = new URL(String(value), window.location.href);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
  } catch {
    return '#';
  }
};

const getId = (item) => String(item.id || item.url || item.title);
const getSummary = (item) => item.short_summary || item.summary || item.content || '';
const getLongSummary = (item) => item.long_summary || item.full_translation || item.summary || item.content || '';
const getQuality = (item) => Number.parseFloat(String(item.quality_index || 0)) || 0;
const isPrimary = (item) => /tier\s*a/i.test(String(item.source_tier || ''));

const normalizeItem = (item, index) => ({
  ...item,
  id: item.id || item.url || `signal-${index}`,
  title: item.title_zh || item.title || '未命名信号',
  url: safeUrl(item.url),
  source: item.source || item.source_label || 'Unknown source',
  published_at: item.published_at || item.date || new Date().toISOString(),
  quality_index: getQuality(item) || 7.5,
  source_tier: item.source_tier || 'Tier B',
  short_summary: item.short_summary || item.summary || item.content || '',
  long_summary: item.long_summary || item.full_translation || item.summary || item.content || '',
  key_quote: item.key_quote || '',
  supporting_quotes: Array.isArray(item.supporting_quotes) ? item.supporting_quotes : [],
  tags: Array.isArray(item.tags) ? item.tags.map(String) : (item.tags ? [String(item.tags)] : [])
});

const matchesTopic = (item, topic) => {
  if (topic === 'all') return true;
  const haystack = `${item.title} ${getSummary(item)} ${(item.tags || []).join(' ')}`.toLowerCase();
  if (topic === 'energy') return /(energy|能源|esg|ccus|carbon|碳|power|电力|geothermal|地热|climate|气候)/i.test(haystack);
  if (topic === 'ai-tech') return /(ai|tech|人工智能|科技|llm|gpu|software|软件|hardware|硬件|data center|数据中心|engineering)/i.test(haystack);
  return true;
};

const dateKey = (item) => {
  const date = new Date(item.published_at);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toISOString().slice(0, 10);
};

const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (hours >= 0 && hours < 1) return '刚刚';
  if (hours >= 1 && hours < 24) return `${hours} 小时前`;
  if (days === 1) return '昨天';
  if (days > 1 && days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

const formatDate = (value, options = { month: 'short', day: 'numeric' }) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('zh-CN', options).format(date);
};

const filteredItems = () => {
  const query = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    if (!matchesTopic(item, state.topic)) return false;
    if (state.date !== 'all' && dateKey(item) !== state.date) return false;
    if (state.filter === 'primary' && !isPrimary(item)) return false;
    if (state.filter === 'high' && getQuality(item) < 8) return false;
    if (state.filter === 'saved' && !state.bookmarks.has(getId(item))) return false;
    const text = `${item.title} ${getSummary(item)} ${getLongSummary(item)} ${item.key_quote || ''} ${(item.supporting_quotes || []).join(' ')} ${(item.tags || []).join(' ')}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (state.entity && !text.includes(state.entity.toLowerCase())) return false;
    return true;
  });
};

const leadItem = (items) => [...items].sort((a, b) => {
  const aScore = getQuality(a) + (a.key_quote ? 0.6 : 0) + (isPrimary(a) ? 0.3 : 0);
  const bScore = getQuality(b) + (b.key_quote ? 0.6 : 0) + (isPrimary(b) ? 0.3 : 0);
  return bScore - aScore;
})[0] || null;

const itemDates = () => {
  const counts = new Map();
  state.items.filter((item) => matchesTopic(item, state.topic)).forEach((item) => {
    const key = dateKey(item);
    if (key !== 'unknown') counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);
};

const trendingEntities = (items) => {
  const candidates = ['OpenAI', 'NVIDIA', 'LLM', 'AI', '数据中心', '能源', 'CCUS', 'CBAM', 'ISSB', '电力', '地热', '硬件', '软件'];
  const counts = new Map();
  items.forEach((item) => {
    const text = `${item.title} ${getSummary(item)} ${(item.tags || []).join(' ')}`.toLowerCase();
    candidates.forEach((entity) => {
      if (text.includes(entity.toLowerCase())) counts.set(entity, (counts.get(entity) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
};

const sourceMix = (items) => {
  const primary = items.filter(isPrimary).length;
  return { primary, expert: Math.max(0, items.length - primary), total: items.length || 1 };
};

const setTheme = (theme) => {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('newsflow_theme', theme);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = theme === 'dark' ? '#161715' : '#f4f1ea';
};

const saveBookmarks = () => localStorage.setItem('newsflow_bookmarks', JSON.stringify([...state.bookmarks]));

const showToast = (message) => {
  state.toast = message;
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = '';
    render();
  }, 1900);
};

const resetFilters = () => {
  state.topic = 'all';
  state.filter = 'all';
  state.query = '';
  state.entity = '';
  state.date = 'all';
  state.focusedIndex = -1;
};

const renderLoading = () => {
  app.innerHTML = `<main class="loading-screen"><div class="loading-lockup"><div class="loading-mark">NF</div><span>正在整理信号流</span></div></main>`;
};

const renderSidebar = (items) => {
  const dates = itemDates();
  const maxDateCount = Math.max(1, ...dates.map(([, count]) => count));
  const channelCount = (id) => state.items.filter((item) => matchesTopic(item, id)).length;
  const today = new Date();
  const edition = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(today);

  return `<aside class="sidebar ${state.mobileOpen ? 'open' : ''}" aria-label="新闻筛选与导航">
    <section class="sidebar-section">
      <p class="section-label">今日版本</p>
      <div class="edition-card">
        <div class="edition-date">${escapeHtml(edition)}</div>
        <div class="edition-meta">已整理 ${state.items.length} 条信号<br>当前显示 ${items.length} 条</div>
      </div>
    </section>

    <section class="sidebar-section">
      <p class="section-label">频道</p>
      <div class="sidebar-list">
        ${state.topics.map((topic) => `<button class="nav-button ${state.topic === topic.id ? 'active' : ''}" data-action="topic" data-value="${escapeHtml(topic.id)}">
          <span class="nav-name"><span class="nav-indicator"></span><span>${escapeHtml(topic.name)}</span></span>
          <span class="count-badge">${channelCount(topic.id)}</span>
        </button>`).join('')}
      </div>
    </section>

    <section class="sidebar-section">
      <p class="section-label">阅读队列</p>
      <div class="sidebar-list">
        ${[
          ['all', '全部', state.items.length],
          ['high', '高置信度', state.items.filter((item) => getQuality(item) >= 8).length],
          ['primary', '一手与机构源', state.items.filter(isPrimary).length],
          ['saved', '已收藏', state.bookmarks.size]
        ].map(([id, name, count]) => `<button class="filter-button ${state.filter === id ? 'active' : ''}" data-action="filter" data-value="${id}">
          <span class="filter-name">${escapeHtml(name)}</span><span class="count-badge">${count}</span>
        </button>`).join('')}
      </div>
    </section>

    <section class="sidebar-section">
      <p class="section-label">时间</p>
      <div class="date-list">
        <button class="date-button ${state.date === 'all' ? 'active' : ''}" data-action="date" data-value="all">
          <span>全部</span><span class="date-meter"><span style="width:100%"></span></span><span>${state.items.length}</span>
        </button>
        ${dates.map(([date, count]) => `<button class="date-button ${state.date === date ? 'active' : ''}" data-action="date" data-value="${date}">
          <span>${escapeHtml(formatDate(date, { month: 'numeric', day: 'numeric' }))}</span>
          <span class="date-meter"><span style="width:${Math.max(12, (count / maxDateCount) * 100)}%"></span></span>
          <span>${count}</span>
        </button>`).join('')}
      </div>
    </section>
  </aside>`;
};

const renderLead = (item) => {
  if (!item) return '';
  const id = getId(item);
  const saved = state.bookmarks.has(id);
  const quality = getQuality(item);
  return `<article class="lead-story" aria-labelledby="lead-title">
    <div class="lead-main">
      <div class="story-eyebrow">
        <span class="eyebrow-primary">今日首要信号</span>
        <span>${escapeHtml(item.source)}</span>
        ${isPrimary(item) ? '<span class="source-verification">机构 / 一手源</span>' : ''}
        <span>${escapeHtml(relativeTime(item.published_at))}</span>
      </div>
      <h2 class="lead-title" id="lead-title"><a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h2>
      <p class="lead-summary">${escapeHtml(getSummary(item))}</p>
      <div class="lead-actions">
        <button class="text-button primary" data-action="open" data-id="${escapeHtml(id)}">${icon('reader')} 深读</button>
        <button class="text-button ${saved ? 'saved' : ''}" data-action="bookmark" data-id="${escapeHtml(id)}">${saved ? icon('bookmarkFill') : icon('bookmark')} ${saved ? '已收藏' : '收藏'}</button>
        <a class="text-button" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${icon('arrow')} 原文</a>
      </div>
    </div>
    <aside class="lead-aside">
      ${item.key_quote ? `<blockquote class="lead-quote">${escapeHtml(item.key_quote)}</blockquote>` : `<blockquote class="lead-quote">${escapeHtml(getLongSummary(item).slice(0, 118))}${getLongSummary(item).length > 118 ? '…' : ''}</blockquote>`}
      <div class="signal-score">
        <div class="score-row"><span>Signal score</span><strong>${quality.toFixed(1)} / 10</strong></div>
        <div class="score-meter"><span style="width:${Math.min(100, quality * 10)}%"></span></div>
      </div>
    </aside>
  </article>`;
};

const renderCard = (item, index) => {
  const id = getId(item);
  const saved = state.bookmarks.has(id);
  return `<article class="article-card ${state.focusedIndex === index ? 'keyboard-focus' : ''}" id="signal-${encodeURIComponent(id)}" data-card-index="${index}">
    <div class="article-index"><span>${String(index + 1).padStart(2, '0')}</span>${state.view === 'grid' ? `<span>${escapeHtml(relativeTime(item.published_at))}</span>` : ''}</div>
    <div class="article-body">
      <div class="article-meta">
        <span class="article-source">${escapeHtml(item.source)}</span>
        ${isPrimary(item) ? '<span class="source-verification">Primary</span>' : ''}
        <span>${escapeHtml(relativeTime(item.published_at))}</span>
        <span>Score ${getQuality(item).toFixed(1)}</span>
      </div>
      <h3 class="article-title"><a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
      <p class="article-summary">${escapeHtml(getSummary(item))}</p>
      <div class="article-tags">${(item.tags || []).slice(0, 3).map((tag) => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
    <div class="card-actions">
      <button class="article-action" data-action="open" data-id="${escapeHtml(id)}" aria-label="深读 ${escapeHtml(item.title)}">${icon('reader')}</button>
      <button class="article-action ${saved ? 'saved' : ''}" data-action="bookmark" data-id="${escapeHtml(id)}" aria-label="${saved ? '取消收藏' : '收藏'} ${escapeHtml(item.title)}">${saved ? icon('bookmarkFill') : icon('bookmark')}</button>
    </div>
  </article>`;
};

const renderBriefRail = (items) => {
  const top = [...items].sort((a, b) => getQuality(b) - getQuality(a)).slice(0, 3);
  const entities = trendingEntities(items);
  const mix = sourceMix(items);
  return `<aside class="brief-rail" aria-label="编辑摘要">
    <section class="rail-card prominent">
      <p class="section-label">编辑摘要</p>
      <div class="brief-list">
        ${top.map((item) => `<div class="brief-item" data-action="open" data-id="${escapeHtml(getId(item))}" tabindex="0">${escapeHtml(item.title)}</div>`).join('') || '<div class="brief-item">当前筛选暂无可摘要内容。</div>'}
      </div>
    </section>
    <section class="rail-card">
      <p class="section-label">高频主题</p>
      <div class="entity-cloud">
        ${entities.map(([entity, count]) => `<button class="entity-button ${state.entity === entity ? 'active' : ''}" data-action="entity" data-value="${escapeHtml(entity)}">${escapeHtml(entity)} · ${count}</button>`).join('') || '<span class="edition-meta">暂无稳定主题</span>'}
      </div>
    </section>
    <section class="rail-card">
      <p class="section-label">信源结构</p>
      <div class="source-bars">
        <div><div class="source-bar-label"><span>机构 / 一手源</span><span>${mix.primary}</span></div><div class="source-bar-track"><span style="width:${(mix.primary / mix.total) * 100}%"></span></div></div>
        <div><div class="source-bar-label"><span>专家 / 独立源</span><span>${mix.expert}</span></div><div class="source-bar-track"><span style="width:${(mix.expert / mix.total) * 100}%"></span></div></div>
      </div>
    </section>
  </aside>`;
};

const renderDrawer = () => {
  const item = state.activeArticle;
  if (!item) return '';
  const id = getId(item);
  const saved = state.bookmarks.has(id);
  const quotes = (item.supporting_quotes || []).filter(Boolean);
  return `<div class="drawer-backdrop" data-action="close-drawer"></div>
    <article class="article-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer-head"><span class="drawer-brand">NewsFlow · Evidence view</span><button class="drawer-close" data-action="close-drawer" aria-label="关闭">${icon('close')}</button></div>
      <div class="drawer-eyebrow">${escapeHtml(item.source)} · ${escapeHtml(formatDate(item.published_at, { year: 'numeric', month: 'long', day: 'numeric' }))} · Score ${getQuality(item).toFixed(1)}</div>
      <h2 class="drawer-title" id="drawer-title">${escapeHtml(item.title)}</h2>
      <p class="drawer-summary">${escapeHtml(getSummary(item))}</p>
      ${item.key_quote ? `<blockquote class="drawer-quote">${escapeHtml(item.key_quote)}</blockquote>` : ''}
      <section class="drawer-section"><h3>发生了什么 / 为什么重要</h3><p>${escapeHtml(getLongSummary(item))}</p></section>
      ${quotes.length ? `<section class="drawer-section"><h3>支持证据</h3><ul>${quotes.map((quote) => `<li>${escapeHtml(quote)}</li>`).join('')}</ul></section>` : ''}
      <section class="drawer-section"><h3>信号元数据</h3><p>${isPrimary(item) ? '机构或一手来源' : '专家或独立来源'} · ${(item.tags || []).map(escapeHtml).join(' · ') || '未分类'}</p></section>
      <div class="drawer-footer">
        <a class="text-button primary" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${icon('arrow')} 打开原文</a>
        <button class="text-button ${saved ? 'saved' : ''}" data-action="bookmark" data-id="${escapeHtml(id)}">${saved ? icon('bookmarkFill') : icon('bookmark')} ${saved ? '已收藏' : '收藏'}</button>
      </div>
    </article>`;
};

const renderHelp = () => state.helpOpen ? `<div class="help-backdrop" data-action="close-help"></div>
  <section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <div class="drawer-head" style="margin-bottom:0"><h2 class="help-title" id="help-title">键盘阅读</h2><button class="drawer-close" data-action="close-help" aria-label="关闭">${icon('close')}</button></div>
    <div class="shortcut-grid">
      <span>搜索全文</span><kbd>/</kbd>
      <span>上一条 / 下一条</span><kbd>J K</kbd>
      <span>打开当前信号</span><kbd>Enter</kbd>
      <span>收藏当前信号</span><kbd>S</kbd>
      <span>切换主题</span><kbd>T</kbd>
      <span>切换列表 / 网格</span><kbd>L</kbd>
      <span>关闭面板</span><kbd>Esc</kbd>
    </div>
  </section>` : '';

const renderMobileNav = () => `<nav class="mobile-nav" aria-label="移动端主导航">
  <button class="${state.topic === 'all' && state.filter === 'all' ? 'active' : ''}" data-action="mobile-home">${icon('home')}<span>首页</span></button>
  <button data-action="mobile-filter">${icon('filter')}<span>筛选</span></button>
  <button class="${state.filter === 'saved' ? 'active' : ''}" data-action="mobile-saved">${icon('bookmark')}<span>收藏</span></button>
  <button data-action="focus-search">${icon('search')}<span>搜索</span></button>
</nav>`;

const render = () => {
  setTheme(state.theme);
  if (state.loading) {
    renderLoading();
    return;
  }

  const items = filteredItems();
  const lead = leadItem(items);
  const stream = lead ? items.filter((item) => getId(item) !== getId(lead)) : items;
  if (state.focusedIndex >= stream.length) state.focusedIndex = stream.length - 1;

  const topicName = state.topics.find((topic) => topic.id === state.topic)?.name || '全部信号';
  const now = new Date();
  const mastheadDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(now);

  app.innerHTML = `<div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <button class="brand" data-action="reset" aria-label="重置 NewsFlow">
          <span class="brand-mark">NF</span>
          <span class="brand-copy"><span class="brand-name">NewsFlow</span><span class="brand-status"><span class="status-dot"></span>Editorial signal desk</span></span>
        </button>
        <label class="global-search">${icon('search')}<input id="global-search" type="search" value="${escapeHtml(state.query)}" placeholder="搜索标题、摘要、证据或主题…" autocomplete="off"><span class="search-kbd">⌘ K</span></label>
        <div class="top-actions">
          <button class="icon-button" data-action="theme" aria-label="切换明暗主题">${state.theme === 'dark' ? icon('sun') : icon('moon')}</button>
          <button class="icon-button" data-action="help" data-desktop-only="true" aria-label="查看键盘快捷键">${icon('help')}</button>
          <button class="mobile-menu-button" data-action="mobile-menu" aria-label="打开筛选菜单">${icon('menu')}</button>
        </div>
      </div>
    </header>

    <div class="workspace">
      ${renderSidebar(items)}
      <main class="main-column" id="main-content">
        <section class="masthead">
          <div><div class="masthead-kicker">Curated intelligence · 克制、可追溯、可深读</div><h1 class="masthead-title">The Daily Signal</h1><p class="masthead-deck">把高频新闻压缩为真正需要判断的变化。先看结论，再追溯来源；需要时展开背景与证据。</p></div>
          <div class="masthead-meta">${escapeHtml(mastheadDate)}<br>${escapeHtml(topicName)}<br>${items.length} signals</div>
        </section>
        ${renderLead(lead)}
        <div class="feed-toolbar">
          <div class="feed-heading"><h2>${state.filter === 'saved' ? '已收藏' : state.entity ? `主题：${escapeHtml(state.entity)}` : '最新信号'}</h2><span>${stream.length} 条可继续阅读</span></div>
          <div class="view-segment" aria-label="布局选择"><button class="segment-button ${state.view === 'list' ? 'active' : ''}" data-action="view" data-value="list">List</button><button class="segment-button ${state.view === 'grid' ? 'active' : ''}" data-action="view" data-value="grid">Grid</button></div>
        </div>
        ${items.length ? `<section class="feed-list ${state.view}" aria-label="新闻信号列表">${stream.map(renderCard).join('')}</section>` : `<section class="empty-state"><h3>没有匹配的信号</h3><p>当前频道、时间或筛选条件过窄。重置后可以回到完整信息流。</p><button class="text-button primary" data-action="reset">重置筛选</button></section>`}
      </main>
      ${renderBriefRail(items)}
    </div>
    ${renderMobileNav()}
    ${state.mobileOpen ? '<div class="mobile-backdrop" data-action="mobile-close"></div>' : ''}
    ${renderDrawer()}
    ${renderHelp()}
    ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ''}
  </div>`;
};

const openArticle = (id) => {
  state.activeArticle = state.items.find((item) => getId(item) === id) || null;
  state.mobileOpen = false;
  render();
  requestAnimationFrame(() => document.querySelector('.drawer-close')?.focus());
};

const toggleBookmark = (id) => {
  if (state.bookmarks.has(id)) {
    state.bookmarks.delete(id);
    saveBookmarks();
    showToast('已从收藏中移除');
  } else {
    state.bookmarks.add(id);
    saveBookmarks();
    showToast('已收藏，可在阅读队列中查看');
  }
};

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const value = target.dataset.value || '';
  const id = target.dataset.id || '';

  if (action === 'topic') {
    state.topic = value;
    state.date = 'all';
    state.entity = '';
    state.focusedIndex = -1;
    state.mobileOpen = false;
  } else if (action === 'filter') {
    state.filter = value;
    state.focusedIndex = -1;
    state.mobileOpen = false;
  } else if (action === 'date') {
    state.date = value;
    state.focusedIndex = -1;
  } else if (action === 'entity') {
    state.entity = state.entity === value ? '' : value;
    state.focusedIndex = -1;
  } else if (action === 'view') {
    state.view = value;
    localStorage.setItem('newsflow_view', value);
  } else if (action === 'theme') {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  } else if (action === 'bookmark') {
    toggleBookmark(id);
    return;
  } else if (action === 'open') {
    openArticle(id);
    return;
  } else if (action === 'close-drawer') {
    state.activeArticle = null;
  } else if (action === 'help') {
    state.helpOpen = true;
  } else if (action === 'close-help') {
    state.helpOpen = false;
  } else if (action === 'mobile-menu' || action === 'mobile-filter') {
    state.mobileOpen = true;
  } else if (action === 'mobile-close') {
    state.mobileOpen = false;
  } else if (action === 'mobile-home') {
    resetFilters();
  } else if (action === 'mobile-saved') {
    state.filter = 'saved';
    state.mobileOpen = false;
  } else if (action === 'focus-search') {
    state.mobileOpen = false;
    render();
    setTimeout(() => document.querySelector('#global-search')?.focus(), 0);
    return;
  } else if (action === 'reset') {
    resetFilters();
  }
  render();
});

app.addEventListener('keydown', (event) => {
  const target = event.target.closest('[data-action="open"]');
  if (target && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    openArticle(target.dataset.id || '');
  }
});

app.addEventListener('input', (event) => {
  if (event.target.matches('#global-search')) {
    state.query = event.target.value;
    state.focusedIndex = -1;
    const caret = event.target.selectionStart;
    render();
    const input = document.querySelector('#global-search');
    input?.focus();
    if (input && caret !== null) input.setSelectionRange(caret, caret);
  }
});

window.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    document.querySelector('#global-search')?.focus();
    return;
  }
  if (event.key === '/' && !typing) {
    event.preventDefault();
    document.querySelector('#global-search')?.focus();
    return;
  }
  if (event.key === 'Escape') {
    if (state.activeArticle) state.activeArticle = null;
    else if (state.helpOpen) state.helpOpen = false;
    else if (state.mobileOpen) state.mobileOpen = false;
    else if (state.query) state.query = '';
    render();
    return;
  }
  if (typing || state.activeArticle || state.helpOpen) return;

  const items = filteredItems();
  const lead = leadItem(items);
  const stream = lead ? items.filter((item) => getId(item) !== getId(lead)) : items;
  if (event.key.toLowerCase() === 'j' || event.key === 'ArrowDown') {
    event.preventDefault();
    state.focusedIndex = Math.min(stream.length - 1, state.focusedIndex + 1);
  } else if (event.key.toLowerCase() === 'k' || event.key === 'ArrowUp') {
    event.preventDefault();
    state.focusedIndex = Math.max(0, state.focusedIndex - 1);
  } else if (event.key === 'Enter' && state.focusedIndex >= 0 && stream[state.focusedIndex]) {
    openArticle(getId(stream[state.focusedIndex]));
    return;
  } else if (event.key.toLowerCase() === 's' && state.focusedIndex >= 0 && stream[state.focusedIndex]) {
    toggleBookmark(getId(stream[state.focusedIndex]));
    return;
  } else if (event.key.toLowerCase() === 't') {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  } else if (event.key.toLowerCase() === 'l') {
    state.view = state.view === 'list' ? 'grid' : 'list';
    localStorage.setItem('newsflow_view', state.view);
  } else if (event.key === '?') {
    state.helpOpen = true;
  } else {
    return;
  }
  render();
  if (state.focusedIndex >= 0) document.querySelector(`[data-card-index="${state.focusedIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

const loadJson = async (path) => {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};

const initialize = async () => {
  renderLoading();
  setTheme(state.theme);
  try {
    const [newsResult, digestResult, topicResult] = await Promise.allSettled([
      loadJson('./data/news.json'),
      loadJson('./data/ai_digest.json'),
      loadJson('./data/topics.json')
    ]);
    const payloads = [newsResult, digestResult]
      .filter((result) => result.status === 'fulfilled' && Array.isArray(result.value))
      .flatMap((result) => result.value);
    const normalized = payloads.map(normalizeItem);
    const deduped = new Map();
    [...fallbackItems.map(normalizeItem), ...normalized].forEach((item) => {
      const key = item.url !== '#' ? item.url : getId(item);
      const existing = deduped.get(key);
      if (!existing || getLongSummary(item).length > getLongSummary(existing).length) deduped.set(key, item);
    });
    state.items = [...deduped.values()].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    if (topicResult.status === 'fulfilled' && Array.isArray(topicResult.value) && topicResult.value.length) {
      state.topics = topicResult.value;
    }
  } catch (error) {
    console.warn('NewsFlow data fallback activated:', error);
    state.items = fallbackItems.map(normalizeItem);
  } finally {
    state.loading = false;
    render();
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed:', error));
  }
};

initialize();
