import { useEffect, useState } from 'react';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import AIChatWidget from './AIChatWidget';
import { apiFetch } from '../lib/api';

export default function DashboardStudyRail({ timerState, setTimerState, guides }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { apiFetch('/stats/learning-profile').then(setProfile); }, []);

  return (
    <aside className="dashboard-study-rail" aria-label="Study tools">
      <section className="study-rail-card">
        <span className="dashboard-rail-kicker">MOMENTUM</span>
        <StreakCounter />
      </section>
      <section className="study-rail-card">
        <span className="dashboard-rail-kicker">FOCUS</span>
        <StudyTimer timerState={timerState} setTimerState={setTimerState} />
      </section>
      <section className="study-rail-card learning-profile-card">
        <span className="dashboard-rail-kicker">CORDIA ADAPTS</span>
        <strong>{profile?.status === 'active' ? 'Learning with you' : 'Still learning'}</strong>
        <p>{profile?.message || 'Your study activity will shape future guides.'}</p>
      </section>
      <section className="study-rail-card study-rail-chat">
        <div className="study-rail-chat-heading">
          <div>
            <span className="dashboard-rail-kicker">AI STUDY ROOM</span>
            <h2>Your tutor</h2>
          </div>
          <span>Adaptive</span>
        </div>
        <AIChatWidget guides={guides} />
      </section>
    </aside>
  );
}
