(() => {
  'use strict';

  const STARTUP_WATCHDOG_MS = 8000;

  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('NewsFlow early service worker update failed:', error));
  }

  const showRecovery = () => {
    const app = document.getElementById('app');
    if (!app?.querySelector('.loading-screen')) return;

    app.innerHTML = `<main class="loading-screen" data-startup-recovery="true">
      <div class="loading-lockup">
        <div class="loading-mark">N</div>
        <strong>信号流加载超时</strong>
        <span>已停止继续等待。请重新加载，NewsFlow 将优先使用可用缓存与内置内容。</span>
        <button type="button" class="nf-office-primary" data-startup-retry>重新加载</button>
      </div>
    </main>`;

    app.querySelector('[data-startup-retry]')?.addEventListener('click', () => window.location.reload());
    document.getElementById('app-status').textContent = 'NewsFlow 加载超时，可重新加载。';
  };

  window.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(showRecovery, STARTUP_WATCHDOG_MS);
  }, { once: true });
})();
