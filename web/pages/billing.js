import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import Layout from '../components/Layout';

export default function BillingPage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (router.query.success === 'true') setMessage('🎉 Welcome to Pro! Your subscription is now active.');
    if (router.query.cancelled === 'true') setMessage('Checkout cancelled — you are still on the free plan.');
    loadStatus();
  }, [ready, router.query]);

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

  if (!ready) return null;

  const isPro = status?.plan === 'pro';
  const guidesUsed = status?.guides_used ?? 0;
  const guidesLimit = status?.guides_limit ?? 10;
  const usagePct = isPro ? 100 : Math.min(100, (guidesUsed / guidesLimit) * 100);

  return (
    <Layout>
      <div className="billing-page">
        <h2>Billing &amp; Plan</h2>

        {message && <div className="billing-message">{message}</div>}

        {loading ? (
          <div className="billing-loading">Loading...</div>
        ) : (
          <>
            <div className="billing-current-plan">
              <div className="plan-badge" data-plan={status?.plan}>
                {isPro ? 'Pro' : 'Free'}
              </div>
              <div className="plan-usage">
                {isPro ? (
                  <span>Unlimited guide generations</span>
                ) : (
                  <>
                    <span>{guidesUsed} / {guidesLimit} guides used this month</span>
                    <div className="usage-bar">
                      <div className="usage-bar-fill" style={{ width: usagePct + '%', background: usagePct >= 100 ? '#e74c3c' : '#6366f1' }} />
                    </div>
                  </>
                )}
              </div>
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
                  <li>10 AI guide generations per month</li>
                  <li>Notes, study guides &amp; flashcards</li>
                  <li>Save guides to dashboard</li>
                  <li>Chat with content</li>
                </ul>
                {!isPro && <div className="plan-current-label">Current plan</div>}
              </div>

              <div className={'plan-card plan-card-pro' + (isPro ? ' plan-card-current' : '')}>
                <div className="plan-name">Pro</div>
                <div className="plan-price">$9.99 <span>/month</span></div>
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
                ) : (
                  <button className="btn-upgrade" onClick={handleUpgrade} disabled={upgrading}>
                    {upgrading ? 'Redirecting...' : 'Upgrade to Pro'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .billing-page { max-width: 700px; padding: 32px; }
        h2 { margin-bottom: 24px; font-size: 1.6rem; }
        .billing-message { background: #f0f0ff; border: 1px solid #c7c7ff; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
        .billing-loading { color: #888; }
        .billing-current-plan { background: #f8f8ff; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
        .plan-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; background: #e0e0e0; color: #555; margin-bottom: 12px; }
        .plan-badge[data-plan="pro"] { background: #6366f1; color: #fff; }
        .plan-usage { font-size: 0.95rem; color: #444; }
        .usage-bar { height: 8px; background: #e0e0e0; border-radius: 4px; margin-top: 8px; overflow: hidden; }
        .usage-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
        .plan-renews { font-size: 0.85rem; color: #888; margin-top: 8px; }
        .billing-plans { display: flex; gap: 20px; }
        .plan-card { flex: 1; border: 2px solid #e0e0e0; border-radius: 16px; padding: 24px; }
        .plan-card-pro { border-color: #6366f1; }
        .plan-card-current { box-shadow: 0 0 0 3px #6366f120; }
        .plan-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
        .plan-price { font-size: 2rem; font-weight: 800; margin-bottom: 16px; }
        .plan-price span { font-size: 1rem; font-weight: 400; color: #888; }
        .plan-features { list-style: none; padding: 0; margin: 0 0 20px; }
        .plan-features li { padding: 6px 0; font-size: 0.9rem; color: #555; }
        .plan-features li::before { content: "✓  "; color: #6366f1; font-weight: 700; }
        .plan-current-label { color: #6366f1; font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; }
        .btn-upgrade { width: 100%; padding: 12px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
        .btn-upgrade:hover { background: #4f52d3; }
        .btn-upgrade:disabled { opacity: 0.6; cursor: default; }
        .btn-cancel { background: none; border: none; color: #e74c3c; font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0; }
        .btn-cancel:disabled { opacity: 0.6; cursor: default; }
        @media (max-width: 600px) { .billing-plans { flex-direction: column; } }
      `}</style>
    </Layout>
  );
}
