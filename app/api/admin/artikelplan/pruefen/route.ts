import { NextResponse } from "next/server";
import { isAdminSession } from "../../../../../lib/admin-guard";

// Ein Thema vor der Aufnahme prüfen: Wie viel wird gesucht, wie besetzt ist das
// Umfeld — und WER dort steht.
//
// WARUM DIE ERGEBNISSEITE DAZUGEHÖRT (und nicht nur die Zahlen): Das Projekt
// hat sich einmal ein Thema mit 1.900 Suchen als größte Chance empfohlen. Dort
// standen amtliche Dachflächen-Werkzeuge, also eine andere Frage als unsere;
// wir kamen in 28 Tagen auf fünf Einblendungen. Seitdem gilt die Regel: kein
// Suchvolumen ist eine Chance, bevor jemand die Trefferliste gesehen hat
// (scripts/seo-verify.md, Schritt 2b). Diese Route macht das Nachsehen so
// billig, dass es niemand überspringt.
//
// SIE SCHREIBT NICHTS. Die Aufnahme ins Plan bleibt ein Commit — nur so kann
// ein Test prüfen, dass jede Zahl ihr Erhebungsdatum trägt und jede Ablehnung
// ihren Grund. Dieselbe Trennung wie beim Förderkatalog, wo die Erfassung nie
// die Spalte schreibt, aus der die Seite liest.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORT = process.env.DATAFORSEO_PASSWORD;

/** Kostendeckel: höchstens so viele Begriffe je Aufruf. */
const MAX_BEGRIFFE = 10;

interface Treffer {
  platz: number;
  domain: string;
  titel: string;
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ fehler: "Nicht berechtigt." }, { status: 403 });
  }
  if (!LOGIN || !PASSWORT) {
    return NextResponse.json(
      { fehler: "Zugang zu den Suchdaten fehlt in der Umgebung." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { begriffe?: string[] };
  const begriffe = (body.begriffe ?? [])
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_BEGRIFFE);
  if (begriffe.length === 0) {
    return NextResponse.json({ fehler: "Kein Begriff angegeben." }, { status: 400 });
  }

  const auth = "Basic " + Buffer.from(`${LOGIN}:${PASSWORT}`).toString("base64");

  async function frag(pfad: string, nutzlast: unknown) {
    const res = await fetch(`https://api.dataforseo.com/v3/${pfad}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(nutzlast),
      signal: AbortSignal.timeout(40_000),
    });
    const json = (await res.json()) as {
      tasks?: { status_code?: number; status_message?: string; result?: unknown[] }[];
    };
    const task = json.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      throw new Error(task?.status_message ?? "Die Suchdaten kamen unvollständig zurück.");
    }
    return task.result ?? [];
  }

  try {
    // Erst die Zahlen für alle Begriffe auf einmal — das ist der billige Teil.
    const zahlen = (await frag("dataforseo_labs/google/keyword_overview/live", [
      { keywords: begriffe, location_code: 2276, language_code: "de" },
    ])) as { items?: unknown[] }[];

    const items = (zahlen[0]?.items ?? []) as {
      keyword?: string;
      keyword_info?: { search_volume?: number | null; cpc?: number | null };
      keyword_properties?: { keyword_difficulty?: number | null };
      search_intent_info?: { main_intent?: string | null };
    }[];

    const gemessen = begriffe.map((b) => {
      const t = items.find((i) => i.keyword === b);
      return {
        begriff: b,
        volumen: t?.keyword_info?.search_volume ?? null,
        schwierigkeit: t?.keyword_properties?.keyword_difficulty ?? null,
        klickpreis: t?.keyword_info?.cpc ?? null,
        absicht: t?.search_intent_info?.main_intent ?? null,
      };
    });

    // Die Trefferliste nur für den stärksten Begriff. Ein Abruf je Anfrage ist
    // die teuerste Position; für die Entscheidung genügt der Hauptbegriff.
    const staerkster = [...gemessen].sort((a, b) => (b.volumen ?? 0) - (a.volumen ?? 0))[0];
    let trefferliste: Treffer[] = [];
    let seitenAufbau: string[] = [];
    if (staerkster?.begriff) {
      const serp = (await frag("serp/google/organic/live/advanced", [
        {
          keyword: staerkster.begriff,
          location_code: 2276,
          language_code: "de",
          depth: 10,
        },
      ])) as { items?: unknown[] }[];
      const roh = (serp[0]?.items ?? []) as {
        type?: string;
        rank_absolute?: number;
        domain?: string;
        title?: string;
      }[];
      // Der Aufbau der Seite entscheidet mit: Steht eine KI-Antwort oder ein
      // hervorgehobener Auszug davor, fängt Google die Klicks ab — dann bringt
      // eine gute Platzierung Einblendungen und keine Besucher.
      seitenAufbau = [...new Set(roh.map((i) => i.type).filter(Boolean))] as string[];
      trefferliste = roh
        .filter((i) => i.type === "organic")
        .slice(0, 8)
        .map((i) => ({
          platz: i.rank_absolute ?? 0,
          domain: i.domain ?? "",
          titel: (i.title ?? "").slice(0, 90),
        }));
    }

    return NextResponse.json({
      gemessenAm: new Date().toISOString().slice(0, 10),
      begriffe: gemessen,
      gesamtVolumen: gemessen.reduce((s, g) => s + (g.volumen ?? 0), 0),
      trefferlisteFuer: staerkster?.begriff ?? null,
      seitenAufbau,
      // Die zwei Warnsignale, die man in nackten Zahlen nicht sieht.
      kiAntwortDavor: seitenAufbau.includes("ai_overview"),
      auszugDavor: seitenAufbau.includes("featured_snippet"),
      trefferliste,
    });
  } catch (e) {
    return NextResponse.json({ fehler: (e as Error).message }, { status: 502 });
  }
}
