import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function NCLEXQuizMode({ questions, guideId, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);       // MCQ: selected index (int)
  const [sataSelected, setSataSelected] = useState([]); // SATA: array of selected indices
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(null);

  const q = questions[currentIndex];
  const isSata = q.type === 'sata';

  function toggleSata(i) {
    if (answered) return;
    setSataSelected(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }

  function submitSata() {
    if (answered || sataSelected.length === 0) return;
    const correctSet = new Set(q.correct_indices);
    const selectedSet = new Set(sataSelected);
    const isCorrect =
      correctSet.size === selectedSet.size &&
      [...correctSet].every(i => selectedSet.has(i));

    const newAnswers = [...answers, {
      question_index: currentIndex,
      selected_indices: sataSelected,
      is_correct: isCorrect
    }];
    setAnswers(newAnswers);
    setAnswered(true);

    if (currentIndex === questions.length - 1) {
      submitQuiz(newAnswers);
    }
  }

  function selectMcq(i) {
    if (answered) return;
    setSelected(i);
    const isCorrect = q.correct_indices.includes(i);
    const newAnswers = [...answers, {
      question_index: currentIndex,
      selected_indices: [i],
      is_correct: isCorrect
    }];
    setAnswers(newAnswers);
    setAnswered(true);

    if (currentIndex === questions.length - 1) {
      submitQuiz(newAnswers);
    }
  }

  function nextQuestion() {
    setCurrentIndex(currentIndex + 1);
    setSelected(null);
    setSataSelected([]);
    setAnswered(false);
  }

  async function submitQuiz(finalAnswers) {
    const data = await apiFetch('/nclex/' + guideId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ answers: finalAnswers })
    });
    setScore(data);
    setDone(true);
    if (onComplete) onComplete(data);
  }

  function retake() {
    setCurrentIndex(0);
    setSelected(null);
    setSataSelected([]);
    setAnswered(false);
    setAnswers([]);
    setDone(false);
    setScore(null);
  }

  if (done && score) {
    return (
      <div className="quiz-result">
        <div className="quiz-score">{score.score}%</div>
        <div className="quiz-score-label">NCLEX Practice Score</div>
        <div className="quiz-breakdown">{score.correct} out of {score.total} correct</div>
        <div className="completion-actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={retake}>Retake</button>
          <button className="btn-outline" onClick={() => window.history.back()}>Back to Guide</button>
        </div>
      </div>
    );
  }

  function mcqOptionClass(i) {
    if (!answered) return 'quiz-option' + (selected === i ? ' selected' : '');
    if (q.correct_indices.includes(i)) return 'quiz-option correct';
    if (i === selected) return 'quiz-option wrong';
    return 'quiz-option disabled';
  }

  function sataOptionClass(i) {
    if (!answered) return 'nclex-sata-checkbox' + (sataSelected.includes(i) ? ' selected' : '');
    const wasSelected = sataSelected.includes(i);
    const isCorrect = q.correct_indices.includes(i);
    if (isCorrect && wasSelected) return 'nclex-sata-checkbox correct';
    if (!isCorrect && wasSelected) return 'nclex-sata-checkbox wrong';
    if (isCorrect && !wasSelected) return 'nclex-sata-checkbox missed';
    return 'nclex-sata-checkbox disabled';
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="quiz-question-card">
      <div className="quiz-counter">Question {currentIndex + 1} of {questions.length}</div>
      <div className="progress-bar-container" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: ((currentIndex / questions.length) * 100) + '%' }} />
      </div>

      <div className="nclex-type-badge">{isSata ? 'Select All That Apply' : 'Multiple Choice'}</div>
      <div className="quiz-question-text">{q.stem}</div>

      {isSata ? (
        <>
          {q.options.map((opt, i) => (
            <label key={i} className={sataOptionClass(i)} onClick={() => !answered && toggleSata(i)}>
              <input
                type="checkbox"
                checked={sataSelected.includes(i)}
                onChange={() => toggleSata(i)}
                disabled={answered}
              />
              {opt}
            </label>
          ))}
          {!answered && (
            <button
              className="btn"
              style={{ marginTop: 8 }}
              onClick={submitSata}
              disabled={sataSelected.length === 0}
            >
              Submit Answer
            </button>
          )}
        </>
      ) : (
        q.options.map((opt, i) => (
          <button key={i} className={mcqOptionClass(i)} onClick={() => selectMcq(i)}>
            {opt}
          </button>
        ))
      )}

      {answered && (
        <>
          <div className="nclex-rationale">
            <strong>Rationale</strong>
            {q.rationale}
          </div>
          {!isLastQuestion && (
            <button className="btn" style={{ marginTop: 16 }} onClick={nextQuestion}>
              Next Question
            </button>
          )}
        </>
      )}
    </div>
  );
}
