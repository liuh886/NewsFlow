(() => {
  'use strict';

  const hostId = 'hao-account-newsflow';

  function syncAccountMount() {
    const target = document.querySelector('.top-actions');
    const host = document.getElementById(hostId);
    if (!target || !host || host.parentElement === target) return;

    const mobileMenu = target.querySelector('.mobile-menu-button');
    target.insertBefore(host, mobileMenu || null);
  }

  window.addEventListener('newsflow:rendered', syncAccountMount);
  window.addEventListener('hao:account-changed', syncAccountMount);
  syncAccountMount();
})();
