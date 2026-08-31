// ─── Der Lesedienst: hier verlässt das Angebot unser System ───────────────────
//
// Die EINZIGE Stelle im Projekt, an der ein hochgeladenes Dokument an einen
// Dritten geht. Alles darüber (was gelesen wird, wie geurteilt wird) läuft ohne
// Netz; alles darunter ist dieser eine Aufruf.
//
// WOHIN: Anthropic, Vereinigte Staaten. Gemessen am 27.08.2026 gibt es dort
// keine europäische Region — die Wahl steht zwischen „us" und „global", der
// Speicherort ist ausschließlich die USA. Es ist also eine Drittlandübermittlung
// ohne Angemessenheitsbeschluss, getragen von den Standardvertragsklauseln im
// Auftragsverarbeitungsvertrag des Anbieters und von der ausdrücklichen
// Einwilligung des Nutzers, die die Oberfläche vorher einholt.
//
// `inference_geo: "us"` ist deshalb bewusst gesetzt und nicht "global": Wenn die
// Übermittlung schon in einem Drittland landet, soll wenigstens feststehen, in
// welchem — eine Aussage in der Datenschutzerklärung, die stimmt, statt „irgendwo".
// Der Aufpreis dafür beträgt ein Zehntel.
//
// ─── Risikoprüfung der Übermittlung (Schrems II, EuGH C-311/18) ──────────────
//
// Sie steht HIER und nicht in einem eigenen Papier: Wer die Übermittlung
// ändert — anderer Anbieter, andere Region, anderes Dokument —, fasst diese
// Datei an. Ein Papier daneben veraltet beim ersten Mal, an dem jemand das
// nicht liest. Geprüft am 28.08.2026, wieder vorzulegen am 28.08.2027 oder
// früher, wenn sich Rechtslage oder Anbieter ändern.
//
// WAS ÜBERMITTELT WIRD: ein vom Nutzer selbst ausgewähltes Angebotsdokument.
// Darin typischerweise sein Name und seine Anschrift sowie Firmenname, Anschrift
// und Kalkulation des Handwerksbetriebs. Keine besonderen Kategorien nach
// Art. 9, keine Zahlungs- oder Zugangsdaten. Den Umfang bestimmt der Nutzer.
//
// INSTRUMENT: Standardvertragsklauseln (Art. 46 Abs. 2 lit. c), Bestandteil des
// Auftragsverarbeitungsvertrags. Daneben — nicht an ihrer Stelle — die
// ausdrückliche Einwilligung je Vorgang (Art. 6 Abs. 1 lit. a, Art. 49 Abs. 1
// lit. a); sie trägt den Einzelfall auch dann, wenn das Instrument nach Art. 46
// in Zweifel geriete.
//
// KEIN ANGEMESSENHEITSBESCHLUSS: Der Anbieter ist im EU-U.S. Data Privacy
// Framework nicht gelistet — am 27.08.2026 über einen Vollabzug des amtlichen
// Registers geprüft (7.561 Einträge, Suche über Organisationsnamen UND erfasste
// Einheiten, mit Gegenprobe an einem bekannten Teilnehmer). VOR DEM LIVEGANG
// ERNEUT PRÜFEN — eine Zertifizierung kann jederzeit hinzukommen.
//
// ZUGRIFF ÖFFENTLICHER STELLEN: Ob ein Anbieter generativer Modelle unter
// 50 U.S.C. § 1881a fällt, ist nicht geklärt; wir nehmen die für uns ungünstige
// Annahme an, dass er es könnte. Erfassung auf dem Transportweg (Executive
// Order 12333) begegnen wir mit durchgehender Verschlüsselung.
//
// WARUM DAS RESTRISIKO TRAGBAR IST — vier Umstände, die zusammen wirken:
//   1. Die Anweisung untersagt dem Modell, Namen oder Anschriften in die
//      Antwort aufzunehmen. Das mindert nicht die Übermittlung, aber alles
//      danach.
//   2. Wir legen nichts ab und führen nichts zusammen — es entsteht kein
//      Bestand, den jemand abfragen könnte.
//   3. Ein Heizungsangebot eines Privathaushalts ist für die genannten
//      Befugnisse ohne Belang; sie zielen auf auslandsnachrichtendienstliche
//      Erkenntnisse.
//   4. Der Nutzer entscheidet je Vorgang und wird vorher über Empfänger, Land
//      und das fehlende Angemessenheitsniveau unterrichtet.
//
// ERGÄNZENDE MASSNAHMEN: nur verschlüsselte Übertragung · Region festgelegt
// statt „global" · vertraglicher Ausschluss der Trainingsnutzung · keine Ablage
// und kein Protokoll des Inhalts · Fehlermeldungen des Dienstes gehen nicht nach
// außen (sie können Teile des Dokuments enthalten) · serverseitige Prüfung der
// Einwilligung.
//
// WAS DIESE PRÜFUNG NICHT ABDECKT: Sie gilt für das Auslesen OHNE Speicherung.
// Sobald aus den Werten ein eigener Bestand entsteht, ändern sich Zweck,
// Rechtsgrundlage und Speicherdauer — dann ist sie neu zu führen, und es kommen
// eine Folgenabschätzung nach Art. 35 und die Informationspflichten gegenüber
// dem Handwerksbetrieb nach Art. 14 hinzu.

import Anthropic from "@anthropic-ai/sdk";
import type { LeseDienst } from "./angebot-auslesen";

/**
 * Das Modell für die Angebotsprüfung.
 *
 * Bewusst das große: Die Befunde, auf die es ankommt, sind Urteile und keine
 * Zeilenfunde — eine Überschrift „hydraulischer Abgleich, für die Förderung
 * Pflicht", unter der alle Posten als Alternative ausgewiesen sind, erkennt man
 * nur im Zusammenhang. Ein sechsseitiges Angebot kostet damit rund vierzehn
 * Cent; an dieser Stelle zu sparen hieße, die Leistung wegzusparen.
 */
const MODELL = "claude-opus-5";

/** Bilder und PDF, die wir entgegennehmen — deckungsgleich mit der Prüfroute. */
const BILD_TYPEN = new Set(["image/png", "image/jpeg", "image/webp"]);

export function anthropicLeseDienst(): LeseDienst | null {
  const schluessel = process.env.ANTHROPIC_API_KEY;
  if (!schluessel) return null;

  const client = new Anthropic({ apiKey: schluessel });

  return async (anweisung, dokument) => {
    const inhalt = BILD_TYPEN.has(dokument.mediaType)
      ? { type: "image" as const, source: { type: "base64" as const, media_type: dokument.mediaType as "image/png" | "image/jpeg" | "image/webp", data: dokument.base64 } }
      : { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: dokument.base64 } };

    // Gestreamt, weil ein langes Angebot mit vielen Positionen sonst in die
    // Zeitgrenze der Verbindung läuft — nicht, weil jemand mitlesen soll.
    const antwort = await client.messages
      .stream({
        model: MODELL,
        max_tokens: 16000,
        inference_geo: "us",
        thinking: { type: "adaptive" },
        system: anweisung,
        messages: [{ role: "user", content: [inhalt, { type: "text", text: "Lies dieses Angebot." }] }],
      })
      .finalMessage();

    const text = antwort.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (!text.trim()) throw new Error("leere Antwort");
    return text;
  };
}
