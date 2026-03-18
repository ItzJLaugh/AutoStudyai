import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export default function StreakCounter() {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    loadStreak();
    // Poll every 5 minutes instead of every 60s
    const interval = setInterval(loadStreak, 300000);
    return () => clearInterval(interval);
  }, []);

  async function loadStreak() {
    try {
      const tzOffset = -new Date().getTimezoneOffset(); // minutes from UTC (e.g. -300 for EST)
      const data = await apiFetch('/stats/streak?tz_offset=' + tzOffset);
      if (data) setStreak(data);
    } catch (e) {
      // Silently ignore — polling failures shouldn't log the user out
    }
  }

  if (!streak) return <div className="streak-widget"><div className="streak-label">Loading...</div></div>;

  return (
    <div className="streak-widget">
      <div className="streak-number">{streak.current_streak}</div>
      <div className="streak-label">Day Streak</div>

      <div className="streak-week">
        {(streak.week || []).map((day, i) => {
          const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '0.6em', color: 'var(--text-muted)' }}>{labels[i]}</span>
              <div className={'streak-dot' + (day.active ? ' active' : '')} title={day.date} />
            </div>
          );
        })}
      </div>

      <div className={'streak-today' + (streak.studied_today ? '' : ' not-yet')}>
        {streak.studied_today ? 'Studied today' : 'Not studied yet'}
      </div>
    </div>
  );
}
