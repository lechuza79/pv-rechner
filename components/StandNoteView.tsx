"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheck } from "./Icons";
import { istAktuell, liveSatz, monatJahr, tagMonatJahr, type StandEintrag, type StandSeite } from "../lib/stand-format";
import { heuteInBerlin } from "../lib/zeit";
import { iconSizes, space, v } from "../lib/theme";

/**
 * Der Aktualisierungsstand unter einem Rechner — die Formulierung, einmal statt
 * auf jeder Seite neu getippt. WAS eine Seite trägt, steht in `lib/stand.ts`;
 * hier kommt es als fertiger Datensatz an.
 *
 * WARUM GETRENNT VON <StandNote>: `lib/stand.ts` importiert sieben Config-Module,
 * damit kein Datum handgetippt ist. Diese Komponente importiert davon keines —
 * deshalb dürfen auch Client-Komponenten sie rendern, ohne sich Wärmepumpen-,
 * Grüngas- und Balkon-Config ins Browser-Bundle zu holen. Server-Komponenten
 * nehmen weiter <StandNote pfad="…">, das die Auflösung übernimmt.
 *
 * ZWEI DATEN JE ZEILE, IMMER (Entscheidung des Betreibers, 17.08.2026): „von
 * wann sind die Werte" und „wann hat zuletzt jemand nachgesehen" sind zwei
 * Fragen. Wer die zweite Zahl nur dann sieht, wenn sie abweicht, lernt nie, dass
 * es sie gibt — und liest ein späteres „von Juli, geprüft im Oktober" dann nicht
 * als das, was es ist: bestätigt, nicht vergessen. Wo es nur eine Zahl gibt,
 * steht auch nur eine: Eine Rechtsaussage ist geltendes Recht oder nicht, sie
 * hat keinen Wertstand, den man datieren könnte.
 *
 * WARUM EINE LISTE UND KEIN SATZ: Mit zwei Daten je Eintrag wurde die
 * Aufzählung zur Kommasuppe — der Wärmepumpen-Rechner nennt fünf Stände, das
 * sind zehn Datumsangaben in einem Satz. Eine Zeile je Sache ist die Form, in
 * der man sie überfliegen kann. Nur wo es genau einen Stand gibt, bleibt der
 * Fließtext.
 *
 * Grammatik gehört zur Richtigkeit (CLAUDE.md, „Aussagen zählen wie Zahlen"):
 * ein Live-Wert bekommt „kommt", mehrere bekommen „kommen", und die Aufzählung
 * endet mit „und" statt mit einem Komma.
 */

/** „Werte von Juli 2026, geprüft am 28. Juli 2026" — beide Hälften, sobald es
 *  beide gibt. Monatsgenaue Einträge ohne eigenen Prüftag nennen nur den Stand. */
function datumsText(e: StandEintrag): string {
  if (e.praezision === "monat") return `Stand ${monatJahr(e.iso)}`;
  const geprueft = `geprüft am ${tagMonatJahr(e.iso)}`;
  return e.wertIso ? `Werte von ${monatJahr(e.wertIso.slice(0, 7))}, ${geprueft}` : geprueft;
}

