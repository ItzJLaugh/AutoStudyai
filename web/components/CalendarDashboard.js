import { useEffect, useState } from 'react';
import { apiErrorMessage, apiFetch, getUserId } from '../lib/api';

const FEED_KEY = 'cordiaCanvasCalendarFeed';
const REMINDER_KEY = 'cordiaCalendarReminders';

function accountKey(key, userId) {
  return userId ? `${key}:${userId}` : '';
}

function dateValue(item) {
  const value = new Date(item?.due_at || '').getTime();
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

function dueLabel(item) {
  const date = new Date(item?.due_at || '');
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return item.all_day ? 'Due today' : `Due today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    + (item.all_day ? '' : ` · ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
}

function notifyDueToday(items, userId) {
  const reminderKey = accountKey(REMINDER_KEY, userId);
  if (typeof window === 'undefined' || !reminderKey || !('Notification' in window) || localStorage.getItem(reminderKey) !== 'on' || Notification.permission !== 'granted') return;
  items.forEach(item => {
    const key = `cordiaCalendarNotified:${userId}:${item.id}:${new Date().toDateString()}`;
    if (localStorage.getItem(key)) return;
    new Notification('Due today in Canvas', { body: item.title, tag: key });
    localStorage.setItem(key, '1');
  });
}

export default function CalendarDashboard() {
  const [feedUrl, setFeedUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState([]);
  const [dueToday, setDueToday] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reminders, setReminders] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const accountId = getUserId();
    const feedKey = accountKey(FEED_KEY, accountId);
    const reminderKey = accountKey(REMINDER_KEY, accountId);

    // Legacy keys were shared by every account in one browser. Never attach
    // that feed URL to a different signed-in user.
    localStorage.removeItem(FEED_KEY);
    localStorage.removeItem(REMINDER_KEY);

    setUserId(accountId);
    const saved = feedKey ? localStorage.getItem(feedKey) || '' : '';
    setFeedUrl(saved);
    setReminders(Boolean(reminderKey && localStorage.getItem(reminderKey) === 'on'));
    if (saved) {
      connect(saved, accountId);
    } else {
      refresh(accountId);
    }
  }, []);

  function applyCalendar(data, accountId) {
    if (!data?.connected || !Array.isArray(data.items)) return false;
    setConnected(true);
    setItems(data.items);
    setDueToday(Array.isArray(data.due_today) ? data.due_today : []);
    notifyDueToday(data.due_today || [], accountId);
    return true;
  }

  async function connect(url, accountId = userId) {
    if (!url || !accountId) return;
    setLoading(true);
    setError('');
    const data = await apiFetch('/calendar/connection', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    if (applyCalendar(data, accountId)) {
      const feedKey = accountKey(FEED_KEY, accountId);
      if (feedKey) localStorage.removeItem(feedKey);
      setFeedUrl('');
    } else {
      setError(apiErrorMessage(data?.detail, 'Classroom could not read this calendar feed.'));
    }
    setLoading(false);
  }

  async function refresh(accountId = userId) {
    if (!accountId) return;
    setLoading(true);
    setError('');
    const data = await apiFetch('/calendar/connection');
    if (data?.connected === false) {
      setConnected(false);
    } else if (!applyCalendar(data, accountId)) {
      setError(apiErrorMessage(data?.detail, 'Classroom could not refresh this calendar feed.'));
    }
    setLoading(false);
  }

  async function disconnect() {
    setLoading(true);
    setError('');
    const data = await apiFetch('/calendar/connection', { method: 'DELETE' });
    if (data?.connected !== false) {
      setError(apiErrorMessage(data?.detail, 'Classroom could not disconnect this calendar.'));
      setLoading(false);
      return;
    }
    const feedKey = accountKey(FEED_KEY, userId);
    if (feedKey) localStorage.removeItem(feedKey);
    setConnected(false);
    setFeedUrl('');
    setItems([]);
    setDueToday([]);
    setLoading(false);
  }

  async function toggleReminders() {
    const reminderKey = accountKey(REMINDER_KEY, userId);
    if (!reminderKey) {
      setError('Sign in again before enabling reminders.');
      return;
    }
    if (reminders) {
      localStorage.removeItem(reminderKey);
      setReminders(false);
      return;
    }
    if (!('Notification' in window)) {
      setError('This browser does not support desktop reminders. Your dashboard reminders will still work.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setError('Desktop reminders were not allowed. You can still review deadlines on this dashboard.');
      return;
    }
    localStorage.setItem(reminderKey, 'on');
    setReminders(true);
    notifyDueToday(dueToday, userId);
  }

  if (!connected) {
    return (
      <section className="canvas-dashboard calendar-connect-card">
        <div className="calendar-mark" aria-hidden="true">31</div>
        <div className="calendar-connect-copy">
          <span className="calendar-eyebrow">Canvas calendar</span>
          <h2>See what is due without connecting your Canvas account.</h2>
          <ol className="calendar-steps">
            <li><strong>Open Canvas Calendar</strong> and select Calendar Feed.</li>
            <li><strong>Copy the feed link</strong> shown by Canvas.</li>
            <li><strong>Paste it here</strong> to show due dates and reminders.</li>
          </ol>
          <div className="calendar-connect-form">
            <input
              type="url"
              value={feedUrl}
              onChange={event => setFeedUrl(event.target.value)}
              placeholder="https://your-school.edu/feeds/calendars/..."
              aria-label="Canvas calendar feed URL"
            />
            <button type="button" className="btn btn-green" onClick={() => connect(feedUrl.trim())} disabled={loading || !feedUrl.trim()}>
              {loading ? 'Checking calendar…' : 'Connect calendar'}
            </button>
          </div>
          <small>Your private feed link is saved to your Classroom account so deadlines reconnect automatically on your devices.</small>
          {error && <div className="canvas-inline-error" role="alert">{error}</div>}
        </div>
      </section>
    );
  }

  const todayIds = new Set(dueToday.map(item => item.id));
  const upcoming = items
    .filter(item => !todayIds.has(item.id) && dateValue(item) >= Date.now())
    .sort((a, b) => dateValue(a) - dateValue(b))
    .slice(0, 10);

  const rows = list => list.length ? list.map(item => (
    <a className="calendar-agenda-row" key={item.id} href={item.url || undefined} target={item.url ? '_blank' : undefined} rel={item.url ? 'noreferrer' : undefined}>
      <span className={`calendar-kind calendar-kind-${item.type}`}>{item.type}</span>
      <span className="calendar-agenda-copy">
        <strong>{item.title}</strong>
        <small>{dueLabel(item)}{item.course ? ` · ${item.course}` : ''}</small>
      </span>
      {item.url && <span aria-hidden="true">↗</span>}
    </a>
  )) : <p className="canvas-empty">Nothing here right now.</p>;

  return (
    <section className="canvas-dashboard calendar-dashboard">
      <header className="canvas-dashboard-header">
        <div>
          <span className="calendar-eyebrow">Canvas calendar</span>
          <h2>Your deadlines</h2>
        </div>
        <div className="calendar-actions">
          <button type="button" className="btn-outline" onClick={toggleReminders}>{reminders ? 'Reminders on' : 'Enable reminders'}</button>
          <button type="button" className="btn-outline" onClick={() => refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" className="calendar-disconnect" onClick={disconnect}>Disconnect</button>
        </div>
      </header>
      {error && <div className="canvas-inline-error" role="alert">{error}</div>}
      <div className="calendar-columns">
        <section className="calendar-column calendar-today">
          <header><h3>Due today</h3><span>{dueToday.length}</span></header>
          {rows(dueToday)}
        </section>
        <section className="calendar-column">
          <header><h3>Upcoming</h3><span>{upcoming.length}</span></header>
          {rows(upcoming)}
        </section>
      </div>
    </section>
  );
}
