"use client";
import { useEffect, useState } from "react";
import "./scroll-indicator.css";
/** Shared municipality scroll cue, revealed after the established 1.8-second delay. */
export default function ScrollIndicator({ href, children }: { href: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setVisible(true), 1800); return () => clearTimeout(timer); }, []);
  return <a className={`v3-scroll-indicator${visible ? " is-visible" : ""}`} href={href}><span>{children}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6" /></svg></a>;
}
