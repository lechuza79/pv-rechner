import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ATLAS_REVALIDATE_ROUTEN, ATLAS_DATEN_TAG } from "../../../../lib/atlas-revalidate-routen";

/**
 * ATLAS-SEITEN NACH DEM DATENLAUF FÜR UNGÜLTIG ERKLÄREN.
 *
 * WARUM ES DIESE ROUTE ÜBERHAUPT GIBT — das ist der ganze Punkt, und wer sie
 * entfernt, muss zuerst die Haltbarkeit der Atlas-Seiten zurückdrehen:
 *
 * Die Atlas-Seiten hatten bis zum 26.08.2026 eine Haltbarkeit von 24 Stunden,
 * während ihre Daten nur EINMAL IM MONAT kommen (BNetzA-Datenlauf am 5.). Sie
 * verfielen also dreißigmal öfter als nötig, und jeder Verfall bedeutet: der
 * nächste Zugriff rechnet die Seite komplett neu, mit rund zehn Datenbank-
 * Abfragen, einem Cache-Schreibvorgang und einer Übertragung ans
 * Auslieferungsnetz. Bei über 11.000 Gemeindeseiten und dem Maschinen-Verkehr,
 * der auf ihnen liegt, war das der zweitgrößte Posten der Vercel-Rechnung.
 *
 * Die Haltbarkeit auf den Datentakt zu setzen, repariert das — ABER NUR MIT
 * DIESER ROUTE. Denn ein aufgerufener ISR-Eintrag, der noch als gültig gilt,
 * wird NICHT neu gerechnet. Ohne aktives Ungültig-Erklären träfe der
 * Aufwärm-Lauf nach dem Datenlauf lauter „noch gültige" Seiten, rührte sie
 * nicht an, und auf 11.000 Seiten stünden bis zu einen Monat lang die Zahlen
 * des Vormonats. Das wäre exakt der Fehler, den die Projektanweisung als den
 * schwersten des Projekts bezeichnet: eine falsche Zahl, die niemandem auffällt.
 *
 * REIHENFOLGE IM DATENLAUF, und sie ist nicht vertauschbar:
 *   1. Daten hochladen        (mastr:refresh-bnetza)
 *   2. Plausibilität prüfen   (mastr-plausibilitaet.ts) — fällt sie durch, wird
 *      der Lauf rot und es wird nicht invalidiert
 *   3. DIESE ROUTE            — alle Atlas-Seiten für ungültig erklären
 *   4. Aufwärmen              (atlas:warm) — baut sie mit den neuen Zahlen neu auf
 *
 * Wer 3 weglässt, macht die neuen Zahlen gar nicht sichtbar. Was die Reihenfolge
 * dagegen NICHT leistet — hier stand vorher, ungeprüfte Zahlen könnten nicht
 * sichtbar werden, und das war falsch: Schritt 1 schreibt sie bereits in die
 * Datenbank. Fällt die Prüfung durch, unterbleibt nur das aktive Sichtbarmachen;
 * jede Seite, deren Eintrag von selbst abläuft, zeigt sie trotzdem. Die
 * Reihenfolge steuert das Tempo, nicht das Ob.
 *
 * WARUM ÜBER EINEN MARKER AN DEN DATEN UND NICHT ÜBER DIE ADRESSEN — gemessen,
 * nicht angenommen:
 *
 * Die erste Fassung dieser Route benutzte ausschließlich Routenmuster
 * (`revalidatePath("/solar-atlas/[bundesland]/[kreis]/[gemeinde]", "page")`).
 * Am 26.08.2026 auf Produktion geprüft: Sie bewirkt NICHTS. Alle drei Ebenen —
 * Gemeinde, Bundesland, Rangliste — lieferten vor und nach dem Aufruf
 * unverändert einen Cache-Treffer, über anderthalb Minuten hinweg beobachtet.
 * Der Grund: Diese Seiten werden nicht vorab gebaut (die Liste der vorzubauenden
 * Adressen ist absichtlich leer, es sind zu viele), sie entstehen erst beim
 * Zugriff. Das Framework kennt die konkreten Adressen also gar nicht, auf die
 * das Muster passen müsste.
 *
 * DAS SCHLIMMSTE DARAN WAR NICHT DIE WIRKUNGSLOSIGKEIT, SONDERN DIE MELDUNG:
 * `revalidatePath` wirft in diesem Fall nicht, es trifft einfach nichts. Die
 * Route meldete „erledigt" und hätte den Datenlauf grün durchlaufen lassen,
 * während die Zahlen des Vormonats stehen blieben. Wer hier etwas ändert,
 * misst es an einer echten Seite nach — eine grüne Antwort ist kein Beleg.
 *
 * Deshalb hängt die Invalidierung jetzt an den DATEN: Jede zwischengespeicherte
 * Atlas-Abfrage trägt denselben Marker, und ein Aufruf erklärt alles für
 * ungültig, was daran hängt — unabhängig davon, wie viele Adressen daraus
 * entstanden sind. Die Routenmuster laufen zusätzlich mit; sie kosten nichts,
 * aber verlassen darf man sich nur auf den Marker.
 */

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Die Routen, deren Zahlen am MaStR-Datenlauf hängen — die Liste steht in
 * `lib/atlas-revalidate-routen.ts`, damit ein Test sie gegen den Dateibaum
 * halten kann.
 *
 * Bewusst NICHT in der Routen-Liste stehen die Förderseiten: Deren Daten bewegen
 * sich täglich (auslaufende Programme, Vierzehn-Tage-Fristen der Beleg-Prüfung),
 * sie behalten ihre Haltbarkeit von einer Stunde und brauchen kein monatliches
 * Ungültig-Erklären.
 *
 * DAS HEISST ABER NICHT, DASS SIE UNBERÜHRT BLEIBEN — die frühere Fassung dieses
 * Absatzes behauptete das, und ein Prüfer hat es widerlegt: Die Förder-Stadtseite
 * benutzt `getRegionAtlasData` für den Anlagenbestand, und die trägt den Marker.
 * Dasselbe gilt für drei Widgets und die Sitemap (über `getKreisPfade`). Sie
 * werden also mit-invalidiert. Schaden entsteht dadurch keiner — sie bauen mit
 * frischen Zahlen neu auf —, es kostet einmal im Monat ein paar Aufbauten mehr,
 * als der Kommentar früher versprach.
 */
