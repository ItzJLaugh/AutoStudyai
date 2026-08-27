import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { useRequireAuth } from '../lib/auth';
import useSessionTracker from '../lib/useSessionTracker';
import AILoadingSphere from '../components/AILoadingSphere';
import StudyWorkspaceFrame from '../components/StudyWorkspaceFrame';
import { organizeDashboardGuides } from '../lib/dashboardOrganization';

export default function FlashcardsHub({ timerState, setTimerState }) {
  const router = useRouter();
  const { ready } = useRequireAuth();
  useSessionTracker('browse');
  const [loading, setLoading] = useState(true);
  const [allGuides, setAllGuides] = useState([]);
  const [guides, setGuides] = useState([]);
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    if (ready) loadGuides();
  }, [ready]);

  async function loadGuides() {
    setLoading(true);
    const [guideData, folderData] = await Promise.all([apiFetch('/guides'), apiFetch('/folders')]);
    const fetchedGuides = guideData?.guides || [];
    const withCards = fetchedGuides.filter(g => g.flashcards && g.flashcards.length > 0);
    setAllGuides(fetchedGuides);
    setGuides(withCards);
    setFolders(folderData?.folders || []);
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

  const organized = organizeDashboardGuides(folders, allGuides);

  return (
    <StudyWorkspaceFrame
      classes={organized.classes}
      section="flashcards"
      timerState={timerState}
      setTimerState={setTimerState}
      classRail={{
        allowCreate: false,
        openFolder: folderId => router.push('/folder/' + folderId),
        openGuide: guideId => router.push('/guide/' + guideId),
      }}
    >
    <div className="fade-in study-library">
      <div className="study-library-header">
        <div><p className="editorial-kicker">LIBRARY</p><h1>Flashcards</h1><p>Review cards generated from your study guides.</p></div>
        <button className="btn" onClick={() => router.push('/create')}>New study guide</button>
      </div>
      <div className="study-library-tabs" role="tablist" aria-label="Study library">
        <button type="button" role="tab" aria-selected="false" onClick={() => router.push('/dashboard?view=guides')}>Study guides</button>
        <button type="button" className="active" role="tab" aria-selected="true">Flashcards</button>
      </div>

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
    </StudyWorkspaceFrame>
  );
}