export default function StandNoteView({
  seite,
  style,
  variant = "plain",
}: {
  /** `undefined` bleibt zulässig: Eine Seite ohne Eintrag zeigt keine Zeile,
   *  statt mit einem erfundenen Stichtag zu antworten. */
  seite: StandSeite | undefined;
  style?: React.CSSProperties;
  variant?: "plain" | "cards";
}) {
  // „aktuell" hängt am HEUTIGEN Tag, eine statisch ausgelieferte Seite am Tag
  // ihres Baus. Entschieden wird deshalb erst im Browser, nach dem Laden: So
  // verschwindet die Auszeichnung pünktlich, auch wenn die Frist zwischen zwei
  // Auslieferungen abläuft — und Server und Browser zeichnen beim ersten Mal
  // dasselbe, statt sich über das Datum zu streiten.
  const [heute, setHeute] = useState<string | null>(null);
  useEffect(() => setHeute(heuteInBerlin()), []);

  if (!seite) return null;
  const pill = (e: StandEintrag) => (heute && istAktuell(e, heute) ? <AktuellPill /> : null);

  const live = liveSatz(seite.live);
  // Trennlinie mit Luft darüber und darunter: Der Aktualisierungsstand ist kein
  // weiterer Absatz des Rechners, sondern eine Fußnote über ihn. Ohne die Linie
  // las er sich wie ein letzter Hinweis zur Bedienung; mit ihr sieht man auf
  // einen Blick, dass hier etwas anderes anfängt. Werte aus der Abstands-Skala
  // (lib/theme.ts): 48 über der Linie, 24 zwischen Linie und Text.
  const rahmen: React.CSSProperties = {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginTop: space.huge,
    paddingTop: space.xxl,
    borderTop: `1px solid ${v("--color-border")}`,
    marginBottom: space.xxl,
    ...style,
  };
  const kopf = <span style={{ fontWeight: 700, color: v("--color-text-primary") }}>Stand:</span>;
  const datenstand = (
    <>
      {/* NICHT "alle Werte stehen offen": /datenstand hält seit dem 17.08.2026
          die durchkalibrierten Modell-Datensätze zurück (Wärmepumpe, Klima,
          Balkon, CO₂-Pfad). Der alte Satz stand ausgerechnet unter genau diesen
          Rechnern — und war dort falsch. Gefunden im Audit vom 17.08.2026, das
          drei weitere Kopien derselben Zusage fand: Leiste, Seitentitel,
          Einleitung. */}
      Womit wir rechnen, mit Stand und Quelle, steht auf der{" "}
      <Link href="/datenstand" style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}>
        Datenstand-Seite
      </Link>
      .
    </>
  );

  // Kein Stichtag ist eine Aussage, keine Lücke: Wer hier ein Datum erwartet,
  // soll lesen, warum es keines gibt.
  if (seite.eintraege.length === 0) {
    return (
      <p style={rahmen}>
        {kopf} Diese Seite rechnet ohne Stichtag —{" "}
        {live ? live.replace(/\.$/, "") : "alle Werte werden live geholt"}. {datenstand}
      </p>
    );
  }

  if (seite.eintraege.length === 1) {
    const e = seite.eintraege[0];
    return (
      <p style={rahmen}>
        {kopf} {e.was} — {datumsText(e)} {pill(e)}.{live ? ` ${live}` : ""} {datenstand}
      </p>
    );
  }

  return (
    <div className={variant === "cards" ? "sc-stand-cards" : undefined} style={rahmen}>
      <p style={{ marginBottom: 6 }}>{kopf}</p>
      <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0 }}>
        {seite.eintraege.map(e => (
          <li key={e.was} style={{ display: "flex", flexWrap: "wrap", gap: "0 6px", marginBottom: 2 }}>
            {/* Vorn, nicht hinten: Hinter einem langen Datum bricht sie je nach
                Breite mal mit um und mal nicht — vorn steht sie in jeder Zeile
                an derselben Stelle. */}
            {pill(e)}
            <span className="sc-stand-label" style={{ color: v("--color-text-secondary") }}>{e.was}</span>
            <span className="sc-stand-date">{variant === "cards" ? "" : "— "}{datumsText(e)}</span>
          </li>
        ))}
      </ul>
      <p>
        {live ? `${live} ` : ""}
        {datenstand}
      </p>
    </div>
  );
}

/** Grüne Auszeichnung für eine Prüfung innerhalb ihrer Frist. Positiv-Farbe,
 *  weil sie eine Tendenz trägt (bestätigt), nicht eine Zahl. */
function AktuellPill() {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle",
        padding: "1px 8px 1px 6px", borderRadius: v("--radius-pill"),
        fontSize: v("--font-size-caption"), fontWeight: 700, lineHeight: 1.5,
        color: v("--color-positive-text"),
        background: `color-mix(in srgb, ${v("--color-positive")} 16%, transparent)`,
      }}
    >
      <IconCheck size={iconSizes.xs} color={v("--color-positive-text")} />
      aktuell
    </span>
  );
}
