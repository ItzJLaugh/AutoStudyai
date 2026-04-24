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
    if (['P', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE', 'DIV'].includes(node.nodeName)) return node;
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

const EXTRACT_EXTS = new Set(['docx', 'pptx', 'txt', 'md', 'doc']);

// ─── File viewer ─────────────────────────────────────────────────────────────
function FileViewer({ file, guideContent }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [extractedText, setExtractedText] = useState(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    setObjectUrl(null);
    setExtractedText(null);
    setExtracting(false);
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (EXTRACT_EXTS.has(ext)) {
      setExtracting(true);
      const fd = new FormData();
      fd.append('file', file);
      let cancelled = false;
      fetch(API + '/extract-file-text', {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      })
        .then(r => r.json())
        .then(data => { if (!cancelled) { setExtractedText(data.text ?? '(No text found)'); setExtracting(false); } })
        .catch(() => { if (!cancelled) { setExtractedText('Could not read this file.'); setExtracting(false); } });
      return () => { cancelled = true; };
    } else {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (guideContent) return (
    <div className="sn-guide-viewer">
      <div dangerouslySetInnerHTML={{ __html: guideContent }} />
    </div>
  );
  if (!file) return null;
  if (extracting) return <div className="sn-viewer-empty"><p>Reading file…</p></div>;
  if (extractedText !== null) return (
    <div className="sn-extracted-viewer">
      <div className="sn-extracted-filename">{file.name}</div>
      <pre className="sn-extracted-content">{extractedText}</pre>
    </div>
  );

  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return <iframe src={objectUrl} className="sn-iframe" title="Class material" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <img src={objectUrl} className="sn-viewer-img" alt="Class material" />;
  return null;
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
  // Refs mirror state so timeout callbacks always read the latest values
  const noteIdRef = useRef(null);
  const titleRef  = useRef('Untitled Notes');

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
        noteIdRef.current = data.note.id;
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
      noteIdRef.current = data.note.id;
      titleRef.current  = data.note.title || 'Untitled Notes';
      setNoteId(data.note.id);
      setTitle(data.note.title || 'Untitled Notes');
      if (paperRef.current && data.note.content) {
        paperRef.current.innerHTML = data.note.content;
      }
    } catch {}
  }

  // ── Autosave (debounced 1s) — reads refs so callbacks never see stale values
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (!noteIdRef.current) return; // note not created yet — stay silent
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      if (!paperRef.current || !noteIdRef.current) return;
      try {
        await fetch(API + '/smart_notes/' + noteIdRef.current, {
          method: 'PUT',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleRef.current,
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
      }
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
      const block = getBlock(sel.getRangeAt(0).startContainer, root);
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

      // 13. Document title — very first block, ≤10 words, no trailing punctuation → <h1>
      const isFirstBlock = block.parentNode === root && !block.previousElementSibling;
      if (isFirstBlock && words.length >= 1 && words.length <= 10 && !/[.!?,;:]$/.test(lineText)) {
        e.preventDefault();
        const h1 = document.createElement('h1'); h1.textContent = lineText;
        block.parentNode.replaceChild(h1, block);
        newParaAfter(h1);
        return;
      }

      // 14. Short line → <h3> sub-heading (2–6 words, no trailing punctuation)
      if (words.length >= 2 && words.length <= 6 && !/[.!?,;:]$/.test(lineText)) {
        e.preventDefault();
        const h3 = document.createElement('h3'); h3.textContent = lineText;
        block.parentNode.replaceChild(h3, block);
        newParaAfter(h3);
        return;
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
    if (paperRef.current) paperRef.current.innerHTML = '';
    noteIdRef.current = null;
    titleRef.current  = 'Untitled Notes';
    setNoteId(null);
    setTitle('Untitled Notes');
    setMermaidCode(null);
    setViewerFile(null);
    setGuideContent(null);
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
