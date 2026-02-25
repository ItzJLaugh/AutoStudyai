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
      const data = await apiFetch('/stats/streak');
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
        {(streak.week || []).map((day, i) => (
          <div key={i} className={'streak-dot' + (day.active ? ' active' : '')} title={day.date} />
        ))}
      </div>

      <div className={'streak-today' + (streak.studied_today ? '' : ' not-yet')}>
        {streak.studied_today ? 'Studied today' : 'Not studied yet'}
      </div>
    </div>
  );
}
