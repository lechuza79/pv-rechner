// Einzige Quelle der Adressen, die die Browsertests anfassen.
//
// Wird von zwei Seiten gelesen: vom Rundgang als Prüfliste und vom Vorwärmen
// (global-setup) als Übersetzungsliste. Eine zweite handgetippte Kopie wäre ein
// Fehler, kein Duplikat — sie würde still auseinanderlaufen, und dann wärmt der
// Setup genau die Route nicht vor, die im Test flattert.

export type Seite = { pfad: string; erwartet: RegExp };

/** Seiten, die kein Flow-Test abdeckt. */
export const SEITEN: Seite[] = [
  // Rechner
  { pfad: "/klimaanlage-stromkosten", erwartet: /klima|kühl/i },
  { pfad: "/balkonkraftwerk", erwartet: /balkonkraftwerk/i },
  { pfad: "/balkonkraftwerk/rechner", erwartet: /balkon/i },
  { pfad: "/balkonkraftwerk/foerderung", erwartet: /balkonkraftwerk-f/i },
  { pfad: "/balkonkraftwerk/ratgeber", erwartet: /ratgeber/i },
  { pfad: "/balkonkraftwerk/ratgeber/anmelden", erwartet: /marktstammdatenregister/i },
  { pfad: "/balkonkraftwerk/ratgeber/mit-speicher", erwartet: /speicher/i },
  { pfad: "/einspeiseverguetung-rechner", erwartet: /einspeisevergütung/i },
  { pfad: "/einspeiseverguetung-tabelle", erwartet: /einspeisevergütung/i },
  { pfad: "/photovoltaik-neigungswinkel", erwartet: /neigungswinkel/i },
  // Atlas — beide Routen, inkl. einer echten Gemeindeseite
  { pfad: "/solar-atlas", erwartet: /atlas|solaranlagen/i },
  { pfad: "/solar-atlas/bayern", erwartet: /bayern/i },
  { pfad: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg", erwartet: /höchberg/i },
  // Ranglisten — jede der vier Darstellungsformen einmal, weil sie sich im
  // Aufbau unterscheiden: Uebersicht, Spitze je Groessenklasse, eine einzelne
  // Liste, und eine Liste mit Gebiet UND Klasse in der Adresse.
  { pfad: "/solar-atlas/ranking", erwartet: /rankings der städte und gemeinden/i },
  { pfad: "/solar-atlas/ranking/zubau-3-jahre-je-einwohner", erwartet: /dörfer|großstädte/i },
  { pfad: "/solar-atlas/ranking/solarleistung-je-einwohner/grossstaedte", erwartet: /großstädte/i },
  { pfad: "/solar-atlas/ranking/speicher-je-dachanlage/bayern/landkreis-muenchen", erwartet: /je 100 dächer/i },
  { pfad: "/solar-atlas/ranking/balkonkraftwerke-je-einwohner/doerfer/bayern/seite-2", erwartet: /balkonkraftwerke/i },
  // Förderseiten, beide Ebenen
  { pfad: "/photovoltaik-foerderung", erwartet: /förder/i },
  { pfad: "/photovoltaik-foerderung/bayern", erwartet: /bayern/i },
  { pfad: "/photovoltaik-foerderung/bayern/wuerzburg", erwartet: /würzburg/i },
  // Nidda ist die einzige Stadtseite mit einem Programm, das MEHRERE Techniken
  // fördert — also die einzige, die Bedingungen in der Objektform rendert und
  // den Technik-Filter zeigt. Genau daran starb am 27.08.2026 jeder Codestand,
  // der die Form noch nicht kannte, mit HTTP 500 beim Vorrendern. Ein Unit-Test
  // sieht das nicht: Die Form ist typkorrekt, sie ist nur nicht renderbar.
  { pfad: "/photovoltaik-foerderung/hessen/nidda", erwartet: /nidda/i },
  // Ratgeber — die Seiten mit live gerechneten Beispielen
  { pfad: "/ratgeber", erwartet: /ratgeber/i },
  { pfad: "/ratgeber/lohnt-sich-pv-mit-speicher", erwartet: /speicher/i },
  { pfad: "/ratgeber/gasheizung-oder-waermepumpe", erwartet: /wärmepumpe|gasheizung/i },
  { pfad: "/ratgeber/waermepumpe-foerderung", erwartet: /wärmepumpe/i },
  // Datenseiten
  { pfad: "/photovoltaik-zubau-deutschland", erwartet: /zubau/i },
  { pfad: "/atomstrom-import", erwartet: /atomstrom|kernstrom/i },
  { pfad: "/langzeit-strommix", erwartet: /strommix/i },
  { pfad: "/datenstand", erwartet: /stand|daten/i },
  // Methodik trägt seit dem Kontakt-Teaser ein Client-Bauteil — ohne Rundgang
  // wäre ein Fehler darin unsichtbar (Seite liefert weiter HTTP 200).
  { pfad: "/methodik", erwartet: /so rechnen wir/i },
  // Rechtstexte: Die Kontaktseite trägt das Formular (Client-Bauteil), die
  // Datenschutzerklärung die Pflichtangaben dazu. Beide waren bis 15.08.2026
  // im Rundgang nicht enthalten.
  { pfad: "/kontakt", erwartet: /kontakt/i },
  { pfad: "/datenschutz", erwartet: /datenschutzerklärung/i },
  { pfad: "/datenschutz-linkedin", erwartet: /gemeinsam mit der/i },
];

/** Die Embed-Widgets sind das Produkt, das wir an Kommunen verteilen — sie
 *  laufen fremd eingebettet, wo wir keine Fehlermeldung mehr sehen. */
export const EMBEDS: string[] = [
  "/embed/strommix-anteil",
  "/embed/erzeugung",
  "/embed/erzeugung-mini",
  "/embed/kennzahl?metric=leistung",
  "/embed/gemeinde-solar?ags=09679147",
  "/embed/gemeinde-erneuerbare?ags=09679147",
  "/embed/gemeinde-solarleistung?ags=09679147",
  "/embed/region-anlagentyp?bl=13",
  "/embed/region-solarleistung?bl=13",
  "/embed/simulation?plz=10115",
  "/embed/pv-zubau-deutschland",
  "/embed/einspeiseverguetung-verlauf",
  "/embed/ee-ampel",
  "/embed/karte",
  "/embed/foerder-check",
  "/embed/gruengas-heizkosten",
  "/embed/zubau-erneuerbare-atom",
  "/embed/strommix",
];

/** Die Gemeindeseite, an der `gemeinde-bestand-anker.spec.ts` die Mechanik
 *  „Adresse stellt den Umschalter" prüft. Sie steht NICHT in `SEITEN`: Der
 *  Rundgang hat mit Höchberg bereits eine Gemeindeseite, eine zweite prüfte
 *  dieselbe Route ein zweites Mal. Gewärmt gehört sie trotzdem — ohne sie zahlt
 *  der erste Aufruf im Test den Serverabruf, den jede andere Adresse längst
 *  hinter sich hat. Das behebt das Flattern nicht (das saß in der Hydratation,
 *  siehe den Spec-Kopf), es nimmt ihm nur eine Verzögerung ab. */
export const GEMEINDE_ANKER_ORT = "/solar-atlas/hessen/landkreis-schwalm-eder-kreis/melsungen";

/** Adressen, die die vier Flow-Tests anlaufen. Sie werden mitgewärmt, weil das
 *  Wettrennen beim Übersetzen sie genauso trifft — es hat sie sogar zuerst
 *  erwischt. */
export const FLOW_PFADE: string[] = [
  "/photovoltaik-rechner",
  "/photovoltaik-rechner?a=2&s=2&p=2&n=1&wp=nein&ea=nein",
  "/pv-bedarf-berechnen",
  "/pv-simulation",
  "/strommix-deutschland",
  "/waermepumpe-rechner",
];

/** Alles, was vor dem ersten Test einmal übersetzt sein muss. */
export const ALLE_PFADE: string[] = [
  ...SEITEN.map((s) => s.pfad),
  ...EMBEDS,
  ...FLOW_PFADE,
  GEMEINDE_ANKER_ORT,
  "/api/atlas/gemeinde?plz=97204", // Fühler für die Datenbank-Erkennung
];
