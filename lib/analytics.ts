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
  "pv_schritt_dach",
  "pv_schritt_speicher",
  "pv_schritt_haushalt",
  "pv_schritt_verbraucher",
  "pv_ergebnis",
  // Aktionen im PV-Ergebnis
  "pv_geteilt",
  "pv_gespeichert",
  "pv_methodik",
  // Trichter Empfehlung
  "empfehlung_schritt_haushalt",
  "empfehlung_schritt_verbraucher",
  "empfehlung_ergebnis",
  // Trichter Wärmepumpe
  "waermepumpe_schritt_groesse",
  "waermepumpe_schritt_daemmung",
  "waermepumpe_schritt_haushalt",
  "waermepumpe_schritt_heizsystem",
  "waermepumpe_ergebnis",
  // Aktion im Wärmepumpen-Ergebnis — dasselbe Muster wie im PV-Rechner.
  "waermepumpe_geteilt",
  // Trichter Klimaanlage
  "klima_schritt_raeume",
  "klima_schritt_nutzung",
  "klima_ergebnis",
  // Trichter Balkonkraftwerk
  "balkon_schritt_ausrichtung",
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

// ─── Der Trichter: eine Liste je Rechner, ein Eintrag je Schritt. ────────────
//
// WARUM DAS EIN GETEILTER BAUSTEIN IST UND KEINE FÜNF KOPIEN: Bis zum
// 29.08.2026 hatte NUR der PV-Rechner einen Trichter, inline im Rechner
// gebaut; die vier anderen meldeten ausschließlich „Ergebnis erreicht". Wo
// jemand bei der Wärmepumpe, beim Balkonkraftwerk, bei der Klimaanlage oder im
// Empfehlungs-Flow abbricht, war schlicht unsichtbar — und das war nie eine
// Rechtsfrage, sondern eine, die niemand gebaut hatte.
//
// DER FEHLER, DEN DIESE BAUFORM VERHINDERT, IST BEREITS EINGETRETEN. Die
// PV-Ereignisliste entstand am 06.07.2026 für fünf Schritte. Am 07.08.2026 kam
// der Schritt „Dein Dach" als Index 1 dazu — die Liste wurde nicht nachgezogen.
// Seither zählte `pv_schritt_speicher` in Wahrheit „Dach erreicht",
// `pv_schritt_haushalt` den Speicher, `pv_schritt_verbraucher` den Haushalt,
// und der Großverbraucher-Schritt wurde gar nicht gemessen. Drei Wochen lang,
// ohne roten Test, ohne kaputte Seite: die Fehlerklasse „Beschriftung sagt
// etwas anderes, als die Zahl misst" — im Projekt die schwerste.
//
// Deshalb ist die Liste nach INDEX aufgebaut, nicht nach Reihenfolge der
// Nennung: `FUNNEL[i]` ist das Ereignis für „Schritt i erreicht", der letzte
// Eintrag das Ergebnis. Sie muss damit exakt so lang sein wie die Schrittliste
// des Rechners plus eins — und genau das prüft
// `lib/__tests__/analytics-trichter.test.ts` aus den Rechner-Dateien heraus.
// Wer künftig einen Schritt einfügt, bekommt einen roten Test statt einer still
// verschobenen Messung.
//
// Der erste Eintrag ist immer `null`: Schritt 0 sieht jeder, der die Seite
// öffnet — ihn zu zählen hieße, den Seitenaufruf ein zweites Mal zu zählen.

/** Ereignis-Treppe eines Rechners: Index = erreichter Schritt. */
export type Funnel = readonly (AnalyticsEvent | null)[];

/**
 * Zählt das Erreichen eines Schritts. Feuert nur beim Vorwärtsgehen im
 * Frage-Flow — wer über einen geteilten Link direkt im Ergebnis landet, läuft
 * hier nicht durch und verfälscht die Treppe deshalb nicht.
 */
export function trackFunnelStep(funnel: Funnel, erreichterSchritt: number) {
  const name = funnel[erreichterSchritt];
  if (name) trackEvent(name);
}
