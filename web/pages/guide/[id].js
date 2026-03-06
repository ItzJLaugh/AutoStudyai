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
  // Chat state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMode, setChatMode] = useState('short');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (ready && id) {
      loadGuide();
      loadQuizHistory();
      // Log a read session to update streak
      apiFetch('/stats/log-session', {
        method: 'POST',
        body: JSON.stringify({ session_type: 'read', guide_id: id, duration_seconds: 0 })
      });
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

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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

  async function sendChatMessage(e) {
    e.preventDefault();
    if (!chatQuestion.trim() || chatLoading) return;
    const question = chatQuestion.trim();
    setChatQuestion('');
    setChatLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: question }]);

    const context = [guide.notes || '', guide.study_guide || ''].filter(Boolean).join('\n\n');
    const data = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ question, content: context, mode: chatMode })
    });
    const answer = data?.answer || 'No answer returned.';
    setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
    setChatLoading(false);
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
    { key: 'chat', label: 'AI Chat' },
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
      <div className="tabs" style={{ alignItems: 'flex-end' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={'tab-btn' + (activeTab === tab.key ? ' active' : '')}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6em', color: '#a78bfa', marginBottom: 3, whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            For nursing/medical students
          </span>
          <button
            className={'tab-btn' + (activeTab === 'nclex' ? ' active' : '')}
            onClick={() => setActiveTab('nclex')}
            style={{
              color: activeTab === 'nclex' ? '#fff' : '#a78bfa',
              borderColor: '#7c3aed',
              background: activeTab === 'nclex' ? '#7c3aed' : 'transparent',
            }}
          >
            NCLEX Mode
          </button>
        </div>
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
                  <span><strong>Q{pair.index}:</strong> {pair.question}</span>
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

      {activeTab === 'chat' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
            Ask questions about this study guide and get answers pulled directly from your material.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: 16 }}>
            Answers come from your captured notes and study guide — not outside sources.
          </p>

          {/* Chat history */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-subtle)',
            padding: '12px 16px', marginBottom: 16, minHeight: 120, maxHeight: 400, overflowY: 'auto'
          }}>
            {chatHistory.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', textAlign: 'center', paddingTop: 32 }}>
                Ask anything about your study guide...
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    background: msg.role === 'user' ? 'var(--accent-dark)' : 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '8px 14px',
                    maxWidth: '85%',
                    fontSize: '0.9em',
                    lineHeight: 1.5,
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '0.7em', color: 'var(--text-muted)', marginTop: 3 }}>
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                </div>
              ))
            )}
            {chatLoading && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginTop: 8 }}>
                Searching your notes...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[
              { value: 'short', label: 'Quick' },
              { value: 'detailed', label: 'Detailed' },
              { value: 'example', label: '+ Example' },
            ].map(m => (
              <button
                key={m.value}
                onClick={() => setChatMode(m.value)}
                style={{
                  fontSize: '0.78em', padding: '4px 12px', borderRadius: 20,
                  border: '1px solid var(--border-default)',
                  background: chatMode === m.value ? 'var(--accent-glow)' : 'transparent',
                  color: chatMode === m.value ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Ask a question about this guide..."
              value={chatQuestion}
              onChange={e => setChatQuestion(e.target.value)}
              disabled={chatLoading}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button type="submit" className="btn" disabled={chatLoading || !chatQuestion.trim()} style={{ whiteSpace: 'nowrap' }}>
              Send
            </button>
          </form>
        </div>
      )}

      {activeTab === 'nclex' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Practice with AI-generated NCLEX-style clinical scenario questions based on your study material.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: 20 }}>
            Includes Multiple Choice and Select All That Apply (SATA) with rationales for each question.
          </p>
          <button className="btn" onClick={() => router.push('/nclex/' + id)}>
            Start NCLEX Practice
          </button>
        </div>
      )}
    </div>
  );
}
