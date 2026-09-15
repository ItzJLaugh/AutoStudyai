import { useEffect, useState } from 'react';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import { apiFetch } from '../lib/api';

export default function DashboardStudyRail({ timerState, setTimerState }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { apiFetch('/stats/learning-profile').then(setProfile); }, []);

  return (
    <aside className="dashboard-study-rail" aria-label="Study tools">
      <section className="study-rail-card">
        <span className="dashboard-rail-kicker">Momentum</span>
        <StreakCounter />
      </section>
      <section className="study-rail-card">
        <span className="dashboard-rail-kicker">Focus</span>
        <StudyTimer timerState={timerState} setTimerState={setTimerState} />
      </section>
      <section className="study-rail-card learning-profile-card">
        <span className="dashboard-rail-kicker">Cordia adapts</span>
        <strong>{profile?.status === 'active' ? 'Learning with you' : 'Still learning'}</strong>
        <p>{profile?.message || 'Your study activity will shape future guides.'}</p>
      </section>
    </aside>
  );
}
