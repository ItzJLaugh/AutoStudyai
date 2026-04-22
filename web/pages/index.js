import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import LoginBackground from '../components/LoginBackground';
import { getToken, setToken, scheduleProactiveRefresh } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Searchable dropdown component for university/major selection
function SearchableSelect({ options, value, onChange, placeholder, loading }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 80)
    : options.slice(0, 80);

  return (
    <div className="searchable-select" ref={ref}>
      <input
        type="text"
        placeholder={value || placeholder}
        value={open ? query : (value || '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        className={value ? 'has-value' : ''}
        autoComplete="off"
      />
      {value && (
        <button type="button" className="clear-btn" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}>
          &times;
        </button>
      )}
      {open && (
        <div className="select-dropdown">
          {loading ? (
            <div className="select-option disabled">Loading...</div>
          ) : (
            <>
              <div
                className={'select-option' + (value === 'Other' ? ' selected' : '')}
                onClick={() => { onChange('Other'); setOpen(false); setQuery(''); }}
              >
                Other
              </div>
              {filtered.map((o, i) => (
                <div
                  key={i}
                  className={'select-option' + (value === o ? ' selected' : '')}
                  onClick={() => { onChange(o); setOpen(false); setQuery(''); }}
                >
                  {o}
                </div>
              ))}
              {filtered.length === 0 && <div className="select-option disabled">No results found</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Data for dropdowns
  const [universities, setUniversities] = useState([]);
  const [majors, setMajors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.push('/dashboard');
  }, []);

  // Load dropdown data when switching to signup mode
  useEffect(() => {
    if (isSignup && universities.length === 0) {
      setDataLoading(true);
      Promise.all([
        fetch('/data/universities.json').then(r => r.json()),
        fetch('/data/majors.json').then(r => r.json())
      ]).then(([uniData, majorData]) => {
        setUniversities(uniData);
        setMajors(majorData);
      }).catch(() => {
        // Silently fail — dropdowns will just be empty
      }).finally(() => setDataLoading(false));
    }
  }, [isSignup]);

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const resp = await fetch(API + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      if (resp.ok) {
        setForgotSent(true);
      } else {
        const data = await resp.json();
        setError(data.detail || 'Something went wrong');
      }
    } catch {
      setError('Cannot connect to server');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    const body = { email, password };
    if (isSignup) {
      if (name.trim()) body.name = name.trim();
      if (university) body.university = university;
      if (major) body.major = major;
    }
    try {
      const resp = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (resp.ok && data.access_token) {
        setToken(data.access_token, data.email, data.refresh_token);
        scheduleProactiveRefresh();
        router.push('/dashboard');
      } else if (resp.ok && isSignup && !data.access_token) {
        setConfirmationSent(true);
      } else {
        setError(data.detail || 'Authentication failed');
      }
    } catch {
      setError('Cannot connect to server');
    }
  }

  return (
    <>
    <Head>
      <title>AutoStudyAI — AI Study Guides, Notes & Flashcards</title>
      <meta name="description" content="AutoStudyAI instantly turns any lecture, textbook, or course page into study guides, notes, and flashcards using AI. Install the Chrome extension and start studying smarter." />
      <meta name="keywords" content="AutoStudyAI, AI study guide, study tool, flashcards, notes generator, Chrome extension, student AI" />
      <meta property="og:title" content="AutoStudyAI — AI Study Guides, Notes & Flashcards" />
      <meta property="og:description" content="Turn any lecture or textbook into study materials instantly with AI." />
      <meta property="og:url" content="https://autostudyai.online" />
      <meta property="og:type" content="website" />
      <link rel="canonical" href="https://autostudyai.online" />
    </Head>
    <LoginBackground />
    <div className="login-page">
      <div className="login-split">

        {/* Left brand panel */}
        <div className="login-panel-left">
          <div className="login-brand-mark">
            <img src="/icon128.png" alt="AutoStudyAI" className="login-brand-img" />
            <div className="login-brand-name">
              <span className="login-brand-blue">Auto</span><span className="login-brand-dark">Study</span><span className="login-brand-blue">AI</span>
            </div>
            <p className="login-brand-tagline">Study guides in a single click ~<br />AI Chat bot integration ~<br />Eliminating the extensive study guide creation process</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-panel-right">
          {forgotMode ? (
            <div className="login-form-wrap">
              <h2 className="login-form-title">Reset Password</h2>
              {forgotSent ? (
                <p style={{ color: 'var(--accent)', fontSize: '0.88em', textAlign: 'center', lineHeight: 1.5 }}>
                  If an account exists with that email, a reset link has been sent. Check your inbox.
                </p>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  <div className="login-input-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input type="email" className="login-underline-input" placeholder="Your email address" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                  </div>
                  {error && <p style={{ color: 'var(--error)', marginBottom: 12, fontSize: '0.85em' }}>{error}</p>}
                  <button type="submit" className="btn login-cta-btn">Send Reset Link</button>
                </form>
              )}
              <p className="login-switch-text">
                <a href="#" onClick={e => { e.preventDefault(); setForgotMode(false); setForgotSent(false); setError(''); }}>
                  &#8592; Back to login
                </a>
              </p>
            </div>
          ) : (
            <div className="login-form-wrap">
              <h2 className="login-form-title">{isSignup ? 'Create Account' : 'Login Your Account'}</h2>
              <form onSubmit={handleSubmit}>
                {isSignup && (
                  <div className="login-input-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input type="text" className="login-underline-input" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                )}
                <div className="login-input-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input type="email" className="login-underline-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="login-input-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input type={showPassword ? 'text' : 'password'} className="login-underline-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {!isSignup && (
                  <div className="login-forgot">
                    <a href="#" onClick={e => { e.preventDefault(); setForgotMode(true); setError(''); setForgotEmail(email); }}>
                      Forgot password?
                    </a>
                  </div>
                )}
                {isSignup && (
                  <>
                    <SearchableSelect options={universities} value={university} onChange={setUniversity} placeholder="University (optional)" loading={dataLoading} />
                    <SearchableSelect options={majors} value={major} onChange={setMajor} placeholder="Major (optional)" loading={dataLoading} />
                  </>
                )}
                {error && <p style={{ color: 'var(--error)', marginBottom: 10, fontSize: '0.85em' }}>{error}</p>}
                {confirmationSent && <p style={{ color: 'var(--accent)', marginBottom: 10, fontSize: '0.85em' }}>Account created! Check your email to confirm before logging in.</p>}
                <button type="submit" className="btn login-cta-btn">
                  {isSignup ? 'Sign Up' : 'Login'}
                </button>
              </form>
              <p className="login-switch-text">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <a href="#" onClick={e => { e.preventDefault(); setIsSignup(!isSignup); setError(''); }}>
                  {isSignup ? 'Login' : 'Sign Up'}
                </a>
              </p>
            </div>
          )}
        </div>

      </div>
    </div>

    <style jsx>{`
      .searchable-select {
        position: relative;
        margin-bottom: 12px;
      }
      .searchable-select input {
        width: 100%;
        padding: 10px 32px 10px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-default);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        font-size: 0.95em;
      }
      .searchable-select input::placeholder {
        color: var(--text-muted);
      }
      .searchable-select input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .clear-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.2em;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .clear-btn:hover {
        color: var(--text-primary);
      }
      .select-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 168px;
        overflow-y: auto;
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        margin-top: 4px;
        z-index: 200;
        box-shadow: var(--shadow-md);
      }
      .select-option {
        padding: 8px 12px;
        font-size: 0.9em;
        color: var(--text-secondary);
        cursor: pointer;
        user-select: none;
      }
      .select-option:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      .select-option.selected {
        color: var(--accent);
        font-weight: 600;
      }
      .select-option.disabled {
        color: var(--text-muted);
        cursor: default;
        font-style: italic;
      }
      .select-option.disabled:hover {
        background: none;
      }
      .password-wrapper {
        position: relative;
        margin-bottom: 10px;
      }
      .toggle-pw-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
      }
      .toggle-pw-btn:hover {
        color: var(--text-primary);
      }
    `}</style>
    </>
  );
}
