import "server-only";

// Wo das Beitragsbild liegt, damit Instagram es abholen kann.
//
// WARUM ES DIESE ABLAGE ÜBERHAUPT GIBT: LinkedIn nimmt die Bilddaten entgegen,
// Instagram nicht — es verlangt eine Adresse und lädt das Bild selbst („Media
// must be hosted on a publicly accessible server"). Ohne einen Ort, an dem das
// Bild öffentlich liegt, kann bei Instagram gar nichts erscheinen.
//
// ÖFFENTLICH IST HIER KEIN VERSEHEN, sondern die Anforderung. Was hier landet,
// ist ohnehin dazu bestimmt, in einem offenen Feed zu stehen — es geht keine
// Minute früher an die Öffentlichkeit, als es ohnehin gegangen wäre. Etwas
// anderes gehört nicht in diesen Ablageort, und deshalb schreibt auch nur der
// Versandweg hierher.
//
// DIE DATEIEN BLEIBEN LIEGEN. Instagram holt das Bild beim Anlegen des
// Containers ab, danach bräuchte es die Adresse nicht mehr — aber „danach" ist
// nicht messbar, und ein zu früh gelöschtes Bild ergibt einen Beitrag ohne Bild.
// Der Platzbedarf ist bei drei Beiträgen die Woche vernachlässigbar; wer später
// aufräumt, tut es an Dateien, die älter als ein paar Tage sind.

import { supabase } from "./supabase-server";

/** Ablageort. Muss in Supabase als ÖFFENTLICHER Bucket bestehen. */
export const BILD_ABLAGE = "social-bilder";

/**
 * Legt das Bild ab und gibt seine öffentliche Adresse zurück.
 *
 * Der Name trägt Beitragskennung und Zeitpunkt: Zwei Versuche am selben Beitrag
 * dürfen sich nicht überschreiben — sonst zeigte ein bereits veröffentlichter
 * Instagram-Beitrag plötzlich das Bild eines späteren Versuchs. Ein Bild, das im
 * Feed steht, ist eine Tatsache und wird nicht nachträglich ausgetauscht.
 */
export async function legeBildAb(
  postId: string,
  jpeg: ArrayBuffer,
  jetztIso: string,
): Promise<string> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const name = `${postId}-${jetztIso.replace(/[:.]/g, "-")}.jpg`;

  const { error } = await supabase.storage.from(BILD_ABLAGE).upload(name, jpeg, {
    contentType: "image/jpeg",
    // Kein Überschreiben: siehe oben — der Name ist ohnehin eindeutig, und ein
    // erlaubtes Überschreiben wäre eine stille Einladung dazu.
    upsert: false,
  });
  if (error) throw new Error(`Bild konnte nicht abgelegt werden: ${error.message}`);

  const { data } = supabase.storage.from(BILD_ABLAGE).getPublicUrl(name);
  if (!data?.publicUrl) throw new Error("Bild abgelegt, aber ohne öffentliche Adresse");
  return data.publicUrl;
}

/**
 * Legt den Ablageort an, falls er fehlt.
 *
 * Idempotent: Ein bestehender Ort ist kein Fehler, sondern der Normalfall.
 */
export async function richteBildAblageEin(): Promise<{ angelegt: boolean }> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { data: vorhandene } = await supabase.storage.listBuckets();
  if (vorhandene?.some((b) => b.name === BILD_ABLAGE)) return { angelegt: false };

  const { error } = await supabase.storage.createBucket(BILD_ABLAGE, {
    public: true,
    allowedMimeTypes: ["image/jpeg"],
    // Ein Beitragsbild ist ein paar hundert Kilobyte. Die Grenze ist keine
    // Sparmaßnahme, sondern eine Aussage darüber, was hier hingehört.
    fileSizeLimit: "8MB",
  });
  if (error) throw new Error(`Ablageort konnte nicht angelegt werden: ${error.message}`);
  return { angelegt: true };
}
