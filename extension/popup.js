// Global state
const API = 'https://autostudy-ai.fly.dev';
let lastStudyGuide = '';
let lastNotes = '';
let lastFlashcards = [];
let lastPageUrl = '';
let lastPageTitle = '';
let lastSourceType = 'webpage';
let tutorSession = null;
let exampleModeEnabled = false;
let pendingSections = [];
let pendingImages = [];
let activeBrowserCommandId = null;
let pendingBrowserCommandId = null;
let tutorSkillOverride = '';

// DOM elements
const statusDiv = document.getElementById('status');
const saveBtn = document.getElementById('save-guide-btn');
const captureBtn = document.getElementById('capture-btn');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatExampleBtn = document.getElementById('chat-example-btn');
const chatAnswerDiv = document.getElementById('chat-answer');
const chatHistoryDiv = document.getElementById('chat-history');
const progressLog = document.getElementById('progress-log');
const reviewDiv = document.getElementById('capture-review');
const sectionList = document.getElementById('section-list');
const generateSelectedBtn = document.getElementById('generate-selected-btn');
const captureSource = document.getElementById('capture-source');
const tutorSessionBar = document.getElementById('tutor-session-bar');
const tutorSkill = document.getElementById('tutor-skill');
const browserStatus = document.getElementById('browser-status');
const pageContextTitle = document.getElementById('page-context-title');
const pageContextDomain = document.getElementById('page-context-domain');

// Auth DOM elements
const authLoginDiv = document.getElementById('auth-login');
const authLoggedInDiv = document.getElementById('auth-logged-in');
const authStatusDiv = document.getElementById('auth-status');
const authLogoutBtn = document.getElementById('auth-logout-btn');
const authUserEmail = document.getElementById('auth-user-email');

// =====================
// Auth functions
// =====================
async function initAuth() {
  const token = await getValidToken();
  if (token) {
    chrome.storage.local.get(['userEmail'], (result) => {
      showLoggedIn(result.userEmail || 'Logged in');
      initTutorSession();
    });
  } else {
    // Both access and refresh tokens are expired/invalid
    chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail']);
    showLoginForm();
  }
}

function showLoginForm() {
  authLoginDiv.style.display = 'block';
  authLoggedInDiv.style.display = 'none';
  authStatusDiv.textContent = 'Connect your CordiaClassroom account';
  tutorSession = null;
  if (tutorSessionBar) tutorSessionBar.style.display = 'none';
}

function showLoggedIn(email) {
  authLoginDiv.style.display = 'none';
  authLoggedInDiv.style.display = 'block';
  authUserEmail.textContent = email;
  authStatusDiv.textContent = '';
}

authLogoutBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail']);
  showLoginForm();
});

function runtimeMessage(message) {
  return new Promise(resolve => chrome.runtime.sendMessage(message, response => resolve(response || null)));
}

async function initTutorSession() {
  const response = await runtimeMessage({ action: 'getTutorSession' });
  if (!response?.id) {
    if (browserStatus) browserStatus.textContent = response?.error || 'Tutor unavailable';
    return;
  }
  renderTutorSession(response);
  await refreshPageContext();
  await publishBrowserPresence();
}

async function refreshPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:/.test(tab.url || '')) {
    pageContextTitle.textContent = 'Open a study page';
    pageContextDomain.textContent = 'Cordia only reads it when you ask.';
    return;
  }
  let host = '';
  try { host = new URL(tab.url).host; } catch (_) { /* keep the privacy label */ }
  pageContextTitle.textContent = tab.title || 'Current browser tab';
  pageContextDomain.textContent = host ? `${host} · Not sent until you ask` : 'Not sent until you ask';
}

