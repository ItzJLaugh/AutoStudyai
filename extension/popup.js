// Global state
let lastStudyGuide = '';
let lastNotes = '';
let lastFlashcards = '';
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

// Progress logging functions
function showProgress(message, isComplete = false) {
  if (progressLog) {
    progressLog.style.display = 'block';
    const itemClass = isComplete ? 'progress-item progress-complete' : 'progress-item';
    progressLog.innerHTML += `<div class="${itemClass}">${message}</div>`;
    progressLog.scrollTop = progressLog.scrollHeight;
  }
}

function clearProgress() {
  if (progressLog) {
    progressLog.innerHTML = '';
    progressLog.style.display = 'none';
  }
}

// Example button toggle
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

// Tab switching logic
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(tab + '-section').classList.add('active');
  });
});

// Helper functions
function renderMarkdownBold(text) {
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
      html += `<li>${line.substring(2)}</li>`;
    } else {
      html += `<li style="list-style:none;font-weight:500;">${line}</li>`;
    }
  }
  html += '</ul>';
  return html;
}

function displayResults(response) {
  if (response && response.success) {
    lastNotes = response.notes || '';
    lastStudyGuide = response.study_guide || '';
    lastFlashcards = '';

    document.getElementById('notes-section').innerHTML = lastNotes
      ? renderMarkdownBold(formatSection('Notes', lastNotes))
      : 'No notes.';
    document.getElementById('guide-section').innerHTML = lastStudyGuide
      ? renderMarkdownBold(formatSection('Study Guide', lastStudyGuide))
      : 'No study guide.';
    document.getElementById('flashcards-section').innerHTML = 'Flashcards feature coming soon!';
    document.getElementById('chat-answer').innerHTML = '';
    document.getElementById('chat-input').value = '';
    document.getElementById('chat-history').innerHTML = '';
    chatHistory = [];

    if (saveBtn) saveBtn.style.display = lastStudyGuide ? 'inline-block' : 'none';
    statusDiv.innerText = 'Ready!';
  } else {
    statusDiv.innerText = 'Failed to generate.';
    if (saveBtn) saveBtn.style.display = 'none';
  }
}

// Capture button handler
captureBtn.addEventListener('click', async () => {
  statusDiv.innerText = 'Capturing...';
  clearProgress();
  showProgress('Starting content capture...');
  if (saveBtn) saveBtn.style.display = 'none';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;

    // Extract page title for subject detection
    const pageTitle = tabs[0].title || 'content';
    const subjectName = pageTitle.split(' - ')[0].split('|')[0].trim().substring(0, 30);

    showProgress(`Analyzing page: "${subjectName}"...`);

    // Try PDF extraction first
    chrome.tabs.sendMessage(tabId, {action: 'extractPdfText'}, (pdfResp) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, fallback to direct extraction
        showProgress('Scanning page for content...');
        fallbackToPageContent(tabId, tabUrl, subjectName);
        return;
      }

      if (pdfResp && pdfResp.content && pdfResp.content.trim().length > 100) {
        showProgress('PDF detected - extracting text...', true);
        showProgress('Processing PDF content...');
        sendToBackend(pdfResp.content, tabUrl, subjectName);
      } else {
        // Try slideshow capture
        showProgress('Checking for slideshows...');
        chrome.tabs.sendMessage(tabId, {action: 'captureSlideshow'}, (slideResp) => {
          if (slideResp && slideResp.success && slideResp.slides && slideResp.slides.length > 0) {
            showProgress(`Slideshow found - captured ${slideResp.slides.length} slides!`, true);
            const slideContent = slideResp.slides.map(s => s.content).join('\n\n');
            showProgress('Processing slideshow content...');
            sendToBackend(slideContent, tabUrl, subjectName);
          } else {
            // Try PPTX extraction
            chrome.tabs.sendMessage(tabId, {action: 'downloadPptx'}, (pptxResp) => {
              if (pptxResp && pptxResp.success && pptxResp.url) {
                showProgress('PowerPoint file detected - downloading...', true);
                fetch(pptxResp.url)
                  .then(r => r.blob())
                  .then(async (blob) => {
                    showProgress('Extracting slideshow content...');
                    const pptxParser = window.extractPptxText || (() => Promise.resolve(''));
                    const slideText = await pptxParser(blob);
                    sendToBackend(slideText, pptxResp.url, subjectName);
                  })
                  .catch(() => {
                    showProgress('Falling back to page content...');
                    fallbackToPageContent(tabId, tabUrl, subjectName);
                  });
              } else {
                showProgress('Grabbing page content...');
                fallbackToPageContent(tabId, tabUrl, subjectName);
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
  showProgress('Learning about "' + subjectName + '"...');

  // Show progress messages with delays using setTimeout chain
  setTimeout(() => {
    showProgress('Sending to AI for analysis...');
  }, 500);

  setTimeout(() => {
    showProgress('Generating notes and key points...');
  }, 1200);

  chrome.runtime.sendMessage({action: 'sendContent', content: content, url: url}, (response) => {
    if (response && response.success) {
      showProgress('Notes generated!', true);
      setTimeout(() => showProgress('Creating study questions...'), 400);
      setTimeout(() => showProgress('Study guide complete!', true), 900);
      setTimeout(() => showProgress('Organizing study materials...'), 1300);
      setTimeout(() => {
        showProgress('Complete!', true);
        displayResults(response);
      }, 1700);
    } else {
      showProgress('Processing failed', false);
      displayResults(response);
    }
  });
}

// Chat functions
function sendChat() {
  const question = chatInput.value.trim();
  if (!question) return;
  chatInput.value = '';

  // Use example mode if enabled
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
  // This is now handled by the toggle - get example for last question
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
    `<div style="margin-bottom:4px;"><b>${msg.role === 'user' ? 'You' : 'AI'}:</b> ${msg.text}</div>`
  ).join('');
}

// Chat event listeners
if (chatSendBtn) {
  chatSendBtn.addEventListener('click', sendChat);
}
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });
}
if (chatExampleBtn) {
  // Toggle example mode on click
  chatExampleBtn.addEventListener('click', toggleExampleMode);
  chatExampleBtn.title = 'Click to enable example mode';
}

// Save study guide
saveBtn.addEventListener('click', () => {
  if (!lastStudyGuide) return;
  const blob = new Blob([lastStudyGuide], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'study_guide.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
