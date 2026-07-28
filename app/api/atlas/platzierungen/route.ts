import { NextRequest, NextResponse } from "next/server";
import { loadAwardStats, loadKreisNames, loadElternSlugs } from "../../../../lib/awards-server";
import { computePlacements, DEFAULT_HOOK_SETTINGS, LEVEL_LABEL, type HookLevel } from "../../../../lib/award-hook";
import { AWARD_CATEGORY_BY_KEY, formatAwardValue, rankGemeinden, scopeIdOf } from "../../../../lib/awards";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";
import { ortPhrase } from "../../../../lib/atlas-orte";

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

  const [stats, kreisNames, elternSlugs] = await Promise.all([
    loadAwardStats(),
    loadKreisNames(),
    loadElternSlugs(),
  ]);
  // Voller Atlas-Pfad je Gemeinde, aus drei Slugs zusammengesetzt. Ohne einen
  // davon bleibt die Zeile unverlinkt statt auf eine erfundene URL zu zeigen.
  const pfadVon = (id: string, slug: string | null | undefined): string | null => {
    const bl = elternSlugs[id.slice(0, 2)];
    const kreis = elternSlugs[id.slice(0, 5)];
    return bl && kreis && slug ? `/solar-atlas/${bl}/${kreis}/${slug}` : null;
  };
  const eigene = stats.find((s) => s.regionId === regionId);
  if (!eigene) return NextResponse.json({ error: "Gemeinde nicht gefunden" }, { status: 404 });

  const placements = computePlacements(stats);
  // Nur Vergleichsgruppen, die etwas aussagen. Ohne diese Schwelle stand auf
  // der Seite einer kreisfreien Stadt „Platz 1 von 1 im Stuttgart" — die Stadt
  // ist ihr eigener Landkreis, die Gruppe hat genau ein Mitglied. Dieselbe
  // Glaubwürdigkeitsschwelle wie beim Anschreiben-Aufhänger.
  //
  // Und nur Platzierungen, die auch eine sind: Die Sektion heißt „Wo die
  // Gemeinde im Vergleich vorn liegt" — dort „Platz 921 von 924" aufzulisten,
  // widerspricht der Überschrift. Dieselben Stufen wie beim Aufhänger: Sieg,
  // Podium oder oberstes Perzentil.
  //
  // NUR PRO-KOPF-KATEGORIEN. Eine absolute Auszeichnung ("die meiste private
  // Solarleistung") kürt in der Praxis die einwohnerstärkste Kommune: In
  // Baden-Württemberg, Bayern und Nordrhein-Westfalen ist der Sieger jeweils
  // exakt die größte Gemeinde, und 6 bis 10 der ersten Zehn sind schlicht die
  // zehn einwohnerstärksten Orte (bei Balkonkraftwerken in Bayern 10 von 10).
  // Eine Krone dafür lobt Größe, keine Leistung — und stand deshalb neben
  // lauter roten Pro-Kopf-Werten auf derselben Seite.
  const meine = (placements.get(regionId) ?? []).filter((p) => {
    if (p.spike || p.total < DEFAULT_HOOK_SETTINGS.minTotal) return false;
    if (AWARD_CATEGORY_BY_KEY[p.categoryKey]?.messart !== "proKopf") return false;
    return p.rank <= 3 || p.rank / p.total <= DEFAULT_HOOK_SETTINGS.percentileCut;
  });

  const woLabel = (level: HookLevel) =>
    level === "kreis"
      ? ortPhrase({ name: kreisNames[regionId.slice(0, 5)] ?? "Landkreis" })
      : level === "land"
        ? ortPhrase({ name: bundeslandByAgs(regionId.slice(0, 2))?.name ?? "diesem Bundesland", level: "bundesland" })
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
            themaDativ: cat.themaDativ,
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
  let tabelle: { platz: number; name: string; href: string | null; wert: string; selbst: boolean }[] = [];
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
      const nachId = new Map(stats.map((s) => [s.regionId, s]));
      tabelle = rankGemeinden(gruppe, cat)
        .slice(0, MAX_TABELLE)
        .map((r) => {
          const g = nachId.get(r.regionId);
          return {
            platz: r.rank,
            name: g?.name ?? r.regionId,
            href: pfadVon(r.regionId, g?.slug),
            wert: formatAwardValue(r.value, cat.format),
            selbst: r.regionId === regionId,
          };
        });
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
