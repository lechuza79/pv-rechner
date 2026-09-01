// ─── Woher kommen die Leute auf unsere eigenen Seiten? Die reine Logik. ──────
//
// Bewusst OHNE Datenbank-Import: Diese Datei läuft in der Middleware, also in
// der Edge-Laufzeit, in der es kein Node gibt. Die Leseseite für die
// Admin-Ansicht liegt getrennt in `seiten-herkunft.ts`.
//
// WARUM ES DIESE ZÄHLUNG GIBT (29.08.2026): Unsere Reichweitenmessung erfährt
// die Herkunft nur beim ERSTEN Seitenaufruf eines Besuchs — jede weitere
// Navigation innerhalb der Anwendung läuft ohne. Das ist eine Eigenschaft des
// Werkzeugs, keine Rechtsfolge. Folge: 980 Aufrufe im Messzeitraum standen
// ohne jede Herkunft da, und niemand konnte sagen, ob das Direkteinstiege,
// Prüfmaschinen oder verlorene Verweise waren. Ein Drittel des Verkehrs war
// unerklärt.
//
// Die Antwort darauf war dreimal „ein Einwilligungsfenster" — und dreimal
// falsch. Ein Council mit Gegenprüfung hat am 29.08.2026 nachgerechnet: Bei
// unserer Größe KOSTET ein Zustimmungsdialog Aussagekraft (erkennbare
// Unterschiede steigen von 29 auf 31–35 Prozentpunkte), und er verzerrt, weil
// die Zustimmung je Herkunft verschieden hoch ausfällt. Die richtige Antwort
// ist, weniger im Browser zu messen und mehr am Server — genau das hier.
//
// WARUM SERVERSEITIG: Dieselbe Herleitung wie bei der Einbettungs-Zählung
// (`lib/embed-herkunft-core.ts`, 25.08.2026). Wir liefern keinen Code aus, der
// das Gerät anweist, uns etwas zu senden — das wäre der Fall aus den
// EDSA-Leitlinien 2/2023 Rn. 33. Wir lesen den Anfrage-Kopf, den der Browser
// von sich aus mitschickt, weil das Übertragungsprotokoll ihn vorsieht. Der
// BfDI sagt dazu: „Der Anwendungsbereich des TDDDG ist bei ausschließlicher
// Nutzung der notwendigerweise angefallenen Daten aus den Serverlogs
// entsprechend nicht eröffnet." Der LfDI Baden-Württemberg ausdrücklicher:
// IP und User-Agent kommen „ohne dass dies der Anbieter des Telemediendienstes
// beeinflussen könnte", also kein zielgerichteter Zugriff.
//
// DIE GRENZE, AN DER DAS KIPPT — BLOCKER. Die Datenschutzkonferenz definiert
// Fingerprinting ausdrücklich als „den Prozess der SERVERSEITIGEN Bildung eines
// möglichst eindeutigen und langlebigen (Hash-)Werts" aus Browser-Angaben
// (OH digitale Dienste, Fassung 1.2, Rn. 23). Zwischen zulässiger Zählung und
// unzulässiger Wiedererkennung liegen zwei Zeilen Code. Deshalb ist diese
// Zählung so gebaut, dass die Wiedererkennung gar nicht erst möglich ist:
//   * Geschrieben werden INKREMENTE auf (Kalendertag × Pfad × Herkunft) —
//     niemals eine Zeile je Aufruf und niemals eine je Besucher.
//   * KEINE IP, KEIN User-Agent, keine Kennung, kein Zeitstempel feiner als
//     der Kalendertag. Nichts davon wird gespeichert, auch nicht gehasht.
//   * Vom Verweis wird nur die DOMAIN übernommen, nie ihr Pfad.
//   * Vom eigenen Pfad wird der ABFRAGETEIL abgeschnitten. Das ist keine
//     Vorsicht, sondern ein bereits eingetretener Fehler: Bis zum 27.08.2026
//     ging die vollständige Adresse samt Abfrageteil an die
//     Reichweitenmessung — und die Rechner schreiben die Postleitzahl genau
//     dorthin.
// Damit gibt es hier keine „Besucher", nur „Abrufe". Wer später eine
// Entdopplung nachrüstet, macht die Zählung einwilligungspflichtig — und zwar
// die ganze, nicht nur die neue Spalte.
//
// Erzwungen von `lib/__tests__/seiten-herkunft.test.ts`.

/** Unsere eigenen Domains. Ein Verweis von dort ist interne Navigation. */
const EIGENE = [
  "solar-check.io",
  "www.solar-check.io",
  "pv-rechner-alpha.vercel.app",
  "localhost",
  "127.0.0.1",
];

/**
 * Was in der Herkunfts-Spalte steht, wenn der Browser keinen Verweis
 * mitgeschickt hat. Ein eigener Wert statt `null`, damit der Fall in der
 * Auswertung sichtbar ist statt zu fehlen — er ist der Anlass dieser Zählung.
 */
export const DIREKT = "(direkt)";

/**
 * Was in der Herkunfts-Spalte steht, wenn der Verweis von uns selbst kommt.
 * Wird gezählt, aber getrennt: Interne Navigation ist kein Eintritt von außen,
 * und sie in denselben Topf zu werfen hieße, unsere eigene Reichweite zu
 * verdoppeln.
 */
export const INTERN = "(intern)";

// Derselbe enge Host-Prüfer wie bei der Einbettungs-Zählung: Der Anfrage-Kopf
// kommt aus einem fremden Browser, ist frei wählbar und landet als Text in
// einer Admin-Ansicht.
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Macht aus dem Verweis-Kopf einen speicherbaren Wert: eine fremde Domain,
 * `INTERN` für unsere eigenen Seiten, oder `DIREKT`, wenn nichts da war.
 *
 * Unsinn und überlange Werte fallen ebenfalls auf `DIREKT` — das ist die
 * ehrlichere Einordnung als sie wegzuwerfen: Der Aufruf hat stattgefunden, wir
 * wissen nur nicht, woher.
 */
