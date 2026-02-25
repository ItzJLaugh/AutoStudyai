import { useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';

const MODES = {
  focus: { label: 'Focus', minutes: 25 },
  shortBreak: { label: 'Short Break', minutes: 5 },
  longBreak: { label: 'Long Break', minutes: 15 },
};

export default function StudyTimer({ timerState, setTimerState }) {
  const intervalRef = useRef(null);

  const { mode = 'focus', minutes = 25, seconds = 0, isRunning = false } = timerState || {};

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => {
          if (prev.seconds > 0) {
            return { ...prev, seconds: prev.seconds - 1 };
          } else if (prev.minutes > 0) {
            return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          } else {
            clearInterval(intervalRef.current);
            if (prev.mode === 'focus') {
              apiFetch('/stats/log-session', {
                method: 'POST',
                body: JSON.stringify({
                  session_type: 'timer',
                  duration_seconds: MODES.focus.minutes * 60,
                  metadata: { mode: 'pomodoro' }
                })
              });
            }
            return { ...prev, isRunning: false, minutes: 0, seconds: 0 };
          }
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  function toggle() {
    setTimerState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  }

  function reset() {
    clearInterval(intervalRef.current);
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      minutes: MODES[prev.mode || 'focus'].minutes,
      seconds: 0
    }));
  }

  function setMode(m) {
    clearInterval(intervalRef.current);
    setTimerState({ mode: m, minutes: MODES[m].minutes, seconds: 0, isRunning: false });
  }

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="timer-widget">
      <div className="timer-label">{MODES[mode]?.label || 'Focus'}</div>
      <div className="timer-display">{pad(minutes)}:{pad(seconds)}</div>

      <div className="timer-controls">
        <button className={'timer-btn' + (isRunning ? ' active' : '')} onClick={toggle}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="timer-btn" onClick={reset}>Reset</button>
      </div>

      <div className="timer-modes">
        {Object.entries(MODES).map(([key, val]) => (
          <button
            key={key}
            className={'timer-mode' + (mode === key ? ' active' : '')}
            onClick={() => setMode(key)}
          >
            {val.label}
          </button>
        ))}
      </div>
    </div>
  );
}