const ATLAS_ROUTEN = ATLAS_REVALIDATE_ROUTEN;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const erledigt: string[] = [];
  const fehler: { schritt: string; grund: string }[] = [];

  // DER WIRKSAME WEG: über den Marker an den Daten.
  // Am 26.08.2026 auf Produktion nachgemessen — das Ungültig-Erklären über
  // Routenmuster allein bewirkt nichts, weil die Atlas-Seiten erst beim Zugriff
  // entstehen und das Framework ihre Adressen nicht kennt.
  try {
    revalidateTag(ATLAS_DATEN_TAG);
    erledigt.push(`tag:${ATLAS_DATEN_TAG}`);
  } catch (e) {
    fehler.push({ schritt: `tag:${ATLAS_DATEN_TAG}`, grund: e instanceof Error ? e.message : String(e) });
  }

  // Zusätzlich die Routenmuster. Sie kosten nichts und schaden nicht; verlassen
  // wird sich auf sie NICHT (siehe Messung oben).
  for (const route of ATLAS_ROUTEN) {
    try {
      revalidatePath(route, "page");
      erledigt.push(`pfad:${route}`);
    } catch (e) {
      fehler.push({ schritt: `pfad:${route}`, grund: e instanceof Error ? e.message : String(e) });
    }
  }

  // Schlägt der Marker fehl, ist der ganze Lauf wertlos — dann MUSS die Antwort
  // ein Fehler sein, damit der Datenlauf rot wird. Ein stiller Fehlschlag hier
  // hiesse: alte Zahlen bleiben auf 11.000 Seiten stehen, und niemand merkt es.
  const markerOk = erledigt.some((e) => e.startsWith("tag:"));

  return NextResponse.json(
    {
      ok: markerOk && fehler.length === 0,
      erledigt,
      fehler,
      hinweis:
        "Die Seiten sind jetzt ungueltig, aber noch nicht neu gebaut. Der Aufwaermlauf baut sie gedrosselt neu auf; bis dahin zahlt der erste Besucher einer Seite den Neuaufbau.",
    },
    { status: markerOk && fehler.length === 0 ? 200 : 500 }
  );
}
