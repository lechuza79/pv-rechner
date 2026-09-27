"use client";
import { useEffect, useState } from "react";
import { v, space } from "../../lib/theme";
import Modal from "../Modal";
import { OrtsStoryKarte } from "./OrtsStoryAnsicht";
import type { StoryEdition } from "../../lib/orts-story-feed";

export function StoryFesthalten({ postId, abdruck, disabled, name }: {
  postId: string; abdruck: string; disabled: boolean; name: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [edition, setEdition] = useState<StoryEdition | null>(null);
  const [open, setOpen] = useState(false);
  const regionId = /^ort-(\d{8})-/.exec(postId)?.[1];
  useEffect(() => {
    setEdition(null); setOpen(false); setError("");
    if (!regionId) return;
    const controller = new AbortController();
    fetch(`/api/social/story-feed?regionId=${regionId}&postId=${encodeURIComponent(postId)}`, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error("Gespeicherte Story nicht abrufbar"); return r.json(); })
      .then(r => { if (!controller.signal.aborted) setEdition(r.editions[0] ?? null); })
      .catch(e => { if (!controller.signal.aborted) setError((e as Error).message); });
    return () => controller.abort();
  }, [regionId, postId]);
  if (!regionId) return null;
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/social/story-feed", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionId, postId, fassung: abdruck, action: "save" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Speichern fehlgeschlagen");
      setEdition(result.edition);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div style={{ marginTop: space.lg }}>
    <button type="button" disabled={disabled || busy} onClick={save}
      style={{ padding: `${space.sm} ${space.md}`, border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), background: "transparent", color: v("--color-text-primary"), font: "inherit" }}>
      {busy ? "Wird gespeichert …" : "Story festhalten"}
    </button>
    <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-secondary") }}>
      {disabled ? "Bitte zuerst offene Änderungen speichern." : "Behält Text, Grafikdaten und Datenstand. Noch nicht veröffentlicht."}
    </p>
    {edition && <button type="button" onClick={() => setOpen(true)}>Gespeicherte Story ansehen</button>}
    {error && <p role="alert">{error}</p>}
    <Modal open={open} onClose={() => setOpen(false)} title="Gespeicherte Story" maxWidth={560}>
      {edition && <OrtsStoryKarte beitrag={edition.beitrag} name={name} liveUrl="" standIso={edition.sourceDate} />}
    </Modal>
  </div>;
}
