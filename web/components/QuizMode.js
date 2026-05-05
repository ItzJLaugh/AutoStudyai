import { useState } from 'react';
import { apiFetch } from '../lib/api';

// Retain mode learning system:
// Phase 1 — all questions shown once. Correct → mastered. Wrong → review queue.
// Phase 2 — review queue shown once more. Correct or wrong → done (max 2 attempts).

export default function QuizMode({ questions, guideId, guideContent, onComplete }) {
  const total = questions.length;

  // deck of original indices for phase 1
  const [phase, setPhase] = useState('learn'); // 'learn' | 'review' | 'done'
  const [learnIndex, setLearnIndex] = useState(0);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [allAnswers, setAllAnswers] = useState([]);
  const [score, setScore] = useState(null);

  // Explanation feature state
  const [chatbotReady, setChatbotReady] = useState(false);
  const [explanationStage, setExplanationStage] = useState(null); // null | 'creating' | 'assigning' | 'formulating' | 'done'
  const [explanationText, setExplanationText] = useState('');

  const currentQ = phase === 'learn'
    ? questions[learnIndex]
    : phase === 'review'
      ? questions[reviewQueue[reviewIndex]]
      : null;

  const currentOriginalIndex = phase === 'learn'
    ? learnIndex
    : reviewQueue[reviewIndex];

  function selectOption(i) {
    if (answered || !currentQ) return;
    setSelected(i);
    setAnswered(true);

    const isCorrect = i === currentQ.correct_index;
    const newAnswer = {
      question_index: currentOriginalIndex,
      selected_index: i,
      is_correct: isCorrect,
    };
    setAllAnswers([...allAnswers, newAnswer]);
  }

  function advance() {
    const lastAnswer = allAnswers[allAnswers.length - 1];
    const isCorrect = lastAnswer ? lastAnswer.is_correct : false;
    const updatedAnswers = allAnswers;

    // Reset per-question UI state
    setExplanationStage(null);
    setExplanationText('');

    if (phase === 'learn') {
      const newMastered = isCorrect ? masteredCount + 1 : masteredCount;
      const newReviewQueue = isCorrect ? reviewQueue : [...reviewQueue, learnIndex];
      setMasteredCount(newMastered);

      const nextLearnIndex = learnIndex + 1;
      if (nextLearnIndex < total) {
        setReviewQueue(newReviewQueue);
        setLearnIndex(nextLearnIndex);
        setSelected(null);
        setAnswered(false);
      } else {
        if (newReviewQueue.length > 0) {
          setReviewQueue(newReviewQueue);
          setPhase('review');
          setReviewIndex(0);
        } else {
          finishSession(updatedAnswers);
        }
        setSelected(null);
        setAnswered(false);
      }
    } else {
      if (isCorrect) setMasteredCount(m => m + 1);
      const nextReviewIndex = reviewIndex + 1;
      if (nextReviewIndex < reviewQueue.length) {
        setReviewIndex(nextReviewIndex);
      } else {
        finishSession(updatedAnswers);
      }
      setSelected(null);
      setAnswered(false);
    }
  }

  async function requestExplanation() {
    if (!currentQ || selected === null) return;
    if (explanationStage && explanationStage !== 'done') return; // already in flight

    try {
      if (!chatbotReady) {
        setExplanationStage('creating');
        await new Promise(r => setTimeout(r, 800));
        setExplanationStage('assigning');
        await new Promise(r => setTimeout(r, 800));
        setChatbotReady(true);
      }
      setExplanationStage('formulating');

      const correctAnswer = currentQ.options[currentQ.correct_index];
      const userAnswer = currentQ.options[selected];
      const question = `For the question: "${currentQ.question}"\nThe correct answer is: "${correctAnswer}"\nThe student chose: "${userAnswer}"\nIn 2-3 sentences, explain why the correct answer is right and why the student's choice is wrong, based only on the study guide content.`;

      const data = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          question,
          content: guideContent || '',
          mode: 'detailed',
        }),
      });

      setExplanationText(data?.answer || 'No explanation available.');
      setExplanationStage('done');
    } catch {
      setExplanationText('Could not load an explanation. Please try again.');
      setExplanationStage('done');
    }
  }

  async function finishSession(finalAnswers) {
    setPhase('done');
    const data = await apiFetch('/quiz/' + guideId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ answers: finalAnswers }),
    });
    setScore(data);
    if (onComplete) onComplete(data);
  }

  function restart() {
    setPhase('learn');
    setLearnIndex(0);
    setReviewQueue([]);
    setReviewIndex(0);
    setMasteredCount(0);
    setSelected(null);
    setAnswered(false);
    setAllAnswers([]);
    setScore(null);
    setExplanationStage(null);
    setExplanationText('');
  }

  // Results screen
  if (phase === 'done') {
    return (
      <div className="quiz-result">
        <div className="quiz-score">{score ? score.score : masteredCount > 0 ? Math.round((masteredCount / total) * 100) : 0}%</div>
        <div className="quiz-score-label">Retain Score</div>
        <div className="quiz-breakdown">
          {masteredCount} of {total} mastered
        </div>
        {reviewQueue.length === 0 && (
          <div style={{ marginTop: 8, fontSize: '0.85em', color: 'var(--accent)' }}>
            Perfect — mastered all on first attempt!
          </div>
        )}
        <div className="completion-actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={restart}>Retry</button>
          <button className="btn-outline" onClick={() => window.history.back()}>Back to Guide</button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const progressPct = Math.round((masteredCount / total) * 100);
  const isCorrectAnswer = answered && selected === currentQ.correct_index;
  const isWrongAnswer = answered && selected !== currentQ.correct_index;

  function optionClass(i) {
    if (!answered) return 'quiz-option' + (selected === i ? ' selected' : '');
    if (i === currentQ.correct_index) {
      return 'quiz-option ' + (isCorrectAnswer ? 'correct-shine' : 'correct-glow');
    }
    if (i === selected) return 'quiz-option wrong-shake';
    return 'quiz-option disabled';
  }

  const isReview = phase === 'review';

  const stageMessage = {
    creating: '🤖 Chatbot being created...',
    assigning: '📚 Assigning to study guide...',
    formulating: '💬 Formulating explanation...',
  }[explanationStage];

  return (
    <div className="quiz-question-card">
      <div className="retain-status-bar">
        <span className="retain-mastered">{masteredCount} / {total} mastered</span>
        {isReview && (
          <span className="retain-review-badge">Review: {reviewQueue.length - reviewIndex} left</span>
        )}
      </div>
      <div className="progress-bar-container" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: progressPct + '%' }} />
      </div>
      {isReview && (
        <div className="retain-review-label">Reviewing — get it right this time!</div>
      )}
      <div className="quiz-question-text">{currentQ.question}</div>
      {currentQ.options.map((opt, i) => (
        <button key={i} className={optionClass(i)} onClick={() => selectOption(i)}>
          {opt}
        </button>
      ))}

      {isWrongAnswer && explanationStage === null && (
        <button className="quiz-explanation-btn" onClick={requestExplanation}>
          Explanation
        </button>
      )}

      {stageMessage && explanationStage !== 'done' && (
        <div className="quiz-explanation-stage">{stageMessage}</div>
      )}

      {explanationStage === 'done' && explanationText && (
        <div className="quiz-explanation-panel">{explanationText}</div>
      )}

      {answered && (
        <button className="quiz-gotit-btn" onClick={advance}>
          Got it!
        </button>
      )}
    </div>
  );
}
