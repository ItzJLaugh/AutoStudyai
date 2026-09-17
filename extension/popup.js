const state = {
  screenshot: '',
  scraped: null,
  sections: [],
  images: [],
  source: null,
};

const buttons = [...document.querySelectorAll('.action')];
const status = document.getElementById('status');
const result = document.getElementById('result');
const resultTitle = document.getElementById('result-title');
const resultContent = document.getElementById('result-content');
const openClassroom = document.getElementById('open-classroom');

function runtime(message) {
  return new Promise(resolve => chrome.runtime.sendMessage(message, response => {
    resolve(chrome.runtime.lastError ? { success: false, error: chrome.runtime.lastError.message } : response);
  }));
}

function storage(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function setBusy(value) {
  buttons.forEach(button => { button.disabled = value; });
}

function show(text) {
  status.textContent = text;
}

function showResult(title, content, classroomHref = '') {
  result.hidden = false;
  resultTitle.textContent = title;
  resultContent.textContent = content;
  openClassroom.hidden = !classroomHref;
  if (classroomHref) openClassroom.href = classroomHref;
}

async function run(label, work) {
  setBusy(true);
  show(label);
  try {
    await work();
  } catch (error) {
    show(error.message || 'The action failed.');
  } finally {
    setBusy(false);
  }
}

async function updatePageContext() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  document.getElementById('page-title').textContent = tab?.title || 'Open a study page';
  document.getElementById('page-url').textContent = /^https?:/i.test(tab?.url || '') ? new URL(tab.url).host : 'HTTP and HTTPS pages only';
}

async function initAuth() {
  let auth = await storage(['authToken', 'userEmail']);
  if (!auth.authToken) {
    await runtime({ action: 'syncClassroomAuth' });
    auth = await storage(['authToken', 'userEmail']);
  }
  document.getElementById('signed-in').hidden = !auth.authToken;
  document.getElementById('signed-out').hidden = Boolean(auth.authToken);
  document.getElementById('user-email').textContent = auth.userEmail || 'Connected';
}

document.getElementById('disconnect').addEventListener('click', () => {
  chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail'], initAuth);
});

async function captureScreen() {
  const response = await runtime({ action: 'captureScreen' });
  if (!response?.success) throw new Error(response?.error || 'Screen capture failed.');
  state.screenshot = response.image;
  state.source = response;
  state.sections = [];
  showResult('Screen captured', 'The visible browser area is ready for educational extraction.');
  show('Screen captured.');
}

async function scrapePage() {
  const response = await runtime({ action: 'scrapePage' });
  if (!response?.success) throw new Error(response?.error || 'Page scraping failed.');
  state.scraped = response;
  state.source = response;
  state.sections = [];
  showResult(response.title || 'Page scraped', response.text.slice(0, 5000));
  show(`Scraped ${response.text.length.toLocaleString()} characters.`);
}

async function ensureSource() {
  if (state.scraped || state.screenshot) return;
  try {
    await scrapePage();
  } catch (_) {
    await captureScreen();
  }
}

async function extractContent() {
  await ensureSource();
  const content = state.scraped?.text || '[Screenshot fallback]';
  const images = state.scraped ? [] : [{ data: state.screenshot, context: 'Visible study material' }];
  const response = await runtime({ action: 'extractEducationalContent', content, images });
  if (!response?.success) throw new Error(response?.error || 'Educational extraction failed.');
  state.sections = response.sections || [];
  state.images = response.use_images ? images : [];
  if (!state.sections.length) throw new Error('No educational content was found on this page.');
  showResult('Educational content', state.sections.map(section => `${section.heading}\n${section.text}`).join('\n\n'));
  show(`${state.sections.length} study section${state.sections.length === 1 ? '' : 's'} ready.`);
}

async function makeStudyGuide() {
  if (!state.sections.length) await extractContent();
  const content = state.sections.map(section => `${section.heading}\n${section.text}`).join('\n\n');
  const source = state.source || {};
  const response = await runtime({
    action: 'createStudyGuide',
    content,
    images: state.images,
    title: source.title || 'Study Guide',
    url: source.url || '',
    sourceType: source.sourceType || 'webpage',
  });
  if (!response?.success) throw new Error(response?.error || 'Study-guide creation failed.');
  if (!response.study_guide) throw new Error('The server returned no study guide.');
  if (!response.savedGuide?.id) throw new Error('CordiaClassroom did not confirm the saved guide.');
  showResult('Saved to CordiaClassroom', response.study_guide,
    `https://classroom.cordiacode.com/guide/${encodeURIComponent(response.savedGuide.id)}`);
  show('Saved. Open the guide in CordiaClassroom below.');
}

document.getElementById('capture-screen').addEventListener('click', () => run('Capturing visible screen…', captureScreen));
document.getElementById('scrape-page').addEventListener('click', () => run('Scraping current page…', scrapePage));
document.getElementById('extract-content').addEventListener('click', () => run('Finding educational content…', extractContent));
document.getElementById('make-guide').addEventListener('click', () => run('Creating and saving study guide…', makeStudyGuide));

updatePageContext();
initAuth();
