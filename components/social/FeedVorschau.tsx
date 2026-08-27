"use client";

import { useState } from "react";
import { STAGE_COUNT, space, stageDefaults } from "../../lib/theme";
import { SocialKarte } from "./SocialKarte";
import type { PostBild } from "../../lib/social-posts";

// So sieht der Beitrag im Feed aus: Kopfzeile, Text (nach zwei Zeilen
// abgeschnitten), dann das Bild.
//
// Die Reihenfolge ist keine Geschmacksfrage, und sie stand hier zuerst falsch
// herum: Am echten Feed nachgesehen (26.08.2026) kommt der Text ZUERST und wird
// nach rund zwei Zeilen mit „… mehr" gekappt; das Bild steht darunter. Das
// verschiebt die ganze Last auf die ersten beiden Zeilen — wer dort keine
// Aussage hat, bekommt das Bild gar nicht erst angesehen.

const ABSCHNITT_ZEILEN = 2;

// Der Rahmen um den Beitrag gehört LinkedIn, nicht uns. Feste Farben statt
// unserer Tokens: Unsere Seite folgt der Sonne und steht abends auf einer
// dunklen Stufe — die Vorschau sähe dann aus wie ein Feed, den es nicht gibt,
// und man beurteilte den Kontrast gegen den falschen Grund.
const FEED = {
  grund: "#ffffff",
  rand: "#e0dfdc",
  text: "#000000e6",
  gedimmt: "#00000099",
  platzhalter: "#e9e5df",
  erwaehnung: "#0a66c2",
};

/**
 * Der Markenname erscheint im Feed als Erwähnung, also als Link auf die
 * Unternehmensseite. Im Beitragstext steht er als gewöhnliches Wort — die
 * Erwähnung entsteht erst beim Veröffentlichen. Ohne diese Darstellung sähe man
 * in der Vorschau nicht, dass dort ein Verweis liegt.
 */
const MARKE = "Solar Check";

function mitErwaehnungDarstellen(text: string) {
  const teile = text.split(MARKE);
  if (teile.length === 1) return text;
  return teile.flatMap((t, i) =>
    i === 0
      ? [t]
      : [
          <span key={i} style={{ color: FEED.erwaehnung, fontWeight: 600 }}>
            {MARKE}
          </span>,
          t,
        ],
  );
}

// Die Karte dagegen ist unser Produkt — sie wird aber IMMER auf der hellsten
// Tagesstufe aufgenommen (dieselbe Regel wie beim Bild-Export). Sie hier der
// aktuellen Stufe folgen zu lassen hieße, eine Fassung zu beurteilen, die nie
// als Bild entsteht.
const HELLSTE_STUFE = stageDefaults(STAGE_COUNT - 1) as Record<string, string>;

export function FeedVorschau({
  bild,
  text,
  breite = 500,
}: {
  bild: PostBild;
  text: string;
  breite?: number;
}) {
  const [offen, setOffen] = useState(false);
  // Die Karte ist 1080 breit; die Skala ergibt sich aus der Feed-Breite, damit
  // das Verhältnis stimmt, statt geraten zu werden.
  const skala = breite / 1080;

  return (
    <div
      style={{
        width: breite,
        background: FEED.grund,
        border: `1px solid ${FEED.rand}`,
        borderRadius: 8,
        overflow: "hidden",
        color: FEED.text,
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}
    >
      {/* Kopfzeile: Im Feed steht über jedem Beitrag, wer ihn geschrieben hat.
          Sie kostet Platz, den der Text nicht bekommt — deshalb gehört sie in
          die Vorschau, auch wenn sie nichts über den Post aussagt. */}
      <div style={{ display: "flex", gap: space.sm, alignItems: "center", padding: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: FEED.platzhalter,
            flex: "0 0 auto",
          }}
        />
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sebastian Schäder</div>
          <div style={{ fontSize: 12, color: FEED.gedimmt }}>Design meets business.</div>
          <div style={{ fontSize: 12, color: FEED.gedimmt }}>jetzt · 🌐</div>
        </div>
      </div>

      <div style={{ padding: "0 12px 8px" }}>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            ...(offen
              ? {}
              : {
                  display: "-webkit-box",
                  WebkitLineClamp: ABSCHNITT_ZEILEN,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }),
          }}
        >
          {mitErwaehnungDarstellen(text)}
        </div>
        <button
          type="button"
          onClick={() => setOffen((o) => !o)}
          style={{
            marginTop: space.xs,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: FEED.gedimmt,
            fontSize: 14,
          }}
        >
          {offen ? "weniger anzeigen" : "… mehr"}
        </button>
      </div>

      {/* Eigene Token-Hülle: Die Karte steht auf der hellsten Stufe, unabhängig
          davon, welche Tagesstufe die umgebende Seite gerade zeigt. */}
      <div style={HELLSTE_STUFE as React.CSSProperties}>
        <SocialKarte bild={bild} skala={skala} />
      </div>
    </div>
  );
}
