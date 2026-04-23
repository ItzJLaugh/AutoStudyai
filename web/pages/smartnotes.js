import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { authHeaders } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Rule-based formatter ────────────────────────────────────────────────────
const SPELL_MAP = {
  teh: 'the', hte: 'the', adn: 'and', nad: 'and', hwich: 'which',
  recieve: 'receive', definately: 'definitely', occured: 'occurred',
  seperate: 'separate', untill: 'until', occurance: 'occurrence',
  existance: 'existence', neccessary: 'necessary', accomodate: 'accommodate',
  comittee: 'committee', concious: 'conscious', liason: 'liaison',
};
// Biology/science acronyms to preserve uppercase
const FORCE_UPPER = new Set(['atp', 'dna', 'rna', 'atp', 'adp', 'nadh', 'fadh2', 'ph', 'dna', 'rna', 'mrna', 'trna', 'rrna', 'pcr', 'ecg', 'ekg', 'cpr', 'iv', 'bp', 'hr', 'gi', 'cns', 'pns', 'icu', 'er']);

function applyWordRules(word) {
  const lower = word.toLowerCase();
  if (FORCE_UPPER.has(lower)) return word.toUpperCase();
  if (SPELL_MAP[lower]) return SPELL_MAP[lower];
  return word;
}

function applyLineRules(line) {
  // Bullet: starts with - or *
  if (/^[-*]\s+/.test(line)) {
    return '<li>' + line.replace(/^[-*]\s+/, '') + '</li>';
  }
  // Header: short line (≤5 words), not ending in punctuation
  const words = line.trim().split(/\s+/);
  if (words.length <= 5 && words.length >= 1 && !/[.,:;?!]$/.test(line.trim())) {
    return '<h3>' + line + '</h3>';
  }
  return '<p>' + line + '</p>';
}

// ─── Mermaid renderer (lazy-loaded) ─────────────────────────────────────────
function MermaidDiagram({ code }) {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code || !ref.current) return;
    setError(false);
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      const id = 'mermaid-' + Date.now();
      mermaid.render(id, code).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      }).catch(() => setError(true));
    });
  }, [code]);

  if (error) return <p className="sn-diagram-placeholder">Diagram could not be rendered.</p>;
  return <div ref={ref} className="sn-diagram-render" />;
}

