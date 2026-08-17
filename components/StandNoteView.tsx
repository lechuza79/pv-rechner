import Link from "next/link";
import { monatJahr, tagMonatJahr, type StandEintrag, type StandSeite } from "../lib/stand-format";
import { space, v } from "../lib/theme";

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
function liveSatz(live: string[]): string | null {
  if (!live.length) return null;
  const liste =
    live.length === 1
      ? live[0]
      : `${live.slice(0, -1).join(", ")} und ${live[live.length - 1]}`;
  return `${liste} ${live.length === 1 ? "kommt" : "kommen"} bei jedem Aufruf live dazu.`;
}

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
}: {
  /** `undefined` bleibt zulässig: Eine Seite ohne Eintrag zeigt keine Zeile,
   *  statt mit einem erfundenen Stichtag zu antworten. */
  seite: StandSeite | undefined;
  style?: React.CSSProperties;
}) {
  if (!seite) return null;

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
      Alle Werte, mit denen wir rechnen, stehen offen auf der{" "}
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
        {kopf} {e.was} — {datumsText(e)}.{live ? ` ${live}` : ""} {datenstand}
      </p>
    );
  }

  return (
    <div style={rahmen}>
      <p style={{ marginBottom: 6 }}>{kopf}</p>
      <ul style={{ listStyle: "none", margin: "0 0 8px", padding: 0 }}>
        {seite.eintraege.map(e => (
          <li key={e.was} style={{ display: "flex", flexWrap: "wrap", gap: "0 6px", marginBottom: 2 }}>
            <span style={{ color: v("--color-text-secondary") }}>{e.was}</span>
            <span>— {datumsText(e)}</span>
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
