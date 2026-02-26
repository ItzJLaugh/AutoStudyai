import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToken, setToken } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    if (getToken()) router.push('/dashboard');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
    </Head>
    <div className="login-page">
      <h1 className="login-title">AutoStudyAI</h1>
      <div className="login-box">
        <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
          />
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
    </>
  );
}
