import { Suspense } from "react";
import { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";
import { standSeite } from "../../../lib/stand";
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
export default function WaermepumpePage() {
  // Der Rechner liest seinen Zustand aus der Adresse (Teilen-Link, `e=1` springt
  // ins Ergebnis). Next verlangt dafür eine Suspense-Grenze, sonst bricht das
  // VORRENDERN dieser Seite — nicht auffällig im Entwicklungsserver, aber der
  // Produktionsbau steigt aus ("useSearchParams() should be wrapped in a
  // suspense boundary"). Gemessen am 27.08.2026 an einem erzwungenen
  // Vorschau-Bau; `tsc` und die Tests waren dabei grün, der Bau war es nicht.
  //
  // Der Ersatzinhalt bleibt leer: Die Seite ist ein Rechner, der ohnehin erst im
  // Browser rechnet — ein Gerüst würde für einen Sekundenbruchteil ein Ergebnis
  // andeuten, das es noch nicht gibt.
  return (
    <Suspense fallback={null}>
      <Waermepumpe stand={standSeite("/waermepumpe-rechner")} />
    </Suspense>
  );
}
