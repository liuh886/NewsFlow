(() => {
  'use strict';

  const STARTUP_WATCHDOG_MS = 8000;

  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('NewsFlow early service worker update failed:', error));
  }

  const hardReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('newsflow-')).map((key) => caches.delete(key)));
      }
      const registration = await navigator.serviceWorker?.getRegistration?.();
      await registration?.update?.();
    } catch (error) {
      console.warn('NewsFlow cache recovery deferred:', error);
    }
    window.location.reload();
  };

  const showRecovery = () => {
    const app = document.getElementById('app');
    if (!app) return;
    if (!app.querySelector('.loading-screen') && app.childElementCount > 0) return;

    app.innerHTML = `<main class="loading-screen" data-startup-recovery="true">
      <div class="loading-lockup">
        <div class="loading-mark">N</div>
        <strong>NewsFlow 启动未完成</strong>
        <span>已停止继续等待。重新加载会清理 NewsFlow 的旧应用缓存并获取当前版本。</span>
        <button type="button" class="nf-office-primary" data-startup-retry>重新加载当前版本</button>
      </div>
    </main>`;

    app.querySelector('[data-startup-retry]')?.addEventListener('click', () => void hardReload());
    const status = document.getElementById('app-status');
    if (status) status.textContent = 'NewsFlow 启动未完成，可重新加载当前版本。';
  };

  const watchdogTimer = window.setTimeout(showRecovery, STARTUP_WATCHDOG_MS);
  window.addEventListener('newsflow:rendered', () => {
    const app = document.getElementById('app');
    if (app && !app.querySelector('.loading-screen')) window.clearTimeout(watchdogTimer);
  });
})();
