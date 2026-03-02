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

  useEffect(() => {
    if (ready && guideId) loadNCLEX();
  }, [ready, guideId]);

  async function loadNCLEX() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/nclex/' + guideId + '/generate');
      if (data?.questions?.length) {
        setQuestions(data.questions);
      } else {
        setError('Failed to generate NCLEX questions. Make sure the guide has study content.');
      }
    } catch {
      setError('Failed to load NCLEX questions.');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--accent)', fontSize: '1.1em', marginBottom: 8 }}>Generating NCLEX-style questions...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>AI is writing clinical scenarios. This may take 10–15 seconds.</div>
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
      <h2 style={{ marginTop: 8, marginBottom: 4 }}>NCLEX Practice</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: 20 }}>
        Clinical scenario questions with rationales. Includes MCQ and Select All That Apply.
      </p>
      <NCLEXQuizMode questions={questions} guideId={guideId} />
    </div>
  );
}
