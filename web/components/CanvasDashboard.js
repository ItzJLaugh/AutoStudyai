import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

function dueLabel(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dueTime(item) {
  const value = new Date(item.due_at || '').getTime();
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

export default function CanvasDashboard({ onGuidesCreated }) {
  const [state, setState] = useState({ loading: true, connected: false, courses: [], items: [] });
  const [connecting, setConnecting] = useState(false);
  const [autoMessage, setAutoMessage] = useState('');
  const autoBuildStarted = useRef(false);

  const load = useCallback(async () => {
    const data = await apiFetch('/canvas/dashboard');
    if (!data || data.detail) {
      setState({ loading: false, connected: false, courses: [], items: [], error: data?.detail || 'Canvas is unavailable' });
      return;
    }
    setState({ loading: false, ...data });
    if (data.connected && !autoBuildStarted.current) {
      autoBuildStarted.current = true;
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('canvasAutoBuildDate') === today) return;
      setAutoMessage('Checking Canvas for study material…');
      apiFetch('/canvas/auto-guides', { method: 'POST', timeoutMs: 120000 }).then(result => {
        if (result?.count) {
          localStorage.setItem('canvasAutoBuildDate', today);
          setAutoMessage('Your next Canvas study guide is ready.');
          onGuidesCreated?.();
        } else if (!result || result.detail) {
          autoBuildStarted.current = false;
          setAutoMessage(result?.detail?.message || result?.detail || 'Automatic guide creation is unavailable.');
        } else {
          localStorage.setItem('canvasAutoBuildDate', today);
          setAutoMessage('No new Canvas study material was ready.');
        }
      });
    }
  }, [onGuidesCreated]);

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  async function connect() {
    setConnecting(true);
    const data = await apiFetch('/canvas/connect', { method: 'POST' });
    if (data?.connect_url) {
      window.location.assign(data.connect_url);
      return;
    }
    setConnecting(false);
    setState(current => ({ ...current, error: data?.detail || 'Canvas connection could not start' }));
  }

  async function prepareGuide(item) {
    const params = new URLSearchParams({ course_id: String(item.course_id), item_id: String(item.id) });
    const data = await apiFetch(`/canvas/study-source?${params}`);
    if (!data || data.detail) {
      setState(current => ({ ...current, error: data?.detail || 'Study material could not be loaded' }));
      return;
    }
    localStorage.setItem('autostudy_text_draft', JSON.stringify(data));
    window.location.assign('/create');
  }

  if (state.loading) {
    return <section className="canvas-dashboard canvas-loading">Loading Canvas…</section>;
  }

  if (!state.connected) {
    return (
      <section className="canvas-dashboard canvas-connect-card">
        <div className="canvas-mark" aria-hidden="true">C</div>
        <div>
          <p className="editorial-kicker">YOUR LMS</p>
          <h2>Bring Canvas into CordiaClassroom</h2>
          <p>Connect once to see courses, assignments, and due dates in one study dashboard.</p>
          {state.error && <small className="canvas-error">{state.error}</small>}
        </div>
        <button type="button" className="btn btn-green" onClick={connect} disabled={connecting}>
          {connecting ? 'Opening Canvas…' : 'Connect Canvas'}
        </button>
      </section>
    );
  }

  const activeItems = state.items
    .filter(item => !item.completed)
    .sort((a, b) => dueTime(a) - dueTime(b))
    .slice(0, 6);
  const now = Date.now();
  const overdueCount = activeItems.filter(item => dueTime(item) < now).length;
  const dueSoonCount = activeItems.filter(item => {
    const due = dueTime(item);
    return due >= now && due <= now + 48 * 60 * 60 * 1000;
  }).length;
  const reminder = [
    overdueCount && `${overdueCount} overdue`,
    dueSoonCount && `${dueSoonCount} due within 48 hours`,
  ].filter(Boolean).join(' · ');
  const courseNames = Object.fromEntries(state.courses.map(course => [String(course.id), course.name]));

  return (
    <section className="canvas-dashboard">
      <header className="canvas-dashboard-header">
        <div>
          <p className="editorial-kicker">CANVAS · {state.institution}</p>
          <h2>What needs your attention</h2>
        </div>
        <div className="canvas-window-status">
          <span className="canvas-connected">Connected</span>
          <span className="window-resize-hint" title="Drag the corner to resize">↘</span>
        </div>
      </header>
      {reminder && <p className="canvas-reminder">{reminder}</p>}
      {autoMessage && <p className="canvas-auto-status">{autoMessage}</p>}
      {state.error && <div className="canvas-inline-error">{state.error}</div>}
      <div className="canvas-dashboard-grid">
        <div className="canvas-agenda">
          {activeItems.length === 0 ? (
            <p className="canvas-empty">No upcoming Canvas work.</p>
          ) : activeItems.map(item => (
            <div key={`${item.type}-${item.id}`} className="canvas-agenda-row">
              <span className="canvas-due">{dueLabel(item.due_at)}</span>
              <span><strong>{item.title}</strong><small>{courseNames[String(item.course_id)] || 'Canvas'}</small></span>
              {item.has_study_material
                ? <button type="button" onClick={() => prepareGuide(item)}>Make guide</button>
                : <a href={item.url || undefined} target="_blank" rel="noreferrer">Open ↗</a>}
            </div>
          ))}
        </div>
        <aside className="canvas-courses">
          <span className="dashboard-rail-kicker">COURSES</span>
          {state.courses.slice(0, 6).map(course => (
            <a key={course.id} href={course.url || undefined} target="_blank" rel="noreferrer">{course.name}</a>
          ))}
          {state.courses.length === 0 && <p className="canvas-empty">No active courses.</p>}
        </aside>
      </div>
    </section>
  );
}
