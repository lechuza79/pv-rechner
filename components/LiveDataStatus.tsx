'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatLiveDataTime, LIVE_DATA_CHECK_MS } from '../lib/live-data-time';
import StatusBadge from './StatusBadge';

/** Refresh cached server data only while visible. Observation and retrieval remain distinct. */
export default function LiveDataStatus({ retrievedAt, renderedAt }: { observedAt?: string; retrievedAt?: string; renderedAt: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(renderedAt));
  useEffect(() => {
    let lastCheck = Date.now();
    const check = () => {
      if (document.hidden) return;
      setNow(new Date());
      if (Date.now() - lastCheck < LIVE_DATA_CHECK_MS) return;
      lastCheck = Date.now();
      router.refresh();
    };
    check();
    const timer = setInterval(check, LIVE_DATA_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [router]);
  return <StatusBadge pulse={!!retrievedAt} accentDot variant="inline"><span>
    {retrievedAt ? <>Update: <time dateTime={retrievedAt}>{formatLiveDataTime(retrievedAt, now)}</time></> : 'Update: nicht verfügbar'}
  </span></StatusBadge>;
}
