import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { useRequireAuth } from '../lib/auth';
import useSessionTracker from '../lib/useSessionTracker';
import AILoadingSphere from '../components/AILoadingSphere';

export default function FlashcardsHub() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  useSessionTracker('browse');
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState([]);

  useEffect(() => {
    if (ready) loadGuides();
  }, [ready]);

  async function loadGuides() {
    setLoading(true);
    const data = await apiFetch('/guides');
    const withCards = (data?.guides || []).filter(g => g.flashcards && g.flashcards.length > 0);
    setGuides(withCards);
    setLoading(false);
  }

  if (!ready || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <AILoadingSphere size={100} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Loading your flashcards...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h2 style={{ marginBottom: 20 }}>Flashcards</h2>

      {guides.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#127183;</div>
          No flashcards yet. Generate flashcards from your study guides!
        </div>
      ) : (
        guides.map(guide => {
          const cards = guide.flashcards || [];
          const progress = guide.flashcard_progress || {};
          const knownCount = progress.known ? progress.known.length : 0;
          const pct = Math.round((knownCount / cards.length) * 100);

          return (
            <div key={guide.id} className="fc-hub-card">
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{guide.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8em', marginTop: 4 }}>
                  {cards.length} cards | {knownCount} mastered ({pct}%)
                </div>
                <div className="progress-bar-container" style={{ marginTop: 6, width: 200 }}>
                  <div className="progress-bar-fill green" style={{ width: pct + '%' }} />
                </div>
              </div>
              <button className="btn" onClick={() => router.push('/flashcards/study?guideId=' + guide.id)}>
                Study
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
