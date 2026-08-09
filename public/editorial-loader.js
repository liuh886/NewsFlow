(() => {
  'use strict';

  const currentScript = document.currentScript;
  const version = (() => {
    try {
      return new URL(currentScript?.src || window.location.href).searchParams.get('v') || '';
    } catch {
      return '';
    }
  })();
  const versioned = (path) => version ? `${path}?v=${encodeURIComponent(version)}` : path;
  const styles = [
    './editorial-mode.css',
    './review-game.css',
    './editorial-governance.css'
  ];
  const scripts = [
    './review-game.js',
    './editorial-governance.js',
    './editorial-office.js'
  ];

  let loading = null;
  let ready = false;
  let replaying = false;

  const syncEditorialEntry = () => {
    window.requestAnimationFrame(() => {
      const actions = document.querySelector('.app-shell[data-product-model="magazine-edition"] .top-actions');
      const launcher = actions?.querySelector(':scope > [data-action="open-editorial-office"]');
      if (!launcher) return;
      launcher.style.display = 'grid';
      if (!launcher.dataset.newsflowRole) {
        launcher.setAttribute('aria-label', '进入审稿模式');
        launcher.title = '审稿模式';
      }
    });
  };

  const loadStyle = (path) => new Promise((resolve, reject) => {
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find((link) => link.getAttribute('href')?.includes(path.replace('./', '')));
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = versioned(path);
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load ${path}`));
    document.head.append(link);
  });

  const loadScript = (path) => new Promise((resolve, reject) => {
    const existing = [...document.scripts]
      .find((script) => script.src.includes(path.replace('./', '')));
    if (existing) {
      if (existing.dataset.newsflowLoaded === 'true') resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = versioned(path);
    script.async = false;
    script.onload = () => {
      script.dataset.newsflowLoaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${path}`));
    document.body.append(script);
  });

  const ensureEditorialRuntime = () => {
    if (ready) return Promise.resolve();
    if (loading) return loading;
    loading = (async () => {
      await Promise.all(styles.map(loadStyle));
      for (const path of scripts) await loadScript(path);
      ready = true;
      window.dispatchEvent(new CustomEvent('newsflow:editorial-runtime-ready'));
      syncEditorialEntry();
    })().catch((error) => {
      loading = null;
      console.error('NewsFlow editorial runtime failed to load:', error);
      throw error;
    });
    return loading;
  };

  window.addEventListener('newsflow:open-editorial-office', () => {
    if (ready || replaying) return;
    void ensureEditorialRuntime().then(() => {
      replaying = true;
      window.dispatchEvent(new CustomEvent('newsflow:open-editorial-office', {
        detail: { lazyLoaded: true }
      }));
      replaying = false;
    });
  });
  window.addEventListener('newsflow:rendered', syncEditorialEntry);
  window.addEventListener('newsflow:edition-rendered', syncEditorialEntry);
  window.addEventListener('newsflow:editorial-rendered', syncEditorialEntry);
  window.addEventListener('newsflow:editorial-runtime-ready', syncEditorialEntry);

  syncEditorialEntry();
  window.NewsFlowEditorialLoader = Object.freeze({ ensure: ensureEditorialRuntime });
})();
