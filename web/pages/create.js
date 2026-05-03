import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, getToken } from '../lib/api';
import { useRequireAuth } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTOSAVE_MANUAL_KEY = 'autostudy_manual_draft';
const AUTOSAVE_TEXT_KEY   = 'autostudy_text_draft';

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.pptx,.txt,.md';

export default function CreateGuidePage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [inputMode, setInputMode] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [manualPairs, setManualPairs] = useState([{ term: '', definition: '' }, { term: '', definition: '' }]);
  const [cardCount, setCardCount] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [generateNotes, setGenerateNotes] = useState(true);
  const [generateFlashcards, setGenerateFlashcards] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Prevent two-finger swipe back-navigation
  useEffect(() => {
    const preventSwipeBack = (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault(); };
    window.addEventListener('wheel', preventSwipeBack, { passive: false });
    return () => window.removeEventListener('wheel', preventSwipeBack);
  }, []);

  // Load autosaved drafts on mount
  useEffect(() => {
    if (router.query.editGuideId) return;
    try {
      const manualDraft = localStorage.getItem(AUTOSAVE_MANUAL_KEY);
      if (manualDraft) {
        const d = JSON.parse(manualDraft);
        if (d.inputMode === 'manual') {
          if (d.title) setTitle(d.title);
          if (d.pairs?.length) setManualPairs(d.pairs);
          setInputMode('manual');
          return;
        }
      }
      const textDraft = localStorage.getItem(AUTOSAVE_TEXT_KEY);
      if (textDraft) {
        const d = JSON.parse(textDraft);
        if (d.title) setTitle(d.title);
        if (d.content) setContent(d.content);
      }
    } catch {}
  }, []);

  // Autosave manual drafts
  useEffect(() => {
    if (inputMode !== 'manual') return;
    const hasContent = title.trim() || manualPairs.some(p => p.term.trim() || p.definition.trim());
    if (hasContent) {
      localStorage.setItem(AUTOSAVE_MANUAL_KEY, JSON.stringify({ title, pairs: manualPairs, inputMode: 'manual' }));
    }
  }, [title, manualPairs, inputMode]);

  // Autosave paste text drafts
  useEffect(() => {
    if (inputMode !== 'text') return;
    if (title.trim() || content.trim()) {
      localStorage.setItem(AUTOSAVE_TEXT_KEY, JSON.stringify({ title, content }));
    }
  }, [title, content, inputMode]);

  const applyCardCount = useCallback((count) => {
    const num = parseInt(count);
    if (!num || num < 1) return;
    const clamped = Math.min(num, 100);
    setManualPairs(prev => {
      if (prev.length < clamped) return [...prev, ...Array(clamped - prev.length).fill(null).map(() => ({ term: '', definition: '' }))];
      return prev.slice(0, clamped);
    });
  }, []);

  // Load existing guide for editing
  useEffect(() => {
    const editId = router.query.editGuideId;
    if (ready && editId) {
      apiFetch('/guides/' + editId).then(data => {
        if (data?.guide) {
          setTitle(data.guide.title || '');
          setInputMode('manual');
          const pairs = [];
          const lines = (data.guide.study_guide || '').split('\n');
          let currentQ = '';
          for (const line of lines) {
            const qMatch = line.match(/^Q\d+:\s*(.+)/);
            const aMatch = line.match(/^A\d+:\s*(.+)/);
            if (qMatch) currentQ = qMatch[1].trim();
            else if (aMatch && currentQ) { pairs.push({ term: currentQ, definition: aMatch[1].trim() }); currentQ = ''; }
          }
          if (pairs.length > 0) setManualPairs(pairs);
          localStorage.removeItem(AUTOSAVE_MANUAL_KEY);
        }
      });
    }
  }, [ready, router.query.editGuideId]);

  useEffect(() => {
    if (ready) {
      apiFetch('/folders').then(data => {
        if (data?.folders) {
          setFolders(data.folders);
          const folderId = router.query.folder;
          if (folderId && data.folders.some(f => f.id === folderId)) setSelectedFolder(folderId);
        }
      });
    }
  }, [ready]);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadFileName(file.name);
    // Set inputMode to 'pdf' for any supported file type to trigger extraction flow
    setInputMode('pdf');
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  }

  function switchMode(mode) {
    setInputMode(mode);
    setError('');
    setUploadFile(null);
    setUploadFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function updatePair(index, field, value) {
    setManualPairs(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function addPair() { setManualPairs(prev => [...prev, { term: '', definition: '' }]); }

  function removePair(index) {
    if (manualPairs.length <= 1) return;
    setManualPairs(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');

    if (inputMode === 'manual') {
      const validPairs = manualPairs.filter(p => p.term.trim() && p.definition.trim());
      if (validPairs.length === 0) { setError('Add at least one term and definition.'); return; }
      setStatus('saving');
      const studyGuide = validPairs.map((p, i) => {
        let entry = `Q${i + 1}: ${p.term.trim()}\nA${i + 1}: ${p.definition.trim()}`;
        if (p.image) entry += `\n[IMG:${p.image}]`;
        return entry;
      }).join('\n');
      const flashcards = validPairs.map(p => ({ front: p.term.trim(), back: p.definition.trim() }));
      const body = { title: title.trim(), study_guide: studyGuide, flashcards };
      if (selectedFolder) body.folder_id = selectedFolder;
      const editId = router.query.editGuideId;
      let savedData;
      if (editId) {
        savedData = await apiFetch('/guides/' + editId, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        savedData = await apiFetch('/guides', { method: 'POST', body: JSON.stringify(body) });
      }
      if (savedData?.guide) {
        setStatus('done');
        localStorage.removeItem(AUTOSAVE_MANUAL_KEY);
        router.push('/guide/' + savedData.guide.id);
      } else {
        setError('Failed to save guide.');
        setStatus('error');
      }
      return;
    }

    let finalContent = content.trim();

    if (inputMode === 'pdf') {
      if (!uploadFile) { setError('Please select a file.'); return; }
      setStatus('extracting');
      const formData = new FormData();
      formData.append('file', uploadFile);
      try {
        const resp = await fetch(API + '/extract-file-text', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + (getToken() || '') },
          body: formData,
        });
        const data = await resp.json();
        if (!resp.ok || !data.text) {
          setError(data.detail || 'Could not extract text from this file.');
          setStatus('error');
          return;
        }
        finalContent = data.text;
      } catch {
        setError('Failed to upload file. Please try again.');
        setStatus('error');
        return;
      }
    } else if (finalContent.length < 10) {
      return;
    }

    setStatus('ingesting');
    const ingestData = await apiFetch('/ingest', {
      method: 'POST',
      body: JSON.stringify({ content: finalContent, page_url: '', content_type: 'webpage' })
    });
    if (!ingestData?.content_id) { setError('Failed to process content.'); setStatus('error'); return; }

    setStatus('generating');
    const generateData = await apiFetch('/generate', {
      method: 'POST',
      body: JSON.stringify({ content_id: ingestData.content_id, notes: generateNotes, study_guide: true, flashcards: generateFlashcards })
    });
    if (!generateData) { setError('Failed to generate study materials. You may have reached your usage limit.'); setStatus('error'); return; }

    setStatus('saving');
    const body = { title: title.trim(), notes: generateData.notes || null, study_guide: generateData.study_guide || null, flashcards: generateData.flashcards || null };
    if (selectedFolder) body.folder_id = selectedFolder;
    const savedData = await apiFetch('/guides', { method: 'POST', body: JSON.stringify(body) });
    if (savedData?.guide) {
      setStatus('done');
      localStorage.removeItem(AUTOSAVE_TEXT_KEY);
      router.push('/guide/' + savedData.guide.id);
    } else {
      setError('Failed to save guide.');
      setStatus('error');
    }
  }

  if (!ready) return null;

  const isLoading = ['extracting', 'ingesting', 'generating', 'saving'].includes(status);
  const statusMessages = {
    extracting: 'Reading your file...',
    ingesting: 'Processing your content...',
    generating: 'AI is generating your study guide — this may take 20–40 seconds...',
    saving: 'Saving your guide...',
  };
  const canSubmit = !isLoading && title.trim() && (
    inputMode === 'manual'
      ? manualPairs.some(p => p.term.trim() && p.definition.trim())
      : inputMode === 'pdf' ? !!uploadFile : content.trim().length >= 10
  );
  const filledCards = manualPairs.filter(p => p.term.trim() && p.definition.trim()).length;

  return (
    <div className="fade-in create-page">

      {/* Page header */}
      <div className="create-header">
        <h2 className="create-title">Create Study Guide</h2>
        <p className="create-subtitle">
          {inputMode === 'manual'
            ? 'Add your own terms and definitions to build a custom flashcard set.'
            : 'Paste notes or upload a file — AI generates your study guide automatically.'}
        </p>
      </div>

      {/* Status / error banners */}
      {isLoading && (
        <div className="create-banner create-banner-info">{statusMessages[status]}</div>
      )}
      {error && (
        <div className="create-banner create-banner-error">{error}</div>
      )}

      <form onSubmit={handleCreate}>

        {/* Mode tabs */}
        <div className="create-tabs">
          {[['manual', 'Manual'], ['text', 'Paste Text'], ['pdf', 'Upload File']].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchMode(mode)}
              disabled={isLoading}
              className={'create-tab' + (inputMode === mode ? ' create-tab-active' : '')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Guide Title */}
        <div className="create-field">
          <label className="create-label">Guide Title</label>
          <input
            type="text"
            placeholder="e.g. Chapter 5: Cell Biology"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            disabled={isLoading}
            className="create-input"
          />
        </div>

        {/* ── Manual mode ── */}
        {inputMode === 'manual' && (
          <div className="create-field">
            {/* Terms & Definitions header with card count */}
            <div className="create-manual-header">
              <label className="create-label">Terms &amp; Definitions</label>
              <div className="create-cardcount-wrap">
                <span className="create-cardcount-label">Set size</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="—"
                  value={cardCount}
                  onChange={e => setCardCount(e.target.value)}
                  onBlur={() => applyCardCount(cardCount)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCardCount(cardCount))}
                  className="create-cardcount-input"
                />
                <span className="create-cardcount-badge">
                  {filledCards} / {manualPairs.length}
                </span>
              </div>
            </div>

            {/* Card pairs */}
            <div className="create-cards-list">
              {manualPairs.map((pair, i) => (
                <div key={i} className="create-card">
                  <div className="create-card-num">{i + 1}</div>
                  <div className="create-card-body">
                    <input
                      type="text"
                      placeholder="Term or Question"
                      value={pair.term}
                      onChange={e => updatePair(i, 'term', e.target.value)}
                      disabled={isLoading}
                      className="create-card-input create-card-term"
                    />
                    <div className="create-card-divider" />
                    <input
                      type="text"
                      placeholder="Definition or Answer"
                      value={pair.definition}
                      onChange={e => updatePair(i, 'definition', e.target.value)}
                      disabled={isLoading}
                      className="create-card-input create-card-def"
                    />
                    {pair.image ? (
                      <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                        <img src={pair.image} alt="Card" style={{ maxWidth: '100%', maxHeight: 130, borderRadius: 8, border: '1px solid var(--border-default)' }} />
                        <button
                          type="button"
                          onClick={() => updatePair(i, 'image', null)}
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.8em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >&times;</button>
                      </div>
                    ) : (
                      <label className="create-card-img-btn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                        Add image
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const file = e.target.files[0]; if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => updatePair(i, 'image', reader.result);
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }} />
                      </label>
                    )}
                  </div>
                  {manualPairs.length > 1 && (
                    <button type="button" onClick={() => removePair(i)} disabled={isLoading} className="create-card-remove" title="Remove">×</button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={addPair} disabled={isLoading} className="create-add-card">
              + Add Card
            </button>
          </div>
        )}

        {/* ── Paste text mode ── */}
        {inputMode === 'text' && (
          <div className="create-field">
            <label className="create-label">
              Content <span className="create-label-hint">(paste your notes, slides, or reading material)</span>
            </label>
            <textarea
              placeholder="Paste your lecture notes, textbook content, or study material here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              disabled={isLoading}
              className="create-textarea"
            />
            <div className="create-char-count">{content.length.toLocaleString()} characters</div>
          </div>
        )}

        {/* ── Upload file mode ── */}
        {inputMode === 'pdf' && (
          <div className="create-field">
            <label className="create-label">
              File <span className="create-label-hint">(PDF, DOCX, PPTX, or TXT — max 20MB)</span>
            </label>
            <div
              className={'create-upload-zone' + (uploadFile ? ' create-upload-zone-active' : '')}
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              <div className="create-upload-icon">{uploadFile ? '✅' : '📂'}</div>
              {uploadFile ? (
                <>
                  <div className="create-upload-filename">{uploadFileName}</div>
                  <div className="create-upload-hint">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB · click to change</div>
                </>
              ) : (
                <>
                  <div className="create-upload-cta">Click to choose a file</div>
                  <div className="create-upload-hint">PDF, DOCX, PPTX, TXT — or drag and drop</div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>
        )}

        {/* Save to Class */}
        <div className="create-field">
          <label className="create-label">Save to Class <span className="create-label-hint">(optional)</span></label>
          <select
            value={selectedFolder}
            onChange={e => setSelectedFolder(e.target.value)}
            disabled={isLoading}
            className="create-select"
          >
            <option value="">No class</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Generate options (non-manual only) */}
        {inputMode !== 'manual' && (
          <div className="create-checks">
            {[['generateNotes', generateNotes, setGenerateNotes, 'Generate Notes'],
              ['generateFlashcards', generateFlashcards, setGenerateFlashcards, 'Generate Flashcards']
            ].map(([key, val, setter, lbl]) => (
              <label key={key} className="create-check-label">
                <input
                  type="checkbox"
                  checked={val}
                  onChange={e => setter(e.target.checked)}
                  disabled={isLoading}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                {lbl}
              </label>
            ))}
          </div>
        )}

        <button type="submit" className="btn create-submit-btn" disabled={!canSubmit}>
          {isLoading
            ? (inputMode === 'manual' ? 'Saving…' : 'Generating…')
            : (inputMode === 'manual'
                ? (router.query.editGuideId ? 'Update Study Guide' : 'Save Study Guide')
                : 'Generate Study Guide')}
        </button>

      </form>
    </div>
  );
}