// ─── File viewer ─────────────────────────────────────────────────────────────
function FileViewer({ file, guideContent }) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!file) { setObjectUrl(null); return; }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (guideContent) {
    return (
      <div className="sn-guide-viewer">
        <div dangerouslySetInnerHTML={{ __html: guideContent }} />
      </div>
    );
  }
  if (!file || !objectUrl) return null;

  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return <iframe src={objectUrl} className="sn-iframe" title="Class material" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return <img src={objectUrl} className="sn-viewer-img" alt="Class material" />;
  }
  // PPTX or unknown: show download link
  return (
    <div className="sn-diagram-placeholder">
      <a href={objectUrl} download={file.name} className="btn sn-open-btn">
        Download {file.name}
      </a>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SmartNotes() {
  const router = useRouter();
  const [noteId, setNoteId] = useState(null);
  const [title, setTitle] = useState('Untitled Notes');
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const [notes, setNotes] = useState([]); // session list
  const [showNotesList, setShowNotesList] = useState(false);

  // Diagram
  const [mermaidCode, setMermaidCode] = useState(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const diagramTimer = useRef(null);

  // File viewer
  const [viewerFile, setViewerFile] = useState(null);
  const [guideList, setGuideList] = useState([]);
  const [guideContent, setGuideContent] = useState(null);
  const fileInputRef = useRef(null);

  // Paper (contenteditable)
  const paperRef = useRef(null);
  const saveTimer = useRef(null);
  const plainTextRef = useRef(''); // latest plain text for diagram

  // ── Init: create or load note ────────────────────────────────────────────
  useEffect(() => {
    const { id } = router.query;
    if (id) {
      loadNote(id);
    } else if (router.isReady) {
      createNote();
    }
  }, [router.isReady, router.query.id]);

  // Load existing guides for picker
  useEffect(() => {
    fetch(API + '/guides?limit=50', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setGuideList(data.guides || []))
      .catch(() => {});
  }, []);

  // Load notes list
  useEffect(() => {
    fetch(API + '/smart_notes', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setNotes(data.notes || []))
      .catch(() => {});
  }, [noteId]);

  async function createNote() {
    try {
      const resp = await fetch(API + '/smart_notes', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Notes' }),
      });
      const data = await resp.json();
      if (data.note) {
        setNoteId(data.note.id);
        router.replace('/smartnotes?id=' + data.note.id, undefined, { shallow: true });
      }
    } catch {}
  }

  async function loadNote(id) {
    try {
      const resp = await fetch(API + '/smart_notes/' + id, { headers: authHeaders() });
      if (!resp.ok) { createNote(); return; }
      const data = await resp.json();
      setNoteId(data.note.id);
      setTitle(data.note.title || 'Untitled Notes');
      if (paperRef.current && data.note.content) {
        paperRef.current.innerHTML = data.note.content;
        plainTextRef.current = paperRef.current.innerText || '';
      }
    } catch {}
  }

  // ── Autosave (debounced 1s) ──────────────────────────────────────────────
  const scheduleSave = useCallback((currentNoteId, currentTitle) => {
    clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      if (!paperRef.current || !currentNoteId) return;
      try {
        await fetch(API + '/smart_notes/' + currentNoteId, {
          method: 'PUT',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentTitle,
            content: paperRef.current.innerHTML,
          }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch {
        setSaveStatus('');
      }
    }, 1000);
  }, []);

  // ── Diagram (debounced 4s) ───────────────────────────────────────────────
  function scheduleDiagram(text) {
    clearTimeout(diagramTimer.current);
    if (!text || text.trim().length < 40) return;
    diagramTimer.current = setTimeout(async () => {
      setDiagramLoading(true);
      try {
        const resp = await fetch(API + '/smart_notes/diagram', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });
        const data = await resp.json();
        setMermaidCode(data.mermaid || null);
      } catch {}
      setDiagramLoading(false);
    }, 4000);
  }

  // ── Paper keyboard handler ───────────────────────────────────────────────
  function onPaperKeyUp(e) {
    if (!paperRef.current) return;
    const text = paperRef.current.innerText || '';
    plainTextRef.current = text;
    scheduleSave(noteId, title);
    scheduleDiagram(text);
  }

  // Apply formatting on Space (spell/acronym) and Enter (line-level rules)
  function onPaperKeyDown(e) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // ── Space: spell correction + acronym uppercase on the last word ──
    if (e.key === ' ') {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const before = node.textContent.slice(0, range.startOffset);
      const wordMatch = before.match(/(\S+)$/);
      if (!wordMatch) return;
      const word = wordMatch[1];
      const corrected = applyWordRules(word);
      if (corrected === word) return;
      e.preventDefault();
      const wordStart = range.startOffset - word.length;
      const corrRange = document.createRange();
      corrRange.setStart(node, wordStart);
      corrRange.setEnd(node, range.startOffset);
      corrRange.deleteContents();
      const textNode = document.createTextNode(corrected + ' ');
      corrRange.insertNode(textNode);
      const newRange = document.createRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return;
    }

    // ── Enter: format the line just completed ──
    if (e.key === 'Enter') {
      const range = sel.getRangeAt(0);
      // Walk up to find the current block element inside the paper
      let block = range.startContainer;
      while (block && block !== paperRef.current) {
        if (['P', 'H3', 'LI', 'DIV'].includes(block.nodeName)) break;
        block = block.parentNode;
      }
      if (!block || block === paperRef.current) return;

      const lineText = (block.innerText || block.textContent || '').trim();
      if (!lineText) return;

      let newEl = null;

      // Bullet: line starts with - or *
      if (/^[-*]\s+/.test(lineText)) {
        newEl = document.createElement('li');
        newEl.textContent = lineText.replace(/^[-*]\s+/, '');
      }
      // Bold label: "Word:" or "Word Word:" pattern at start of line
      else if (/^[A-Za-z][A-Za-z\s]{0,30}:/.test(lineText)) {
        const colonIdx = lineText.indexOf(':');
        const label = lineText.slice(0, colonIdx);
        const rest = lineText.slice(colonIdx + 1);
        newEl = document.createElement('p');
        newEl.innerHTML = '<strong>' + label + ':</strong>' + (rest || '');
      }
      // Header: ≤4 words, no trailing punctuation
      else if (lineText.split(/\s+/).length <= 4 && !/[.,:;?!]$/.test(lineText)) {
        newEl = document.createElement('h3');
        newEl.textContent = lineText;
      }

      if (!newEl) return; // no rule matched — let browser handle Enter normally

      e.preventDefault();
      block.parentNode.replaceChild(newEl, block);

      // Insert a new empty paragraph and place cursor there
      const nextP = document.createElement('p');
      nextP.appendChild(document.createTextNode('\u200B')); // zero-width space keeps it focusable
      newEl.parentNode.insertBefore(nextP, newEl.nextSibling);
      const newRange = document.createRange();
      newRange.setStart(nextP.firstChild, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  // ── File upload ──────────────────────────────────────────────────────────
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setGuideContent(null);
    setViewerFile(file);
    e.target.value = '';
  }

  function handleGuideSelect(e) {
    const guide = guideList.find(g => g.id === e.target.value);
    if (!guide) return;
    setViewerFile(null);
    setGuideContent(guide.study_guide || guide.notes || '<p>No content available.</p>');
  }

  // ── New session ──────────────────────────────────────────────────────────
  async function handleNewNote() {
    if (paperRef.current) paperRef.current.innerHTML = '';
    setTitle('Untitled Notes');
    setMermaidCode(null);
    setViewerFile(null);
    setGuideContent(null);
    setNoteId(null);
    await createNote();
  }

  async function handleSwitchNote(id) {
    setShowNotesList(false);
    router.push('/smartnotes?id=' + id);
  }

  return (
    <div className="sn-page">
      {/* Header bar */}
      <div className="sn-header">
        <div className="sn-header-left">
          <input
            className="sn-title-input"
            value={title}
            onChange={e => { setTitle(e.target.value); scheduleSave(noteId, e.target.value); }}
            placeholder="Note title..."
            spellCheck={false}
          />
          <span className={`sn-status ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : ''}
          </span>
        </div>
        <div className="sn-header-right">
          <div className="sn-notes-picker">
            <button className="btn sn-open-btn" onClick={() => setShowNotesList(v => !v)}>
              My Notes
            </button>
            {showNotesList && (
              <div className="sn-notes-dropdown">
                <div className="sn-notes-dropdown-header">
                  <span className="sn-panel-label">Sessions</span>
                  <button className="sn-new-btn" onClick={handleNewNote}>+ New</button>
                </div>
                {notes.map(n => (
                  <div
                    key={n.id}
                    className={'sn-notes-item' + (n.id === noteId ? ' active' : '')}
                    onClick={() => handleSwitchNote(n.id)}
                  >
                    {n.title || 'Untitled Notes'}
                  </div>
                ))}
                {notes.length === 0 && <div className="sn-notes-item muted">No sessions yet</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3-panel grid */}
      <div className="sn-layout">

        {/* Left: paper */}
        <div className="sn-paper-wrap">
          <div className="sn-panel-label">Notes</div>
          <div
            ref={paperRef}
            className="sn-paper"
            contentEditable
            suppressContentEditableWarning
            onKeyDown={onPaperKeyDown}
            onKeyUp={onPaperKeyUp}
            data-placeholder="Start typing your notes here…"
            spellCheck={false}
          />
        </div>

        {/* Top-right: class material viewer */}
        <div className="sn-viewer-wrap">
          <div className="sn-viewer-toolbar">
            <span className="sn-panel-label">Class Material</span>
            <div className="sn-viewer-controls">
              <button className="btn sn-open-btn" onClick={() => fileInputRef.current?.click()}>
                Open File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.pptx,image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {guideList.length > 0 && (
                <select className="sn-guide-select" onChange={handleGuideSelect} defaultValue="">
                  <option value="" disabled>View a study guide…</option>
                  {guideList.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="sn-viewer-body">
            {!viewerFile && !guideContent && (
              <div className="sn-viewer-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <p>Open a PDF, image, or study guide to follow along</p>
              </div>
            )}
            <FileViewer file={viewerFile} guideContent={guideContent} />
          </div>
        </div>

        {/* Bottom-right: diagram */}
        <div className="sn-diagram-wrap">
          <span className="sn-panel-label">Visual Diagram</span>
          <div className="sn-diagram-body">
            {diagramLoading && (
              <div className="sn-diagram-placeholder">Generating diagram…</div>
            )}
            {!diagramLoading && mermaidCode && (
              <MermaidDiagram code={mermaidCode} />
            )}
            {!diagramLoading && !mermaidCode && (
              <div className="sn-diagram-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>A diagram will appear here when your notes describe a process, cycle, or relationship</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
