// Balkonkraftwerk-Sets eines Partner-Shops als rechenbare Angebote.
//
// WARUM DIESE DATEI EXISTIERT
// ---------------------------
// Der Balkonrechner sagt bisher, WELCHE Konfiguration sich für einen Haushalt
// rechnet — mit generischen Größen (1/2/4 Module, 1,6/2,7 kWh Speicher). Was er
// nicht sagen kann: was es kostet und wo man es bekommt. Dafür braucht es echte
// Produktdaten, und die kommen hier her.
//
// DIE QUELLE IST DER SHOP SELBST, NICHT DAS AFFILIATE-NETZWERK. Solakon läuft
// auf Shopify, und jeder Shopify-Shop stellt seine Produktliste öffentlich und
// maschinenlesbar bereit. Das ist der Grund, warum diese Fläche überhaupt
// tragfähig ist: Preise, Varianten und Verfügbarkeit sind live, nichts wird von
// Hand gepflegt und veraltet still. Dasselbe Verfahren trägt später jeden
// weiteren Shopify-Händler (Yuma, Solago, Kleines Kraftwerk — am 09.09.2026
// geprüft, alle drei liefern dieselbe Liste).
//
// WAS HIER NICHT PASSIERT: Rechnen. Diese Datei normalisiert Produktdaten, mehr
// nicht. Was ein Angebot für einen Haushalt bringt, rechnet `calcBalkon` auf der
// geteilten Rechen-Basis — siehe lib/shop-angebot.ts.

/** Ein kaufbares Balkonkraftwerk-Set in genau einer Ausstattung. */
export interface ShopAngebot {
  /** Stabile Kennung: Shop + Produkt + Variante. */
  id: string;
  haendler: "solakon";
  haendlerName: string;
  /** Produktname ohne Marketing-Zusatz, z. B. „onBasic". */
  produkt: string;
  /** Modul-Spitzenleistung des Sets in Wattpeak. */
  moduleWp: number;
  /** Wechselrichter-Grenze in Watt AC. */
  inverterW: number;
  /**
   * Batteriekapazität in kWh, 0 = ohne Speicher.
   *
   * VORBEHALT, GEMESSEN AM DATENBLATT (09.09.2026): Das Datenblatt des Solakon
   * ONE nennt die Zeile „Batteriekapazität [kWh] 2.11" und macht KEINE Angabe
   * zur nutzbaren Kapazität. 2,11 kWh ist die Nennkapazität der Zellen
   * (35,2 V × 60 Ah). Unsere eigene Speicher-Config führt dagegen ausdrücklich
   * die NUTZBARE Kapazität. Wir rechnen hier mit der Nennkapazität, weil eine
   * Entladetiefe zu erfinden schlechter wäre als die benannte Ungenauigkeit —
   * die Fehlerrichtung ist bekannt und steht am Ergebnis: Der Speichernutzen
   * fällt eher am oberen Rand aus.
   *
   * OFFEN (bis 11/2026): nutzbare Kapazität beim Hersteller erfragen.
   */
  speicherKwh: number;
  /** Bruttopreis in Euro, wie im Shop ausgezeichnet. */
  preis: number;
  /** Durchgestrichener Vergleichspreis, falls der Shop einen führt. */
  streichpreis: number | null;
  lieferbar: boolean;
  /** Produktadresse OHNE Empfehlungscode — den hängt erst die Anzeige an. */
  url: string;
  /** Bildadresse beim Shop. Die Anzeige entscheidet, ob sie es zeigen darf. */
  bildUrl: string | null;
  /** Was der Shop an dieser Variante sonst noch festlegt (Halterung, Kabel). */
  variante: string;
}

/** Antwort der Shop-Schnittstelle mit dem Zeitpunkt des Abrufs. */
export interface ShopAngebote {
  angebote: ShopAngebot[];
  /** Wann die Preise geholt wurden — gehört sichtbar an jeden Preis. */
  abgerufenIso: string;
}

const SHOP = "https://www.solakon.de";
const HAENDLER_NAME = "Solakon";

/**
 * Empfehlungscode aus dem Partnerprogramm. KEIN Geheimnis — er steht in jedem
 * Empfehlungslink und darf in den Code, genau wie die Awin-Kennung.
 */
export const SOLAKON_REF = "lsqpyrpl";

/**
 * NUR DIESE DREI SETS. onPower Plus (4.000 Wp, im Shop „Solaranlage" statt
 * „Balkonkraftwerk") bleibt bewusst draußen: Seine Wechselrichterleistung ist
 * nirgends ausgewiesen, und ohne belegte Einspeisegrenze wäre jede Ertragszahl
 * geraten. Ein Set aufzunehmen, dessen Kerngröße wir schätzen müssten,
 * widerspricht der Rechenweise des ganzen Rechners.
 */
const SETS: Record<string, { produkt: string; inverterW: number }> = {
  onlite: { produkt: "onLite", inverterW: 800 },
  onbasic: { produkt: "onBasic", inverterW: 800 },
  onpower: { produkt: "onPower", inverterW: 800 },
};

/** Rohform, wie Shopify sie liefert — nur die Felder, die wir wirklich lesen. */
export interface ShopifyProdukt {
  handle: string;
  title: string;
  body_html?: string;
  options?: { name: string; values: string[] }[];
  variants: {
    id: number;
    title: string;
    price: string;
    compare_at_price?: string | null;
    available: boolean;
  }[];
  images?: { src: string; variant_ids?: number[] }[];
}

