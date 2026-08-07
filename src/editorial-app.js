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
    useful: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hide: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.5 10.5 0 0 1 12 4c5.5 0 9 5 9 5a15.7 15.7 0 0 1-2.2 2.8M6.2 6.2C4.1 7.5 3 9 3 9s3.5 5 9 5c.7 0 1.4-.1 2-.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    feedback: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H9l-4 4V5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h8m-8 3h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 20h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7m-7 0h7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reader: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.5 8H16m-7.5 4H16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  return icons[name] || '';
};

const verifiedFallbackItems = [
  {
    id: 'fallback-iea-electricity-2026',
    title: '全球电力需求增速将继续加快，数据中心与工业负荷成为新增压力源',
    url: 'https://www.iea.org/news/global-electricity-demand-growth-set-to-accelerate-as-power-systems-adjust-to-recent-shocks',
    source: 'International Energy Agency',
    published_at: '2026-07-23T00:00:00Z',
    quality_index: 9.2,
    source_tier: 'Tier A',
    short_summary: 'IEA 预计全球电力需求在 2026 年和 2027 年分别增长约 3.6% 与 3.8%。工业、电动车、制冷和数据中心共同推高负荷，电网灵活性与可靠性成为更紧迫的约束。',
    long_summary: '这组预测说明，电力系统面对的不只是可再生能源装机扩张，而是负荷结构也在快速变化。数据中心等高密度、持续性需求会放大并网、调峰和区域输电瓶颈；判断能源转型进度，需要同时观察发电投资、网络能力与需求响应。',
    tags: ['Energy & Transition', 'Electricity', 'Data Center']
  },
  {
    id: 'fallback-iea-datacentres-2026',
    title: '数据中心用电在 2025 年显著跃升，电力瓶颈正反向塑造 AI 基础设施布局',
    url: 'https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions',
    source: 'International Energy Agency',
    published_at: '2026-04-16T00:00:00Z',
    quality_index: 9.0,
    source_tier: 'Tier A',
    short_summary: 'IEA 指出数据中心用电继续快速增长，而并网与设备供应瓶颈迫使运营商同时寻找更快的电源、网络和效率方案。AI 资本开支正在与电力基础设施形成更直接的耦合。',
    long_summary: '数据中心扩张不再只是算力设备采购问题。可获得的电力容量、项目投产时间、网络约束和能源组合会决定设施选址与建设节奏。对投资者和政策制定者而言，算力增长需要被视作电力系统规划的一部分，而不是孤立的科技周期。',
    tags: ['AI & Tech', 'Energy & Transition', 'Data Center']
  },
  {
    id: 'fallback-cbam-definitive-regime',
    title: '欧盟 CBAM 进入正式实施阶段，设施级排放数据从披露要求变成贸易成本输入',
    url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en',
    source: 'European Commission',
    published_at: '2026-01-01T00:00:00Z',
    quality_index: 9.1,
    source_tier: 'Tier A',
    short_summary: 'CBAM 正式制度自 2026 年起适用。进口商需要围绕产品、设施与嵌入排放形成可核验的数据链条，碳数据质量将直接影响跨境合规与成本。',
    long_summary: '正式实施把碳核算从年度报告扩展到交易执行。企业需要将供应商数据、设施边界、核算方法和验证记录连接起来，减少重复口径与无法追溯的数据。高质量碳数据因而从合规成本转化为贸易与采购决策的基础设施。',
    tags: ['Energy & Transition', 'CBAM', 'Carbon Accounting']
  },
  {
    id: 'fallback-global-ccs-forum-2026',
    title: 'CCS 商业化讨论从单一项目转向网络、长期责任与跨主体接口',
    url: 'https://www.globalccsinstitute.com/2026-americas-forum-recap/',
    source: 'Global CCS Institute',
    published_at: '2026-06-11T00:00:00Z',
    quality_index: 8.7,
    source_tier: 'Tier A',
    short_summary: '2026 Americas Forum 的讨论显示，CCS 扩张越来越依赖共享运输封存网络、政策确定性、责任安排和可融资合同，而不只是单点捕集技术成熟度。',
    long_summary: '当项目进入集群化阶段，价值链中的每一个接口都会影响投资决策：排放源是否按期交付、管网容量如何分配、注入与封存风险如何计价、长期责任如何移交。治理与证据接口因此成为规模化部署的一部分。',
    tags: ['Energy & Transition', 'CCUS', 'Infrastructure']
  },
  {
    id: 'fallback-prompts-technical-debt',
    title: '提示词也是技术债务',
    url: 'https://www.seangoedecke.com/prompts-are-technical-debt-too/',
    source: 'Sean Goedecke',
    published_at: '2026-05-20T00:00:00Z',
    quality_index: 8.6,
    source_tier: 'Tier B',
    short_summary: '提示词并不是一次性配置。随着系统增长，它们会形成隐性依赖、行为耦合与回归风险，需要像代码一样被版本化、测试和维护。',
    long_summary: '文章把提示词视为软件系统的一部分，而不是模型调用之外的临时文本。每增加约束、例外或示例，都会扩大后续修改的影响面。生产级 AI 产品应为提示词建立版本、评估集、回归测试与清晰责任边界。',
    tags: ['AI & Tech', 'Engineering', 'LLM']
  },
  {
    id: 'fallback-framework-arm',
    title: 'Framework 的 Arm 主板让处理器架构选择与整机生命周期进一步解耦',
    url: 'https://www.jeffgeerling.com/blog/2026/arm-mainboard-for-framework-laptop/',
    source: 'Jeff Geerling',
    published_at: '2026-04-15T00:00:00Z',
    quality_index: 8.3,
    source_tier: 'Tier B',
    short_summary: 'Framework 13 在同一可维修平台上容纳 x86、RISC-V 与 Arm 主板，说明模块化设计可以把处理器路线切换从整机更换中拆分出来。',
    long_summary: '这项测试的价值不只在性能比较，也在于验证可替换主板能否延长设备生命周期。Arm 主板带来功耗、兼容性和软件生态之间的新取舍，同时为可维修硬件提供更清晰的架构升级路径。',
    tags: ['AI & Tech', 'Hardware', 'Arm']
  },
  {
    id: 'fallback-raspberry-connect-windows',
    title: 'Raspberry Pi Connect 可能扩展到 Windows，远程访问服务开始跨出设备生态边界',
    url: 'https://www.jeffgeerling.com/blog/2026/raspberry-pi-connect-may-control-windows-soon/',
    source: 'Jeff Geerling',
    published_at: '2026-04-29T00:00:00Z',
    quality_index: 7.9,
    source_tier: 'Tier B',
    short_summary: 'Pi Connect 最初用于解决树莓派在 Wayland 环境下的远程访问问题。若 Windows 支持落地，产品会从设备附属功能走向更通用的远程工作入口。',
    long_summary: '跨平台扩张会提高服务价值，也会把身份验证、设备授权、端到端安全与企业管理推到更重要的位置。真正的产品升级不只是增加一个客户端，而是建立可信的跨设备控制边界。',
    tags: ['AI & Tech', 'Raspberry Pi', 'Remote Access']
  },
  {
    id: 'fallback-token-burn',
    title: '你今天烧掉了多少 Token？别让易计算指标替代真实生产力',
    url: 'https://idiallo.com/blog/how-many-tokens-did-you-burn-today',
    source: 'Ibrahim Diallo',
    published_at: '2026-05-27T00:00:00Z',
    quality_index: 8.1,
    source_tier: 'Tier B',
    short_summary: '用 Token 数衡量开发者价值，和过去用代码行数评价产出一样危险：指标越容易计算，越可能替代真正需要判断的工作质量。',
    long_summary: '文章借用管理者统计代码行数的案例，提醒团队不要把模型调用量直接当作 AI 生产力。更有效的衡量方式应关注任务完成、缺陷率、复用程度、维护成本和对用户结果的影响。',
    tags: ['AI & Tech', 'Productivity', 'Metrics']
  },
  {
    id: 'fallback-space-datacentres',
    title: '太空 AI 数据中心的散热并非直觉问题，真正门槛在系统级经济性',
    url: 'https://www.seangoedecke.com/space-ai-datacenters-do-not-have-a-cooling-problem/',
    source: 'Sean Goedecke',
    published_at: '2026-05-13T00:00:00Z',
    quality_index: 8.4,
    source_tier: 'Tier B',
    short_summary: '太空环境并不意味着热量无法排出。需要比较的是辐射散热面积、工作温度、供电、发射成本与维护难度的组合。',
    long_summary: '讨论把一个看似直觉的问题拆成工程系统：散热依赖辐射面积和工作温度，太阳能供电与轨道环境改变能源条件。即使热管理可解，发射、通信、升级和维修仍可能构成更大的经济门槛。',
    tags: ['AI & Tech', 'Energy & Transition', 'Data Center']
  },
  {
    id: 'fallback-patch-tuesday-2026-03',
    title: '微软 2026 年 3 月安全更新修复至少 77 个漏洞，补丁优先级仍需按暴露面判断',
    url: 'https://krebsonsecurity.com/2026/03/microsoft-patch-tuesday-march-2026-edition/',
    source: 'Krebs on Security',
    published_at: '2026-03-10T00:00:00Z',
    quality_index: 8.2,
    source_tier: 'Tier B',
    short_summary: '本月更新覆盖至少 77 个安全问题。即使没有被广泛利用的紧急零日漏洞，组织仍需根据互联网暴露、权限提升和关键业务系统确定修复顺序。',
    long_summary: '补丁数量本身不是风险排序。更可靠的处置方式是把漏洞类型、可利用性、资产暴露、业务影响和可用缓解措施结合起来，并在发布后持续观察兼容性与攻击活动变化。',
    tags: ['AI & Tech', 'Cybersecurity', 'Windows']
  }
];

const readStoredJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const FEEDBACK_STORAGE_KEY = 'newsflow_feedback_v1';
const HIDDEN_STORAGE_KEY = 'newsflow_hidden_signals_v1';
const BOOKMARK_STORAGE_KEY = 'newsflow_bookmarks';
const LOCAL_SCOPE_ADOPTED_KEY = 'newsflow_local_feedback_adopted_by_v1';
const FEEDBACK_EXPORT_VERSION = '1.0';
const RECOMMENDATION_POLICY_VERSION = '1.0.0';
const MAX_LOCAL_FEEDBACK_EVENTS = 500;
const PREFERENCE_WEIGHTS = {
  useful: 1.5,
  bookmark: 1,
  unbookmark: -0.25,
  not_interested: -1.5,
  already_known: -0.6,
  too_shallow: -0.8,
  too_late: -0.8
};

const state = {
  items: [],
  topics: [
    { id: 'all', name: '全部信号' },
    { id: 'ai-tech', name: 'AI 基建' },
    { id: 'energy', name: 'CCUS 与能源转型' }
  ],
  topic: 'all',
  filter: 'all',
  query: '',
  entity: '',
  date: 'all',
  view: localStorage.getItem('newsflow_view') || 'list',
  theme: localStorage.getItem('newsflow_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  bookmarks: new Set(readStoredJson(BOOKMARK_STORAGE_KEY, [])),
  feedbackEvents: (() => {
    const events = readStoredJson(FEEDBACK_STORAGE_KEY, []);
    return Array.isArray(events) ? events : [];
  })(),
  hiddenSignals: new Set(readStoredJson(HIDDEN_STORAGE_KEY, [])),
  activeArticle: null,
  focusedIndex: -1,
  helpOpen: false,
  feedbackOpen: false,
  mobileOpen: false,
  loading: true,
  toast: null,
  dataMode: 'repository',
  editionId: 'frontier-systems-review',
  cloudFeedback: new Map(),
  feedbackScope: 'local',
  cloudSnapshotRequested: false,
  cloudSync: {
    enabled: false,
    state: 'loading',
    message: '正在检查云同步配置',
    user: null,
    pending_count: 0
  }
};

const app = document.querySelector('#app');

const commitApp = (markup) => {
  app.innerHTML = markup;
  window.dispatchEvent(new CustomEvent('newsflow:rendered'));
};

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

const activeFeedbackEvents = () => {
  const reversed = new Set(state.feedbackEvents.filter((event) => event.action === 'restore' && event.target_event_id).map((event) => event.target_event_id));
  return state.feedbackEvents.filter((event) => !reversed.has(event.event_id) && event.action !== 'restore');
};

const preferenceFeedbackEvents = () => {
  const localEvents = activeFeedbackEvents().filter((event) => Number.isFinite(PREFERENCE_WEIGHTS[event.action]));
  const localPreferenceSignalIds = new Set(localEvents
    .filter((event) => !['bookmark', 'unbookmark'].includes(event.action))
    .map((event) => event.signal_id));
  const localSavedSignalIds = new Set(localEvents
    .filter((event) => ['bookmark', 'unbookmark'].includes(event.action))
    .map((event) => event.signal_id));
  const cloudEvents = [...state.cloudFeedback.values()]
    .flatMap((row) => {
      const item = state.items.find((entry) => getId(entry) === row.signal_id) || {};
      const base = {
        signal_id: String(row.signal_id),
        channel_id: String(item.channel_id || ''),
        storyline_ids: [...new Set(item.storyline_ids || [])],
        tags: [...new Set(item.tags || [])],
        source: String(item.source || '')
      };
      const events = [];
      if (row.preference !== 0 && !localPreferenceSignalIds.has(base.signal_id)) {
        events.push({ ...base, action: row.preference > 0 ? 'useful' : (row.reason_code || 'not_interested') });
      }
      if (row.saved && !localSavedSignalIds.has(base.signal_id)) events.push({ ...base, action: 'bookmark' });
      return events;
    });
  return [...localEvents, ...cloudEvents];
};

const localPreferenceScore = (item) => {
  const preferenceEvents = preferenceFeedbackEvents();
  if (preferenceEvents.length < 3) return 0;
  let weightedSum = 0;
  let matchCount = 0;
  for (const event of preferenceEvents) {
    if (event.signal_id === getId(item)) continue;
    const matches = [
      event.channel_id && event.channel_id === item.channel_id,
      event.source && event.source === item.source,
      ...(event.storyline_ids || []).map((value) => (item.storyline_ids || []).includes(value)),
      ...(event.tags || []).map((value) => (item.tags || []).includes(value))
    ].filter(Boolean).length;
    if (!matches) continue;
    weightedSum += PREFERENCE_WEIGHTS[event.action] * Math.min(2, matches);
    matchCount += Math.min(2, matches);
  }
  if (!matchCount) return 0;
  return Math.tanh(weightedSum / (3 * Math.sqrt(matchCount))) * 0.8;
};

const recommendationScore = (item) => getQuality(item) + localPreferenceScore(item);

const normalizeItem = (item, index) => ({
  ...item,
  id: item.id || item.url || `signal-${index}`,
  title: item.title_zh || item.title || '未命名信号',
  url: safeUrl(item.url),
  source: item.source || item.source_label || 'Unknown source',
  published_at: item.published_at || item.date || new Date(0).toISOString(),
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
  if (item.channel_id) {
    if (topic === 'energy') return item.channel_id === 'ccus-energy-transition';
    if (topic === 'ai-tech') return item.channel_id === 'ai-infrastructure';
  }
  const haystack = `${item.title} ${getSummary(item)} ${(item.tags || []).join(' ')}`.toLowerCase();
  if (topic === 'energy') return /(energy|能源|esg|ccus|carbon|碳|power|电力|geothermal|地热|climate|气候|cbam)/i.test(haystack);
  if (topic === 'ai-tech') return /(ai|tech|人工智能|科技|llm|gpu|software|软件|hardware|硬件|data center|数据中心|engineering|cyber)/i.test(haystack);
  return true;
};

const validDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (item) => validDate(item.published_at)?.toISOString().slice(0, 10) || 'unknown';

const latestDate = (items = state.items) => {
  const timestamps = items.map((item) => validDate(item.published_at)?.getTime() || 0);
  const timestamp = Math.max(0, ...timestamps);
  return timestamp ? new Date(timestamp) : null;
};

const relativeTime = (value) => {
  const date = validDate(value);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (diff >= 0 && hours < 1) return '刚刚';
  if (hours >= 1 && hours < 24) return `${hours} 小时前`;
  if (days === 1) return '昨天';
  if (days > 1 && days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

const formatDate = (value, options = { month: 'short', day: 'numeric' }) => {
  const date = value instanceof Date ? value : validDate(value);
  return date ? new Intl.DateTimeFormat('zh-CN', options).format(date) : '日期未知';
};

const filteredItems = () => {
  const query = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    if (state.hiddenSignals.has(getId(item))) return false;
    if (!matchesTopic(item, state.topic)) return false;
    if (state.date !== 'all' && dateKey(item) !== state.date) return false;
    if (state.filter === 'primary' && !isPrimary(item)) return false;
    if (state.filter === 'high' && getQuality(item) < 8) return false;
    if (state.filter === 'saved' && !state.bookmarks.has(getId(item))) return false;
    const text = `${item.title} ${getSummary(item)} ${getLongSummary(item)} ${item.key_quote || ''} ${(item.supporting_quotes || []).join(' ')} ${(item.tags || []).join(' ')}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (state.entity && !text.includes(state.entity.toLowerCase())) return false;
    return true;
  }).sort((a, b) => recommendationScore(b) - recommendationScore(a)
    || (validDate(b.published_at)?.getTime() || 0) - (validDate(a.published_at)?.getTime() || 0));
};

const leadItem = (items) => [...items].sort((a, b) => {
  const aScore = recommendationScore(a) + (a.key_quote ? 0.6 : 0) + (isPrimary(a) ? 0.3 : 0);
  const bScore = recommendationScore(b) + (b.key_quote ? 0.6 : 0) + (isPrimary(b) ? 0.3 : 0);
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
  const candidates = ['OpenAI', 'NVIDIA', 'LLM', 'AI', '数据中心', '能源', 'CCUS', 'CBAM', '电力', '地热', '硬件', '软件', '安全'];
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

const scopedStorageKey = (base, scope = state.feedbackScope) => scope === 'local' ? base : `${base}:user:${scope}`;
const saveBookmarks = () => localStorage.setItem(scopedStorageKey(BOOKMARK_STORAGE_KEY), JSON.stringify([...state.bookmarks]));
const saveFeedback = () => {
  localStorage.setItem(scopedStorageKey(FEEDBACK_STORAGE_KEY), JSON.stringify(state.feedbackEvents.slice(-MAX_LOCAL_FEEDBACK_EVENTS)));
  localStorage.setItem(scopedStorageKey(HIDDEN_STORAGE_KEY), JSON.stringify([...state.hiddenSignals]));
};

const switchFeedbackScope = (nextScope) => {
  const normalizedScope = nextScope || 'local';
  if (normalizedScope === state.feedbackScope) return;
  saveBookmarks();
  saveFeedback();
  const targetHasState = [BOOKMARK_STORAGE_KEY, FEEDBACK_STORAGE_KEY, HIDDEN_STORAGE_KEY]
    .some((base) => localStorage.getItem(scopedStorageKey(base, normalizedScope)) !== null);
  const canAdoptAnonymous = state.feedbackScope === 'local'
    && normalizedScope !== 'local'
    && !targetHasState
    && !localStorage.getItem(LOCAL_SCOPE_ADOPTED_KEY);
  state.feedbackScope = normalizedScope;
  state.cloudFeedback = new Map();
  if (canAdoptAnonymous) {
    localStorage.setItem(LOCAL_SCOPE_ADOPTED_KEY, normalizedScope);
    saveBookmarks();
    saveFeedback();
    return;
  }
  state.bookmarks = new Set(readStoredJson(scopedStorageKey(BOOKMARK_STORAGE_KEY), []));
  const events = readStoredJson(scopedStorageKey(FEEDBACK_STORAGE_KEY), []);
  state.feedbackEvents = Array.isArray(events) ? events : [];
  state.hiddenSignals = new Set(readStoredJson(scopedStorageKey(HIDDEN_STORAGE_KEY), []));
};

const showToast = (message, action = null) => {
  state.toast = { message, action };
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = null;
    render();
  }, action ? 5000 : 1900);
};

const createEventId = () => globalThis.crypto?.randomUUID?.()
  || `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const appendFeedback = (item, action, surface, extra = {}) => {
  const event = {
    event_id: createEventId(),
    occurred_at: new Date().toISOString(),
    signal_id: getId(item),
    action,
    surface,
    channel_id: String(item.channel_id || ''),
    storyline_ids: [...new Set(item.storyline_ids || [])],
    tags: [...new Set(item.tags || [])],
    source: String(item.source || ''),
    ...extra
  };
  state.feedbackEvents = [...state.feedbackEvents, event].slice(-MAX_LOCAL_FEEDBACK_EVENTS);
  return event;
};

const cloudRowFor = (item) => {
  const signalId = getId(item);
  const events = activeFeedbackEvents().filter((event) => event.signal_id === signalId);
  const preferenceEvent = [...events].reverse().find((event) => [
    'useful', 'not_interested', 'already_known', 'too_shallow', 'too_late'
  ].includes(event.action));
  const updatedAt = events.reduce(
    (latest, event) => String(event.occurred_at) > latest ? String(event.occurred_at) : latest,
    ''
  ) || new Date().toISOString();
  return {
    edition_id: state.editionId,
    signal_id: signalId,
    saved: state.bookmarks.has(signalId),
    preference: preferenceEvent?.action === 'useful' ? 1 : (preferenceEvent ? -1 : 0),
    hidden: state.hiddenSignals.has(signalId),
    reason_code: preferenceEvent && preferenceEvent.action !== 'useful' ? preferenceEvent.action : null,
    evidence_flag: events.some((event) => event.action === 'evidence_issue'),
    updated_at: updatedAt
  };
};

const queueCloudFeedback = (item, origin = 'action') => {
  window.dispatchEvent(new CustomEvent('newsflow:feedback-changed', {
    detail: { ...cloudRowFor(item), _origin: origin }
  }));
};

const broadcastFeedbackSnapshot = () => {
  if (state.loading) {
    state.cloudSnapshotRequested = true;
    return;
  }
  const activeSignalIds = new Set(activeFeedbackEvents().map((event) => event.signal_id));
  for (const item of state.items) {
    const signalId = getId(item);
    if (activeSignalIds.has(signalId) || state.bookmarks.has(signalId) || state.hiddenSignals.has(signalId)) {
      queueCloudFeedback(item, 'snapshot');
    }
  }
  state.cloudSnapshotRequested = false;
};

const recordFeedback = (id, action, surface) => {
  const item = state.items.find((entry) => getId(entry) === id);
  if (!item) return;
  const latest = activeFeedbackEvents().findLast((event) => event.signal_id === id && event.action === action);
  if (latest && action === 'useful') {
    showToast('已记录这条信息有价值');
    return;
  }
  const event = appendFeedback(item, action, surface);
  if (['hide', 'not_interested'].includes(action)) {
    state.hiddenSignals.add(id);
    state.activeArticle = null;
    state.focusedIndex = -1;
  }
  saveFeedback();
  queueCloudFeedback(item);
  const messages = {
    useful: '已记录：这条信息有价值',
    not_interested: '已记录偏好，并从本机推荐中隐藏',
    hide: '已从本机推荐中隐藏；公共记录未删除'
  };
  showToast(messages[action] || '反馈已记录', ['hide', 'not_interested'].includes(action) ? {
    label: '撤销',
    type: 'undo-feedback',
    signalId: id,
    eventId: event.event_id
  } : null);
};

const restoreFeedback = (signalId, targetEventId, surface = 'toast', notify = true) => {
  const item = state.items.find((entry) => getId(entry) === signalId);
  if (!item) return;
  appendFeedback(item, 'restore', surface, { target_event_id: targetEventId });
  state.hiddenSignals.delete(signalId);
  saveFeedback();
  queueCloudFeedback(item);
  if (notify) showToast('已恢复到本机推荐流');
};

const exportFeedback = () => {
  const payload = {
    schema_version: FEEDBACK_EXPORT_VERSION,
    app_id: 'newsflow-pwa',
    policy_version: RECOMMENDATION_POLICY_VERSION,
    edition_id: state.editionId,
    exported_at: new Date().toISOString(),
    events: state.feedbackEvents
  };
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `newsflow-feedback-${payload.exported_at.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${state.feedbackEvents.length} 条本机反馈`);
};

const resetFilters = () => {
  state.topic = 'all';
  state.filter = 'all';
  state.query = '';
  state.entity = '';
  state.date = 'all';
  state.focusedIndex = -1;
};

const renderLoading = () => commitApp('<main class="loading-screen"><div class="loading-lockup"><div class="loading-mark">N</div><span>正在整理信号流</span></div></main>');

const renderSidebar = (items) => {
  const dates = itemDates();
  const maxDateCount = Math.max(1, ...dates.map(([, count]) => count));
  const channelCount = (id) => state.items.filter((item) => matchesTopic(item, id)).length;
  const snapshot = latestDate();
  const sourceLabel = state.dataMode === 'repository' ? '仓库数据快照' : '核验后备用快照';

  return `<aside class="sidebar ${state.mobileOpen ? 'open' : ''}" aria-label="新闻筛选与导航">
    <section class="sidebar-section">
      <p class="section-label">数据版本</p>
      <div class="edition-card">
        <div class="edition-date">${escapeHtml(formatDate(snapshot, { month: 'long', day: 'numeric' }))}</div>
        <div class="edition-meta">数据截止 · ${escapeHtml(formatDate(snapshot, { year: 'numeric', month: 'long', day: 'numeric' }))}<br>${sourceLabel} · ${state.items.length} 条</div>
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
          ['primary', '机构与一手源', state.items.filter(isPrimary).length],
          ['saved', '已收藏', state.bookmarks.size]
        ].map(([id, name, count]) => `<button class="filter-button ${state.filter === id ? 'active' : ''}" data-action="filter" data-value="${id}"><span class="filter-name">${escapeHtml(name)}</span><span class="count-badge">${count}</span></button>`).join('')}
      </div>
    </section>

    <section class="sidebar-section">
      <p class="section-label">时间</p>
      <div class="date-list">
        <button class="date-button ${state.date === 'all' ? 'active' : ''}" data-action="date" data-value="all"><span>全部</span><span class="date-meter"><span style="width:100%"></span></span><span>${state.items.length}</span></button>
        ${dates.map(([date, count]) => `<button class="date-button ${state.date === date ? 'active' : ''}" data-action="date" data-value="${date}"><span>${escapeHtml(formatDate(date, { month: 'numeric', day: 'numeric' }))}</span><span class="date-meter"><span style="width:${Math.max(12, (count / maxDateCount) * 100)}%"></span></span><span>${count}</span></button>`).join('')}
      </div>
    </section>
    <section class="sidebar-section">
      <p class="section-label">编辑部</p>
      <div class="sidebar-list">
        <button class="nav-button" data-action="open-editorial-office"><span class="nav-name"><span class="nav-indicator"></span><span>进入主编室</span></span></button>
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
      <div class="story-eyebrow"><span class="eyebrow-primary">首要信号</span><span>${escapeHtml(item.source)}</span>${isPrimary(item) ? '<span class="source-verification">机构 / 一手源</span>' : ''}<span>${escapeHtml(relativeTime(item.published_at))}</span></div>
      <h2 class="lead-title" id="lead-title"><a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h2>
      <p class="lead-summary">${escapeHtml(getSummary(item))}</p>
      <div class="lead-actions">
        <button class="text-button primary" data-action="open" data-id="${escapeHtml(id)}">${icon('reader')} 深读</button>
        <button class="text-button ${saved ? 'saved' : ''}" data-action="bookmark" data-id="${escapeHtml(id)}">${saved ? icon('bookmarkFill') : icon('bookmark')} ${saved ? '已收藏' : '收藏'}</button>
        <button class="text-button" data-action="feedback-hide" data-id="${escapeHtml(id)}">${icon('hide')} 本机隐藏</button>
        <a class="text-button" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${icon('arrow')} 原文</a>
      </div>
    </div>
    <aside class="lead-aside">
      ${item.key_quote ? `<blockquote class="lead-quote">${escapeHtml(item.key_quote)}</blockquote>` : `<blockquote class="lead-quote">${escapeHtml(getLongSummary(item).slice(0, 118))}${getLongSummary(item).length > 118 ? '…' : ''}</blockquote>`}
      <div class="signal-score"><div class="score-row"><span>信号评分</span><strong>${quality.toFixed(1)} / 10</strong></div><div class="score-meter"><span style="width:${Math.min(100, quality * 10)}%"></span></div></div>
    </aside>
  </article>`;
};

const renderCard = (item, index) => {
  const id = getId(item);
  const saved = state.bookmarks.has(id);
  return `<article class="article-card ${state.focusedIndex === index ? 'keyboard-focus' : ''}" id="signal-${encodeURIComponent(id)}" data-card-index="${index}">
    <div class="article-index"><span>${String(index + 1).padStart(2, '0')}</span>${state.view === 'grid' ? `<span>${escapeHtml(relativeTime(item.published_at))}</span>` : ''}</div>
    <div class="article-body">
      <div class="article-meta"><span class="article-source">${escapeHtml(item.source)}</span>${isPrimary(item) ? '<span class="source-verification">机构 / 一手源</span>' : ''}<span>${escapeHtml(relativeTime(item.published_at))}</span><span>评分 ${getQuality(item).toFixed(1)}</span></div>
      <h3 class="article-title"><a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
      <p class="article-summary">${escapeHtml(getSummary(item))}</p>
      <div class="article-tags">${(item.tags || []).slice(0, 3).map((tag) => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
    <div class="card-actions"><button class="article-action" data-action="open" data-id="${escapeHtml(id)}" aria-label="深读 ${escapeHtml(item.title)}">${icon('reader')}</button><button class="article-action ${saved ? 'saved' : ''}" data-action="bookmark" data-id="${escapeHtml(id)}" aria-label="${saved ? '取消收藏' : '收藏'} ${escapeHtml(item.title)}">${saved ? icon('bookmarkFill') : icon('bookmark')}</button><button class="article-action" data-action="feedback-hide" data-id="${escapeHtml(id)}" aria-label="从本机推荐中隐藏 ${escapeHtml(item.title)}">${icon('hide')}</button></div>
  </article>`;
};

const renderBriefRail = (items) => {
  const top = [...items].sort((a, b) => getQuality(b) - getQuality(a)).slice(0, 3);
  const entities = trendingEntities(items);
  const mix = sourceMix(items);
  return `<aside class="brief-rail" aria-label="编辑摘要">
    <section class="rail-card prominent"><p class="section-label">编辑摘要</p><div class="brief-list">${top.map((item) => `<div class="brief-item" data-action="open" data-id="${escapeHtml(getId(item))}" tabindex="0">${escapeHtml(item.title)}</div>`).join('') || '<div class="brief-item">当前筛选暂无可摘要内容。</div>'}</div></section>
    <section class="rail-card"><p class="section-label">高频主题</p><div class="entity-cloud">${entities.map(([entity, count]) => `<button class="entity-button ${state.entity === entity ? 'active' : ''}" data-action="entity" data-value="${escapeHtml(entity)}">${escapeHtml(entity)} · ${count}</button>`).join('') || '<span class="edition-meta">暂无稳定主题</span>'}</div></section>
    <section class="rail-card"><p class="section-label">信源结构</p><div class="source-bars"><div><div class="source-bar-label"><span>机构 / 一手源</span><span>${mix.primary}</span></div><div class="source-bar-track"><span style="width:${(mix.primary / mix.total) * 100}%"></span></div></div><div><div class="source-bar-label"><span>专家 / 独立源</span><span>${mix.expert}</span></div><div class="source-bar-track"><span style="width:${(mix.expert / mix.total) * 100}%"></span></div></div></div></section>
  </aside>`;
};

const renderDrawer = () => {
  const item = state.activeArticle;
  if (!item) return '';
  const id = getId(item);
  const saved = state.bookmarks.has(id);
  const quotes = (item.supporting_quotes || []).filter(Boolean);
  return `<div class="drawer-backdrop" data-action="close-drawer"></div><article class="article-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
    <div class="drawer-head"><span class="drawer-brand">NewsFlow · 证据视图</span><button class="drawer-close" data-action="close-drawer" aria-label="关闭">${icon('close')}</button></div>
    <div class="drawer-eyebrow">${escapeHtml(item.source)} · ${escapeHtml(formatDate(item.published_at, { year: 'numeric', month: 'long', day: 'numeric' }))} · 评分 ${getQuality(item).toFixed(1)}</div>
    <h2 class="drawer-title" id="drawer-title">${escapeHtml(item.title)}</h2><p class="drawer-summary">${escapeHtml(getSummary(item))}</p>
    ${item.key_quote ? `<blockquote class="drawer-quote">${escapeHtml(item.key_quote)}</blockquote>` : ''}
    <section class="drawer-section"><h3>发生了什么 / 为什么重要</h3><p>${escapeHtml(getLongSummary(item))}</p></section>
    ${quotes.length ? `<section class="drawer-section"><h3>支持证据</h3><ul>${quotes.map((quote) => `<li>${escapeHtml(quote)}</li>`).join('')}</ul></section>` : ''}
    <section class="drawer-section"><h3>信号元数据</h3><p>${isPrimary(item) ? '机构或一手来源' : '专家或独立来源'} · ${(item.tags || []).map(escapeHtml).join(' · ') || '未分类'}</p></section>
    <section class="drawer-section feedback-prompt"><h3>这条信息对你有用吗？</h3><p>反馈只用于调整后续发现与排序，不会改变事实记录。</p><div class="feedback-actions"><button class="text-button" data-action="feedback-useful" data-id="${escapeHtml(id)}">${icon('useful')} 有价值</button><button class="text-button" data-action="feedback-not-interested" data-id="${escapeHtml(id)}">不感兴趣</button><button class="text-button" data-action="feedback-hide" data-id="${escapeHtml(id)}">${icon('hide')} 仅隐藏</button></div></section>
    <div class="drawer-footer"><a class="text-button primary" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">${icon('arrow')} 打开原文</a><button class="text-button ${saved ? 'saved' : ''}" data-action="bookmark" data-id="${escapeHtml(id)}">${saved ? icon('bookmarkFill') : icon('bookmark')} ${saved ? '已收藏' : '收藏'}</button></div>
  </article>`;
};

const renderHelp = () => state.helpOpen ? `<div class="help-backdrop" data-action="close-help"></div><section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><div class="drawer-head" style="margin-bottom:0"><h2 class="help-title" id="help-title">键盘阅读</h2><button class="drawer-close" data-action="close-help" aria-label="关闭">${icon('close')}</button></div><div class="shortcut-grid"><span>搜索全文</span><kbd>/</kbd><span>上一条 / 下一条</span><kbd>J K</kbd><span>打开当前信号</span><kbd>Enter</kbd><span>收藏当前信号</span><kbd>S</kbd><span>切换主题</span><kbd>T</kbd><span>切换列表 / 网格</span><kbd>L</kbd><span>关闭面板</span><kbd>Esc</kbd></div></section>` : '';

const renderFeedbackCenter = () => {
  if (!state.feedbackOpen) return '';
  const counts = state.feedbackEvents.reduce((result, event) => ({ ...result, [event.action]: (result[event.action] || 0) + 1 }), {});
  const ready = activeFeedbackEvents().filter((event) => Number.isFinite(PREFERENCE_WEIGHTS[event.action])).length >= 3;
  const cloud = state.cloudSync;
  const cloudMessage = cloud.enabled
    ? (cloud.user ? `${cloud.user.label} · ${cloud.message}` : cloud.message)
    : '云同步默认关闭；本机反馈和导出始终可用。';
  const cloudActions = !cloud.enabled
    ? '<span class="cloud-sync-note">在公开配置中启用后，可使用 GitHub 账户同步。</span>'
    : cloud.user
      ? `<button class="text-button" data-action="cloud-sync" ${cloud.state === 'syncing' ? 'disabled' : ''}>立即同步${cloud.pending_count ? ` (${cloud.pending_count})` : ''}</button><button class="text-button" data-action="cloud-sign-out">退出云同步</button><button class="text-button danger" data-action="cloud-clear">清除云端副本</button>`
      : '<button class="text-button primary" data-action="cloud-sign-in">使用 GitHub 登录</button>';
  return `<div class="help-backdrop" data-action="close-feedback"></div><section class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
    <div class="drawer-head"><div><p class="section-label">Local feedback</p><h2 class="help-title" id="feedback-title">推荐反馈</h2></div><button class="drawer-close" data-action="close-feedback" aria-label="关闭推荐反馈">${icon('close')}</button></div>
    <p class="feedback-privacy">详细反馈事件只留在当前浏览器，导出后才会交给本地 Agent 学习。启用账户后，云端只保存每条信息的收藏、偏好和隐藏状态。</p>
    <div class="feedback-stats"><div><strong>${state.feedbackEvents.length}</strong><span>反馈事件</span></div><div><strong>${state.hiddenSignals.size}</strong><span>本机隐藏</span></div><div><strong>${counts.useful || 0}</strong><span>有价值</span></div></div>
    <p class="feedback-state">${ready ? '已达到本机个性化的最低反馈量。' : '再提供一些明确反馈后，系统才会调整相似内容的排序。'}</p>
    <div class="feedback-center-actions"><button class="text-button primary" data-action="export-feedback" ${state.feedbackEvents.length ? '' : 'disabled'}>${icon('download')} 导出给 Agent</button><button class="text-button" data-action="restore-hidden" ${state.hiddenSignals.size ? '' : 'disabled'}>恢复全部隐藏</button></div>
    <section class="cloud-sync-card" aria-label="账户同步"><div><strong>账户同步</strong><span class="cloud-state" data-state="${escapeHtml(cloud.state)}">${escapeHtml(cloudMessage)}</span></div><div class="cloud-sync-actions">${cloudActions}</div></section>
  </section>`;
};

const renderMobileNav = () => `<nav class="mobile-nav" aria-label="移动端主导航"><button class="${state.topic === 'all' && state.filter === 'all' ? 'active' : ''}" data-action="mobile-home">${icon('home')}<span>首页</span></button><button data-action="mobile-filter">${icon('filter')}<span>筛选</span></button><button class="${state.filter === 'saved' ? 'active' : ''}" data-action="mobile-saved">${icon('bookmark')}<span>收藏</span></button><button data-action="focus-search">${icon('search')}<span>搜索</span></button><button data-action="open-editorial-office">${icon('review')}<span>主编室</span></button></nav>`;

const render = () => {
  setTheme(state.theme);
  if (state.loading) return renderLoading();

  const items = filteredItems();
  const lead = leadItem(items);
  const stream = lead ? items.filter((item) => getId(item) !== getId(lead)) : items;
  if (state.focusedIndex >= stream.length) state.focusedIndex = stream.length - 1;
  const topicName = state.topics.find((topic) => topic.id === state.topic)?.name || '全部信号';
  const snapshot = latestDate();

  commitApp(`<div class="app-shell">
    <header class="topbar"><div class="topbar-inner"><button class="brand" data-action="reset" aria-label="重置 NewsFlow"><span class="brand-copy"><span class="brand-name">NewsFlow</span><span class="brand-status"><span class="status-dot"></span>Editorial signal desk</span></span></button><label class="global-search">${icon('search')}<input id="global-search" type="search" value="${escapeHtml(state.query)}" placeholder="搜索标题、摘要、证据或主题…" autocomplete="off"><span class="search-kbd">⌘ K</span></label><div class="top-actions"><button class="icon-button" data-action="feedback-center" aria-label="查看推荐反馈">${icon('feedback')}</button><button class="icon-button" data-action="theme" aria-label="切换明暗主题">${state.theme === 'dark' ? icon('sun') : icon('moon')}</button><button class="icon-button" data-action="open-editorial-office" aria-label="打开主编编辑部">${icon('review')}</button><button class="icon-button" data-action="help" data-desktop-only="true" aria-label="查看键盘快捷键">${icon('help')}</button><button class="mobile-menu-button" data-action="mobile-menu" aria-label="打开筛选菜单">${icon('menu')}</button></div></div></header>
    <div class="workspace">${renderSidebar(items)}<main class="main-column" id="main-content">
      <section class="masthead"><div><div class="masthead-kicker">Curated intelligence · 以数据快照为准</div><h1 class="masthead-title">The Daily Signal</h1><p class="masthead-deck">把高频新闻压缩为真正需要判断的变化。先看结论，再追溯来源；需要时展开背景与证据。</p></div><div class="masthead-meta">Data through<br>${escapeHtml(formatDate(snapshot, { year: 'numeric', month: 'long', day: 'numeric' }))}<br>${escapeHtml(topicName)}<br>${items.length} signals</div></section>
      ${renderLead(lead)}
      <div class="feed-toolbar"><div class="feed-heading"><h2>${state.filter === 'saved' ? '已收藏' : state.entity ? `主题：${escapeHtml(state.entity)}` : '最新信号'}</h2><span>${stream.length} 条可继续阅读</span></div><div class="view-segment" aria-label="布局选择"><button class="segment-button ${state.view === 'list' ? 'active' : ''}" data-action="view" data-value="list">列表</button><button class="segment-button ${state.view === 'grid' ? 'active' : ''}" data-action="view" data-value="grid">网格</button></div></div>
      ${items.length ? `<section class="feed-list ${state.view}" aria-label="新闻信号列表">${stream.map(renderCard).join('')}</section>` : '<section class="empty-state"><h3>没有匹配的信号</h3><p>当前频道、时间或筛选条件过窄。重置后可以回到完整信息流。</p><button class="text-button primary" data-action="reset">重置筛选</button></section>'}
    </main>${renderBriefRail(items)}</div>${renderMobileNav()}${state.mobileOpen ? '<div class="mobile-backdrop" data-action="mobile-close"></div>' : ''}${renderDrawer()}${renderHelp()}${renderFeedbackCenter()}${state.toast ? `<div class="toast" role="status"><span>${escapeHtml(state.toast.message)}</span>${state.toast.action ? `<button data-action="${escapeHtml(state.toast.action.type)}" data-id="${escapeHtml(state.toast.action.signalId)}" data-event-id="${escapeHtml(state.toast.action.eventId)}">${escapeHtml(state.toast.action.label)}</button>` : ''}</div>` : ''}</div>`);
};

const openArticle = (id) => {
  state.activeArticle = state.items.find((item) => getId(item) === id) || null;
  state.mobileOpen = false;
  render();
  requestAnimationFrame(() => document.querySelector('.drawer-close')?.focus());
};

const toggleBookmark = (id) => {
  const removed = state.bookmarks.has(id);
  if (removed) state.bookmarks.delete(id);
  else state.bookmarks.add(id);
  saveBookmarks();
  const item = state.items.find((entry) => getId(entry) === id);
  if (item) {
    appendFeedback(item, removed ? 'unbookmark' : 'bookmark', state.activeArticle ? 'drawer' : 'feed');
    saveFeedback();
    queueCloudFeedback(item);
  }
  showToast(removed ? '已从收藏中移除' : '已收藏，可在阅读队列中查看');
};

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const value = target.dataset.value || '';
  const id = target.dataset.id || '';

  if (action === 'topic') {
    state.topic = value; state.date = 'all'; state.entity = ''; state.focusedIndex = -1; state.mobileOpen = false;
  } else if (action === 'filter') {
    state.filter = value; state.focusedIndex = -1; state.mobileOpen = false;
  } else if (action === 'date') {
    state.date = value; state.focusedIndex = -1;
  } else if (action === 'entity') {
    state.entity = state.entity === value ? '' : value; state.focusedIndex = -1;
  } else if (action === 'view') {
    state.view = value; localStorage.setItem('newsflow_view', value);
  } else if (action === 'theme') {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  } else if (action === 'bookmark') {
    toggleBookmark(id); return;
  } else if (action === 'feedback-useful') {
    recordFeedback(id, 'useful', state.activeArticle ? 'drawer' : 'feed'); return;
  } else if (action === 'feedback-not-interested') {
    recordFeedback(id, 'not_interested', state.activeArticle ? 'drawer' : 'feed'); return;
  } else if (action === 'feedback-hide') {
    recordFeedback(id, 'hide', state.activeArticle ? 'drawer' : 'feed'); return;
  } else if (action === 'undo-feedback') {
    restoreFeedback(id, target.dataset.eventId || ''); return;
  } else if (action === 'feedback-center') {
    state.feedbackOpen = true;
    render();
    requestAnimationFrame(() => document.querySelector('.feedback-dialog .drawer-close')?.focus());
    return;
  } else if (action === 'close-feedback') {
    state.feedbackOpen = false;
  } else if (action === 'export-feedback') {
    exportFeedback(); return;
  } else if (action === 'restore-hidden') {
    for (const signalId of [...state.hiddenSignals]) {
      const targetEvent = activeFeedbackEvents().findLast((entry) => entry.signal_id === signalId && ['hide', 'not_interested'].includes(entry.action));
      if (targetEvent) restoreFeedback(signalId, targetEvent.event_id, 'feedback-center', false);
      else state.hiddenSignals.delete(signalId);
    }
    state.feedbackOpen = false;
    saveFeedback();
    showToast('已恢复全部本机隐藏内容'); return;
  } else if (action === 'cloud-sign-in') {
    window.dispatchEvent(new CustomEvent('newsflow:cloud-action', { detail: { action: 'sign-in' } })); return;
  } else if (action === 'cloud-sign-out') {
    window.dispatchEvent(new CustomEvent('newsflow:cloud-action', { detail: { action: 'sign-out' } })); return;
  } else if (action === 'cloud-sync') {
    window.dispatchEvent(new CustomEvent('newsflow:cloud-action', { detail: { action: 'sync' } })); return;
  } else if (action === 'cloud-clear') {
    if (window.confirm('清除账户中的云端反馈副本？本机反馈与导出记录会保留。')) {
      window.dispatchEvent(new CustomEvent('newsflow:cloud-action', { detail: { action: 'clear' } }));
    }
    return;
  } else if (action === 'open-editorial-office') {
    window.dispatchEvent(new CustomEvent('newsflow:open-editorial-office'));
    return;
  } else if (action === 'open') {
    openArticle(id); return;
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
    state.filter = 'saved'; state.mobileOpen = false;
  } else if (action === 'focus-search') {
    state.mobileOpen = false; render(); setTimeout(() => document.querySelector('#global-search')?.focus(), 0); return;
  } else if (action === 'reset') {
    resetFilters();
  }
  render();
});

app.addEventListener('keydown', (event) => {
  const target = event.target.closest('[data-action="open"]');
  if (target && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault(); openArticle(target.dataset.id || '');
  }
});

app.addEventListener('input', (event) => {
  if (!event.target.matches('#global-search')) return;
  state.query = event.target.value;
  state.focusedIndex = -1;
  const caret = event.target.selectionStart;
  render();
  const input = document.querySelector('#global-search');
  input?.focus();
  if (input && caret !== null) input.setSelectionRange(caret, caret);
});

window.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); document.querySelector('#global-search')?.focus(); return;
  }
  if (event.key === '/' && !typing) {
    event.preventDefault(); document.querySelector('#global-search')?.focus(); return;
  }
  if (event.key === 'Escape') {
    if (state.activeArticle) state.activeArticle = null;
    else if (state.helpOpen) state.helpOpen = false;
    else if (state.feedbackOpen) state.feedbackOpen = false;
    else if (state.mobileOpen) state.mobileOpen = false;
    else if (state.query) state.query = '';
    render(); return;
  }
  if (typing || state.activeArticle || state.helpOpen || state.feedbackOpen) return;

  const items = filteredItems();
  const lead = leadItem(items);
  const stream = lead ? items.filter((item) => getId(item) !== getId(lead)) : items;
  if (event.key.toLowerCase() === 'j' || event.key === 'ArrowDown') {
    event.preventDefault(); state.focusedIndex = Math.min(stream.length - 1, state.focusedIndex + 1);
  } else if (event.key.toLowerCase() === 'k' || event.key === 'ArrowUp') {
    event.preventDefault(); state.focusedIndex = Math.max(0, state.focusedIndex - 1);
  } else if (event.key === 'Enter' && state.focusedIndex >= 0 && stream[state.focusedIndex]) {
    openArticle(getId(stream[state.focusedIndex])); return;
  } else if (event.key.toLowerCase() === 's' && state.focusedIndex >= 0 && stream[state.focusedIndex]) {
    toggleBookmark(getId(stream[state.focusedIndex])); return;
  } else if (event.key.toLowerCase() === 't') {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  } else if (event.key.toLowerCase() === 'l') {
    state.view = state.view === 'list' ? 'grid' : 'list'; localStorage.setItem('newsflow_view', state.view);
  } else if (event.key === '?') {
    state.helpOpen = true;
  } else return;

  render();
  if (state.focusedIndex >= 0) document.querySelector(`[data-card-index="${state.focusedIndex}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

window.addEventListener('newsflow:request-feedback-snapshot', broadcastFeedbackSnapshot);

const renderAfterCloudUpdate = () => {
  const focusedAction = document.activeElement?.closest?.('button[data-action]')?.dataset.action || '';
  render();
  if (!state.feedbackOpen) return;
  requestAnimationFrame(() => {
    const matchingButton = [...document.querySelectorAll('.feedback-dialog button[data-action]')]
      .find((button) => button.dataset.action === focusedAction);
    (matchingButton || document.querySelector('.feedback-dialog .drawer-close'))?.focus();
  });
};

window.addEventListener('newsflow:sync-status', (event) => {
  state.cloudSync = { ...state.cloudSync, ...event.detail };
  switchFeedbackScope(state.cloudSync.user?.id || 'local');
  if (state.feedbackOpen) renderAfterCloudUpdate();
});

window.addEventListener('newsflow:remote-feedback', (event) => {
  const rows = Array.isArray(event.detail?.rows) ? event.detail.rows : [];
  state.cloudFeedback = new Map(rows.map((row) => [String(row.signal_id), row]));
  for (const row of rows) {
    const signalId = String(row.signal_id);
    if (row.saved) state.bookmarks.add(signalId);
    else state.bookmarks.delete(signalId);
    if (row.hidden) state.hiddenSignals.add(signalId);
    else state.hiddenSignals.delete(signalId);
  }
  saveBookmarks();
  saveFeedback();
  renderAfterCloudUpdate();
});

const loadJson = async (path) => {
  const response = await fetch(path, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};

const initialize = async () => {
  renderLoading();
  setTheme(state.theme);
  try {
    const [newsResult, digestResult, topicResult, editionResult] = await Promise.allSettled([
      loadJson('./data/news.json'),
      loadJson('./data/ai_digest.json'),
      loadJson('./data/topics.json'),
      loadJson('./data/edition.json')
    ]);

    const repositoryPayload = [newsResult, digestResult]
      .filter((result) => result.status === 'fulfilled' && Array.isArray(result.value))
      .flatMap((result) => result.value)
      .map(normalizeItem)
      .filter((item) => item.status !== 'archived' && item.url !== '#' && item.title && getSummary(item));

    const sourceItems = repositoryPayload.length ? repositoryPayload : verifiedFallbackItems.map(normalizeItem);
    state.dataMode = repositoryPayload.length ? 'repository' : 'fallback';

    const deduped = new Map();
    sourceItems.forEach((item) => {
      const key = item.url !== '#' ? item.url : getId(item);
      const existing = deduped.get(key);
      if (!existing || getLongSummary(item).length > getLongSummary(existing).length) deduped.set(key, item);
    });
    state.items = [...deduped.values()].sort((a, b) => (validDate(b.published_at)?.getTime() || 0) - (validDate(a.published_at)?.getTime() || 0));

    if (topicResult.status === 'fulfilled' && Array.isArray(topicResult.value) && topicResult.value.length) {
      state.topics = topicResult.value;
    }
    if (editionResult.status === 'fulfilled' && editionResult.value?.id) state.editionId = String(editionResult.value.id);
  } catch (error) {
    console.warn('NewsFlow verified fallback activated:', error);
    state.items = verifiedFallbackItems.map(normalizeItem).sort((a, b) => (validDate(b.published_at)?.getTime() || 0) - (validDate(a.published_at)?.getTime() || 0));
    state.dataMode = 'fallback';
  } finally {
    state.loading = false;
    if (state.cloudSnapshotRequested) broadcastFeedbackSnapshot();
    render();
  }
};

initialize();
