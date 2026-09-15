import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('top navigation keeps classes inside Dashboard and Study Guides', async () => {
  const sidebar = await source('components/Sidebar.js');
  const labels = [...sidebar.matchAll(/\{ label: '([^']+)'/g)].map(match => match[1]);

  assert.deepEqual(labels, ['Dashboard', 'Study Guides', 'SmartNotes']);
});

test('dashboard routes use the shared workspace and retire the separate Classes view', async () => {
  const dashboard = await source('pages/dashboard.js');

  assert.match(dashboard, /<StudyWorkspaceFrame/);
  assert.match(dashboard, /section="guides"/);

  assert.match(dashboard, /router\.query\.view === 'classes'.*router\.replace\('\/dashboard\?view=guides'\)/s);
  assert.doesNotMatch(dashboard, /My Classes/);
});

test('class rail and docked Tutor share only the dashboard and guide layouts', async () => {
  const frame = await source('components/StudyWorkspaceFrame.js');

  assert.match(frame, /section === 'dashboard' \|\| section === 'guides'/);
  assert.match(frame, /<TutorDrawer docked \/>/);
  assert.match(frame, /dashboard-left-stack/);
  assert.match(frame, /without-classes/);
});

test('Study Guides owns the Flashcards destination and creation action', async () => {
  const dashboard = await source('pages/dashboard.js');

  assert.match(dashboard, /study-library-tabs/);
  assert.match(dashboard, /router\.push\('\/flashcards'\)/);
  assert.match(dashboard, /New study guide/);
});

test('create page starts with one source-first flow and keeps manual creation optional', async () => {
  const create = await source('pages/create.js');

  assert.match(create, /Add your study material/);
  assert.match(create, /Build manually/);
  assert.match(create, /Create study guide/);
  assert.doesNotMatch(create, /create-tabs|Paste Text|Upload File/);
});

test('SmartNotes library uses the shared workspace frame', async () => {
  const smartNotes = await source('pages/smartnotes.js');

  assert.match(smartNotes, /<StudyWorkspaceFrame/);
});
