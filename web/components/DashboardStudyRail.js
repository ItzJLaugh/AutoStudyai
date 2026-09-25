import { useEffect, useState } from 'react';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import { apiFetch } from '../lib/api';
import ResizableEdgePanel from './ResizableEdgePanel';

export default function DashboardStudyRail({ timerState, setTimerState, resizable = false }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { apiFetch('/stats/learning-profile').then(setProfile); }, []);

  const content = (
    <>
      <section className="study-rail-card" aria-label="Study streak">
        <StreakCounter />
      </section>
      <section className="study-rail-card" aria-label="Focus timer">
        <StudyTimer timerState={timerState} setTimerState={setTimerState} />
      </section>
      <section className="study-rail-card learning-profile-card" aria-label="Learning profile">
        <strong>{profile?.status === 'active' ? 'Learning with you' : 'Still learning'}</strong>
        <p>{profile?.message || 'Your study activity will shape future guides.'}</p>
      </section>
    </>
  );

  if (resizable) {
    return <ResizableEdgePanel as="aside" className="dashboard-study-rail" edge="right" storageKey="cordiaStudyPanelSize" defaultWidth={300} minWidth={240} aria-label="Study tools">{content}</ResizableEdgePanel>;
  }
  return <aside className="dashboard-study-rail" aria-label="Study tools">{content}</aside>;
}
