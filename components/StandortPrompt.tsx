"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Toast from "./Toast";
import StandortField from "./StandortField";
import styles from "./StandortPrompt.module.css";

export type StandortSelection = { plz: string; ags: string; name: string };

/** Draft location stays here; only Save may update the calculator. */
export default function StandortPrompt({ open, onClose, onSave, alignTo, message = "Förderung möglich\nan deinem Wohnort" }: {
  open: boolean;
  onClose: () => void;
  onSave: (place: StandortSelection) => Promise<void>;
  alignTo?: RefObject<HTMLElement | null>;
  message?: string;
}) {
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
  return <Toast open={open} alignTo={alignTo} tone="awareness" onClose={editing ? cancel : onClose} closeLabel={editing ? "Abbrechen" : "Schließen"} closeDisabled={saving}>
    <div className={styles.prompt} ref={contentRef} role="group" aria-label="Standort prüfen">
      <span className={styles.message}>{message}</span>
      <div className={styles.control}>
        {editing ? <StandortField compact searchPlaces plz="" onPlzChange={() => {}} onSubmit={() => {}} confirmed={false} loading={saving} submitLabel="Speichern"
          onPlaceSelect={async place => {
            setSaving(true);
            try { await onSave(place); onClose(); }
            finally { setSaving(false); }
          }} /> : <button ref={triggerRef} type="button" className={styles.action} onClick={edit}>Standort eingeben</button>}
      </div>
    </div>
  </Toast>;
}
