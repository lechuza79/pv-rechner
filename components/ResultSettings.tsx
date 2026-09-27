"use client";

import { useState, type ReactNode } from "react";
import { AccordionField } from "./AccordionField";
import Modal from "./Modal";
import FlowNav from "./FlowNav";
import { v, space, pad } from "../lib/theme";

/** Shared result editor: changes remain a draft until explicitly applied. */
export default function ResultSettings<T extends Record<string, number>>({
  title, summary, values, onApply, children, triggerId, flow = false,
}: {
  flow?: boolean;
  triggerId?: string;
  title: string;
  summary: string;
  values: T;
  onApply: (values: T) => void;
  children: (draft: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const [draft, setDraft] = useState<T | null>(null);
  const [initial, setInitial] = useState<T | null>(null);
  const changed = !!draft && !!initial && Object.keys(initial).some(key => draft[key] !== initial[key]);
  return <>
    {flow ? <AccordionField triggerId={triggerId} completedStyle="check" label={title} answered summary={summary} open={false} onEdit={() => { setInitial({ ...values }); setDraft({ ...values }); }}>{null}</AccordionField> : <button id={triggerId} type="button" onClick={() => { setInitial({ ...values }); setDraft({ ...values }); }}
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: space.md,
        width: "100%", padding: pad("lg", "xl"), marginBottom: space.xl, cursor: "pointer",
        borderRadius: v("--radius-md"), border: `1px solid ${v("--color-border")}`,
        background: v("--color-bg"), color: v("--color-text-primary"), fontSize: v("--font-size-small"), textAlign: "left" }}>
      <strong>{title}</strong><span>{summary}</span>
    </button>}
    <Modal open={draft !== null} onClose={() => setDraft(null)} title={title}
      intro="Änderungen werden erst beim Neuberechnen übernommen.">
      {draft && <div style={{ display: "grid", gap: space.xl, marginBottom: space.xl, fontSize: v("--font-size-body") }}>
        {children(draft, patch => setDraft(previous => previous ? { ...previous, ...patch } : previous))}
      </div>}
      <FlowNav zurueckLabel="Abbrechen" onZurueck={() => setDraft(null)}
        weiterLabel="Ergebnis neu berechnen" weiterAktiv={changed} inaktivHinweis="Ändere zuerst eine Angabe."
        onWeiter={() => { if (draft && changed) { onApply(draft); setDraft(null); } }} />
    </Modal>
  </>;
}
