"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Toast from "./Toast";
import StandortField from "./StandortField";
import Collapse from "./Collapse";
import styles from "./StandortPrompt.module.css";

export type StandortSelection = { plz: string; ags: string; name: string };

/** Draft location stays here; only Save may update the calculator. */
export default function StandortPrompt({ open, onClose, onSave, alignTo, message = "Vielleicht gibt es Förderung an deinem Wohnort" }: {
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
  return <Toast open={open} alignTo={alignTo} tone="awareness" onClose={onClose} closeDisabled={saving} expanded={editing}>
    <div className={styles.prompt} ref={contentRef} role="group" aria-label="Standort prüfen">
      <div className={styles.heading}>
        <span>{message}</span>
        {!editing && <button ref={triggerRef} type="button" className={styles.action} onClick={edit}>Standort eingeben</button>}
      </div>
      <Collapse open={editing}>
        {editing && <div className={styles.editor}>
          <StandortField searchPlaces plz="" onPlzChange={() => {}} onSubmit={() => {}} confirmed={false} loading={saving} submitLabel="Speichern"
            onPlaceSelect={async place => {
              setSaving(true);
              try { await onSave(place); onClose(); }
              finally { setSaving(false); }
            }} />
          <button type="button" className={styles.cancel} disabled={saving} onClick={cancel}>Abbrechen</button>
        </div>}
      </Collapse>
    </div>
  </Toast>;
}
