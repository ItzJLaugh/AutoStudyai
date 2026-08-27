function organizeDashboardGuides(folders, guides) {
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeGuides = Array.isArray(guides) ? guides : [];
  const folderIds = new Set(safeFolders.map(folder => folder.id));

  return {
    classes: safeFolders.map(folder => ({
      folder,
      guides: safeGuides.filter(guide => guide.folder_id === folder.id),
    })),
    unclassified: safeGuides.filter(guide => !guide.folder_id || !folderIds.has(guide.folder_id)),
  };
}

module.exports = { organizeDashboardGuides };
