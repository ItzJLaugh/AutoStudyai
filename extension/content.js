(() => {
  if (globalThis.__cordiaScraperInstalled) return;
  globalThis.__cordiaScraperInstalled = true;

  const DOCUMENT_PATTERN = /\.(pdf|pptx|docx|txt|md|csv|png|jpe?g|webp)(?:$|[?#])/i;
  const LMS_MAIN = [
    '#content', '.ic-Layout-contentMain', '#region-main', '.course-content',
    '#contentPanel', '.vtbegenerated', '.d2l-page-main', '.d2l-content-wrapper',
    'main', 'article', '[role="main"]', '#main-content',
  ];
  const NOISE = [
    'script', 'style', 'noscript', 'nav', 'header', 'footer', 'form', 'button',
    '[role="navigation"]', '[aria-hidden="true"]', '.screenreader-only',
    '.ic-app-header', '.ic-app-nav-toggle-and-crumbs', '.module-sequence-footer',
  ].join(',');

  function absoluteUrl(value) {
    if (!value || /^(javascript|data):/i.test(value)) return '';
    try { return new URL(value, location.href).href; } catch (_) { return ''; }
  }

  function normalizeCanvasDownload(url) {
    const parsed = new URL(url);
    if (!/\/files\/\d+(?:\/(?:preview|file_preview))?\/?$/i.test(parsed.pathname)) return url;
    parsed.pathname = parsed.pathname.replace(/\/(?:preview|file_preview)\/?$/i, '').replace(/\/$/, '') + '/download';
    if (!parsed.searchParams.has('download_frd')) parsed.searchParams.set('download_frd', '1');
    return parsed.href;
  }

  function filename(url, element) {
    const label = element?.getAttribute('download') || element?.getAttribute('title') || element?.textContent?.trim();
    if (label && DOCUMENT_PATTERN.test(label)) return label.split(/[/\\]/).pop();
    return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || 'study-material');
  }

  function documentSource() {
    const candidates = [];
    document.querySelectorAll('iframe[src], embed[src], object[data], a[href]').forEach(element => {
      const attribute = element.tagName === 'OBJECT' ? 'data' : element.tagName === 'A' ? 'href' : 'src';
      const url = absoluteUrl(element.getAttribute(attribute));
      if (!url) return;
      const metadata = `${url} ${element.getAttribute('type') || ''} ${element.getAttribute('title') || ''} ${element.textContent || ''}`;
      const canvasFile = /\/files\/\d+(?:\/(?:preview|file_preview|download))?(?:[/?#]|$)/i.test(url);
      if (!canvasFile && !DOCUMENT_PATTERN.test(metadata) && !/application\/(pdf|vnd\.openxmlformats)/i.test(metadata)) return;
      candidates.push({
        kind: 'file',
        url: canvasFile ? normalizeCanvasDownload(url) : url,
        filename: filename(url, element),
        embedded: ['IFRAME', 'EMBED', 'OBJECT'].includes(element.tagName),
      });
    });
    if (DOCUMENT_PATTERN.test(location.href)) {
      candidates.push({ kind: 'file', url: location.href, filename: filename(location.href), embedded: true });
    }
    return candidates.sort((a, b) => Number(b.embedded) - Number(a.embedded))[0] || null;
  }

  function pageText() {
    const selected = window.getSelection()?.toString().trim();
    if (selected) return { kind: 'text', text: selected, selected: true, title: document.title };

    const copy = document.cloneNode(true);
    copy.querySelectorAll(NOISE).forEach(node => node.remove());
    const article = typeof Readability === 'function'
      ? new Readability(copy, { charThreshold: 80, maxElemsToParse: 0 }).parse()
      : null;
    if (article?.textContent?.trim().length > 80) {
      return { kind: 'text', text: article.textContent.trim(), selected: false, title: article.title || document.title };
    }

    const root = LMS_MAIN.map(selector => document.querySelector(selector)).find(Boolean) || document.body;
    const fallback = root.cloneNode(true);
    fallback.querySelectorAll(NOISE).forEach(node => node.remove());
    return {
      kind: 'text',
      text: (fallback.innerText || fallback.textContent || '').replace(/\n{3,}/g, '\n\n').trim(),
      selected: false,
      title: document.title,
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'ping') {
      sendResponse({ scraperVersion: 1 });
      return false;
    }
    if (message.action === 'scrapePage') {
      sendResponse(documentSource() || pageText());
      return false;
    }
    return false;
  });
})();
