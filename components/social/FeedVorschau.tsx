"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
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
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border-muted")}`,
        borderRadius: v("--radius-md"),
        overflow: "hidden",
      }}
    >
      {/* Kopfzeile: Im Feed steht über jedem Beitrag, wer ihn geschrieben hat.
          Sie kostet Platz, den der Text nicht bekommt — deshalb gehört sie in
          die Vorschau, auch wenn sie nichts über den Post aussagt. */}
      <div style={{ display: "flex", gap: space.sm, alignItems: "center", padding: pad("lg", "lg") }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: v("--color-bg-muted"),
            flex: "0 0 auto",
          }}
        />
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: v("--font-size-body"), fontWeight: 600 }}>Sebastian Schäder</div>
          <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
            Design meets business.
          </div>
          <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>jetzt · 🌐</div>
        </div>
      </div>

      <div style={{ padding: `0 ${space.lg}px ${space.md}px` }}>
        <div
          style={{
            fontSize: v("--font-size-body"),
            lineHeight: 1.5,
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
          {text}
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
            color: v("--color-text-muted"),
            fontSize: v("--font-size-small"),
          }}
        >
          {offen ? "weniger anzeigen" : "… mehr"}
        </button>
      </div>

      <SocialKarte bild={bild} skala={skala} />
    </div>
  );
}
