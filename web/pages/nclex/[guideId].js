import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';
import NCLEXQuizMode from '../../components/NCLEXQuizMode';

export default function NCLEXPage() {
  const router = useRouter();
  const { guideId } = router.query;
  const { ready } = useRequireAuth();
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [guideTitle, setGuideTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    if (ready && guideId) {
      loadNCLEX();
      loadFolders();
    }
  }, [ready, guideId]);

  async function loadNCLEX() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/nclex/' + guideId + '/generate');
      if (data?.questions?.length) {
        setQuestions(data.questions);
        // Pre-fill save title using source guide
        const guideData = await apiFetch('/guides/' + guideId);
        if (guideData?.guide?.title) {
          setGuideTitle('NCLEX: ' + guideData.guide.title);
        }
      } else {
        setError('Failed to generate NCLEX questions. Make sure the guide has study content.');
      }
    } catch {
      setError('Failed to load NCLEX questions.');
    }
    setLoading(false);
  }

  async function loadFolders() {
    const data = await apiFetch('/folders');
    if (data?.folders) setFolders(data.folders);
  }

  async function saveAsGuide() {
    if (!questions || !guideTitle.trim()) return;
    setSaving(true);

    // Format NCLEX questions as a study guide (Q&A format)
    const studyGuideText = questions.map((q, i) => {
      const correctLetters = (q.correct_indices || []).map(idx => String.fromCharCode(65 + idx)).join(', ');
      const optionsList = (q.options || []).map((opt, idx) => `  ${String.fromCharCode(65 + idx)}. ${opt}`).join('\n');
      return `Q${i + 1}: ${q.stem}\n${optionsList}\nAnswer: ${correctLetters}\nRationale: ${q.rationale || ''}`;
    }).join('\n\n');

    const body = {
      title: guideTitle.trim(),
      study_guide: studyGuideText,
      notes: `NCLEX-style practice questions saved from your study guide. ${questions.length} questions total.`,
    };
    if (selectedFolder) body.folder_id = selectedFolder;

    const data = await apiFetch('/guides', { method: 'POST', body: JSON.stringify(body) });
    setSaving(false);
    if (data?.guide) {
      setSaveSuccess(true);
      setShowSaveModal(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--accent)', fontSize: '1.1em', marginBottom: 8 }}>Generating NCLEX-style questions...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>AI is writing one clinical scenario per concept in your study guide. This may take 30–60 seconds.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>
        <button className="btn-outline" onClick={() => router.back()}>Back to Guide</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <a href="#" onClick={e => { e.preventDefault(); router.back(); }} style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
        &larr; Back to Guide
      </a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
        <h2>NCLEX Practice</h2>
        <button
          className="btn-outline"
          onClick={() => setShowSaveModal(true)}
          style={{ fontSize: '0.85em' }}
        >
          Save as Study Guide
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: 20 }}>
        Clinical scenario questions with rationales. Includes MCQ and Select All That Apply.
      </p>

      {saveSuccess && (
        <div style={{
          background: 'var(--success-bg)', border: '1px solid var(--success)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          color: 'var(--success)', fontSize: '0.9em'
        }}>
          NCLEX questions saved as a study guide!
        </div>
      )}

      <NCLEXQuizMode questions={questions} guideId={guideId} />

      {/* Save modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
            borderRadius: 12, padding: 28, maxWidth: 440, width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: 16 }}>Save NCLEX Questions as Study Guide</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Title
              </label>
              <input
                type="text"
                value={guideTitle}
                onChange={e => setGuideTitle(e.target.value)}
                placeholder="Guide title..."
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Save to Class (optional)
              </label>
              <select
                value={selectedFolder}
                onChange={e => setSelectedFolder(e.target.value)}
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
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-gray" onClick={() => setShowSaveModal(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn" onClick={saveAsGuide} disabled={saving || !guideTitle.trim()}>
                {saving ? 'Saving...' : 'Save Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
