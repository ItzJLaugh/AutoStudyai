import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../../lib/api';
import { useRequireAuth } from '../../lib/auth';
import { parseQAPairs, parseNotes, formatDate } from '../../lib/formatters';
import FlashcardViewer from '../../components/FlashcardViewer';
import QuizMode from '../../components/QuizMode';

export default function GuidePage() {
  const router = useRouter();
  const { id } = router.query;
  const { ready } = useRequireAuth();
  const [guide, setGuide] = useState(null);
  const [activeTab, setActiveTab] = useState('guide');
  const [revealedQs, setRevealedQs] = useState(new Set());
  const [quizHistory, setQuizHistory] = useState([]);
  const prevRevealed = useRef(0);

  useEffect(() => {
    if (ready && id) {
      loadGuide();
      loadQuizHistory();
    }
  }, [ready, id]);

  // Save read progress when revealed count changes
  useEffect(() => {
    if (!guide || !id) return;
    const qaPairs = parseQAPairs(guide.study_guide);
    if (qaPairs.length === 0) return;
    const progress = revealedQs.size / qaPairs.length;
    if (revealedQs.size > prevRevealed.current) {
      prevRevealed.current = revealedQs.size;
      apiFetch('/guides/' + id + '/read-progress', {
        method: 'PATCH',
        body: JSON.stringify({ read_progress: progress })
      });
    }
  }, [revealedQs]);

  async function loadGuide() {
    const data = await apiFetch('/guides/' + id);
    if (data?.guide) setGuide(data.guide);
  }

  async function loadQuizHistory() {
    const data = await apiFetch('/quiz/' + id + '/history');
    if (data?.attempts) setQuizHistory(data.attempts);
  }

  async function toggleBookmark() {
    const data = await apiFetch('/guides/' + id + '/bookmark', { method: 'PATCH' });
    if (data) setGuide(prev => ({ ...prev, is_bookmarked: data.is_bookmarked }));
  }

  function toggleQA(index) {
    setRevealedQs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (!guide) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const qaPairs = parseQAPairs(guide.study_guide);
  const notes = parseNotes(guide.notes);
  const flashcards = guide.flashcards || [];
  const fcProgress = guide.flashcard_progress || {};
  const readPct = Math.round((guide.read_progress || 0) * 100);
  const fcPct = flashcards.length > 0 && fcProgress.known
    ? Math.round((fcProgress.known.length / flashcards.length) * 100) : 0;
  const bestQuiz = quizHistory.length > 0 ? Math.max(...quizHistory.map(a => a.score)) : null;

  const tabs = [
    { key: 'guide', label: 'Study Guide' },
    { key: 'notes', label: 'Notes' },
    { key: 'flashcards', label: `Flashcards (${flashcards.length})` },
    { key: 'quiz', label: 'Quiz' },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <a href="#" onClick={e => { e.preventDefault(); router.back(); }} style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
            &larr; Back
          </a>
          <h2 style={{ marginTop: 8 }}>{guide.title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginTop: 4 }}>
            {guide.source_url && <span>{guide.source_url.substring(0, 60)}{guide.source_url.length > 60 ? '...' : ''} | </span>}
            <span className="timestamp">{formatDate(guide.created_at)}</span>
          </p>
        </div>
        <button className={'bookmark-btn' + (guide.is_bookmarked ? ' active' : '')} onClick={toggleBookmark} style={{ fontSize: '1.6em', marginTop: 8 }}>
          {guide.is_bookmarked ? '\u2605' : '\u2606'}
        </button>
      </div>

      {/* Progress overview */}
      <div className="guide-progress">
        <div className="guide-progress-item">
          <div className="guide-progress-label">Read Progress</div>
          <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: readPct + '%' }} /></div>
          <div className="guide-progress-value" style={{ marginTop: 4 }}>{readPct}%</div>
        </div>
        <div className="guide-progress-item">
          <div className="guide-progress-label">Flashcard Mastery</div>
          <div className="progress-bar-container"><div className="progress-bar-fill green" style={{ width: fcPct + '%' }} /></div>
          <div className="guide-progress-value" style={{ marginTop: 4 }}>{fcPct}%</div>
        </div>
        <div className="guide-progress-item">
          <div className="guide-progress-label">Best Quiz Score</div>
          <div className="guide-progress-value" style={{ fontSize: '1.2em' }}>{bestQuiz !== null ? bestQuiz + '%' : '--'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={'tab-btn' + (activeTab === tab.key ? ' active' : '')}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'guide' && (
        <div>
          {qaPairs.length === 0 ? (
            <div className="guide-content">{guide.study_guide || 'No study guide content.'}</div>
          ) : (
            qaPairs.map((pair, i) => (
              <div key={i} className="qa-item">
                <div className="qa-question" onClick={() => toggleQA(i)}>
                  <span>Q{pair.index}: {pair.question}</span>
                  <span className={'qa-chevron' + (revealedQs.has(i) ? ' open' : '')}>{'\u25BC'}</span>
                </div>
                <div className={'qa-answer' + (revealedQs.has(i) ? ' visible' : '')}>
                  {pair.answer}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="guide-content">
          {notes.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>No notes available.</span>
          ) : (
            <ul className="notes-list">
              {notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'flashcards' && (
        <div>
          {flashcards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">&#127183;</div>
              No flashcards for this guide.
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                {flashcards.length} flashcards available.
                {fcProgress.known && <span> {fcProgress.known.length} mastered.</span>}
              </p>
              <button className="btn" onClick={() => router.push('/flashcards/study?guideId=' + id)}>
                Start Study Session
              </button>
              <div style={{ marginTop: 20 }}>
                {flashcards.slice(0, 5).map((fc, i) => (
                  <div key={i} className="fc-hub-card">
                    <span style={{ color: 'var(--text-primary)' }}>{fc.front}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Card {i + 1}</span>
                  </div>
                ))}
                {flashcards.length > 5 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginTop: 8 }}>
                    +{flashcards.length - 5} more cards
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quiz' && (
        <div>
          {qaPairs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">&#128221;</div>
              No Q&A pairs to generate a quiz from.
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Quiz generated from {qaPairs.length} questions in your study guide.
              </p>
              <button className="btn" onClick={() => router.push('/quiz/' + id)}>
                Start Quiz
              </button>
              {quizHistory.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: '1em', marginBottom: 10, color: 'var(--text-secondary)' }}>Past Attempts</h3>
                  {quizHistory.map((a, i) => (
                    <div key={i} className="fc-hub-card">
                      <span style={{ color: 'var(--text-primary)' }}>Score: {a.score}%</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>
                        {a.correct_answers}/{a.total_questions} correct | {formatDate(a.completed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
