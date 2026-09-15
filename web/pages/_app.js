import '../styles/globals.css';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { scheduleProactiveRefresh, getToken } from '../lib/api';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/';

  // Authentication pages stay light; workspace routes honor the saved preference.
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('theme');
    const theme = router.pathname === '/' || router.pathname === '/reset-password' ? 'light' : saved || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, [router.pathname]);

  // Start proactive token refresh if already logged in
  useEffect(() => {
    if (getToken()) scheduleProactiveRefresh();
  }, []);
  const [timerState, setTimerState] = useState({
    mode: 'focus', minutes: 25, seconds: 0, isRunning: false
  });
  if (isLoginPage) {
    return <Component {...pageProps} />;
  }

  return (
    <>
      <Layout timerState={timerState} setTimerState={setTimerState}>
        <Component {...pageProps} timerState={timerState} setTimerState={setTimerState} />
      </Layout>
    </>
  );
}
