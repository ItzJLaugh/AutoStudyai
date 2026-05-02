import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { authHeaders } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Rule-based formatter ────────────────────────────────────────────────────
const SPELL_MAP = {
  // Common typos
  teh: 'the', hte: 'the', adn: 'and', nad: 'and', hwich: 'which',
  recieve: 'receive', definately: 'definitely', occured: 'occurred',
  seperate: 'separate', untill: 'until', occurance: 'occurrence', waht: 'what',
  biuld: 'build', existance: 'existence', neccessary: 'necessary', accomodate: 'accommodate',
  comittee: 'committee', concious: 'conscious', liason: 'liaison',
  alot: 'a lot', becuase: 'because', wierd: 'weird', freind: 'friend',
  thier: 'their', beleive: 'believe', enviroment: 'environment',
  goverment: 'government', reccomend: 'recommend', grammer: 'grammar',
  // Contractions (no apostrophe → with apostrophe)
  dont: "don't", cant: "can't", wont: "won't", isnt: "isn't", arent: "aren't",
  wasnt: "wasn't", werent: "weren't", hasnt: "hasn't", havent: "haven't",
  doesnt: "doesn't", didnt: "didn't", wouldnt: "wouldn't",
  shouldnt: "shouldn't", couldnt: "couldn't",
  im: "I'm", ive: "I've", youre: "you're", theyre: "they're",
  // Abbreviations
  eg: 'e.g.', ie: 'i.e.',
};

const FORCE_UPPER = new Set([
  // Biology / chemistry
  'atp', 'adp', 'nadh', 'fadh2', 'dna', 'rna', 'mrna', 'trna', 'rrna', 'pcr', 'ph',
  // Medical / clinical
  'ecg', 'ekg', 'cpr', 'iv', 'bp', 'hr', 'gi', 'cns', 'pns', 'icu', 'er',
  'abg', 'cbc', 'wbc', 'rbc', 'bmp', 'cmp', 'inr', 'ptt', 'bun', 'gfr',
  'ldl', 'hdl', 'bmi', 'bpm', 'hiv', 'aids', 'adhd', 'ocd', 'ptsd', 'cvd',
  // Imaging / physics
  'mri', 'ct', 'pet', 'uv', 'ir', 'nmr',
  // Computer science
  'cpu', 'gpu', 'ram', 'rom', 'sql', 'api', 'url', 'html', 'css',
  'os', 'ip', 'tcp', 'udp', 'http', 'https',
  // Academic / standardised tests
  'gpa', 'sat', 'act', 'iq', 'gre', 'lsat', 'mcat',
  // Business
  'ceo', 'cfo', 'cto', 'coo', 'roi', 'gdp', 'gnp',
  // Geopolitical
  'usa', 'uk', 'eu', 'un',
]);

function applyWordRules(word) {
  const lower = word.toLowerCase();
  if (FORCE_UPPER.has(lower)) return word.toUpperCase();
  if (SPELL_MAP[lower]) return SPELL_MAP[lower];
  return word;
}

function escHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getBlock(node, root) {
  while (node && node !== root) {
    if (['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE', 'DIV'].includes(node.nodeName)) return node;
    node = node.parentNode;
  }
  return null;
}

