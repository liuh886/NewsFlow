(() => {
  'use strict';

  const STATUS_PATH = './data/data-status.json';
  const SESSION_KEY = 'newsflow_editorial_round_count';
  const rootId = 'newsflow-editorial-delight-root';
  const DECISION_EVENTS = {
    accept: {
      stamp: 'ACCEPT',
      title: '决定已签发',
      tone: 'accept',
      lines: [
        '审稿人二号短暂失去反对意见，编辑会议被迫提前结束。',
        '本文成功通过同行评议。同行对此表示遗憾，但接受现实。',
        '所有审稿人罕见地达成一致，系统已记录这一低概率事件。',
        '证据、方法与结论同时在线，编辑部决定不再继续为难作者。'
      ]
    },
    minor_revision: {
      stamp: 'MINOR',
      title: '小修通知',
      tone: 'minor',
      lines: [
        '所谓小修：请重写摘要、方法和结论，其余内容保持不变。',
        '审稿人只提出了一个小问题，共计十二条、四页半。',
        '原则上可以接受，前提是作者准确猜中“再清楚一点”的含义。',
        '请补充一张不改变结论、但能让审稿人安心的图。'
      ]
    },
    major_revision: {
      stamp: 'MAJOR',
      title: '大修通知',
      tone: 'major',
      lines: [
        '审稿人认为本文很有潜力，尤其是在成为另一篇文章之后。',
        '核心问题值得研究，建议作者从核心问题重新开始研究。',
        '文章结构清晰地暴露了需要全面重构的部分。',
        '请增加机制、样本、稳健性，以及作者尚未发明的识别策略。'
      ]
    },
    reject: {
      stamp: 'REJECT',
      title: '拒稿理由',
      tone: 'reject',
      lines: [
        '审稿人二号认为本文最大的不足，是没有引用审稿人二号。',
        '研究问题很重要，因此不宜由本文率先解决。',
        '方法过于透明，削弱了同行评议应有的神秘感。',
        '结果可以复现，令人怀疑作者是否充分尊重偶然性。',
        '语言过于简洁，严重压缩了审稿人的发挥空间。',
        '图 3 的箭头方向具有明显立场，建议重新考虑。',
        '审稿人未能发现致命问题，因此决定将此视为致命问题。',
        '创新性充分，但充分得令人不安，建议拒稿后由本刊重新发现。',
        '样本量尚可，但尚未覆盖过去、现在与未来的全部情况。',
        '结论过于清楚，不符合本领域长期保持争议的优良传统。',
        '建议补充未来三十年的数据后重新投稿。',
        '文章回答了提出的问题，但审稿人更关心另一个问题。',
        '理论与证据相互支持，缺少必要的戏剧冲突。',
        '选题符合征稿范围，但不符合审稿人今天的心情。',
        '作者使用了“显著”一词，审稿人要求其在统计、文学与哲学上同时成立。',
        '本文过早抵达结论，尚未充分经历学术旅程。'
      ]
    }
  };

  let status = null;
  let activeTimer = 0;
  let lastEventKey = '';

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const randomLine = (lines, key) => {
    const available = lines.length > 1 ? lines.filter((line) => `${key}:${line}` !== lastEventKey) : lines;
    const line = available[Math.floor(Math.random() * available.length)] || lines[0] || '';
    lastEventKey = `${key}:${line}`;
    return line;
  };

  const readRound = () => {
    const value = Number.parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
    return Number.isFinite(value) ? value : 0;
  };

  const nextRound = () => {
    const value = readRound() + 1;
    sessionStorage.setItem(SESSION_KEY, String(value));
    return value;
  };

  const ensureRoot = () => {
    let root = document.getElementById(rootId);
    if (!root) {
      root = document.createElement('div');
      root.id = rootId;
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    return root;
  };

  const closeEvent = () => {
    window.clearTimeout(activeTimer);
    const root = ensureRoot();
    root.classList.remove('is-visible');
    root.innerHTML = '';
  };

  const showDecisionEvent = (decision) => {
    const event = DECISION_EVENTS[decision];
    if (!event) return;
    const root = ensureRoot();
    const round = nextRound();
    const line = randomLine(event.lines, decision);
    root.innerHTML = `
      <button class="nf-delight-backdrop" type="button" data-delight-dismiss aria-label="关闭情绪反馈"></button>
      <section class="nf-delight-card is-${escapeHtml(event.tone)}" role="status" aria-label="${escapeHtml(event.title)}">
        <div class="nf-delight-meta"><span>EDITORIAL EVENT</span><span>ROUND ${String(round).padStart(2, '0')}</span></div>
        <div class="nf-delight-stamp" aria-hidden="true">${escapeHtml(event.stamp)}</div>
        <h2>${escapeHtml(event.title)}</h2>
        <p>${escapeHtml(line)}</p>
        <footer><span>情绪反馈 · 不写入评审档案</span><kbd>ESC</kbd></footer>
      </section>`;
    requestAnimationFrame(() => root.classList.add('is-visible'));
    window.clearTimeout(activeTimer);
    activeTimer = window.setTimeout(closeEvent, decision === 'reject' ? 2600 : 2100);
  };

  const parseDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatBadge = (value) => {
    const date = parseDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: status?.timezone || 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit'
    }).format(date).replace('-', '.');
  };

  const formatLong = (value) => {
    const date = parseDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: status?.timezone || 'Asia/Shanghai',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const decorateBrand = () => {
    const brandName = document.querySelector('.brand-name');
    if (!brandName || !status?.updated_at) return;
    const parent = brandName.parentElement;
    if (!parent) return;
    parent.classList.add('nf-brand-copy');
    let row = parent.querySelector('.nf-brand-row');
    if (!row) {
      row = document.createElement('span');
      row.className = 'nf-brand-row';
      brandName.before(row);
      row.appendChild(brandName);
    }
    let badge = row.querySelector('.nf-data-date');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nf-data-date';
      row.appendChild(badge);
    }
    badge.textContent = formatBadge(status.updated_at);
    badge.title = `数据更新至 ${formatLong(status.updated_at)}`;
    badge.setAttribute('aria-label', badge.title);
  };

  const loadStatus = async () => {
    try {
      const response = await fetch(STATUS_PATH, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload && typeof payload.updated_at === 'string') status = payload;
    } catch {
      status = null;
    }
    decorateBrand();
  };

  document.addEventListener('click', (event) => {
    const dismiss = event.target.closest('[data-delight-dismiss]');
    if (dismiss) {
      closeEvent();
      return;
    }
    const target = event.target.closest('[data-editorial-action="decision"][data-decision]');
    if (!target) return;
    const decision = target.dataset.decision || '';
    window.setTimeout(() => showDecisionEvent(decision), 70);
  });

  document.addEventListener('keydown', (event) => {
    const root = ensureRoot();
    if (event.key === 'Escape' && root.classList.contains('is-visible')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeEvent();
      return;
    }
    const keyMap = { '1': 'accept', '2': 'minor_revision', '3': 'major_revision', '4': 'reject' };
    const decision = keyMap[event.key];
    if (!decision || !document.querySelector(`.nf-decision-button[data-decision="${decision}"]`)) return;
    window.setTimeout(() => showDecisionEvent(decision), 70);
  }, true);

  const observer = new MutationObserver(() => decorateBrand());
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

  loadStatus();
})();