/** Modul-Spitzenleistung aus dem Produktnamen („onBasic: 1000 Watt …"). */
export function moduleWpAusTitel(titel: string): number | null {
  const m = titel.match(/(\d{3,5})\s*Watt/i);
  if (!m) return null;
  const wp = Number(m[1]);
  return wp > 0 && wp <= 20000 ? wp : null;
}

/**
 * Speichergröße aus dem Variantennamen. „ohne Speicher" ergibt 0, „2.11 kWh"
 * ergibt 2.11. Beide Schreibweisen (Punkt und Komma) werden gelesen, weil der
 * Shop sie mischt.
 */
export function speicherKwhAusVariante(variante: string): number {
  const m = variante.match(/(\d+[.,]?\d*)\s*kWh/i);
  if (!m) return 0;
  return Number(m[1].replace(",", "."));
}

/**
 * Eine B2B-Dublette erkennen.
 *
 * WARUM DAS EINE EIGENE FUNKTION IST: Der Shop führt jedes zweite Produkt ein
 * zweites Mal mit dem Zusatz „B2B" und NETTO-Preisen (ein Modul für 75 € statt
 * des Endkundenpreises). Wer die Liste ungefiltert übernimmt, zeigt Nettopreise
 * neben Bruttopreisen und merkt es nie — die Zahlen sehen einzeln plausibel aus.
 *
 * HEUTE IST DAS DAS ZWEITE NETZ, NICHT DAS ERSTE, und das gehört dazugesagt:
 * Der Shop führt die B2B-Sets unter eigenen Adressen
 * („onbasic-1000-watt-balkonkraftwerk-b2b"), die ohnehin nicht in der Set-Liste
 * oben stehen. Diese Prüfung greift erst an dem Tag, an dem der Shop seine
 * Adressen umstellt — und genau dann greift sonst gar nichts. Wer sie für
 * überflüssig hält, weil „der Test auch ohne sie grün ist", hat den Test
 * gemessen und nicht die Regel: In der Prüfung steht die Dublette deshalb unter
 * einem Handle, den wir kennen.
 */
export function istB2b(titel: string): boolean {
  return /\bB2B\b/i.test(titel);
}

/** Produktadresse mit Empfehlungscode. */
export function angebotUrl(angebot: ShopAngebot, ref: string = SOLAKON_REF): string {
  const trenner = angebot.url.includes("?") ? "&" : "?";
  return `${angebot.url}${trenner}ref=${encodeURIComponent(ref)}`;
}

/**
 * Shopify-Rohdaten in Angebote übersetzen.
 *
 * Rein und ohne Netz, damit die Übersetzung testbar ist: Die Fehlerklasse, um
 * die es hier geht (eine Variante falsch gelesen, ein Nettopreis mitgenommen,
 * eine Speichergröße verwechselt), ist von außen unsichtbar — das Ergebnis
 * sieht in jedem Fall wie ein Preis aus.
 */
export function angeboteAusShopify(produkte: ShopifyProdukt[]): ShopAngebot[] {
  const angebote: ShopAngebot[] = [];

  for (const p of produkte) {
    const set = SETS[p.handle];
    if (!set || istB2b(p.title)) continue;

    const moduleWp = moduleWpAusTitel(p.title);
    if (!moduleWp) continue;

    // Bild je Variante: Der Shop hinterlegt für fast jede Variante ein eigenes
    // Foto. Wo keins zugeordnet ist, fällt es auf das erste Produktbild zurück.
    const bildJeVariante = new Map<number, string>();
    for (const bild of p.images ?? []) {
      for (const vid of bild.variant_ids ?? []) {
        if (!bildJeVariante.has(vid)) bildJeVariante.set(vid, bild.src);
      }
    }
    const ersatzBild = p.images?.[0]?.src ?? null;

    for (const v of p.variants) {
      const preis = Number(v.price);
      if (!isFinite(preis) || preis <= 0) continue;

      const streich = v.compare_at_price ? Number(v.compare_at_price) : null;

      angebote.push({
        id: `solakon-${p.handle}-${v.id}`,
        haendler: "solakon",
        haendlerName: HAENDLER_NAME,
        produkt: set.produkt,
        moduleWp,
        inverterW: set.inverterW,
        speicherKwh: speicherKwhAusVariante(v.title),
        preis,
        streichpreis: streich && isFinite(streich) && streich > preis ? streich : null,
        lieferbar: v.available,
        url: `${SHOP}/products/${p.handle}`,
        bildUrl: bildJeVariante.get(v.id) ?? ersatzBild,
        variante: v.title,
      });
    }
  }

  return angebote;
}

/**
 * Produktliste beim Shop holen.
 *
 * DIE SCHNITTSTELLE IST NICHT ZUGESAGT. Sie gehört zum Shopify-Standard und
 * kann sich ändern oder sperren, ohne dass uns jemand Bescheid sagt. Deshalb
 * wirft diese Funktion bei jedem Fehlschlag, statt eine leere Liste zu liefern:
 * „keine Angebote" und „Abruf kam nicht durch" sind zwei verschiedene Befunde,
 * und wer sie zusammenwirft, zeigt einem Nutzer stillschweigend nichts an.
 */
export async function holeSolakonAngebote(signal?: AbortSignal): Promise<ShopAngebote> {
  const res = await fetch(`${SHOP}/products.json?limit=250`, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Shop antwortete mit ${res.status}`);

  const daten = (await res.json()) as { products?: ShopifyProdukt[] };
  const produkte = daten.products ?? [];
  if (produkte.length === 0) throw new Error("Shop lieferte eine leere Produktliste");

  const angebote = angeboteAusShopify(produkte);
  if (angebote.length === 0) throw new Error("Kein bekanntes Set in der Produktliste gefunden");

  return { angebote, abgerufenIso: new Date().toISOString() };
}
