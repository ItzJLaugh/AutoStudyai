// AutoStudyAI Background Service Worker
// All API calls include auth token for security

const API_URL = 'https://autostudy-ai.fly.dev';

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
          content: message.content, page_url: message.url, images: message.images || []
        }) });
        const data = await response.json();
        sendResponse(response.ok ? { success: true, ...data } : { success: false, error: data.detail || 'Ingest failed', status: response.status });
      } catch (error) { sendResponse({ success: false, error: error.message || 'Request failed' }); }
    })();
    return true;
  }

  if (message.action === 'generateContent') {
    (async () => {
      try {
        const response = await authedFetch('/generate', { method: 'POST', body: JSON.stringify({
          content_id: message.contentId, section_ids: message.sectionIds, notes: true, study_guide: true, flashcards: true
        }) });
        const data = await response.json();
        sendResponse(response.ok ? { success: true, ...data } : { success: false, error: data.detail || 'Generation failed', status: response.status });
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
            mode: message.mode || 'short'
          })
        });
        const data = await resp.json();
        sendResponse({ answer: data.answer || 'No answer.' });
      } catch (e) {
        sendResponse({ answer: 'Error: ' + (e.message || 'Request failed') });
      }
    })();
    return true;
  }
});
