import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const MAX_BUBBLES = 5;
const MAX_MESSAGES = 15; // user messages per chat
const RADIUS = 26;
const SPEED = 0.5;

let _nextId = 1;

function randVelocity() {
  const a = Math.random() * Math.PI * 2;
  return { vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED };
}

// Physics update — mutates array in place, returns it
function stepPhysics(bubbles, W, H) {
  const D = RADIUS * 2.2;
  for (let b of bubbles) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x - RADIUS < 0)  { b.x = RADIUS;     b.vx =  Math.abs(b.vx); }
    if (b.x + RADIUS > W)  { b.x = W - RADIUS;  b.vx = -Math.abs(b.vx); }
    if (b.y - RADIUS < 0)  { b.y = RADIUS;      b.vy =  Math.abs(b.vy); }
    if (b.y + RADIUS > H)  { b.y = H - RADIUS;  b.vy = -Math.abs(b.vy); }
  }
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i], b = bubbles[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < D && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (dot > 0) {
          a.vx -= dot * nx; a.vy -= dot * ny;
          b.vx += dot * nx; b.vy += dot * ny;
        }
        const ov = (D - dist) / 2;
        a.x -= nx * ov; a.y -= ny * ov;
        b.x += nx * ov; b.y += ny * ov;
      }
    }
  }
  return bubbles;
}

