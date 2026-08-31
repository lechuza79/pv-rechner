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