export function herkunftAusVerweis(roh: string | null | undefined): string {
  if (!roh) return DIREKT;
  const text = roh.trim().toLowerCase();
  if (!text || text.length > 253) return DIREKT;

  let host = text;
  if (host.includes("/") || host.includes(":")) {
    try {
      host = new URL(host.includes("//") ? host : `https://${host}`).hostname;
    } catch {
      return DIREKT;
    }
  }
  // Die eigenen Domains ZUERST — vor dem Muster-Prüfer. `localhost` trägt
  // keinen Punkt und fiele sonst durch das Muster, das mindestens einen
  // verlangt; im lokalen Betrieb wäre dann jede interne Navigation ein
  // Direkteinstieg, und die Gegenprobe des Zählers ginge ins Leere.
  if (EIGENE.includes(host)) return INTERN;
  if (!HOST_RE.test(host)) return DIREKT;
  return host;
}

/**
 * Der eigene Pfad, wie er gespeichert wird: ohne Abfrageteil, ohne
 * Schrägstrich am Ende, gekürzt.
 *
 * Der Abfrageteil MUSS weg — dort stehen Postleitzahlen und ganze
 * Rechnerzustände. Die Länge ist begrenzt, weil der Pfad vom Aufrufer kommt:
 * Jeder kann eine beliebig lange Adresse aufrufen, und was hier durchgeht,
 * steht später in einer Tabelle.
 */
export function pfadFuerZaehlung(pfad: string): string | null {
  const ohneAbfrage = pfad.split("?")[0].split("#")[0];
  if (!ohneAbfrage.startsWith("/")) return null;
  if (ohneAbfrage.length > 180) return null;
  // Positivliste statt Sperrliste: Buchstaben, Ziffern, Schrägstrich,
  // Bindestrich, Unterstrich, Punkt und Prozentzeichen. Umlaute in Ortsnamen
  // kommen kodiert an, unsere eigenen Adressen sind ohnehin transliteriert.
  // Alles andere — Steuerzeichen, Leerzeichen, Anführungszeichen — fällt raus,
  // bevor es in einer Admin-Tabelle landet.
  if (!/^[a-zA-Z0-9/\-_.%]+$/.test(ohneAbfrage)) return null;
  const gekuerzt = ohneAbfrage.length > 1 ? ohneAbfrage.replace(/\/+$/, "") : ohneAbfrage;
  return gekuerzt || "/";
}

// Maschinen tragen keine Herkunft und würden den Direkteinstieg-Topf füllen —
// genau die Zahl, die diese Zählung erklären soll. Sie werden deshalb
// verworfen, NICHT als eigene Kategorie gezählt: Eine Bot-Spalte wäre eine
// Aussage über den Aufrufer, und die will diese Tabelle nicht treffen.
//
// Der Anfrage-Kopf wird dafür nur GELESEN und sofort vergessen. Er landet
// nirgends — auch nicht gehasht, auch nicht verkürzt. Der Filter reduziert die
// Erhebung, er weitet sie nicht aus.
//
// Die Liste ist bewusst grob: Sie fängt, was sich selbst als Maschine
// ausweist. Wer sich als Browser ausgibt, wird als Besuch gezählt — das ist
// die ehrlichere Richtung, weil die Gegenrichtung echte Besucher verwerfen
// würde.
const MASCHINEN = [
  "bot", "crawl", "spider", "slurp", "curl", "wget", "python-requests",
  "headlesschrome", "phantomjs", "lighthouse", "monitor", "check", "scan",
  "fetch", "probe", "preview", "validator", "http-client", "axios", "okhttp",
];

/** Meldet sich der Aufrufer selbst als Maschine? */
export function istMaschine(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // Ein Aufruf ganz ohne Kennung ist kein Browser.
  const ua = userAgent.toLowerCase();
  return MASCHINEN.some((m) => ua.includes(m));
}

/**
 * Zählt NUR die echte Produktion — BLOCKER, und ein bereits eingetretener
 * Fehler.
 *
 * Der Entwicklungs-Server und die Produktion teilen sich dieselbe Datenbank.
 * Am 01.09.2026, wenige Minuten nach dem Livegang, standen deshalb 369 Aufrufe
 * für eine Seite in der Tabelle — sämtlich aus drei lokalen Testläufen, die
 * jede Seite und jeden Frage-Weg durchklicken. Das ist die schlimmere Sorte
 * Verschmutzung: Die Zeilen sehen aus wie echter Verkehr, sie stehen unter
 * denselben Pfaden, und hinterher lassen sie sich nicht mehr auseinanderhalten.
 *
 * Vercel setzt `VERCEL_ENV` nur in seinen eigenen Umgebungen; lokal ist die
 * Variable leer. Geprüft wird auf „production", nicht auf „nicht leer" — sonst
 * schriebe auch eine Vorschau-Auslieferung mit.
 */
function istProduktion(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * Zählt einen Seitenaufruf — direkt über die Datenbank-Schnittstelle, weil das
 * in der Edge-Laufzeit der einzige Weg ist. Schlägt es fehl, ist das folgenlos:
 * Eine verlorene Zählung darf niemals die Auslieferung einer Seite stören.
 */
export async function zaehleSeitenaufruf(pfad: string, herkunft: string): Promise<boolean> {
  if (!istProduktion()) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/sc_seiten_herkunft_zaehlen`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_pfad: pfad, p_herkunft: herkunft }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
