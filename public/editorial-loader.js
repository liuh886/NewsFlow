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
    './review-game.css',
    './review-stamp.css',
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
      document.querySelectorAll('[data-action="open-editorial-office"]').forEach((launcher) => {
        launcher.removeAttribute('data-newsflow-role');
        const topbarLauncher = launcher.closest('.top-actions');
        if (topbarLauncher) {
          launcher.classList.add('nf-mode-launcher');
          launcher.style.display = 'inline-flex';
          let label = launcher.querySelector('.nf-mode-launcher-label');
          if (!label) {
            label = document.createElement('span');
            label.className = 'nf-mode-launcher-label';
            launcher.append(label);
          }
          if (!ready) label.textContent = '编辑部';
        } else if (!ready) {
          const label = launcher.querySelector('.nav-name span:last-child, :scope > span:last-child');
          if (label) label.textContent = '编辑部';
        }
        if (!ready) {
          launcher.setAttribute('aria-label', '打开编辑部');
          launcher.title = '编辑部';
        }
      });
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
  window.addEventListener('newsflow:open-editorial-overview', () => {
    if (ready || replaying) return;
    void ensureEditorialRuntime().then(() => {
      replaying = true;
      window.dispatchEvent(new CustomEvent('newsflow:open-editorial-overview', {
        detail: { lazyLoaded: true }
      }));
      replaying = false;
    });
  });
  window.addEventListener('newsflow:rendered', syncEditorialEntry);
  window.addEventListener('newsflow:edition-rendered', syncEditorialEntry);
  window.addEventListener('newsflow:editorial-runtime-ready', syncEditorialEntry);
  window.addEventListener('hao:account-changed', syncEditorialEntry);

  syncEditorialEntry();
  window.NewsFlowEditorialLoader = Object.freeze({ ensure: ensureEditorialRuntime });
})();