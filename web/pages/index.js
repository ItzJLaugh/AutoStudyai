import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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
    <div className="login-page">
      <h1 className="login-title">AutoStudyAI</h1>
      <div className="login-box">
        {forgotMode ? (
          <>
            <h2>Reset Password</h2>
            {forgotSent ? (
              <p style={{ color: 'var(--accent)', fontSize: '0.9em', marginBottom: 16 }}>
                If an account exists with that email, a reset link has been sent. Check your inbox.
              </p>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <input
                  type="email" placeholder="Your email address" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)} required
                />
                {error && <p style={{ color: 'var(--error)', marginBottom: 10, fontSize: '0.9em' }}>{error}</p>}
                <button type="submit" className="btn" style={{ width: '100%', padding: 12 }}>
                  Send Reset Link
                </button>
              </form>
            )}
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
              <a href="#" onClick={e => { e.preventDefault(); setForgotMode(false); setForgotSent(false); setError(''); }}>
                Back to login
              </a>
            </p>
          </>
        ) : (
        <>
        <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input
              type="text" placeholder="Full Name" value={name}
              onChange={e => setName(e.target.value)} required
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6}
              style={{ marginBottom: 0 }}
            />
            <button type="button" className="toggle-pw-btn" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {!isSignup && (
            <p style={{ textAlign: 'right', marginTop: 2, marginBottom: 10, fontSize: '0.85em' }}>
              <a href="#" onClick={e => { e.preventDefault(); setForgotMode(true); setError(''); setForgotEmail(email); }}>
                Forgot password?
              </a>
            </p>
          )}
          {isSignup && (
            <>
              <SearchableSelect
                options={universities}
                value={university}
                onChange={setUniversity}
                placeholder="University (optional)"
                loading={dataLoading}
              />
              <SearchableSelect
                options={majors}
                value={major}
                onChange={setMajor}
                placeholder="Major (optional)"
                loading={dataLoading}
              />
            </>
          )}
          {error && <p style={{ color: 'var(--error)', marginBottom: 10, fontSize: '0.9em' }}>{error}</p>}
          {confirmationSent && <p style={{ color: 'var(--accent)', marginBottom: 10, fontSize: '0.9em' }}>Account created! Check your email to confirm before logging in.</p>}
          <button type="submit" className="btn" style={{ width: '100%', padding: 12 }}>
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a href="#" onClick={e => { e.preventDefault(); setIsSignup(!isSignup); setError(''); }}>
            {isSignup ? 'Login' : 'Sign Up'}
          </a>
        </p>
        </>
        )}
      </div>

      <div className="login-features">
        <h3>Why use AutoStudyAI?</h3>
        <div className="login-feature-item">
          <strong>Instant Extraction</strong>
          <p>Unlike any other study platform, AutoStudyAI allows you to skip the copy and paste/upload process. Simply navigate to the material you want to extract and click the &quot;Capture Content&quot; button within the extension. That&apos;s it!</p>
        </div>
        <div className="login-feature-item">
          <strong>NCLEX Question Generation</strong>
          <span className="login-feature-tag">Nursing User Group</span>
          <p>There is no other platform that offers NCLEX question generation. AutoStudyAI is the one platform to achieve this task to assist Nursing students in making study guides exactly like their exams with two button clicks.</p>
        </div>
        <div className="login-feature-item">
          <strong>AutoStudyAI Never Allows the AI to Search for Answers on the Web!</strong>
          <p>The main issue with simply asking an LLM to create a study guide is that the answers and questions are DIRECTLY from your class material. AutoStudyAI makes this super simple and easy. It only uses the context that was captured as its knowledge!</p>
        </div>
        <div className="login-feature-item">
          <strong>AI Chat</strong>
          <p>Allows the user to get a regular response about the study guide; a detailed (longer) response; or an example response, which takes the users keyword in their AI chat prompt and provides an example that will help you better understand!</p>
        </div>
        <div className="login-feature-item">
          <strong>The Cost</strong>
          <p>First off, a one month free trial&hellip; that DOES NOT automatically start the subscription. Nobody wants to do a free trial and forget to cancel it! Don&apos;t worry, I&apos;m a college student too and have too much to think about, also. Not only is there a benefit there, but we beat other platforms by offering every single imaginable feature for $6.99 a month.</p>
        </div>
        <div className="login-feature-item">
          <strong>Users Are &quot;Cofounders&quot;</strong>
          <p>Got a new recommendation or said something along the lines of &quot;I wish it would do this?&quot; Send feedback! Our goal is to get your recommendation ASAP! This is a college study platform made for the people.</p>
        </div>
        <div className="login-feature-founder">
          Founder: Jackson Laughlin
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
        max-height: 200px;
        overflow-y: auto;
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        margin-top: 4px;
        z-index: 100;
        box-shadow: var(--shadow-md);
      }
      .select-option {
        padding: 8px 12px;
        font-size: 0.9em;
        color: var(--text-secondary);
        cursor: pointer;
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
