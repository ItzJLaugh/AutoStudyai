const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const contentScript = path.join(__dirname, '..', 'extension', 'content.js');
const bridgeScript = path.join(__dirname, '..', 'extension', 'asai-bridge.js');
const popupSource = require('node:fs').readFileSync(path.join(__dirname, '..', 'extension', 'popup.js'), 'utf8');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const lessonUrl = 'https://school.instructure.com/courses/4/assignments/7';
  const previewUrl = 'https://school.instructure.com/courses/4/files/99/preview';
  const downloadPrefix = 'https://school.instructure.com/courses/4/files/99/download';
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url === lessonUrl) {
      return route.fulfill({
        contentType: 'text/html',
        body: `<main><iframe title="Week 4 slides.pptx" src="${previewUrl}"></iframe></main>`,
      });
    }
    if (url.startsWith(downloadPrefix)) {
      return route.fulfill({
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        body: Buffer.from('PK\u0003\u0004presentation'),
      });
    }
    if (url.startsWith('https://classroom.cordiacode.com/')) {
      return route.fulfill({ contentType: 'text/html', body: '<main>CordiaClassroom</main>' });
    }
    return route.abort();
  });

  async function load(html) {
    await page.setContent(html);
    await page.evaluate(() => {
      window.chrome = {
        runtime: { onMessage: { addListener(listener) { window.__captureListener = listener; } } },
      };
    });
    await page.addScriptTag({ path: contentScript });
  }

  async function message(payload) {
    return page.evaluate(request => new Promise(resolve => {
      window.__captureListener(request, {}, resolve);
    }), payload);
  }

  await page.goto(lessonUrl);
  await page.evaluate(() => {
    window.chrome = {
      runtime: { onMessage: { addListener(listener) { window.__captureListener = listener; } } },
    };
  });
  await page.addScriptTag({ path: contentScript });
  const embedded = await message({ action: 'extractSource' });
  assert.equal(embedded.kind, 'file');
  assert.equal(embedded.embedded, true);
  assert.equal(embedded.filename, 'Week 4 slides.pptx');
  assert.match(embedded.url, /\/files\/99\/download\?download_frd=1$/);
  const fetched = await message({ action: 'fetchFile', url: embedded.url });
  assert.equal(fetched.success, true);
  assert.equal(fetched.contentType, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.equal(Buffer.from(fetched.data, 'base64').toString(), 'PK\u0003\u0004presentation');
  await load('<main><iframe title="File Preview" src="https://school.instructure.com/courses/4/files/99/file_preview"></iframe></main>');
  const canvasViewer = await message({ action: 'extractSource' });
  assert.match(canvasViewer.url, /\/files\/99\/download\?download_frd=1$/);

  await load('<nav>Course menu</nav><main><p id="lesson">Mitosis separates replicated chromosomes into two nuclei.</p><a href="https://school.instructure.com/files/review.pdf">Review</a></main>');
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#lesson'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  const selected = await message({ action: 'extractSource' });
  assert.equal(selected.kind, 'text');
  assert.equal(selected.selected, true);
  assert.match(selected.content, /replicated chromosomes/);

  const finderSource = popupSource.slice(
    popupSource.indexOf('async function findStudyMaterialOnPage'),
    popupSource.indexOf('async function findMaterialInActiveTab'),
  );
  await page.route('https://school.instructure.com/courses/4/pages/exam-review', route => route.fulfill({
    contentType: 'text/html',
    body: '<main><h1>Exam 1 review</h1><p>Propositions have truth values and conjunction is true only when both propositions are true.</p></main>',
  }));
  await page.goto(lessonUrl);
  await page.setContent(`<main>
    <a href="https://school.instructure.com/courses/4/pages/exam-review">Exam 1 review slides</a>
    <a href="https://school.instructure.com/courses/4/quizzes/8">Exam 1 graded quiz</a>
    <a href="https://other.example/material">External review</a>
  </main>`);
  await page.addScriptTag({ content: finderSource });
  const found = await page.evaluate(() => findStudyMaterialOnPage('Find everything relevant to Exam 1'));
  assert.equal(found.evidence.length, 1);
  assert.match(found.evidence[0].url, /pages\/exam-review$/);
  assert.doesNotMatch(JSON.stringify(found), /quizzes\/8|other\.example/);
  assert.match(found.content, /Propositions have truth values/);

  await page.goto('https://classroom.cordiacode.com/dashboard');
  await page.evaluate(() => {
    window.__extensionAuth = {};
    window.chrome = {
      storage: {
        local: {
          set(values) { Object.assign(window.__extensionAuth, values); },
          remove(keys) { keys.forEach(key => delete window.__extensionAuth[key]); },
        },
      },
    };
    localStorage.setItem('authToken', 'access-token');
    localStorage.setItem('refreshToken', 'refresh-token');
    localStorage.setItem('userEmail', 'student@example.com');
  });
  await page.addScriptTag({ path: bridgeScript });
  assert.deepEqual(await page.evaluate(() => window.__extensionAuth), {
    authToken: 'access-token',
    refreshToken: 'refresh-token',
    userEmail: 'student@example.com',
  });
  await page.evaluate(() => {
    localStorage.clear();
    window.postMessage({ type: 'CORDIA_AUTH_UPDATED' }, window.location.origin);
  });
  await page.waitForFunction(() => Object.keys(window.__extensionAuth).length === 0);
  await browser.close();
  console.log('extension capture contract passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
