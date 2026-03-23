import { useEffect, useRef } from 'react';
import { apiFetch, getToken } from './api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Tracks time spent on a page and logs sessions for streak/minutes tracking.
 * - On mount: logs a 0-duration session (updates streak immediately)
 * - On unmount/beforeunload: sends elapsed duration via sendBeacon
 */
export default function useSessionTracker(sessionType = 'browse', guideId = null) {
  const startRef = useRef(null);
  const loggedRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();
    loggedRef.current = false;

    // Log initial session to update streak
    const body = { session_type: sessionType, duration_seconds: 0 };
    if (guideId) body.guide_id = guideId;
    apiFetch('/stats/log-session', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    function sendBeacon() {
      if (loggedRef.current) return;
      loggedRef.current = true;

      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      if (elapsed < 3) return; // Don't log trivial visits

      const token = getToken();
      if (!token) return;

      const payload = {
        authorization: 'Bearer ' + token,
        session_type: sessionType,
        duration_seconds: Math.min(elapsed, 86400),
      };
      if (guideId) payload.guide_id = guideId;

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(API + '/stats/beacon', blob);
    }

    window.addEventListener('beforeunload', sendBeacon);

    return () => {
      window.removeEventListener('beforeunload', sendBeacon);
      sendBeacon();
    };
  }, [sessionType, guideId]);
}
