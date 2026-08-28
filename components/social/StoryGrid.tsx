"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "../Modal";
import { FeedVorschau } from "./FeedVorschau";
import { StoryTisch } from "./StoryTisch";
import { Kennung } from "./Kennung";
import { v, space, pad } from "../../lib/theme";
import type { Pruefung } from "../../lib/social-pruefung-kern";
import type { Befund as MechanikBefund } from "../../lib/social-mechanik";
import { urteil } from "../../lib/social-pruefung-kern";
import { BILDFORM_NAME, templateVon, type SocialPost } from "../../lib/social-posts";
import { KARTEN_STIL_NAME } from "../../lib/social-karten-stil";

// Alle Beiträge als Raster — der Einstieg in die Entwicklung.
//
// Die Kategorie-Ansicht zeigt eine Handvoll Karten groß; richtig, solange man an
// ihnen arbeitet. Davor steht aber eine andere Frage: Was gibt es überhaupt, und
// wirken die Beiträge nebeneinander wie eine Handschrift? Die beantwortet man
// nicht an einer Karte, sondern an der Reihe — und dafür müssen viele
// gleichzeitig ins Bild.
//
// Bearbeitet wird im FENSTER, mit demselben Tisch wie in der Kategorie. Eine
// zweite, abgespeckte Bearbeitung für das Raster wäre eine zweite Oberfläche für
// dieselbe Sache, und die driftet.

export type GridEintrag = {
  post: SocialPost;
  pruefungen: Pruefung[];
  /** Abdruck der abgelegten Fassung, serverseitig gerechnet. */
  abdruck: string;
  /** Was die mechanische Pruefung festgestellt hat. */
  befunde: MechanikBefund[];
  kategorie: { name: string; schluessel: string };
  /**
   * Ist das Design dieser Story durchgesehen — im Code abgenommen ODER im
   * Browser eingestellt?
   *
   * Beides zusammen, weil beides vorkommt. Nur die gespeicherte Fassung zu
   * zählen war der Fehler: Stories, deren Bildform im Code ausgearbeitet und
   * abgenommen wurde, standen unter „Roh", weil niemand einen Knopf gedrückt
   * hatte.
   */
  bearbeitet: boolean;
};

type Sicht = "alle" | "bearbeitet" | "roh";

const SICHTEN: { wert: Sicht; text: string }[] = [
  { wert: "alle", text: "Alle" },
  { wert: "bearbeitet", text: "Gestaltet" },
  { wert: "roh", text: "Roh" },
];

