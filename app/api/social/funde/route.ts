import { NextRequest, NextResponse } from "next/server";
import { istAdminOderCron } from "../../../../lib/admin-guard";
import { loadAwardStats, loadKreisNames } from "../../../../lib/awards-server";
import { getFundingPrograms } from "../../../../lib/funding-data";
import { schreibeFunde } from "../../../../lib/social-fundvorrat";
import { nationalSeries } from "../../../../lib/mastr-data";
import { supabase } from "../../../../lib/supabase-server";
import { AWARD_CATEGORIES } from "../../../../lib/awards";
import { GROESSENKLASSEN, klasseVon } from "../../../../lib/gemeindegroesse";
import { SUCHAUFTRAEGE, bundeslandSchluessel, ostWest } from "../../../../lib/social-suchauftraege";
import { LAND_NAME } from "../../../../lib/social-kalendertage";
import {
  findeAufholer,
  findeAusreisser,
  findeDavid,
  findeFlaechenmix,
  findeFoerderluecken,
  findeHeizungsfoerderung,
  findeKohorte,
  findeAnomalie,
  findeSaison,
  ortsnamen,
  findeWohnform,
  findeKontrast,
  findeTopliste,
  findeUmkehrung,
  type Fund,
} from "../../../../lib/social-funde";

// Was in den Daten gerade auffällt.
//
// Der Vorrat an IDEEN, nicht an Beiträgen. Jeder Fund ist ein Satz mit seinen
// Zahlen; was davon taugt, entscheidet ein Mensch, und aus dem Gewählten wird
// dann Visual und Text.
//
// GERECHNET, NICHT GERATEN: Die Sätze entstehen aus denselben Gemeindedaten wie
// die Ranglisten. Ein Beispielsatz, der nie gegen die Daten lief, ist in diesem
// Projekt schon einmal als Katalogeintrag gelandet — und beide Hälften davon
// waren falsch.

export const dynamic = "force-dynamic";

/**
 * Jahr und Kalenderwoche nach ISO 8601 — dieselbe Zählung, nach der die
 * Strommix-Reihe geführt wird.
 *
 * Sie wird gebraucht, um die laufende Woche von den abgeschlossenen zu
 * trennen; aus den Daten allein ist das nicht zu erkennen (eine halb erhobene
 * Woche sieht aus wie eine schwache). Das JAHR gehört mit dazu: Zum Jahres-
 * wechsel gehört die KW 1 zum neuen und die KW 52 noch zum alten.
 */
function kalenderwoche(d: Date): { jahr: number; woche: number } {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Auf den Donnerstag derselben Woche: Nach ISO gehört eine Woche zu dem Jahr,
  // in dem ihr Donnerstag liegt.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jahresanfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const woche = Math.ceil(((t.getTime() - jahresanfang.getTime()) / 86_400_000 + 1) / 7);
  return { jahr: t.getUTCFullYear(), woche };
}

/**
 * Größenpaare, deren Auseinanderlaufen etwas bedeutet.
 *
 * Nicht jedes Paar taugt: Zwei Größen, die dasselbe messen, können gar nicht
 * auseinanderlaufen, und zwei ohne Zusammenhang laufen immer auseinander. Was
 * hier steht, sind Paare, bei denen man einen Gleichlauf ERWARTET — erst dann
 * ist die Abweichung eine Aussage.
 */
const PAARE: [string, string][] = [
  // Wer viele Dachanlagen hat, sollte auch viele Speicher haben.
  ["dach-privat-pk", "batterie-privat-pk"],
  // Balkonkraftwerke und Dachanlagen sind beide privat — laufen sie
  // auseinander, hat das mit Wohnform zu tun.
  ["dach-privat-pk", "balkon-pk"],
  ["balkon-pk", "batterie-privat-pk"],
];

/** Bestand gegen Tempo: wer hinten liegt und trotzdem am schnellsten baut. */
const AUFHOL_PAARE: [string, string][] = [
  ["dach-privat-pk", "tempo-1j"],
  ["dach-privat-pk", "tempo-3j"],
];

