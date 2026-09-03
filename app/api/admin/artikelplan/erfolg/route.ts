import { NextResponse } from "next/server";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { ARTIKELPLAN } from "../../../../../lib/artikelplan";
import {
  gscConfigured,
  querySearchAnalyticsByPage,
  querySearchAnalyticsByQuery,
} from "../../../../../lib/gsc-search-analytics";
import {
  analyticsKonfiguriert,
  aufrufeFuerSeite,
  herkunftFuerSeite,
} from "../../../../../lib/vercel-analytics";

// Was eine veröffentlichte Seite WIRKLICH bringt — gegen das, was der Plan
// vorhergesagt hat.
//
// WARUM ES DAS BRAUCHT (28.08.2026): Der Plan sagt für jedes Thema ein
// Suchvolumen voraus, und nach dem Livegang hat das nie jemand nachgeprüft. Es
// gab keinen Weg zurück von der veröffentlichten Seite zu der Vorhersage, die
// sie begründet hat — also auch keine Möglichkeit, die eigene Schätzpraxis
// besser zu machen. Die Ranglisten-Messung des Wächters beantwortet das nicht:
// Sie sagt, wo wir stehen, nicht, ob eine Entscheidung richtig war.
//
// DIE ZAHL, DIE ZÄHLT, IST NICHT DAS VOLUMEN. Das Suchvolumen ist eine
// Marktgröße; was bei uns ankommt, hängt an der Platzierung. Verglichen wird
// deshalb das vorhergesagte Volumen mit den tatsächlichen EINBLENDUNGEN — und
// die Lücke dazwischen ist die eigentliche Auskunft: Viele Einblendungen bei
// wenigen Klicks heißt, der Eintrag in der Trefferliste überzeugt nicht;
// wenige Einblendungen bei gutem Volumen heißt, wir stehen zu weit hinten.
//
// Die Search-Console-Zugangsdaten liegen nur auf Vercel. Lokal antwortet die
// Route deshalb ehrlich mit „nicht eingerichtet“ statt mit einer erfundenen
// Null — eine Null wäre von „gemessen, aber niemand kam“ nicht zu unterscheiden.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://solar-check.io";