function renderTutorSession(next) {
  tutorSession = next;
  if (tutorSessionBar) tutorSessionBar.style.display = 'grid';
  if (browserStatus) browserStatus.textContent = 'Browser available';
  if (tutorSkill) {
    const activeLabel = next.skills?.find(item => item.id === next.active_skill)?.label || 'Explain';
    const automatic = document.createElement('option');
    automatic.value = '';
    automatic.textContent = 'Auto · ' + activeLabel;
    tutorSkill.replaceChildren(automatic, ...(next.skills || []).map(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.available ? item.label : item.label + ' — coming soon';
      option.disabled = item.available === false;
      return option;
    }));
    tutorSkill.value = tutorSkillOverride;
  }
  updateChatHistory();
  maybeRunBrowserCommand(next);
}

async function publishBrowserPresence(contentRefs = null, lastActionResult = null, browserContent = null) {
  if (!tutorSession?.id) return;
  let observation;
  if (contentRefs) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !/^https?:/.test(tab.url || '')) return;
    observation = {
      url: tab.url,
      title: tab.title || '',
      source_type: lastSourceType || 'webpage',
      content_refs: contentRefs,
    };
  }
  const response = await runtimeMessage({
    action: 'updateBrowserContext',
    sessionId: tutorSession.id,
    observation,
    browserContent,
    lastActionResult,
  });
  if (response?.id) tutorSession = response;
  return response;
}

function reportCaptureResult(status, error = '', contentRefs = null, browserContent = null) {
  const commandId = pendingBrowserCommandId;
  pendingBrowserCommandId = null;
  return publishBrowserPresence(contentRefs, commandId ? {
    command_id: commandId,
    status,
    action: 'capture_current_page',
    ...(error ? { error } : {}),
    ...(contentRefs ? { section_count: contentRefs.length } : {}),
  } : null, browserContent);
}

function maybeRunBrowserCommand(session) {
  const command = session?.browser_command;
  if (!command?.id || command.status !== 'pending' || command.id === activeBrowserCommandId) return;
  activeBrowserCommandId = command.id;
  if (!session.permission_scope?.includes(command.required_permission || 'read_page')) {
    publishBrowserPresence(null, {
      command_id: command.id,
      status: 'failed',
      action: command.type,
      error: `Permission required: ${command.required_permission || 'read_page'}`,
    });
    return;
  }
  if (command.type === 'capture_current_page') {
    captureActiveTab(command.id);
    return;
  }
  if (command.type === 'find_material_current_page') {
    findMaterialInActiveTab(command);
    return;
  }
  publishBrowserPresence(null, {
    command_id: command.id,
    status: 'failed',
    action: command.type,
    error: 'Unsupported browser command',
  });
}

async function findStudyMaterialOnPage(requestedQuery) {
  const queryTerms = requestedQuery.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const studyTerms = ['module', 'slide', 'lecture', 'note', 'review', 'study', 'chapter', 'file', 'pdf', 'document', 'assignment'];
  const forbiddenPaths = [/\/quizzes\//i, /\/grades(?:\/|$)/i, /\/submissions?(?:\/|$)/i];
  const seen = new Set();
  const candidates = [...document.querySelectorAll('a[href]')]
    .map(link => {
      const url = new URL(link.href, location.href);
      const title = (link.innerText || link.textContent || link.getAttribute('aria-label') || url.pathname.split('/').pop() || 'Course material')
        .replace(/\s+/g, ' ').trim().slice(0, 180);
      const haystack = `${title} ${url.pathname}`.toLowerCase();
      const score = queryTerms.filter(term => haystack.includes(term)).length * 3
        + studyTerms.filter(term => haystack.includes(term)).length;
      return { title, url: url.href, score };
    })
    .filter(item => {
      const url = new URL(item.url);
      return url.origin === location.origin
        && item.title
        && item.score > 0
        && !forbiddenPaths.some(pattern => pattern.test(url.pathname))
        && !seen.has(item.url)
        && seen.add(item.url);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const sources = [];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, { credentials: 'include' });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.includes('text/html')) continue;
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      doc.querySelectorAll('script, style, nav, header, footer, form, input, textarea, select, button').forEach(node => node.remove());
      const root = doc.querySelector('main, article, [role="main"], .ic-Layout-contentMain') || doc.body;
      const text = (root?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12000);
      if (text.length >= 80) sources.push({ ...candidate, text });
    } catch (_) {
      // The link remains useful evidence even when Canvas protects its body.
    }
  }
  return {
    evidence: candidates.map(({ title, url }) => ({ title, url, source_type: 'course_link', content_refs: [] })),
    content: sources.map(source => `Source: ${source.title}\nURL: ${source.url}\n${source.text}`).join('\n\n').slice(0, 100000),
  };
}

