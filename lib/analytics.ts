import { track } from "@vercel/analytics";

// ─── Reichweitenmessung: Zähler, kein Nutzungsprofil. ────────────────────────
//
// WARUM EIGENSCHAFTEN GAR NICHT MEHR GEHEN (Entscheidung 27.08.2026, nach zwei
// Legal-Gutachten):
//
// Die Messung läuft ohne Zustimmungsfenster. Das ist nur haltbar, solange sie
// unter die Ausnahme des § 25 Abs. 2 Nr. 2 TDDDG fällt — und die Grenze, die
// die Datenschutzkonferenz dafür zieht, verläuft genau hier: Sie unterscheidet
// die reine ZÄHLUNG (Seitenabrufe hochzählen) von der ANALYSE, und nennt als
// Kipppunkt ausdrücklich „benutzerdefinierte Variablen" und „Informationen über
// Besuchende" (OH digitale Dienste, 20.11.2024, Rn. 88). Rn. 89 setzt nach:
// Eine einmal bejahte enge Einordnung „wäre nicht mehr gültig, wenn weitere
// Informationen über Nutzende oder ein weiteres Auswertungsergebnis
// hinzukommt."
//
// „Hinzukommt" ist der entscheidende Halbsatz. Eine Aufräumaktion hätte den
// Zustand einmal hergestellt und beim nächsten `trackEvent("…", { … })` wieder
// verloren — ohne dass jemand merkt, dass er gerade eine Rechtsfrage neu
// aufmacht. Deshalb nimmt diese Funktion keine Eigenschaften mehr entgegen:
// Was der Typ nicht hergibt, kann niemand versehentlich mitschicken.
//
// WAS DAS GEKOSTET HAT: `pv_ergebnis` trug Anlagen- und Speichergröße. Das war
// die einzige Auswertung, die etwas über den NUTZER sagte statt über die Seite
// — und damit genau der Posten, den Rn. 88 meint. Der Trichter bleibt
// vollständig: Wir sehen weiterhin, welcher Schritt erreicht und wo abgebrochen
// wird, nur eben als Zahl statt als Profil.
//
// WO EINE UNTERSCHEIDUNG NÖTIG IST, TRÄGT SIE DER NAME. Der Herkunftsmelder
// braucht zwei Fälle (aus der Mail geklickt / über eine veröffentlichte
// Meldung gekommen); das sind zwei Ereignisse, keine Eigenschaft. Etwas
// umständlicher zu lesen, dafür ohne Ausnahme von der Regel — und eine Regel
// mit Ausnahme ist in diesem Repo erfahrungsgemäß keine.
//
// Festgenagelt von `lib/__tests__/analytics-ereignisse.test.ts`.

/**
 * Alle Ereignisse, die es gibt. Neue kommen hier dazu — und nur hier.
 *
 * Der Name darf beschreiben, WAS passiert ist, nie WER es war und mit welchen
 * Werten. `pv_ergebnis` ist richtig, `pv_ergebnis_10kwp` wäre die Eigenschaft
 * durch die Hintertür.
 */
export const EVENTS = [
  // Trichter PV-Rechner
  "pv_schritt_speicher",
  "pv_schritt_haushalt",
  "pv_schritt_verbraucher",
  "pv_ergebnis",
  // Aktionen im PV-Ergebnis
  "pv_geteilt",
  "pv_gespeichert",
  "pv_methodik",
  // Die übrigen Rechner melden nur „Ergebnis erreicht"
  "empfehlung_ergebnis",
  "waermepumpe_ergebnis",
  "klima_ergebnis",
  "balkon_ergebnis",
  // Herkunft aus den Outreach-Briefen: zwei Namen statt einer Eigenschaft
  "brief_aufruf_direkt",
  "brief_aufruf_verweis",
  // Gemeinde-Abo. Gezählt wird der abgeschickte Anmeldeversuch — NICHT die
  // Bestätigung: Die passiert in einem anderen Postfach, oft auf einem anderen
  // Gerät, und wäre als Ereignis auf der Bestätigungsseite eine Zählung, die
  // sich der Anmeldung zuordnen ließe. Welcher Ort es war, wird bewusst nicht
  // erfasst; das stünde sonst über den Seitenaufruf ohnehin schon zu viel dabei.
  "abo_anmeldung",
] as const;

export type AnalyticsEvent = (typeof EVENTS)[number];

/**
 * Zählt ein Ereignis. Ohne Eigenschaften — siehe oben, das ist keine
 * Bequemlichkeit, sondern die Grenze, an der die Einwilligungsfreiheit hängt.
 *
 * Cookiefrei und aggregiert. Auf dem Server ein Nichtstun (die Zählung ist
 * browserseitig), und in try/catch, weil eine Messung niemals die Oberfläche
 * kaputtmachen darf.
 */
export function trackEvent(name: AnalyticsEvent) {
  try {
    track(name);
  } catch {
    /* analytics must never throw into the UI */
  }
}
