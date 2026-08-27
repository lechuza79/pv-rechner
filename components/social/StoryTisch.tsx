"use client";

import { useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { FeedVorschau } from "./FeedVorschau";
import { VorlagenEditor } from "./VorlagenEditor";
import { Kennung } from "./Kennung";
import { fuelle } from "../../lib/social-vorlage";
import { KARTEN_STILE, KARTEN_STIL_NAME, KARTEN_STIL_STANDARD, type KartenStil } from "../../lib/social-karten-stil";
import { urteil, type Pruefung } from "../../lib/social-pruefung-kern";
import { BILDFORM_NAME, moeglicheFormen, templateVon, type PostBild, type SocialPost } from "../../lib/social-posts";

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
  const [form, setForm] = useState<PostBild["art"] | null>(post.bild?.art ?? null);
  const [entwurf, setEntwurf] = useState(post.vorlage ?? "");
  const [offen, setOffen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const werte = Object.fromEntries((post.platzhalter ?? []).map((p) => [p.name, p.wert]));
  // Bearbeitbare Posts zeigen den Entwurf, die übrigen ihren eingebauten Text.
  const text = post.vorlage ? fuelle(entwurf, werte) : post.text;
  const bild = post.bild ? { ...post.bild, stil, ...(form ? { art: form } : {}) } : null;
  const formen = post.bild ? moeglicheFormen(post.bild) : [];
  const stand = urteil({ text, bild }, pruefungen);

  const geaendert =
    stil !== (post.bild?.stil ?? KARTEN_STIL_STANDARD) ||
    form !== (post.bild?.art ?? null) ||
    (!!post.vorlage && entwurf !== post.vorlage);

  /**
   * Alles auf einmal ablegen — Text, Farbschema, Bildform.
   *
   * Vorher schrieb jeder Klick sofort. Das war bequem und falsch: Man konnte
   * nichts ausprobieren, ohne es zu speichern, und jede Zwischenstufe entwertete
   * die Freigabe. Jetzt ist der Tisch ein Entwurf, bis jemand ihn ablegt.
   *
   * Der Preis ist die vergessene Änderung, deshalb sagt der Knopf sichtbar an,
   * dass etwas offen ist.
   */
  async function speichern() {
    setLaeuft(true);
    setStatus(null);
    try {
      const res = await fetch("/api/social/fassung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          // Nur mitschicken, was es gibt: Ein Post ohne Vorlage hat keinen
          // bearbeitbaren Text, und ein leeres Feld würde ihn zurücksetzen.
          ...(post.vorlage ? { vorlage: entwurf } : {}),
          stil,
          ...(form ? { form } : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ungenutzt?: string[] };
      if (!res.ok) {
        setStatus(
          res.status === 401
            ? "Nicht gespeichert — die Anmeldung ist abgelaufen."
            : `Nicht gespeichert: ${j.error ?? res.status}`,
        );
      } else {
        setStatus(
          j.ungenutzt?.length
            ? `Gespeichert. Nicht mehr im Text: ${j.ungenutzt.map((x) => `{${x}}`).join(", ")}`
            : "Gespeichert. Die Prüfung muss neu erteilt werden.",
        );
      }
    } catch (e) {
      setStatus(`Nicht gespeichert: ${(e as Error).message}`);
    } finally {
      setLaeuft(false);
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
        <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: space.xs }}>
          {/* Das Template zuerst: Beim Gestalten ist das die Identität des
              Beitrags, nicht der Kanal. Trägt er eine Kombination, die niemand
              durchgesehen hat, steht das hier statt eines Namens. */}
          {bild ? (templateVon(bild)?.name ?? "kein abgenommenes Template") : "ohne Bild"} ·{" "}
          {post.kanal.join(" · ")} · {text.length} Zeichen
        </div>

        {/* Bildform: dieselbe Aussage in einer anderen Darstellung. Angeboten
            wird nur, was für DIESE Zahlen trägt — eine Form, die man wählen
            kann, wählt irgendwann jemand. */}
        {formen.length > 1 && (
          <div style={{ marginTop: space.lg }}>
            <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.xs }}>
              Bildform
            </div>
            <div style={{ display: "flex", gap: space.xs, flexWrap: "wrap" }}>
              {formen.map((f) => {
                const aktiv = f === (form ?? post.bild?.art);
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={aktiv}
                    onClick={() => setForm(f)}
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
                    {BILDFORM_NAME[f]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                  onClick={() => setStil(s)}
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
          <button
            type="button"
            disabled={laeuft || !geaendert}
            onClick={speichern}
            style={{
              padding: pad("xs", "lg"),
              borderRadius: v("--radius-sm"),
              border: "none",
              background: geaendert ? v("--color-accent") : v("--color-border"),
              color: geaendert ? v("--color-text-on-accent") : v("--color-text-muted"),
              cursor: geaendert ? "pointer" : "default",
              fontSize: v("--font-size-small"),
              fontWeight: 600,
            }}
          >
            {laeuft ? "…" : geaendert ? "Speichern" : "Gespeichert"}
          </button>
          {status && (
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{status}</span>
          )}
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
          <Kennung id={post.id} template={bild ? templateVon(bild)?.name : undefined} />
        </div>

        {offen && post.vorlage && post.platzhalter && (
          <div style={{ marginTop: space.lg }}>
            <VorlagenEditor
              postId={post.id}
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
