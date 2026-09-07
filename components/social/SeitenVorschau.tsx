"use client";

import { useState } from "react";
import Modal from "../Modal";
import { OrtsTeaser, OrtsStoryKarte } from "./OrtsStoryAnsicht";
import { v, space } from "../../lib/theme";
import type { SocialPost } from "../../lib/social-posts";
import type { OrtsBeitrag } from "../../lib/orts-posts";

/**
 * DERSELBE BEITRAG, ABER AUF EINER SEITE STATT IM FEED.
 *
 * Ein Beitrag hat zwei Ausgabeformen, und sie sind nicht dasselbe in anderer
 * Größe (Betreiber, 07.09.2026): Im Feed steht Text zuerst und das Bild
 * darunter, gelesen wird beim Vorbeiscrollen. Auf einer Seite steht die
 * Geschichte in einer Reihe von Teasern, und wer sie sehen will, macht sie auf.
 *
 * ES GIBT SIE HEUTE IN ZWEI BAUFORMEN, und das ist kein Versehen:
 *
 *  • ORTSGESCHICHTE → Teaser, dahinter die Bildkarte im Fenster. So steht sie
 *    auf jeder Gemeindeseite. Gezeigt wird hier exakt dieselbe Ansicht wie
 *    dort, aus denselben Bauteilen.
 *
 *  • ABSCHNITT → Überschrift und zwei bis drei Absätze im Fließtext einer
 *    Leseseite, in anderer Stimme als der Feed (der spricht in der ersten
 *    Person, eine Ratgeberseite nicht). Das ist die Fassung, die Google liest;
 *    sie durch einen Teaser zu ersetzen kostet indexierten Text.
 *
 * WO NICHTS IST, STEHT DAS AUCH SO DA. Zwölf der vierzehn bundesweiten
 * Beiträge haben bis heute keine Seitenfassung — eine Lücke, die vorher
 * niemand zählen konnte, weil das Werkzeug nur den Feed zeigte.
 */
export function SeitenVorschau({
  post,
  orts,
  breite = 440,
}: {
  post: SocialPost;
  orts?: OrtsVorschau;
  /** Dieselbe Breite wie die Feed-Vorschau daneben — sonst springt das Raster
   *  beim Umschalten der Ausgabeform. */
  breite?: number;
}) {
  const [offen, setOffen] = useState(false);

  if (orts) {
    return (
      <div style={{ width: breite, maxWidth: "100%" }}>
        <div style={S.hinweis}>Teaser in der Reihe auf {orts.ortName}s Seite</div>
        {/* Die Reihe ist eine Spur mit mehreren Teasern; hier steht einer davon
            in seiner echten Breite. Die Spur selbst nachzubauen zeigte nichts
            über DIESE Geschichte, nur über das Blättern. */}
        {/* 280 Pixel: die Mitte dessen, was die Spur auf der Seite hergibt
            (240 bis 320). Am schmalen Ende beurteilt man einen Ausnahmefall,
            am breiten den bequemsten. */}
        <div style={{ display: "flex", width: 280 }}>
          <OrtsTeaser beitrag={orts.beitrag} onOeffnen={() => setOffen(true)} />
        </div>

        <Modal
          open={offen}
          onClose={() => setOffen(false)}
          title={`Aktuelles aus ${orts.ortName}`}
          ariaLabel={post.bild?.aussage ?? post.titel}
          maxWidth={560}
        >
          <OrtsStoryKarte
            beitrag={orts.beitrag}
            name={orts.ortName}
            liveUrl={orts.liveUrl}
            standIso={orts.standIso}
          />
        </Modal>
      </div>
    );
  }

  if (post.onsite) {
    return (
      <div style={{ width: breite, maxWidth: "100%" }}>
        <div style={S.hinweis}>Abschnitt auf der Leseseite</div>
        <div style={S.blatt}>
          <h2 style={S.h2}>{post.onsite.ueberschrift}</h2>
          {post.onsite.absaetze.map((a) => (
            <p key={a.slice(0, 40)} style={S.absatz}>
              {a}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: breite, maxWidth: "100%" }}>
      <div style={S.hinweis}>Auf der Seite</div>
      <div style={{ ...S.blatt, color: v("--color-text-secondary") }}>
        <p style={{ ...S.absatz, marginTop: 0 }}>
          Diesen Beitrag gibt es nur für den Feed. Eine Fassung für eine Seite — ein Abschnitt im
          Fließtext oder eine Geschichte hinter einem Teaser — ist noch nicht geschrieben.
        </p>
      </div>
    </div>
  );
}

/** Was eine Ortsgeschichte über den Beitrag hinaus braucht, um auf ihrer Seite zu stehen. */
export type OrtsVorschau = {
  beitrag: OrtsBeitrag;
  ortName: string;
  /** Kanonische Adresse der Ortsseite — sie wandert ins Teilen-Ziel der Karte. */
  liveUrl: string;
  standIso: string;
};

const S: Record<string, React.CSSProperties> = {
  hinweis: {
    fontSize: v("--font-size-caption"),
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: v("--color-text-muted"),
    marginBottom: space.sm,
  },
  // Der Rahmen deutet die Leseseite an, ohne sie nachzubauen: Was hier
  // beurteilt wird, ist der Text, nicht das Seitenlayout.
  blatt: {
    border: `1px solid ${v("--color-border-muted")}`,
    borderRadius: v("--radius-md"),
    padding: space.xl,
    background: v("--color-bg"),
  },
  h2: { fontSize: v("--font-size-h3"), fontWeight: 700, margin: 0, lineHeight: 1.25 },
  absatz: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.6,
    color: v("--color-text-primary"),
    margin: `${space.md}px 0 0`,
  },
};
