import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { apiErrorMessage, apiFetch, authOnlyHeaders, responseJson } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_MESSAGES = 15;

export default function AIChatWidget({ guides: providedGuides = null, preferredGuideId = '', preferredNoteId = '' }) {
  const router = useRouter();
  const [loadedGuides, setLoadedGuides] = useState([]);
  const [notes, setNotes] = useState([]);
  const [contextKey, setContextKey] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const appliedPreferred = useRef('');

  useEffect(() => {
    Promise.all([
      providedGuides ? null : apiFetch('/guides?limit=50'),
      apiFetch('/smart_notes'),
    ]).then(([guideData, noteData]) => {
      if (Array.isArray(guideData?.guides)) setLoadedGuides(guideData.guides);
      if (Array.isArray(noteData?.notes)) setNotes(noteData.notes);
    });
  }, [providedGuides]);

  const guides = providedGuides || loadedGuides;
  const materials = [
    ...guides.map(item => ({ ...item, kind: 'guide', key: `guide:${item.id}` })),
    ...notes.map(item => ({ ...item, kind: 'note', key: `note:${item.id}` })),
    ...(attachment ? [{ ...attachment, kind: 'attachment', key: 'attachment' }] : []),
  ];

  useEffect(() => {
    const preferred = preferredGuideId ? `guide:${preferredGuideId}` : preferredNoteId ? `note:${preferredNoteId}` : '';
    if (preferred && preferred !== appliedPreferred.current && materials.some(item => item.key === preferred)) {
      appliedPreferred.current = preferred;
      setContextKey(preferred);
      return;
    }
    if (!materials.some(item => item.key === contextKey)) setContextKey(materials[0]?.key || '');
  }, [materials.length, contextKey, preferredGuideId, preferredNoteId]);

  useEffect(() => {
    const prefill = event => {
      const detail = event.detail || {};
      if (detail.guideId) setContextKey(`guide:${detail.guideId}`);
      if (detail.prompt) setInput(detail.prompt);
    };
    window.addEventListener('cordia:tutor-prompt', prefill);
    return () => window.removeEventListener('cordia:tutor-prompt', prefill);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const material = materials.find(item => item.key === contextKey);
  const remaining = MAX_MESSAGES - messages.filter(message => message.role === 'user').length;

  function changeContext(event) {
    setContextKey(event.target.value);
    setMessages([]);
  }

  async function attachFile(file) {
    if (!file) return;
    setExtracting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(API + '/extract-file-text', { method: 'POST', headers: authOnlyHeaders(), body: formData });
      const data = await responseJson(response);
      if (!response.ok || !data?.text) throw new Error(apiErrorMessage(data?.detail, 'Could not read this file.'));
      setAttachment({ title: file.name, content: data.text });
      setContextKey('attachment');
      setMessages([]);
    } catch (error) {
      setMessages(current => [...current, { role: 'ai', text: error.message || 'Could not read this file.' }]);
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function sendMessage() {
    const question = input.trim();
    if (!question || !material || loading || remaining <= 0) return;
    setMessages(current => [...current, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    const data = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        content: material.kind === 'attachment' ? material.content : '',
        ...(material.kind === 'guide' ? { guide_id: material.id } : {}),
        ...(material.kind === 'note' ? { note_id: material.id } : {}),
        ...(material.kind === 'attachment' ? { context_title: material.title } : {}),
        mode: 'short',
      }),
    });
    if (data?.action === 'created_guide' && !providedGuides) {
      const refreshed = await apiFetch('/guides?limit=50');
      if (Array.isArray(refreshed?.guides)) {
        setLoadedGuides(refreshed.guides);
        setContextKey(`guide:${data.guide.id}`);
      }
    }
    setMessages(current => [...current, {
      role: 'ai',
      text: data?.answer || data?.detail || 'Cordia could not answer that yet.',
      guide: data?.guide || null,
      source: data?.source || null,
    }]);
    setLoading(false);
  }

  function openSource(source) {
    if (source?.type === 'guide') router.push('/guide/' + source.id);
    if (source?.type === 'note') router.push('/smartnotes?id=' + source.id);
  }

  return (
    <section className="cordia-tutor" aria-label="Cordia tutor">
      <header className="cordia-tutor-header">
        <strong>Cordia Tutor</strong>
        <select value={contextKey} onChange={changeContext} aria-label="Study material">
          {materials.length === 0 && <option value="">Choose study material</option>}
          {guides.length > 0 && <optgroup label="Study Guides">
            {guides.map(item => <option key={item.id} value={`guide:${item.id}`}>{item.title || 'Untitled guide'}</option>)}
          </optgroup>}
          {notes.length > 0 && <optgroup label="SmartNotes">
            {notes.map(item => <option key={item.id} value={`note:${item.id}`}>{item.title || 'Untitled note'}</option>)}
          </optgroup>}
          {attachment && <optgroup label="Attached file"><option value="attachment">{attachment.title}</option></optgroup>}
        </select>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp" onChange={event => attachFile(event.target.files?.[0])} hidden />
        <button type="button" className="cordia-tutor-attach" onClick={() => fileRef.current?.click()} disabled={extracting}>
          {extracting ? 'Reading file…' : 'Attach study material'}
        </button>
      </header>

      <div className="cordia-tutor-messages" aria-live="polite">
        {messages.length === 0 && (
          <p>{material ? `Ask about ${material.title || 'this material'}.` : 'Choose a guide, SmartNote, or file to begin.'}</p>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`cordia-tutor-message ${message.role}`}>
            {message.source && (
              <button type="button" className="cordia-tutor-source" onClick={() => openSource(message.source)} disabled={message.source.type === 'attachment'}>
                Based on {message.source.title}
              </button>
            )}
            {message.text}
            {message.guide && (
              <button type="button" className="cordia-tutor-guide-link" onClick={() => router.push('/guide/' + message.guide.id)}>
                Open {message.guide.title}
              </button>
            )}
          </div>
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
          placeholder={material ? 'Ask Cordia…' : 'Choose or attach study material'}
          disabled={!material || loading || remaining <= 0}
          rows="2"
        />
        <button type="button" onClick={sendMessage} disabled={!material || loading || !input.trim() || remaining <= 0} aria-label="Send">
          ↑
        </button>
      </div>
      {remaining <= 3 && <small className="cordia-tutor-limit">{Math.max(remaining, 0)} questions remaining</small>}
    </section>
  );
}
