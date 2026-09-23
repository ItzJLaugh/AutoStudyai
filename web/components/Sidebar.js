import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, cacheUserIdentity, clearAuth, getUserEmail, getUserName } from '../lib/api';
import FeedbackModal from './FeedbackModal';
import AcademicInfinityMark from './AcademicInfinityMark';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', match: '/dashboard' },
  { label: 'Study Guides', href: '/dashboard?view=guides', match: 'view=guides' },
  { label: 'Calendar', href: '/dashboard?view=calendar', match: 'view=calendar' },
  { label: 'SmartNotes', href: '/smartnotes', match: '/smartnotes' },
];

export default function Sidebar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setEmail(getUserEmail() || '');
    setName(getUserName() || '');
    setTheme(localStorage.getItem('theme') || 'light');

    let active = true;
    apiFetch('/auth/me').then(identity => {
      if (!active || !identity?.user_id) return;
      cacheUserIdentity(identity);
      setEmail(identity.email || '');
      setName(identity.name || '');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function closeOnDocument(event) {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.type === 'mousedown' && menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    const closeOnRoute = () => setMenuOpen(false);
    document.addEventListener('keydown', closeOnDocument);
    document.addEventListener('mousedown', closeOnDocument);
    router.events.on('routeChangeStart', closeOnRoute);
    return () => {
      document.removeEventListener('keydown', closeOnDocument);
      document.removeEventListener('mousedown', closeOnDocument);
      router.events.off('routeChangeStart', closeOnRoute);
    };
  }, [router.events]);

  function isActive(item) {
    if (item.match === '/dashboard') return router.pathname === '/dashboard' && !router.query.view;
    if (item.match === 'view=guides') return (router.pathname === '/dashboard' && router.query.view === 'guides') || router.pathname.startsWith('/flashcards') || router.pathname === '/create';
    if (item.match.startsWith('view=')) return router.pathname === '/dashboard' && router.query.view === item.match.split('=')[1];
    return router.pathname.startsWith(item.match);
  }

  function setAppearance(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    setTheme(theme);
  }

  function signOut() {
    clearAuth();
    router.push('/');
  }

  const displayName = name || (email ? email.split('@')[0] : 'Your profile');
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'CC';

  return (
    <header className="top-navigation">
      <a className="top-navigation-brand" href="/dashboard" aria-label="CordiaClassroom dashboard">
        <AcademicInfinityMark className="top-navigation-mark" />
        <span>CordiaClassroom</span>
        <small className="top-navigation-beta">beta</small>
      </a>

      <nav className="top-navigation-links" aria-label="Primary navigation">
        {navItems.map(item => (
          <button key={item.label} type="button" className={isActive(item) ? 'active' : ''} onClick={() => router.push(item.href)}>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="account-menu" ref={menuRef}>
        <button type="button" className="account-avatar" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Open account menu">
          {initials}
        </button>

        {menuOpen && (
          <div className="account-menu-panel" role="menu" aria-label="Account menu">
            <div className="account-menu-identity">
              <strong>{displayName}</strong>
              <span>{email || 'CordiaClassroom account'}</span>
            </div>
            <button type="button" role="menuitem" onClick={() => router.push('/settings')}>Your profile</button>
            <button type="button" role="menuitem" onClick={() => router.push('/billing')}>Billing</button>
            <button type="button" role="menuitem" onClick={() => router.push('/dashboard')}>Workspace</button>
            <button type="button" role="menuitem" onClick={() => router.push('/install-extension')}>Chrome extension</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setShowFeedback(true); }}>Feedback</button>
            <div className="account-theme-row">
              <span>Appearance</span>
              <button type="button" className={theme === 'light' ? 'active' : ''} aria-pressed={theme === 'light'} onClick={() => setAppearance('light')}>Light</button>
              <button type="button" className={theme === 'dark' ? 'active' : ''} aria-pressed={theme === 'dark'} onClick={() => setAppearance('dark')}>Dark</button>
            </div>
            <button type="button" role="menuitem" className="account-signout" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </header>
  );
}
