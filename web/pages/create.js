import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, getToken } from '../lib/api';
import { useRequireAuth } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTOSAVE_KEY = 'autostudy_manual_draft';

export default function CreateGuidePage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'pdf' | 'manual'
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [manualPairs, setManualPairs] = useState([{ term: '', definition: '' }, { term: '', definition: '' }]);
  const [cardCount, setCardCount] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [generateNotes, setGenerateNotes] = useState(true);
  const [generateFlashcards, setGenerateFlashcards] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [autoSaved, setAutoSaved] = useState(false);
  const fileInputRef = useRef(null);

  // Prevent two-finger swipe back-navigation while on this page
  useEffect(() => {
    const preventSwipeBack = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', preventSwipeBack, { passive: false });
    return () => window.removeEventListener('wheel', preventSwipeBack);
  }, []);

  // Load autosaved draft on mount
  useEffect(() => {
    // Skip if loading an existing guide for editing
    if (router.query.editGuideId) return;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.title) setTitle(draft.title);
        if (draft.pairs?.length) setManualPairs(draft.pairs);
        if (draft.inputMode === 'manual') setInputMode('manual');
      }
    } catch {}
  }, []);

  // Autosave manual guide drafts every 3 seconds
  useEffect(() => {
    if (inputMode !== 'manual') return;
    const timer = setTimeout(() => {
      const hasContent = title.trim() || manualPairs.some(p => p.term.trim() || p.definition.trim());
      if (hasContent) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
          title, pairs: manualPairs, inputMode: 'manual'
        }));
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 1500);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [title, manualPairs, inputMode]);

  // Apply card count — adjust pairs array to match
  const applyCardCount = useCallback((count) => {
    const num = parseInt(count);
    if (!num || num < 1) return;
    const clamped = Math.min(num, 100);
    setManualPairs(prev => {
      if (prev.length < clamped) {
        return [...prev, ...Array(clamped - prev.length).fill(null).map(() => ({ term: '', definition: '' }))];
      }
      return prev.slice(0, clamped);
    });
  }, []);

  // Load existing guide for editing if ?editGuideId= is in URL
  useEffect(() => {
    const editId = router.query.editGuideId;
    if (ready && editId) {
      apiFetch('/guides/' + editId).then(data => {
        if (data?.guide) {
          setTitle(data.guide.title || '');
          setInputMode('manual');
          // Parse existing Q&A pairs from study guide
          const guideText = data.guide.study_guide || '';
          const pairs = [];
          const lines = guideText.split('\n');
          let currentQ = '';
          for (const line of lines) {
            const qMatch = line.match(/^Q\d+:\s*(.+)/);
            const aMatch = line.match(/^A\d+:\s*(.+)/);
            if (qMatch) currentQ = qMatch[1].trim();
            else if (aMatch && currentQ) {
              pairs.push({ term: currentQ, definition: aMatch[1].trim() });
              currentQ = '';
            }
          }
          if (pairs.length > 0) setManualPairs(pairs);
          // Clear autosave draft since we're loading an existing guide
          localStorage.removeItem(AUTOSAVE_KEY);
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
          if (folderId && data.folders.some(f => f.id === folderId)) {
            setSelectedFolder(folderId);
          }
        }
      });
    }
  }, [ready]);

  function handlePdfSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    setPdfName(file.name);
    if (!title) setTitle(file.name.replace(/\.pdf$/i, ''));
  }

  function switchMode(mode) {
    setInputMode(mode);
    setError('');
    setPdfFile(null);
    setPdfName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function updatePair(index, field, value) {
    setManualPairs(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function addPair() {
    setManualPairs(prev => [...prev, { term: '', definition: '' }]);
  }

  function removePair(index) {
    if (manualPairs.length <= 1) return;
    setManualPairs(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');

    // Manual mode — skip AI pipeline, save directly
    if (inputMode === 'manual') {
      const validPairs = manualPairs.filter(p => p.term.trim() && p.definition.trim());
      if (validPairs.length === 0) {
        setError('Add at least one term and definition.');
        return;
      }
      setStatus('saving');
      const studyGuide = validPairs.map((p, i) => {
        let entry = `Q${i + 1}: ${p.term.trim()}\nA${i + 1}: ${p.definition.trim()}`;
        if (p.image) entry += `\n[IMG:${p.image}]`;
        return entry;
      }).join('\n');

      // Create one flashcard per Q&A pair
      const flashcards = validPairs.map(p => ({
        front: p.term.trim(),
        back: p.definition.trim()
      }));

      const body = { title: title.trim(), study_guide: studyGuide, flashcards };
      if (selectedFolder) body.folder_id = selectedFolder;

      const editId = router.query.editGuideId;
      let savedData;
      if (editId) {
        // Update existing guide
        savedData = await apiFetch('/guides/' + editId, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        savedData = await apiFetch('/guides', { method: 'POST', body: JSON.stringify(body) });
      }
      if (savedData?.guide) {
        setStatus('done');
        localStorage.removeItem(AUTOSAVE_KEY);
        router.push('/guide/' + savedData.guide.id);
      } else {
        setError('Failed to save guide.');
        setStatus('error');
      }
      return;
    }

    let finalContent = content.trim();

    if (inputMode === 'pdf') {
      if (!pdfFile) { setError('Please select a PDF file.'); return; }
      setStatus('extracting');
      const formData = new FormData();
      formData.append('file', pdfFile);
      try {
        const resp = await fetch(API + '/extract-pdf-text', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + (getToken() || '') },
          body: formData,
        });
        const data = await resp.json();
        if (!resp.ok || !data.text) {
          setError(data.detail || 'Could not extract text from PDF. Try a text-based PDF.');
          setStatus('error');
          return;
        }
        finalContent = data.text;
      } catch {
        setError('Failed to upload PDF. Please try again.');
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

    if (!ingestData?.content_id) {
      setError('Failed to process content. Please try again.');
      setStatus('error');
      return;
    }

    setStatus('generating');

    const generateData = await apiFetch('/generate', {
      method: 'POST',
      body: JSON.stringify({
        content_id: ingestData.content_id,
        notes: generateNotes,
        study_guide: true,
        flashcards: generateFlashcards
      })
    });

    if (!generateData) {
      setError('Failed to generate study materials. You may have reached your usage limit.');
      setStatus('error');
      return;
    }

    setStatus('saving');

    const body = {
      title: title.trim(),
      notes: generateData.notes || null,
      study_guide: generateData.study_guide || null,
      flashcards: generateData.flashcards || null,
    };
    if (selectedFolder) body.folder_id = selectedFolder;

    const savedData = await apiFetch('/guides', { method: 'POST', body: JSON.stringify(body) });

    if (savedData?.guide) {
      setStatus('done');
      router.push('/guide/' + savedData.guide.id);
    } else {
      setError('Failed to save guide.');
      setStatus('error');
    }
  }

  if (!ready) return null;

  const isLoading = ['extracting', 'ingesting', 'generating', 'saving'].includes(status);

  const statusMessages = {
    extracting: 'Reading PDF...',
    ingesting: 'Processing your content...',
    generating: 'AI is generating your study guide, notes, and flashcards — this may take 20-40 seconds...',
    saving: 'Saving your guide...',
  };

  const canSubmit = !isLoading && title.trim() && (
    inputMode === 'manual'
      ? manualPairs.some(p => p.term.trim() && p.definition.trim())
      : inputMode === 'pdf' ? !!pdfFile : content.trim().length >= 10
  );

  return (
    <div className="fade-in" style={{ maxWidth: 740 }}>
      <h2 style={{ marginBottom: 4 }}>Create Study Guide</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: 20 }}>
        {inputMode === 'manual'
          ? 'Add your own terms and definitions to create a custom study guide.'
          : 'Paste your notes or upload a PDF — AI will generate a study guide, notes, and flashcards automatically.'}
      </p>

      {isLoading && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 20,
          color: 'var(--accent)', fontSize: '0.9em'
        }}>
          {statusMessages[status]}
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--error-bg)', border: '1px solid var(--error)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          color: 'var(--error)', fontSize: '0.9em'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleCreate}>
        {/* Input mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
          {[['manual', 'Manual'], ['text', 'Paste Text'], ['pdf', 'Upload PDF']].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchMode(mode)}
              disabled={isLoading}
              style={{
                padding: '8px 20px', border: 'none', cursor: 'pointer',
                fontSize: '0.88em', fontWeight: 500,
                background: inputMode === mode ? 'var(--accent)' : 'var(--bg-secondary)',
                color: inputMode === mode ? 'var(--bg-deepest)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Guide Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Chapter 5: Cell Biology"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            disabled={isLoading}
            style={{ marginBottom: 0 }}
          />
        </div>

        {inputMode === 'manual' ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                Terms &amp; Definitions
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {autoSaved && (
                  <span style={{ fontSize: '0.72em', color: 'var(--accent)', opacity: 0.8 }}>Draft saved</span>
                )}
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="# of cards"
                  value={cardCount}
                  onChange={e => setCardCount(e.target.value)}
                  onBlur={() => applyCardCount(cardCount)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCardCount(cardCount))}
                  style={{
                    width: 90, padding: '5px 8px', fontSize: '0.8em',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                    borderRadius: 6, color: 'var(--text-primary)', textAlign: 'center'
                  }}
                />
              </div>
            </div>
            {manualPairs.map((pair, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                borderRadius: 8, padding: 12, position: 'relative'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8em', minWidth: 20, paddingTop: 8 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Term / Question"
                    value={pair.term}
                    onChange={e => updatePair(i, 'term', e.target.value)}
                    disabled={isLoading}
                    style={{ marginBottom: 6, width: '100%' }}
                  />
                  <input
                    type="text"
                    placeholder="Definition / Answer"
                    value={pair.definition}
                    onChange={e => updatePair(i, 'definition', e.target.value)}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  />
                  {pair.image ? (
                    <div style={{ marginTop: 6, position: 'relative', display: 'inline-block' }}>
                      <img src={pair.image} alt="Card image" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 6, border: '1px solid var(--border-default)' }} />
                      <button
                        type="button"
                        onClick={() => updatePair(i, 'image', null)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                          borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                          fontSize: '0.8em', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >&times;</button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                      fontSize: '0.78em', color: 'var(--text-muted)', cursor: 'pointer'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                      Add image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => updatePair(i, 'image', reader.result);
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                {manualPairs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePair(i)}
                    disabled={isLoading}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '1.2em', padding: '4px 8px', lineHeight: 1
                    }}
                    title="Remove"
                  >&times;</button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPair}
              disabled={isLoading}
              style={{
                width: '100%', padding: '10px', border: '2px dashed var(--border-default)',
                borderRadius: 8, background: 'transparent', color: 'var(--accent)',
                cursor: 'pointer', fontSize: '0.9em', fontWeight: 500
              }}
            >
              + Add Card
            </button>
            <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: 6 }}>
              {manualPairs.filter(p => p.term.trim() && p.definition.trim()).length} card{manualPairs.filter(p => p.term.trim() && p.definition.trim()).length !== 1 ? 's' : ''} ready
            </div>
          </div>
        ) : inputMode === 'text' ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Content * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(paste your notes, slides, or reading material)</span>
            </label>
            <textarea
              placeholder="Paste your lecture notes, textbook content, or study material here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              disabled={isLoading}
              style={{
                width: '100%', minHeight: 280, padding: '12px 14px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.9em',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                outline: 'none', transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
            />
            <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: 4 }}>
              {content.length.toLocaleString()} characters
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              PDF File * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(text-based PDFs only, max 10MB)</span>
            </label>
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              style={{
                border: '2px dashed ' + (pdfFile ? 'var(--accent)' : 'var(--border-default)'),
                borderRadius: 8, padding: '32px 20px', textAlign: 'center',
                cursor: isLoading ? 'default' : 'pointer', background: 'var(--bg-secondary)',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: '2em', marginBottom: 8 }}>📄</div>
              {pdfFile ? (
                <>
                  <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9em' }}>{pdfName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78em', marginTop: 4 }}>
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>Click to select a PDF</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78em', marginTop: 4 }}>or drag and drop</div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Save to Class (optional)
          </label>
          <select
            value={selectedFolder}
            onChange={e => setSelectedFolder(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)', borderRadius: 8,
              color: 'var(--text-primary)', fontSize: '0.9em'
            }}
          >
            <option value="">No class</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {inputMode !== 'manual' && (
          <div style={{ marginBottom: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={generateNotes}
                onChange={e => setGenerateNotes(e.target.checked)}
                disabled={isLoading}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
              Generate Notes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={generateFlashcards}
                onChange={e => setGenerateFlashcards(e.target.checked)}
                disabled={isLoading}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
              Generate Flashcards
            </label>
          </div>
        )}

        <button
          type="submit"
          className="btn"
          disabled={!canSubmit}
          style={{ padding: '12px 32px', fontSize: '1em' }}
        >
          {isLoading ? (inputMode === 'manual' ? 'Saving...' : 'Generating...') : (inputMode === 'manual' ? (router.query.editGuideId ? 'Update Study Guide' : 'Save Study Guide') : 'Generate Study Guide')}
        </button>
      </form>
    </div>
  );
}