export function StoryGrid({ eintraege }: { eintraege: GridEintrag[] }) {
  const [offen, setOffen] = useState<string | null>(null);
  const [sicht, setSicht] = useState<Sicht>("alle");
  /**
   * Prüfungen, die in DIESER Sitzung im Fenster erteilt wurden.
   *
   * Die Kachel zeigt den Prüfstand ein zweites Mal. Ohne diesen Merker stünde
   * dort nach dem Schließen weiter „offen", während das Fenster gerade
   * „freigegeben" gemeldet hat — zwei Aussagen über dieselbe Sache auf einem
   * Bildschirm, und die sichtbare wäre die falsche.
   */
  const [dazu, setDazu] = useState<Record<string, Pruefung[]>>({});
  const mitStand = eintraege.map((e) => {
    const neu = dazu[e.post.id];
    if (!neu) return e;
    // ERSETZEN, nicht anhängen: Die Ablage hält je Fassung und Art genau eine
    // Zeile. Zwei davon nebeneinander — eine bestandene und eine nicht
    // bestandene — ließen das Urteil auf die alte fallen, und die Kachel
    // behauptete eine Sperre, die es nicht mehr gibt.
    const ersetzt = e.pruefungen.filter(
      (a) => !neu.some((n) => n.art === a.art && n.fassung_fingerabdruck === a.fassung_fingerabdruck),
    );
    return { ...e, pruefungen: [...ersetzt, ...neu] };
  });
  const aktiv = mitStand.find((e) => e.post.id === offen);
  const gezeigt = mitStand.filter(
    (e) => sicht === "alle" || (sicht === "bearbeitet" ? e.bearbeitet : !e.bearbeitet),
  );

  const knopf = {
    padding: pad("xs", "md"),
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    background: "transparent",
    color: v("--color-text-secondary"),
    fontSize: v("--font-size-small"),
    textDecoration: "none",
    display: "inline-block",
  } as const;

  return (
    <>
      {/* Der Filter steht ÜBER dem Raster, nicht in der Kategorie-Leiste: Er
          sortiert nicht nach Thema, sondern nach Arbeitsstand. */}
      <div style={{ display: "flex", gap: space.xs, marginBottom: space.xl, flexWrap: "wrap" }}>
        {SICHTEN.map((s) => {
          const an = s.wert === sicht;
          const zahl = eintraege.filter(
            (e) => s.wert === "alle" || (s.wert === "bearbeitet" ? e.bearbeitet : !e.bearbeitet),
          ).length;
          return (
            <button
              key={s.wert}
              type="button"
              aria-pressed={an}
              onClick={() => setSicht(s.wert)}
              style={{
                padding: pad("xs", "md"),
                borderRadius: v("--radius-sm"),
                border: `1px solid ${an ? v("--color-accent") : v("--color-border")}`,
                background: an ? v("--color-accent-dim") : "transparent",
                color: an ? v("--color-accent") : v("--color-text-secondary"),
                cursor: "pointer",
                fontSize: v("--font-size-small"),
              }}
            >
              {s.text} <span style={{ color: v("--color-text-muted") }}>{zahl}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          // Nicht auf eine feste Spaltenzahl verdrahtet: Die Vorschau hat eine
          // Mindestbreite, unter der sie nichts mehr zeigt, und wie viele davon
          // nebeneinander passen, weiß nur das Fenster.
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: space.xxl,
        }}
      >
        {gezeigt.map(({ post, pruefungen, kategorie, abdruck }) => {
          const stand = urteil(abdruck, pruefungen);
          return (
            <div key={post.id} style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
              <Link
                href={`/admin/redaktion?k=${kategorie.schluessel}`}
                style={{
                  fontSize: v("--font-size-caption"),
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: v("--color-accent"),
                  textDecoration: "none",
                }}
              >
                {kategorie.name}
              </Link>
              <div style={{ fontSize: v("--font-size-body"), fontWeight: 600, lineHeight: 1.3 }}>{post.titel}</div>
              {/* Die Design-Identität: welches Template, welche Variante. Der
                  Titel sagt, WOVON eine Story handelt; hier steht, WIE sie
                  aussieht — und das ist die Frage, die beim Gestalten zählt. */}
              {post.bild && (
                <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
                  {templateVon(post.bild)?.name ??
                    `${BILDFORM_NAME[post.bild.art]} · ${KARTEN_STIL_NAME[post.bild.stil]} — kein abgenommenes Template`}
                </div>
              )}

              {/* Die Karte im Raster ist dieselbe Vorschau, nur schmaler. Ein
                  eigenes Kachelbild wäre eine zweite Darstellung derselben
                  Story — und die eine, die im Feed steht, wäre nicht mehr die,
                  die man hier beurteilt. */}
              {post.bild && <FeedVorschau bild={post.bild} text={post.text} breite={340} />}

              <div
                style={{
                  fontSize: v("--font-size-caption"),
                  color: stand.ok ? v("--color-positive-text") : v("--color-text-muted"),
                }}
              >
                {stand.ok ? "freigegeben" : stand.grund}
              </div>

              <div style={{ display: "flex", gap: space.xs, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setOffen(post.id)} style={{ ...knopf, cursor: "pointer" }}>
                  Bearbeiten
                </button>
                <Link href={`/admin/redaktion?k=${kategorie.schluessel}`} style={knopf}>
                  Zur Kategorie
                </Link>
                <Kennung id={post.id} template={post.bild ? templateVon(post.bild)?.name : undefined} />
              </div>
            </div>
          );
        })}
      </div>

      {/* `open` statt bedingtem Rendern: Der Baustein blendet beim Schließen aus,
          und wer ihn aus dem Baum nimmt, killt genau diese Bewegung. */}
      <Modal
        open={!!aktiv}
        onClose={() => setOffen(null)}
        title={aktiv?.post.titel ?? ""}
        maxWidth={1180}
      >
        {/* Ohne Titel: Die Kopfzeile des Fensters trägt ihn bereits.
            `key`: Wechselt der Beitrag, muss der Tisch seinen inneren Zustand
            neu setzen — sonst trüge er die Einstellungen des vorigen. */}
        {aktiv && (
          <StoryTisch
            key={aktiv.post.id}
            post={aktiv.post}
            pruefungen={aktiv.pruefungen}
            abdruck={aktiv.abdruck}
            befunde={aktiv.befunde}
            ohneTitel
            onPruefung={(postId, p) =>
              setDazu((alt) => ({
                ...alt,
                [postId]: [
                  ...(alt[postId] ?? []).filter(
                    (a) => !(a.art === p.art && a.fassung_fingerabdruck === p.fassung_fingerabdruck),
                  ),
                  p,
                ],
              }))
            }
          />
        )}
      </Modal>
    </>
  );
}
