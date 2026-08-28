"use client";

import { useRef, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { captureNodeToBlob } from "../../lib/chart-export";

// Der Auslöser zum Senden.
//
// EIN KLICK, KEIN AUTOMAT — und das ist eine Grenze der Technik, keine
// Vorsicht. Das Bild entsteht im BROWSER aus der Karte, die ohnehin auf dem
// Bildschirm steht; einen zweiten Renderweg auf dem Server zu bauen hieße, dass
// das veröffentlichte Bild ein anderes ist als das abgenommene, und genau diese
// Sorte Unterschied merkt niemand, bis er im Feed steht. Ohne Browser gibt es
// also kein Bild — ein nächtlicher Lauf könnte einen bebilderten Beitrag gar
// nicht absenden. Wer den Versand wirklich automatisieren will, braucht zuerst
// einen serverseitigen Renderer; alles andere wäre ein Automat, der die Hälfte
// des Beitrags weglässt.
//
// Alles ANDERE ist automatisch: Was raus darf, entscheidet die Warteschlange aus
// Mechanik, Freigaben und Versandprotokoll. Dieser Knopf fragt nichts und
// beurteilt nichts — er löst aus, was ohnehin freigegeben ist.

export function SendenKnopf({
  postId,
  abdruck,
  bildAlt,
  ersterKommentar,
  kartenRef,
  gesperrtWeil,
}: {
  postId: string;
  /** Abdruck der abgelegten Fassung — Pflichtangabe der Senderoute. */
  abdruck: string;
  /** Bildbeschreibung. Ohne sie weist die Route ab. */
  bildAlt: string;
  ersterKommentar?: string;
  /** Die Karte, die aufgenommen wird. */
  kartenRef: React.RefObject<HTMLDivElement | null>;
  /** Warum gerade nicht gesendet werden darf. Leer = darf. */
  gesperrtWeil?: string;
}) {
  const [laeuft, setLaeuft] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Gegen den Doppelklick. Die echte Sperre sitzt serverseitig im
  // Versandprotokoll — diese hier spart nur den zweiten Netzweg.
  const gesendet = useRef(false);

  async function senden() {
    if (gesendet.current || !kartenRef.current) return;
    if (!confirm("Diesen Beitrag jetzt auf LinkedIn veröffentlichen?")) return;
    gesendet.current = true;
    setLaeuft(true);
    setStatus(null);
    try {
      const blob = await captureNodeToBlob(kartenRef.current);
      const base64 = await new Promise<string>((fertig, schief) => {
        const leser = new FileReader();
        leser.onload = () => fertig(String(leser.result).split(",")[1] ?? "");
        leser.onerror = () => schief(new Error("Bild konnte nicht gelesen werden"));
        leser.readAsDataURL(blob);
      });

      const res = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, fassung: abdruck, bildBase64: base64, bildAlt, ersterKommentar }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; warnung?: string };
      if (!res.ok) {
        // Nach einem ABGELEHNTEN Versuch darf man es wieder versuchen — die
        // Ablehnung heißt ja gerade, dass nichts rausgegangen ist.
        gesendet.current = false;
        setStatus(`Nicht gesendet: ${j.error ?? res.status}`);
        return;
      }
      setStatus(j.warnung ? `Gesendet — ACHTUNG: ${j.warnung}` : "Gesendet.");
    } catch (e) {
      gesendet.current = false;
      setStatus(`Nicht gesendet: ${(e as Error).message}`);
    } finally {
      setLaeuft(false);
    }
  }

  const frei = !gesperrtWeil && !laeuft;

  return (
    <div style={{ marginTop: space.md }}>
      <button
        type="button"
        disabled={!frei}
        onClick={senden}
        title={gesperrtWeil}
        style={{
          padding: pad("xs", "lg"),
          borderRadius: v("--radius-sm"),
          border: "none",
          background: frei ? v("--color-positive-text") : v("--color-border"),
          color: frei ? v("--color-text-on-accent") : v("--color-text-muted"),
          cursor: frei ? "pointer" : "default",
          fontSize: v("--font-size-small"),
          fontWeight: 600,
        }}
      >
        {laeuft ? "Sendet …" : "Auf LinkedIn veröffentlichen"}
      </button>
      {gesperrtWeil && (
        <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), margin: 0, marginTop: space.xxs }}>
          {gesperrtWeil}
        </p>
      )}
      {status && (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: space.xs }}>
          {status}
        </p>
      )}
    </div>
  );
}
