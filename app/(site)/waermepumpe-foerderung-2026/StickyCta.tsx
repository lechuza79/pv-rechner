"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { v } from "../../../lib/theme";

// Sticky bottom CTA bar for the funding guide: the two actions the page offers —
// the full Wärmepumpen-Rechner and the on-page Förder-Check — always in reach.
// Hides itself once the page end (sentinel) scrolls into view so it never covers
// the legal footer, and slides back in when scrolling up. Client-only (needs the
// IntersectionObserver); the server page renders the sentinel + a spacer.
export default function StickyCta({ foerderHref }: { foerderHref: string }) {
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = document.getElementById("sc-cta-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      rootMargin: "0px 0px -40px 0px",
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const base: React.CSSProperties = {
    flex: 1,
    textAlign: "center",
    padding: "12px 10px",
    borderRadius: v("--radius-md"),
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };

  return (
    <div
      ref={ref}
      aria-hidden={hidden}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: v("--color-bg"),
        borderTop: `1px solid ${v("--color-border")}`,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
        transform: hidden ? "translateY(130%)" : "none",
        transition: "transform 0.28s ease",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", gap: 8 }}>
        <Link
          href="/waermepumpe-rechner"
          style={{
            ...base,
            background: v("--color-accent"),
            color: v("--color-text-on-accent"),
          }}
        >
          Wärmepumpe rechnen
        </Link>
        <a
          href={foerderHref}
          style={{
            ...base,
            background: v("--color-bg"),
            color: v("--color-accent"),
            border: `1px solid ${v("--color-border-accent")}`,
          }}
        >
          Förderung berechnen
        </a>
      </div>
    </div>
  );
}
