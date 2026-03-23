import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BillingRedirect() {
  const router = useRouter();
  useEffect(() => {
    const query = router.query;
    const params = new URLSearchParams();
    if (query.success) params.set('success', query.success);
    if (query.cancelled) params.set('cancelled', query.cancelled);
    const qs = params.toString();
    router.replace('/settings' + (qs ? '?' + qs : ''));
  }, [router.query]);

  return null;
}
