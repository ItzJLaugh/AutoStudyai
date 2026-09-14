const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const layout = read('web', 'components', 'Layout.js');
const navigation = read('web', 'components', 'Sidebar.js');
const dashboard = read('web', 'pages', 'dashboard.js');
const login = read('web', 'pages', 'index.js');
const api = read('web', 'lib', 'api.js');
const styles = read('web', 'styles', 'globals.css');
const canvasDashboard = read('web', 'components', 'CanvasDashboard.js');
const tutor = read('web', 'components', 'AIChatWidget.js');

assert.match(navigation, /className="top-navigation"/);
assert.match(navigation, /className="account-menu-panel"/);
assert.doesNotMatch(layout, /className="app-layout"/);
assert.match(dashboard, /Promise\.allSettled/);
assert.match(dashboard, /finally/);
assert.match(api, /AbortController/);
assert.match(api, /REQUEST_TIMEOUT_MS/);
assert.match(login, /login-mode-tabs/);
assert.match(login, /login-learning-backdrop\.webp/);
assert.match(styles, /\.editorial-page-title/);
assert.match(canvasDashboard, /apiFetch\('\/canvas\/auto-guides', \{ method: 'POST', timeoutMs: 120000 \}\)/);
assert.match(canvasDashboard, /canvasAutoBuildDate/);
assert.match(dashboard, /<CanvasDashboard onGuidesCreated=\{refreshGeneratedGuides\} \/>/);
assert.match(styles, /\.canvas-auto-status/);
assert.match(styles, /resize: horizontal/);
assert.match(styles, /resize: vertical/);
assert.match(canvasDashboard, /sort\(\(a, b\) => dueTime\(a\) - dueTime\(b\)\)/);
assert.match(canvasDashboard, /overdueCount/);
assert.match(canvasDashboard, /due within 48 hours/);
assert.match(canvasDashboard, /className="canvas-token-wizard"/);
assert.match(canvasDashboard, /\/profile\/settings/);
assert.match(canvasDashboard, /Open secure connection form/);
assert.match(canvasDashboard, /navigator\.clipboard\.writeText\(cleanDomain\)/);
assert.match(styles, /\.canvas-wizard-overlay/);
assert.match(tutor, /Cordia Tutor/);
assert.match(tutor, /guide\.study_guide \|\| guide\.notes/);
assert.doesNotMatch(tutor, /requestAnimationFrame|MAX_BUBBLES|stepPhysics/);

console.log('Production frontend contract passed');
