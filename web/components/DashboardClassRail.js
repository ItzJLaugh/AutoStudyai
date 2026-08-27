export default function DashboardClassRail({
  classes,
  newFolderName,
  setNewFolderName,
  showNewFolder,
  setShowNewFolder,
  createFolder,
  openFolder,
  openGuide,
  onDragOver,
  onDragLeave,
  onDrop,
  dropTargetId,
  allowCreate = true,
}) {
  return (
    <aside className="dashboard-class-rail" aria-label="Classes">
      <div className="dashboard-rail-heading">
        <div>
          <span className="dashboard-rail-kicker">ORGANIZE</span>
          <h2>Classes</h2>
        </div>
        {allowCreate && <button type="button" className="class-add-trigger" onClick={() => setShowNewFolder(true)}>New</button>}
      </div>

      {allowCreate && showNewFolder && (
        <div className="class-create-form">
          <input
            type="text"
            value={newFolderName}
            onChange={event => setNewFolderName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') createFolder();
              if (event.key === 'Escape') setShowNewFolder(false);
            }}
            placeholder="Class name"
            autoFocus
          />
          <div>
            <button type="button" onClick={createFolder}>Create</button>
            <button type="button" onClick={() => setShowNewFolder(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="class-rail-list">
        {classes.map(({ folder, guides }) => (
          <div
            key={folder.id}
            className={'class-rail-item' + (dropTargetId === folder.id ? ' drop-target' : '')}
            onDragOver={event => onDragOver(event, folder.id)}
            onDragLeave={event => onDragLeave(event, folder.id)}
            onDrop={event => onDrop(event, folder.id)}
          >
            <button type="button" className="class-rail-button" onClick={() => openFolder(folder.id)}>
              <span>{folder.name}</span>
              <small>{guides.length}</small>
            </button>
            <div className="class-guide-popover" role="group" aria-label={`${folder.name} study guides`}>
              <div className="class-guide-popover-header">
                <strong>{folder.name}</strong>
                <span>{guides.length} {guides.length === 1 ? 'guide' : 'guides'}</span>
              </div>
              <div className="class-guide-popover-list">
                {guides.length === 0 ? (
                  <p>No study guides in this class yet.</p>
                ) : guides.map(guide => (
                  <button key={guide.id} type="button" onClick={() => openGuide(guide.id)}>
                    <span>{guide.title || 'Untitled guide'}</span>
                    <small>Open guide</small>
                  </button>
                ))}
              </div>
              <button type="button" className="class-guide-view-all" onClick={() => openFolder(folder.id)}>Open class</button>
            </div>
          </div>
        ))}
      </div>

      {allowCreate && classes.length === 0 && !showNewFolder && (
        <button type="button" className="class-rail-empty" onClick={() => setShowNewFolder(true)}>
          Create your first class
        </button>
      )}
    </aside>
  );
}
