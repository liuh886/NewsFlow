(() => {
  const ROOT_ID = 'newsflow-reading-surface-root';
  const DATA_TIMEOUT_MS = 5000;
  const state = {
    edition: null,
    storylines: [],
    news: [],
    activeId: '',
    returnFocus: null,
    openedBySurface: false
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

  const loadJson = async (path) => {
    const response = await fetch(path, {
      cache: 'no-store',
      signal: AbortSignal.timeout(DATA_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };

  const itemId = (item) => String(item?.id || '');
  const activeItem = () => state.news.find((item) => itemId(item) === state.activeId) || null;
  const channel = (item) => (state.edition?.channels || []).find((entry) => entry.id === item?.channel_id) || null;
  const matchedStorylines = (item) => state.storylines.filter((storyline) => (item?.storyline_ids || []).includes(storyline.id));

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '日期未知';
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  const routeId = () => {
    const match = window.location.hash.match(/^#read\/(.+)$/);
    if (!match) return '';
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  };

  const orderedChannelItems = (item) => state.news
    .filter((candidate) => candidate.channel_id === item?.channel_id)
    .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());

  const adjacentItems = (item) => {
    const ordered = orderedChannelItems(item);
    const index = ordered.findIndex((candidate) => itemId(candidate) === itemId(item));
    return {
      previous: index > 0 ? ordered[index - 1] : null,
      next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null
    };
  };

  const relatedItems = (item) => {
    const storylineIds = new Set(item?.storyline_ids || []);
    return state.news
      .filter((candidate) => itemId(candidate) !== itemId(item))
      .map((candidate) => ({
        candidate,
        score: Number(candidate.channel_id === item?.channel_id) * 2
          + (candidate.storyline_ids || []).filter((id) => storylineIds.has(id)).length
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score
        || new Date(b.candidate.published_at || 0).getTime() - new Date(a.candidate.published_at || 0).getTime())
      .slice(0, 3)
      .map((entry) => entry.candidate);
  };

  const renderReadingSurface = (item) => {
    const currentChannel = channel(item);
    const storylines = matchedStorylines(item);
    const related = relatedItems(item);
    const adjacent = adjacentItems(item);
    const quotes = [item.key_quote, ...(item.supporting_quotes || [])].filter(Boolean);
    const shortSummary = String(item.short_summary || item.summary || '');
    const longSummary = String(item.long_summary || item.short_summary || item.summary || '');
    const whyItMatters = longSummary && longSummary !== shortSummary ? longSummary : '';

    return `<div class="nf-reading-shell" role="dialog" aria-modal="true" aria-labelledby="nf-reading-title">
      <header class="nf-reading-header">
        <div class="nf-reading-header-inner">
          <button type="button" class="nf-reading-back" data-reading-action="close">← 返回刊物</button>
          <div class="nf-reading-publication">
            <strong>${escapeHtml(state.edition?.name || 'Frontier Systems Review')}</strong>
            <span>${escapeHtml(currentChannel?.name || 'Editorial Signal')}</span>
          </div>
          <a class="nf-reading-source-link" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">原始来源 ↗</a>
        </div>
      </header>
      <main class="nf-reading-layout">
        <article class="nf-reading-article">
          <div class="nf-reading-meta">
            <span>${escapeHtml(currentChannel?.name || '未分类')}</span>
            <span>${escapeHtml(formatDate(item.published_at))}</span>
            <span>${escapeHtml(item.source || 'Editorial source')}</span>
          </div>
          <h1 id="nf-reading-title">${escapeHtml(item.title)}</h1>
          <p class="nf-reading-standfirst">${escapeHtml(shortSummary)}</p>
          <div class="nf-reading-byline">NewsFlow Editorial Desk</div>

          <section class="nf-reading-section">
            <h2>发生了什么</h2>
            <p>${escapeHtml(shortSummary)}</p>
          </section>
          ${whyItMatters ? `<section class="nf-reading-section"><h2>为什么重要</h2><p>${escapeHtml(whyItMatters)}</p></section>` : ''}
          <section class="nf-reading-section nf-reading-evidence">
            <h2>证据与来源</h2>
            ${quotes.length ? quotes.map((quote) => `<blockquote>${escapeHtml(quote)}</blockquote>`).join('') : '<p>当前公开记录未附加可摘录引文；请以原始来源和 NewsFlow 的事实归因记录为准。</p>'}
            <p class="nf-reading-provenance">${escapeHtml(item.source || 'Editorial source')} · ${escapeHtml(item.source_tier || 'Source tier 未标注')} · ${escapeHtml(formatDate(item.published_at))}</p>
            <a class="nf-reading-inline-link" href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">查看原始来源 →</a>
          </section>
          ${storylines.length ? `<section class="nf-reading-section"><h2>长期议题</h2><div class="nf-reading-storylines">${storylines.map((storyline) => `<button type="button" data-reading-action="storyline" data-storyline-id="${escapeHtml(storyline.id)}"><strong>${escapeHtml(storyline.title)}</strong><span>${escapeHtml(storyline.current_view || storyline.baseline_view || '')}</span></button>`).join('')}</div></section>` : ''}
          ${related.length ? `<section class="nf-reading-section"><h2>相关阅读</h2><div class="nf-reading-related">${related.map((candidate) => `<button type="button" data-reading-action="read" data-id="${escapeHtml(itemId(candidate))}"><span>${escapeHtml(channel(candidate)?.name || '')}</span><strong>${escapeHtml(candidate.title)}</strong></button>`).join('')}</div></section>` : ''}

          <nav class="nf-reading-adjacent" aria-label="同栏目文章导航">
            ${adjacent.previous ? `<button type="button" data-reading-action="read" data-id="${escapeHtml(itemId(adjacent.previous))}"><span>较新</span><strong>${escapeHtml(adjacent.previous.title)}</strong></button>` : '<span></span>'}
            ${adjacent.next ? `<button type="button" data-reading-action="read" data-id="${escapeHtml(itemId(adjacent.next))}"><span>较早</span><strong>${escapeHtml(adjacent.next.title)}</strong></button>` : '<span></span>'}
          </nav>
        </article>
      </main>
    </div>`;
  };

  const setBackgroundInert = (inert) => {
    const app = document.querySelector('#app');
    if (!app) return;
    app.inert = inert;
    if (inert) app.setAttribute('aria-hidden', 'true');
    else app.removeAttribute('aria-hidden');
  };

  const ensureRoot = () => {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.append(root);
    }
    return root;
  };

  const render = () => {
    const root = ensureRoot();
    const item = activeItem();
    if (!item) {
      root.replaceChildren();
      root.hidden = true;
      document.body.classList.remove('nf-reading-open');
      setBackgroundInert(false);
      return;
    }
    root.hidden = false;
    root.innerHTML = renderReadingSurface(item);
    document.body.classList.add('nf-reading-open');
    setBackgroundInert(true);
    requestAnimationFrame(() => root.querySelector('[data-reading-action="close"]')?.focus());
  };

  const setRoute = (id, replace = false) => {
    const url = `${window.location.pathname}${window.location.search}#read/${encodeURIComponent(id)}`;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ newsflowReading: true, signalId: id }, '', url);
  };

  const open = (id, options = {}) => {
    const item = state.news.find((candidate) => itemId(candidate) === String(id || ''));
    if (!item) return;
    state.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.activeId = itemId(item);
    state.openedBySurface = !options.fromRoute;
    if (!options.fromRoute) setRoute(state.activeId, Boolean(options.replace));
    render();
    globalThis.gtag?.('event', 'reader_article_open', {
      signal_id: state.activeId,
      channel_id: item.channel_id || '',
      surface: 'reading_surface'
    });
  };

  const close = () => {
    const focus = state.returnFocus;
    const openedBySurface = state.openedBySurface;
    state.activeId = '';
    state.openedBySurface = false;
    render();
    if (openedBySurface && window.history.state?.newsflowReading) window.history.back();
    else if (routeId()) window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    requestAnimationFrame(() => focus?.focus?.());
  };

  const syncFromRoute = () => {
    const id = routeId();
    if (id && state.news.some((item) => itemId(item) === id)) open(id, { fromRoute: true });
    else if (state.activeId) {
      state.activeId = '';
      state.openedBySurface = false;
      render();
    }
  };

  document.addEventListener('click', (event) => {
    const internal = event.target.closest?.('[data-reading-action]');
    if (internal && document.getElementById(ROOT_ID)?.contains(internal)) {
      const action = internal.dataset.readingAction;
      if (action === 'close') close();
      else if (action === 'read') open(internal.dataset.id || '', { replace: true });
      else if (action === 'storyline') {
        close();
        requestAnimationFrame(() => document.querySelector(`[data-edition-action="open-storyline"][data-storyline-id="${CSS.escape(internal.dataset.storylineId || '')}"]`)?.click());
      }
      return;
    }

    const readerShell = event.target.closest?.('#app .app-shell[data-product-model="magazine-edition"]');
    if (!readerShell) return;
    const trigger = event.target.closest?.('[data-reading-link], [data-action="open"][data-id]');
    if (!trigger || trigger.classList.contains('article-action')) return;
    const id = trigger.dataset.id || '';
    if (!id || !state.news.some((item) => itemId(item) === id)) return;
    event.preventDefault();
    event.stopPropagation();
    open(id);
  }, true);

  window.addEventListener('popstate', syncFromRoute);
  window.addEventListener('hashchange', syncFromRoute);
  window.addEventListener('keydown', (event) => {
    if (!state.activeId) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const item = activeItem();
      const adjacent = adjacentItems(item);
      const target = event.key === 'ArrowLeft' ? adjacent.previous : adjacent.next;
      if (target) {
        event.preventDefault();
        open(itemId(target), { replace: true });
      }
    }
  });

  const initialize = async () => {
    try {
      const [edition, storylines, news] = await Promise.all([
        loadJson('./data/edition.json'),
        loadJson('./data/storylines.json'),
        loadJson('./data/news.json')
      ]);
      state.edition = edition;
      state.storylines = Array.isArray(storylines) ? storylines : [];
      state.news = Array.isArray(news) ? news : [];
      syncFromRoute();
    } catch (error) {
      console.warn('NewsFlow reading surface unavailable:', error);
    }
  };

  initialize();
})();
