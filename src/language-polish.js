const appRoot = document.querySelector('#app');

const replaceExactText = (selector, from, to) => {
  document.querySelectorAll(selector).forEach((element) => {
    if (element.textContent?.trim() === from) element.textContent = to;
  });
};

const applyChineseLanguagePolish = () => {
  document.documentElement.lang = 'zh-CN';
  document.documentElement.dataset.newsflowLanguage = 'zh-CN';

  replaceExactText('.signal-score .score-row span', 'Signal score', '信号评分');
  replaceExactText('.source-verification', 'Primary', '机构 / 一手源');
  replaceExactText('.drawer-brand', 'NewsFlow · Evidence view', 'NewsFlow · 证据视图');

  document.querySelectorAll('.article-meta span, .drawer-eyebrow').forEach((element) => {
    const text = element.textContent || '';
    if (text.includes('Score ')) element.textContent = text.replaceAll('Score ', '评分 ');
  });
};

applyChineseLanguagePolish();

const observer = new MutationObserver(() => applyChineseLanguagePolish());
if (appRoot) observer.observe(appRoot, { childList: true });
