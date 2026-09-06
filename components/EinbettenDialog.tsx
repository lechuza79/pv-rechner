"use client";

import { useState } from "react";
import Modal from "./Modal";
import { v, space, pad } from "../lib/theme";
import { embedCode, type EmbedAttribution } from "../lib/embed-code";

/**
 * „Diesen Block auf der eigenen Website einbinden" — mit dem fertigen Code für
 * GENAU diesen Ort.
 *
 * WARUM ES DAS GIBT: Der Einbetten-Knopf einer Karte sprang bisher in die
 * Widget-Galerie. Dort steht der Ort dann in einem Abfrageteil, die Seite ist
 * in Du-Form geschrieben, mit „Strommix" überschrieben, und die drei
 * kommunalen Widgets stehen an neunter bis elfter Stelle hinter acht
 * Deutschland-Widgets. Gemessen am 05.09.2026: 289 Briefe an Kommunen haben
 * vier Veröffentlichungen erzeugt und NULL Einbettungen. Wer auf der Ortsseite
 * einbetten will, soll den Code dort bekommen, wo er steht.
 *
 * Der Code selbst kommt aus dem geteilten Baustein (lib/embed-code.ts) —
 * dieselbe Zeile, die die Galerie ausgibt.
 */
export default function EinbettenDialog({
  open,
  onClose,
  /** Was eingebettet wird, im Klartext — steht in der Überschrift. */
  titel,
  src,
  params,
  width,
  height,
  attribution,
  siteUrl,
}: {
  open: boolean;
  onClose: () => void;
  titel: string;
  src: string;
  params?: Record<string, string>;
  width: number;
  height: number;
  attribution: EmbedAttribution;
  siteUrl: string;
}) {
  const [kopiert, setKopiert] = useState(false);
  const code = embedCode({ src, params, width, height, titel, attribution, siteUrl });

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      // Ohne Zwischenablage bleibt der Code im Feld — markieren und kopieren
      // geht weiterhin. Eine Fehlermeldung hülfe hier niemandem.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={titel} maxWidth={620}>
      <p style={S.text}>
        Kopieren Sie diese Zeilen in Ihr Redaktionssystem. Die Zahlen
        aktualisieren sich danach von selbst, sobald das Marktstammdatenregister
        neue Daten veröffentlicht.
      </p>
      <p style={S.text}>
        Der Baustein setzt keine Cookies und legt nichts im Browser Ihrer
        Besucher ab. Bitte lassen Sie den Quellen-Link unter dem Rahmen stehen —
        er ist Teil der Nutzungsbedingungen.
      </p>

      {/* Ein Textfeld statt eines Kastens: markieren und mit der Tastatur
          kopieren funktioniert dann auch, wo die Zwischenablage gesperrt ist —
          in einer Verwaltung ist das der Normalfall, nicht die Ausnahme. */}
      <textarea readOnly value={code} rows={9} spellCheck={false} style={S.feld} onFocus={(e) => e.currentTarget.select()} />

      <div style={S.zeile}>
        <button type="button" onClick={kopieren} style={S.knopf}>
          {kopiert ? "Kopiert" : "Code kopieren"}
        </button>
        <a href="/widget-nutzungsbedingungen" target="_blank" rel="noopener" style={S.link}>
          Nutzungsbedingungen
        </a>
      </div>
    </Modal>
  );
}

const S: Record<string, React.CSSProperties> = {
  text: {
    fontSize: v("--font-size-small"),
    lineHeight: 1.55,
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.md}px`,
  },
  feld: {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: v("--font-size-micro"),
    lineHeight: 1.5,
    color: v("--color-text-primary"),
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    padding: pad("md", "md"),
    resize: "vertical",
  },
  zeile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.lg,
  },
  knopf: {
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    padding: pad("md", "xl"),
    border: "none",
    borderRadius: v("--radius-md"),
    cursor: "pointer",
  },
  link: { fontSize: v("--font-size-small"), color: v("--color-text-secondary") },
};
