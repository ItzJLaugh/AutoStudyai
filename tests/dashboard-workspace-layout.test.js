const assert = require('node:assert/strict');
const { organizeDashboardGuides } = require('../web/lib/dashboardOrganization');

const folders = [
  { id: 'class-a', name: 'Biology' },
  { id: 'class-b', name: 'Chemistry' },
];
const guides = [
  { id: 'guide-1', folder_id: 'class-a', title: 'Cells' },
  { id: 'guide-2', folder_id: null, title: 'Independent guide' },
  { id: 'guide-3', title: 'Unassigned guide' },
  { id: 'guide-4', folder_id: 'missing-class', title: 'Orphaned guide' },
];

const organized = organizeDashboardGuides(folders, guides);

assert.deepEqual(
  organized.classes.map(entry => ({ id: entry.folder.id, guides: entry.guides.map(guide => guide.id) })),
  [
    { id: 'class-a', guides: ['guide-1'] },
    { id: 'class-b', guides: [] },
  ]
);
assert.deepEqual(organized.unclassified.map(guide => guide.id), ['guide-2', 'guide-3', 'guide-4']);
assert.deepEqual(organizeDashboardGuides(null, null), { classes: [], unclassified: [] });

console.log('Dashboard workspace organization contract passed');
