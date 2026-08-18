// asai-bridge.js
// Minimal presence beacon: runs ONLY on autostudyai.online so the web app can
// detect that the extension is installed and unlock the onboarding walkthrough.
// Does not touch capture logic (content.js / pptxParser.js).
(function () {
  try {
    // DOM marker the web app polls for.
    document.documentElement.setAttribute('data-asai-extension', 'ready');

    // Active notification in case the page is already listening.
    function announce() {
      window.postMessage({ type: 'ASAI_EXTENSION_READY' }, window.location.origin);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', announce, { once: true });
    } else {
      announce();
    }
    // Re-announce shortly after load to cover late-mounting React listeners.
    setTimeout(announce, 1500);
  } catch (e) {
    // Never throw on the host page.
  }
})();
