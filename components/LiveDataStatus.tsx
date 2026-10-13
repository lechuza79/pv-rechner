'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatLiveDataTime, LIVE_DATA_CHECK_MS } from '../lib/live-data-time';
import StatusBadge from './StatusBadge';

/** Refresh cached server data only while visible. Observation and retrieval remain distinct. */
export default function LiveDataStatus({ observedAt, showObservedAt = false, retrievedAt, renderedAt, refreshPage = true }: { observedAt?: string; showObservedAt?: boolean; retrievedAt?: string; renderedAt: string; refreshPage?: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(renderedAt));
  useEffect(() => {
    let lastCheck = Date.now();
    const check = () => {
      if (document.hidden) return;
      setNow(new Date());
      if (Date.now() - lastCheck < LIVE_DATA_CHECK_MS) return;
      lastCheck = Date.now();
      if (refreshPage) router.refresh();
    };
    check();
    const timer = setInterval(check, LIVE_DATA_CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [router, refreshPage]);
  return <StatusBadge pulse={!!retrievedAt} accentDot variant="inline"><span>
    {retrievedAt ? <>Update: <time dateTime={retrievedAt}>{formatLiveDataTime(retrievedAt, now)}</time></> : 'Update: nicht verfügbar'}
    {showObservedAt && <> · Stand: {observedAt ? <time dateTime={observedAt}>{formatLiveDataTime(observedAt, now).replace(/^heute, /, '')}</time> : 'nicht verfügbar'}</>}
  </span></StatusBadge>;
}
