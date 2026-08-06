(() => {
  'use strict';

  const hostId = 'hao-account-newsflow';

  function syncAccountMount() {
    const target = document.querySelector('.top-actions');
    const host = document.getElementById(hostId);
    if (!target || !host) return;

    host.classList.remove('is-floating');
    host.classList.add('is-embedded');
    if (host.parentElement !== target) {
      const mobileMenu = target.querySelector('.mobile-menu-button');
      target.insertBefore(host, mobileMenu || null);
    }
  }

  const observer = new MutationObserver(syncAccountMount);
  observer.observe(document.getElementById('app') || document.body, {
    childList: true,
    subtree: true,
  });

  syncAccountMount();
  window.addEventListener('hao:account-changed', syncAccountMount);
})();
