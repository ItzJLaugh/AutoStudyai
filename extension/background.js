// ...existing code...

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendContent') {
    fetch('http://localhost:8000/ingest', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        content: message.content,
        page_url: message.url
      })
    })
    .then(res => res.json())
    .then(data => {
      const content_id = data.content_id;
      // Immediately call /generate
      fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          content_id: content_id,
          notes: true,
          study_guide: true
        })
      })
      .then(res => res.json())
      .then(genData => {
        sendResponse({success: true, notes: genData.notes, study_guide: genData.study_guide});
      })
      .catch(() => {
        sendResponse({success: false});
      });
    })
    .catch(() => {
      sendResponse({success: false});
    });
    return true; // Keep the message channel open for async response
  }
  if (message.action === 'chatWithContent') {
    fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        question: message.question,
        content: message.content,
        mode: message.mode || 'short'
      })
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({answer: data.answer});
    })
    .catch(() => {
      sendResponse({answer: 'No answer.'});
    });
    return true;
  }
});
