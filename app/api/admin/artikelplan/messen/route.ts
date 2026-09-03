import { NextResponse } from "next/server";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { ARTIKELPLAN } from "../../../../../lib/artikelplan";

// Ein Thema neu bewerten: Suchvolumen und Schwierigkeit frisch abrufen und
// gegen den gespeicherten Stand halten.
//
// WARUM DIE ROUTE NICHT SCHREIBT: Der Plan lebt im Code, damit ein Test ihn
// prüfen kann (jede Zahl mit Erhebungstag, jede Verwerfung mit Grund). Eine
// Route, die den Plan überschreibt, hätte diese Prüfung nicht — und ein
// eingetipptes Suchvolumen wäre von einem gemessenen nicht mehr zu
// unterscheiden. Sie MISST also und zeigt den Unterschied; ob der neue Stand
// übernommen wird, entscheidet ein Commit.
//
// Dieselbe Trennung wie beim Förderkatalog: Die Erfassung schreibt nie die
// Spalte, aus der die Seite liest.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORT = process.env.DATAFORSEO_PASSWORD;

/** Kostendeckel: ein Thema je Aufruf, höchstens so viele Begriffe. */
const MAX_BEGRIFFE = 6;

interface Wert {
  begriff: string;
  volumen: number | null;
  schwierigkeit: number | null;
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

  const { thema } = (await req.json().catch(() => ({}))) as { thema?: string };
  const vorhaben = ARTIKELPLAN.find((v) => v.thema === thema);
  if (!vorhaben) {
    return NextResponse.json({ fehler: "Thema steht nicht im Plan." }, { status: 404 });
  }

  const begriffe = [
    vorhaben.messung.begriff,
    ...(vorhaben.messung.nebenbegriffe ?? []).map((n) => n.begriff),
  ].slice(0, MAX_BEGRIFFE);

  const auth = "Basic " + Buffer.from(`${LOGIN}:${PASSWORT}`).toString("base64");
  let antwort: Response;
  try {
    antwort = await fetch(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([{ keywords: begriffe, location_code: 2276, language_code: "de" }]),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    return NextResponse.json({ fehler: "Die Suchdaten waren nicht erreichbar." }, { status: 502 });
  }

  const json = (await antwort.json().catch(() => null)) as {
    tasks?: { status_code?: number; status_message?: string; result?: { items?: unknown[] }[] }[];
  } | null;
  const task = json?.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    return NextResponse.json(
      { fehler: task?.status_message ?? "Die Suchdaten kamen unvollständig zurück." },
      { status: 502 },
    );
  }

  const items = (task.result?.[0]?.items ?? []) as {
    keyword?: string;
    keyword_info?: { search_volume?: number | null };
    keyword_properties?: { keyword_difficulty?: number | null };
  }[];

  const neu: Wert[] = begriffe.map((b) => {
    const t = items.find((i) => i.keyword === b);
    return {
      begriff: b,
      volumen: t?.keyword_info?.search_volume ?? null,
      schwierigkeit: t?.keyword_properties?.keyword_difficulty ?? null,
    };
  });

  const alt: Wert[] = [
    {
      begriff: vorhaben.messung.begriff,
      volumen: vorhaben.messung.volumen,
      schwierigkeit: vorhaben.messung.schwierigkeit,
    },
    ...(vorhaben.messung.nebenbegriffe ?? []).map((n) => ({
      begriff: n.begriff,
      volumen: n.volumen,
      schwierigkeit: n.schwierigkeit,
    })),
  ];

  return NextResponse.json({
    thema: vorhaben.thema,
    gespeichertAm: vorhaben.messung.gemessenAm,
    // Das Datum der neuen Messung setzt der Server, nicht der Browser: Ein
    // Prüfdatum darf nur die Stelle stempeln, die wirklich geprüft hat.
    gemessenAm: new Date().toISOString().slice(0, 10),
    alt,
    neu,
  });
}
