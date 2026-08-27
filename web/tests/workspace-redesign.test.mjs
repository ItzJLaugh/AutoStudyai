import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('top navigation keeps creation and flashcards inside Study Guides', async () => {
  const sidebar = await source('components/Sidebar.js');
  const labels = [...sidebar.matchAll(/\{ label: '([^']+)'/g)].map(match => match[1]);

  assert.deepEqual(labels, ['Dashboard', 'Study Guides', 'SmartNotes', 'Classes']);
});

test('dashboard routes use the shared three-column workspace except Classes', async () => {
  const dashboard = await source('pages/dashboard.js');

  assert.match(dashboard, /<StudyWorkspaceFrame/);
  assert.match(dashboard, /section="guides"/);

  const classesView = dashboard.slice(
    dashboard.indexOf("if (view === 'classes')"),
    dashboard.indexOf("if (view === 'notes')"),
  );
  assert.doesNotMatch(classesView, /Create Guide|Unassigned Guides|DashboardStudyRail|DashboardClassRail/);
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
