import '../styles/globals.css';
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

  if (isLoginPage) {
    return <Component {...pageProps} />;
  }

  return (
    <Layout timerState={timerState} setTimerState={setTimerState}>
      <Component {...pageProps} />
    </Layout>
  );
}
