import Sidebar from './Sidebar';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import AIChatWidget from './AIChatWidget';

export default function Layout({ children, timerState, setTimerState }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content fade-in">
        {children}
        <section className="workspace-tools" aria-label="Study tools">
          <StreakCounter />
          <StudyTimer timerState={timerState} setTimerState={setTimerState} />
        </section>
      </main>
      <AIChatWidget />
    </div>
  );
}
