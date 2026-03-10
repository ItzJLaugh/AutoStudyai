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
function initAuth() {
  chrome.storage.local.get(['authToken', 'userEmail'], (result) => {
    if (result.authToken) {
      showLoggedIn(result.userEmail || 'Logged in');
    } else {
      showLoginForm();
    }
  });
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

    chrome.tabs.sendMessage(tabId, {action: 'extractPdfText'}, (pdfResp) => {
      if (chrome.runtime.lastError) {
        showProgress('Scanning page for content...');
        fallbackToPageContent(tabId, tabUrl, lastPageTitle);
        return;
      }

      if (pdfResp && pdfResp.content && pdfResp.content.trim().length > 100) {
        showProgress('PDF detected - extracting text...', true);
        showProgress('Processing PDF content...');
        sendToBackend(pdfResp.content, tabUrl, lastPageTitle);
      } else {
        showProgress('Checking for slideshows...');
        chrome.tabs.sendMessage(tabId, {action: 'captureSlideshow'}, async (slideResp) => {
          if (slideResp && slideResp.success && slideResp.slides && slideResp.slides.length > 0) {
            showProgress(`Slideshow found - captured ${slideResp.slides.length} slides!`, true);
            let slideContent = slideResp.content || slideResp.slides.map(s => s.content).join('\n\n');

            // Send any slide images through GPT-4o Vision to extract text/diagram descriptions
            const allImages = [];
            if (slideResp.slideImages) {
              for (const images of Object.values(slideResp.slideImages)) {
                for (const b64 of images) allImages.push(b64);
              }
            }
            if (allImages.length > 0) {
              showProgress(`Reading ${allImages.length} image(s) from slides...`);
              let token = '';
              try {
                const stored = await new Promise(r => chrome.storage.local.get(['authToken'], r));
                token = stored.authToken || '';
              } catch (e) {}
              const visionResults = await Promise.allSettled(
                allImages.map(b64 =>
                  fetch(API + '/extract-image-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ image_data: b64 })
                  }).then(r => r.ok ? r.json() : { text: '' })
                    .then(r => r.text || '')
                    .catch(() => '')
                )
              );
              const descriptions = visionResults
                .map(r => r.status === 'fulfilled' ? r.value : '')
                .filter(t => t.length > 10);
              if (descriptions.length > 0) {
                slideContent += '\n\n--- Visual Content From Slides ---\n' + descriptions.join('\n\n');
              }
            }

            showProgress('Processing slideshow content...');
            sendToBackend(slideContent, tabUrl, lastPageTitle);
          } else {
            chrome.tabs.sendMessage(tabId, {action: 'downloadPptx'}, (pptxResp) => {
              if (pptxResp && pptxResp.success && pptxResp.url) {
                showProgress('PowerPoint file detected - downloading...', true);
                fetch(pptxResp.url)
                  .then(r => r.blob())
                  .then(async (blob) => {
                    showProgress('Extracting slideshow content...');
                    const pptxParser = window.extractPptxText || (() => Promise.resolve(''));
                    const slideText = await pptxParser(blob);
                    sendToBackend(slideText, pptxResp.url, lastPageTitle);
                  })
                  .catch(() => {
                    showProgress('Falling back to page content...');
                    fallbackToPageContent(tabId, tabUrl, lastPageTitle);
                  });
              } else {
                showProgress('Checking for slide content...');
                chrome.tabs.sendMessage(tabId, {action: 'extractContent'}, (extractResp) => {
                  if (extractResp && extractResp.content && extractResp.content.trim().length > 100) {
                    if (extractResp.hasSlideshow) {
                      showProgress('Slideshow content extracted!', true);
                    } else {
                      showProgress('Page content captured!', true);
                    }
                    sendToBackend(extractResp.content, tabUrl, lastPageTitle);
                  } else {
                    showProgress('Grabbing page content...');
                    fallbackToPageContent(tabId, tabUrl, lastPageTitle);
                  }
                });
              }
            });
          }
        });
      }
    });
  });
});

function fallbackToPageContent(tabId, tabUrl, subjectName = 'content') {
  statusDiv.innerText = 'Capturing page content...';
  chrome.scripting.executeScript({
    target: {tabId: tabId},
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

function sendToBackend(content, url, subjectName = 'content') {
  statusDiv.innerText = 'Processing...';
  showProgress('Sending to AI for analysis...');

  chrome.runtime.sendMessage({action: 'sendContent', content: content, url: url}, (response) => {
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