export async function GET(req: NextRequest) {
  if (!(await istAdminOderCron(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [gemeinden, kreisNamen] = await Promise.all([loadAwardStats(), loadKreisNames()]);

    // DIESELBEN GRÖSSENKLASSEN WIE DIE RANGLISTEN. Der erste Anlauf teilte die
    // Gemeinden selbst in Drittel — eine zweite Einteilung neben der, auf der
    // jede Ranglisten-Seite steht. Ein Fund hätte dann eine Gruppe genannt, die
    // es auf der verlinkten Seite gar nicht gibt; dieselbe Fehlerklasse wie ein
    // Brief, der einen Rang behauptet, den die Seite widerlegt.
    //
    // Die Klassen bringen ihre DATIVFORM mit, weil sie im Satz nach „unter"
    // stehen — „unter kleine Gemeinden" stand nach dem ersten breiten Lauf in
    // jedem Ausreißer-Satz.
    const klasse = (g: { population: number }) => klasseVon(g.population)?.label ?? null;
    const klasseDativ = (label: string) =>
      GROESSENKLASSEN.find((k) => k.label === label)?.labelDativ ?? label;

    const landName = (g: { regionId: string }) => {
      const s = bundeslandSchluessel(g as never);
      return s ? (LAND_NAME[s] ?? null) : null;
    };

    const funde: Fund[] = [];
    for (const auftrag of SUCHAUFTRAEGE) {
      const kat = AWARD_CATEGORIES.find((c) => c.key === auftrag.metrik);
      if (!kat) continue;

      if (auftrag.muster === "ausreisser") {
        const raum =
          auftrag.raum === "bundesland"
            ? landName
            : auftrag.raum === "groessenklasse"
              ? klasse
              : undefined;
        const raumText =
          auftrag.raum === "groessenklasse"
            ? (n: string) => `unter ${klasseDativ(n)}`
            : auftrag.raum === "bundesland"
              ? (n: string) => `in ${n}`
              : undefined;
        funde.push(...findeAusreisser(gemeinden, kat, auftrag.kategorie, { raum, raumText }));
      } else {
        const gruppiere =
          auftrag.gruppierung === "bundesland"
            ? landName
            : auftrag.gruppierung === "ost-west"
              ? ostWest
              : klasse;
        // Nur der Bundesland-Schnitt nennt echte Orte. „Dörfer" und „Osten"
        // sind Gruppen; sie in den Ortsfilter zu werfen böte Ortsnamen an, die
        // keine sind.
        funde.push(
          ...findeKontrast(gemeinden, kat, auftrag.kategorie, gruppiere, {
            sindLaender: auftrag.gruppierung === "bundesland",
          }),
        );
      }
    }

    // ZWEI GRÖSSEN STATT EINER — und das ist der Unterschied zu den Ranglisten.
    // Sie ordnen je Größe; dass dieselbe Gruppe in der einen vorn und in der
    // anderen hinten steht, sieht man erst, wenn man beide nebeneinanderlegt.
    // Genau dort steckt die Geschichte, die eine Rangliste nicht erzählen kann.
    const finde = (k: string) => AWARD_CATEGORIES.find((c) => c.key === k);
    for (const gruppierung of [
      { name: "bundesland" as const, fn: landName },
      { name: "groessenklasse" as const, fn: klasse },
      { name: "ost-west" as const, fn: ostWest },
    ]) {
      for (const [a, b] of PAARE) {
        const ka = finde(a);
        const kb = finde(b);
        if (ka && kb) funde.push(...findeUmkehrung(gemeinden, ka, kb, "g3", gruppierung.fn));
      }
      for (const [bestand, tempo] of AUFHOL_PAARE) {
        const kb = finde(bestand);
        const kt = finde(tempo);
        if (kb && kt) funde.push(...findeAufholer(gemeinden, kb, kt, "g2", gruppierung.fn));
      }
    }

    // G3.2 und G3.4 aus dem Katalog — Story-Muster mit Beispielsatz und
    // Schranken, nicht selbst erfundene Formen.
    for (const metrik of ["balkon-pk", "dach-privat-pk", "batterie-privat-pk", "speicherquote"]) {
      const kat = finde(metrik);
      if (!kat) continue;
      funde.push(
        ...findeTopliste(gemeinden, kat, "g3", klasse, "Größenklasse"),
        ...findeTopliste(gemeinden, kat, "g3", landName, "Bundesland"),
        ...findeDavid(gemeinden, kat, "g3"),
      );
    }

    // G14.1 — die Flächenfrage. Kreise über die ersten fünf Stellen des
    // Gemeindeschlüssels, Bundesland über die ersten zwei.
    funde.push(
      ...findeFlaechenmix(
        gemeinden,
        "g14",
        // DER NAME, NICHT DIE KENNNUMMER. „In 07135 stehen 80 Prozent…" stand
        // nach dem ersten Lauf da — eine Zahl, die niemand einem Ort zuordnet,
        // und ausgerechnet beim heikelsten Muster des Katalogs.
        (g) => (g.regionId?.length >= 5 ? (kreisNamen[g.regionId.slice(0, 5)] ?? null) : null),
        (g) => landName(g),
      ),
    );

    // G16.1 — die Kohorte. Ohne Ortsbezug, deshalb das einzige Muster ohne
    // Kränkungsrisiko. Das laufende Jahr bleibt draußen: Es ist noch nicht
    // vollständig gemeldet und sähe wie ein Einbruch aus.
    const [solarReihe, speicherReihe] = await Promise.all([
      nationalSeries("solar"),
      nationalSeries("speicher"),
    ]);
    const letztesVollesJahr = new Date().getFullYear() - 1;
    funde.push(
      ...findeKohorte(
        solarReihe.map((r) => ({ year: r.year, segment: r.segment, count: r.count, kwp: r.kwp })),
        speicherReihe.map((r) => ({ year: r.year, segment: r.segment, count: r.count, kwp: r.kwp })),
        "g16",
        letztesVollesJahr,
      ),
    );

    // G19.1 — Heizungsförderung je Landkreis. Die Einwohnerzahl kommt aus
    // denselben Gemeindedaten wie die Ranglisten, über die ersten fünf Stellen
    // des Gemeindeschlüssels auf den Kreis summiert. Sie ein zweites Mal
    // einzulesen hieße, zwei Einwohnerzahlen im Haus zu haben.
    // Namen, die nur einen Ort meinen: „Lichtenau" gibt es viermal in
    // Deutschland, und der Zusatz kommt nur, wo er gebraucht wird.
    const ortsname = ortsnamen(gemeinden, (id) => kreisNamen[id] ?? null);

    const ewJeKreis = new Map<string, number>();
    for (const g of gemeinden) {
      if (!g.regionId || g.regionId.length < 5) continue;
      const kreis = g.regionId.slice(0, 5);
      ewJeKreis.set(kreis, (ewJeKreis.get(kreis) ?? 0) + g.population);
    }
    if (supabase) {
      const { data: kfw } = await supabase
        .from("kfw_report_kreis")
        .select("region_id, jahr, programm, anzahl, volumen_mio");
      if (kfw?.length) {
        funde.push(
          ...findeHeizungsfoerderung(
            kfw,
            (id) => ewJeKreis.get(id) ?? null,
            (id) => kreisNamen[id] ?? null,
            "g19",
          ),
        );
      }
    }

    const programme = await getFundingPrograms();

    // G10.1 — die Anomalie. Braucht die Monatsauflösung; ohne sie fällt der
    // Abschnitt aus, statt eine gröbere Aussage zu erfinden.
    if (supabase) {
      const monatsZeilen: { regionId: string; monat: string; count: number }[] = [];
      for (let von = 0; ; von += 1000) {
        const { data } = await supabase
          .from("mastr_monat_gem")
          .select("region_id, segment, monat, count")
          .eq("segment", "steckersolar")
          // SEITENWEISE OHNE SORTIERUNG LIEST NICHT DENSELBEN BESTAND.
          // Postgres darf die Zeilenfolge zwischen zwei Abfragen ändern; über
          // Seitengrenzen hinweg kommen dann Zeilen doppelt und andere gar
          // nicht. Gemessen: Derselbe Ort stand in drei Läufen mit 35, 64 und
          // 39 Anlagen da — bei unveränderten Daten. Kein Fehler, keine
          // Warnung, jede Zahl für sich plausibel.
          .order("region_id")
          .order("monat")
          .range(von, von + 999);
        if (!data?.length) break;
        for (const z of data) {
          monatsZeilen.push({
            regionId: z.region_id,
            monat: String(z.monat).slice(0, 7),
            count: z.count,
          });
        }
        if (data.length < 1000) break;
      }
      if (monatsZeilen.length > 0) {
        // Der Förderkatalog als Gegenprobe: Wo ein Balkon-Programm lief, ist
        // die Frage „was war da los?" schon beantwortet. Verglichen wird über
        // das FÖRDERGEBIET, nicht über gleiche Schlüssel — ein Programm trägt
        // je nach Ebene zwei, fünf oder acht Stellen.
        const balkonProgramme = programme.filter(
          (p) => (p.foerdert ?? ["pv"]).includes("balkon") && p.agsCode,
        );
        const foerderungBekannt = (regionId: string, von: string, bis: string) =>
          balkonProgramme.some((p) => {
            if (!regionId.startsWith(p.agsCode!)) return false;
            // Ohne Laufzeit im Katalog gilt das Programm als möglicherweise
            // laufend — die vorsichtige Richtung: lieber eine Frage weniger
            // stellen als eine, deren Antwort wir hätten kennen können.
            if (p.beginntIso && p.beginntIso.slice(0, 7) > bis) return false;
            if (p.endetIso && p.endetIso.slice(0, 7) < von) return false;
            return true;
          });

        funde.push(
          ...findeAnomalie(
            monatsZeilen,
            ortsname,
            "g10",
            "Balkonkraftwerke",
            { foerderungBekannt },
          ),
        );
      }
    }

    // G15.1 — die Wohnform. Der Wohnungsbestand ist der Nenner, den das
    // Anlagenregister nicht hat: Es kennt Anlagen, nie Gebäude.
    if (supabase) {
      const wohnraum = new Map<string, { gesamt: number; mehrfamilie: number }>();
      for (let von = 0; ; von += 1000) {
        const { data } = await supabase
          .from("zensus_wohnungen")
          .select("region_id, wohnungen, w_3_6, w_7_12, w_13plus")
          // Dieselbe Falle wie oben: ohne Sortierung ist eine Seite kein
          // Ausschnitt, sondern eine Stichprobe.
          .order("region_id")
          .range(von, von + 999);
        if (!data?.length) break;
        for (const z of data) {
          wohnraum.set(z.region_id, {
            gesamt: z.wohnungen,
            // „Mehrfamilienhaus" heißt hier: drei und mehr Wohnungen. Das
            // Zweifamilienhaus bleibt draußen — es ist in aller Regel ein Haus
            // mit Einliegerwohnung und hat dasselbe Dach wie das nebenan.
            mehrfamilie: z.w_3_6 + z.w_7_12 + z.w_13plus,
          });
        }
        if (data.length < 1000) break;
      }
      if (wohnraum.size > 0) {
        funde.push(...findeWohnform(gemeinden, (id) => wohnraum.get(id) ?? null, "g15"));
      }
    }

    // Diese Woche gegen dieselbe Woche der Vorjahre. Der Strommix liegt
    // wochenweise seit 2015 vor — elf Vergleichsjahre je Kalenderwoche.
    if (supabase) {
      const { data: wochen } = await supabase
        .from("energy_weekly")
        .select("year, week, solar, wind_onshore, wind_offshore, load")
        .eq("country", "de")
        .order("year")
        .order("week");
      if (wochen?.length) {
        funde.push(
          ...findeSaison(
            wochen.map((w) => ({
              jahr: w.year,
              woche: w.week,
              wert: Number(w.solar ?? 0),
              last: Number(w.load ?? 0),
            })),
            "g6",
            "Solarstrom",
            { heute: kalenderwoche(new Date()) },
          ),
          ...findeSaison(
            wochen.map((w) => ({
              jahr: w.year,
              woche: w.week,
              // Wind an Land und auf See zusammen: Getrennt wäre es zweimal
              // dieselbe Geschichte mit halber Zahl.
              wert: Number(w.wind_onshore ?? 0) + Number(w.wind_offshore ?? 0),
              last: Number(w.load ?? 0),
            })),
            "g6",
            "Windstrom",
            { heute: kalenderwoche(new Date()) },
          ),
        );
      }
    }

    // G12.1 — die Lücken im eigenen Förderkatalog. Das einzige Muster ohne
    // Rangliste dahinter: Hier gewinnt niemand, und niemand wird genannt.
    funde.push(...findeFoerderluecken(programme, "g12"));

    const sortiert = funde.sort((a, b) => b.staerke - a.staerke);

    // In den Vorrat schreiben, damit ein Mensch stöbern kann. Ohne
    // `?schreiben=0` ist das der Normalfall: Ein Lauf, dessen Ergebnis nur in
    // einer Antwort steht und danach verschwindet, ist von einem, der gar
    // nicht lief, nicht zu unterscheiden.
    let geschrieben = 0;
    if (req.nextUrl.searchParams.get("schreiben") !== "0") {
      geschrieben = await schreibeFunde(sortiert, new Date().toISOString());
    }

    return NextResponse.json({
      stand: gemeinden.length,
      geschrieben,
      funde: sortiert,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
