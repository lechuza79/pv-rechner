import { ReactNode } from "react";
import { v } from "../lib/theme";
import { IconCheck, IconClose } from "./Icons";

// Two lists side by side: "when it works" (✓) vs. "where it gets tight" (✗).
// DELIBERATELY neutral — no green/blue. The icons and terms carry the meaning
// through shape (check vs. cross) + bold, not colour. Each item is a bold
// neutral term plus an explanation. Mobile: the two columns stack.
//
// Shared by both guides (Speicher: lohnt/lohnt-nicht; EEG: Eigenverbrauch-Hebel
// vs. wo es eng wird).

export interface ProConItem {
  /** Bold, neutral lead-in (a keyword). */
  term: string;
  /** Explanation — may contain links. */
  desc: ReactNode;
}

function List({ title, items, kind }: { title: string; items: ProConItem[]; kind: "pro" | "con" }) {
  return (
    <div
      style={{
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-lg"),
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: v("--font-size-caption"),
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: v("--color-text-secondary"),
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                marginTop: 2,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: v("--color-bg-muted"),
                border: `1px solid ${v("--color-border")}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: v("--color-text-secondary"),
              }}
            >
              {kind === "pro" ? <IconCheck size={11} /> : <IconClose size={11} />}
            </span>
            <span style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-muted") }}>
              <strong style={{ fontWeight: 700, color: v("--color-text-primary") }}>{item.term}:</strong> {item.desc}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProConLists({
  proTitle,
  proItems,
  conTitle,
  conItems,
}: {
  proTitle: string;
  proItems: ProConItem[];
  conTitle: string;
  conItems: ProConItem[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <List title={proTitle} items={proItems} kind="pro" />
      <List title={conTitle} items={conItems} kind="con" />
    </div>
  );
}
