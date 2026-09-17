const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const extensionPath = path.join(__dirname, '..', 'extension');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    assert.equal(manifest.version, '1.6.3');
    assert.equal(manifest.side_panel.default_path, 'popup.html');
    assert.equal(manifest.action.default_popup, undefined);
    assert.equal(await worker.evaluate(() => safeSameOriginStudyUrl(
      'https://school.instructure.com/courses/4/modules',
      'https://school.instructure.com/courses/4/pages/exam-review',
    )), 'https://school.instructure.com/courses/4/pages/exam-review');
    assert.equal(await worker.evaluate(() => safeSameOriginStudyUrl(
      'https://school.instructure.com/courses/4/modules',
      'https://school.instructure.com/courses/4/quizzes/8',
    )), null);
    assert.equal(await worker.evaluate(() => safeSameOriginStudyUrl(
      'https://school.instructure.com/courses/4/modules',
      'https://other.example/material',
    )), null);

    const panel = await context.newPage();
    await panel.setViewportSize({ width: 360, height: 800 });
    await panel.goto(`chrome-extension://${extensionId}/popup.html`);
    assert.equal(await panel.locator('#chat-section').isVisible(), true);
    assert.equal(await panel.locator('#capture-section').isVisible(), false);
    assert.equal(await panel.locator('.brand-bar strong').textContent(), 'CordiaClassroom');
    assert.equal(await panel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  } finally {
    await context.close();
  }
  console.log('unpacked side-panel extension loaded successfully');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
