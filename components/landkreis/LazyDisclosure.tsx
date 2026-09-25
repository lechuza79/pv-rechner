"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A native <details> whose heavy content is rendered only once it is opened —
 * the mount-on-open pattern of the result sections (ResultSection), kept on the
 * native element so summary, keyboard and no-JavaScript behaviour stay as they
 * were.
 *
 * WHY (25.09.2026): the district page server-rendered its full ranking table
 * (1.6 MB of markup for the Eifelkreis, 459 inline charts) inside a CLOSED
 * disclosure on every cold render. `closed` is what the server sends instead:
 * for the district table a plain list of the municipality links, so crawlers
 * and readers without JavaScript keep every link to the town pages.
 *
 * Opened before hydration (a fast click), the element is already open when
 * React takes over; the effect catches that, otherwise the toggle event would
 * have fired with no listener and the table would never appear.
 */
export default function LazyDisclosure({ className, summary, children, closed }: {
  className?: string; summary: ReactNode; children: ReactNode; closed?: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [opened, setOpened] = useState(false);
  useEffect(() => { if (ref.current?.open) setOpened(true); }, []);
  return <details ref={ref} className={className} onToggle={e => { if (e.currentTarget.open) setOpened(true); }}>
    <summary>{summary}</summary>
    {opened ? children : closed}
  </details>;
}
