const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const extension = path.join(__dirname, '..', 'extension');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  async function load(html) {
    await page.setContent(html);
    await page.evaluate(() => {
      window.chrome = { runtime: { onMessage: { addListener(listener) { window.__scrape = listener; } } } };
    });
    await page.addScriptTag({ path: path.join(extension, 'vendor', 'Readability.js') });
    await page.addScriptTag({ path: path.join(extension, 'content.js') });
  }

  async function message(action) {
    return page.evaluate(name => new Promise(resolve => window.__scrape({ action: name }, {}, resolve)), action);
  }

  await load('<nav>Course menu</nav><main><h1>Mitosis</h1><p>Mitosis separates replicated chromosomes into two nuclei.</p></main>');
  const article = await message('scrapePage');
  assert.equal(article.kind, 'text');
  assert.match(article.text, /replicated chromosomes/);

  await load('<main><iframe title="Exam review.pdf" src="https://school.instructure.com/courses/4/files/99/file_preview"></iframe></main>');
  const file = await message('scrapePage');
  assert.equal(file.kind, 'file');
  assert.match(file.url, /\/files\/99\/download\?download_frd=1$/);

  const popupHtml = fs.readFileSync(path.join(extension, 'popup.html'), 'utf8');
  const popupCss = fs.readFileSync(path.join(extension, 'styles.css'), 'utf8');
  const panel = await browser.newPage({ viewport: { width: 360, height: 800 } });
  await panel.setContent(popupHtml
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${popupCss}</style>`)
    .replace('<script src="popup.js"></script>', ''));
  assert.equal(await panel.locator('.action').count(), 4);
  assert.deepEqual(await panel.locator('.action strong').allTextContents(), [
    'Capture screen', 'Scrape page', 'Get educational content', 'Make study guide',
  ]);
  assert.equal(await panel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

  await browser.close();
  console.log('four-action extension UI and scraper contract passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
