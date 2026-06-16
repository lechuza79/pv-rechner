"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { v } from "../lib/theme";
import { resolveGlossary } from "../lib/glossary";

// Inline glossary term: renders its children with a subtle dashed underline
// (same affordance as InlineEdit) and shows a one-sentence tooltip on
// hover (desktop) or tap (mobile). The tooltip is rendered into a portal on
// <body> with fixed positioning, so it never gets clipped by overflow:hidden
// ancestors and never pushes surrounding layout around.
//
// Accessibility: the trigger is a real <button> with aria-describedby pointing
// at the tooltip, so screen readers announce the explanation.

const TOOLTIP_MAX_WIDTH = 280;
const GAP = 8; // px between trigger and tooltip
const EDGE = 8; // min px from viewport edge

interface Props {
  /** Glossary slug, term, or alias to look up. */
  id: string;
  /** Visible label. Defaults to the canonical term from the glossary. */
  children?: React.ReactNode;
}

export default function GlossaryTerm({ id, children }: Props) {
  const entry = resolveGlossary(id);
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

  // If the term isn't in the glossary, render the label as-is (no crash, no
  // broken affordance). Lets us add <GlossaryTerm> ahead of writing the entry.
  // Hooks above run unconditionally so this early return is rules-of-hooks safe.

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

  if (!entry) return <>{children ?? id}</>;

  const label = children ?? entry.term;

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
          borderBottom: `1px dashed ${v("--color-text-faint")}`,
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
              boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
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
