import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export default function AIChatWidget({ guideContent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('short');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: question, mode }]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          question,
          content: guideContent,
          mode,
        }),
      });
      setMessages(prev => [...prev, { role: 'ai', text: data?.answer || 'No response received.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error getting response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        className="ai-chat-toggle"
        onClick={() => setIsOpen(true)}
        title="Ask AI about this guide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        AI Chat
      </button>
    );
  }

  return (
    <div className="ai-chat-widget">
      <div className="ai-chat-header">
        <span>AI Chat</span>
        <button onClick={() => setIsOpen(false)} className="ai-chat-close">&times;</button>
      </div>

      <div className="ai-chat-modes">
        {[
          { key: 'short', label: 'Normal' },
          { key: 'detailed', label: 'Detailed' },
          { key: 'example', label: 'Example' },
        ].map(m => (
          <button
            key={m.key}
            className={'ai-chat-mode-btn' + (mode === m.key ? ' active' : '')}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            Ask anything about this study guide. Choose a mode above:
            <br /><br />
            <strong>Normal</strong> — quick, direct answer<br />
            <strong>Detailed</strong> — in-depth explanation<br />
            <strong>Example</strong> — real-world example to help you understand
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={'ai-chat-msg ' + msg.role}>
            {msg.role === 'user' && (
              <span className="ai-chat-mode-tag">{msg.mode}</span>
            )}
            <div className="ai-chat-msg-text">{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-chat-msg ai">
            <div className="ai-chat-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this guide..."
          disabled={loading}
          className="ai-chat-input"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="ai-chat-send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
