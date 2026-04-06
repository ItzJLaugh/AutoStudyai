import Sidebar from './Sidebar';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import AIChatWidget from './AIChatWidget';

export default function Layout({ children, timerState, setTimerState, guideContent }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        {children}
      </main>
      <aside className="streak-panel">
        <StreakCounter />
        <StudyTimer timerState={timerState} setTimerState={setTimerState} />
      </aside>
      <AIChatWidget guideContent={guideContent} />
    </div>
  );
}
