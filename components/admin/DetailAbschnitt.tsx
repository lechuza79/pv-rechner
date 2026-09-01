"use client";

import { v, space } from "../../lib/theme";

/**
 * Ein benannter Abschnitt in der aufgeklappten Zeile einer Tabelle.
 *
 * WARUM (Betreiber-Vorgabe 28.08.2026): Die aufgeklappte Zeile war eine Folge
 * von Absätzen in drei verschiedenen Schriftgrößen — Begründung, Voraussetzung,
 * Nebenbegriffe, Adresse, zwei Knöpfe, alles gleich gewichtet und ohne Kante
 * dazwischen. Man musste jeden Absatz lesen, um zu wissen, was er ist.
 *
 * Zwei Regeln, die das auflösen:
 *
 * 1. EINE GRUNDSCHRIFTGRÖSSE. Der ganze Detailbereich läuft auf derselben Größe
 *    wie die Tabelle (13 px). Kleiner gesetzte Zusätze sahen aus wie Fußnoten,
 *    obwohl sie Inhalt waren — die Voraussetzung eines Artikels ist nicht
 *    weniger wichtig als seine Begründung.
 * 2. JEDER ABSCHNITT TRÄGT SEINEN NAMEN, in derselben Form wie die
 *    Spaltenköpfe darüber. Damit liest sich die aufgeklappte Zeile wie eine
 *    Fortsetzung der Tabelle und nicht wie ein Zettel darunter.
 */
export function DetailAbschnitt({
  titel,
  children,
  /** Erster Abschnitt: keine Trennlinie darüber. */
  erster,
}: {
  titel: string;
  children: React.ReactNode;
  erster?: boolean;
}) {
  return (
    <section
      style={{
        borderTop: erster ? undefined : `1px solid ${v("--color-border-muted")}`,
        paddingTop: erster ? 0 : space.md,
        marginTop: erster ? 0 : space.md,
      }}
    >
      <h4
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: v("--color-text-muted"),
          margin: 0,
          marginBottom: space.xs,
        }}
      >
        {titel}
      </h4>
      <div
        style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), maxWidth: 760 }}
      >
        {children}
      </div>
    </section>
  );
}
