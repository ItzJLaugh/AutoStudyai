import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

let _nextId = 1;

function newChat() {
  const x = typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 380) : 800;
  const y = typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 520) : 100;
  return { id: _nextId++, messages: [], mode: 'short', isExpanded: false, loading: false, position: { x, y } };
}

export default function AIChatWidget({ guideContent }) {
  const [chats, setChats] = useState([]);
  const dragRef = useRef(null);

  if (!guideContent) return null;

  function addChat() {
    setChats(prev => {
      const offset = prev.length * 30;
      const base = newChat();
      return [...prev, { ...base, position: { x: base.position.x - offset, y: base.position.y - offset } }];
    });
  }

  function deleteChat(id) {
    setChats(prev => prev.filter(c => c.id !== id));
  }

  function toggleExpand(id) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, isExpanded: !c.isExpanded } : c));
  }

  function updateMode(id, mode) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, mode } : c));
  }

  async function sendMessage(id, question) {
    const chat = chats.find(c => c.id === id);
    if (!chat || !question.trim() || chat.loading) return;

    setChats(prev => prev.map(c => c.id === id ? {
      ...c,
      messages: [...c.messages, { role: 'user', text: question, mode: c.mode }],
      loading: true,
    } : c));

    try {
      const data = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ question, content: guideContent, mode: chat.mode }),
      });
      setChats(prev => prev.map(c => c.id === id ? {
        ...c,
        messages: [...c.messages, { role: 'ai', text: data?.answer || 'No response received.' }],
        loading: false,
      } : c));
    } catch {
      setChats(prev => prev.map(c => c.id === id ? {
        ...c,
        messages: [...c.messages, { role: 'ai', text: 'Error getting response. Please try again.' }],
        loading: false,
      } : c));
    }
  }

  function startDrag(e, id) {
    e.preventDefault();
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origPos: { ...chat.position } };

    function onMove(e) {
      const { id, startX, startY, origPos } = dragRef.current;
      setChats(prev => prev.map(c => c.id === id ? {
        ...c,
        position: { x: origPos.x + e.clientX - startX, y: origPos.y + e.clientY - startY },
      } : c));
    }
    function onUp() {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const minimized = chats.filter(c => !c.isExpanded);
  const expanded = chats.filter(c => c.isExpanded);

  return (
    <>
      {expanded.map(chat => (
        <ChatWindow
          key={chat.id}
          chat={chat}
          onMinimize={() => toggleExpand(chat.id)}
          onDelete={() => deleteChat(chat.id)}
          onDragStart={e => startDrag(e, chat.id)}
          onSend={q => sendMessage(chat.id, q)}
          onModeChange={m => updateMode(chat.id, m)}
        />
      ))}

      <div className="ai-chat-dock">
        {minimized.map(chat => (
          <div key={chat.id} className="ai-chat-bubble-wrap">
            <button className="ai-chat-bubble" onClick={() => toggleExpand(chat.id)} title="Open chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {chat.messages.filter(m => m.role === 'ai').length > 0 && (
                <span className="ai-bubble-count">{chat.messages.filter(m => m.role === 'ai').length}</span>
              )}
            </button>
            <button className="ai-bubble-delete" onClick={() => deleteChat(chat.id)} title="Delete chat">×</button>
          </div>
        ))}
        <div className="ai-chat-new-wrap">
          <button className="ai-chat-new-btn" onClick={addChat} title="Create AI Chat">
            <span style={{ fontSize: '1.5em', lineHeight: 1, fontWeight: 300 }}>+</span>
          </button>
          <span className="ai-chat-new-label">Create AI Chat</span>
        </div>
      </div>
    </>
  );
}

function ChatWindow({ chat, onMinimize, onDelete, onDragStart, onSend, onModeChange }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.loading]);

  function handleSend() {
    if (!input.trim() || chat.loading) return;
    onSend(input.trim());
    setInput('');
  }

  return (
    <div className="ai-chat-window" style={{ left: chat.position.x, top: chat.position.y }}>
      <div className="ai-chat-win-header" onMouseDown={onDragStart}>
        <span>AI Chat</span>
        <div className="ai-chat-win-actions">
          <button onClick={onMinimize} title="Minimise" className="ai-win-btn">&#8211;</button>
          <button onClick={onDelete} title="Delete chat" className="ai-win-btn ai-win-btn-close">&#x2715;</button>
        </div>
      </div>

      <div className="ai-chat-modes">
        {[{ key: 'short', label: 'Normal' }, { key: 'detailed', label: 'Detailed' }, { key: 'example', label: 'Example' }].map(m => (
          <button key={m.key} className={'ai-chat-mode-btn' + (chat.mode === m.key ? ' active' : '')} onClick={() => onModeChange(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="ai-chat-messages">
        {chat.messages.length === 0 && (
          <div className="ai-chat-empty">
            Ask anything about this study guide.<br /><br />
            <strong>Normal</strong> — quick answer<br />
            <strong>Detailed</strong> — in-depth explanation<br />
            <strong>Example</strong> — real-world example
          </div>
        )}
        {chat.messages.map((msg, i) => (
          <div key={i} className={'ai-chat-msg ' + msg.role}>
            {msg.role === 'user' && <span className="ai-chat-mode-tag">{msg.mode}</span>}
            <div className="ai-chat-msg-text">{msg.text}</div>
          </div>
        ))}
        {chat.loading && (
          <div className="ai-chat-msg ai">
            <div className="ai-chat-typing"><span /><span /><span /></div>
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
          disabled={chat.loading}
          className="ai-chat-input"
        />
        <button onClick={handleSend} disabled={chat.loading || !input.trim()} className="ai-chat-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
