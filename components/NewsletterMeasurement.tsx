"use client";
import {useEffect, useRef} from "react";
import {trackNewsletterEvent} from "../lib/analytics";
import {newsletterContext, matchesNewsletterEntry, NEWSLETTER_START_EVENT} from "../lib/newsletter-metrics";
import {createNewsletterMeasurement} from "../lib/newsletter-measurement";

export function NewsletterMeasurement() {
  const saved = useRef<ReturnType<typeof createNewsletterMeasurement> | null>(null);
  useEffect(() => {
    if (!window.location.pathname.startsWith("/solar-atlas/")) return;
    const context = newsletterContext(window.location.search);
    if (!context) return;
    const counter = saved.current ??= createNewsletterMeasurement(context, () => typeof (window as Window & {va?: unknown}).va === "function", action => trackNewsletterEvent(context.campaign, context.variant, action));
    const entryPath = window.location.pathname;
    const started = (event: Event) => {
      if (!matchesNewsletterEntry(window.location.pathname, window.location.search, entryPath, context)) return;
      counter.started((event as CustomEvent<{period?: unknown}>).detail?.period);
      counter.flush();
    };
    window.addEventListener(NEWSLETTER_START_EVENT, started);
    counter.flush();
    let attempts = 0;
    const timer = window.setInterval(() => { counter.flush(); if (++attempts >= 25) window.clearInterval(timer); }, 200);
    return () => { window.clearInterval(timer); window.removeEventListener(NEWSLETTER_START_EVENT, started); };
  }, []);
  return null;
}