async function findMaterialInActiveTab(command) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || '')) {
      throw new Error('Open the course page you want Cordia to search, then try again.');
    }
    lastPageUrl = tab.url;
    lastPageTitle = (tab.title || 'Canvas course material').slice(0, 120);
    lastSourceType = 'canvas';
    const query = String(command.goal || '');
    const [{ result = {} } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: findStudyMaterialOnPage,
      args: [query],
    });
    const evidence = result.evidence || [];
    if (!evidence.length) {
      throw new Error('No relevant study-material links were found on the current page.');
    }
    const documentContent = await readLinkedDocuments(tab.id, evidence);
    const foundContent = [result.content || '', documentContent].filter(Boolean).join('\n\n').slice(0, 100000);
    const updatedSession = await publishBrowserPresence(evidence.map(item => item.url), {
      command_id: command.id,
      status: 'completed',
      action: command.type,
      evidence,
    }, foundContent || null);
    if (foundContent && /\b(study guide|everything relevant|exam|quiz|test)\b/i.test(command.goal || '')) {
      const courseSourceUrl = evidence.find(item => /\/courses\/\d+(?:\/|$)/i.test(new URL(item.url).pathname))?.url;
      await buildGuideFromFoundMaterial(command, foundContent, updatedSession, courseSourceUrl || lastPageUrl);
    }
  } catch (error) {
    await publishBrowserPresence(null, {
      command_id: command.id,
      status: 'failed',
      action: command.type,
      error: error?.message || 'The current page could not be searched.',
    });
  }
}

async function buildGuideFromFoundMaterial(command, content, session, sourceUrl) {
  if (!session?.id || session.status !== 'idle') return;
  statusDiv.innerText = 'Building a study guide from the material Cordia found...';
  const response = await runtimeMessage({
    action: 'chatWithContent',
    question: `Build a study guide from the material found for: ${command.goal || 'this course topic'}`,
    content,
    contextTitle: command.goal || 'Canvas course material',
    contextUrl: sourceUrl || null,
    mode: 'short',
    sessionId: session.id,
    conversationVersion: session.conversation_version,
    skill: 'build_guide',
  });
  if (response?.session?.id) {
    tutorSkillOverride = '';
    renderTutorSession(response.session);
    statusDiv.innerText = response.answer || 'Study guide created.';
  } else {
    statusDiv.innerText = response?.error || 'The material was found, but the study guide could not be created.';
  }
}

tutorSkill?.addEventListener('change', async () => {
  if (!tutorSession?.id) return;
  tutorSkillOverride = tutorSkill.value;
  if (!tutorSkillOverride) return;
  const response = await runtimeMessage({
    action: 'setTutorSkill',
    sessionId: tutorSession.id,
    skill: tutorSkillOverride,
  });
  if (response?.id) renderTutorSession(response);
  else statusDiv.innerText = response?.error || 'Could not change Tutor skill.';
});

window.setInterval(async () => {
  if (!tutorSession?.id) return;
  const response = await runtimeMessage({ action: 'getTutorSession' });
  if (response?.id) {
    renderTutorSession(response);
    await refreshPageContext();
    await publishBrowserPresence();
  }
}, 5000);

chrome.tabs.onActivated.addListener(() => refreshPageContext());
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.title)) refreshPageContext();
});

// Init auth on popup open
initAuth();

