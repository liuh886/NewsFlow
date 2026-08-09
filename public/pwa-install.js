(() => {
  'use strict';

  const INSTALL_ENTRY_MODE = 'persistent';
  let deferredPrompt = null;
  let prompting = false;

  const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
  const isAndroid = () => /android/i.test(window.navigator.userAgent || '');

  const closeInstallHelp = () => {
    document.querySelector('[data-newsflow-install-help]')?.remove();
  };

  const closeReaderMenu = () => {
    document.querySelector('[data-action="mobile-close"]')?.click();
  };

  const installHelpCopy = () => {
    if (isIOS()) {
      return {
        lead: 'iPhone / iPad 由浏览器负责把 NewsFlow 加到主屏幕。',
        steps: ['使用 Safari 打开 NewsFlow', '点“分享”', '选择“添加到主屏幕”，然后确认“添加”']
      };
    }
    if (isAndroid()) {
      return {
        lead: '浏览器暂时还没有开放原生安装提示，但 NewsFlow 仍可安装。',
        steps: ['继续使用当前页面；Chrome 通常会在首次交互并停留一段时间后开放安装', '或者打开浏览器菜单', '选择“安装应用”或“添加到主屏幕”']
      };
    }
    return {
      lead: '浏览器暂时还没有开放原生安装提示。',
      steps: ['打开浏览器主菜单', '选择“安装 NewsFlow”“安装应用”或“创建快捷方式”', '如果当前浏览器不支持 PWA 安装，可在 Chrome、Edge 或 Safari 中打开本页']
    };
  };

  const showInstallHelp = () => {
    closeInstallHelp();
    closeReaderMenu();
    const copy = installHelpCopy();
    const wrapper = document.createElement('div');
    wrapper.dataset.newsflowInstallHelp = 'true';
    wrapper.innerHTML = `
      <button class="edition-overlay" type="button" data-newsflow-install-close aria-label="关闭安装说明"></button>
      <section class="edition-panel" role="dialog" aria-modal="true" aria-labelledby="newsflow-install-title">
        <header class="edition-panel-head">
          <span>Install NewsFlow</span>
          <button type="button" data-newsflow-install-close aria-label="关闭安装说明">×</button>
        </header>
        <div class="edition-panel-body">
          <p class="section-label">PWA</p>
          <h2 id="newsflow-install-title">安装 NewsFlow</h2>
          <p class="panel-question">${copy.lead}</p>
          <section>
            <ol>${copy.steps.map((step) => `<li>${step}</li>`).join('')}</ol>
          </section>
        </div>
      </section>`;
    document.body.appendChild(wrapper);
    requestAnimationFrame(() => wrapper.querySelector('.edition-panel-head button')?.focus());
  };

  const syncInstallAction = () => {
    document.querySelectorAll('[data-newsflow-install-section]').forEach((section) => section.remove());
    if (isInstalled()) return;

    const sidebar = document.querySelector('.app-shell[data-product-model="magazine-edition"] .sidebar');
    if (!sidebar) return;

    const section = document.createElement('section');
    section.className = 'sidebar-section';
    section.dataset.newsflowInstallSection = 'true';
    section.dataset.installEntryMode = INSTALL_ENTRY_MODE;
    section.innerHTML = `
      <p class="section-label">应用</p>
      <div class="sidebar-list">
        <button class="nav-button" type="button" data-newsflow-install-action aria-label="安装 NewsFlow 应用">
          <span class="nav-name"><span class="nav-indicator"></span><span>安装应用</span></span>
        </button>
      </div>`;
    sidebar.appendChild(section);
  };

  const promptInstall = async () => {
    if (prompting) return;
    if (!deferredPrompt) {
      showInstallHelp();
      return;
    }

    prompting = true;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      prompting = false;
      syncInstallAction();
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    syncInstallAction();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    closeInstallHelp();
    syncInstallAction();
  });

  window.addEventListener('newsflow:rendered', syncInstallAction);
  window.addEventListener('newsflow:edition-rendered', syncInstallAction);

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-newsflow-install-close]')) {
      closeInstallHelp();
      return;
    }
    if (event.target.closest?.('[data-newsflow-install-action]')) void promptInstall();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeInstallHelp();
  });

  syncInstallAction();
})();
