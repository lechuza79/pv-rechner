"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { v } from "../lib/theme";
import { sourceLabel } from "../lib/data-sources";
import { OWN_WORK_LICENSE } from "../lib/license";
import type { WidgetDef } from "../lib/widget-registry";

// Ein-Klick-Zitat für Redaktionen.
//
// Der Grund, warum das hier steht und nicht in einer Doku: Ob jemand die Grafik
// verlinkt oder nur einen Screenshot einsetzt, entscheidet sich in den zehn
// Sekunden, in denen er die Quelle notiert. Wer dafür erst nachschlagen muss,
// wie wir heißen und unter welcher Lizenz das steht, lässt den Link weg. Zwei
// Kopierknöpfe kosten uns nichts und nehmen genau diese Hürde.
//
// Zwei Formen, weil es zwei Wege gibt: HTML für Online-Artikel (mit gesetztem
// Link — das ist der Backlink), Klartext für Print, PDF und Präsentationen.

// Lizenzcode und -link kommen aus lib/license.ts — dieselbe Quelle, aus der die
// Lizenzseite spricht. Ein zweiter getippter Code wäre der Fehler, den wir uns
// gerade abschauen: mehrere Seiten, die die Lizenz leicht verschieden angeben.
const SITE = OWN_WORK_LICENSE.attributionName;
const LIZENZ = OWN_WORK_LICENSE.code;
const LIZENZ_URL = OWN_WORK_LICENSE.url;

function heute(): string {
  return new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function citeHtml(widget: WidgetDef, datum: string): string {
  const quellen = widget.sources.map(sourceLabel).join(" · ");
  return (
    `<p>Grafik: <a href="${widget.shareUrl}">${widget.title}</a> — ` +
    `<a href="https://${SITE}">${SITE}</a>, ` +
    `<a href="${LIZENZ_URL}">${LIZENZ}</a>. ` +
    `Datenquelle: ${quellen}. Abgerufen am ${datum}.</p>`
  );
}

// Die Lizenz-URL steht auch im Klartext-Zitat: CC BY 4.0 Sec. 3(a)(1)(C)
// verlangt zur Namensnennung Text, URI oder Hyperlink der Lizenz. In der
// HTML-Fassung erfüllt das der gesetzte Link — im Klartext (Print, PDF, Folie)
// gibt es keinen, also muss die Adresse ausgeschrieben dastehen.
export function citePlain(widget: WidgetDef, datum: string): string {
  const quellen = widget.sources.map(sourceLabel).join(" · ");
  return (
    `${widget.title}. ${SITE}, ${LIZENZ} (${LIZENZ_URL}). ` +
    `Datenquelle: ${quellen}. Abgerufen am ${datum}. ${widget.shareUrl}`
  );
}

function Feld({ titel, hinweis, text }: { titel: string; hinweis: string; text: string }) {
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    if (!kopiert) return;
    const id = setTimeout(() => setKopiert(false), 2000);
    return () => clearTimeout(id);
  }, [kopiert]);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary") }}>{titel}</div>
          <div style={{ fontSize: 12, color: v("--color-text-muted") }}>{hinweis}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => setKopiert(true)).catch(() => {});
          }}
          style={{
            flexShrink: 0,
            padding: "6px 12px",
            borderRadius: v("--radius-md"),
            border: "none",
            background: kopiert ? v("--color-positive") : v("--color-accent"),
            color: v("--color-text-on-accent"),
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {kopiert ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <div
        style={{
          background: v("--color-bg-muted"),
          borderRadius: v("--radius-md"),
          padding: "10px 12px",
          fontFamily: v("--font-mono"),
          fontSize: 11.5,
          lineHeight: 1.6,
          color: v("--color-text-secondary"),
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function CiteModal({
  widget,
  open,
  onClose,
}: {
  widget: WidgetDef;
  open: boolean;
  onClose: () => void;
}) {
  // Erst nach dem Mounten, damit Server- und Client-Render nicht auseinander-
  // laufen (das Datum wechselt um Mitternacht).
  const [datum, setDatum] = useState("");
  useEffect(() => setDatum(heute()), []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Diese Grafik zitieren"
      // Bewusst präzise: Unter CC BY steht unsere Darstellung. Die Daten haben
      // eigene Lizenzen — beim IW-Report etwa nur ein Zitatrecht, das wir nicht
      // weitergeben können.
      intro="Unsere Darstellung steht unter CC BY 4.0 — auch redaktionell und gewerblich nutzbar, Bedingung ist die Nennung mit Link. Für die Daten gilt die Lizenz ihrer Quelle, die im Zitat mitgenannt wird."
      maxWidth={560}
    >
      <Feld
        titel="Für Online-Artikel"
        hinweis="HTML mit gesetztem Link"
        text={citeHtml(widget, datum || heute())}
      />
      <Feld
        titel="Für Print, PDF und Präsentation"
        hinweis="Klartext"
        text={citePlain(widget, datum || heute())}
      />
      <p style={{ fontSize: 12.5, lineHeight: 1.6, color: v("--color-text-muted"), margin: 0 }}>
        Was erlaubt ist und wie eine Nutzung ohne Namensnennung geht, steht auf{" "}
        <a href="/lizenz" style={{ color: v("--color-accent"), fontWeight: 600 }}>
          solar-check.io/lizenz
        </a>
        .
      </p>
    </Modal>
  );
}
