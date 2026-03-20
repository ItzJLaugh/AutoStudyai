// Global state
const API = 'https://autostudy-ai.fly.dev';
let lastStudyGuide = '';
let lastNotes = '';
let lastFlashcards = [];
let lastPageUrl = '';
let lastPageTitle = '';
let chatHistory = [];
let exampleModeEnabled = false;

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

// Auth DOM elements
const authLoginDiv = document.getElementById('auth-login');
const authLoggedInDiv = document.getElementById('auth-logged-in');
const authStatusDiv = document.getElementById('auth-status');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authLoginBtn = document.getElementById('auth-login-btn');
const authLogoutBtn = document.getElementById('auth-logout-btn');
const authUserEmail = document.getElementById('auth-user-email');
const authErrorDiv = document.getElementById('auth-error');

// =====================
// Auth functions
// =====================
async function initAuth() {
  const token = await getValidToken();
  if (token) {
    chrome.storage.local.get(['userEmail'], (result) => {
      showLoggedIn(result.userEmail || 'Logged in');
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
  authStatusDiv.textContent = 'Login to save guides to your platform';
}

function showLoggedIn(email) {
  authLoginDiv.style.display = 'none';
  authLoggedInDiv.style.display = 'block';
  authUserEmail.textContent = email;
  authStatusDiv.textContent = '';
}

authLoginBtn.addEventListener('click', async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  authErrorDiv.textContent = '';

  if (!email || !password) {
    authErrorDiv.textContent = 'Enter email and password';
    return;
  }

  authLoginBtn.disabled = true;
  authLoginBtn.textContent = 'Logging in...';

  try {
    const resp = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();

    if (resp.ok && data.access_token) {
      chrome.storage.local.set({
        authToken: data.access_token,
        refreshToken: data.refresh_token || '',
        userEmail: data.email || email
      });
      showLoggedIn(data.email || email);
    } else {
      authErrorDiv.textContent = data.detail || 'Login failed';
    }
  } catch (e) {
    authErrorDiv.textContent = 'Cannot connect to server';
  }

  authLoginBtn.disabled = false;
  authLoginBtn.textContent = 'Login';
});

authLogoutBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail']);
  showLoginForm();
  authEmailInput.value = '';
  authPasswordInput.value = '';
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
    document.getElementById('chat-history').innerHTML = '';
    chatHistory = [];

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

// Single-message slideshow capture — content.js handles the entire loop
// and takes screenshots inline via background.js (no per-slide popup round-trip)
async function captureSlideshowWithImages(tabId) {
  showProgress('Capturing slideshow (text + images)...');
  const result = await sendTabMessage(tabId, { action: 'captureSlideshowWithImages' }, 120000);
  if (!result || !result.success) {
    return { success: false, content: '', images: [] };
  }
  showProgress('Captured ' + result.totalSlides + ' slides' +
    (result.images && result.images.length > 0 ? ' + ' + result.images.length + ' screenshots' : ''), true);
  return {
    success: true,
    content: result.content,
    images: result.images || []
  };
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

// Full capture flow: PDF → slideshow → PPTX → page content
function runCaptureFlow(tabId, tabUrl, subjectName) {
  console.log('[CAPTURE-FLOW] Starting. URL:', tabUrl);
  chrome.tabs.sendMessage(tabId, { action: 'extractPdfText' }, (pdfResp) => {
    if (chrome.runtime.lastError) {
      console.log('[CAPTURE-FLOW] extractPdfText lastError:', chrome.runtime.lastError.message);
      showProgress('Content script unavailable, using page text...');
      rawPageFallback(tabId, tabUrl, subjectName);
      return;
    }

    console.log('[CAPTURE-FLOW] PDF check result:', pdfResp);
    if (pdfResp && pdfResp.content && pdfResp.content.trim().length > 100) {
      console.log('[CAPTURE-FLOW] → PDF path (content length:', pdfResp.content.length, ')');
      showProgress('PDF detected - extracting text...', true);
      showProgress('Processing PDF content...');
      sendToBackend(pdfResp.content, tabUrl, subjectName);
    } else {
      showProgress('Checking for slideshows...');
      chrome.tabs.sendMessage(tabId, { action: 'detectSlideshow' }, (slideInfo) => {
        console.log('[CAPTURE-FLOW] Slideshow check:', JSON.stringify(slideInfo));
        if (slideInfo && slideInfo.hasSlideshow && slideInfo.hasNavigation) {
          console.log('[CAPTURE-FLOW] → Slideshow path');
          showProgress('Slideshow detected — capturing slides...');
          captureSlideshowWithImages(tabId).then((result) => {
            if (result.success && result.content) {
              showProgress('Processing slideshow content...');
              sendToBackend(result.content, tabUrl, subjectName, result.images || []);
            } else {
              showProgress('Slideshow capture failed, trying page content...');
              fallbackToPageContent(tabId, tabUrl, subjectName);
            }
          });
        } else {
          console.log('[CAPTURE-FLOW] → Checking PPTX...');
          chrome.tabs.sendMessage(tabId, { action: 'downloadPptx' }, (pptxResp) => {
            console.log('[CAPTURE-FLOW] PPTX check:', JSON.stringify(pptxResp));
            if (pptxResp && pptxResp.success && pptxResp.url) {
              console.log('[CAPTURE-FLOW] → PPTX path. URL:', pptxResp.url);
              showProgress('PowerPoint file detected - downloading...', true);
              capturePptx(pptxResp.url, tabId, tabUrl, subjectName);
            } else {
              console.log('[CAPTURE-FLOW] → Page content fallback');
              showProgress('Grabbing page content...');
              fallbackToPageContent(tabId, tabUrl, subjectName);
            }
          });
        }
      });
    }
  });
}

// Download and parse a PPTX file
function capturePptx(pptxUrl, tabId, tabUrl, subjectName) {
  console.log('[PPTX-CAPTURE] Starting. PPTX URL:', pptxUrl);
  // Use content script to fetch (has session cookies for Canvas auth)
  sendTabMessage(tabId, { action: 'fetchBlob', url: pptxUrl }).then((blobResp) => {
    console.log('[PPTX-CAPTURE] fetchBlob response:', blobResp ? ('data length: ' + (blobResp.data ? blobResp.data.length : 'null')) : 'null');
    if (blobResp && blobResp.data) {
      showProgress('Extracting slideshow content...');
      // blobResp.data is base64 — convert to ArrayBuffer for pptxParser
      const binary = atob(blobResp.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      console.log('[PPTX-CAPTURE] Blob created. size:', blob.size, 'type:', blob.type);
      console.log('[PPTX-CAPTURE] window.extractPptxText exists?', typeof window.extractPptxText);
      console.log('[PPTX-CAPTURE] window["pptx-parser"] exists?', typeof window["pptx-parser"]);

      const pptxParser = window.extractPptxText || (() => Promise.resolve(''));
      console.log('[PPTX-CAPTURE] Calling extractPptxText...');
      pptxParser(blob).then((slideText) => {
        console.log('[PPTX-CAPTURE] extractPptxText result length:', slideText ? slideText.length : 0);
        console.log('[PPTX-CAPTURE] extractPptxText result (first 500):', slideText ? slideText.substring(0, 500) : '(empty)');
        if (slideText && slideText.length > 50) {
          console.log('[PPTX-CAPTURE] → Sending to backend');
          sendToBackend(slideText, pptxUrl, subjectName);
        } else {
          console.log('[PPTX-CAPTURE] → slideText too short, falling back to page content');
          fallbackToPageContent(tabId, tabUrl, subjectName);
        }
      });
    } else {
      console.log('[PPTX-CAPTURE] fetchBlob failed, trying direct fetch...');
      // Direct fetch fallback (won't have cookies for cross-origin)
      fetch(pptxUrl)
        .then(r => r.blob())
        .then(async (blob) => {
          console.log('[PPTX-CAPTURE] Direct fetch blob size:', blob.size);
          showProgress('Extracting slideshow content...');
          const pptxParser = window.extractPptxText || (() => Promise.resolve(''));
          const slideText = await pptxParser(blob);
          console.log('[PPTX-CAPTURE] Direct fetch parse result length:', slideText ? slideText.length : 0);
          sendToBackend(slideText, pptxUrl, subjectName);
        })
        .catch((err) => {
          console.error('[PPTX-CAPTURE] Direct fetch failed:', err);
          showProgress('Falling back to page content...');
          fallbackToPageContent(tabId, tabUrl, subjectName);
        });
    }
  });
}

// Last resort: raw body.innerText via executeScript (no content script needed)
function rawPageFallback(tabId, tabUrl, subjectName) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      let main = document.querySelector('main, article, [role="main"]') || document.body;
      return main.innerText;
    }
  }, (results) => {
    if (results && results[0] && results[0].result && results[0].result.trim().length > 50) {
      showProgress('Page content captured!', true);
      sendToBackend(results[0].result, tabUrl, subjectName);
    } else {
      statusDiv.innerText = 'Failed to capture content from this page.';
      showProgress('No content found', false);
    }
  });
}

