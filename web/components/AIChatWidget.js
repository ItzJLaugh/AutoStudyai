import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

const MAX_MESSAGES = 15;

export default function AIChatWidget({ floating = false, guides: providedGuides = null }) {
  const [loadedGuides, setLoadedGuides] = useState([]);
  const [guideId, setGuideId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (providedGuides) return;
    apiFetch('/guides?limit=50').then(data => {
      const next = data?.guides || [];
      setLoadedGuides(next);
    });
  }, [providedGuides]);

  const guides = providedGuides || loadedGuides;

  useEffect(() => {
    if (!guides.some(item => String(item.id) === guideId)) {
      setGuideId(String(guides[0]?.id || ''));
    }
  }, [guides, guideId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const guide = guides.find(item => String(item.id) === guideId);
  const remaining = MAX_MESSAGES - messages.filter(message => message.role === 'user').length;

  function changeGuide(event) {
    setGuideId(event.target.value);
    setMessages([]);
  }

  async function sendMessage() {
    const question = input.trim();
    if (!question || !guide || loading || remaining <= 0) return;
    setMessages(current => [...current, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    const data = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ question, content: guide.study_guide || guide.notes || '', mode: 'short' }),
    });
    setMessages(current => [...current, {
      role: 'ai',
      text: data?.answer || data?.detail || 'Cordia could not answer that yet.',
    }]);
    setLoading(false);
  }

  return (
    <section className={`cordia-tutor${floating ? ' is-floating' : ''}`} aria-label="Cordia tutor">
      <header className="cordia-tutor-header">
        <strong>Cordia Tutor</strong>
        <select value={guideId} onChange={changeGuide} aria-label="Study material">
          {guides.length === 0 && <option value="">No guides yet</option>}
          {guides.map(item => <option key={item.id} value={item.id}>{item.title || 'Untitled guide'}</option>)}
        </select>
      </header>

      <div className="cordia-tutor-messages" aria-live="polite">
        {messages.length === 0 && (
          <p>{guide ? `Ask about ${guide.title || 'this guide'}.` : 'Your Canvas study guides will appear here.'}</p>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`cordia-tutor-message ${message.role}`}>{message.text}</div>
        ))}
        {loading && <div className="cordia-tutor-message ai">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="cordia-tutor-input">
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder={guide ? 'Ask Cordia…' : 'Create or connect a guide first'}
          disabled={!guide || loading || remaining <= 0}
          rows="2"
        />
        <button type="button" onClick={sendMessage} disabled={!guide || loading || !input.trim() || remaining <= 0} aria-label="Send">
          ↑
        </button>
      </div>
      {remaining <= 3 && <small className="cordia-tutor-limit">{Math.max(remaining, 0)} questions remaining</small>}
    </section>
  );
}
