// ─── „Angemeldet bleiben" ist eine EINWILLIGUNG, keine Einstellung ───────────
//
// Ohne das Häkchen endet die Anmeldung mit dem Browser, und das Cookie ist
// dann ohne Einwilligung erlaubt (§ 25 Abs. 2 Nr. 2 TDDDG — unbedingt
// erforderlich; Artikel-29-Gruppe, WP194 Abschnitt 3.2 stellt
// Authentifizierungs-Cookies „für die Dauer einer Sitzung" frei).
//
// Mit dem Häkchen wird daraus etwas anderes: WP194 nennt an derselben Stelle
// ausdrücklich „eine Checkbox und ein einfacher Hinweis wie ‚Angemeldet
// bleiben'" als geeignetes Mittel, die Einwilligung einzuholen — die Ausnahme
// wird also nicht geheilt, sondern ERSETZT. Damit gilt § 25 Abs. 1 TDDDG und
// über ihn Art. 7 DSGVO: nicht vorangekreuzt, jederzeit widerrufbar, und im
// Wortlaut nachweisbar.
//
// DER WORTLAUT STEHT DESHALB HIER UND WIRD NIE ÜBERSCHRIEBEN — dieselbe
// Bauform wie beim Gemeinde-Abo (`lib/abo-einwilligung.ts`) und aus demselben
// Grund: Ein Einwilligungstext als Konstante in der Oberfläche ändert sich mit
// dem nächsten Commit, und danach ist nicht mehr rekonstruierbar, wozu jemand
// im September zugestimmt hat. Der EDSA erklärt in den Leitlinien 05/2020
// Rn. 108 einen Verweis auf „eine korrekte Konfiguration der Website"
// ausdrücklich für nicht ausreichend.
//
// WAS HIER NICHT HINEINGEHÖRT: Adresse, IP, irgendein Merkmal der Person. Dies
// ist ein Textarchiv.

export type BleibenFassung = {
  /** Kennung, wie sie im Merker beim Nutzer steht. Nie wiederverwenden. */
  version: string;
  /** Ab wann diese Fassung ausgeliefert wurde (ISO-Datum). */
  seit: string;
  /** Die Beschriftung des Häkchens. */
  label: string;
  /** Der Satz darunter — was passiert, wie lange, und wie man es zurücknimmt. */
  erklaerung: string;
};

export const BLEIBEN_FASSUNGEN: BleibenFassung[] = [
  {
    version: "2026-09-02",
    seit: "2026-09-02",
    label: "Angemeldet bleiben",
    erklaerung:
      "Dann legen wir zusätzlich ein Cookie an, das dich bis zu 90 Tage angemeldet hält — sonst endet die Anmeldung, sobald du den Browser schließt. Du nimmst das jederzeit zurück, indem du dich abmeldest.",
  },
];

export const AKTUELLE_BLEIBEN_FASSUNG = BLEIBEN_FASSUNGEN[BLEIBEN_FASSUNGEN.length - 1];

/** Wie lange „angemeldet bleiben" trägt. Steht im Einwilligungstext und muss dort gleich lauten. */
export const BLEIBEN_TAGE = 90;
