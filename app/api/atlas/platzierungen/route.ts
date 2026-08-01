import { NextRequest, NextResponse } from "next/server";
import { loadAwardStats, loadKreisNames, loadElternSlugs } from "../../../../lib/awards-server";
import { computePlacements, DEFAULT_HOOK_SETTINGS, LEVEL_LABEL, type HookLevel } from "../../../../lib/award-hook";
import { AWARD_CATEGORY_BY_KEY, formatAwardValue, rankGemeinden, scopeIdOf } from "../../../../lib/awards";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";
import { ortPhrase } from "../../../../lib/atlas-orte";
import { GROESSENKLASSE_BY_SLUG, klasseVon } from "../../../../lib/gemeindegroesse";
import { ranglisteUrl } from "../../../../lib/atlas-ranking";
import { getRegionById } from "../../../../lib/atlas";
import { rateLimit } from "../../../../lib/rate-limit";

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
  // AUFRUFLIMIT WIE BEI JEDER ANDEREN OEFFENTLICHEN ATLAS-ROUTE. Diese hier war
  // die einzige ohne — und zugleich die teuerste: ein Aufruf zieht den ganzen
  // Gemeinde-Datensatz und rechnet saemtliche Platzierungen. Das prozess-lokale
  // Memo daempft das nur, solange die Instanz warm ist.
  const limited = rateLimit(req, "atlas-platzierungen", 60);
  if (limited) return limited;

  const regionId = (req.nextUrl.searchParams.get("region") ?? "").trim();
  if (!/^\d{8}$/.test(regionId)) {
    return NextResponse.json({ error: "region fehlt oder ist kein 8-stelliger Gemeindeschlüssel" }, { status: 400 });
  }

  // ERST PRUEFEN, OB ES DEN ORT GIBT — DANN DIE ~11.000 ZEILEN LADEN.
  // Vorher lag der Existenz-Check hinter dem Laden: Eine erfundene, formal
  // gueltige Nummer kostete denselben vollen Datensatz wie ein echter Aufruf,
  // nur um am Ende 404 zu sagen. Ein einzelner Regions-Lookup beantwortet die
  // Frage vorher und trifft einen Index.
  const region = await getRegionById(regionId);
  if (!region || region.level !== "gemeinde") {
    return NextResponse.json({ error: "Gemeinde nicht gefunden" }, { status: 404 });
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
    // Absolute Kategorien entstehen gar nicht mehr als Platzierung (siehe
    // computePlacements); Verhaeltniszahlen — pro Kopf UND je Dach — zaehlen.
    if (AWARD_CATEGORY_BY_KEY[p.categoryKey]?.messart === "absolut") return false;
    return p.rank <= 3 || p.rank / p.total <= DEFAULT_HOOK_SETTINGS.percentileCut;
  });

  const woLabel = (level: HookLevel) =>
    level === "kreis"
      ? ortPhrase({ name: kreisNames[regionId.slice(0, 5)] ?? "Landkreis" })
      : level === "land"
        ? ortPhrase({ name: bundeslandByAgs(regionId.slice(0, 2))?.name ?? "diesem Bundesland", level: "bundesland" })
        : "bundesweit";

  const nachId = new Map(stats.map((g) => [g.regionId, g]));

  /** `/solar-atlas/ranking/<kategorie>/<bundesland>/<kreis>` je Vergleichsebene. */
  function rankingHrefVon(katSlug: string | undefined, level: HookLevel, klasseSlug: string): string | null {
    const bl = elternSlugs[regionId.slice(0, 2)];
    const kreis = elternSlugs[regionId.slice(0, 5)];
    const gebiet = level === "bund" ? [] : level === "land" ? [bl] : [bl, kreis];
    if (level !== "bund" && gebiet.some((x) => !x)) return null;
    return ranglisteUrl(katSlug, klasseSlug, gebiet);
  }

  /** Die vollständige Rangliste einer Platzierung — dieselbe Gruppe, aus der ihr
   *  Rang stammt. Jede Auszeichnung hat ihre eigene; eine gemeinsame gäbe es
   *  nicht, weil sich Kategorie UND Vergleichsebene je Zeile unterscheiden. */
  function ranglisteZu(p: Platzierung) {
    const cat = AWARD_CATEGORY_BY_KEY[p.categoryKey];
    if (!cat) return [];
    const ebene = p.level === "kreis" ? "landkreis" : p.level === "land" ? "bundesland" : "de";
    const scope = scopeIdOf(regionId, ebene);
    // DIESELBE GRUPPE WIE IN DER RANGLISTE: Gebiet UND Groessenklasse, plus die
    // Groessenpruefung der Kategorie. Vorher stand hier eine 2.000-Einwohner-
    // Grenze ohne Klassen — der Orden zeigte damit einen anderen Platz als die
    // Seite, auf die er verlinkt.
    const gruppe = stats.filter(
      (g) =>
        scopeIdOf(g.regionId, ebene) === scope &&
        klasseVon(g.population)?.slug === p.klasseSlug &&
        (!cat.plausibel || cat.plausibel(g)) &&
        (cat.metric(g) ?? 0) > 0,
    );
    return rankGemeinden(gruppe, cat)
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

  // EINE ZEILE JE KATEGORIE. Vorher stand dieselbe Kategorie mehrfach da, einmal
  // je Vergleichsebene — auf der Seite las sich das als Widerspruch: "Platz 1 bei
  // Balkonkraftwerken im Landkreis" und drei Zeilen tiefer "Platz 12 bei
  // Balkonkraftwerken in Bayern". Beides stimmt, aber niemand liest die
  // Ebenenangabe als Auflösung. Behalten wird je Kategorie die stärkste
  // Platzierung; die Ebene steht weiterhin dran.
  type Platzierung = (typeof meine)[number];
  const besteJeKategorie = new Map<string, Platzierung>();
  for (const p of meine) {
    const da = besteJeKategorie.get(p.categoryKey);
    if (!da || p.rank < da.rank || (p.rank === da.rank && p.total > da.total)) besteJeKategorie.set(p.categoryKey, p);
  }

  // Stärkste zuerst. „Platz 1 von 34" schlägt „Platz 1 von 5" — die größere
  // Vergleichsgruppe ist die stärkere Aussage.
  const alle = Array.from(besteJeKategorie.values())
    .map((p) => {
      const cat = AWARD_CATEGORY_BY_KEY[p.categoryKey];
      if (!cat) return null;
      const tabelle = ranglisteZu(p);
      const eigenerIdx = tabelle.findIndex((r) => r.selbst);
      return {
        kategorie: cat.key,
        thema: cat.thema,
        themaDativ: cat.themaDativ,
        bestleistung: cat.bestleistung,
        ebene: LEVEL_LABEL[p.level as HookLevel],
        wo: woLabel(p.level),
        // Der Vergleich, in dem der Platz gilt. Muss mitgehen, sonst liest sich
        // "Platz 3 im Landkreis" als Vergleich mit ALLEN Orten des Kreises —
        // gerankt wird aber innerhalb der Groessenklasse.
        klasse: GROESSENKLASSE_BY_SLUG[p.klasseSlug]?.label ?? p.klasseLabel,
        gruppe: `${GROESSENKLASSE_BY_SLUG[p.klasseSlug]?.label ?? p.klasseLabel} ${woLabel(p.level)}`,
        platz: p.rank,
        von: p.total,
        // Der Formatierer bringt bei manchen Kategorien schon einen Punkt mit
        // ("38,1 je 1.000 Ew."). Im Satz stand dahinter ein zweiter.
        wert: formatAwardValue(p.value, cat.format).replace(/\.$/, ""),
        // Adresse der vollständigen Ranking-Seite. Nur Pro-Kopf-Kategorien
        // haben eine (siehe `slug` in lib/awards.ts) — und nur, wenn sich das
        // Gebiet aus Slugs zusammensetzen lässt.
        rankingHref: rankingHrefVon(cat.slug, p.level, p.klasseSlug),
        tabelle,
        /** Sitzt die eigene Zeile losgelöst unter den Anführern? Dann setzt die
         *  Anzeige eine Auslassung dazwischen. */
        teaserAbgesetzt: eigenerIdx >= TEASER,
        teaser:
          eigenerIdx >= TEASER ? [...tabelle.slice(0, TEASER - 1), tabelle[eigenerIdx]] : tabelle.slice(0, TEASER),
        // Ehrlich dazuschreiben, was abgeschnitten wurde.
        tabelleGekuerzt: tabelle.length >= MAX_TABELLE,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.platz - b.platz || b.von - a.von);

  const beste = alle[0] ?? null;

  return NextResponse.json(
    {
      name: eigene.name,
      beste,
      alle,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
