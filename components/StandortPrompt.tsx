"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Toast from "./Toast";
import StandortField from "./StandortField";
import styles from "./StandortPrompt.module.css";

export type StandortSelection = { plz: string; ags: string; name: string };

/** Draft location stays here; only Save may update the calculator. */
export default function StandortPrompt({ open, onClose, onSave, resultKey, onResultChange, onFeedbackChange, alignTo, message = "Genauer rechnen &\nFörderung prüfen" }: {
  open: boolean;
  onClose: () => void;
  onSave: (place: StandortSelection) => Promise<void>;
  resultKey?: string;
  onResultChange?: () => void;
  onFeedbackChange?: (visible: boolean) => void;
  alignTo?: RefObject<HTMLElement | null>;
  message?: string;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completion, setCompletion] = useState<{ before?: string; name: string } | null>(null);
  const callbacks = useRef({ onResultChange, onFeedbackChange });
  callbacks.current = { onResultChange, onFeedbackChange };
  useEffect(() => {
    if (!completion) return;
    const changed = completion.before !== resultKey;
    setFeedback(`${completion.name} übernommen. ${changed ? "Ergebnis aktualisiert." : "Dein Ergebnis bleibt unverändert."}`);
    callbacks.current.onFeedbackChange?.(true);
    setCompletion(null);
    if (changed) callbacks.current.onResultChange?.();
  }, [completion, resultKey]);
  const dismissFeedback = () => { setFeedback(null); callbacks.current.onFeedbackChange?.(false); };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) setEditing(false); }, [open]);
  const edit = () => {
    setEditing(true);
    requestAnimationFrame(() => contentRef.current?.querySelector("input")?.focus());
  };
  const cancel = () => { setEditing(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  return <><Toast open={open && !feedback} alignTo={alignTo} tone="awareness" onClose={editing ? cancel : onClose} closeLabel={editing ? "Abbrechen" : "Schließen"} closeDisabled={saving}>
    <div className={styles.prompt} ref={contentRef} role="group" aria-label="Standort prüfen">
      <span className={styles.message}>{message}</span>
      <div className={styles.control}>
        {editing ? <StandortField compact searchPlaces plz="" onPlzChange={() => {}} onSubmit={() => {}} confirmed={false} loading={saving} submitLabel="Speichern"
          onPlaceSelect={async place => {
            setSaving(true);
            try { await onSave(place); setCompletion({ before: resultKey, name: place.name }); onClose(); }
            finally { setSaving(false); }
          }} /> : <button ref={triggerRef} type="button" className={styles.action} onClick={edit}>Standort eingeben</button>}
      </div>
    </div>
  </Toast>
    <Toast open={feedback !== null} alignTo={alignTo} tone="awareness" autoHideMs={10000} showCountdown onClose={dismissFeedback}>{feedback}</Toast>
  </>;
}
