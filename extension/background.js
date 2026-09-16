// AutoStudyAI Background Service Worker
// All API calls include auth token for security

const API_URL = 'https://autostudy-ai.fly.dev';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Helper to get auth token from storage
function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      resolve(result.authToken || '');
    });
  });
}

// Helper to make authenticated API requests
async function authedFetch(path, options = {}) {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    ...(options.headers || {})
  };
  return fetch(API_URL + path, { ...options, headers });
}

function errorMessage(data, fallback) {
  const detail = data && data.detail;
  return typeof detail === 'string' ? detail : (detail && detail.message) || fallback;
}

function safeSameOriginStudyUrl(currentUrl, requestedUrl) {
  try {
    const current = new URL(currentUrl);
    const requested = new URL(requestedUrl);
    if (!['http:', 'https:'].includes(requested.protocol) || requested.origin !== current.origin) return null;
    if (/\/(quizzes|grades|submissions?)(?:\/|$)/i.test(requested.pathname)) return null;
    return requested.href;
  } catch (_) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'navigateActiveTab') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const target = tab?.id && safeSameOriginStudyUrl(tab.url || '', message.url || '');
        if (!target) {
          sendResponse({ success: false, error: 'Cordia can only open safe study links from the current site.' });
          return;
        }
        const updated = await chrome.tabs.update(tab.id, { url: target });
        sendResponse({ success: true, url: updated?.url || target });
      } catch (error) {
        sendResponse({ success: false, error: error.message || 'The study link could not be opened.' });
      }
    })();
    return true;
  }

  // Screenshot handler for slide-by-slide capture with images
  if (message.action === 'screenshotTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl || null });
    });
    return true;
  }

  if (message.action === 'ingestContent') {
    (async () => {
      try {
        const response = await authedFetch('/ingest', { method: 'POST', body: JSON.stringify({
          content: message.content, images: message.images || []
        }) });
        const data = await response.json();
        sendResponse(response.ok ? { success: true, ...data } : { success: false, error: errorMessage(data, 'Ingest failed'), status: response.status });
      } catch (error) { sendResponse({ success: false, error: error.message || 'Request failed' }); }
    })();
    return true;
  }

  if (message.action === 'generateContent') {
    (async () => {
      try {
        const response = await authedFetch('/generate', { method: 'POST', body: JSON.stringify({
          content: message.content, images: message.images || [], notes: true, study_guide: true, flashcards: true
        }) });
        const data = await response.json();
        sendResponse(response.ok ? { success: true, ...data } : { success: false, error: errorMessage(data, 'Generation failed'), status: response.status });
      } catch (error) { sendResponse({ success: false, error: error.message || 'Request failed' }); }
    })();
    return true;
  }

  if (message.action === 'chatWithContent') {
    (async () => {
      try {
        const resp = await authedFetch('/chat', {
          method: 'POST',
          body: JSON.stringify({
            question: message.question,
            content: message.content,
            mode: message.mode || 'short',
            context_title: message.contextTitle || null,
            context_url: message.contextUrl || null,
            session_id: message.sessionId,
            conversation_version: message.conversationVersion,
            skill: message.skill || null
          })
        });
        const data = await resp.json();
        sendResponse(resp.ok ? data : { error: errorMessage(data, 'Tutor request failed'), status: resp.status });
      } catch (e) {
        sendResponse({ error: e.message || 'Request failed' });
      }
    })();
    return true;
  }

  if (message.action === 'getTutorSession') {
    (async () => {
      try {
        const response = await authedFetch('/tutor/session');
        const data = await response.json();
        sendResponse(response.ok ? data : { error: errorMessage(data, 'Tutor session unavailable'), status: response.status });
      } catch (error) { sendResponse({ error: error.message || 'Request failed' }); }
    })();
    return true;
  }

  if (message.action === 'setTutorSkill') {
    (async () => {
      try {
        const response = await authedFetch('/tutor/session/skill', {
          method: 'PATCH',
          body: JSON.stringify({ session_id: message.sessionId, skill: message.skill })
        });
        const data = await response.json();
        sendResponse(response.ok ? data : { error: errorMessage(data, 'Tutor skill could not be changed'), status: response.status });
      } catch (error) { sendResponse({ error: error.message || 'Request failed' }); }
    })();
    return true;
  }

  if (message.action === 'updateBrowserContext') {
    (async () => {
      try {
        const response = await authedFetch('/tutor/session/browser', {
          method: 'PATCH',
          body: JSON.stringify({
            session_id: message.sessionId,
            browser_available: true,
            browser_observation: message.observation,
            browser_content: message.browserContent,
            permission_scope: ['read_page'],
            last_action_result: message.lastActionResult
          })
        });
        const data = await response.json();
        sendResponse(response.ok ? data : { error: errorMessage(data, 'Browser context could not be synchronized'), status: response.status });
      } catch (error) { sendResponse({ error: error.message || 'Request failed' }); }
    })();
    return true;
  }
});
