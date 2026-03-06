import { useState } from 'react';
import Sidebar from './Sidebar';
import StreakCounter from './StreakCounter';
import StudyTimer from './StudyTimer';

export default function Layout({ children, timerState, setTimerState }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content fade-in">
        {children}
      </main>

      <aside className="streak-panel">
        <StreakCounter />
        <StudyTimer timerState={timerState} setTimerState={setTimerState} />
      </aside>
    </div>
  );
}
