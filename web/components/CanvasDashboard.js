import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage, apiFetch } from '../lib/api';

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

function courseLabel(name) {
  return name?.split(':')[0].trim() || 'Canvas';
}

function normalizeCanvasDomain(value) {
  return value.trim().replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
}

const CANVAS_LOGO = '/canvas-logo.svg';

function CanvasCapabilities() {
  return (
    <ul className="canvas-capabilities">
      <li><strong>Import classes:</strong> active Canvas courses become Classroom classes.</li>
      <li><strong>Track deadlines:</strong> upcoming assignments and due dates appear on your dashboard.</li>
      <li><strong>Create study guides:</strong> supported assignment material becomes a guide in the matching class.</li>
      <li><strong>Build automatically:</strong> the next supported Canvas item becomes a guide when material is available.</li>
      <li><strong>Keep the source:</strong> every Canvas item can still be opened in its original course.</li>
    </ul>
  );
}

function CanvasConnectionWizard({ onClose, onConnect, connecting }) {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [copied, setCopied] = useState(false);
  const cleanDomain = normalizeCanvasDomain(domain);
  const validDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain);

  useEffect(() => {
    setDomain(localStorage.getItem('canvasDomain') || '');
  }, []);

  function continueWithDomain() {
    localStorage.setItem('canvasDomain', cleanDomain);
    setStep(2);
  }

  async function copyDomain() {
    await navigator.clipboard.writeText(cleanDomain);
    setCopied(true);
  }

  return (
    <div className="canvas-wizard-overlay" role="presentation" onClick={onClose}>
      <section
        className="canvas-token-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-wizard-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="canvas-wizard-header">
          <div>
            <small>Step {step} of 3</small>
            <h2 id="canvas-wizard-title">Connect Canvas</h2>
          </div>
          <button type="button" className="canvas-wizard-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {step === 1 && (
          <div className="canvas-wizard-body">
            <h3>Enter your Canvas website</h3>
            <p>Use the address you normally visit for classes.</p>
            <label className="canvas-domain-field">
              Canvas domain
              <input
                value={domain}
                onChange={event => setDomain(event.target.value)}
                placeholder="usaonline.southalabama.edu"
                autoFocus
              />
            </label>
            <button type="button" className="btn btn-green" disabled={!validDomain} onClick={continueWithDomain}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="canvas-wizard-body">
            <h3>Create your access token</h3>
            <ol className="canvas-wizard-steps">
              <li><strong>Open settings:</strong> the button below takes you to the correct page for your school.</li>
              <li><strong>Create a token:</strong> under Approved Integrations, select <strong>+ New Access Token</strong>.</li>
              <li><strong>Copy it once:</strong> use CordiaClassroom as the purpose, generate the token, and copy it before closing the window.</li>
            </ol>
            <a
              className="btn btn-green canvas-wizard-link"
              href={`https://${cleanDomain}/profile/settings`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setStep(3)}
            >
              Open Canvas settings ↗
            </a>
          </div>
        )}

        {step === 3 && (
          <div className="canvas-wizard-body">
            <h3>Paste it into the secure form</h3>
            <p>Use the token you copied. When the secure form asks for Domain, enter:</p>
            <div className="canvas-domain-copy">
              <code>{cleanDomain}</code>
              <button type="button" onClick={copyDomain}>{copied ? 'Copied' : 'Copy domain'}</button>
            </div>
            <button type="button" className="btn btn-green" onClick={onConnect} disabled={connecting}>
              {connecting ? 'Opening secure form…' : 'Open secure connection form'}
            </button>
            <small className="canvas-wizard-privacy">Your token is entered directly into Pipedream’s secure connection form.</small>
          </div>
        )}

        {step > 1 && (
          <button type="button" className="canvas-wizard-back" onClick={() => setStep(current => current - 1)}>← Back</button>
        )}
      </section>
    </div>
  );
}

