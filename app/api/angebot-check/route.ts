import { NextResponse } from "next/server";
import { leseAngebot, type LeseDienst } from "../../../lib/angebot-auslesen";
import { pruefeAngebot, geraetepreisVergleichbar } from "../../../lib/angebot-check";

// ─── Ein hochgeladenes Wärmepumpen-Angebot prüfen ─────────────────────────────
//
// Nimmt Datei + die Gebäudewerte, die der Rechner ohnehin schon hat, und gibt die
// drei Urteile zurück. Das Dokument wird NICHT abgelegt — es lebt für die Dauer
// dieses einen Aufrufs im Arbeitsspeicher und ist danach weg.
//
// WARUM NICHTS GESPEICHERT WIRD (Stand 27.08.2026): Sobald wir aus dem Angebot
// einen eigenen Datenbestand aufbauen, sind die Daten des Nutzers eine
// Gegenleistung — dann wird aus dem kostenlosen Werkzeug ein Verbrauchervertrag
// mit Widerrufsbelehrung und Fernabsatz-Informationspflichten. Das ist machbar
// und der Betreiber will es, aber es ist eine eigene Entscheidung mit eigenen
// Rechtstexten. Bis dahin: lesen, urteilen, vergessen.
//
// WOHIN DAS DOKUMENT GEHT: an den Lesedienst, und der ist heute nicht
// eingerichtet. Anthropic bietet keine EU-Region an (nachgemessen 27.08.2026:
// `inference_geo` kennt nur "us" und "global"), ein direkter Aufruf wäre also
// eine Drittlandübermittlung mit Standardvertragsklauseln und eigener
// Risikoprüfung. Die Alternative ist ein Claude über Amazon in Frankfurt oder
// Google in Europa. Beides ist eine Vertragsentscheidung — deshalb antwortet die
// Route sichtbar mit "nicht eingerichtet", statt still irgendwohin zu senden.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const ERLAUBTE_TYPEN = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

// Wie die Kontaktroute: einfache Zählung je Adresse im Arbeitsspeicher. Beim
// Kaltstart weg — für dieses Aufkommen ausreichend, und ein Angebot zu prüfen ist
// teurer als eine Mail, deshalb enger.
const LIMIT_MAX = 5;
const LIMIT_FENSTER_MS = 60 * 60 * 1000;
const verlauf = new Map<string, number[]>();

function zuOft(ip: string): boolean {
  const jetzt = Date.now();
  if (verlauf.size > 500) {
    verlauf.forEach((zeiten, schluessel) => {
      if (zeiten.every((t) => jetzt - t >= LIMIT_FENSTER_MS)) verlauf.delete(schluessel);
    });
  }
  const zeiten = (verlauf.get(ip) ?? []).filter((t) => jetzt - t < LIMIT_FENSTER_MS);
  zeiten.push(jetzt);
  verlauf.set(ip, zeiten);
  return zeiten.length > LIMIT_MAX;
}

/** Der Lesedienst — noch nicht verdrahtet, siehe Kopfkommentar. */
function leseDienst(): LeseDienst | null {
  return null;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unbekannt").split(",")[0].trim();
  if (zuOft(ip)) {
    return NextResponse.json({ fehler: "zu-viele-anfragen" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ fehler: "keine-datei" }, { status: 400 });
  }

  // Honigtopf: Ein echter Nutzer sieht dieses Feld nie.
  if (String(form.get("website") ?? "").trim()) {
    return NextResponse.json({ fehler: "keine-datei" }, { status: 400 });
  }

  const datei = form.get("datei");
  if (!(datei instanceof File)) return NextResponse.json({ fehler: "keine-datei" }, { status: 400 });
  if (datei.size > MAX_BYTES) return NextResponse.json({ fehler: "zu-gross" }, { status: 413 });
  if (!ERLAUBTE_TYPEN.has(datei.type)) return NextResponse.json({ fehler: "falscher-typ" }, { status: 415 });

  const heizlastKw = Number(form.get("heizlastKw"));
  const auslegungKw = Number(form.get("auslegungKw"));
  if (!Number.isFinite(heizlastKw) || !Number.isFinite(auslegungKw) || auslegungKw <= 0) {
    return NextResponse.json({ fehler: "kein-gebaeude" }, { status: 400 });
  }

  const dienst = leseDienst();
  if (!dienst) {
    return NextResponse.json({ fehler: "nicht-eingerichtet" }, { status: 503 });
  }

  const base64 = Buffer.from(await datei.arrayBuffer()).toString("base64");

  let ergebnis;
  try {
    ergebnis = await leseAngebot(dienst, { mediaType: datei.type, base64 });
  } catch {
    // Bewusst ohne Details nach außen: Die Fehlermeldung eines Lesedienstes kann
    // Teile des Dokuments enthalten.
    return NextResponse.json({ fehler: "lesen-fehlgeschlagen" }, { status: 502 });
  }

  if (ergebnis.art !== "gelesen") {
    return NextResponse.json({ art: ergebnis.art, grund: ergebnis.grund });
  }

  return NextResponse.json({
    art: "geprueft",
    befund: pruefeAngebot(ergebnis.angebot, { heizlastKw, auslegungKw }),
    geraet: ergebnis.angebot.geraet,
    marke: ergebnis.angebot.marke,
    gesamtpreisEur: ergebnis.angebot.gesamtpreisEur,
    geraetepreisVergleichbar: geraetepreisVergleichbar(ergebnis.angebot),
  });
}