/** Suchfenster. 28 Tage, weil alle SEO-Messungen dieses Projekts darauf laufen. */
const TAGE = 28;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ fehler: "Nicht berechtigt." }, { status: 403 });
  }

  const thema = new URL(req.url).searchParams.get("thema");
  const vorhaben = ARTIKELPLAN.find((v) => v.thema === thema);
  if (!vorhaben) {
    return NextResponse.json({ fehler: "Thema steht nicht im Plan." }, { status: 404 });
  }
  if (!vorhaben.slug) {
    return NextResponse.json({ fehler: "Das Vorhaben hat keine Adresse." }, { status: 400 });
  }
  // Die Search Console hinkt zwei bis drei Tage nach; ein Fenster bis heute
  // wäre am rechten Rand systematisch zu niedrig.
  const ende = new Date(Date.now() - 3 * 86400_000);
  const start = new Date(ende.getTime() - TAGE * 86400_000);

  // ZWEI EBENEN, UND DIE REIHENFOLGE IST DER PUNKT (gemessen am 28.08.2026):
  // Die Seitenebene ist die verlässliche Zahl. Die Anfragen-Ebene zeigt für
  // unsere Ratgeber NICHTS, obwohl die Seiten Einblendungen haben — Google
  // weist Anfragen erst ab einer Häufigkeit aus, und darunter liegen sie fast
  // alle. Eine erste Fassung dieser Route hat nur die Anfragen abgefragt und
  // hätte für jeden einzelnen Ratgeber „null Einblendungen“ gemeldet, während
  // einer davon in 28 Tagen 147 hatte. Der Filter war dabei in Ordnung; die
  // Gegenprobe an einer Seite mit sichtbaren Anfragen lieferte 162.
  // DIE QUELLEN SIND UNABHÄNGIG VONEINANDER — das war zuerst falsch gebaut:
  // Fehlte der Search-Console-Zugang, brach die Route ab und lieferte auch die
  // Besucherzahlen nicht, obwohl deren Zugang stand. Lokal ist genau das der
  // Normalfall (die Suchdaten liegen nur auf der Produktion), und der Fehler
  // wäre erst dort aufgefallen, wo beide gehen und man ihn nicht mehr sieht.
  const seite = `${BASE}${vorhaben.slug}`;
  let seitenZeile: { impressions: number; clicks: number; position: number } | null = null;
  let zeilen: { query: string; impressions: number; clicks: number; position: number }[] = [];
  let sucheFehler: string | null = null;
  if (gscConfigured()) {
    try {
      const seiten = await querySearchAnalyticsByPage({
        startDate: ymd(start),
        endDate: ymd(ende),
        urlPrefixFilter: [vorhaben.slug],
      });
      seitenZeile = seiten.find((p) => p.url === seite) ?? null;
      // Die Anfragen sind Beiwerk: Sie sagen, WONACH gesucht wurde, wenn Google
      // es ausweist. Ihr Fehlen ist selbst eine Auskunft und kein Fehler.
      zeilen = await querySearchAnalyticsByQuery({
        startDate: ymd(start),
        endDate: ymd(ende),
        pageUrl: seite,
      });
    } catch (e) {
      sucheFehler = (e as Error).message;
    }
  }

  // DIE DRITTE QUELLE: Die Search Console zählt Klicks in der Trefferliste, die
  // Besuchsmessung zählt, wer wirklich ankommt — und woher. Beides nebeneinander
  // beantwortet erst die Frage, die den Artikel rechtfertigt: Erreicht die Seite
  // jemanden, und kommt der über die Suche oder über etwas ganz anderes?
  // Fehlt der Zugang, wird das gemeldet statt mit Nullen gefüllt.
  let besuch: { aufrufe: number; besucher: number } | null = null;
  let herkunft: { herkunft: string | null; aufrufe: number }[] = [];
  if (analyticsKonfiguriert()) {
    try {
      besuch = await aufrufeFuerSeite(vorhaben.slug, start, ende);
      herkunft = (await herkunftFuerSeite(vorhaben.slug, start, ende, 8)).map((h) => ({
        herkunft: h.herkunft,
        aufrufe: h.aufrufe,
      }));
    } catch {
      // Ein Ausfall dieser Quelle darf die Messung nicht kippen — die
      // Suchdaten stehen unabhängig davon.
      besuch = null;
    }
  }

  const einblendungen = seitenZeile?.impressions ?? 0;
  const klicks = seitenZeile?.clicks ?? 0;
  const position = seitenZeile?.position ?? null;
  const sichtbareEinblendungen = zeilen.reduce((s, r) => s + r.impressions, 0);

  const vorhergesagt =
    vorhaben.messung.volumen +
    (vorhaben.messung.nebenbegriffe ?? []).reduce((s, n) => s + n.volumen, 0);

  return NextResponse.json({
    // Je Quelle einzeln, damit die Anzeige sagen kann, WAS fehlt — „nicht
    // eingerichtet" über allem wäre bei einer von zwei Quellen falsch.
    sucheGemessen: gscConfigured() && !sucheFehler,
    sucheFehler,
    thema: vorhaben.thema,
    slug: vorhaben.slug,
    zeitraum: { start: ymd(start), ende: ymd(ende), tage: TAGE },
    // Volumen ist ein Monatswert, das Fenster sind 28 Tage — nah genug, um
    // nebeneinander zu stehen, und der Unterschied wird ausgeschrieben.
    vorhergesagtesVolumen: vorhergesagt,
    einblendungen,
    klicks,
    position,
    // Der Anteil der Einblendungen, die aus benannten Anfragen stammen. Nahe
    // null heißt: Die Seite lebt von Anfragen, die Google anonymisiert, weil sie
    // zu selten sind — dann ist jede Optimierung an Titel und Text ein Schuss
    // ins Dunkle. Dieselbe Kennzahl, die der SEO-Wächter für Seitenfamilien
    // fordert, hier je Artikel.
    anteilSichtbar: einblendungen > 0 ? sichtbareEinblendungen / einblendungen : null,
    besuchGemessen: analyticsKonfiguriert(),
    besuch,
    herkunft,
    anfragen: zeilen
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map((r) => ({
        anfrage: r.query,
        einblendungen: r.impressions,
        klicks: r.clicks,
        position: r.position,
      })),
  });
}