// =====================
// Auto-refresh token helper
// =====================
async function getValidToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'refreshToken'], async (result) => {
      if (!result.authToken) { resolve(null); return; }

      // Try a quick check — if the token works, return it
      try {
        const check = await fetch(API + '/auth/me', {
          headers: { 'Authorization': 'Bearer ' + result.authToken }
        });
        if (check.ok) { resolve(result.authToken); return; }
      } catch (e) { /* fall through to refresh */ }

      // Token failed — try refresh
      if (!result.refreshToken) { resolve(null); return; }
      try {
        const resp = await fetch(API + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: result.refreshToken })
        });
        const data = await resp.json();
        if (resp.ok && data.access_token) {
          chrome.storage.local.set({
            authToken: data.access_token,
            refreshToken: data.refresh_token || result.refreshToken
          });
          resolve(data.access_token);
          return;
        }
      } catch (e) { /* refresh failed */ }

      resolve(null);
    });
  });
}

// =====================
// Progress logging
// =====================
function showProgress(message, isComplete = false) {
  if (progressLog) {
    progressLog.style.display = 'block';
    const itemClass = isComplete ? 'progress-item progress-complete' : 'progress-item';
    progressLog.innerHTML += `<div class="${itemClass}">${escapeHtml(message)}</div>`;
    progressLog.scrollTop = progressLog.scrollHeight;
  }
}

function clearProgress() {
  if (progressLog) {
    progressLog.innerHTML = '';
    progressLog.style.display = 'none';
  }
}

// =====================
// Example button toggle
// =====================
function toggleExampleMode() {
  exampleModeEnabled = !exampleModeEnabled;
  if (chatExampleBtn) {
    if (exampleModeEnabled) {
      chatExampleBtn.classList.add('active');
      chatExampleBtn.title = 'Example mode ON - responses will include examples';
    } else {
      chatExampleBtn.classList.remove('active');
      chatExampleBtn.title = 'Click to enable example mode';
    }
  }
}

// =====================
// Tab switching
// =====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(tab + '-section').classList.add('active');
  });
});

// =====================
// Helpers
// =====================

