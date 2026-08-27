import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AcademicInfinityMark from '../components/AcademicInfinityMark';
import { getToken, setToken, scheduleProactiveRefresh } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (getToken()) router.push('/dashboard');
  }, []);

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setError('');
    const email = String(new FormData(event.currentTarget).get('email') || '').trim().toLowerCase();

    try {
      const response = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) setForgotSent(true);
      else setError((await response.json()).detail || 'Unable to send reset email.');
    } catch {
      setError('Service unavailable. Try again in a moment.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setConfirmationSent(false);

    const form = new FormData(event.currentTarget);
    const body = {
      email: String(form.get('email') || '').trim().toLowerCase(),
      password: String(form.get('password') || ''),
    };
    if (isSignup) body.name = String(form.get('name') || '').trim();

    try {
      const response = await fetch(`${API}/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok && data.access_token) {
        setToken(data.access_token, data.email, data.refresh_token);
        scheduleProactiveRefresh();
        router.push('/dashboard');
      } else if (response.ok && isSignup) {
        setConfirmationSent(true);
      } else {
        setError(response.status === 401
          ? 'That email and password did not match. Try again or reset your password.'
          : data.detail || 'Authentication failed.');
      }
    } catch {
      setError('Service unavailable. Try again in a moment.');
    }
  }

  function showLogin() {
    setForgotMode(false);
    setForgotSent(false);
    setError('');
  }

  function selectMode(signup) {
    setIsSignup(signup);
    setConfirmationSent(false);
    setError('');
  }

  return (
    <>
      <Head>
        <title>AutoStudyAI — AI Study Guides, Notes & Flashcards</title>
        <meta name="description" content="Turn lectures, textbooks, and course pages into focused study materials." />
        <link rel="canonical" href="https://autostudyai.online" />
      </Head>

      <main className="login-page" style={{ '--login-backdrop': "url('/login-learning-backdrop.webp')" }}>
        <div className="login-split">
          <section className="login-panel-left">
            <div className="login-brand-mark">
              <AcademicInfinityMark className="login-academic-mark" />
              <div className="login-brand-name">AutoStudyAI</div>
              <h1 className="login-editorial-title">Learn from anything.</h1>
              <p className="login-brand-tagline">Capture educational material from any page and turn it into a focused study workspace.</p>
            </div>
          </section>

          <section className="login-panel-right">
            {forgotMode ? (
              <div className="login-form-wrap">
                <h2 className="login-form-title">Reset password</h2>
                {forgotSent ? (
                  <p className="login-success">If an account exists with that email, a reset link has been sent.</p>
                ) : (
                  <form onSubmit={handleForgotSubmit}>
                    <div className="login-input-row">
                      <input name="email" type="email" className="login-underline-input" placeholder="Email" autoComplete="email" required />
                    </div>
                    {error && <p className="login-form-error" role="alert">{error}</p>}
                    <button type="submit" className="btn login-cta-btn">Send reset link</button>
                  </form>
                )}
                <p className="login-switch-text"><a href="#" onClick={(event) => { event.preventDefault(); showLogin(); }}>Back to sign in</a></p>
              </div>
            ) : (
              <div className="login-form-wrap">
                <h2 className="login-form-title">{isSignup ? 'Create account' : 'Sign in'}</h2>
                <div className="login-mode-tabs" role="tablist" aria-label="Account access">
                  <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? 'active' : ''} onClick={() => selectMode(false)}>Sign in</button>
                  <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? 'active' : ''} onClick={() => selectMode(true)}>Create account</button>
                </div>

                <form key={isSignup ? 'signup' : 'login'} onSubmit={handleSubmit}>
                  {isSignup && (
                    <div className="login-input-row">
                      <input name="name" type="text" className="login-underline-input" placeholder="Full name" autoComplete="name" required />
                    </div>
                  )}
                  <div className="login-input-row">
                    <input name="email" type="email" className="login-underline-input" placeholder="Email" autoComplete="email" required />
                  </div>
                  <div className="login-input-row">
                    <input name="password" type="password" className="login-underline-input" placeholder="Password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required />
                  </div>

                  {!isSignup && <div className="login-forgot"><a href="#" onClick={(event) => { event.preventDefault(); setForgotMode(true); setError(''); }}>Forgot password?</a></div>}
                  {error && <p className="login-form-error" role="alert">{error}</p>}
                  {confirmationSent && <p className="login-success">Account created. Check your email to confirm it.</p>}
                  <button type="submit" className="btn login-cta-btn">{isSignup ? 'Create account' : 'Sign in'}</button>
                </form>

                <p className="login-switch-text">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <a href="#" onClick={(event) => { event.preventDefault(); selectMode(!isSignup); }}>{isSignup ? 'Sign in' : 'Sign up'}</a>
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
