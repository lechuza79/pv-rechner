"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";

// Die sich selbst meldenden Hilfetexte der Bildexport-Systematik.
//
// Ein <InfoTooltip> innerhalb eines <ExportNotesProvider> trägt seinen Text
// automatisch in den Bild-Fuß ein — niemand muss daran denken, einen Tooltip ins
// Bild zu kopieren. Genau dieses Vergessen war der Grund für die Schicht.
//
// Warum ein eigenes Modul (und nicht in components/WidgetExport.tsx): dort
// hängen CiteModal, ChartActionBar und die Marken-Bausteine dran. InfoTooltip
// braucht davon nichts — und InfoTooltip steht auf der Startseite und in jedem
// Rechner. components/WidgetExport.tsx re-exportiert alles hier Definierte
// weiter, damit bestehende Aufrufer unverändert bleiben.

export interface ExportNote {
  id: string;
  title?: string;
  text: string;
}

type RegisterFn = (note: ExportNote) => () => void;

const ExportNotesCtx = createContext<RegisterFn | null>(null);
const ExportNotesReadCtx = createContext<ExportNote[]>([]);

/**
 * Collects the help texts rendered inside it. Wrap a widget card in this and
 * every InfoTooltip below reports its content, in mount order, to
 * `WidgetExportFooter`.
 */
export function ExportNotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<ExportNote[]>([]);

  // Reihenfolge = Reihenfolge der ERSTEN Anmeldung, nicht die der aktuellen.
  // Ohne das springt eine Notiz im Bild ans Ende, sobald sich ihr Text ändert
  // (der Effekt räumt erst auf und meldet dann neu an) — im Grüngas-Widget
  // passiert das bei jedem Umschalten des Gebäudestands.
  const reihenfolge = useRef<Map<string, number>>(new Map());
  const naechste = useRef(0);

  const register = useCallback<RegisterFn>((note) => {
    if (!reihenfolge.current.has(note.id)) reihenfolge.current.set(note.id, naechste.current++);
    setNotes((prev) => {
      const i = prev.findIndex((n) => n.id === note.id);
      if (i === -1) return [...prev, note];
      // Gleicher Text: nichts tun, sonst rendert der Provider endlos.
      if (prev[i].title === note.title && prev[i].text === note.text) return prev;
      const next = prev.slice();
      next[i] = note;
      return next;
    });
    return () => setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }, []);

  // Stabil sortiert, danach entdoppelt: derselbe Text zweimal gezeigt (ein
  // Tooltip in der breiten UND in der schmalen Fassung) ist eine Notiz im Bild.
  const deduped = useMemo(() => {
    const sortiert = [...notes].sort(
      (a, b) => (reihenfolge.current.get(a.id) ?? 0) - (reihenfolge.current.get(b.id) ?? 0)
    );
    const seen = new Set<string>();
    return sortiert.filter((n) => {
      const key = `${n.title ?? ""}|${n.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [notes]);

  return (
    <ExportNotesCtx.Provider value={register}>
      <ExportNotesReadCtx.Provider value={deduped}>{children}</ExportNotesReadCtx.Provider>
    </ExportNotesCtx.Provider>
  );
}

export function useExportNotes(): ExportNote[] {
  return useContext(ExportNotesReadCtx);
}

/** Registers one help text for the image footer. No-op outside a provider, so
 * InfoTooltip stays usable on plain pages. */
export function useRegisterExportNote(title: string | undefined, text: string, enabled = true) {
  const register = useContext(ExportNotesCtx);
  const id = useId();
  useEffect(() => {
    if (!register || !enabled || !text) return;
    return register({ id, title, text });
  }, [register, enabled, id, title, text]);
}

/** Flattens a tooltip's children into plain text for the image footer. Handles
 * strings, numbers, arrays and elements whose children are themselves text —
 * which covers every tooltip in this codebase (text with interpolated values). */
export function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (typeof node === "object" && "props" in (node as { props?: unknown })) {
    const el = node as { props?: { children?: React.ReactNode } };
    return nodeToText(el.props?.children);
  }
  return "";
}
