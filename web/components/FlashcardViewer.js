import { useState, useRef, useMemo } from 'react';
import { apiFetch } from '../lib/api';

// SM-2 spaced repetition algorithm
function sm2Update(data, quality) {
  // quality: 0=Again, 1=Hard, 2=Good, 3=Easy
  let { ef = 2.5, repetitions = 0, interval = 1 } = data || {};
  const q = [0, 3, 4, 5][quality];

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ef);
    repetitions += 1;
  }

  ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  const d = new Date();
  d.setDate(d.getDate() + interval);
  const next_review = d.toISOString().split('T')[0];

  return { ef, repetitions, interval, next_review };
}

function isDue(srsData) {
  if (!srsData?.next_review) return true;
  return srsData.next_review <= new Date().toISOString().split('T')[0];
}

export default function FlashcardViewer({ flashcards, guideId, initialSrs = {}, onComplete }) {
  const orderedIndices = useMemo(() => {
    return flashcards.map((_, i) => i).sort((a, b) => {
      const dueA = isDue(initialSrs[a]);
      const dueB = isDue(initialSrs[b]);
      if (dueA && !dueB) return -1;
      if (!dueA && dueB) return 1;
      const dateA = initialSrs[a]?.next_review || '0';
      const dateB = initialSrs[b]?.next_review || '0';
      return dateA.localeCompare(dateB);
    });
  }, []);

  const [currentPos, setCurrentPos] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [srs, setSrs] = useState(initialSrs);
  const [done, setDone] = useState(false);
  const startTime = useRef(Date.now());

  function flip() { setIsFlipped(f => !f); }

  function rate(quality) {
    const idx = orderedIndices[currentPos];
    const newSrs = { ...srs, [idx]: sm2Update(srs[idx], quality) };
    setSrs(newSrs);

    const newKnown = quality >= 2 ? [...known, idx] : known;
    const newUnknown = quality < 2 ? [...unknown, idx] : unknown;
    if (quality >= 2) setKnown(newKnown);
    else setUnknown(newUnknown);

    setIsFlipped(false);
    if (currentPos + 1 >= orderedIndices.length) {
      finish(newKnown, newUnknown, newSrs);
    } else {
      setCurrentPos(currentPos + 1);
    }
  }

  async function finish(k, u, finalSrs) {
    setDone(true);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    if (guideId) {
      await Promise.all([
        apiFetch('/guides/' + guideId + '/flashcard-progress', {
          method: 'PATCH',
          body: JSON.stringify({ known: k, unknown: u, last_studied: new Date().toISOString(), srs: finalSrs })
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

  function studyAgain() {
    setDone(false);
    setCurrentPos(0);
    setKnown([]);
    setUnknown([]);
    setIsFlipped(false);
    startTime.current = Date.now();
  }

  if (done) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dueCount = Object.values(srs).filter(s => s?.next_review && s.next_review <= tomorrow).length;

    return (
      <div className="completion-card">
        <div className="completion-icon">&#127881;</div>
        <div className="completion-title">Session Complete!</div>
        <div className="completion-stat">{known.length}/{flashcards.length}</div>
        <div className="completion-detail">cards correct</div>
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar-container" style={{ height: 8 }}>
            <div className="progress-bar-fill green" style={{ width: (known.length / flashcards.length * 100) + '%' }} />
          </div>
        </div>
        {dueCount > 0 && (
          <div style={{ marginTop: 12, fontSize: '0.82em', color: 'var(--text-muted)' }}>
            {dueCount} card{dueCount !== 1 ? 's' : ''} scheduled for review tomorrow
          </div>
        )}
        <div className="completion-actions">
          {unknown.length > 0 && (
            <button className="btn" onClick={studyAgain}>Study Missed Cards</button>
          )}
          <button className="btn-outline" onClick={() => window.history.back()}>Done</button>
        </div>
      </div>
    );
  }

  const idx = orderedIndices[currentPos];
  const card = flashcards[idx];
  const cardIsDue = isDue(initialSrs[idx]);
  const progress = currentPos / orderedIndices.length;

  return (
    <div>
      <div className="progress-bar-container" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: (progress * 100) + '%' }} />
      </div>
      <div className="flashcard-progress" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Card {currentPos + 1} of {orderedIndices.length}</span>
        {!cardIsDue && (
          <span style={{ fontSize: '0.75em', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12 }}>
            preview
          </span>
        )}
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
        <div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78em', marginBottom: 8 }}>
            How well did you know this?
          </p>
          <div className="flashcard-actions" style={{ gap: 8 }}>
            <button className="fc-btn fc-btn-again" onClick={() => rate(0)}>Again</button>
            <button
              className="fc-btn"
              style={{ background: 'rgba(255,152,0,0.12)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)' }}
              onClick={() => rate(1)}
            >Hard</button>
            <button className="fc-btn fc-btn-know" onClick={() => rate(2)}>Good</button>
            <button
              className="fc-btn"
              style={{ background: 'rgba(79,195,247,0.12)', color: 'var(--accent)', border: '1px solid rgba(79,195,247,0.3)' }}
              onClick={() => rate(3)}
            >Easy</button>
          </div>
        </div>
      )}
    </div>
  );
}
