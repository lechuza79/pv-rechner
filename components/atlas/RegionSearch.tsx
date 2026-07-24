"use client";

import { useEffect, useRef, useState } from "react";
import { v } from "../../lib/theme";

// Lupe — inline, weil Icons.tsx keine Such-Glyphe hat.
function SearchGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type SearchHit = { region_id: string; name: string; label: string };

/**
 * Regionssuche: Lupe → Feld klappt auf + fokussiert; Tippen (ab 2 Zeichen,
 * entprellt) fragt /api/atlas/search ab. Findet Gemeinden, Kreise, Bundesländer.
 *
 * Zwei Verhalten je nach Ort:
 * - `onPick` gesetzt (Karten-Bar): der Treffer wirkt wie ein Karten-Klick —
 *   Bundesland/Landkreis filtern die Karte in-place, Gemeinde/kreisfreie Stadt
 *   öffnen ihre Seite (das entscheidet der Aufrufer in handleSelect).
 * - `onPick` NICHT gesetzt (Seiten-Breadcrumb): der Treffer NAVIGIERT zur Seite
 *   der Region über /api/atlas/goto (Gemeinde → Detailseite, Kreis/BL → deren
 *   Atlas-Seite).
 */
export default function RegionSearch({
  onPick,
  align = "right",
}: {
  onPick?: (ags: string, name: string, kreisfrei: boolean) => void;
  /** Auf welcher Seite das Vorschlags-Panel andockt. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = () => {
    setOpen(false);
    setQ("");
    setHits([]);
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
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/atlas/search?q=${encodeURIComponent(term)}`);
        const json = (await res.json()) as { hits?: SearchHit[] };
        setHits(json.hits ?? []);
        setActive(-1);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (h: SearchHit) => {
    close();
    if (onPick) {
      // kreisfrei-Info steckt im Label ("Kreisfreie Stadt" / "Stadtkreis").
      onPick(h.region_id, h.name, /Kreisfreie Stadt|Stadtkreis/i.test(h.label));
    } else {
      window.location.href = `/api/atlas/goto?ags=${h.region_id}`;
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
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
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ ...S.field, ...(open ? S.fieldOpen : null) }}>
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          style={S.iconBtn}
          aria-label={open ? "Suche schließen" : "Region suchen"}
          title="Region suchen"
        >
          <SearchGlyph />
        </button>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Gemeinde, Kreis, Land …"
          aria-label="Region suchen"
          style={{ ...S.input, ...(open ? S.inputOpen : null) }}
          tabIndex={open ? 0 : -1}
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div style={{ ...S.dropdown, ...(align === "left" ? { left: 0, right: "auto" } : null) }} role="listbox">
          {loading && !hits.length ? (
            <div style={S.empty}>Suche …</div>
          ) : hits.length ? (
            hits.map((h, i) => (
              <button
                key={h.region_id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
                style={{ ...S.hit, background: i === active ? v("--color-bg-muted") : "transparent" }}
              >
                <span style={S.hitName}>{h.name}</span>
                <span style={S.hitLevel}>{h.label}</span>
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
    fontSize: 13,
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
    fontSize: 14,
    color: v("--color-text-primary"),
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  hitLevel: { fontSize: 11, color: v("--color-text-muted"), flexShrink: 0 },
  empty: { padding: "10px 12px", fontSize: 13, color: v("--color-text-muted") },
};