export default function AIChatWidget() {
  const [chats, setChats] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [guides, setGuides] = useState([]);
  const [guidesLoading, setGuidesLoading] = useState(false);

  // Physics — all in refs, DOM updated directly (no React re-render per frame)
  const physicsRef = useRef([]);   // [{id, x, y, vx, vy}]
  const elRefs = useRef({});       // {id: DOM element}
  const containerRef = useRef(null);
  const isPausedRef = useRef(false);
  const animRef = useRef(null);

  // Animation loop
  useEffect(() => {
    function loop() {
      if (!isPausedRef.current && containerRef.current && physicsRef.current.length) {
        const W = containerRef.current.clientWidth;
        const H = containerRef.current.clientHeight;
        stepPhysics(physicsRef.current, W, H);
        for (const b of physicsRef.current) {
          const el = elRefs.current[b.id];
          if (el) {
            el.style.left = (b.x - RADIUS) + 'px';
            el.style.top  = (b.y - RADIUS) + 'px';
          }
        }
      }
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Sync physics entries when chats change
  useEffect(() => {
    const container = containerRef.current;
    const W = container ? container.clientWidth  : 220;
    const H = container ? container.clientHeight : 200;
    // Add new
    for (const c of chats) {
      if (!physicsRef.current.find(p => p.id === c.id)) {
        physicsRef.current.push({
          id: c.id,
          x: RADIUS + Math.random() * Math.max(1, W - RADIUS * 2),
          y: RADIUS + Math.random() * Math.max(1, H - RADIUS * 2),
          ...randVelocity(),
        });
      }
    }
    // Remove deleted
    physicsRef.current = physicsRef.current.filter(p => chats.find(c => c.id === p.id));
    // Clean up orphan el refs
    for (const key of Object.keys(elRefs.current)) {
      if (!chats.find(c => String(c.id) === key)) delete elRefs.current[key];
    }
  }, [chats]);

  async function openSelector() {
    setShowSelector(true);
    if (guides.length === 0) {
      setGuidesLoading(true);
      const data = await apiFetch('/guides?limit=50');
      if (data?.guides) setGuides(data.guides);
      setGuidesLoading(false);
    }
  }

  function createChat(guide) {
    if (chats.length >= MAX_BUBBLES) return;
    const id = _nextId++;
    setChats(prev => [...prev, {
      id,
      name: guide.title ? guide.title.slice(0, 20) : `Chat ${id}`,
      guideId: guide.id,
      guideContent: guide.study_guide || '',
      guideTitle: guide.title || '',
      messages: [],
      mode: 'short',
      loading: false,
    }]);
    setShowSelector(false);
    setExpandedId(id);
  }

  function deleteChat(id) {
    setChats(prev => prev.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function renameChat(id, name) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() || c.name } : c));
  }

  function updateMode(id, mode) {
    setChats(prev => prev.map(c => c.id === id ? { ...c, mode } : c));
  }

  async function sendMessage(id, question) {
    const chat = chats.find(c => c.id === id);
    if (!chat || !question.trim() || chat.loading) return;
    const userMsgCount = chat.messages.filter(m => m.role === 'user').length;
    if (userMsgCount >= MAX_MESSAGES) return;

    setChats(prev => prev.map(c => c.id === id ? {
      ...c,
      messages: [...c.messages, { role: 'user', text: question, mode: c.mode }],
      loading: true,
    } : c));

    try {
      const data = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ question, content: chat.guideContent, mode: chat.mode }),
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

  const expandedChat = chats.find(c => c.id === expandedId) || null;

  return (
    <>
      {/* Floating expanded chat window */}
      {expandedChat && (
        <ChatWindow
          chat={expandedChat}
          maxMessages={MAX_MESSAGES}
          onMinimize={() => setExpandedId(null)}
          onDelete={() => deleteChat(expandedChat.id)}
          onSend={q => sendMessage(expandedChat.id, q)}
          onModeChange={m => updateMode(expandedChat.id, m)}
          onRename={name => renameChat(expandedChat.id, name)}
        />
      )}

      {/* Guide selector modal */}
      {showSelector && (
        <div className="ai-selector-overlay" onClick={() => setShowSelector(false)}>
          <div className="ai-selector-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-selector-header">
              <span>Select a Study Guide</span>
              <button onClick={() => setShowSelector(false)} className="ai-win-btn">&#x2715;</button>
            </div>
            {guidesLoading ? (
              <div className="ai-selector-loading">Loading guides...</div>
            ) : guides.length === 0 ? (
              <div className="ai-selector-loading">No saved guides found.</div>
            ) : (
              <div className="ai-selector-list">
                {guides.map(g => (
                  <button key={g.id} className="ai-selector-item" onClick={() => createChat(g)}>
                    {g.title || 'Untitled Guide'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bubble container inside sidebar */}
      <div
        className="ai-bubble-container"
        ref={containerRef}
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
      >
        {chats.map(chat => (
          <div
            key={chat.id}
            className={'ai-bubble-item' + (chat.id === expandedId ? ' ai-bubble-active' : '')}
            ref={el => { if (el) elRefs.current[chat.id] = el; }}
            style={{ position: 'absolute', width: RADIUS * 2, height: RADIUS * 2 }}
          >
            <BubbleIcon
              chat={chat}
              isActive={chat.id === expandedId}
              onExpand={() => setExpandedId(chat.id === expandedId ? null : chat.id)}
              onDelete={() => deleteChat(chat.id)}
              onRename={name => renameChat(chat.id, name)}
            />
          </div>
        ))}

        {/* New chat button */}
        {chats.length < MAX_BUBBLES ? (
          <div className="ai-new-chat-area">
            <button className="ai-chat-new-btn" onClick={openSelector} title="Create AI Chat">
              <span style={{ fontSize: '1.4em', lineHeight: 1, fontWeight: 300 }}>+</span>
            </button>
            <span className="ai-chat-new-label">Create AI Chat</span>
          </div>
        ) : (
          <div className="ai-new-chat-area">
            <span className="ai-chat-new-label" style={{ color: 'var(--text-muted)' }}>Max {MAX_BUBBLES} chats</span>
          </div>
        )}
      </div>
    </>
  );
}

function BubbleIcon({ chat, isActive, onExpand, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.name);
  const inputRef = useRef(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() { onRename(draft); setEditing(false); }
  const msgCount = chat.messages.filter(m => m.role === 'ai').length;

  return (
    <div className="ai-bubble-wrap">
      <button
        className={'ai-chat-bubble' + (isActive ? ' ai-bubble-open' : '')}
        onClick={onExpand}
        title={chat.guideTitle || chat.name}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {msgCount > 0 && <span className="ai-bubble-count">{msgCount}</span>}
      </button>
      <button className="ai-bubble-delete" onClick={onDelete} title="Delete">×</button>
      {editing ? (
        <input
          ref={inputRef}
          className="ai-bubble-name-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          maxLength={20}
        />
      ) : (
        <span className="ai-bubble-name" onClick={() => { setDraft(chat.name); setEditing(true); }} title="Click to rename">
          {chat.name.length > 10 ? chat.name.slice(0, 9) + '…' : chat.name}
        </span>
      )}
    </div>
  );
}

function ChatWindow({ chat, maxMessages, onMinimize, onDelete, onSend, onModeChange, onRename }) {
  const [input, setInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chat.name);
  const messagesEndRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.messages, chat.loading]);
  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);

  function handleSend() {
    if (!input.trim() || chat.loading) return;
    onSend(input.trim());
    setInput('');
  }

  function commitName() { onRename(nameDraft); setEditingName(false); }

  const userMsgCount = chat.messages.filter(m => m.role === 'user').length;
  const remaining = maxMessages - userMsgCount;

  return (
    <div className="ai-chat-window" style={{ right: 300, bottom: 24, top: 'auto', left: 'auto' }}>
      <div className="ai-chat-win-header" style={{ cursor: 'default' }}>
        <div className="ai-chat-win-title">
          {editingName ? (
            <input ref={nameInputRef} className="ai-win-name-input" value={nameDraft}
              onChange={e => setNameDraft(e.target.value)} onBlur={commitName}
              onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
              onMouseDown={e => e.stopPropagation()} maxLength={24} />
          ) : (
            <span className="ai-win-name" onClick={e => { e.stopPropagation(); setNameDraft(chat.name); setEditingName(true); }} title="Click to rename">
              {chat.name}
            </span>
          )}
          {chat.guideTitle && (
            <span className="ai-win-guide-title" title={chat.guideTitle}>
              {chat.guideTitle.length > 22 ? chat.guideTitle.slice(0, 21) + '…' : chat.guideTitle}
            </span>
          )}
        </div>
        <div className="ai-chat-win-actions">
          <button onClick={onMinimize} className="ai-win-btn" title="Minimise">&#8211;</button>
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
            Ask anything about <strong>{chat.guideTitle || 'this guide'}</strong>.<br /><br />
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

      {remaining <= 3 && remaining > 0 && (
        <div className="ai-msg-limit-warn">{remaining} message{remaining !== 1 ? 's' : ''} remaining</div>
      )}
      {remaining <= 0 && (
        <div className="ai-msg-limit-warn" style={{ color: 'var(--error, #e05)' }}>Message limit reached for this chat.</div>
      )}

      <div className="ai-chat-input-area">
        <input
          type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={remaining > 0 ? 'Ask about this guide...' : 'Limit reached'}
          disabled={chat.loading || remaining <= 0}
          className="ai-chat-input"
        />
        <button onClick={handleSend} disabled={chat.loading || !input.trim() || remaining <= 0} className="ai-chat-send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <div className="ai-chat-footer">
        <button onClick={onDelete} className="ai-chat-delete-btn">Delete chat</button>
      </div>
    </div>
  );
}
