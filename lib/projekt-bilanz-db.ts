import "server-only";

import { supabase } from "./supabase-server";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";
import { bilanzAus, type Bilanz } from "./projekt-bilanz";
import {
  hatZaehlstand,
  type BestandMitZaehlstand,
  type Statistiktag,
} from "./projekt-statistik";
import type { Kostenmonat, Listenwerttag } from "./projekt-kosten";

// ─── Die Übersicht aus der Ablage lesen ──────────────────────────────────────
//
// Der Erfassungslauf auf der Kommandozeile liest die Kosten aus den
// Buchungsunterlagen; die interne Ansicht kommt an die nicht heran und liest
// dieselben Zahlen aus der Ablage. GERECHNET WIRD IN BEIDEN FÄLLEN DIESELBE
// FUNKTION (`bilanzAus`) — hier steht nur der Weg zu den Rohzeilen.
//
// Alles liegt hinter dem Dienstschlüssel (Zeilenschutz an, keine Regel): Die
// Reihe enthält die Arbeitszeiten des Betreibers Tag für Tag und die Beträge
// seiner Abrechnungen. Was davon je öffentlich werden soll, ist eine
// Produktentscheidung und keine Frage der Leserechte.
//
// WEICHES ZEITBUDGET, weil ein Fehlschlag hier vollwertig abgefangen ist: ohne
// Zahlen zeigt die Ansicht, dass noch nichts erfasst wurde. Acht Sekunden zu
// warten brächte demselben Leser dasselbe Ergebnis, nur später.

/** Was die Ansicht zeigt — oder warum sie nichts zeigen kann. */
export type BilanzStand =
  | { art: "bereit"; bilanz: Bilanz; bestandVom: string }
  | { art: "leer"; grund: string };

type BestandZeile = {
  tag: string;
  dateien: number;
  codezeilen: number;
  dokuzeilen: number;
  testdateien: number;
  testfaelle: number;
  commits_gesamt: number;
  rechner: number;
  seiten: number;
  widgets: number;
  routen: number;
  komponenten: number;
  foerderprogramme: number;
};

export async function leseBilanz(): Promise<BilanzStand> {
  if (!supabase) return { art: "leer", grund: "Keine Verbindung zur Ablage." };

  const holen = async () => {
    const [statistik, kosten, listenwert, zeit, bestand] = await Promise.all([
      supabase!.from("projekt_statistik").select("*"),
      supabase!.from("projekt_kosten").select("*"),
      supabase!.from("projekt_listenwert").select("*"),
      supabase!.from("projekt_arbeitszeit").select("*"),
      supabase!.from("projekt_bestand").select("*").order("tag", { ascending: false }).limit(1),
    ]);
    return { statistik, kosten, listenwert, zeit, bestand };
  };

  const r = await withDbTimeout(holen(), "projekt-bilanz", DB_SOFT_READ_TIMEOUT_MS).catch(() => null);
  if (!r) return { art: "leer", grund: "Die Ablage antwortet nicht." };

  const bestandZeile = (r.bestand.data as BestandZeile[] | null)?.[0];
  if (!bestandZeile) {
    return { art: "leer", grund: "Es ist noch kein Bestand erfasst." };
  }

  const bestand: BestandMitZaehlstand = {
    tag: bestandZeile.tag,
    dateien: bestandZeile.dateien,
    codezeilen: bestandZeile.codezeilen,
    dokuzeilen: bestandZeile.dokuzeilen,
    testdateien: bestandZeile.testdateien,
    testfaelle: bestandZeile.testfaelle,
    commitsGesamt: bestandZeile.commits_gesamt,
    rechner: bestandZeile.rechner,
    seiten: bestandZeile.seiten,
    widgets: bestandZeile.widgets,
    routen: bestandZeile.routen,
    komponenten: bestandZeile.komponenten,
    foerderprogramme: bestandZeile.foerderprogramme,
  };

  // OHNE ZÄHLSTAND WIRD NICHT GESCHÄTZT. Eine Bestandszeile von vor dem
  // 27.09.2026 trägt dort Nullen; damit gerechnet käme eine Aufwandsschätzung
  // heraus, die nur die Posten ohne Mengenbezug enthält — eine plausibel
  // aussehende, deutlich zu kleine Zahl. Lieber keine als eine falsche.
  if (!hatZaehlstand(bestand)) {
    return {
      art: "leer",
      grund:
        `Die Bestandszeile vom ${bestandZeile.tag} hat noch keinen Zählstand. ` +
        "Einmal neu erfassen, dann steht die Übersicht.",
    };
  }

  const statistiktage: Statistiktag[] = ((r.statistik.data as Record<string, unknown>[]) ?? []).map(
    (z) => ({
      tag: String(z.tag),
      werkzeug: z.werkzeug as Statistiktag["werkzeug"],
      herkunft: z.herkunft as Statistiktag["herkunft"],
      tokensGelesen: Number(z.tokens_gelesen),
      tokensNeu: Number(z.tokens_neu),
      tokensEingabe: Number(z.tokens_eingabe),
      tokensAusgabe: Number(z.tokens_ausgabe),
      sitzungen: Number(z.sitzungen),
      nachrichtenGetippt: Number(z.nachrichten_getippt),
      nachrichtenLang: Number(z.nachrichten_lang),
      antworten: Number(z.antworten),
      werkzeugschritte: Number(z.werkzeugschritte),
      commits: Number(z.commits),
    }),
  );

  const kostenzeilen: Kostenmonat[] = ((r.kosten.data as Record<string, unknown>[]) ?? [])
    .map((z) => ({
      monat: String(z.monat),
      anbieter: String(z.anbieter),
      betragEur: Number(z.betrag_eur),
      buchungen: Number(z.buchungen),
    }))
    // SORTIERT, weil die Zeitraum-Angabe der Übersicht die erste und letzte
    // Zeile nimmt: unsortiert stünde dort das Ende vor dem Anfang.
    .sort((a, b) => a.monat.localeCompare(b.monat));

  const listenwerttage: Listenwerttag[] = ((r.listenwert.data as Record<string, unknown>[]) ?? [])
    .map((z) => ({
      tag: String(z.tag),
      modell: String(z.modell),
      tokensGelesen: Number(z.tokens_gelesen),
      tokensSchreibenKurz: Number(z.tokens_schreiben_kurz),
      tokensSchreibenLang: Number(z.tokens_schreiben_lang),
      tokensEingabe: Number(z.tokens_eingabe),
      tokensAusgabe: Number(z.tokens_ausgabe),
    }));

  const zeitZeilen = (r.zeit.data as Record<string, unknown>[]) ?? [];

  if (!statistiktage.length || !kostenzeilen.length) {
    return {
      art: "leer",
      grund: "Zeit oder Kosten sind noch nicht erfasst — beide Läufe einmal starten.",
    };
  }

  return {
    art: "bereit",
    bestandVom: bestandZeile.tag,
    bilanz: bilanzAus({
      statistiktage,
      kostenzeilen,
      listenwerttage,
      zeit: {
        minuten: zeitZeilen.reduce((s, z) => s + Number(z.minuten ?? 0), 0),
        minutenParallel: zeitZeilen.reduce((s, z) => s + Number(z.minuten_parallel ?? 0), 0),
        arbeitstage: zeitZeilen.length,
      },
      bestand,
      zaehlstand: {
        rechner: bestand.rechner,
        seiten: bestand.seiten,
        widgets: bestand.widgets,
        routen: bestand.routen,
        komponenten: bestand.komponenten,
        foerderprogramme: bestand.foerderprogramme,
      },
    }),
  };
}