// XSS prevention — escape HTML entities before inserting into DOM
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function renderMarkdownBold(text) {
  // First escape, then selectively allow <b> tags from our own markdown conversion
  text = escapeHtml(text);
  return text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function formatSection(title, text) {
  const sectionRegex = /Section \d+:/g;
  let parts = text.split(sectionRegex).map(s => s.trim()).filter(Boolean);
  let matches = [...text.matchAll(sectionRegex)];
  let html = '';
  if (parts.length > 1 && matches.length === parts.length) {
    for (let i = 0; i < parts.length; i++) {
      html += `<div class="section-title">${matches[i][0]}</div>`;
      html += formatBullets(parts[i]);
    }
  } else {
    html += `<div class="section-title">${title}</div>`;
    html += formatBullets(text);
  }
  return html;
}

function formatBullets(text) {
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
  let html = '<ul>';
  for (let line of lines) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<li>${renderMarkdownBold(line.substring(2))}</li>`;
    } else {
      html += `<li style="list-style:none;font-weight:500;">${renderMarkdownBold(line)}</li>`;
    }
  }
  html += '</ul>';
  return html;
}

function displayResults(response) {
  if (response && response.success) {
    lastNotes = response.notes || '';
    lastStudyGuide = response.study_guide || '';
    lastFlashcards = response.flashcards || [];

    document.getElementById('notes-section').innerHTML = lastNotes
      ? formatSection('Notes', lastNotes)
      : 'No notes.';
    document.getElementById('guide-section').innerHTML = lastStudyGuide
      ? formatSection('Study Guide', lastStudyGuide)
      : 'No study guide.';

    // Display flashcards
    if (lastFlashcards.length > 0) {
      let fcHtml = `<div style="margin-bottom:8px;font-size:0.9em;color:#888;">${escapeHtml(String(lastFlashcards.length))} flashcards generated</div>`;
      lastFlashcards.forEach((fc) => {
        fcHtml += `<div style="background:#f5f5f5;padding:8px;border-radius:6px;margin-bottom:6px;">
          <div style="font-weight:500;">Q: ${escapeHtml(fc.front)}</div>
          <div style="color:#555;margin-top:4px;">A: ${escapeHtml(fc.back)}</div>
        </div>`;
      });
      document.getElementById('flashcards-section').innerHTML = fcHtml;
    } else {
      document.getElementById('flashcards-section').innerHTML = 'No flashcards generated.';
    }

    document.getElementById('chat-answer').innerHTML = '';
    document.getElementById('chat-input').value = '';
    updateChatHistory();

    // Show save button only if logged in and has content
    chrome.storage.local.get(['authToken'], (result) => {
      if (saveBtn) saveBtn.style.display = (lastStudyGuide && result.authToken) ? 'inline-block' : 'none';
    });

    statusDiv.innerText = 'Ready!';
    if (platformBanner) platformBanner.style.display = lastStudyGuide ? 'block' : 'none';
  } else {
    statusDiv.innerText = 'Failed to generate.';
    if (saveBtn) saveBtn.style.display = 'none';
    if (platformBanner) platformBanner.style.display = 'none';
  }
}

// =====================
// Image capture helpers
// =====================

// Promisified chrome.tabs.sendMessage with timeout
function sendTabMessage(tabId, message, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) { resolve(null); return; }
      resolve(response || null);
    });
  });
}

// Take a screenshot of the active tab via background.js
function takeScreenshot() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'screenshotTab' }, (response) => {
      resolve(response?.screenshot || null);
    });
  });
}

// =====================
// Content script injection + capture flow
// =====================

// Ensure content script is loaded on the tab. If not, inject it programmatically.
function ensureContentScript(tabId, callback) {
  chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      // Content script not loaded — inject it
      showProgress('Injecting content script...');
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          showProgress('Could not inject content script: ' + chrome.runtime.lastError.message);
          // Still try the callback — fallback will use executeScript for body.innerText
        }
        // Small delay to let the content script initialize
        setTimeout(callback, 200);
      });
    } else {
      callback();
    }
  });
}

function ensureContentScriptReady(tabId) {
  return new Promise(resolve => ensureContentScript(tabId, resolve));
}

function decodeFile(data, type) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: type || 'application/octet-stream' });
}

function documentFilename(source, fetched) {
  const finalName = decodeURIComponent((fetched.finalUrl || '').split(/[/?#]/).filter(Boolean).pop() || '');
  let name = /\.(pdf|pptx|docx|txt|md|csv|png|jpe?g|webp)$/i.test(finalName)
    ? finalName
    : (source.filename || 'study-material');
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
  const extension = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  }[(fetched.contentType || '').split(';')[0]] || '';
  return name + extension;
}

function canvasFileId(url) {
  try { return new URL(url).pathname.match(/\/files\/(\d+)/)?.[1] || ''; }
  catch (_) { return ''; }
}

function isLinkedDocument(url) {
  try {
    const path = new URL(url).pathname;
    return /\/files\/\d+/i.test(path) || /\.(pdf|pptx|docx|txt|md|csv)$/i.test(path);
  } catch (_) {
    return false;
  }
}

async function extractDocumentText(source, fetched, token, suppliedBlob = null) {
  const blob = suppliedBlob || decodeFile(fetched.data, fetched.contentType);
  const filename = documentFilename(source, fetched);
  const file = new File([blob], filename, {
    type: fetched.contentType || blob.type || 'application/octet-stream',
  });
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(API + '/extract-file-text', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
  const data = await response.json();
  if (!response.ok || !data.text?.trim()) throw new Error(data.detail || 'No readable study material was found');
  return { text: data.text.trim(), filename };
}

async function readLinkedDocuments(tabId, evidence) {
  const candidates = evidence.filter(item => isLinkedDocument(item.url)).slice(0, 3);
  if (!candidates.length) return '';
  const token = await getValidToken();
  if (!token) return '';
  await ensureContentScriptReady(tabId);
  const sections = [];
  for (const source of candidates) {
    const fetched = await sendTabMessage(tabId, { action: 'fetchFile', url: source.url }, 60000);
    if (!fetched?.success || !fetched.data) continue;
    try {
      const extracted = await extractDocumentText({ url: source.url, filename: source.title }, fetched, token);
      sections.push(`Source: ${source.title}\nURL: ${source.url}\n${extracted.text}`);
    } catch (_) {
      // Keep the link as evidence even when a document cannot be parsed.
    }
  }
  return sections.join('\n\n').slice(0, 60000);
}

async function captureDocument(tabId, source) {
  showProgress('Reading the attached document...');
  const token = await getValidToken();
  if (!token) throw new Error('Sign in to CordiaClassroom first');
  const fileId = canvasFileId(source.url);
  let blob;
  let fetched = await sendTabMessage(tabId, { action: 'fetchFile', url: source.url }, 60000);
  if (!fetched?.success || !fetched.data) {
    if (!fileId) throw new Error(fetched?.error || 'The document could not be opened');
    const download = await fetch(API + '/canvas/file/' + fileId, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!download.ok) {
      const error = await download.json().catch(() => ({}));
      throw new Error(error.detail || 'Canvas could not download this file');
    }
    blob = await download.blob();
    fetched = { contentType: blob.type, finalUrl: source.url };
  }
  const extracted = await extractDocumentText(source, fetched, token, blob);
  lastPageTitle = extracted.filename;
  showProgress('Document ready', true);
  sendToBackend(extracted.text);
}

async function screenshotFallback() {
  lastSourceType = 'screenshot';
  showProgress('The embedded viewer is protected; capturing the visible page instead...');
  const screenshot = await takeScreenshot();
  if (!screenshot) throw new Error('The page could not be captured');
  sendToBackend('[Visible study material]', [{ data: screenshot }]);
}

async function runCaptureFlow(tabId) {
  const source = await sendTabMessage(tabId, { action: 'extractSource' });
  if (!source) {
    rawPageFallback(tabId);
    return;
  }
  if (source.kind === 'file') {
    lastSourceType = 'file';
    await captureDocument(tabId, source);
    return;
  }
  if (source.content?.trim() && (source.selected || source.content.trim().length > 50)) {
    lastSourceType = source.selected ? 'selected_text' : 'webpage';
    showProgress(source.selected ? 'Selection captured' : 'Page content captured', true);
    sendToBackend(source.content);
    return;
  }
  await screenshotFallback();
}

// Last resort: raw body.innerText via executeScript (no content script needed)
function rawPageFallback(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      let main = document.querySelector('main, article, [role="main"]') || document.body;
      return main.innerText;
    }
  }, (results) => {
    if (results && results[0] && results[0].result && results[0].result.trim().length > 50) {
      showProgress('Page content captured!', true);
      sendToBackend(results[0].result);
    } else {
      statusDiv.innerText = 'Failed to capture content from this page.';
      showProgress('No content found', false);
      reportCaptureResult('failed', statusDiv.innerText);
    }
  });
}

// =====================
// Capture button handler
// =====================
const platformBanner = document.getElementById('platform-banner');

async function captureActiveTab(commandId = null) {
  statusDiv.innerText = 'Capturing...';
  clearProgress();
  showProgress('Starting content capture...');
  if (saveBtn) saveBtn.style.display = 'none';
  if (platformBanner) platformBanner.style.display = 'none';

  pendingBrowserCommandId = commandId;
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  const tab = tabs[0];
  if (!tab?.id || !/^https?:/.test(tab.url || '')) {
    statusDiv.innerText = 'Open a study page in a normal browser tab first.';
    await reportCaptureResult('failed', statusDiv.innerText);
    return;
  }
    const tabId = tab.id;
    const tabUrl = tab.url;
    lastPageUrl = tabUrl;
    lastSourceType = 'webpage';

    const pageTitle = tab.title || 'content';
    lastPageTitle = pageTitle.split(' - ')[0].split('|')[0].trim().substring(0, 60);

    showProgress(`Analyzing page: "${lastPageTitle}"...`);

    // Ensure content script is loaded before starting detection
    ensureContentScript(tabId, () => {
      runCaptureFlow(tabId).catch((error) => {
        statusDiv.innerText = error.message || 'Failed to capture content.';
        showProgress(statusDiv.innerText, false);
        reportCaptureResult('failed', statusDiv.innerText);
      });
    });
}

captureBtn.addEventListener('click', () => captureActiveTab());

function sendToBackend(content, images = []) {
  statusDiv.innerText = 'Processing...';
  showProgress('Sending to AI for analysis...' + (images.length > 0 ? ' (' + images.length + ' images)' : ''));
  pendingSections = [];
  pendingImages = [];

  chrome.runtime.sendMessage({action: 'ingestContent', content: content, images: images}, (response) => {
    if (response && response.success) {
      pendingSections = response.sections || [];
      pendingImages = response.use_images ? images : [];
      renderCaptureReview(response);
      const refs = pendingSections.map(section => section.heading).slice(0, 20);
      const normalizedContent = pendingSections
        .map(section => `${section.heading}\n${section.text}`)
        .join('\n\n')
        .slice(0, 100000);
      reportCaptureResult('completed', '', refs, normalizedContent);
    } else if (response && response.status === 402) {
      showGuideLimit();
    } else {
      const errMsg = (response && response.error) ? response.error : 'Unknown error';
      showProgress('Processing failed: ' + errMsg, false);
      statusDiv.innerText = 'Error: ' + errMsg;
      if (saveBtn) saveBtn.style.display = 'none';
      reportCaptureResult('failed', errMsg);
    }
  });
}

function showGuideLimit() {
  showProgress('Monthly guide limit reached', false);
  statusDiv.innerText = 'Monthly guide limit reached';
  if (platformBanner) {
    platformBanner.style.display = 'block';
    platformBanner.innerHTML = '<a href="https://classroom.cordiacode.com/settings?section=subscription" target="_blank">View plan</a>';
  }
  if (saveBtn) saveBtn.style.display = 'none';
}

function renderCaptureReview(response) {
  reviewDiv.style.display = 'block';
  sectionList.innerHTML = '';
  captureSource.replaceChildren();
  const sourceTitle = document.createElement('strong');
  sourceTitle.textContent = lastPageTitle || 'Captured page';
  const sourceUrl = document.createElement('a');
  sourceUrl.href = lastPageUrl;
  sourceUrl.target = '_blank';
  sourceUrl.rel = 'noopener noreferrer';
  sourceUrl.textContent = lastPageUrl;
  captureSource.append('Source: ', sourceTitle, document.createElement('br'), sourceUrl);
  document.getElementById('excluded-summary').textContent = response.excluded_summary || '';
  (response.sections || []).forEach(section => {
    const label = document.createElement('label');
    label.className = 'capture-section';
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(section.id)}" checked> <b>${escapeHtml(section.heading)}</b>`;
    sectionList.appendChild(label);
  });
  if (!response.is_educational || !(response.sections || []).length) {
    statusDiv.innerText = 'No study material found. Try selecting the material, capturing a screenshot, or opening a PDF or PowerPoint.';
  }
  updateGenerateButton();
}

