"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { FeedVorschau } from "./FeedVorschau";
import { VorlagenEditor } from "./VorlagenEditor";
import { Kennung } from "./Kennung";
import { fuelle } from "../../lib/social-vorlage";
import { KARTEN_STILE, KARTEN_STIL_NAME, KARTEN_STIL_STANDARD, type KartenStil } from "../../lib/social-karten-stil";
import { urteil, type Pruefung } from "../../lib/social-pruefung-kern";
import type { PostBild, SocialPost } from "../../lib/social-posts";

const BILDFORM: Record<PostBild["art"], string> = {
  vergleich: "Balken",
  kennzahl: "Einzelkennzahl",
  donut: "Ringpaar",
  saeule: "Säule",
};

// Eine Story am Redaktionstisch: so, wie sie im Feed steht, plus die drei
// Stellschrauben — Farbschema, Formulierung, Freigabe.
//
// Der Editor ist ZU, bis jemand ihn aufmacht. Vorher stand er neben jeder
// Vorschau, und die Seite war eine Reihe von Textfeldern mit Bildern daneben.
// Ein Werkzeug, an dem das Design ausgearbeitet werden soll, muss zuerst das
// Design zeigen.
//
// Das Urteil über die Freigabe wird HIER gerechnet, nicht auf dem Server
// mitgeliefert: Wer das Farbschema umschaltet oder eine Formulierung ändert,
// soll im selben Moment sehen, dass die Freigabe damit weg ist. Genau das ist
// die Eigenschaft, die vorher fehlte — der Abdruck hing nur am Text, also blieb
// eine Freigabe bestehen, während das Bild ein anderes wurde.

