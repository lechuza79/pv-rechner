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

// EINE EINZIGE FASSUNG, UND DAS IST KEIN VERSEHEN: Eine erste Formulierung vom
// selben Tag ist ERSETZT statt archiviert worden, weil sie nie ausgeliefert
// wurde — sie stand nur auf einem lokalen Arbeitsstand, und niemand hat je
// darauf eingewilligt. Ein Archiv, das eine Fassung führt, die es für Nutzer
// nie gab, behauptet einen Nachweis, den es nicht gibt. Ab dem ersten
// Livegang gilt die Regel ohne Ausnahme: ändern heißt neue Fassung anlegen.
export const BLEIBEN_FASSUNGEN: BleibenFassung[] = [
  {
    version: "2026-09-02",
    seit: "2026-09-02",
    label: "Angemeldet bleiben",
    // Was hier alles drinstehen MUSS, ist keine Geschmacksfrage — jeder Teil
    // deckt eine eigene Anforderung ab (Legal-Judge, 02.09.2026, DSK
    // Orientierungshilfe Digitale Dienste Fassung 1.2, Rn. 29, 37, 38):
    // wer speichert · was gespeichert wird · wozu es SPÄTER benutzt wird
    // (ohne diesen Halbsatz ist es nur eine Einwilligung nach TDDDG und nicht
    // zugleich nach der DSGVO) · wie lange · dass kein Dritter herankommt ·
    // wie man es zurücknimmt · dass der Widerruf nicht rückwirkt · und ein
    // Weg zur ausführlichen Fassung.
    erklaerung:
      "Sonst endet die Anmeldung, sobald du den Browser schließt. Mit Haken bleibst du auf diesem Gerät bis zu 90 Tage nach deinem letzten Besuch angemeldet: Die Anmelde-Cookies bekommen diese Laufzeit, dazu eines für deine Entscheidung. Wir lesen sie bei jedem Besuch, um dich wiederzuerkennen — Zugriff hat niemand außer uns. Zurücknehmen kannst du es jederzeit, indem du dich abmeldest; was bis dahin geschah, bleibt rechtmäßig.",
  },
];

export const AKTUELLE_BLEIBEN_FASSUNG = BLEIBEN_FASSUNGEN[BLEIBEN_FASSUNGEN.length - 1];

/** Wie lange „angemeldet bleiben" trägt. Steht im Einwilligungstext und muss dort gleich lauten. */
export const BLEIBEN_TAGE = 90;
