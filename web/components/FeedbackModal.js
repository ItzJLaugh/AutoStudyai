import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function FeedbackModal({ onClose }) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');

    const data = await apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({ message: message.trim(), category }),
    });

    if (data?.submitted) {
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } else {
      setError('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="feedback-success">
            <p>Thanks for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>Send Feedback</h3>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
            </select>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              rows={5}
              maxLength={2000}
              autoFocus
            />
            {error && <p className="feedback-error">{error}</p>}
            <div className="feedback-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting || !message.trim()}>
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .feedback-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .feedback-modal { background: var(--bg-secondary); border: 1px solid var(--border-default); border-radius: 12px; padding: 24px; width: 100%; max-width: 480px; }
        h3 { margin: 0 0 16px; font-size: 1.2rem; color: var(--text-primary); }
        select { width: 100%; padding: 8px 12px; margin-bottom: 12px; border-radius: 6px; border: 1px solid var(--border-default); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; }
        textarea { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid var(--border-default); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.9rem; resize: vertical; font-family: inherit; }
        textarea:focus, select:focus { outline: none; border-color: var(--accent); }
        .feedback-error { color: var(--error); font-size: 0.85rem; margin: 8px 0 0; }
        .feedback-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
        .btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; }
        .btn-secondary:hover { background: var(--bg-hover); }
        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: #fff; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-primary:hover { background: var(--accent-secondary); }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }
        .feedback-success { text-align: center; padding: 20px; color: var(--success); font-weight: 600; }
      `}</style>
    </div>
  );
}
