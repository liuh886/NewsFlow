(() => {
  const ROOT_ID = 'newsflow-reading-surface-root';
  const DATA_TIMEOUT_MS = 5000;
  const scriptBaseUrl = new URL('./', document.currentScript?.src || window.location.href);
  const homeCanonical = document.querySelector('link[rel="canonical"]')?.href || scriptBaseUrl.href;
  const baseTitle = document.title;
  const state = {
    edition: null,
    storylines: [],
    news: [],
    activeId: '',
    returnFocus: null,
    returnPanelScroll: null,
    openedBySurface: false,
    shareOpen: false
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
  const canonicalArticleUrl = (id) => new URL(`articles/${encodeURIComponent(String(id || ''))}/`, scriptBaseUrl).href;

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

  const editionPanelRoute = () => (/^#(?:archive|storylines|storyline\/|issue\/)/.test(window.location.hash) ? window.location.hash : '');

  const captureEditionPanelScroll = () => {
    const route = editionPanelRoute();
    const panel = document.querySelector('#app [data-edition-layer="panel"] .edition-panel');
    if (!route || !panel) return null;
    return { route, scrollTop: panel.scrollTop };
  };

  const restoreEditionPanelScroll = () => {
    const snapshot = state.returnPanelScroll;
    if (!snapshot || state.activeId || window.location.hash !== snapshot.route) return;
    requestAnimationFrame(() => {
      const panel = document.querySelector('#app [data-edition-layer="panel"] .edition-panel');
      if (!panel) return;
      panel.scrollTop = snapshot.scrollTop;
      state.returnPanelScroll = null;
    });
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

  const renderShareDialog = (item) => state.shareOpen ? `
    <div class="nf-share-backdrop" data-reading-action="close-share"></div>
    <section class="nf-share-dialog" role="dialog" aria-modal="true" aria-labelledby="nf-share-title">
      <div class="nf-share-head"><div><span>SHARE STORY</span><h2 id="nf-share-title">分享这条报道</h2></div><button type="button" data-reading-action="close-share" aria-label="关闭分享">×</button></div>
      <p>生成一张 3:4 Newsflow 编辑卡片。支持时可直接调用系统分享；否则保存图片或复制文章链接。</p>
      <div class="nf-share-preview" data-share-preview aria-label="分享卡片预览"></div>
      <div class="nf-share-actions">
        <button type="button" class="nf-share-primary" data-reading-action="share-image">分享图片</button>
        <button type="button" data-reading-action="copy-link">复制链接</button>
        <button type="button" data-reading-action="save-image">保存图片</button>
      </div>
      <small>${escapeHtml(canonicalArticleUrl(itemId(item)))}</small>
    </section>` : '';

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
      <div class="nf-reading-progress" aria-hidden="true"><span></span></div>
      <header class="nf-reading-header">
        <div class="nf-reading-header-inner">
          <button type="button" class="nf-reading-back" data-reading-action="close">← 返回刊物</button>
          <div class="nf-reading-publication">
            <strong>${escapeHtml(state.edition?.name || 'Frontier Systems Review')}</strong>
            <span>${escapeHtml(currentChannel?.name || 'Editorial Signal')}</span>
          </div>
          <button type="button" class="nf-reading-share" data-reading-action="open-share">分享</button>
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
          <div class="nf-reading-byline">Newsflow Editorial Desk</div>

          ${whyItMatters ? `<section class="nf-reading-section"><h2>为什么重要</h2><p>${escapeHtml(whyItMatters)}</p></section>` : ''}
          <section class="nf-reading-section nf-reading-evidence">
            <h2>证据与来源</h2>
            ${quotes.length ? quotes.map((quote) => `<blockquote>${escapeHtml(quote)}</blockquote>`).join('') : '<p>当前公开记录未附加可摘录引文；请以原始来源和 Newsflow 的事实归因记录为准。</p>'}
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
      ${renderShareDialog(item)}
    </div>`;
  };

  const setBackgroundInert = (inert) => {
    const app = document.querySelector('#app');
    if (!app) return;
    app.inert = inert;
    if (inert) app.setAttribute('aria-hidden', 'true');
    else app.removeAttribute('aria-hidden');
  };

  const setDocumentIdentity = (item = null) => {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (item) {
      document.title = `${item.title} — ${state.edition?.name || 'Frontier Systems Review'}`;
      canonical?.setAttribute('href', canonicalArticleUrl(itemId(item)));
    } else {
      document.title = baseTitle;
      canonical?.setAttribute('href', homeCanonical);
    }
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

  const syncReadingProgress = () => {
    const shell = document.querySelector(`#${ROOT_ID} .nf-reading-shell`);
    const progress = shell?.querySelector('.nf-reading-progress span');
    if (!shell || !progress) return;
    const max = Math.max(1, shell.scrollHeight - shell.clientHeight);
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, shell.scrollTop / max))})`;
  };

  const sharePayload = (item) => ({
    title: item.title,
    summary: item.long_summary || item.short_summary || item.summary || '',
    source: item.source || 'Editorial source',
    sourceTier: item.source_tier || '',
    channel: channel(item)?.name || 'Editorial Signal',
    date: formatDate(item.published_at),
    url: canonicalArticleUrl(itemId(item)),
    quote: item.key_quote || ''
  });

  const renderSharePreview = async () => {
    const item = activeItem();
    const host = document.querySelector(`#${ROOT_ID} [data-share-preview]`);
    if (!item || !host || !window.NewsFlowShareCard) return;
    const canvas = await window.NewsFlowShareCard.render(sharePayload(item));
    host.replaceChildren(canvas);
  };

  const render = () => {
    const root = ensureRoot();
    const item = activeItem();
    if (!item) {
      root.replaceChildren();
      root.hidden = true;
      document.body.classList.remove('nf-reading-open');
      setBackgroundInert(false);
      setDocumentIdentity();
      return;
    }
    root.hidden = false;
    root.innerHTML = renderReadingSurface(item);
    document.body.classList.add('nf-reading-open');
    setBackgroundInert(true);
    setDocumentIdentity(item);
    const shell = root.querySelector('.nf-reading-shell');
    shell?.addEventListener('scroll', syncReadingProgress, { passive: true });
    syncReadingProgress();
    if (state.shareOpen) requestAnimationFrame(renderSharePreview);
    requestAnimationFrame(() => root.querySelector(state.shareOpen ? '[data-reading-action="close-share"]' : '[data-reading-action="close"]')?.focus());
  };

  const setRoute = (id, replace = false) => {
    const url = `${window.location.pathname}${window.location.search}#read/${encodeURIComponent(id)}`;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ newsflowReading: true, signalId: id }, '', url);
  };

  const open = (id, options = {}) => {
    const item = state.news.find((candidate) => itemId(candidate) === String(id || ''));
    if (!item) return;
    const openingNewSurface = !state.activeId;
    if (openingNewSurface) {
      state.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      state.returnPanelScroll = captureEditionPanelScroll();
    }
    state.activeId = itemId(item);
    state.shareOpen = false;
    if (!options.replace) state.openedBySurface = !options.fromRoute;
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
    state.shareOpen = false;
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
      state.shareOpen = false;
      state.openedBySurface = false;
      render();
    }
  };

  const decorateReadingLinks = () => {
    const shell = document.querySelector('#app .app-shell[data-product-model="magazine-edition"]');
    if (!shell || !state.news.length) return;

    const bindHeadline = (anchor, id) => {
      if (!anchor || !id || !state.news.some((item) => itemId(item) === id)) return;
      anchor.dataset.readingLink = 'true';
      anchor.dataset.id = id;
      anchor.href = canonicalArticleUrl(id);
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
    };

    const lead = shell.querySelector('.lead-story');
    const leadId = lead?.querySelector('[data-action="open"][data-id]')?.dataset.id || '';
    bindHeadline(lead?.querySelector('.lead-title a'), leadId);

    shell.querySelectorAll('.article-card').forEach((card) => {
      const quickEvidence = card.querySelector('.article-action[data-action="open"][data-id]');
      const id = quickEvidence?.dataset.id || '';
      bindHeadline(card.querySelector('.article-title a'), id);
      if (quickEvidence) quickEvidence.setAttribute('aria-label', `快速证据 ${quickEvidence.getAttribute('aria-label')?.replace(/^深读\s*/, '') || ''}`.trim());
    });
  };

  const shareImage = async (item) => {
    if (!window.NewsFlowShareCard) return;
    const canvas = await window.NewsFlowShareCard.render(sharePayload(item));
    const blob = await window.NewsFlowShareCard.toBlob(canvas);
    const file = new File([blob], `newsflow-${itemId(item)}.png`, { type: 'image/png' });
    const data = { title: item.title, text: item.short_summary || item.summary || '', url: canonicalArticleUrl(itemId(item)), files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share(data);
    } else {
      await window.NewsFlowShareCard.download(canvas, file.name);
      await navigator.clipboard?.writeText?.(data.url);
    }
    globalThis.gtag?.('event', 'reader_article_share', { signal_id: itemId(item), surface: 'share_card' });
  };

  document.addEventListener('click', async (event) => {
    const internal = event.target.closest?.('[data-reading-action]');
    if (internal && document.getElementById(ROOT_ID)?.contains(internal)) {
      const action = internal.dataset.readingAction;
      const item = activeItem();
      if (action === 'close') close();
      else if (action === 'read') open(internal.dataset.id || '', { replace: true });
      else if (action === 'storyline') {
        const storylineId = internal.dataset.storylineId || '';
        state.returnPanelScroll = null;
        close();
        requestAnimationFrame(() => document.querySelector(`[data-edition-action="open-storyline"][data-storyline-id="${CSS.escape(storylineId)}"]`)?.click());
      } else if (action === 'open-share') {
        state.shareOpen = true;
        render();
      } else if (action === 'close-share') {
        state.shareOpen = false;
        render();
      } else if (action === 'share-image' && item) {
        await shareImage(item).catch((error) => console.warn('NewsFlow share failed:', error));
      } else if (action === 'save-image' && item && window.NewsFlowShareCard) {
        const canvas = await window.NewsFlowShareCard.render(sharePayload(item));
        await window.NewsFlowShareCard.download(canvas, `newsflow-${itemId(item)}.png`);
      } else if (action === 'copy-link' && item) {
        await navigator.clipboard?.writeText?.(canonicalArticleUrl(itemId(item)));
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

  window.addEventListener('newsflow:rendered', () => requestAnimationFrame(decorateReadingLinks));
  window.addEventListener('newsflow:edition-rendered', () => requestAnimationFrame(() => {
    decorateReadingLinks();
    restoreEditionPanelScroll();
  }));
  window.addEventListener('popstate', syncFromRoute);
  window.addEventListener('hashchange', syncFromRoute);
  window.addEventListener('keydown', (event) => {
    if (!state.activeId) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (state.shareOpen) {
        state.shareOpen = false;
        render();
      } else close();
      return;
    }
    if (state.shareOpen) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const shell = document.querySelector(`#${ROOT_ID} .nf-reading-shell`);
      if (!shell) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      shell.scrollBy({ top: direction * Math.max(96, shell.clientHeight * 0.12), behavior: 'auto' });
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const item = activeItem();
      const adjacent = adjacentItems(item);
      const target = event.key === 'ArrowLeft' ? adjacent.previous : adjacent.next;
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        open(itemId(target), { replace: true });
      }
    }
  }, true);

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
      decorateReadingLinks();
      syncFromRoute();
    } catch (error) {
      console.warn('NewsFlow reading surface unavailable:', error);
    }
  };

  initialize();
})();