// =====================
// Capture button handler
// =====================
const platformBanner = document.getElementById('platform-banner');

captureBtn.addEventListener('click', async () => {
  statusDiv.innerText = 'Capturing...';
  clearProgress();
  showProgress('Starting content capture...');
  if (saveBtn) saveBtn.style.display = 'none';
  if (platformBanner) platformBanner.style.display = 'none';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;
    lastPageUrl = tabUrl;

    const pageTitle = tabs[0].title || 'content';
    lastPageTitle = pageTitle.split(' - ')[0].split('|')[0].trim().substring(0, 60);

    showProgress(`Analyzing page: "${lastPageTitle}"...`);

    // Ensure content script is loaded before starting detection
    ensureContentScript(tabId, () => {
      runCaptureFlow(tabId, tabUrl, lastPageTitle);
    });
  });
});

function fallbackToPageContent(tabId, tabUrl, subjectName = 'content') {
  statusDiv.innerText = 'Capturing page content...';

  // First try smart extraction (LMS selectors, nav filtering, image collection)
  sendTabMessage(tabId, { action: 'extractContent' }).then((resp) => {
    if (resp && resp.content && resp.content.trim().length > 50) {
      showProgress('Page content captured!', true);
      sendToBackend(resp.content, tabUrl, subjectName, resp.images || []);
    } else {
      // Fallback: raw body.innerText as safety net
      showProgress('Smart extract too short, using full page text...');
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          let main = document.querySelector('main') || document.body;
          return main.innerText;
        }
      }, (results) => {
        if (results && results[0]) {
          const pageText = results[0].result;
          showProgress('Page content captured!', true);
          sendToBackend(pageText, tabUrl, subjectName);
        } else {
          statusDiv.innerText = 'Failed to capture page content.';
          showProgress('Failed to capture content', false);
        }
      });
    }
  });
}

