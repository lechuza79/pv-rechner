// ─── Wo hängen unsere Widgets? Die reine Logik. ──────────────────────────────
//
// Bewusst OHNE Datenbank-Import: Diese Datei läuft in der Middleware, also in
// der Edge-Laufzeit, in der es kein Node gibt. Die Leseseite für die
// Admin-Ansicht liegt getrennt in `embed-herkunft.ts`.
//
// WARUM ES DIESE ZÄHLUNG GIBT (25.08.2026): Der Kommunen-Outreach verschickt
// Widget-Angebote, und bis hierher konnten wir den Erfolg nur an Rückläufern
// ablesen — an dem, was jemand ANTWORTET, nicht an dem, was jemand TUT. Eine
// Gemeinde, die das Widget wortlos einbaut, war für uns unsichtbar.
//
// WARUM SERVERSEITIG — und nicht im Browser (Umbau am 25.08.2026, wenige
// Stunden nach der ersten Fassung): Die erste Fassung lieferte JavaScript aus,
// das den Browser anwies, die Einbettungs-Herkunft an uns zu senden. Das ist
// genau der Fall, den die EDSA-Leitlinien 2/2023 (Fassung 2.0, 07.10.2024) in
// Rn. 33 beschreiben — „JavaScript code, where the accessing entity instructs
// the browser of the user to send asynchronous requests with the targeted
// information. Such access clearly falls within the scope of Article 5(3) ePD"
// —, bestätigt in Rn. 53 für lokal ERZEUGTE Information und in Rn. 63 für
// ausgelieferten Client-Code. Volltext am 25.08.2026 gelesen.
// Die Folge wäre eine Einwilligung nach § 25 Abs. 1 TDDDG; die Ausnahme in
// Abs. 2 greift nicht, weil die Zählung für die Anzeige des Widgets nicht
// erforderlich ist. Ein Zustimmungsbanner für eine Domain-Zählung wäre absurd.
//
// Jetzt lesen wir stattdessen den Anfrage-Kopf, den der Browser beim Laden des
// eingebetteten Dokuments von sich aus mitschickt. Der Unterschied ist der, den
// Rn. 32 zieht: Dort weist die auslesende Stelle das Gerät an, etwas zu senden
// — hier weist niemand irgendetwas an, die Angabe kommt mit der Anfrage, weil
// das Übertragungsprotokoll sie vorsieht. Und die Angabe beschreibt die
// EINBETTENDE WEBSITE, nicht das Gerät des Besuchers.
// Das bleibt eine Auslegung, keine Gewissheit — aber eine deutlich besser
// vertretbare als die erste. Nachzuprüfen bleibt sie trotzdem
// (`scripts/rechtstexte-verify.md`).
//
// DATENSPARSAMKEIT ist die Bedingung, unter der das überhaupt gebaut werden
// darf — die Widgets sind Einbettenden gegenüber als „cookielos, kein
// Browser-Speicher" zugesagt:
//   * Gespeichert wird die DOMAIN der einbettenden Seite, NICHT ihr Pfad. Der
//     Pfad wäre schon eine Aussage darüber, welche Unterseite jemand aufruft.
//   * KEINE IP, keine Kennung, kein Zeitstempel feiner als der Kalendertag.
//     Damit ist keine Zeile einem Besucher zuzuordnen, auch nicht rückwirkend.
//   * Kein Schreiben und kein Lesen im Browser des Besuchers.
// Wer hier eine Spalte ergänzt, prüft zuerst, ob sie diese drei Sätze noch
// wahr lässt — sonst wird aus einer Einbau-Zählung eine Besucher-Messung.

/** Unsere eigenen Domains zählen nicht als Einbettung. */
const EIGENE = [
  "solar-check.io",
  "www.solar-check.io",
  "pv-rechner-alpha.vercel.app",
  "localhost",
  "127.0.0.1",
];

// Der Anfrage-Kopf kommt aus einem fremden Browser und ist frei wählbar. Er
// landet als Text in der Datenbank und später in einer Admin-Ansicht —
// deshalb ein enges Muster statt einer Säuberung: Buchstaben, Ziffern, Punkt
// und Bindestrich, mindestens ein Punkt, keine Umlaute (internationale Domains
// stehen im Anfrage-Kopf bereits in ihrer ASCII-Schreibweise).
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Macht aus der gemeldeten Herkunft eine speicherbare Domain — oder `null`,
 * wenn nichts Verwertbares übrig bleibt (eigene Seite, Unsinn, zu lang).
 *
 * Nimmt bewusst NUR den Host: Der Anfrage-Kopf trägt je nach Einstellung der
 * einbettenden Seite den vollständigen Pfad; gespeichert wird nie mehr als
 * "example.de".
 */
export function hostAusHerkunft(roh: string | null | undefined): string | null {
  if (!roh) return null;
  const text = roh.trim().toLowerCase();
  if (!text || text.length > 253) return null;

  let host = text;
  if (host.includes("/") || host.includes(":")) {
    try {
      host = new URL(host.includes("//") ? host : `https://${host}`).hostname;
    } catch {
      return null;
    }
  }
  if (!HOST_RE.test(host)) return null;
  if (EIGENE.includes(host)) return null;
  return host;
}

// Welches Widget eingebaut wurde, steht in der eigenen Adresse — also in einer
// Angabe, die wir selbst kontrollieren. Geprüft wird sie trotzdem gegen eine
// Liste: Die Adresse kann jeder aufrufen, und was in die Datenbank wandert,
// kommt aus unserer Liste (dasselbe Muster wie die Themen-Allowlist des
// Kontaktformulars). `lib/__tests__/embed-herkunft.test.ts` hält die Liste
// gegen den Dateibaum — ein neues Widget fällt dort auf, nicht erst an
// fehlenden Zahlen.
export const EMBED_WIDGETS = [
  "ee-ampel",
  "einspeiseverguetung-verlauf",
  "erzeugung",
  "erzeugung-mini",
  "foerder-check",
  "gemeinde-erneuerbare",
  "gemeinde-solar",
  "gemeinde-solarleistung",
  "gruengas-heizkosten",
  "karte",
  "kennzahl",
  "pv-zubau-deutschland",
  "region-anlagentyp",
  "region-solarleistung",
  "simulation",
  "strommix",
  "strommix-anteil",
  "zubau-erneuerbare-atom",
] as const;

export type EmbedWidget = (typeof EMBED_WIDGETS)[number];

export function istEmbedWidget(v: unknown): v is EmbedWidget {
  return typeof v === "string" && (EMBED_WIDGETS as readonly string[]).includes(v);
}

/** `/embed/strommix/irgendwas` → `strommix`; alles andere → `null`. */
export function widgetAusPfad(pfad: string): EmbedWidget | null {
  const teile = pfad.split("/").filter(Boolean);
  if (teile[0] !== "embed") return null;
  return istEmbedWidget(teile[1]) ? teile[1] : null;
}

/**
 * Zählt eine Einbettung — direkt über die Datenbank-Schnittstelle, weil das in
 * der Edge-Laufzeit der einzige Weg ist. Schlägt es fehl, ist das folgenlos:
 * Eine verlorene Zählung darf niemals die Auslieferung eines Widgets stören.
 */
export async function zaehleEinbettung(host: string, widget: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/sc_embed_herkunft_zaehlen`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_host: host, p_widget: widget }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
