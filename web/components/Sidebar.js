import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { clearAuth, getUserEmail } from '../lib/api';
import FeedbackModal from './FeedbackModal';

export default function Sidebar() {
  const router = useRouter();
  const path = router.pathname;
  const [email, setEmail] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    setEmail(getUserEmail() || '');
  }, []);

  const tabs = [
    { label: 'Dashboard', href: '/dashboard', icon: dashboardIcon, match: '/dashboard' },
    { label: 'Create Guide', href: '/create', icon: createIcon, match: '/create' },
    { label: 'Classes', href: '/dashboard?view=classes', icon: classesIcon, match: 'view=classes' },
    { label: 'Study Guides', href: '/dashboard?view=guides', icon: guidesIcon, match: 'view=guides' },
    { label: 'Flashcards', href: '/flashcards', icon: flashcardsIcon, match: '/flashcards' },
    { label: 'Settings', href: '/settings', icon: settingsIcon, match: '/settings' },
  ];

  function isActive(tab) {
    if (tab.match === '/dashboard') return path === '/dashboard' && !router.query.view;
    if (tab.match === '/flashcards') return path.startsWith('/flashcards');
    if (tab.match.startsWith('view=')) return router.query.view === tab.match.split('=')[1];
    return path.startsWith(tab.match);
  }

  function logout() {
    clearAuth();
    router.push('/');
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <h1><span>Auto</span>StudyAI</h1>
      </div>

      <div className="sidebar-nav">
        {tabs.map(tab => (
          <div
            key={tab.label}
            className={'sidebar-tab' + (isActive(tab) ? ' sidebar-tab-active' : '')}
            onClick={() => router.push(tab.href)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {tab.icon}
            </svg>
            {tab.label}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-feedback" onClick={() => setShowFeedback(true)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Send Feedback
        </button>
        <div className="sidebar-email">{email}</div>
        <button className="sidebar-logout" onClick={logout}>Log Out</button>
      </div>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </nav>
  );
}

const dashboardIcon = <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>;
const classesIcon = <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></>;
const guidesIcon = <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>;
const flashcardsIcon = <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 4v16" /></>;
const createIcon = <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>;
const settingsIcon = <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>;
