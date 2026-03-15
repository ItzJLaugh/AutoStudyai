import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { clearAuth, getUserEmail } from '../lib/api';

export default function Sidebar() {
  const router = useRouter();
  const path = router.pathname;
  const [email, setEmail] = useState('');

  useEffect(() => {
    setEmail(getUserEmail() || '');
  }, []);

  const tabs = [
    { label: 'Dashboard', href: '/dashboard', icon: dashboardIcon, match: '/dashboard' },
    { label: 'Classes', href: '/dashboard?view=classes', icon: classesIcon, match: 'view=classes' },
    { label: 'Study Guides', href: '/dashboard?view=guides', icon: guidesIcon, match: 'view=guides' },
    { label: 'Flashcards', href: '/flashcards', icon: flashcardsIcon, match: '/flashcards' },
    { label: 'Billing', href: '/billing', icon: billingIcon, match: '/billing' },
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
        <div className="sidebar-email">{email}</div>
        <button className="sidebar-logout" onClick={logout}>Log Out</button>
      </div>
    </nav>
  );
}

const dashboardIcon = <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>;
const classesIcon = <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></>;
const guidesIcon = <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>;
const flashcardsIcon = <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 4v16" /></>;
const billingIcon = <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>;
