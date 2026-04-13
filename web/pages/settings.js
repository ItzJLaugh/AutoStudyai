import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../lib/auth';
import { apiFetch, getUserEmail } from '../lib/api';
import FeedbackModal from '../components/FeedbackModal';

export default function SettingsPage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('subscription');
  const [email, setEmail] = useState('');

  // Billing state
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState('');

  // Theme state
  const [theme, setTheme] = useState('dark');

  // Feedback modal
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setEmail(getUserEmail() || '');
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);

    if (router.query.success === 'true') {
      setActiveSection('subscription');
      setMessage('Welcome to Pro! Activating your subscription...');
      pollForPro();
    } else {
      if (router.query.cancelled === 'true') setMessage('Checkout cancelled — you are still on the free plan.');
      loadStatus();
    }
  }, [ready, router.query]);

  async function pollForPro(attempts = 0) {
    setLoading(true);
    const data = await apiFetch('/billing/status');
    if (data?.plan === 'pro') {
      setStatus(data);
      setMessage('Welcome to Pro! Your subscription is now active.');
      setLoading(false);
    } else if (attempts < 6) {
      setTimeout(() => pollForPro(attempts + 1), 2000);
    } else {
      if (data) setStatus(data);
      setMessage('Payment received! Your plan will update shortly — refresh if needed.');
      setLoading(false);
    }
  }

  async function loadStatus() {
    setLoading(true);
    const data = await apiFetch('/billing/status');
    if (data) setStatus(data);
    setLoading(false);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    const data = await apiFetch('/billing/create-checkout-session', { method: 'POST' });
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setMessage('Failed to start checkout. Please try again.');
      setUpgrading(false);
    }
  }

  async function handleStartTrial() {
    setUpgrading(true);
    const data = await apiFetch('/billing/start-trial', { method: 'POST' });
    if (data?.started) {
      setMessage('Your 30-day free trial has started! Enjoy unlimited access.');
      loadStatus();
    } else {
      setMessage('Failed to start trial. Please try again.');
    }
    setUpgrading(false);
  }

  async function handleCancel() {
    if (!confirm('Cancel your Pro subscription? You will keep access until the end of the billing period.')) return;
    setCancelling(true);
    const data = await apiFetch('/billing/cancel', { method: 'POST' });
    if (data?.cancelled) {
      setMessage('Subscription cancelled. You will retain Pro access until the end of your billing period.');
      loadStatus();
    } else {
      setMessage('Failed to cancel. Please try again or contact support.');
    }
    setCancelling(false);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  if (!ready) return null;

  const isPro = status?.plan === 'pro';
  const isTrial = status?.plan === 'trial';
  const isProOrTrial = isPro || isTrial;
  const guidesUsed = status?.guides_used ?? 0;
  const guidesLimit = status?.guides_limit ?? 2;
  const usagePct = isProOrTrial ? 100 : Math.min(100, (guidesUsed / guidesLimit) * 100);

  const sections = [
    { key: 'subscription', label: 'Subscription' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'account', label: 'Account' },
  ];

  return (
    <>
      <div className="settings-page">
        <h2>Settings</h2>

        <div className="settings-tabs">
          {sections.map(s => (
            <button
              key={s.key}
              className={'settings-tab' + (activeSection === s.key ? ' active' : '')}
              onClick={() => setActiveSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {message && <div className="settings-message">{message}</div>}

        {/* Subscription Section */}
        {activeSection === 'subscription' && (
          <div className="settings-section">
            {loading ? (
              <div className="settings-loading">Loading...</div>
            ) : (
              <>
                <div className="billing-current-plan">
                  <div className="plan-badge" data-plan={isProOrTrial ? 'pro' : 'free'}>
                    {isPro ? 'Pro' : isTrial ? 'Trial' : 'Free'}
                  </div>
                  <div className="plan-usage">
                    {isProOrTrial ? (
                      <span>Unlimited guide generations</span>
                    ) : (
                      <>
                        <span>{guidesUsed} / {guidesLimit} guides used this month</span>
                        <div className="usage-bar">
                          <div className="usage-bar-fill" style={{ width: usagePct + '%', background: usagePct >= 100 ? 'var(--error)' : 'var(--accent)' }} />
                        </div>
                      </>
                    )}
                  </div>
                  {isTrial && status?.period_end && (
                    <div className="plan-renews">
                      Trial ends {new Date(status.period_end).toLocaleDateString()}
                    </div>
                  )}
                  {isPro && status?.period_end && (
                    <div className="plan-renews">
                      Renews {new Date(status.period_end).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="billing-plans">
                  <div className={'plan-card' + (!isPro ? ' plan-card-current' : '')}>
                    <div className="plan-name">Free</div>
                    <div className="plan-price">$0 <span>/month</span></div>
                    <ul className="plan-features">
                      <li>2 AI study guide generations per month</li>
                      <li>Notes, study guides &amp; flashcards</li>
                      <li>Save guides to dashboard</li>
                      <li>Chat with content</li>
                    </ul>
                    {!isPro && <div className="plan-current-label">Current plan</div>}
                  </div>

                  <div className={'plan-card plan-card-pro' + (isProOrTrial ? ' plan-card-current' : '')}>
                    <div className="plan-name">Pro</div>
                    <div className="plan-price">$6.99 <span>/month</span></div>
                    <ul className="plan-features">
                      <li><strong>Unlimited</strong> guide generations</li>
                      <li>Everything in Free</li>
                      <li>Priority AI processing</li>
                      <li>Cancel anytime</li>
                    </ul>
                    {isPro ? (
                      <div className="plan-actions">
                        <div className="plan-current-label">Current plan</div>
                        <button className="btn-cancel" onClick={handleCancel} disabled={cancelling}>
                          {cancelling ? 'Cancelling...' : 'Cancel subscription'}
                        </button>
                      </div>
                    ) : isTrial ? (
                      <div className="plan-actions">
                        <div className="plan-current-label">Free trial active</div>
                        <button className="btn-upgrade" onClick={handleUpgrade} disabled={upgrading}>
                          {upgrading ? 'Redirecting...' : 'Subscribe — $6.99/mo'}
                        </button>
                      </div>
                    ) : status?.trial_used ? (
                      <button className="btn-upgrade" onClick={handleUpgrade} disabled={upgrading}>
                        {upgrading ? 'Redirecting...' : 'Upgrade to Pro'}
                      </button>
                    ) : (
                      <div className="plan-actions">
                        <button className="btn-upgrade" onClick={handleStartTrial} disabled={upgrading}>
                          {upgrading ? 'Starting...' : 'Start Free Trial — 30 days'}
                        </button>
                        <div className="plan-trial-note">No credit card required. Won&apos;t auto-charge.</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Appearance Section */}
        {activeSection === 'appearance' && (
          <div className="settings-section">
            <div className="settings-row">
              <div>
                <div className="settings-label">Theme</div>
                <div className="settings-desc">Switch between dark and light mode</div>
              </div>
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
          </div>
        )}

        {/* Account Section */}
        {activeSection === 'account' && (
          <div className="settings-section">
            <div className="settings-row">
              <div>
                <div className="settings-label">Email</div>
                <div className="settings-desc">{email || 'Not available'}</div>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Send Feedback</div>
                <div className="settings-desc">Report a bug or suggest a feature</div>
              </div>
              <button className="btn-feedback" onClick={() => setShowFeedback(true)}>
                Send Feedback
              </button>
            </div>
            <div className="settings-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/honor-code">Honor Code</a>
            </div>
          </div>
        )}
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

      <style jsx>{`
        .settings-page { max-width: 960px; padding: 32px; }
        h2 { margin-bottom: 24px; font-size: 1.6rem; }
        .settings-tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border-default); padding-bottom: 12px; }
        .settings-tab { background: none; border: none; color: var(--text-muted); font-size: 0.95rem; padding: 8px 16px; cursor: pointer; border-radius: 6px; font-weight: 500; }
        .settings-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
        .settings-tab.active { color: var(--accent); background: var(--accent-glow); }
        .settings-message { background: var(--accent-glow); border: 1px solid var(--border-default); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: var(--text-primary); }
        .settings-loading { color: var(--text-muted); }
        .settings-section { animation: fadeIn 0.2s ease; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-subtle); }
        .settings-label { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
        .settings-desc { font-size: 0.85rem; color: var(--text-muted); margin-top: 2px; }
        .theme-toggle { padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-default); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-size: 0.9rem; font-weight: 500; }
        .theme-toggle:hover { border-color: var(--accent); }
        .btn-feedback { padding: 8px 20px; border-radius: 8px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; font-size: 0.9rem; font-weight: 500; }
        .btn-feedback:hover { background: var(--accent-glow); }
        .settings-links { display: flex; gap: 16px; padding-top: 24px; margin-top: 8px; }
        .settings-links a { font-size: 0.85rem; color: var(--text-muted); }
        .settings-links a:hover { color: var(--accent); }

        /* Billing styles (from billing page) */
        .billing-current-plan { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
        .plan-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; background: var(--bg-tertiary); color: var(--text-muted); margin-bottom: 12px; }
        .plan-badge[data-plan="pro"] { background: var(--accent); color: #fff; }
        .plan-usage { font-size: 0.95rem; color: var(--text-secondary); }
        .usage-bar { height: 8px; background: var(--bg-tertiary); border-radius: 4px; margin-top: 8px; overflow: hidden; }
        .usage-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
        .plan-renews { font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; }
        .billing-plans { display: flex; gap: 20px; }
        .plan-card { flex: 1; border: 2px solid var(--border-default); border-radius: 16px; padding: 24px; }
        .plan-card-pro { border-color: var(--accent); }
        .plan-card-current { box-shadow: 0 0 0 3px var(--accent-glow); }
        .plan-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); }
        .plan-price { font-size: 2rem; font-weight: 800; margin-bottom: 16px; color: var(--text-primary); }
        .plan-price span { font-size: 1rem; font-weight: 400; color: var(--text-muted); }
        .plan-features { list-style: none !important; list-style-type: none !important; padding: 0 !important; margin: 0 0 20px; }
        .plan-features li { list-style: none; list-style-type: none; padding: 6px 0; font-size: 0.9rem; color: var(--text-secondary); display: flex; align-items: baseline; gap: 6px; }
        .plan-features li::before { content: "✓"; color: var(--accent); font-weight: 700; flex-shrink: 0; }
        .plan-current-label { color: var(--accent); font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; }
        .btn-upgrade { width: 100%; padding: 12px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .btn-upgrade:hover { background: var(--accent-secondary); }
        .btn-upgrade:disabled { opacity: 0.6; cursor: default; }
        .btn-cancel { background: none; border: none; color: var(--error); font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0; }
        .btn-cancel:disabled { opacity: 0.6; cursor: default; }
        .plan-trial-note { font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; text-align: center; }
        @media (max-width: 600px) { .billing-plans { flex-direction: column; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
