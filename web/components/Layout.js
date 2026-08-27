import Sidebar from './Sidebar';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import AIChatWidget from './AIChatWidget';
import AcademicInfinityMark from './AcademicInfinityMark';

export default function Layout({ children, timerState, setTimerState }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="app-header-brand" href="/dashboard" aria-label="AutoStudyAI dashboard">
          <AcademicInfinityMark className="app-header-mark" />
          <span>AutoStudyAI</span>
        </a>
        <span className="app-header-context">Study workspace</span>
      </header>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content fade-in">
          {children}
          <section className="workspace-tools" aria-label="Study tools">
            <StreakCounter />
            <StudyTimer timerState={timerState} setTimerState={setTimerState} />
          </section>
        </main>
      </div>
      <AIChatWidget />
    </div>
  );
}
