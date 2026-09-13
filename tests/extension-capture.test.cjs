const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const contentScript = path.join(__dirname, '..', 'extension', 'content.js');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());

  async function load(html) {
    await page.setContent(html);
    await page.evaluate(() => {
      window.chrome = {
        runtime: { onMessage: { addListener(listener) { window.__captureListener = listener; } } },
      };
    });
    await page.addScriptTag({ path: contentScript });
  }

  async function extract() {
    return page.evaluate(() => new Promise(resolve => {
      window.__captureListener({ action: 'extractSource' }, {}, resolve);
    }));
  }

  await load('<main><iframe title="Week 4 slides.pptx" src="https://school.instructure.com/courses/4/files/99/preview"></iframe></main>');
  const embedded = await extract();
  assert.equal(embedded.kind, 'file');
  assert.equal(embedded.embedded, true);
  assert.equal(embedded.filename, 'Week 4 slides.pptx');
  assert.match(embedded.url, /\/files\/99\/download\?download_frd=1$/);

  await load('<nav>Course menu</nav><main><p id="lesson">Mitosis separates replicated chromosomes into two nuclei.</p><a href="https://school.instructure.com/files/review.pdf">Review</a></main>');
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#lesson'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  const selected = await extract();
  assert.equal(selected.kind, 'text');
  assert.equal(selected.selected, true);
  assert.match(selected.content, /replicated chromosomes/);

  await browser.close();
  console.log('extension capture contract passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