function placeCursorAt(el, offset) {
  const sel = window.getSelection();
  const range = document.createRange();
  const tn = el.firstChild;
  if (tn && tn.nodeType === Node.TEXT_NODE) {
    range.setStart(tn, Math.min(offset, tn.length));
  } else {
    range.setStart(el, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function toTitleCase(text) {
  return text.split(/\s+/).map(word => {
    if (!word) return word;
    if (/^[A-Z]{2,}(\d*)$/.test(word)) return word; // keep ALL-CAPS acronyms (ITE, UDP, 484)
    if (/^\d+$/.test(word)) return word; // keep bare numbers
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// Count consecutive empty blocks immediately above a given block
function countEmptyBefore(block) {
  let count = 0;
  let prev = block.previousElementSibling;
  while (prev) {
    const t = (prev.innerText || prev.textContent || '').replace(/[\u200B\n\r]/g, '').trim();
    if (t === '') { count++; prev = prev.previousElementSibling; }
    else break;
  }
  return count;
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

// Office docs that need backend extraction (browser cannot render natively)
const EXTRACT_EXTS = new Set(['docx', 'pptx', 'doc', 'odt', 'ods', 'odp']);
// Plain-text formats readable client-side via FileReader
const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'log',
  'json', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'html', 'htm', 'css', 'scss', 'less',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'c', 'h', 'cpp', 'hpp', 'cs',
  'php', 'swift', 'kt', 'sql', 'sh', 'bash', 'zsh', 'ps1',
]);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac']);

// ─── Study guide Q&A parser ──────────────────────────────────────────────────
function parseGuideQA(html) {
  // Strip HTML tags, decode entities
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

  const pairs = [];
  // Match Q\d+[:.] ... A\d+[:.] ... with the same number
  const re = /Q(\d+)\s*[:.]\s*([\s\S]*?)A\1\s*[:.]\s*([\s\S]*?)(?=Q\d+\s*[:.]\s*|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const q = m[2].trim();
    const a = m[3].trim();
    if (q || a) pairs.push({ num: m[1], question: q, answer: a });
  }
  return pairs;
}

function GuideViewer({ html }) {
  const pairs = parseGuideQA(html);
  if (pairs.length === 0) {
    return <div className="sn-guide-viewer" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className="sn-guide-qa-viewer">
      {pairs.map((pair) => (
        <div key={pair.num} className="sn-qa-pair">
          <p className="sn-qa-q"><strong>Q{pair.num}. {pair.question}</strong></p>
          <p className="sn-qa-a">{pair.answer}</p>
        </div>
      ))}
    </div>
  );
}

// ─── File viewer ─────────────────────────────────────────────────────────────
function FileViewer({ file, guideContent }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  useEffect(() => {
    setObjectUrl(null);
    setExtractedText(null);
    setExtracting(false);
    setExtractError(null);
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    let cancelled = false;

    if (EXTRACT_EXTS.has(ext)) {
      // Also generate an object URL so the user can download if extraction fails
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      setExtracting(true);
      const fd = new FormData();
      fd.append('file', file);
      fetch(API + '/extract-file-text', { method: 'POST', headers: authHeaders(), body: fd })
        .then(async r => {
          const data = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (!r.ok) {
            setExtractError(data.detail || 'Could not extract text from this file.');
          } else {
            setExtractedText(data.text || '');
          }
          setExtracting(false);
        })
        .catch(() => {
          if (!cancelled) { setExtractError('Could not reach the server.'); setExtracting(false); }
        });
      return () => { cancelled = true; URL.revokeObjectURL(url); };
    }

    if (TEXT_EXTS.has(ext)) {
      const reader = new FileReader();
      reader.onload = () => { if (!cancelled) setExtractedText(reader.result || ''); };
      reader.onerror = () => { if (!cancelled) setExtractError('Could not read this file.'); };
      reader.readAsText(file);
      return () => { cancelled = true; };
    }

    // Everything else — generate object URL for native browser rendering
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => { cancelled = true; URL.revokeObjectURL(url); };
  }, [file]);

  if (guideContent) return <GuideViewer html={guideContent} />;
  if (!file) return null;

  const ext = file.name.split('.').pop().toLowerCase();

  if (extracting) return <div className="sn-viewer-empty"><p>Reading {file.name}…</p></div>;

  if (extractedText !== null) {
    return (
      <div className="sn-extracted-viewer">
        <div className="sn-extracted-filename">{file.name}</div>
        {extractedText.trim() === ''
          ? <p className="sn-extracted-empty">(This file contains no readable text.)</p>
          : <pre className="sn-extracted-content">{extractedText}</pre>}
      </div>
    );
  }

  if (extractError) {
    return (
      <div className="sn-extracted-viewer">
        <div className="sn-extracted-filename">{file.name}</div>
        <p className="sn-extracted-empty">{extractError}</p>
        {objectUrl && (
          <a className="btn sn-open-btn" href={objectUrl} download={file.name} style={{ marginTop: 12, display: 'inline-block' }}>
            Download
          </a>
        )}
      </div>
    );
  }

  if (!objectUrl) return null;

  if (ext === 'pdf') return <iframe src={objectUrl} className="sn-iframe" title={file.name} />;
  if (IMAGE_EXTS.has(ext)) return <img src={objectUrl} className="sn-viewer-img" alt={file.name} />;
  if (VIDEO_EXTS.has(ext)) return <video src={objectUrl} controls className="sn-viewer-video" />;
  if (AUDIO_EXTS.has(ext)) return (
    <div className="sn-extracted-viewer">
      <div className="sn-extracted-filename">{file.name}</div>
      <audio src={objectUrl} controls style={{ width: '100%', marginTop: 12 }} />
    </div>
  );

  // Final fallback — try to render in iframe (works for some types: HTML pages, SVG, etc)
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe src={objectUrl} className="sn-iframe" title={file.name} />
      <a
        className="btn sn-open-btn"
        href={objectUrl}
        download={file.name}
        style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.75em', padding: '6px 12px' }}
      >
        Download
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

  // Diagram / visualize
  const [mermaidCode, setMermaidCode] = useState(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [visualizeMode, setVisualizeMode] = useState(false);

  // Resize state
  const [colWidth, setColWidth] = useState(320);
  const [topPx, setTopPx] = useState(null); // null = CSS default 1fr
  const layoutRef = useRef(null);

  // File viewer
  const [viewerFile, setViewerFile] = useState(null);
  const [guideList, setGuideList] = useState([]);
  const [guideContent, setGuideContent] = useState(null);
  const [viewerDragOver, setViewerDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Paper (contenteditable)
  const paperRef = useRef(null);
  const saveTimer = useRef(null);
  const pollTimer = useRef(null);
  // Refs mirror state so timeout callbacks always read the latest values
  const noteIdRef = useRef(null);
  const titleRef  = useRef('Untitled Notes');
  const lastSavedRef = useRef(''); // last saved content snapshot

  // ── Init: create or load note ────────────────────────────────────────────
  useEffect(() => {
    const { id } = router.query;
    if (id) {
      if (String(id) !== String(noteIdRef.current)) {
        loadNote(id);
      }
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
        noteIdRef.current = data.note.id;
        setNoteId(data.note.id);
        // Ensure the paper has a starting <p> block so first-line typing has a wrapper
        if (paperRef.current && !paperRef.current.innerHTML.trim()) {
          paperRef.current.innerHTML = '<p><br></p>';
        }
        lastSavedRef.current = paperRef.current?.innerHTML || '';
        router.replace('/smartnotes?id=' + data.note.id, undefined, { shallow: true });
      }
    } catch {}
  }

  async function loadNote(id) {
    try {
      const resp = await fetch(API + '/smart_notes/' + id, { headers: authHeaders() });
      if (!resp.ok) { createNote(); return; }
      const data = await resp.json();
      noteIdRef.current = data.note.id;
      titleRef.current  = data.note.title || 'Untitled Notes';
      setNoteId(data.note.id);
      setTitle(data.note.title || 'Untitled Notes');
      if (paperRef.current) {
        paperRef.current.innerHTML = data.note.content && data.note.content.trim()
          ? data.note.content
          : '<p><br></p>';
        lastSavedRef.current = paperRef.current.innerHTML;
      }
    } catch {}
  }

  // ── Save helper — sends content to backend, updates lastSavedRef ────────
  const doSave = useCallback(async (opts = {}) => {
    if (!paperRef.current || !noteIdRef.current) return;
    const content = paperRef.current.innerHTML;
    if (content === lastSavedRef.current && !opts.force) return; // nothing changed
    setSaveStatus('saving');
    try {
      const init = {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleRef.current, content }),
      };
      if (opts.keepalive) init.keepalive = true;
      await fetch(API + '/smart_notes/' + noteIdRef.current, init);
      lastSavedRef.current = content;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? '' : s), 1500);
    } catch {
      setSaveStatus('');
    }
  }, []);

  // ── Autosave (debounced 1s after a keypress) ────────────────────────────
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (!noteIdRef.current) return;
    saveTimer.current = setTimeout(() => doSave(), 1000);
  }, [doSave]);

  // ── Live polling: every 3s, save if content changed (catches mouse-only edits)
  useEffect(() => {
    pollTimer.current = setInterval(() => { doSave(); }, 3000);
    return () => clearInterval(pollTimer.current);
  }, [doSave]);

  // ── Flush save on unmount (SPA navigation) and beforeunload (tab close) ──
  useEffect(() => {
    function flushSave() {
      clearTimeout(saveTimer.current);
      if (!noteIdRef.current || !paperRef.current) return;
      const content = paperRef.current.innerHTML;
      if (content === lastSavedRef.current) return;
      fetch(API + '/smart_notes/' + noteIdRef.current, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleRef.current, content }),
        keepalive: true,
      }).catch(() => {});
      lastSavedRef.current = content;
    }
    window.addEventListener('beforeunload', flushSave);
    return () => {
      window.removeEventListener('beforeunload', flushSave);
      flushSave();
    };
  }, []);

  // ── Visualize: send highlighted text to diagram API ─────────────────────
  function handleVisualize() {
    setVisualizeMode(v => !v);
  }

  async function handleCheckmark() {
    const selectedText = window.getSelection()?.toString()?.trim();
    if (!selectedText || selectedText.length < 5) return;
    setVisualizeMode(false);
    setDiagramLoading(true);
    try {
      const resp = await fetch(API + '/smart_notes/diagram', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: selectedText }),
      });
      const data = await resp.json();
      setMermaidCode(data.mermaid || null);
    } catch {}
    setDiagramLoading(false);
  }

  // ── Resize handlers ──────────────────────────────────────────────────────
  function onVDragStart(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidth;
    const onMove = (me) => {
      if (!layoutRef.current) return;
      const dx = startX - me.clientX;
      const maxW = layoutRef.current.offsetWidth - 340;
      setColWidth(Math.max(200, Math.min(startWidth + dx, maxW)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onHDragStart(e) {
    e.preventDefault();
    const onMove = (me) => {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const newTop = Math.max(100, Math.min(me.clientY - rect.top, rect.height - 8 - 100));
      setTopPx(newTop);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── Paper keyboard handler ───────────────────────────────────────────────
  function onPaperKeyUp(e) {
    if (!paperRef.current) return;
    scheduleSave();
  }

  function onPaperKeyDown(e) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const root = paperRef.current;

    function insertAfter(newEl, ref) { ref.parentNode.insertBefore(newEl, ref.nextSibling); }
    function newParaAfter(ref) {
      const p = document.createElement('p'); p.innerHTML = '<br>';
      insertAfter(p, ref);
      const nr = document.createRange(); nr.setStart(p, 0); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    }

    // ── Auto-capitalize: first letter typed into an empty block ──────────────
    if (/^[a-z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const range0 = sel.getRangeAt(0);
      const block0 = getBlock(range0.startContainer, root);
      const checkNode = block0 || (range0.startContainer !== root ? null : root);
      if (checkNode) {
        const raw = (checkNode.innerText || checkNode.textContent || '')
          .replace(/[\u200B\n\r]/g, '').trim();
        if (raw === '') {
          e.preventDefault();
          const tn = document.createTextNode(e.key.toUpperCase());
          range0.deleteContents();
          range0.insertNode(tn);
          const nr = document.createRange(); nr.setStartAfter(tn); nr.collapse(true);
          sel.removeAllRanges(); sel.addRange(nr);
          return;
        }
        // After sentence-ending punctuation \u2014 capitalize start of new sentence
        if (range0.startContainer.nodeType === Node.TEXT_NODE) {
          const beforeText = range0.startContainer.textContent.slice(0, range0.startOffset);
          if (/[.!?]\s+$/.test(beforeText)) {
            e.preventDefault();
            const tn = document.createTextNode(e.key.toUpperCase());
            range0.insertNode(tn);
            const nr = document.createRange(); nr.setStartAfter(tn); nr.collapse(true);
            sel.removeAllRanges(); sel.addRange(nr);
            return;
          }
        }
      }
    }

    // \u2500\u2500 Tab: indent / outdent list items \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    if (e.key === 'Tab') {
      e.preventDefault();
      const block = getBlock(sel.getRangeAt(0).startContainer, root);
      if (!block) return;
      const indentStep = '\u00A0\u00A0\u00A0\u00A0';
      if (e.shiftKey) {
        if (block.firstChild && block.firstChild.nodeType === Node.TEXT_NODE) {
          const t = block.firstChild.textContent;
          if (t.startsWith(indentStep)) {
            block.firstChild.textContent = t.slice(indentStep.length);
          }
        }
      } else {
        const raw = (block.innerText || block.textContent || '');
        const bulletMatch = raw.match(/^([-*\u2022])\s+(.*)/);
        if (bulletMatch) {
          block.innerHTML = indentStep + '\u25E6 ' + escHtml(bulletMatch[2]);
        } else if (block.firstChild && block.firstChild.nodeType === Node.TEXT_NODE) {
          block.firstChild.textContent = indentStep + block.firstChild.textContent;
        } else {
          block.insertBefore(document.createTextNode(indentStep), block.firstChild);
        }
        const nr = document.createRange();
        nr.selectNodeContents(block); nr.collapse(false);
        sel.removeAllRanges(); sel.addRange(nr);
      }
      return;
    }

    // ── Space: inline markdown + spell/acronym correction ────────────────────
    if (e.key === ' ') {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const before = node.textContent.slice(0, range.startOffset);
      const wordMatch = before.match(/(\S+)$/);
      if (!wordMatch) return;
      const word = wordMatch[1];

      function replaceWord(tag, inner) {
        e.preventDefault();
        const el = document.createElement(tag); el.textContent = inner;
        const cr = document.createRange();
        cr.setStart(node, range.startOffset - word.length);
        cr.setEnd(node, range.startOffset);
        cr.deleteContents(); cr.insertNode(el);
        const sp = document.createTextNode(' '); el.after(sp);
        const nr = document.createRange(); nr.setStartAfter(sp); nr.collapse(true);
        sel.removeAllRanges(); sel.addRange(nr);
      }

      // Inline markdown — check most specific patterns first
      const tripleBold = word.match(/^\*{3}([^*]+)\*{3}$/);
      if (tripleBold) { replaceWord('strong', tripleBold[1]); return; } // ***bold***

      const dblBold   = word.match(/^\*\*([^*]+)\*\*$/);
      const snglBold  = !dblBold && word.match(/^\*([^*]+)\*$/);
      const italic    = word.match(/^_([^_]+)_$/);
      const code      = word.match(/^`([^`]+)`$/);
      const strike    = word.match(/^~~([^~]+)~~$/);

      if (dblBold || snglBold) { replaceWord('strong', (dblBold || snglBold)[1]); return; }
      if (italic)  { replaceWord('em',     italic[1]);  return; }
      if (code)    { replaceWord('code',   code[1]);    return; }
      if (strike)  { replaceWord('del',    strike[1]);  return; }

      // Spell / acronym correction
      const corrected = applyWordRules(word);
      if (corrected !== word) {
        e.preventDefault();
        const cr = document.createRange();
        cr.setStart(node, range.startOffset - word.length);
        cr.setEnd(node, range.startOffset);
        cr.deleteContents();
        const tn = document.createTextNode(corrected + ' ');
        cr.insertNode(tn);
        const nr = document.createRange(); nr.setStartAfter(tn); nr.collapse(true);
        sel.removeAllRanges(); sel.addRange(nr);
        return;
      }
      return;
    }

    // ── Backspace: escape auto-inserted list prefix when line is only prefix ──
    if (e.key === 'Backspace') {
      const block = getBlock(sel.getRangeAt(0).startContainer, root);
      if (!block) return;
      const raw = (block.innerText || block.textContent || '').replace(/\u200B/g, '');
      if (
        /^[-*•]\s?$/.test(raw) ||
        /^\d+[.)]\s?$/.test(raw) ||
        /^>>\s?$/.test(raw) ||
        /^[A-Z][.)]\s?$/.test(raw)
      ) {
        e.preventDefault();
        const newP = document.createElement('p'); newP.innerHTML = '<br>';
        block.parentNode.replaceChild(newP, block);
        const nr = document.createRange(); nr.setStart(newP, 0); nr.collapse(true);
        sel.removeAllRanges(); sel.addRange(nr);
      }
      return;
    }

    // ── Enter: format current line + continue list patterns ──────────────────
    if (e.key === 'Enter') {
      const range = sel.getRangeAt(0);
      let block = getBlock(range.startContainer, root);
      // Chrome may put first-line text directly in root without a block wrapper
      if (!block && range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.parentNode === root) {
        const p = document.createElement('p');
        range.startContainer.parentNode.replaceChild(p, range.startContainer);
        p.appendChild(range.startContainer);
        block = p;
      }
      if (!block) return;

      // 0. Heading cascade — Enter inside any heading always makes plain <p>
      if (['H1', 'H2', 'H3', 'H4'].includes(block.nodeName)) {
        e.preventDefault(); newParaAfter(block); return;
      }

      const lineText = (block.innerText || block.textContent || '').replace(/\u200B/g, '').trim();
      if (!lineText) return;
      const words = lineText.split(/\s+/).filter(Boolean);


      // 1. Horizontal rule — line of ---, ***, ===, ___
      if (/^[-*=_]{3,}$/.test(lineText)) {
        e.preventDefault();
        const hr = document.createElement('hr');
        block.parentNode.replaceChild(hr, block);
        const newP = document.createElement('p'); newP.innerHTML = '<br>';
        hr.after(newP);
        const nr = document.createRange(); nr.setStart(newP, 0); nr.collapse(true);
        sel.removeAllRanges(); sel.addRange(nr);
        return;
      }

      // 2. Markdown headings — #→h1, ##→h2, ###→h3
      const mdH = lineText.match(/^(#{1,4})\s+(.+)$/);
      if (mdH) {
        e.preventDefault();
        const tagMap = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h3' };
        const heading = document.createElement(tagMap[mdH[1].length]);
        heading.textContent = mdH[2];
        block.parentNode.replaceChild(heading, block);
        newParaAfter(heading);
        return;
      }

      // 3. ALL CAPS line (≥4 chars) → <h2> section header
      if (/^[A-Z][A-Z0-9\s\-:&/()]+$/.test(lineText) && lineText.length >= 4) {
        e.preventDefault();
        const h2 = document.createElement('h2'); h2.textContent = lineText;
        block.parentNode.replaceChild(h2, block);
        newParaAfter(h2);
        return;
      }

      // 4. Date line — "April 24", "Mon, April 24 2026", "4/24/26", "2026-04-24"
      const MONTH = 'January|February|March|April|May|June|July|August|September|October|November|December';
      const WDAY  = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
      const isDate = new RegExp(
        `^(?:(?:${WDAY}),?\\s+)?(?:${MONTH})\\s+\\d{1,2}(?:,?\\s*\\d{4})?$`, 'i'
      ).test(lineText)
        || /^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?$/.test(lineText)
        || /^\d{4}-\d{2}-\d{2}$/.test(lineText);
      if (isDate) {
        e.preventDefault();
        block.classList.add('sn-date-line');
        newParaAfter(block);
        return;
      }

      // 5. Callout — "!! text" or "!!! text"
      const calloutMatch = lineText.match(/^!{2,3}\s+(.+)$/);
      if (calloutMatch) {
        e.preventDefault();
        block.innerHTML = '<mark class="sn-callout">⚠ ' + escHtml(calloutMatch[1]) + '</mark>';
        newParaAfter(block);
        return;
      }

      // 6. Blockquote — "> text"
      const quoteMatch = lineText.match(/^>\s+(.+)$/);
      if (quoteMatch) {
        e.preventDefault();
        const bq = document.createElement('blockquote'); bq.textContent = quoteMatch[1];
        block.parentNode.replaceChild(bq, block);
        newParaAfter(bq);
        return;
      }

      // 7. Sub-bullet — ">> text"
      const subMatch = lineText.match(/^>>\s*(.*)/);
      if (subMatch) {
        e.preventDefault();
        block.innerHTML = '\u00a0\u00a0\u00a0\u00a0\u25e6 ' + escHtml(subMatch[1]);
        const newLine = document.createElement('p'); newLine.textContent = '>> ';
        insertAfter(newLine, block); placeCursorAt(newLine, 3);
        return;
      }

      // 8. Lettered list — "A. text" or "A) text" (uppercase only)
      const letteredMatch = lineText.match(/^([A-Z])([.)]\s*)(.*)/);
      if (letteredMatch) {
        e.preventDefault();
        const letter = letteredMatch[1];
        const sep = letteredMatch[2].trimEnd();
        const content = letteredMatch[3].trim();
        block.innerHTML = '<strong>' + letter + sep + '</strong>' + (content ? ' ' + escHtml(content) : '');
        const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
        const newLine = document.createElement('p');
        newLine.textContent = nextLetter + sep + ' ';
        insertAfter(newLine, block); placeCursorAt(newLine, newLine.textContent.length);
        return;
      }

      // 9. Bullet continuation — "- text", "* text", "• text"
      const bulletMatch = lineText.match(/^([-*•])\s+(.*)/);
      if (bulletMatch) {
        e.preventDefault();
        block.innerHTML = '• ' + escHtml(bulletMatch[2]);
        const newLine = document.createElement('p'); newLine.textContent = '- ';
        insertAfter(newLine, block); placeCursorAt(newLine, 2);
        return;
      }

      // 10. Numbered list — "1. text" or "1) text"
      const numMatch = lineText.match(/^(\d+)([.)]\s*)(.*)/);
      if (numMatch) {
        e.preventDefault();
        const num = parseInt(numMatch[1]);
        const sep = numMatch[2].trimEnd();
        const content = numMatch[3].trim();
        block.innerHTML = '<strong>' + escHtml(num + sep) + '</strong>' + (content ? ' ' + escHtml(content) : '');
        const newLine = document.createElement('p');
        newLine.textContent = (num + 1) + sep + ' ';
        insertAfter(newLine, block); placeCursorAt(newLine, newLine.textContent.length);
        return;
      }

      // 11. Definition — "term = value" or "term ≡ value" (≤5 words before =)
      const defMatch = lineText.match(/^([A-Za-z][A-Za-z\s\-']{0,40})\s*([=≡≈])\s*(.+)$/);
      if (defMatch && defMatch[1].trim().split(/\s+/).length <= 5) {
        e.preventDefault();
        block.innerHTML = '<strong>' + escHtml(defMatch[1].trim()) + '</strong> '
          + defMatch[2] + ' ' + escHtml(defMatch[3]);
        newParaAfter(block);
        return;
      }

      // 12. Bold term — "word(s): rest" or "word(s); rest" (≤6 words before separator)
      const termMatch = lineText.match(/^([A-Za-z][A-Za-z\s\-']{0,50}?)(\s*[:;—–]\s*)(.*)$/);
      if (termMatch && termMatch[1].trim().split(/\s+/).length <= 6) {
        e.preventDefault();
        const term = termMatch[1].trim();
        const sep  = termMatch[2];
        const rest = termMatch[3];
        block.innerHTML = '<strong>' + escHtml(term + sep) + '</strong>' + escHtml(rest);
        newParaAfter(block);
        return;
      }

      // 13–14. Context-based headings — blank lines above determine level
      //   Very first block OR 2+ blank lines above → Title <h1>
      //   1 blank line above → Section <h2>
      //   No blank lines, short line (2–6 words) → Sub-heading <h3>
      if (words.length >= 1 && words.length <= 10 && !/[.!?,;:]$/.test(lineText)) {
        const emptyAbove = countEmptyBefore(block);
        const isFirst = block.parentNode === root && !block.previousElementSibling;

        if (isFirst || emptyAbove >= 2) {
          e.preventDefault();
          const h1 = document.createElement('h1'); h1.textContent = toTitleCase(lineText);
          block.parentNode.replaceChild(h1, block);
          newParaAfter(h1);
          return;
        }
        if (emptyAbove === 1) {
          e.preventDefault();
          const h2 = document.createElement('h2'); h2.textContent = lineText;
          block.parentNode.replaceChild(h2, block);
          newParaAfter(h2);
          return;
        }
        if (words.length >= 2 && words.length <= 6) {
          e.preventDefault();
          const h3 = document.createElement('h3'); h3.textContent = lineText;
          block.parentNode.replaceChild(h3, block);
          newParaAfter(h3);
          return;
        }
      }

      // No rule matched — browser handles Enter normally
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

  function handleViewerDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setViewerDragOver(true);
  }

  function handleViewerDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setViewerDragOver(false);
  }

  function handleViewerDrop(e) {
    e.preventDefault();
    setViewerDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setGuideContent(null);
    setViewerFile(file);
  }

  function handleGuideSelect(e) {
    const guide = guideList.find(g => g.id === e.target.value);
    if (!guide) return;
    setViewerFile(null);
    setGuideContent(guide.study_guide || guide.notes || '<p>No content available.</p>');
  }

  // ── New session ──────────────────────────────────────────────────────────
  async function handleNewNote() {
    if (paperRef.current) paperRef.current.innerHTML = '<p><br></p>';
    noteIdRef.current = null;
    titleRef.current  = 'Untitled Notes';
    lastSavedRef.current = '<p><br></p>';
    setNoteId(null);
    setTitle('Untitled Notes');
    setMermaidCode(null);
    setViewerFile(null);
    setGuideContent(null);
    await createNote();
  }

  async function handleDeleteNote(id, e) {
    e?.stopPropagation();
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      await fetch(API + '/smart_notes/' + id, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setNotes(prev => prev.filter(n => n.id !== id));
      if (id === noteIdRef.current) {
        await handleNewNote();
      }
    } catch {}
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
            onChange={e => { titleRef.current = e.target.value; setTitle(e.target.value); scheduleSave(); }}
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

      {/* 3-panel resizable grid */}
      <div
        className="sn-layout"
        ref={layoutRef}
        style={{
          gridTemplateColumns: `1fr 8px ${colWidth}px`,
          gridTemplateRows: topPx !== null ? `${topPx}px 8px 1fr` : '1fr 8px 1fr',
        }}
      >
        {/* Left: notes paper — spans all 3 rows */}
        <div className="sn-paper-wrap">
          <div className="sn-paper-label-row">
            <span className="sn-panel-label">Notes</span>
            {visualizeMode && (
              <button
                className="sn-visualize-confirm"
                onClick={handleCheckmark}
                title="Generate diagram from highlighted text"
              >
                ✓
              </button>
            )}
          </div>
          <div
            ref={paperRef}
            className={`sn-paper${visualizeMode ? ' sn-paper--visualize' : ''}`}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={onPaperKeyDown}
            onKeyUp={onPaperKeyUp}
            data-placeholder="Start typing your notes here…"
            spellCheck={false}
          />
        </div>

        {/* Vertical drag divider */}
        <div className="sn-v-divider" onMouseDown={onVDragStart} />

        {/* Top-right: class material viewer */}
        <div
          className={`sn-viewer-wrap${viewerDragOver ? ' sn-viewer-drag' : ''}`}
          onDragOver={handleViewerDragOver}
          onDragLeave={handleViewerDragLeave}
          onDrop={handleViewerDrop}
        >
          <div className="sn-viewer-toolbar">
            <span className="sn-panel-label">Class Material</span>
            <div className="sn-viewer-controls">
              <button className="btn sn-open-btn" onClick={() => fileInputRef.current?.click()}>
                Open File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
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
                <p>Open a file or drag &amp; drop a PDF, image, Word doc, or PPTX here — or select a study guide above</p>
              </div>
            )}
            {viewerDragOver && (
              <div className="sn-viewer-drop-overlay">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p>Drop to open</p>
              </div>
            )}
            <FileViewer file={viewerFile} guideContent={guideContent} />
          </div>
        </div>

        {/* Horizontal drag divider */}
        <div className="sn-h-divider" onMouseDown={onHDragStart} />

        {/* Bottom-right: diagram */}
        <div className="sn-diagram-wrap">
          <div className="sn-diagram-toolbar">
            <span className="sn-panel-label">Visual Diagram</span>
            <button
              className={`btn sn-open-btn sn-visualize-btn${visualizeMode ? ' active' : ''}`}
              onClick={handleVisualize}
            >
              {visualizeMode ? 'Cancel' : 'Visualize'}
            </button>
          </div>
          <div className="sn-diagram-body">
            {diagramLoading && (
              <div className="sn-diagram-placeholder">Generating diagram…</div>
            )}
            {!diagramLoading && mermaidCode && (
              <MermaidDiagram code={mermaidCode} />
            )}
            {!diagramLoading && !mermaidCode && (
              <div className="sn-diagram-placeholder">
                <p>Click "Visualize", highlight text in your notes, then click ✓</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