function sendToBackend(content, url, subjectName = 'content', images = []) {
  statusDiv.innerText = 'Processing...';
  showProgress('Sending to AI for analysis...' + (images.length > 0 ? ' (' + images.length + ' images)' : ''));

  chrome.runtime.sendMessage({action: 'sendContent', content: content, url: url, images: images}, (response) => {
    if (response && response.success) {
      showProgress('Complete!', true);
      displayResults(response);
    } else if (response && response.status === 402) {
      showProgress('Free guide limit reached', false);
      statusDiv.innerText = 'Free limit reached — upgrade to Pro';
      if (platformBanner) {
        platformBanner.style.display = 'block';
        platformBanner.innerHTML = '&#9888; Free guide limit reached. <a href="https://autostudyai.online/billing" target="_blank">Upgrade to Pro</a> for unlimited guides.';
      }
      if (saveBtn) saveBtn.style.display = 'none';
    } else {
      const errMsg = (response && response.error) ? response.error : 'Unknown error';
      showProgress('Processing failed: ' + errMsg, false);
      statusDiv.innerText = 'Error: ' + errMsg;
      if (saveBtn) saveBtn.style.display = 'none';
    }
  });
}

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
        source_url: lastPageUrl || null
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
function sendChat() {
  const question = chatInput.value.trim();
  if (!question) return;
  chatInput.value = '';

  const mode = exampleModeEnabled ? 'example' : 'short';
  chatAnswerDiv.innerText = exampleModeEnabled ? 'Getting example...' : 'Thinking...';
  chatHistory.push({role: 'user', text: question});
  updateChatHistory();

  chrome.runtime.sendMessage({
    action: 'chatWithContent',
    question: question,
    content: lastNotes || lastStudyGuide || '',
    mode: mode
  }, (response) => {
    if (response && response.answer) {
      const prefix = exampleModeEnabled ? '[Example] ' : '';
      chatAnswerDiv.innerText = response.answer;
      chatHistory.push({role: 'ai', text: prefix + response.answer});
      updateChatHistory();
    } else {
      chatAnswerDiv.innerText = 'No answer.';
    }
  });
}

function sendExampleRequest() {
  const lastUserMsg = [...chatHistory].reverse().find(msg => msg.role === 'user');
  if (!lastUserMsg) {
    chatAnswerDiv.innerText = 'Ask a question first to get an example.';
    return;
  }
  chatAnswerDiv.innerText = 'Getting example...';
  chrome.runtime.sendMessage({
    action: 'chatWithContent',
    question: lastUserMsg.text,
    content: lastNotes || lastStudyGuide || '',
    mode: 'example'
  }, (response) => {
    if (response && response.answer) {
      chatAnswerDiv.innerText = response.answer;
      chatHistory.push({role: 'ai', text: '[Example] ' + response.answer});
      updateChatHistory();
    } else {
      chatAnswerDiv.innerText = 'No example found.';
    }
  });
}

function updateChatHistory() {
  chatHistoryDiv.innerHTML = chatHistory.map(msg =>
    `<div style="margin-bottom:4px;"><b>${msg.role === 'user' ? 'You' : 'AI'}:</b> ${escapeHtml(msg.text)}</div>`
  ).join('');
}

// Chat event listeners
if (chatSendBtn) chatSendBtn.addEventListener('click', sendChat);
if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
if (chatExampleBtn) {
  chatExampleBtn.addEventListener('click', toggleExampleMode);
  chatExampleBtn.title = 'Click to enable example mode';
}
