import {tradeDate,tradeMidnight,shiftTradeDate,type TradeResult} from './electricity-trade';

const TTL = 60 * 60 * 1000;
const PREFIX = 'sc-trade-v1:';
const pending = new Map<string, Promise<TradeResult>>();
const memory = new Map<string, {expires: number; data: TradeResult}>();

/** Reuse successful periods across switches and same-origin gallery frames. */
export function cachedTrade(url: string): TradeResult | null {
  try {
    const entry = memory.get(url) ?? JSON.parse(localStorage.getItem(PREFIX + url) ?? 'null');
    if (entry?.expires > Date.now() && Array.isArray(entry.data?.days)) return entry.data;
    const query = new URL(url, 'https://local.invalid').searchParams;
    const period = query.get('period');
    const today = tradeDate(Date.now());
    const year = query.get('year') ?? today.slice(0,4);
    const candidates = [...memory.values(), ...Object.keys(localStorage).filter(key=>key.startsWith(PREFIX)).map(key=>JSON.parse(localStorage.getItem(key) ?? 'null'))];
    for (const cached of candidates) {
      if (!cached || cached.expires <= Date.now() || !cached.data?.asOf) continue;
      const source = cached.data as TradeResult;
      if (!source.asOf) continue;
      let start: string, end: string;
      if (period === 'month') {
        const month = Number(query.get('month'));
        start = `${year}-${String(month).padStart(2,'0')}-01`;
        end = new Date(Date.UTC(Number(year),month,0,12)).toISOString().slice(0,10);
      } else if (period === 'seven') {
        if (tradeDate(Date.parse(source.asOf)) < shiftTradeDate(today,-1)) continue;
        end = shiftTradeDate(tradeDate(Date.parse(source.asOf)),-1);
        start = shiftTradeDate(end,-6);
      } else continue;
      if (source.start > start || source.end < end) continue;
      const days = source.days.filter(day=>day.date>=start&&day.date<=end);
      if (!days.length) continue;
      const observed = days.filter(day=>day.expected>0);
      const totals = Object.fromEntries((['importMwh','exportMwh','importEuro','exportEuro'] as const).map(key=>[key,observed.length&&observed.every(day=>day[key]!==null)?observed.reduce((sum,day)=>sum+day[key]!,0):null])) as TradeResult['totals'];
      return {...source,start,end,days,totals,mode:period,asOf:new Date(Math.min(Date.parse(source.asOf),tradeMidnight(shiftTradeDate(end,1)))).toISOString(),partial:days.some(day=>day.expected===0||day.covered<day.expected)||end>=tradeDate(Date.parse(source.asOf))};
    }
  } catch { /* Storage is optional in restricted embeds. */ }
  return null;
}

export function loadTrade(url: string): Promise<TradeResult> {
  const cached = cachedTrade(url);
  if (cached) return Promise.resolve(cached);
  const running = pending.get(url);
  if (running) return running;
  const fetchPeriod = async () => {
    // Web Locks serialize the same request across same-origin iframe documents.
    const reused = cachedTrade(url);
    if (reused) return reused;
    const response = await fetch(url, {signal: AbortSignal.timeout(65000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Daten nicht verfügbar');
    const entry = {expires: Date.now() + TTL, data: data as TradeResult};
    if (memory.size >= 16) memory.delete(memory.keys().next().value!);
    memory.set(url, entry);
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(PREFIX));
      for (const key of keys) {
        const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (!stored || stored.expires <= Date.now()) localStorage.removeItem(key);
      }
      const remaining = Object.keys(localStorage).filter(key => key.startsWith(PREFIX));
      if (remaining.length >= 16) localStorage.removeItem(remaining[0]);
      localStorage.setItem(PREFIX + url, JSON.stringify(entry));
    } catch { /* The in-memory cache still works if storage is unavailable. */ }
    return entry.data;
  };
  const request = Promise.resolve(typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(PREFIX + url, fetchPeriod)
    : fetchPeriod()).finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}
