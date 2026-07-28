import { NextRequest, NextResponse } from "next/server";
import { loadAwardStats, loadKreisNames } from "../../../../lib/awards-server";
import { computePlacements, LEVEL_LABEL, type HookLevel } from "../../../../lib/award-hook";
import { AWARD_CATEGORY_BY_KEY, formatAwardValue, rankGemeinden, scopeIdOf } from "../../../../lib/awards";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";

// Platzierungen einer Gemeinde + die Rangliste ihrer stärksten Kategorie.
//
// ÖFFENTLICH (kein Admin-Guard): Das ist genau die Nachprüfbarkeit, an der der
// Outreach hängt — im Anschreiben steht „Platz 1 von 32", und die verlinkte
// Seite muss das zeigen. Nur MaStR-Daten, die ohnehin auf jeder Atlas-Seite
// stehen; keine Kontakt- oder Outreach-Felder.
//
// CLIENT-GELADEN, NICHT IM SEITENAUFBAU: Der Rechenkern lädt ~11.000
// Gemeindezeilen (gemessen 1,7 s kalt). Im Server-Render der Gemeindeseite
// würde das direkt auf die 8-Sekunden-Notbremse zuarbeiten — dieselbe
// Fehlerklasse, die am 27.07.2026 Welle 0b gekippt hat. Deshalb wie beim
// „Was das für Sie bedeutet"-Block: Seite zuerst, Zahlen danach.

export const dynamic = "force-dynamic";

/** So viele Zeilen zeigt der Teaser; das Modal bekommt die volle Liste. */
const TEASER = 5;
const MAX_TABELLE = 300;

export async function GET(req: NextRequest) {
  const regionId = (req.nextUrl.searchParams.get("region") ?? "").trim();
  if (!/^\d{8}$/.test(regionId)) {
    return NextResponse.json({ error: "region fehlt oder ist kein 8-stelliger Gemeindeschlüssel" }, { status: 400 });
  }

  const [stats, kreisNames] = await Promise.all([loadAwardStats(), loadKreisNames()]);
  const eigene = stats.find((s) => s.regionId === regionId);
  if (!eigene) return NextResponse.json({ error: "Gemeinde nicht gefunden" }, { status: 404 });

  const placements = computePlacements(stats);
  const meine = (placements.get(regionId) ?? []).filter((p) => !p.spike);

  const woLabel = (level: HookLevel) =>
    level === "kreis"
      ? `im ${kreisNames[regionId.slice(0, 5)] ?? "Landkreis"}`
      : level === "land"
        ? `in ${bundeslandByAgs(regionId.slice(0, 2))?.name ?? "diesem Bundesland"}`
        : "bundesweit";

  // Alle Platzierungen, stärkste zuerst. „Platz 1 von 34" schlägt „Platz 1 von
  // 5" — die größere Vergleichsgruppe ist die stärkere Aussage.
  const alle = meine
    .map((p) => {
      const cat = AWARD_CATEGORY_BY_KEY[p.categoryKey];
      return cat
        ? {
            kategorie: cat.key,
            thema: cat.thema,
            bestleistung: cat.bestleistung,
            ebene: LEVEL_LABEL[p.level],
            wo: woLabel(p.level),
            platz: p.rank,
            von: p.total,
            wert: formatAwardValue(p.value, cat.format),
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.platz - b.platz || b.von - a.von);

  // Die Rangliste zur stärksten Platzierung — das ist die Tabelle, die der
  // Teaser anreißt und das Modal vollständig zeigt.
  const beste = alle[0] ?? null;
  let tabelle: { platz: number; name: string; wert: string; selbst: boolean }[] = [];
  if (beste) {
    const p = meine.find((x) => x.categoryKey === beste.kategorie && x.rank === beste.platz && x.total === beste.von);
    const cat = AWARD_CATEGORY_BY_KEY[beste.kategorie];
    if (p && cat) {
      const scope = scopeIdOf(regionId, p.level === "kreis" ? "landkreis" : p.level === "land" ? "bundesland" : "de");
      const floor = cat.messart === "proKopf" ? 2000 : 0;
      const gruppe = stats.filter(
        (g) =>
          g.population >= floor &&
          (cat.metric(g) ?? 0) > 0 &&
          scopeIdOf(g.regionId, p.level === "kreis" ? "landkreis" : p.level === "land" ? "bundesland" : "de") === scope,
      );
      tabelle = rankGemeinden(gruppe, cat)
        .slice(0, MAX_TABELLE)
        .map((r) => ({
          platz: r.rank,
          name: stats.find((s) => s.regionId === r.regionId)?.name ?? r.regionId,
          wert: formatAwardValue(r.value, cat.format),
          selbst: r.regionId === regionId,
        }));
    }
  }

  // Teaser: die Anführer UND die eigene Zeile. Eine Rangliste, in der die
  // Gemeinde selbst nicht vorkommt, ist für sie wertlos — und genau das passiert
  // ab Platz 6. Dasselbe Muster wie in der Kreis-Rangliste (GemeindeHero).
  const eigenerIdx = tabelle.findIndex((r) => r.selbst);
  const teaser =
    eigenerIdx >= 0 && eigenerIdx >= TEASER
      ? [...tabelle.slice(0, TEASER - 1), tabelle[eigenerIdx]]
      : tabelle.slice(0, TEASER);

  return NextResponse.json(
    {
      name: eigene.name,
      beste,
      alle,
      teaser,
      /** Sitzt die eigene Zeile losgelöst unter den Anführern? Dann setzt die
       *  Anzeige eine Auslassung dazwischen, statt Rang 5 und Rang 39
       *  kommentarlos untereinander zu stellen. */
      teaserAbgesetzt: eigenerIdx >= TEASER,
      tabelle,
      // Ehrlich dazuschreiben, was abgeschnitten wurde — eine Liste, die
      // stillschweigend bei 300 endet, liest sich wie „das sind alle".
      tabelleGekuerzt: tabelle.length >= MAX_TABELLE,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
