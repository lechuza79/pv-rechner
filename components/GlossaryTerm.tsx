"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import InfoTooltip from "./InfoTooltip";
import { usePathname } from "next/navigation";
import { resolveGlossary, resolveGlossarySlug } from "../lib/glossary";

// Inline glossary term: renders its children with a subtle dashed underline
// (same affordance as InlineEdit) and shows a one-sentence tooltip on
// hover (desktop) or tap (mobile). The tooltip is rendered into a portal on
// <body> with fixed positioning, so it never gets clipped by overflow:hidden
// ancestors and never pushes surrounding layout around.
//
// First-mention-only: only the FIRST <GlossaryTerm> for a given term on a page
// renders interactively — later mentions of the same term render as plain text.
// This is tracked via GlossaryProvider (see below); we deliberately do NOT
// auto-scan page text, so "5 kWp", "10 kWp" etc. stay untouched unless wrapped.
//
// Accessibility: the trigger is a real <button> with aria-describedby pointing
// at the tooltip, so screen readers announce the explanation.

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ─── Context: tracks which term (by slug) already has a visible tooltip ──────
interface GlossaryContextValue {
  /** slug → registered instance ids, in document (registration) order. */
  primaries: Record<string, string[]>;
  register: (slug: string, instanceId: string) => void;
  unregister: (slug: string, instanceId: string) => void;
}

const GlossaryContext = createContext<GlossaryContextValue | null>(null);

/**
 * Wrap a page (or the whole site) so each glossary term shows its tooltip only
 * on its first mention. Resets automatically on route change. Without this
 * provider, every <GlossaryTerm> renders interactively (graceful fallback).
 */
export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [primaries, setPrimaries] = useState<Record<string, string[]>>({});

  // Reset the registry when navigating to a new page (first-mention is
  // per-page). Adjusting state during render on a changed value is the
  // React-endorsed pattern — avoids an extra paint after navigation.
  const prevPath = useRef(pathname);
  if (prevPath.current !== pathname) {
    prevPath.current = pathname;
    setPrimaries({});
  }

  const register = useCallback((slug: string, instanceId: string) => {
    setPrimaries((prev) => {
      const list = prev[slug];
      if (!list) return { ...prev, [slug]: [instanceId] };
      if (list.includes(instanceId)) return prev;
      return { ...prev, [slug]: [...list, instanceId] };
    });
  }, []);

  const unregister = useCallback((slug: string, instanceId: string) => {
    setPrimaries((prev) => {
      const list = prev[slug];
      if (!list || !list.includes(instanceId)) return prev;
      const next = list.filter((x) => x !== instanceId);
      const copy = { ...prev };
      if (next.length === 0) delete copy[slug];
      else copy[slug] = next;
      return copy;
    });
  }, []);

  const value = useMemo<GlossaryContextValue>(
    () => ({ primaries, register, unregister }),
    [primaries, register, unregister]
  );

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

interface Props {
  /** Glossary slug, term, or alias to look up. */
  id: string;
  /** Visible label. Defaults to the canonical term from the glossary. */
  children?: React.ReactNode;
}

export default function GlossaryTerm({ id, children }: Props) {
  const entry = resolveGlossary(id);
  const slug = resolveGlossarySlug(id);
  const ctx = useContext(GlossaryContext);
  const instanceId = useId();
  // Register this mention with the provider; first one per slug wins. Runs in a
  // layout effect so the demotion of duplicates happens before the browser
  // paints — no flash of multiple underlined mentions.
  // Depend on the STABLE register/unregister callbacks, not on the whole ctx
  // object: ctx changes identity on every registration (it carries `primaries`),
  // so depending on `ctx` makes this effect re-run → unregister → register →
  // re-render → loop ("Maximum update depth exceeded"). register/unregister are
  // useCallback([]) and never change, so this now runs once on mount/unmount.
  const register = ctx?.register;
  const unregister = ctx?.unregister;
  useIsoLayoutEffect(() => {
    if (!register || !unregister || !slug) return;
    register(slug, instanceId);
    return () => unregister(slug, instanceId);
  }, [register, unregister, slug, instanceId]);

  const label = children ?? entry?.term ?? id;

  // Not in the glossary → plain text (lets us wrap ahead of writing the entry).
  if (!entry) return <>{label}</>;

  // First-mention gate: with a provider, only the first registered instance for
  // this slug is interactive. Optimistic — unknown/unregistered renders as
  // primary so single mentions never flash plain.
  const registered = ctx && slug ? ctx.primaries[slug] : undefined;
  const isPrimary = !ctx || !slug || registered === undefined || registered[0] === instanceId;

  if (!isPrimary) return <>{label}</>;

  return <InfoTooltip label={label} title={entry.term} ariaLabel={typeof label === "string" ? label : entry.term} exportNote={false}>{entry.short}</InfoTooltip>;
}
