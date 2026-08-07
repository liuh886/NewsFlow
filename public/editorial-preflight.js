(() => {
  'use strict';

  const DATA_PATH = './data/pipeline-reviews.json';
  const root = document.getElementById('newsflow-editorial-office-root');
  if (!root) return;

  const REASON_LABELS = new Map([
    ['report data cutoff is not disclosed', '报告未披露数据截止日期，时效边界仍需主编判断。'],
    ['institutional report requires verification.report_context', '机构报告缺少版本、数据截止日期或方法学核验。'],
    ['full source was not accessed', '尚未完整访问原始来源，不能仅凭摘要作出出版判断。'],
    ['summary is not supported sentence by sentence', '摘要中的部分陈述尚未逐句对应原始证据。'],
    ['unregistered source', '来源尚未进入本刊可信来源登记。'],
    ['candidate is a duplicate', '候选内容与既有 Signal 高度重复。'],
    ['score below threshold', '自动评分未达到直接进入正式审稿的门槛。']
  ]);

  let reportPromise = null;
  let decorationVersion = 0;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safeSourceUrl = (value) => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.toString() : '';
    } catch {
      return '';
    }
  };

  const localizeReason = (reason) => REASON_LABELS.get(String(reason || '').trim()) || String(reason || '').trim();

  const loadReport = () => {
    if (!reportPromise) {
      reportPromise = fetch(DATA_PATH, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`${DATA_PATH}: ${response.status}`);
          return response.json();
        })
        .then((report) => ({
          ...report,
          candidates: Array.isArray(report?.candidates) ? report.candidates : []
        }))
        .catch((error) => {
          console.warn('NewsFlow editorial preflight unavailable:', error);
          return { candidates: [] };
        });
    }
    return reportPromise;
  };

  const renderEvidence = (evidence) => {
    if (!Array.isArray(evidence) || evidence.length === 0) return '';
    return `<details class="nf-preflight-evidence">
      <summary>核对证据链 · ${evidence.length} 条</summary>
      <ol>${evidence.map((item) => {
        const sourceUrl = safeSourceUrl(item?.source_url);
        return `<li>
          <strong>${escapeHtml(item?.claim || '未命名证据')}</strong>
          ${item?.source_excerpt ? `<blockquote>${escapeHtml(item.source_excerpt)}</blockquote>` : ''}
          ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">打开原始来源</a>` : ''}
        </li>`;
      }).join('')}</ol>
    </details>`;
  };

  const renderPreflight = (candidate) => {
    const reasons = Array.isArray(candidate.reasons) ? candidate.reasons.filter(Boolean) : [];
    return `<aside class="nf-manuscript-preflight" aria-label="自动预审提示">
      <header>
        <div><span>AUTOMATED PRE-REVIEW</span><strong>需要主编判断</strong></div>
        <b>${Number(candidate.score_mean || 0).toFixed(1)} / 5</b>
      </header>
      <p>自动流水线没有否定这篇稿件，只标记了尚未闭合的证据边界。以下内容是审稿辅助，不构成编辑决定。</p>
      ${reasons.length ? `<ol class="nf-preflight-reasons">${reasons.map((reason) => `<li>${escapeHtml(localizeReason(reason))}</li>`).join('')}</ol>` : ''}
      ${renderEvidence(candidate.evidence)}
      <footer><span>RUN ${escapeHtml(candidate.run_id || 'unknown')}</span><span>${escapeHtml(candidate.source_id || 'source pending')}</span></footer>
    </aside>`;
  };

  const decorate = async () => {
    const manuscript = root.querySelector('.nf-manuscript');
    const decisionLetter = manuscript?.querySelector('.nf-decision-letter');
    const idLabel = manuscript?.querySelector('.nf-manuscript-id')?.textContent?.trim() || '';
    if (!manuscript || !decisionLetter || !idLabel.startsWith('MS-')) return;
    if (manuscript.querySelector('[data-preflight-key]')) return;

    const manuscriptKey = idLabel.slice(3).toUpperCase();
    const version = ++decorationVersion;
    const report = await loadReport();
    if (version !== decorationVersion || !manuscript.isConnected) return;

    const candidate = report.candidates.find((item) =>
      String(item?.manuscript_key || '').toUpperCase() === manuscriptKey
    );
    if (!candidate) return;

    const wrapper = document.createElement('div');
    wrapper.dataset.preflightKey = manuscriptKey;
    wrapper.innerHTML = renderPreflight(candidate);
    decisionLetter.before(wrapper);
  };

  let scheduled = false;
  const scheduleDecoration = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      decorate();
    });
  };

  new MutationObserver(scheduleDecoration).observe(root, { childList: true });
  scheduleDecoration();
})();
