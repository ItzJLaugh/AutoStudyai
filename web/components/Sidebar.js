import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { clearAuth, getUserEmail, apiFetch } from '../lib/api';

export default function Sidebar({ isOpen, onClose }) {
  const router = useRouter();
  const path = router.pathname;
  const [email, setEmail] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'

  useEffect(() => {
    setEmail(getUserEmail() || '');
    const saved = localStorage.getItem('theme');
    const dark = saved !== 'light';
    setIsDark(dark);
    document.body.classList.toggle('light-mode', !dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.body.classList.toggle('light-mode', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  async function submitFeedback(e) {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setFeedbackStatus('sending');
    const res = await apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({ message: feedbackMsg.trim(), type: 'general' })
    });
    if (res?.success) {
      setFeedbackStatus('sent');
      setFeedbackMsg('');
      setTimeout(() => { setShowFeedback(false); setFeedbackStatus(''); }, 1800);
    } else {
      setFeedbackStatus('error');
    }
  }

  const tabs = [
    { label: 'Dashboard', href: '/dashboard', icon: dashboardIcon, match: '/dashboard' },
    { label: 'Classes', href: '/dashboard?view=classes', icon: classesIcon, match: 'view=classes' },
    { label: 'Study Guides', href: '/dashboard?view=guides', icon: guidesIcon, match: 'view=guides' },
    { label: 'Create Guide', href: '/create', icon: createIcon, match: '/create' },
    { label: 'Flashcards', href: '/flashcards', icon: flashcardsIcon, match: '/flashcards' },
    { label: 'Billing', href: '/billing', icon: billingIcon, match: '/billing' },
  ];

  function isActive(tab) {
    if (tab.match === '/dashboard') return path === '/dashboard' && !router.query.view;
    if (tab.match === '/flashcards') return path.startsWith('/flashcards');
    if (tab.match.startsWith('view=')) return router.query.view === tab.match.split('=')[1];
    return path.startsWith(tab.match);
  }

  function navigate(href) {
    router.push(href);
    if (onClose) onClose();
  }

  function logout() {
    clearAuth();
    router.push('/');
  }

  return (
    <>
      <nav className={'sidebar' + (isOpen ? ' open' : '')}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1><span>Auto</span>StudyAI</h1>
          {/* Mobile close button */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="sidebar-nav">
          {tabs.map(tab => (
            <div
              key={tab.label}
              className={'sidebar-tab' + (isActive(tab) ? ' sidebar-tab-active' : '')}
              onClick={() => navigate(tab.href)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {tab.icon}
              </svg>
              {tab.label}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-email">{email}</div>

          {/* Dark/light toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '100%', padding: '6px 14px', marginBottom: 6,
              background: 'none', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius)', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.85em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          {/* Feedback button */}
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              width: '100%', padding: '6px 14px', marginBottom: 6,
              background: 'none', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius)', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.85em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            💬 Send Feedback
          </button>

          <button className="sidebar-logout" onClick={logout}>Log Out</button>
        </div>
      </nav>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="confirm-overlay" style={{ zIndex: 300 }}>
          <div className="confirm-dialog" style={{ maxWidth: 460 }}>
            <h3 style={{ marginBottom: 6 }}>Send Feedback</h3>
            <p style={{ marginBottom: 16 }}>Found a bug? Have a suggestion? We'd love to hear from you.</p>
            {feedbackStatus === 'sent' ? (
              <div style={{ color: 'var(--success)', textAlign: 'center', padding: '16px 0', fontWeight: 600 }}>
                ✓ Feedback sent — thank you!
              </div>
            ) : (
              <form onSubmit={submitFeedback}>
                <textarea
                  value={feedbackMsg}
                  onChange={e => setFeedbackMsg(e.target.value)}
                  placeholder="Describe the issue or idea..."
                  required
                  style={{
                    width: '100%', minHeight: 120, padding: '10px 12px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                    borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.9em',
                    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
                    marginBottom: 14,
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                />
                {feedbackStatus === 'error' && (
                  <p style={{ color: 'var(--error)', fontSize: '0.85em', marginBottom: 10 }}>
                    Failed to send. Please try again.
                  </p>
                )}
                <div className="confirm-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => { setShowFeedback(false); setFeedbackMsg(''); setFeedbackStatus(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={feedbackStatus === 'sending' || !feedbackMsg.trim()}
                  >
                    {feedbackStatus === 'sending' ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const dashboardIcon = <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>;
const classesIcon = <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></>;
const guidesIcon = <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>;
const createIcon = <><path d="M12 5v14M5 12h14" /></>;
const flashcardsIcon = <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 4v16" /></>;
const billingIcon = <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>;