function updateGenerateButton() {
  generateSelectedBtn.disabled = !sectionList.querySelector('input:checked');
}

sectionList.addEventListener('change', updateGenerateButton);
generateSelectedBtn.addEventListener('click', () => {
  const sectionIds = [...sectionList.querySelectorAll('input:checked')].map(input => input.value);
  const selectedIds = new Set(sectionIds);
  const content = pendingSections
    .filter(section => selectedIds.has(section.id))
    .map(section => section.text)
    .join('\n\n');
  if (!content) return;
  generateSelectedBtn.disabled = true;
  chrome.runtime.sendMessage({ action: 'generateContent', content, images: pendingImages }, response => {
    generateSelectedBtn.disabled = false;
    if (response?.success) { reviewDiv.style.display = 'none'; displayResults(response); }
    else if (response?.status === 402) { showGuideLimit(); }
    else { statusDiv.innerText = 'Error: ' + (response?.error || 'Generation failed'); }
  });
});

// =====================
// Save to platform
// =====================
saveBtn.addEventListener('click', async () => {
  if (!lastStudyGuide) return;

  const token = await getValidToken();
  if (!token) {
    statusDiv.innerText = 'Must log in again.';
    showLoginForm();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const resp = await fetch(API + '/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        title: lastPageTitle || 'Study Guide',
        notes: lastNotes || null,
        study_guide: lastStudyGuide || null,
        flashcards: lastFlashcards.length > 0 ? lastFlashcards : null,
        source_url: /^https?:\/\//i.test(lastPageUrl) ? lastPageUrl : null,
        source_type: lastSourceType,
        source_title: lastPageTitle || 'Captured webpage'
      })
    });

    const data = await resp.json();
    if (resp.ok && data.guide) {
      statusDiv.innerText = 'Saved to platform!';
      saveBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.textContent = 'Save to Platform';
        saveBtn.disabled = false;
      }, 2000);
    } else if (resp.status === 401 || resp.status === 403) {
      chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail']);
      statusDiv.innerText = 'Must log in again.';
      showLoginForm();
      saveBtn.textContent = 'Save to Platform';
      saveBtn.disabled = false;
    } else {
      statusDiv.innerText = 'Save failed: ' + (data.detail || 'Unknown error');
      saveBtn.textContent = 'Save to Platform';
      saveBtn.disabled = false;
    }
  } catch (e) {
    statusDiv.innerText = 'Cannot connect to server';
    saveBtn.textContent = 'Save to Platform';
    saveBtn.disabled = false;
  }
});

