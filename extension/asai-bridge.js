// asai-bridge.js
// Runs only on CordiaClassroom. It announces the extension and mirrors the site's
// existing session into extension storage so students never enter a password twice.
(function () {
  try {
    document.documentElement.setAttribute('data-asai-extension', 'ready');

    function announce() {
      window.postMessage({ type: 'ASAI_EXTENSION_READY' }, window.location.origin);
    }

    function syncAuth() {
      const authToken = localStorage.getItem('authToken') || '';
      const refreshToken = localStorage.getItem('refreshToken') || '';
      const userEmail = localStorage.getItem('userEmail') || '';
      if (authToken) {
        chrome.storage.local.set({ authToken, refreshToken, userEmail });
      } else {
        chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail']);
      }
    }

    function onMessage(event) {
      if (event.source === window && event.origin === window.location.origin && event.data?.type === 'CORDIA_AUTH_UPDATED') {
        syncAuth();
      }
    }

    syncAuth();
    window.addEventListener('message', onMessage);
    window.addEventListener('focus', syncAuth);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncAuth();
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', announce, { once: true });
    } else {
      announce();
    }
    setTimeout(announce, 1500);
  } catch (e) {
    // Never interfere with the host page.
  }
})();
