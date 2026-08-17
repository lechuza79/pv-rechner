import Link from "next/link";
import { STAND, monatJahr, tagMonatJahr, type StandSeite } from "../lib/stand";
import { v } from "../lib/theme";

/**
 * Die „Stand:"-Zeile unter einem Rechner. Inhalt kommt aus `lib/stand.ts`,
 * hier steht nur die Formulierung — einmal, statt auf jeder Seite neu getippt.
 *
 * Grammatik gehört zur Richtigkeit (CLAUDE.md, „Aussagen zählen wie Zahlen"):
 * ein Live-Wert bekommt „kommt", mehrere bekommen „kommen", und die Aufzählung
 * endet mit „und" statt mit einem Komma.
 */
/**
 * Ab wann der Wertstand neben dem Prüfdatum genannt wird: 45 Tage.
 *
 * Kürzer wäre Lärm — die Wächter laufen quartalsweise, ein Abstand von wenigen
 * Wochen ist der Normalfall und sagt nichts. Länger würde genau den Fall
 * verschweigen, für den es die zweite Zahl gibt: Werte, die zwei Quartale
 * unverändert durchlaufen, weil sie unverändert richtig sind.
 */
const WERTSTAND_AB_TAGEN = 45;

function zeigeWertstand(wertIso: string | undefined, geprueftIso: string): boolean {
  if (!wertIso) return false;
  const tag = 24 * 60 * 60 * 1000;
  // Monatsgenaue Wertstände zählen ab Monatsanfang — das ist die vorsichtige
  // Richtung: Der Abstand wird eher unter- als überschätzt.
  const wert = Date.parse(`${wertIso.length === 7 ? `${wertIso}-01` : wertIso}T00:00:00Z`);
  return (Date.parse(`${geprueftIso}T00:00:00Z`) - wert) / tag >= WERTSTAND_AB_TAGEN;
}

function liveSatz(live: string[]): string | null {
  if (!live.length) return null;
  const liste =
    live.length === 1
      ? live[0]
      : `${live.slice(0, -1).join(", ")} und ${live[live.length - 1]}`;
  return `${liste} ${live.length === 1 ? "kommt" : "kommen"} bei jedem Aufruf live dazu.`;
}

export default function StandNote({ pfad, style }: { pfad: string; style?: React.CSSProperties }) {
  const seite: StandSeite | undefined = STAND[pfad];
  if (!seite) return null;

  // „geprüft am" steht einmal, beim ersten taggenauen Eintrag — danach reicht
  // „am". Vier Mal derselbe Halbsatz liest sich wie ein Formular; die Aussage
  // trägt trotzdem jede Zahl, weil das Verb vorne für die ganze Aufzählung gilt.
  let geprueftGesagt = false;
  const eintraege = seite.eintraege.map(e => {
    if (e.praezision === "monat") return `${e.was} ${monatJahr(e.iso)}`;
    const verb = geprueftGesagt ? "am" : "geprüft am";
    geprueftGesagt = true;
    // Zwei Daten nur, wenn sie zwei verschiedene Dinge sagen: Solange die Werte
    // so alt sind wie ihre Prüfung, wäre das zweite Datum eine Wiederholung.
    // Wachsen sie auseinander, ist genau das die Auskunft — „von Juli, im
    // Oktober bestätigt" heißt: unverändert gültig, nicht vergessen.
    return zeigeWertstand(e.wertIso, e.iso)
      ? `${e.was} von ${monatJahr(e.wertIso!.slice(0, 7))}, ${verb} ${tagMonatJahr(e.iso)}`
      : `${e.was} ${verb} ${tagMonatJahr(e.iso)}`;
  });
  const live = liveSatz(seite.live);

  return (
    <p
      style={{
        fontSize: v("--font-size-small"),
        color: v("--color-text-muted"),
        lineHeight: 1.7,
        marginTop: 28,
        marginBottom: 12,
        ...style,
      }}
    >
      {eintraege.length > 0 ? (
        <>
          <span style={{ fontWeight: 700, color: v("--color-text-primary") }}>Stand:</span>{" "}
          {eintraege.join(", ")}.{live ? ` ${live}` : ""}{" "}
        </>
      ) : (
        // Kein Stichtag ist eine Aussage, keine Lücke: Wer hier ein Datum
        // erwartet, soll lesen, warum es keines gibt.
        <>
          <span style={{ fontWeight: 700, color: v("--color-text-primary") }}>Stand:</span>{" "}
          Diese Seite rechnet ohne Stichtag — {live ? live.replace(/\.$/, "") : "alle Werte werden live geholt"}.{" "}
        </>
      )}
      Alle Werte, mit denen wir rechnen, stehen offen auf der{" "}
      <Link href="/datenstand" style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}>
        Datenstand-Seite
      </Link>
      .
    </p>
  );
}
