import Sidebar from './Sidebar';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';
import AIChatWidget from './AIChatWidget';
import { useRouter } from 'next/router';

export default function Layout({ children, timerState, setTimerState }) {
  const router = useRouter();
  const dashboardOwnsTools = router.pathname === '/dashboard' && !router.query.view;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content fade-in">
        {children}
        {!dashboardOwnsTools && (
          <section className="workspace-tools" aria-label="Study tools">
            <StreakCounter />
            <StudyTimer timerState={timerState} setTimerState={setTimerState} />
          </section>
        )}
      </main>
      {!dashboardOwnsTools && <AIChatWidget />}
    </div>
  );
}
