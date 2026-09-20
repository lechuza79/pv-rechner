import { NextResponse } from "next/server";
import { leseAngebot, type LeseDienst } from "../../../lib/angebot-auslesen";
import { pruefeAngebot, geraetepreisVergleichbar } from "../../../lib/angebot-check";
import { anthropicLeseDienst } from "../../../lib/angebot-lesedienst";
import { gewerkVon, WAERMEPUMPE } from "../../../lib/angebot-gewerk";
import { zuSammlungsZeile } from "../../../lib/angebot-sammlung";
import { merkeBefund } from "../../../lib/angebot-sammlung-db";

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
// WOHIN DAS DOKUMENT GEHT: an einen Lesedienst in den Vereinigten Staaten
// (Anthropic — eine europäische Region gibt es dort nicht, nachgemessen am
// 27.08.2026). Deshalb zwei Schranken vor dem Absenden: die ausdrückliche
// Einwilligung des Nutzers, hier serverseitig geprüft, und der
// Auftragsverarbeitungsvertrag samt Standardvertragsklauseln. Fehlt der Zugang,
// antwortet die Route sichtbar mit "nicht eingerichtet", statt still zu
// scheitern.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ein abfotografiertes Angebot hat regelmäßig vier bis acht Seiten; zwölf ist
// großzügig und begrenzt zugleich, was ein einzelner Aufruf kosten kann.
const MAX_DATEIEN = 12;
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_BYTES_GESAMT = 30 * 1024 * 1024;
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

/** Der Lesedienst. Fehlt der Zugang, antwortet die Route sichtbar statt still. */
function leseDienst(): LeseDienst | null {
  return anthropicLeseDienst();
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

  const dateien = form.getAll("datei").filter((d): d is File => d instanceof File);
  if (dateien.length === 0) return NextResponse.json({ fehler: "keine-datei" }, { status: 400 });
  if (dateien.length > MAX_DATEIEN) return NextResponse.json({ fehler: "zu-viele-seiten" }, { status: 413 });
  let summe = 0;
  for (const d of dateien) {
    if (d.size > MAX_BYTES) return NextResponse.json({ fehler: "zu-gross" }, { status: 413 });
    if (!ERLAUBTE_TYPEN.has(d.type)) return NextResponse.json({ fehler: "falscher-typ" }, { status: 415 });
    summe += d.size;
  }
  if (summe > MAX_BYTES_GESAMT) return NextResponse.json({ fehler: "zu-gross" }, { status: 413 });

  // Einwilligung ist Pflicht und wird SERVERSEITIG geprüft, nicht nur im
  // Browser. Ein Häkchen, das nur die Oberfläche kennt, ist keine Schranke —
  // und hier hängt an ihm, ob ein fremdes Dokument in ein Drittland geht.
  if (String(form.get("einwilligung") ?? "") !== "ja") {
    return NextResponse.json({ fehler: "keine-einwilligung" }, { status: 400 });
  }

  const gewerk = gewerkVon(String(form.get("gewerk") ?? "")) ?? WAERMEPUMPE;

  // Ohne Gebäudewerte entfällt nur das Größen-Urteil; Vollständigkeit und Preis
  // gehen trotzdem. Der eigenständige Flow kennt das Gebäude nicht immer.
  const heizlastKw = Number(form.get("heizlastKw"));
  const auslegungKw = Number(form.get("auslegungKw"));
  const gebaeude = Number.isFinite(auslegungKw) && auslegungKw > 0
    ? { heizlastKw: Number.isFinite(heizlastKw) ? heizlastKw : auslegungKw, auslegungKw }
    : { heizlastKw: 0, auslegungKw: 0 };

  const dienst = leseDienst();
  if (!dienst) {
    return NextResponse.json({ fehler: "nicht-eingerichtet" }, { status: 503 });
  }

  const dokumente = await Promise.all(
    dateien.map(async (d) => ({
      mediaType: d.type,
      base64: Buffer.from(await d.arrayBuffer()).toString("base64"),
    })),
  );

  let ergebnis;
  try {
    ergebnis = await leseAngebot(dienst, dokumente, gewerk);
  } catch {
    // Bewusst ohne Details nach außen: Die Fehlermeldung eines Lesedienstes kann
    // Teile des Dokuments enthalten.
    return NextResponse.json({ fehler: "lesen-fehlgeschlagen" }, { status: 502 });
  }

  if (ergebnis.art !== "gelesen") {
    return NextResponse.json({ art: ergebnis.art, grund: ergebnis.grund });
  }

  // Die Statistikzeile — ohne Dokument, ohne Namen, ohne Wortlaut, mit Region
  // statt Postleitzahl und Monat statt Tag. Sie wird nebenbei abgelegt und darf
  // den Nutzer nichts kosten: scheitert sie, bekommt er sein Ergebnis trotzdem.
  const monat = new Date().toISOString().slice(0, 7);
  const region = String(form.get("region") ?? "").slice(0, 2) || null;
  void merkeBefund(zuSammlungsZeile(ergebnis.angebot, gewerk, monat, region));

  return NextResponse.json({
    art: "geprueft",
    befund: pruefeAngebot(ergebnis.angebot, gebaeude, gewerk),
    geraet: ergebnis.angebot.geraet,
    marke: ergebnis.angebot.marke,
    gesamtpreisEur: ergebnis.angebot.gesamtpreisEur,
    geraetepreisVergleichbar: geraetepreisVergleichbar(ergebnis.angebot),
  });
}
