const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const extensionPath = path.join(__dirname, '..', 'extension');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    assert.equal(manifest.version, '1.7.0');
    assert.deepEqual(manifest.host_permissions, ['http://*/*', 'https://*/*']);
    assert.equal(manifest.optional_host_permissions, undefined);
    assert.equal(manifest.side_panel.default_path, 'popup.html');

    const panel = await context.newPage();
    await panel.setViewportSize({ width: 360, height: 800 });
    await panel.goto(`chrome-extension://${extensionId}/popup.html`);
    assert.equal(await panel.locator('.action').count(), 4);
    assert.equal(await panel.locator('.brand strong').textContent(), 'CordiaClassroom');
    assert.equal(await panel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  } finally {
    await context.close();
  }
  console.log('unpacked four-action side panel loaded successfully');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
