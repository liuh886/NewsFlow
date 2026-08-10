(() => {
  'use strict';

  const requests = new Map();

  const loadJson = (path, timeoutMs = 5000) => {
    const key = new URL(path, window.location.href).href;
    if (!requests.has(key)) {
      const request = fetch(path, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      }).then((response) => {
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        return response.json();
      }).catch((error) => {
        requests.delete(key);
        throw error;
      });
      requests.set(key, request);
    }
    return requests.get(key);
  };

  window.NewsFlowData = Object.freeze({ loadJson });
})();