// =====================
// Chat functions
// =====================
async function sendChat(forcedMode = null) {
  const question = chatInput.value.trim();
  if (!question || !tutorSession?.id || tutorSession.status !== 'idle') return;
  chatInput.value = '';

  const mode = forcedMode || (exampleModeEnabled ? 'example' : 'short');
  chatAnswerDiv.innerText = exampleModeEnabled ? 'Getting example...' : 'Thinking...';
  tutorSession = {
    ...tutorSession,
    status: 'running',
    messages: [...(tutorSession.messages || []), { role: 'user', text: question }],
  };
  updateChatHistory();

  const response = await runtimeMessage({
    action: 'chatWithContent',
    question: question,
    content: lastStudyGuide || lastNotes || pendingSections.map(section => section.text).join('\n\n'),
    contextTitle: lastPageTitle || 'Current browser material',
    contextUrl: lastPageUrl || null,
    mode: mode,
    sessionId: tutorSession.id,
    conversationVersion: tutorSession.conversation_version,
    skill: tutorSkillOverride || null,
  });
  if (response?.session?.id) {
    tutorSkillOverride = '';
    chatAnswerDiv.innerText = response.answer || '';
    renderTutorSession(response.session);
  } else {
    chatAnswerDiv.innerText = response?.error || 'Tutor request failed.';
    const refreshed = await runtimeMessage({ action: 'getTutorSession' });
    if (refreshed?.id) renderTutorSession(refreshed);
  }
}

function updateChatHistory() {
  chatHistoryDiv.innerHTML = (tutorSession?.messages || []).map(msg => {
    const evidence = (msg.evidence || []).map(item =>
      `<a class="session-evidence" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || item.url)}</a>`
    ).join('');
    return `<div class="session-message ${msg.role === 'user' ? 'user' : 'ai'}"><b>${msg.role === 'user' ? 'You' : 'Cordia'}:</b> ${escapeHtml(msg.text)}${evidence}</div>`;
  }).join('');
  chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

// Chat event listeners
if (chatSendBtn) chatSendBtn.addEventListener('click', sendChat);
if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
if (chatExampleBtn) {
  chatExampleBtn.addEventListener('click', toggleExampleMode);
  chatExampleBtn.title = 'Click to enable example mode';
}