export function StoryTisch({
  post,
  pruefungen,
  kategorieHinweis,
  ohneTitel,
}: {
  post: SocialPost;
  pruefungen: Pruefung[];
  /**
   * Überschrift weglassen — für den Tisch im Fenster, dessen Kopfzeile den
   * Titel schon trägt. Sonst stünde er zweimal untereinander.
   */
  ohneTitel?: boolean;
  /**
   * Woher die Story kommt, mit Link dorthin. Nur in der ungefilterten Ansicht:
   * Innerhalb einer Kategorie stünde an jeder Karte dasselbe.
   */
  kategorieHinweis?: { name: string; href: string };
}) {
  const [stil, setStil] = useState<KartenStil>(post.bild?.stil ?? KARTEN_STIL_STANDARD);
  const [entwurf, setEntwurf] = useState(post.vorlage ?? "");
  const [offen, setOffen] = useState(false);
  const [stilStatus, setStilStatus] = useState<string | null>(null);

  const werte = Object.fromEntries((post.platzhalter ?? []).map((p) => [p.name, p.wert]));
  // Bearbeitbare Posts zeigen den Entwurf, die übrigen ihren eingebauten Text.
  const text = post.vorlage ? fuelle(entwurf, werte) : post.text;
  const bild = post.bild ? { ...post.bild, stil } : null;
  const stand = urteil({ text, bild }, pruefungen);

  /**
   * Farbschema wählen — und bei einem Fehlschlag ZURÜCKNEHMEN.
   *
   * Die Vorschau darf nichts zeigen, was nicht gespeichert ist. Sonst steht die
   * Karte auf Blau, die Ablage auf Hell, und beim Veröffentlichen ginge ein
   * anderes Bild raus als das eben abgenommene — dieselbe Lücke, die der Umbau
   * gerade schließt, nur eine Etage höher. Beim Ausprobieren aufgefallen: Die
   * Meldung stand da, die Karte war trotzdem blau.
   */
  async function stilWaehlen(neu: KartenStil) {
    const vorher = stil;
    setStil(neu);
    setStilStatus(null);
    try {
      const res = await fetch("/api/social/fassung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, stil: neu }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setStil(vorher);
        setStilStatus(
          res.status === 401
            ? "Nicht gespeichert — die Anmeldung ist abgelaufen. Neu anmelden und noch einmal wählen."
            : `Nicht gespeichert: ${j.error ?? res.status}`,
        );
      }
    } catch (e) {
      setStil(vorher);
      setStilStatus(`Nicht gespeichert: ${(e as Error).message}`);
    }
  }

  return (
    <section
      style={{
        borderTop: `1px solid ${v("--color-border-muted")}`,
        paddingTop: space.xxl,
        display: "flex",
        gap: space.xxxl,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "0 0 auto" }}>
        <FeedVorschau bild={bild!} text={text} breite={440} />
      </div>

      <div style={{ flex: "1 1 440px", minWidth: 340 }}>
        {kategorieHinweis && (
          <a
            href={kategorieHinweis.href}
            style={{
              fontSize: v("--font-size-caption"),
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: v("--color-accent"),
              textDecoration: "none",
            }}
          >
            {kategorieHinweis.name}
          </a>
        )}
        {!ohneTitel && (
          <h3 style={{ fontSize: v("--font-size-h3"), margin: 0, marginTop: kategorieHinweis ? space.xs : 0 }}>
            {post.titel}
          </h3>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space.sm,
            flexWrap: "wrap",
            marginTop: space.xs,
          }}
        >
          <Kennung id={post.id} />
          <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
            {post.kanal.join(" · ")} · {BILDFORM[post.bild?.art ?? "vergleich"]} · {text.length} Zeichen
          </span>
        </div>

        {/* Farbschema: Eigenschaft der Karte, nicht der Ansicht. Wird sofort
            gespeichert und wandert damit ins veröffentlichte Bild mit. */}
        <div style={{ marginTop: space.lg }}>
          <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
            Farbschema der Karte
          </div>
          <div style={{ display: "flex", gap: space.xs, flexWrap: "wrap", alignItems: "center" }}>
            {KARTEN_STILE.map((s) => {
              const aktiv = s === stil;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={aktiv}
                  onClick={() => stilWaehlen(s)}
                  style={{
                    padding: pad("xs", "md"),
                    borderRadius: v("--radius-sm"),
                    border: `1px solid ${aktiv ? v("--color-accent") : v("--color-border")}`,
                    background: aktiv ? v("--color-accent-dim") : "transparent",
                    color: aktiv ? v("--color-accent") : v("--color-text-secondary"),
                    cursor: "pointer",
                    fontSize: v("--font-size-small"),
                  }}
                >
                  {KARTEN_STIL_NAME[s]}
                </button>
              );
            })}
            {stilStatus && (
              <span style={{ fontSize: v("--font-size-caption"), color: v("--color-negative") }}>{stilStatus}</span>
            )}
          </div>
        </div>

        {/* Freigabe: hängt an Text UND Bild. */}
        <div
          style={{
            marginTop: space.lg,
            padding: pad("sm", "md"),
            borderRadius: v("--radius-sm"),
            background: v("--color-bg-muted"),
            fontSize: v("--font-size-small"),
            color: stand.ok ? v("--color-positive-text") : v("--color-text-secondary"),
          }}
        >
          {stand.ok ? "Freigegeben — Text und Bild geprüft." : stand.grund}
        </div>

        <div style={{ display: "flex", gap: space.sm, marginTop: space.md, alignItems: "center", flexWrap: "wrap" }}>
          {post.vorlage ? (
            <button
              type="button"
              aria-expanded={offen}
              onClick={() => setOffen((o) => !o)}
              style={{
                padding: pad("xs", "md"),
                borderRadius: v("--radius-sm"),
                border: `1px solid ${v("--color-border")}`,
                background: "transparent",
                color: v("--color-text-secondary"),
                cursor: "pointer",
                fontSize: v("--font-size-small"),
              }}
            >
              {offen ? "Bearbeiten schließen" : "Bearbeiten"}
            </button>
          ) : (
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
              Noch nicht auf Vorlagen umgestellt — Text hier nur lesbar.
            </span>
          )}
        </div>

        {offen && post.vorlage && post.platzhalter && (
          <div style={{ marginTop: space.lg }}>
            <VorlagenEditor
              postId={post.id}
              vorlage={post.vorlage}
              entwurf={entwurf}
              onEntwurf={setEntwurf}
              platzhalter={post.platzhalter}
            />
          </div>
        )}

        <details style={{ marginTop: space.md }}>
          <summary
            style={{ cursor: "pointer", fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}
          >
            Belege ({post.belege.length})
          </summary>
          <ul
            style={{
              fontSize: v("--font-size-small"),
              color: v("--color-text-secondary"),
              marginTop: space.sm,
              paddingLeft: space.lg,
            }}
          >
            {post.belege.map((b) => (
              <li key={b} style={{ marginBottom: space.xs }}>
                {b}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
