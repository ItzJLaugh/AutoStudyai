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
  if (message.action === 'sendContent') {
    (async () => {
      try {
        const ingestResp = await authedFetch('/ingest', {
          method: 'POST',
          body: JSON.stringify({
            content: message.content,
            page_url: message.url
          })
        });
        const ingestData = await ingestResp.json();

        if (!ingestResp.ok) {
          const detail = ingestData.detail;
          const errMsg = typeof detail === 'object' ? (detail.message || 'Request failed') : (detail || 'Ingest failed');
          sendResponse({ success: false, error: errMsg, status: ingestResp.status });
          return;
        }

        const genResp = await authedFetch('/generate', {
          method: 'POST',
          body: JSON.stringify({
            content_id: ingestData.content_id,
            notes: true,
            study_guide: true,
            flashcards: true
          })
        });
        const genData = await genResp.json();

        if (!genResp.ok) {
          const detail = genData.detail;
          const errMsg = typeof detail === 'object' ? (detail.message || 'Request failed') : (detail || 'Generation failed');
          sendResponse({ success: false, error: errMsg, status: genResp.status });
          return;
        }

        sendResponse({
          success: true,
          notes: genData.notes,
          study_guide: genData.study_guide,
          flashcards: genData.flashcards || []
        });
      } catch (e) {
        sendResponse({ success: false, error: e.message || 'Request failed' });
      }
    })();
    return true; // Keep the message channel open for async response
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
