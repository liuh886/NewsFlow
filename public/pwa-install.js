(() => {
  'use strict';

  let deferredPrompt = null;
  let prompting = false;

  const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches;

  const syncInstallAction = () => {
    document.querySelectorAll('[data-newsflow-install-section]').forEach((section) => section.remove());
    if (!deferredPrompt || isInstalled()) return;

    const sidebar = document.querySelector('.app-shell[data-product-model="magazine-edition"] .sidebar');
    if (!sidebar) return;

    const section = document.createElement('section');
    section.className = 'sidebar-section';
    section.dataset.newsflowInstallSection = 'true';
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
    if (!deferredPrompt || prompting) return;
    prompting = true;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    syncInstallAction();
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      prompting = false;
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    syncInstallAction();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    syncInstallAction();
  });

  window.addEventListener('newsflow:rendered', syncInstallAction);
  window.addEventListener('newsflow:edition-rendered', syncInstallAction);

  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-newsflow-install-action]')) return;
    void promptInstall();
  });

  syncInstallAction();
})();
