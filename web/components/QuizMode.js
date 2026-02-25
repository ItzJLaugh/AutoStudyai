import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function QuizMode({ questions, guideId, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(null);

  const q = questions[currentIndex];

  function selectOption(i) {
    if (answered) return;
    setSelected(i);
    setAnswered(true);

    const isCorrect = i === q.correct_index;
    const newAnswers = [...answers, {
      question_index: currentIndex,
      selected: i,
      correct: q.correct_index,
      is_correct: isCorrect
    }];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelected(null);
        setAnswered(false);
      } else {
        submitQuiz(newAnswers);
      }
    }, 1200);
  }

  async function submitQuiz(finalAnswers) {
    const data = await apiFetch('/quiz/' + guideId + '/submit', {
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
    setAnswered(false);
    setAnswers([]);
    setDone(false);
    setScore(null);
  }

  if (done && score) {
    return (
      <div className="quiz-result">
        <div className="quiz-score">{score.score}%</div>
        <div className="quiz-score-label">Quiz Score</div>
        <div className="quiz-breakdown">
          {score.correct} out of {score.total} correct
        </div>
        <div className="completion-actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={retake}>Retake Quiz</button>
          <button className="btn-outline" onClick={() => window.history.back()}>Back to Guide</button>
        </div>
      </div>
    );
  }

  function optionClass(i) {
    if (!answered) return 'quiz-option' + (selected === i ? ' selected' : '');
    if (i === q.correct_index) return 'quiz-option correct';
    if (i === selected && i !== q.correct_index) return 'quiz-option wrong';
    return 'quiz-option disabled';
  }

  return (
    <div className="quiz-question-card">
      <div className="quiz-counter">Question {currentIndex + 1} of {questions.length}</div>
      <div className="progress-bar-container" style={{ marginBottom: 16 }}>
        <div className="progress-bar-fill" style={{ width: ((currentIndex / questions.length) * 100) + '%' }} />
      </div>
      <div className="quiz-question-text">{q.question}</div>
      {q.options.map((opt, i) => (
        <button key={i} className={optionClass(i)} onClick={() => selectOption(i)}>
          {opt}
        </button>
      ))}
    </div>
  );
}
