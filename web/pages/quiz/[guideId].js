import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';
import QuizMode from '../../components/QuizMode';

export default function QuizPage() {
  const router = useRouter();
  const { guideId } = router.query;
  const { ready } = useRequireAuth();
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [quizVersion, setQuizVersion] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && guideId) loadQuiz();
  }, [ready, guideId]);

  async function loadQuiz(regenerate = false) {
    if (regenerate) setRegenerating(true);
    else setLoading(true);
    setError('');
    try {
      const quizData = await apiFetch(
        '/quiz/' + guideId + (regenerate ? '/regenerate' : '/generate'),
        regenerate ? { method: 'POST' } : {},
      );
      if (quizData?.questions) {
        setQuestions(quizData.questions);
        if (regenerate) setQuizVersion(version => version + 1);
      } else {
        setError(regenerate ? 'Could not regenerate the questions.' : 'Failed to generate quiz. Make sure the guide has Q&A content.');
      }
    } catch {
      setError(regenerate ? 'Could not regenerate the questions.' : 'Failed to load quiz.');
    }
    setLoading(false);
    setRegenerating(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--accent)', fontSize: '1.1em', marginBottom: 8 }}>Preparing your Retain quiz...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Preparing answer choices from this study guide.</div>
      </div>
    );
  }

  if (error && !questions) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>
        <button className="btn-outline" onClick={() => router.back()}>Back to Guide</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="retain-page-header">
        <div>
          <a href="#" onClick={e => { e.preventDefault(); router.back(); }} style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
            &larr; Back to Guide
          </a>
          <h2>Retain</h2>
        </div>
        <button className="btn-outline" onClick={() => loadQuiz(true)} disabled={regenerating}>
          {regenerating ? 'Regenerating...' : 'Regenerate questions'}
        </button>
      </div>
      {error && <div className="retain-action-error" role="alert">{error}</div>}
      <QuizMode key={quizVersion} questions={questions} guideId={guideId} />
    </div>
  );
}
