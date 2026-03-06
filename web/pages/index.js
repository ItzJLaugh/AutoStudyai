import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToken, setToken } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Academic floating icons configuration
const FLOAT_ICONS = [
  { symbol: '∑', top: '8%', left: '6%', size: '2.2em', delay: '0s', duration: '7s' },
  { symbol: 'π', top: '15%', right: '8%', size: '2.6em', delay: '1.2s', duration: '9s' },
  { symbol: '∫', top: '72%', left: '4%', size: '2.8em', delay: '0.5s', duration: '8s' },
  { symbol: 'Δ', top: '55%', right: '5%', size: '2em', delay: '2s', duration: '10s' },
  { symbol: '⚗', top: '30%', left: '2%', size: '1.8em', delay: '3s', duration: '7.5s' },
  { symbol: '🧬', top: '85%', right: '10%', size: '1.7em', delay: '0.8s', duration: '9.5s' },
  { symbol: 'α', top: '20%', left: '14%', size: '1.9em', delay: '1.8s', duration: '8.5s' },
  { symbol: '⚕', top: '65%', right: '14%', size: '1.8em', delay: '2.5s', duration: '7s' },
  { symbol: '√', top: '42%', left: '7%', size: '2em', delay: '0.3s', duration: '10.5s' },
  { symbol: '🌿', top: '90%', left: '20%', size: '1.6em', delay: '4s', duration: '8s' },
  { symbol: 'φ', top: '10%', right: '20%', size: '1.7em', delay: '1.5s', duration: '9s' },
  { symbol: 'λ', top: '78%', left: '40%', size: '1.5em', delay: '3.5s', duration: '7.5s' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    if (getToken()) router.push('/dashboard');
  }, []);

  function switchMode(toSignup) {
    setIsSignup(toSignup);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    try {
      const resp = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
      <style>{`
        @keyframes floatIcon {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
          33%  { transform: translateY(-18px) rotate(4deg); opacity: 0.28; }
          66%  { transform: translateY(-8px) rotate(-3deg); opacity: 0.22; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
        }
        .float-icon {
          position: absolute;
          pointer-events: none;
          user-select: none;
          animation: floatIcon var(--dur) ease-in-out var(--delay) infinite;
          opacity: 0.18;
          color: var(--accent);
          font-style: normal;
          z-index: 0;
        }
        .login-box-signup {
          border-color: rgba(79, 195, 247, 0.25) !important;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(79, 195, 247, 0.1) !important;
        }
        .password-wrap {
          position: relative;
          margin-bottom: 12px;
        }
        .password-wrap input {
          padding-right: 44px;
          margin-bottom: 0;
        }
        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 1em;
          padding: 0;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        .eye-btn:hover { color: var(--text-secondary); }
        .signup-badge {
          display: inline-block;
          background: rgba(79,195,247,0.12);
          border: 1px solid rgba(79,195,247,0.25);
          color: var(--accent);
          font-size: 0.72em;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 2px 10px;
          border-radius: 20px;
          margin-bottom: 10px;
        }
        .ext-hint {
          background: rgba(79,195,247,0.07);
          border: 1px solid rgba(79,195,247,0.15);
          border-radius: 8px;
          padding: 10px 14px;
          margin-top: 16px;
          font-size: 0.8em;
          color: var(--text-secondary);
          text-align: center;
          line-height: 1.5;
        }
        .ext-hint a { color: var(--accent); }
        .pw-match {
          font-size: 0.75em;
          margin-top: -8px;
          margin-bottom: 10px;
          padding-left: 2px;
        }
        .pw-match.ok { color: var(--success); }
        .pw-match.no { color: var(--error); }
      `}</style>
    </Head>
    <div className="login-page">
      {/* Floating academic icons */}
      {FLOAT_ICONS.map((icon, i) => (
        <span
          key={i}
          className="float-icon"
          style={{
            top: icon.top,
            left: icon.left,
            right: icon.right,
            fontSize: icon.size,
            '--dur': icon.duration,
            '--delay': icon.delay,
          }}
        >
          {icon.symbol}
        </span>
      ))}

      <h1 className="login-title">AutoStudyAI</h1>

      <div className={'login-box' + (isSignup ? ' login-box-signup' : '')} style={{ position: 'relative', zIndex: 1 }}>
        {isSignup && (
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <span className="signup-badge">Create Account</span>
          </div>
        )}
        <h2 style={{ color: isSignup ? 'var(--text-primary)' : 'var(--accent)' }}>
          {isSignup ? 'Join AutoStudyAI' : 'Welcome Back'}
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <div className="password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>

          {isSignup && (
            <>
              <div className="password-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1}>
                  {showConfirmPassword ? '🙈' : '👁'}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className={'pw-match ' + (password === confirmPassword ? 'ok' : 'no')}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </>
          )}

          {error && <p style={{ color: 'var(--error)', marginBottom: 10, fontSize: '0.9em' }}>{error}</p>}

          <button type="submit" className="btn" style={{ width: '100%', padding: 12 }}>
            {isSignup ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a href="#" onClick={e => { e.preventDefault(); switchMode(!isSignup); }}>
            {isSignup ? 'Login' : 'Sign Up'}
          </a>
        </p>

        {isSignup && (
          <div className="ext-hint">
            After signing up, download the free{' '}
            <a href="https://chromewebstore.google.com/detail/autostudyai/eddmfjcnfjfbaknmeccjbjdgpeipjbaf" target="_blank" rel="noopener noreferrer">
              Chrome Extension
            </a>
            {' '}— it automatically captures your lecture slides and course notes to build study guides instantly.
          </div>
        )}
      </div>
    </div>
    </>
  );
}
