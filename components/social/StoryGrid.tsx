"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "../Modal";
import { FeedVorschau } from "./FeedVorschau";
import { StoryTisch } from "./StoryTisch";
import { Kennung } from "./Kennung";
import { v, space, pad } from "../../lib/theme";
import type { Pruefung } from "../../lib/social-pruefung-kern";
import { urteil } from "../../lib/social-pruefung-kern";
import type { SocialPost } from "../../lib/social-posts";

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
  kategorie: { name: string; schluessel: string };
};

export function StoryGrid({ eintraege }: { eintraege: GridEintrag[] }) {
  const [offen, setOffen] = useState<string | null>(null);
  const aktiv = eintraege.find((e) => e.post.id === offen);

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
        {eintraege.map(({ post, pruefungen, kategorie }) => {
          const stand = urteil({ text: post.text, bild: post.bild }, pruefungen);
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
                <Kennung id={post.id} />
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
        {/* Ohne Titel: Die Kopfzeile des Fensters trägt ihn bereits. */}
        {aktiv && <StoryTisch post={aktiv.post} pruefungen={aktiv.pruefungen} ohneTitel />}
      </Modal>
    </>
  );
}
