import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { useRequireAuth } from '../lib/auth';
import { formatDate } from '../lib/formatters';
import useSessionTracker from '../lib/useSessionTracker';
import SearchModal from '../components/SearchModal';
import AILoadingSphere from '../components/AILoadingSphere';

export default function Dashboard() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  useSessionTracker('browse');
  const view = router.query.view || null; // null = dashboard, 'classes', 'guides'
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState([]);
  const [guides, setGuides] = useState([]);
  const [stats, setStats] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [dragGuideId, setDragGuideId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const [guidesFilter, setGuidesFilter] = useState('all'); // all, bookmarked, unassigned
  const [guidesSort, setGuidesSort] = useState('recent'); // recent, title, progress
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const contextRef = useRef(null);

  useEffect(() => {
    if (ready) {
      setLoading(true);
      loadData();
    }
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); }
      if (e.key === 'Escape') setContextMenu(null);
    }
    function onClick(e) {
      if (contextRef.current && !contextRef.current.contains(e.target)) setContextMenu(null);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('click', onClick); };
  }, [ready, router.asPath]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function loadData() {
    setLoading(true);
    const [foldersData, guidesData, statsData] = await Promise.all([
      apiFetch('/folders'),
      apiFetch('/guides'),
      apiFetch('/stats/overview')
    ]);
    setFolders(foldersData?.folders || []);
    setGuides(guidesData?.guides || []);
    setStats(statsData);
    setLoading(false);
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const data = await apiFetch('/folders', {
      method: 'POST',
      body: JSON.stringify({ name: newFolderName.trim() })
    });
    if (data?.folder) {
      setFolders([data.folder, ...folders]);
      setNewFolderName('');
      setShowNewFolder(false);
      showToast('Class created!');
    }
  }

  function guideCount(folderId) {
    return guides.filter(g => g.folder_id === folderId).length;
  }

  async function toggleBookmark(guideId, e) {
    e.stopPropagation();
    const data = await apiFetch('/guides/' + guideId + '/bookmark', { method: 'PATCH' });
    if (data) {
      setGuides(guides.map(g => g.id === guideId ? { ...g, is_bookmarked: data.is_bookmarked } : g));
    }
  }

  // --- Drag & Drop ---
  function onDragStart(e, guideId) {
    setDragGuideId(guideId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', guideId);
    e.currentTarget.style.opacity = '0.5';
  }

  function onDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    setDragGuideId(null);
    setDropTargetId(null);
  }

  function onDragOver(e, folderId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(folderId);
  }

  function onDragLeave(e, folderId) {
    if (dropTargetId === folderId) setDropTargetId(null);
  }

  async function onDrop(e, folderId) {
    e.preventDefault();
    setDropTargetId(null);
    const guideId = e.dataTransfer.getData('text/plain') || dragGuideId;
    if (!guideId) return;
    const guide = guides.find(g => g.id === guideId);
    if (guide?.folder_id === folderId) return;

    const data = await apiFetch('/guides/' + guideId + '/move', {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId })
    });
    if (data?.updated) {
      setGuides(guides.map(g => g.id === guideId ? { ...g, folder_id: folderId } : g));
      const folderName = folders.find(f => f.id === folderId)?.name || 'folder';
      showToast('Moved to ' + folderName);
    }
    setDragGuideId(null);
  }

  // --- Context Menu ---
  function onGuideContextMenu(e, guide) {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      guide
    });
  }

  async function moveGuideToFolder(guideId, folderId) {
    setContextMenu(null);
    const data = await apiFetch('/guides/' + guideId + '/move', {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId })
    });
    if (data?.updated) {
      setGuides(guides.map(g => g.id === guideId ? { ...g, folder_id: folderId } : g));
      const folderName = folderId ? folders.find(f => f.id === folderId)?.name : 'No folder';
      showToast('Moved to ' + folderName);
    }
  }

  async function deleteGuide(guideId) {
    setContextMenu(null);
    await apiFetch('/guides/' + guideId, { method: 'DELETE' });
    setGuides(guides.filter(g => g.id !== guideId));
    showToast('Guide deleted', 'info');
  }

  // --- Guides filtering & sorting ---
  function getFilteredGuides() {
    let filtered = [...guides];
    if (guidesFilter === 'bookmarked') filtered = filtered.filter(g => g.is_bookmarked);
    if (guidesFilter === 'unassigned') filtered = filtered.filter(g => !g.folder_id);
    if (guidesSort === 'title') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (guidesSort === 'progress') filtered.sort((a, b) => (b.read_progress || 0) - (a.read_progress || 0));
    // 'recent' is default from API
    return filtered;
  }

  if (!ready) return null;

  // ============== LOADING STATE ==============
  if (!ready || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <AILoadingSphere size={100} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82em', fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: '-0.01em' }}>Loading your content...</p>
      </div>
    );
  }

  // ============== CLASSES VIEW ==============
  if (view === 'classes') {
    return (
      <div className="fade-in">
        <div className="section-header">
          <h2>My Classes</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => router.push('/create')}>+ Create Guide</button>
            <button className="btn" onClick={() => setShowNewFolder(true)}>+ New Class</button>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: 16 }}>
          {folders.length} classes &middot; Drag study guides onto a class to organize them
        </p>

        {showNewFolder && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text" placeholder="Class name..." value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                autoFocus style={{ flex: 1, marginBottom: 0 }}
              />
              <button className="btn btn-green" onClick={createFolder}>Create</button>
              <button className="btn btn-gray" onClick={() => setShowNewFolder(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="folder-grid">
          {folders.map(folder => (
            <div
              key={folder.id}
              className={'folder-card' + (dropTargetId === folder.id ? ' drop-target' : '')}
              onClick={() => router.push('/folder/' + folder.id)}
              onDragOver={e => onDragOver(e, folder.id)}
              onDragLeave={e => onDragLeave(e, folder.id)}
              onDrop={e => onDrop(e, folder.id)}
            >
              <h3>{folder.name}</h3>
              <p>{guideCount(folder.id)} study guides</p>
              <div className="folder-card-actions">
                <span className="timestamp">{formatDate(folder.created_at)}</span>
              </div>
            </div>
          ))}
        </div>

        {folders.length === 0 && !showNewFolder && (
          <div className="empty-state">
            <div className="empty-state-icon">&#128193;</div>
            No classes yet. Create one to organize your study guides!
          </div>
        )}

        {/* Unassigned guides section */}
        {guides.filter(g => !g.folder_id).length > 0 && (
          <>
            <div className="section-header" style={{ marginTop: 28 }}>
              <h2>Unassigned Guides</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: 12 }}>
              Drag these into a class above to organize them
            </p>
            {guides.filter(g => !g.folder_id).map(guide => (
              <div
                key={guide.id}
                className={'card draggable-guide' + (dragGuideId === guide.id ? ' dragging' : '')}
                draggable
                onDragStart={e => onDragStart(e, guide.id)}
                onDragEnd={onDragEnd}
                onClick={() => router.push('/guide/' + guide.id)}
                onContextMenu={e => onGuideContextMenu(e, guide)}
              >
                <div className="card-row">
                  <div className="drag-handle" title="Drag to move">&#9776;</div>
                  <div style={{ flex: 1 }}>
                    <h3>{guide.title}</h3>
                    <p><span className="timestamp">{formatDate(guide.created_at)}</span></p>
                  </div>
                  <button className={'bookmark-btn' + (guide.is_bookmarked ? ' active' : '')} onClick={e => toggleBookmark(guide.id, e)}>
                    {guide.is_bookmarked ? '\u2605' : '\u2606'}
                  </button>
                  <button
                    className="bookmark-btn"
                    style={{ color: 'var(--error)', opacity: 0.55, fontSize: '0.95em' }}
                    title="Delete guide"
                    onClick={e => { e.stopPropagation(); if (window.confirm('Delete "' + guide.title + '"?')) deleteGuide(guide.id); }}
                  >
                    &#128465;
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {toast && <div className={'toast toast-' + toast.type}>{toast.message}</div>}
        {contextMenu && renderContextMenu()}
      </div>
    );
  }

  // ============== STUDY GUIDES VIEW ==============
  if (view === 'guides') {
    const filteredGuides = getFilteredGuides();
    return (
      <div className="fade-in">
        <div className="section-header">
          <h2>Study Guides</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => router.push('/create')} style={{ fontSize: '0.8em' }}>+ Create Guide</button>
            <button className="guides-search-trigger" onClick={() => setShowSearch(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              Search guides...
              <kbd>Ctrl+K</kbd>
            </button>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="guides-toolbar">
          <div className="filter-pills">
            {[
              { key: 'all', label: 'All (' + guides.length + ')' },
              { key: 'bookmarked', label: '★ Bookmarked' },
              { key: 'unassigned', label: 'No Class' },
            ].map(f => (
              <button
                key={f.key}
                className={'pill' + (guidesFilter === f.key ? ' pill-active' : '')}
                onClick={() => setGuidesFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            className="sort-select"
            value={guidesSort}
            onChange={e => setGuidesSort(e.target.value)}
          >
            <option value="recent">Newest First</option>
            <option value="title">Title A-Z</option>
            <option value="progress">Read Progress</option>
          </select>
        </div>

        {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

        {filteredGuides.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128214;</div>
            {guidesFilter !== 'all' ? 'No guides match this filter.' : 'No study guides yet. Use the Chrome extension to capture content!'}
          </div>
        ) : (
          filteredGuides.map(guide => (
            <div
              key={guide.id}
              className={'card draggable-guide' + (dragGuideId === guide.id ? ' dragging' : '')}
              draggable
              onDragStart={e => onDragStart(e, guide.id)}
              onDragEnd={onDragEnd}
              onClick={() => router.push('/guide/' + guide.id)}
              onContextMenu={e => onGuideContextMenu(e, guide)}
            >
              <div className="card-row">
                <div className="drag-handle" title="Drag to move">&#9776;</div>
                <div style={{ flex: 1 }}>
                  <h3>{guide.title}</h3>
                  <p>
                    <span className="guide-folder-tag">
                      {folders.find(f => f.id === guide.folder_id)?.name || 'No class'}
                    </span>
                    {' | '}
                    <span className="timestamp">{formatDate(guide.created_at)}</span>
                    {guide.read_progress > 0 && (
                      <span style={{ marginLeft: 8 }}>
                        <span className="mini-progress">
                          <span className="mini-progress-fill" style={{ width: Math.round((guide.read_progress || 0) * 100) + '%' }} />
                        </span>
                        {Math.round((guide.read_progress || 0) * 100)}%
                      </span>
                    )}
                  </p>
                </div>
                <button className={'bookmark-btn' + (guide.is_bookmarked ? ' active' : '')} onClick={e => toggleBookmark(guide.id, e)}>
                  {guide.is_bookmarked ? '\u2605' : '\u2606'}
                </button>
                <button
                  className="bookmark-btn"
                  style={{ color: 'var(--error)', opacity: 0.55, fontSize: '0.95em' }}
                  title="Delete guide"
                  onClick={e => { e.stopPropagation(); if (window.confirm('Delete "' + guide.title + '"?')) deleteGuide(guide.id); }}
                >
                  &#128465;
                </button>
              </div>
            </div>
          ))
        )}

        {toast && <div className={'toast toast-' + toast.type}>{toast.message}</div>}
        {contextMenu && renderContextMenu()}
      </div>
    );
  }

  // ============== CONTEXT MENU RENDERER ==============
  function renderContextMenu() {
    if (!contextMenu) return null;
    const menuW = 260;
    const menuH = 320;
    const x = Math.max(8, Math.min(contextMenu.x, window.innerWidth - menuW - 8));
    const y = Math.max(8, Math.min(contextMenu.y, window.innerHeight - menuH - 8));
    return (
      <div
        ref={contextRef}
        className="context-menu"
        style={{ top: y, left: x }}
      >
        <div className="context-menu-header">{contextMenu.guide.title}</div>
        <div className="context-menu-divider" />
        <div className="context-menu-item" onClick={() => { router.push('/guide/' + contextMenu.guide.id); setContextMenu(null); }}>
          &#128214; Open Guide
        </div>
        <div className="context-menu-item" onClick={() => { toggleBookmark(contextMenu.guide.id, { stopPropagation: () => {} }); setContextMenu(null); }}>
          {contextMenu.guide.is_bookmarked ? '★ Remove Bookmark' : '☆ Add Bookmark'}
        </div>
        <div className="context-menu-item" onClick={() => {
          const newTitle = prompt('Rename guide:', contextMenu.guide.title);
          if (newTitle && newTitle.trim()) {
            apiFetch('/guides/' + contextMenu.guide.id + '/rename', {
              method: 'PATCH',
              body: JSON.stringify({ title: newTitle.trim() })
            }).then(data => { if (data?.title) loadData(); });
          }
          setContextMenu(null);
        }}>
          &#9998; Rename
        </div>
        <div className="context-menu-divider" />
        <div className="context-menu-label">Move to Class:</div>
        {contextMenu.guide.folder_id && (
          <div className="context-menu-item" onClick={() => moveGuideToFolder(contextMenu.guide.id, null)}>
            &#10060; Remove from class
          </div>
        )}
        {folders.map(f => (
          <div
            key={f.id}
            className={'context-menu-item' + (contextMenu.guide.folder_id === f.id ? ' context-menu-current' : '')}
            onClick={() => contextMenu.guide.folder_id !== f.id && moveGuideToFolder(contextMenu.guide.id, f.id)}
          >
            &#128193; {f.name}
            {contextMenu.guide.folder_id === f.id && ' ✓'}
          </div>
        ))}
        <div className="context-menu-divider" />
        <div className="context-menu-item context-menu-danger" onClick={() => deleteGuide(contextMenu.guide.id)}>
          &#128465; Delete Guide
        </div>
      </div>
    );
  }

  // ============== DEFAULT DASHBOARD VIEW ==============
  return (
    <div>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {/* Page header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">{guides.length} guides &middot; {folders.length} classes</p>
        </div>
        <button className="btn" onClick={() => router.push('/create')}>+ New Study Guide</button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card" onClick={() => router.push('/dashboard?view=guides')} style={{ cursor: 'pointer' }} title="View all study guides">
            <div className="stat-number">{stats.total_guides}</div>
            <div className="stat-label">Study Guides</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.total_flashcards}</div>
            <div className="stat-label">Flashcards</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.avg_quiz_score}%</div>
            <div className="stat-label">Avg Quiz Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.minutes_today}</div>
            <div className="stat-label">Minutes Today</div>
          </div>
        </div>
      )}

      {/* Extension banner */}
      <a
        href="https://chromewebstore.google.com/detail/autostudyai/eddmfjcnfjfbaknmeccjbjdgpeipjbaf"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 24,
          textDecoration: 'none', color: 'inherit',
        }}
      >
        <span style={{ fontSize: '1.4em' }}>🧩</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85em', fontWeight: 600, color: 'var(--text-primary)' }}>Get the Chrome Extension</div>
          <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>Capture slides & lecture notes directly from your browser</div>
        </div>
        <span style={{ fontSize: '0.8em', color: 'var(--accent)', whiteSpace: 'nowrap' }}>Install free →</span>
      </a>

      {/* Classes section */}
      <div className="section-header" id="classes">
        <h2>My Classes</h2>
        <button className="btn-outline" onClick={() => router.push('/dashboard?view=classes')} style={{ fontSize: '0.8em' }}>
          View All &rarr;
        </button>
      </div>

      <div className="folder-grid">
        {folders.map(folder => (
          <div
            key={folder.id}
            className={'folder-card' + (dropTargetId === folder.id ? ' drop-target' : '')}
            onClick={() => router.push('/folder/' + folder.id)}
            onDragOver={e => onDragOver(e, folder.id)}
            onDragLeave={e => onDragLeave(e, folder.id)}
            onDrop={e => onDrop(e, folder.id)}
          >
            <h3>{folder.name}</h3>
            <p>{guideCount(folder.id)} study guides</p>
          </div>
        ))}
        <div className="folder-card add-folder-card" onClick={() => setShowNewFolder(true)}>
          {showNewFolder ? (
            <div onClick={e => e.stopPropagation()}>
              <input
                type="text" placeholder="Class name..." value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-green" style={{ flex: 1, fontSize: '0.85em', padding: '6px 0' }} onClick={createFolder}>Create</button>
                <button className="btn btn-gray" style={{ flex: 1, fontSize: '0.85em', padding: '6px 0' }} onClick={() => setShowNewFolder(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8em', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>+</div>
              <div style={{ fontWeight: 800, letterSpacing: '-0.03em', marginTop: 6, fontSize: '0.95em' }}>New Class</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent guides */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 }}>
        <span className="section-label" style={{ marginBottom: 0 }}>Recent Study Guides</span>
        <button className="btn-outline" onClick={() => router.push('/dashboard?view=guides')} style={{ fontSize: '0.78em', padding: '5px 14px' }}>
          View All &rarr;
        </button>
      </div>

      {guides.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128214;</div>
          No study guides yet.{' '}
          <a href="https://chromewebstore.google.com/detail/autostudyai/eddmfjcnfjfbaknmeccjbjdgpeipjbaf" target="_blank" rel="noopener noreferrer">
            Install the Chrome extension
          </a>
          {' '}to capture slides and lecture notes.
        </div>
      ) : (
        guides.slice(0, 8).map(guide => (
          <div
            key={guide.id}
            className="guide-row"
            draggable
            onDragStart={e => onDragStart(e, guide.id)}
            onDragEnd={onDragEnd}
            onClick={() => router.push('/guide/' + guide.id)}
            onContextMenu={e => onGuideContextMenu(e, guide)}
          >
            <div className="guide-row-icon">&#128214;</div>
            <div className="guide-row-info">
              <div className="guide-row-title">{guide.title}</div>
              <div className="guide-row-meta">
                {folders.find(f => f.id === guide.folder_id)?.name || 'No class'} &middot; {formatDate(guide.created_at)}
              </div>
            </div>
            <div className="guide-row-right">
              <button
                className={'bookmark-btn' + (guide.is_bookmarked ? ' active' : '')}
                onClick={e => toggleBookmark(guide.id, e)}
              >
                {guide.is_bookmarked ? '\u2605' : '\u2606'}
              </button>
              <svg className="guide-row-chevron" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 3l4 4-4 4"/>
              </svg>
            </div>
          </div>
        ))
      )}


      {toast && <div className={'toast toast-' + toast.type}>{toast.message}</div>}
      {contextMenu && renderContextMenu()}
    </div>
  );
}
