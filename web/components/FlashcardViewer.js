import { useState, useRef } from 'react';
import { apiFetch } from '../lib/api';

export default function FlashcardViewer({ flashcards, guideId, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [done, setDone] = useState(false);
  const startTime = useRef(Date.now());

  function flip() { setIsFlipped(!isFlipped); }

  function markKnown() {
    const newKnown = [...known, currentIndex];
    setKnown(newKnown);
    advance(newKnown, unknown);
  }

  function markUnknown() {
    const newUnknown = [...unknown, currentIndex];
    setUnknown(newUnknown);
    advance(known, newUnknown);
  }

  function advance(k, u) {
    setIsFlipped(false);
    const seen = new Set([...k, ...u]);
    if (seen.size >= flashcards.length) {
      finish(k, u);
      return;
    }
    for (let i = currentIndex + 1; i < flashcards.length; i++) {
      if (!seen.has(i)) { setCurrentIndex(i); return; }
    }
    for (let i = 0; i < currentIndex; i++) {
      if (!seen.has(i)) { setCurrentIndex(i); return; }
    }
  }

  async function finish(k, u) {
    setDone(true);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);

    if (guideId) {
      await Promise.all([
        apiFetch('/guides/' + guideId + '/flashcard-progress', {
          method: 'PATCH',
          body: JSON.stringify({ known: k, unknown: u, last_studied: new Date().toISOString() })
        }),
        apiFetch('/stats/log-session', {
          method: 'POST',
          body: JSON.stringify({
            guide_id: guideId,
            session_type: 'flashcard',
            duration_seconds: elapsed,
            metadata: { cards_studied: flashcards.length, cards_correct: k.length }
          })
        })
      ]);
    }
    if (onComplete) onComplete({ known: k, unknown: u });
  }

  function studyUnknown() {
    setDone(false);
    setCurrentIndex(unknown[0] || 0);
    setKnown([]);
    setUnknown([]);
    startTime.current = Date.now();
  }

  if (done) {
    return (
      <div className="completion-card">
        <div className="completion-icon">&#127881;</div>
        <div className="completion-title">Session Complete!</div>
        <div className="completion-stat">{known.length}/{flashcards.length}</div>
        <div className="completion-detail">cards mastered</div>
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar-container" style={{ height: 8 }}>
            <div className="progress-bar-fill green" style={{ width: (known.length / flashcards.length * 100) + '%' }} />
          </div>
        </div>
        <div className="completion-actions">
          {unknown.length > 0 && (
            <button className="btn" onClick={studyUnknown}>
              Study {unknown.length} Missed Cards
            </button>
          )}
          <button className="btn-outline" onClick={() => window.history.back()}>Done</button>
        </div>
      </div>
    );
  }

  const card = flashcards[currentIndex];
  const progress = (known.length + unknown.length) / flashcards.length;

  return (
    <div>
      <div className="progress-bar-container" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: (progress * 100) + '%' }} />
      </div>
      <div className="flashcard-progress">
        Card {known.length + unknown.length + 1} of {flashcards.length}
      </div>

      <div className="flashcard-container" onClick={flip}>
        <div className={'flashcard-inner' + (isFlipped ? ' flipped' : '')}>
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-label">Question</div>
            {card.front}
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-label">Answer</div>
            {card.back}
          </div>
        </div>
      </div>

      {!isFlipped ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85em', marginTop: 12 }}>
          Click card to reveal answer
        </p>
      ) : (
        <div className="flashcard-actions">
          <button className="fc-btn fc-btn-again" onClick={markUnknown}>Study Again</button>
          <button className="fc-btn fc-btn-know" onClick={markKnown}>Got It</button>
        </div>
      )}
    </div>
  );
}
