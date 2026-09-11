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
  const [managing, setManaging] = useState(false);
  const [billingInterval, setBillingInterval] = useState('monthly');
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

    if (router.query.billing === 'success') {
      setActiveSection('subscription');
      setMessage('Payment received. Activating CordiaClassroom Plus...');
      pollForPlus();
    } else {
      if (router.query.billing === 'cancelled') setMessage('Checkout cancelled. Your plan did not change.');
      loadStatus();
    }
  }, [ready, router.query]);

  async function pollForPlus(attempts = 0) {
    setLoading(true);
    const data = await apiFetch('/billing/status');
    if (data?.plan === 'classroom_plus') {
      setStatus(data);
      if (data.billing_interval) setBillingInterval(data.billing_interval);
      setMessage('CordiaClassroom Plus is active.');
      setLoading(false);
    } else if (attempts < 6) {
      setTimeout(() => pollForPlus(attempts + 1), 2000);
    } else {
      if (data) setStatus(data);
      setMessage('Payment is processing. Refresh this page in a moment.');
      setLoading(false);
    }
  }

  async function loadStatus() {
    setLoading(true);
    const data = await apiFetch('/billing/status');
    if (data) {
      setStatus(data);
      if (data.billing_interval) setBillingInterval(data.billing_interval);
    }
    setLoading(false);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    const data = await apiFetch('/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ interval: billingInterval }),
    });
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setMessage('Failed to start checkout. Please try again.');
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    setManaging(true);
    const data = await apiFetch('/billing/create-portal-session', { method: 'POST' });
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setMessage('Could not open billing management. Please try again.');
      setManaging(false);
    }
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  if (!ready) return null;

  const isPlus = status?.plan === 'classroom_plus';
  const buildsUsed = status?.builds_used ?? 0;
  const buildsLimit = status?.builds_limit ?? 3;
  const actionsUsed = status?.lightweight_actions_used ?? 0;
  const actionsLimit = status?.lightweight_actions_limit ?? 30;
  const buildsPct = Math.min(100, (buildsUsed / buildsLimit) * 100);
  const actionsPct = Math.min(100, (actionsUsed / actionsLimit) * 100);

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
                  <div className="plan-badge" data-plan={isPlus ? 'plus' : 'free'}>
                    {isPlus ? 'CordiaClassroom Plus' : 'Free'}
                  </div>
                  <div className="plan-usage">
                    <span>{buildsUsed} of {buildsLimit} complete study builds used</span>
                    <div className="usage-bar">
                      <div className="usage-bar-fill" style={{ width: buildsPct + '%', background: buildsPct >= 100 ? 'var(--error)' : 'var(--accent)' }} />
                    </div>
                    <span>{actionsUsed} of {actionsLimit} lightweight AI actions used</span>
                    <div className="usage-bar">
                      <div className="usage-bar-fill" style={{ width: actionsPct + '%', background: actionsPct >= 100 ? 'var(--error)' : 'var(--accent)' }} />
                    </div>
                  </div>
                  {isPlus && status?.period_end && (
                    <div className="plan-renews">
                      {status.cancel_at_period_end ? 'Access ends' : 'Renews'} {new Date(status.period_end).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="billing-plans">
                  <div className={'plan-card' + (!isPlus ? ' plan-card-current' : '')}>
                    <div className="plan-name">Free</div>
                    <div className="plan-price">$0 <span>/month</span></div>
                    <ul className="plan-features">
                      <li>3 complete study builds each month</li>
                      <li>30 lightweight AI actions each month</li>
                      <li>Notes, study guides &amp; flashcards</li>
                      <li>Save guides to dashboard</li>
                    </ul>
                    {!isPlus && <div className="plan-current-label">Current plan</div>}
                  </div>

                  <div className={'plan-card plan-card-pro' + (isPlus ? ' plan-card-current' : '')}>
                    <div className="plan-name">CordiaClassroom Plus</div>
                    {!isPlus && (
                      <div className="billing-toggle" aria-label="Billing interval">
                        <button className={billingInterval === 'monthly' ? 'active' : ''} onClick={() => setBillingInterval('monthly')}>Monthly</button>
                        <button className={billingInterval === 'yearly' ? 'active' : ''} onClick={() => setBillingInterval('yearly')}>Yearly · save $23.89</button>
                      </div>
                    )}
                    <div className="plan-price">
                      {billingInterval === 'monthly' ? '$6.99' : '$59.99'}
                      <span>/{billingInterval === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    <ul className="plan-features">
                      <li>25 complete study builds each month</li>
                      <li>250 lightweight AI actions each month</li>
                      <li>Everything in Free</li>
                      <li>Secure billing management through Stripe</li>
                      <li>Cancel anytime</li>
                    </ul>
                    {isPlus ? (
                      <div className="plan-actions">
                        <div className="plan-current-label">Current plan</div>
                        <button className="btn-manage" onClick={handleManageBilling} disabled={managing}>
                          {managing ? 'Opening...' : 'Manage billing'}
                        </button>
                      </div>
                    ) : (
                      <button className="btn-upgrade" onClick={handleUpgrade} disabled={upgrading}>
                        {upgrading ? 'Opening secure checkout...' : 'Choose Plus · ' + (billingInterval === 'monthly' ? '$6.99/month' : '$59.99/year')}
                      </button>
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
        .plan-badge[data-plan="plus"] { background: var(--accent); color: #fff; }
        .plan-usage { font-size: 0.95rem; color: var(--text-secondary); }
        .plan-usage span { display: block; margin-top: 8px; }
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
        .billing-toggle { display: flex; gap: 6px; padding: 4px; margin: 12px 0; background: var(--bg-tertiary); border-radius: 10px; }
        .billing-toggle button { flex: 1; border: 0; border-radius: 7px; padding: 8px 10px; background: transparent; color: var(--text-muted); cursor: pointer; }
        .billing-toggle button.active { background: var(--bg-primary); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0, 0, 0, .12); }
        .plan-features { list-style: none !important; list-style-type: none !important; padding: 0 !important; margin: 0 0 20px; }
        .plan-features li { list-style: none; list-style-type: none; padding: 6px 0; font-size: 0.9rem; color: var(--text-secondary); display: flex; align-items: baseline; gap: 6px; }
        .plan-features li::before { content: "✓"; color: var(--accent); font-weight: 700; flex-shrink: 0; }
        .plan-current-label { color: var(--accent); font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; }
        .btn-upgrade { width: 100%; padding: 12px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .btn-upgrade:hover { background: var(--accent-secondary); }
        .btn-upgrade:disabled { opacity: 0.6; cursor: default; }
        .btn-manage { padding: 10px 16px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; }
        .btn-manage:disabled { opacity: 0.6; cursor: default; }
        @media (max-width: 600px) { .billing-plans { flex-direction: column; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
