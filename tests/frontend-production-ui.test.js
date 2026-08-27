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

console.log('Production frontend contract passed');
