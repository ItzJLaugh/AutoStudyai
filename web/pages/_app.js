import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/';

  // Load saved theme on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
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
    return (
      <>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
          <link rel="icon" href="/autostudyai_logo.ico" type="image/x-icon" />
        </Head>
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/autostudyai_logo.ico" type="image/x-icon" />
      </Head>
      <Layout timerState={timerState} setTimerState={setTimerState} guideContent={guideContent} guideTitle={guideTitle}>
        <Component {...pageProps} setGuideContent={setGuideContent} setGuideTitle={setGuideTitle} />
      </Layout>
    </>
  );
}
