/**
 * Resolve the study source the student is looking at.
 * Binary documents are sent unchanged to CordiaClassroom's server extractor.
 */

const DOCUMENT_EXTENSIONS = [
  'pdf', 'pptx', 'docx', 'txt', 'md', 'csv',
  'png', 'jpg', 'jpeg', 'webp', 'gif',
];
const DOCUMENT_PATTERN = new RegExp(`\\.(${DOCUMENT_EXTENSIONS.join('|')})(?:$|[?#])`, 'i');
const MAIN_SELECTORS = [
  '#content', '.ic-Layout-contentMain',
  '#region-main', '.course-content',
  '#contentPanel', '.vtbegenerated',
  '.d2l-page-main', '.d2l-content-wrapper',
  'main', 'article', '[role="main"]', '#main-content',
];

function absoluteUrl(value) {
  if (!value || /^(javascript|data):/i.test(value)) return '';
  try { return new URL(value, location.href).href; } catch (_) { return ''; }
}

function filenameFrom(url, element) {
  const download = element?.getAttribute?.('download');
  if (download) return download;
  const label = element?.getAttribute?.('title') || element?.textContent?.trim();
  if (label && DOCUMENT_PATTERN.test(label)) return label.split(/[/\\]/).pop();
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || 'study-material');
  } catch (_) {
    return 'study-material';
  }
}

function normalizeCanvasDownload(url) {
  try {
    const parsed = new URL(url);
    if (!/\/files\/\d+(?:\/(?:preview|file_preview))?\/?$/i.test(parsed.pathname)) return url;
    parsed.pathname = parsed.pathname.replace(/\/(?:preview|file_preview)\/?$/i, '').replace(/\/$/, '') + '/download';
    if (!parsed.searchParams.has('download_frd')) parsed.searchParams.set('download_frd', '1');
    return parsed.href;
  } catch (_) {
    return url;
  }
}

function documentCandidate(element, attribute) {
  const raw = element.getAttribute(attribute);
  const url = absoluteUrl(raw);
  if (!url) return null;
  const metadata = `${url} ${element.getAttribute('type') || ''} ${element.getAttribute('title') || ''} ${element.textContent || ''}`;
  const canvasFile = /\/files\/\d+(?:\/(?:preview|file_preview|download))?(?:[/?#]|$)/i.test(url);
  const knownDocument = DOCUMENT_PATTERN.test(metadata) || /application\/(pdf|vnd\.openxmlformats)/i.test(metadata);
  if (!canvasFile && !knownDocument) return null;
  return {
    kind: 'file',
    url: canvasFile ? normalizeCanvasDownload(url) : url,
    filename: filenameFrom(url, element),
    embedded: ['IFRAME', 'EMBED', 'OBJECT'].includes(element.tagName),
  };
}

function findDocument(embeddedOnly = false) {
  const candidates = [];
  document.querySelectorAll('iframe[src], embed[src], object[data], a[href]').forEach((element) => {
    const attribute = element.tagName === 'OBJECT' ? 'data' : element.tagName === 'A' ? 'href' : 'src';
    const candidate = documentCandidate(element, attribute);
    if (candidate) candidates.push(candidate);
  });
  if (DOCUMENT_PATTERN.test(location.href)) {
    candidates.push({ kind: 'file', url: location.href, filename: filenameFrom(location.href), embedded: true });
  }
  const ranked = candidates.sort((a, b) => Number(b.embedded) - Number(a.embedded));
  return (embeddedOnly ? ranked.find(candidate => candidate.embedded) : ranked[0]) || null;
}

function visibleText() {
  const source = MAIN_SELECTORS.map((selector) => document.querySelector(selector)).find(Boolean) || document.body;
  const copy = source.cloneNode(true);
  copy.querySelectorAll([
    'script', 'style', 'noscript', 'nav', 'header', 'footer', 'form',
    'button', '[role="navigation"]', '[aria-hidden="true"]', '.screenreader-only',
    '.ic-app-header', '.ic-app-nav-toggle-and-crumbs', '.module-sequence-footer',
  ].join(',')).forEach((element) => element.remove());
  return {
    kind: 'text',
    content: copy.innerText.replace(/\n{3,}/g, '\n\n').trim(),
    selected: false,
    title: document.title,
  };
}

function extractSource() {
  const selected = window.getSelection()?.toString().trim() || '';
  if (selected) return { kind: 'text', content: selected, selected: true, title: document.title };
  const embeddedDocument = findDocument(true);
  if (embeddedDocument) return embeddedDocument;
  const pageText = visibleText();
  return pageText.content.length > 50 ? pageText : findDocument() || pageText;
}

async function fetchFile(url) {
  const response = await fetch(url, { credentials: 'include', redirect: 'follow' });
  if (!response.ok) throw new Error(`Document request failed (${response.status})`);
  const blob = await response.blob();
  if (!blob.size || blob.size > 20 * 1024 * 1024) throw new Error('Document is empty or larger than 20 MB');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read document'));
    reader.readAsDataURL(blob);
  });
  return {
    data: String(dataUrl).split(',')[1] || '',
    contentType: blob.type || response.headers.get('content-type') || '',
    finalUrl: response.url || url,
  };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ ok: true });
    return false;
  }
  if (request.action === 'extractSource') {
    sendResponse(extractSource());
    return false;
  }
  if (request.action === 'fetchFile' && request.url) {
    fetchFile(request.url)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});
