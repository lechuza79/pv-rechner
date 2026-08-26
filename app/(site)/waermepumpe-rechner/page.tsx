import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import { standSeite } from "../../../lib/stand";
import { heizungsfoerderungBund } from "../../../lib/kfw-foerderdaten";
import Waermepumpe from "./waermepumpe";

export const metadata: Metadata = pageMetadata({
  path: "/waermepumpe-rechner",
  title: "Wärmepumpen-Rechner – Stromverbrauch, Kosten & Ersparnis berechnen",
  // Genannt werden nur Stellen, von denen wirklich eine Zahl stammt: Fraunhofer
  // ISE liefert die Jahresarbeitszahlen, die Verbraucherzentrale RLP die
  // Investitionskosten (Auswertung von 160 Angeboten, Volltext in docs/quellen).
  // Hier stand bis 24.08.2026 zusätzlich der BWP — der kommt im gesamten Projekt
  // nicht ein einziges Mal vor. Eine geliehene Autorität ohne Beitrag ist eine
  // Werbeaussage ohne Beleg (§ 5 UWG) und genau die Fehlerklasse aus Gate-Regel 2:
  // Quelle ist, wer gemessen hat.
  description: "Wie viel Strom verbraucht eine Wärmepumpe? Berechne Stromverbrauch, Kosten und Ersparnis im Vergleich zur Gas- oder Ölheizung. BEG-Förderung eingerechnet, transparent nach Fraunhofer ISE & Verbraucherzentrale. Kostenlos, ohne Anmeldung.",
  ogTitle: "Wärmepumpen-Rechner – Lohnt sich eine Wärmepumpe?",
  ogImageTitle: "Lohnt sich eine Wärmepumpe?",
  ogImageSubtitle: "Kosten, Einsparung & Förderung vs. Gas und Öl — transparent gerechnet.",
});

// Die „Stand:"-Zeile sitzt im Rechner selbst (siehe waermepumpe.tsx), nicht
// hier: Der Rechner-Rahmen ist mindestens bildschirmhoch, ein Absatz dahinter
// stünde hinter einer leeren Fläche. Nachgeschlagen wird sie trotzdem HIER, auf
// dem Server — `lib/stand.ts` hängt an sieben Config-Modulen, die im Browser
// nichts zu suchen haben.
// Die Seite bleibt vorgerendert und wird täglich aufgefrischt. Der eine
// Datenbank-Read unten darf sie NICHT dynamisch machen: Ein Rechner, der bei
// jedem Aufruf frisch gebaut wird, kostet jeden Besucher den vollen Aufbau —
// und das ist die Bauweise, die im Juli 2026 den Atlas umgeworfen hat. Der
// Bericht erscheint einmal im Jahr; ein Tag Verzögerung ist folgenlos.
export const revalidate = 86400;

// Die Zahlen des KfW-Förderreports werden HIER nachgeschlagen, nicht im
// Rechner: Der Rechner läuft im Browser, und die Tabellen liegen hinter dem
// Dienstschlüssel — eine offene Schnittstelle darauf wäre nach der Erlaubnis
// der KfW gerade nicht gedeckt. Fällt der Abruf aus, kommt `null` heraus und
// der Abschnitt entfällt lautlos; die Seite bleibt vollständig.
export default async function WaermepumpePage() {
  const kfw = await heizungsfoerderungBund();
  return <Waermepumpe stand={standSeite("/waermepumpe-rechner")} kfw={kfw} />;
}
