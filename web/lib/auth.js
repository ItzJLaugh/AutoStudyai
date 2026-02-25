import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getToken, getUserEmail } from './api';

export function useRequireAuth() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/');
    } else {
      setChecked(true);
    }
  }, []);

  return { ready: checked, email: getUserEmail() };
}