export default function CanvasDashboard({ onWorkspaceChanged }) {
  const [state, setState] = useState({ loading: true, connected: false, courses: [], items: [] });
  const [connecting, setConnecting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [generation, setGeneration] = useState({ status: 'idle', message: '' });
  const autoBuildStarted = useRef(false);
  const workspaceSynced = useRef(false);

  const load = useCallback(async () => {
    const data = await apiFetch('/canvas/sync', { method: 'POST' });
    if (!data || data.detail) {
      setState(current => ({ ...current, loading: false, error: apiErrorMessage(data?.detail, 'Canvas is unavailable') }));
      return;
    }
    setState({ loading: false, ...data });
    if (data.connected && !workspaceSynced.current) {
      workspaceSynced.current = true;
      onWorkspaceChanged?.();
    }
    if (data.connected && !autoBuildStarted.current) {
      autoBuildStarted.current = true;
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('canvasAutoBuildDate') === today) return;
      setGeneration({ status: 'building', message: 'Building your next Canvas study guide…' });
      apiFetch('/canvas/auto-guides', { method: 'POST', timeoutMs: 120000 }).then(result => {
        if (result?.count) {
          localStorage.setItem('canvasAutoBuildDate', today);
          setGeneration({ status: 'ready', message: 'Your next Canvas study guide is ready.' });
          onWorkspaceChanged?.();
        } else if (!result || result.detail) {
          autoBuildStarted.current = false;
          setGeneration({ status: 'failed', message: apiErrorMessage(result?.detail, 'Automatic guide creation failed. Try again later.') });
        } else {
          localStorage.setItem('canvasAutoBuildDate', today);
          setGeneration({ status: 'idle', message: 'No new Canvas study material is ready.' });
        }
      });
    }
  }, [onWorkspaceChanged]);

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  async function openConnectionForm() {
    setConnecting(true);
    const data = await apiFetch('/canvas/connect', { method: 'POST' });
    if (data?.connect_url) {
      window.location.assign(data.connect_url);
      return;
    }
    setConnecting(false);
    setState(current => ({ ...current, error: apiErrorMessage(data?.detail, 'Canvas connection could not start') }));
  }

  async function prepareGuide(item) {
    const params = new URLSearchParams({ course_id: String(item.course_id), item_id: String(item.id) });
    const data = await apiFetch(`/canvas/study-source?${params}`);
    if (!data || data.detail) {
      setState(current => ({ ...current, error: apiErrorMessage(data?.detail, 'Study material could not be loaded') }));
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
      <>
        <section className="canvas-dashboard canvas-connect-card">
          <img className="canvas-mark" src={CANVAS_LOGO} alt="Canvas" />
          <div>
            <h2>Bring Canvas into CordiaClassroom</h2>
            <p>Connect once, then Classroom keeps the useful parts of Canvas together.</p>
            <CanvasCapabilities />
            {state.error && <small className="canvas-error">{state.error}</small>}
          </div>
          <button type="button" className="btn btn-green" onClick={() => setWizardOpen(true)}>
            Connect Canvas
          </button>
        </section>
        {wizardOpen && (
          <CanvasConnectionWizard
            connecting={connecting}
            onClose={() => !connecting && setWizardOpen(false)}
            onConnect={openConnectionForm}
          />
        )}
      </>
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
        <div className="canvas-dashboard-title">
          <img className="canvas-mark canvas-mark-small" src={CANVAS_LOGO} alt="" />
          <h2>What needs your attention</h2>
        </div>
        <div className="canvas-window-status">
          <span className="canvas-connected" title={state.institution || 'Canvas'}>Canvas connected</span>
          <span className="window-resize-hint" title="Drag the corner to resize">↘</span>
        </div>
      </header>
      <div className="canvas-connection-summary">
        <strong>Canvas capabilities</strong>
        <CanvasCapabilities />
      </div>
      {reminder && <p className="canvas-reminder">{reminder}</p>}
      {generation.message && (
        <p className="canvas-auto-status" data-status={generation.status} role="status" aria-live="polite">
          {generation.message}
        </p>
      )}
      {state.error && <div className="canvas-inline-error">{state.error}</div>}
      <div className="canvas-dashboard-grid">
        <div className="canvas-agenda">
          {activeItems.length === 0 ? (
            <p className="canvas-empty">No upcoming Canvas work.</p>
          ) : activeItems.map(item => (
            <div key={`${item.type}-${item.id}`} className="canvas-agenda-row">
              <span><strong>{item.title}</strong><small>{dueLabel(item.due_at)} · {courseLabel(courseNames[String(item.course_id)])}</small></span>
              {item.has_study_material
                ? <button type="button" onClick={() => prepareGuide(item)}>Make guide</button>
                : <a href={item.url || undefined} target="_blank" rel="noreferrer">Open ↗</a>}
            </div>
          ))}
        </div>
        <aside className="canvas-courses">
          <h3>Courses</h3>
          {state.courses.slice(0, 6).map(course => (
            <a key={course.id} href={course.url || undefined} target="_blank" rel="noreferrer">{course.name}</a>
          ))}
          {state.courses.length === 0 && <p className="canvas-empty">No active courses.</p>}
        </aside>
      </div>
    </section>
  );
}
