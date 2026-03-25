import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getToken, setToken } from '../lib/api';

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
        router.push('/dashboard');
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
        <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input
              type="text" placeholder="Full Name (optional)" value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
          />
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
    `}</style>
    </>
  );
}
