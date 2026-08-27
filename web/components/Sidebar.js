import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { clearAuth, getUserEmail } from '../lib/api';
import FeedbackModal from './FeedbackModal';
import AcademicInfinityMark from './AcademicInfinityMark';

export default function Sidebar() {
  const router = useRouter();
  const path = router.pathname;
  const [email, setEmail] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setEmail(getUserEmail() || ''), []);

  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.type === 'mousedown' && menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const routeClose = () => setMenuOpen(false);
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    router.events.on('routeChangeStart', routeClose);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
      router.events.off('routeChangeStart', routeClose);
    };
  }, [router.events]);

  const mainTabs = [
    { label: 'Dashboard', href: '/dashboard', icon: dashboardIcon, match: '/dashboard' },
    { label: 'Create Guide', href: '/create', icon: createIcon, match: '/create' },
    { label: 'Study Guides', href: '/dashboard?view=guides', icon: guidesIcon, match: 'view=guides' },
    { label: 'Flashcards', href: '/flashcards', icon: flashcardsIcon, match: '/flashcards' },
    { label: 'SmartNotes', href: '/smartnotes', icon: smartNotesIcon, match: '/smartnotes' },
  ];
  const classesTabs = [{ label: 'Classes', href: '/dashboard?view=classes', icon: classesIcon, match: 'view=classes' }];

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

  function setAppearance(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  function NavTab({ tab }) {
    return (
      <button type="button" className={'sidebar-tab' + (isActive(tab) ? ' sidebar-tab-active' : '')} onClick={() => router.push(tab.href)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{tab.icon}</svg>
        <span>{tab.label}</span>
      </button>
    );
  }

  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <a href="/dashboard" className="sidebar-logo" aria-label="AutoStudyAI dashboard">
        <AcademicInfinityMark className="sidebar-logo-mark" />
        <span className="sidebar-logo-text">AutoStudyAI</span>
      </a>

      <div className="sidebar-nav">
        {mainTabs.map(tab => <NavTab key={tab.label} tab={tab} />)}
        <div className="sidebar-section-divider" />
        <div className="sidebar-section-label">Organize</div>
        {classesTabs.map(tab => <NavTab key={tab.label} tab={tab} />)}
      </div>

      <div className="sidebar-footer" ref={menuRef}>
        <button type="button" className="profile-trigger" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-haspopup="menu">
          <span className="sidebar-user-avatar">{email ? email[0].toUpperCase() : 'U'}</span>
          <span className="profile-trigger-copy"><strong>{email ? email.split('@')[0] : 'Your account'}</strong><small>{email || 'Account menu'}</small></span>
          <span aria-hidden="true">⌄</span>
        </button>
        {menuOpen && (
          <div className="profile-menu" role="menu" aria-label="Account menu">
            <div className="profile-menu-account"><strong>{email || 'Your account'}</strong><span>AutoStudyAI student</span></div>
            <div className="profile-menu-section">
              <span>Appearance</span>
              <div className="appearance-toggle" role="group" aria-label="Appearance">
                <button type="button" onClick={() => setAppearance('light')}>Light</button>
                <button type="button" onClick={() => setAppearance('dark')}>Dark</button>
              </div>
            </div>
            <button type="button" role="menuitem" onClick={() => router.push('/settings')}>Settings</button>
            <button type="button" role="menuitem" onClick={() => router.push('/settings#billing')}>Billing</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setShowFeedback(true); }}>Send feedback</button>
            <div className="profile-menu-divider" />
            <button type="button" role="menuitem" className="profile-menu-signout" onClick={logout}>Sign out</button>
          </div>
        )}
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
const smartNotesIcon = <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></>;
