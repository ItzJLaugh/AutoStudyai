import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

let _nextId = 1;

function newChat(index) {
  const x = typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 380) : 800;
  const y = typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 520) : 100;
  return {
    id: _nextId++,
    name: `Chat ${index + 1}`,
    messages: [],
    mode: 'short',
    isExpanded: false,
    loading: false,
    position: { x, y },
  };
}

export default function AIChatWidget({ guideContent, guideTitle }) {
  const [chats, setChats] = useState([]);
  const dragRef = useRef(null);

  if (!guideContent) return null;

  function addChat() {
    setChats(prev => {
      const offset = prev.length * 30;
      const base = newChat(prev.length);
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

  function renameChat(id, name) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() || c.name } : c));
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
          guideTitle={guideTitle}
          onMinimize={() => toggleExpand(chat.id)}
          onDelete={() => deleteChat(chat.id)}
          onDragStart={e => startDrag(e, chat.id)}
          onSend={q => sendMessage(chat.id, q)}
          onModeChange={m => updateMode(chat.id, m)}
          onRename={name => renameChat(chat.id, name)}
        />
      ))}

      <div className="ai-chat-dock">
        {minimized.map(chat => (
          <BubbleIcon
            key={chat.id}
            chat={chat}
            guideTitle={guideTitle}
            onExpand={() => toggleExpand(chat.id)}
            onDelete={() => deleteChat(chat.id)}
            onRename={name => renameChat(chat.id, name)}
          />
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

function BubbleIcon({ chat, guideTitle, onExpand, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitRename() {
    onRename(draft);
    setEditing(false);
  }

  const tooltip = guideTitle ? `${chat.name} — ${guideTitle}` : chat.name;
  const displayName = chat.name.length > 12 ? chat.name.slice(0, 11) + '…' : chat.name;

  return (
    <div className="ai-chat-bubble-wrap">
      {editing ? (
        <input
          ref={inputRef}
          className="ai-bubble-name-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
          maxLength={24}
        />
      ) : (
        <span
          className="ai-bubble-name"
          title="Double-click to rename"
          onDoubleClick={() => { setDraft(chat.name); setEditing(true); }}
        >
          {displayName}
        </span>
      )}
      <button className="ai-chat-bubble" onClick={onExpand} title={tooltip}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {chat.messages.filter(m => m.role === 'ai').length > 0 && (
          <span className="ai-bubble-count">{chat.messages.filter(m => m.role === 'ai').length}</span>
        )}
      </button>
      <button className="ai-bubble-delete" onClick={onDelete} title="Delete chat">×</button>
    </div>
  );
}

function ChatWindow({ chat, guideTitle, onMinimize, onDelete, onDragStart, onSend, onModeChange, onRename }) {
  const [input, setInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chat.name);
  const messagesEndRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.loading]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  function handleSend() {
    if (!input.trim() || chat.loading) return;
    onSend(input.trim());
    setInput('');
  }

  function commitName() {
    onRename(nameDraft);
    setEditingName(false);
  }

  return (
    <div className="ai-chat-window" style={{ left: chat.position.x, top: chat.position.y }}>
      <div className="ai-chat-win-header" onMouseDown={onDragStart}>
        <div className="ai-chat-win-title">
          {editingName ? (
            <input
              ref={nameInputRef}
              className="ai-win-name-input"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
              onMouseDown={e => e.stopPropagation()}
              maxLength={24}
            />
          ) : (
            <span
              className="ai-win-name"
              title="Double-click to rename"
              onDoubleClick={e => { e.stopPropagation(); setNameDraft(chat.name); setEditingName(true); }}
            >
              {chat.name}
            </span>
          )}
          {guideTitle && <span className="ai-win-guide-title" title={guideTitle}>{guideTitle.length > 22 ? guideTitle.slice(0, 21) + '…' : guideTitle}</span>}
        </div>
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
