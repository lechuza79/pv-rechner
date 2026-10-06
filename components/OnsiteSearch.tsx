"use client";

import { useEffect, useId, useRef, useState } from "react";
import { v } from "../lib/theme";
import styles from "./onsite-search.module.css";

// Lupe — inline, weil Icons.tsx keine Such-Glyphe hat.
function SearchGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export type OnsiteSearchItem = { id: string; label: string; description?: string };
type SearchHit = OnsiteSearchItem;

/** Shared local filtering or asynchronous suggestions; domain adapters own data and navigation. */
export default function OnsiteSearch({
  onPick,
  loadItems,
  ariaLabel = "Suchen",
  align = "right",
  items,
  onQueryChange,
  placeholder = "Suchen …",
}: {
  /** Already loaded regions: persistent field, local suggestions, no request. */
  items?: SearchHit[];
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  onPick?: (item: OnsiteSearchItem) => void;
  loadItems?: (query: string, signal: AbortSignal) => Promise<OnsiteSearchItem[]>;
  ariaLabel?: string;
  /** Auf welcher Seite das Vorschlags-Panel andockt. */
  align?: "left" | "right";
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = () => {
    setOpen(false);
    if (!items) { setQ(""); setHits([]); }
    setActive(-1);
  };

  // Beim Aufklappen ins Feld fokussieren — zuverlässiger als ein rAF im Klick,
  // weil der Effekt erst nach dem sichtbaren Re-Render läuft.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Außerhalb geklickt → schließen.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Entprellte Suche.
  useEffect(() => {
    const term = q.trim();
    if (items) {
      const fold = (value: string) => value.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
      setHits(items.filter(hit => fold(hit.label).includes(fold(term))));
      setActive(-1);
      setLoading(false);
      return;
    }
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const result = await loadItems?.(term, controller.signal);
        if (controller.signal.aborted) return;
        setHits(result ?? []);
        setActive(-1);
      } catch {
        if (!controller.signal.aborted) setHits([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [q, items, loadItems]);

  const pick = (h: SearchHit) => {
    close();
    if (items) { setQ(h.label); onQueryChange?.(h.label); }
    onPick?.(h);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      setOpen(true);
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits.length) {
      const h = hits[active >= 0 ? active : 0];
      if (h) pick(h);
    }
  };

  return (
    <div ref={wrapRef} className={items ? styles.local : undefined} style={{ position: "relative", flexShrink: 0 }}>
      <div className={items ? styles.field : undefined} style={{ ...S.field, ...((open || items) ? S.fieldOpen : null), ...(items ? { minHeight: 46, padding: "3px 12px", width: "100%", boxSizing: "border-box" } : null) }}>
        <button
          className={items ? styles.icon : undefined}
          tabIndex={items ? -1 : undefined}
          aria-hidden={items ? true : undefined}
          type="button"
          onClick={() => { if (items) { setOpen(true); inputRef.current?.focus(); } else { open ? close() : setOpen(true); } }}
          style={S.iconBtn}
          aria-label={open ? "Suche schließen" : ariaLabel}
          title={ariaLabel}
        >
          <SearchGlyph />
        </button>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); onQueryChange?.(e.target.value); setOpen(true); }}
          onFocus={() => { if (items) setOpen(true); }}
          onClick={() => { if (items) setOpen(true); }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          onKeyDown={onKey}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{ ...S.input, ...((open || items) ? S.inputOpen : null), ...(items ? { width: "100%", minWidth: 0, fontSize: "var(--font-size-base)" } : null) }}
          tabIndex={open || items ? 0 : -1}
        />
      </div>

      {(items || (open && q.trim().length >= 2)) && (
        <div className={items ? styles.dropdown : undefined} data-open={open ? "true" : "false"} aria-hidden={!open} style={{ ...S.dropdown, ...(align === "left" ? { left: 0, right: "auto" } : null), ...(items ? { left: 0, right: 0, width: "100%", minWidth: 0, maxWidth: "none", boxSizing: "border-box" } : null) }} role="listbox" id={listId} aria-label={ariaLabel}>
          {loading && !hits.length ? (
            <div style={S.empty}>Suche …</div>
          ) : hits.length ? (
            hits.map((h, i) => (
              <button
                key={h.id}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
                style={{ ...S.hit, background: i === active ? v("--color-bg-muted") : "transparent" }}
              >
                <span style={S.hitName}>{h.label}</span>
                {h.description && <span style={S.hitLevel}>{h.description}</span>}
              </button>
            ))
          ) : (
            <div style={S.empty}>Nichts gefunden</div>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  field: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    border: `1px solid transparent`,
    borderRadius: 10,
    padding: "3px 4px",
    transition: "border-color 0.18s ease, background 0.18s ease",
    color: v("--color-text-secondary"),
  },
  fieldOpen: { border: `1px solid ${v("--color-border")}`, background: v("--color-bg") },
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    padding: 4,
    margin: 0,
    // Lupe in unserem Blau (Akzent), damit sie als Aktion erkennbar ist.
    color: v("--color-accent"),
    cursor: "pointer",
  },
  input: {
    width: 0,
    opacity: 0,
    border: "none",
    outline: "none",
    background: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: v("--font-size-small"),
    color: v("--color-text-primary"),
    transition: "width 0.2s ease, opacity 0.2s ease",
  },
  inputOpen: { width: 190, opacity: 1, padding: "0 4px 0 0" },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    minWidth: 240,
    maxWidth: 300,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 10,
    boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
    padding: 4,
    zIndex: 30,
    maxHeight: 320,
    overflowY: "auto",
  },
  hit: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    background: "none",
    border: "none",
    borderRadius: 7,
    padding: "8px 10px",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  hitName: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  hitLevel: { fontSize: v("--font-size-caption"), color: v("--color-text-muted"), flexShrink: 0 },
  empty: { padding: "10px 12px", fontSize: v("--font-size-small"), color: v("--color-text-muted") },
};
