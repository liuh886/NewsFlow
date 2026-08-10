(() => {
  'use strict';

  const INSTALL_ENTRY_MODE = 'persistent';
  let deferredPrompt = null;
  let prompting = false;
  let lastPromptOutcome = '';

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
        lead: 'iPhone / iPad 由浏览器负责把 Newsflow 加到主屏幕。',
        steps: ['使用 Safari 打开 Newsflow', '点“分享”', '选择“添加到主屏幕”，然后确认“添加”']
      };
    }
    if (lastPromptOutcome === 'dismissed') {
      return {
        lead: '你刚刚关闭了浏览器的安装窗口。这个原生安装提示一次只能调用一次。',
        steps: ['重新载入 Newsflow 后再次选择“安装应用”', '或者直接打开浏览器主菜单', '选择“安装应用”“安装 Newsflow”或“添加到主屏幕”']
      };
    }
    if (isAndroid()) {
      return {
        lead: 'Newsflow 已具备 PWA 安装条件，但当前页面没有可直接调用的安装窗口。',
        steps: ['先查看浏览器地址栏或菜单是否已有“安装应用”入口', '如果 Newsflow 已经安装，浏览器不会再次发送网页安装提示', '否则重新载入页面后再试，或从浏览器菜单选择“安装应用”或“添加到主屏幕”']
      };
    }
    return {
      lead: 'Newsflow 已具备 PWA 安装条件，但当前页面没有可直接调用的安装窗口。',
      steps: ['先查看地址栏是否有“安装应用”图标', '或者打开浏览器主菜单，选择“应用”或“安装 Newsflow”（不同浏览器措辞略有差异）', '如果 Newsflow 已经安装，浏览器不会再次发送网页安装提示；请从系统应用列表或浏览器的应用管理中打开']
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
          <span>Install Newsflow</span>
          <button type="button" data-newsflow-install-close aria-label="关闭安装说明">×</button>
        </header>
        <div class="edition-panel-body">
          <p class="section-label">PWA</p>
          <h2 id="newsflow-install-title">安装 Newsflow</h2>
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
        <button class="nav-button" type="button" data-newsflow-install-action aria-label="安装 Newsflow 应用">
          <span class="nav-name"><span class="nav-indicator"></span><span>安装应用</span></span>
        </button>
      </div>`;

    const heading = sidebar.querySelector('[data-edition-layer="filter-heading"]');
    if (heading) heading.insertAdjacentElement('afterend', section);
    else sidebar.prepend(section);
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
      const choice = await promptEvent.userChoice;
      lastPromptOutcome = String(choice?.outcome || '');
    } finally {
      prompting = false;
      syncInstallAction();
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    lastPromptOutcome = '';
    syncInstallAction();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    lastPromptOutcome = 'accepted';
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
