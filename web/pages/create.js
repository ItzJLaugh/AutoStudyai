import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { useRequireAuth } from '../lib/auth';

export default function CreateGuidePage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [generateNotes, setGenerateNotes] = useState(true);
  const [generateFlashcards, setGenerateFlashcards] = useState(true);
  const [status, setStatus] = useState(''); // 'idle' | 'ingesting' | 'generating' | 'saving' | 'done' | 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready) {
      apiFetch('/folders').then(data => {
        if (data?.folders) setFolders(data.folders);
      });
    }
  }, [ready]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || content.trim().length < 10) return;
    setError('');
    setStatus('ingesting');

    // Step 1: Ingest the content
    const ingestData = await apiFetch('/ingest', {
      method: 'POST',
      body: JSON.stringify({
        content: content.trim(),
        page_url: '',
        content_type: 'webpage'
      })
    });

    if (!ingestData?.content_id) {
      setError('Failed to process content. Please try again.');
      setStatus('error');
      return;
    }

    setStatus('generating');

    // Step 2: Generate study materials
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

    // Step 3: Save the guide
    const body = {
      title: title.trim(),
      notes: generateData.notes || null,
      study_guide: generateData.study_guide || null,
      flashcards: generateData.flashcards || null,
    };
    if (selectedFolder) body.folder_id = selectedFolder;

    const savedData = await apiFetch('/guides', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (savedData?.guide) {
      setStatus('done');
      router.push('/guide/' + savedData.guide.id);
    } else {
      setError('Failed to save guide.');
      setStatus('error');
    }
  }

  if (!ready) return null;

  const isLoading = ['ingesting', 'generating', 'saving'].includes(status);

  const statusMessages = {
    ingesting: 'Processing your content...',
    generating: 'AI is generating your study guide, notes, and flashcards — this may take 20-40 seconds...',
    saving: 'Saving your guide...',
  };

  return (
    <div className="fade-in" style={{ maxWidth: 740 }}>
      <h2 style={{ marginBottom: 4 }}>Create Study Guide</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: 24 }}>
        Paste your lecture notes, textbook excerpts, or any course content — AI will generate a study guide, notes, and flashcards automatically.
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

        <button
          type="submit"
          className="btn"
          disabled={isLoading || !title.trim() || content.trim().length < 10}
          style={{ padding: '12px 32px', fontSize: '1em' }}
        >
          {isLoading ? 'Generating...' : 'Generate Study Guide'}
        </button>
      </form>
    </div>
  );
}
