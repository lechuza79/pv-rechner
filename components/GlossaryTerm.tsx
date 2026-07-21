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
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { v } from "../lib/theme";
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

const TOOLTIP_MAX_WIDTH = 280;
const GAP = 8; // px between trigger and tooltip
const EDGE = 8; // min px from viewport edge

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean }>({
    top: 0,
    left: 0,
    below: false,
  });
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

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

  // Position the tooltip relative to the trigger, clamped to the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const ttWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - 2 * EDGE);
    const ttHeight = tooltipRef.current?.offsetHeight ?? 80;

    // Prefer above; flip below if not enough room.
    const below = t.top - GAP - ttHeight < EDGE;
    const top = below ? t.bottom + GAP : t.top - GAP - ttHeight;

    // Center horizontally on the trigger, clamp to viewport.
    let left = t.left + t.width / 2 - ttWidth / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - ttWidth - EDGE));

    setPos({ top, left, below });
  }, [open]);

  // Close on outside click, scroll, resize, or Escape.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const label = children ?? entry?.term ?? id;

  // Not in the glossary → plain text (lets us wrap ahead of writing the entry).
  if (!entry) return <>{label}</>;

  // First-mention gate: with a provider, only the first registered instance for
  // this slug is interactive. Optimistic — unknown/unregistered renders as
  // primary so single mentions never flash plain.
  const registered = ctx && slug ? ctx.primaries[slug] : undefined;
  const isPrimary = !ctx || !slug || registered === undefined || registered[0] === instanceId;

  if (!isPrimary) return <>{label}</>;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        style={{
          font: "inherit",
          color: "inherit",
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "help",
          // Dotted, light-blue underline sitting close to the word (small offset)
          // instead of a far dashed baseline rule.
          textDecoration: "underline",
          textDecorationStyle: "dotted",
          textDecorationColor: v("--color-accent-light"),
          textDecorationThickness: "1px",
          textUnderlineOffset: "2px",
          lineHeight: "inherit",
          display: "inline",
        }}
      >
        {label}
      </button>
      {mounted &&
        open &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 1000,
              maxWidth: TOOLTIP_MAX_WIDTH,
              width: "max-content",
              background: v("--color-bg"),
              color: v("--color-text-secondary"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              boxShadow: v("--shadow-md"),
              padding: "10px 12px",
              fontFamily: v("--font-text"),
              fontSize: 12.5,
              lineHeight: 1.5,
              fontWeight: 400,
              textAlign: "left",
              pointerEvents: "auto",
              animation: "fu .15s ease-out",
            }}
          >
            <span
              style={{
                display: "block",
                fontWeight: 700,
                color: v("--color-text-primary"),
                marginBottom: 3,
              }}
            >
              {entry.term}
            </span>
            {entry.short}
          </span>,
          document.body
        )}
    </>
  );
}
