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
  const [guideContent, setGuideContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && guideId) loadQuiz();
  }, [ready, guideId]);

  async function loadQuiz() {
    setLoading(true);
    setError('');
    try {
      const [quizData, guideData] = await Promise.all([
        apiFetch('/quiz/' + guideId + '/generate'),
        apiFetch('/guides/' + guideId),
      ]);
      if (quizData?.questions) {
        setQuestions(quizData.questions);
        setGuideContent(guideData?.guide?.study_guide || '');
      } else {
        setError('Failed to generate quiz. Make sure the guide has Q&A content.');
      }
    } catch {
      setError('Failed to load quiz.');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--accent)', fontSize: '1.1em', marginBottom: 8 }}>Generating your quiz...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>AI is creating answer choices. This may take a moment.</div>
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
      <h2 style={{ marginTop: 8, marginBottom: 20 }}>Quiz</h2>
      <QuizMode questions={questions} guideId={guideId} guideContent={guideContent} />
    </div>
  );
}
