import '../styles/globals.css';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { scheduleProactiveRefresh, getToken } from '../lib/api';
import { resolveTheme } from '../lib/theme';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/';

  // Authentication pages stay light; workspace routes honor the saved preference.
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('theme');
    document.documentElement.setAttribute('data-theme', resolveTheme(router.pathname, saved));
  }, [router.pathname]);

  // Start proactive token refresh if already logged in
  useEffect(() => {
    if (getToken()) scheduleProactiveRefresh();
  }, []);
  const [timerState, setTimerState] = useState({
    mode: 'focus', minutes: 25, seconds: 0, isRunning: false
  });
  const [guideContent, setGuideContent] = useState(null);
  const [guideTitle, setGuideTitle] = useState(null);

  // Clear guide content when navigating away from a guide page
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (!url.startsWith('/guide/')) { setGuideContent(null); setGuideTitle(null); }
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [router]);

  if (isLoginPage) {
    return <Component {...pageProps} />;
  }

  return (
    <>
      <Layout timerState={timerState} setTimerState={setTimerState} guideContent={guideContent} guideTitle={guideTitle}>
        <Component {...pageProps} setGuideContent={setGuideContent} setGuideTitle={setGuideTitle} timerState={timerState} setTimerState={setTimerState} />
      </Layout>
    </>
  );
}
