import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import AIChatWidget from './AIChatWidget';

export default function DashboardStudyRail({ timerState, setTimerState }) {
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
      <section className="study-rail-card study-rail-chat">
        <div className="study-rail-chat-heading">
          <div>
            <span className="dashboard-rail-kicker">AI STUDY ROOM</span>
            <h2>Chats</h2>
          </div>
          <span>Up to 5</span>
        </div>
        <AIChatWidget />
      </section>
    </aside>
  );
}
