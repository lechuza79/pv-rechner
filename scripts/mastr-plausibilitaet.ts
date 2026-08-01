/**
 * Prueft nach jedem MaStR-Lauf, ob die aggregierten Daten plausibel sind.
 *
 *   npx tsx scripts/mastr-plausibilitaet.ts
 *
 * WARUM ES DAS GIBT (29.07.2026): Die Einordnung "privat" kam aus Feldern, die
 * der Anlagenbetreiber selbst setzt — `Nutzungsbereich = Haushalt` beim Dach,
 * die Betreiberart beim Speicher — und wurde ungeprueft uebernommen. Folge:
 * Dolgesheim fuehrte die Pro-Kopf-Rangliste mit 88 "privaten" Daechern zu je
 * 107 kWp an (Gewerbehallen), und 66 Gemeinden hatten "private" Batterien mit
 * bis zu 243 kWh. Gemerkt hat es monatelang niemand, weil niemand hingesehen
 * hat, ob die Spitze der Liste plausibel ist.
 *
 * Der Klassifizierer prueft das jetzt an der Quelle. Dieser Waechter prueft,
 * dass es auch so bleibt: Er laeuft in der GitHub-Action NACH dem Upload und
 * laesst den Lauf rot werden, wenn wieder Unplausibles in der Datenbank steht.
 *
 * Jede Regel nennt eine physikalische oder rechtliche Grenze — keine
 * Ermessens-Schwellen. Wer eine Grenze aufweicht, damit ein Befund verschwindet,
 * hat den Zweck verfehlt (dieselbe Linie wie bei den Geraete-Effizienzen).
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const num = (x: unknown): number => Number(x) || 0;

type Zeile = Record<string, unknown>;

type Regel = {
  titel: string;
  /** Woher die Grenze kommt — Gesetz, Physik oder gemessene Verteilung. */
  herkunft: string;
  /** Wert je Gemeinde; null = fuer diese Gemeinde nicht pruefbar. */
  wert: (r: Zeile) => number | null;
  grenze: number;
  einheit: string;
  /**
   * Aufschlag NUR fuer Rundung, nicht fuer Ermessen.
   *
   * Die Aggregation speichert kWp mit zwei Nachkommastellen je Zeile, der
   * Mittelwert laeuft ueber mehrere Zeilen. Kirf kam damit auf 2,0020 kWp je
   * Balkonanlage — zwei Watt ueber dem gesetzlichen Maximum, ohne dass dort
   * irgendwer etwas Ueberdimensioniertes angemeldet haette. Gemessen liegt
   * KEINE Gemeinde ueber 2,05; der Aufschlag trennt Rundung von echtem Verstoss,
   * ohne die Grenze selbst zu verschieben.
   */
  toleranz?: number;
};

const REGELN: Regel[] = [
  {
    titel: "Mittlere private Dachanlage",
    herkunft:
      "§ 3 Nr. 72 EStG: bis 30 kW (peak) je Wohn- oder Gewerbeeinheit gilt eine Dachanlage steuerlich als private Nebensache. Dieselbe Messgroesse (Bruttoleistung) wie im Register.",
    wert: (r) => (num(r.privat_dach_count) >= 3 ? num(r.privat_dach_kwp) / num(r.privat_dach_count) : null),
    grenze: 30,
    einheit: "kWp",
  },
  {
    titel: "Mittlere private Batterie",
    herkunft:
      "Gemessen ueber alle Gemeinden: Median 8,9 kWh, 99. Perzentil 20,4. Keine gesetzliche Grenze — eine begruendete Setzung, kein Gesetz.",
    wert: (r) =>
      num(r.batterie_privat_count) >= 3 ? num(r.batterie_privat_kwh) / num(r.batterie_privat_count) : null,
    grenze: 30,
    einheit: "kWh",
  },
  {
    titel: "Mittlere Balkonanlage",
    herkunft:
      "Steckersolar ist am Wechselrichter auf 800 W begrenzt; mehr als 2 kWp Modulleistung je Anlage ist auch mit Ueberbelegung nicht darstellbar.",
    wert: (r) => (num(r.balkon_count) >= 3 ? num(r.balkon_kwp) / num(r.balkon_count) : null),
    grenze: 2,
    toleranz: 0.05,
    einheit: "kWp",
  },
  {
    titel: "Balkonanlagen je Einwohner",
    herkunft: "Mehr als eine Anlage je zwei Einwohner waere jeder zweite Mensch — das ist ein Meldefehler.",
    wert: (r) => (num(r.population) > 0 ? num(r.balkon_count) / num(r.population) : null),
    grenze: 0.5,
    einheit: "Stueck",
  },
  {
    titel: "Private Batterien je Einwohner",
    herkunft: "Eine Batterie je zwei Einwohner waere praktisch jeder Haushalt.",
    wert: (r) => (num(r.population) > 0 ? num(r.batterie_privat_count) / num(r.population) : null),
    grenze: 0.5,
    einheit: "Stueck",
  },
];

/** Untergrenzen, unter denen ein Lauf abgebrochen sein muss statt "leer". */
const MINDESTBESTAND = {
  gemeinden: 10_000,
  solar_kwp: 100_000_000,
  privat_dach_kwp: 20_000_000,
};

async function alleZeilen(db: SupabaseClient): Promise<Zeile[]> {
  const out: Zeile[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("mastr_gemeinde_award")
      .select("*")
      .order("region_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...(data as Zeile[]));
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const zeilen = await alleZeilen(db);
  const namen = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await db
      .from("mastr_regions")
      .select("region_id, name")
      .eq("level", "gemeinde")
      .order("region_id")
      .range(from, from + 999);
    if (!data?.length) break;
    for (const r of data as { region_id: string; name: string }[]) namen.set(r.region_id, r.name);
    if (data.length < 1000) break;
  }

  const befunde: string[] = [];
  console.log(`Geprueft: ${zeilen.length.toLocaleString("de-DE")} Gemeinden\n`);

  // 1. Ist ueberhaupt etwas da? Ein halb abgebrochener Lauf faellt sonst nicht auf.
  const summe = (feld: string) => zeilen.reduce((a, r) => a + num(r[feld]), 0);
  const bestand = {
    gemeinden: zeilen.length,
    solar_kwp: summe("solar_kwp"),
    privat_dach_kwp: summe("privat_dach_kwp"),
  };
  for (const [feld, min] of Object.entries(MINDESTBESTAND)) {
    const ist = bestand[feld as keyof typeof bestand];
    const ok = ist >= min;
    console.log(
      `  ${ok ? "ok  " : "FEHL"} Mindestbestand ${feld.padEnd(16)} ${Math.round(ist).toLocaleString("de-DE").padStart(14)} (erwartet ≥ ${min.toLocaleString("de-DE")})`,
    );
    if (!ok) befunde.push(`Mindestbestand ${feld}: ${Math.round(ist)} statt mindestens ${min} — Lauf unvollstaendig?`);
  }

  // 2. Sieht jede Anlage nach dem aus, was ihr Etikett behauptet?
  console.log("");
  for (const regel of REGELN) {
    const pruefbar = zeilen.filter((r) => regel.wert(r) !== null);
    const schwelle = regel.grenze + (regel.toleranz ?? 0);
    const verletzt = pruefbar
      .map((r) => ({ r, w: regel.wert(r) as number }))
      .filter((x) => x.w > schwelle)
      .sort((a, b) => b.w - a.w);
    const ok = verletzt.length === 0;
    console.log(
      `  ${ok ? "ok  " : "FEHL"} ${regel.titel.padEnd(32)} ${verletzt.length} von ${pruefbar.length} ueber ${regel.grenze} ${regel.einheit}` +
        (regel.toleranz ? ` (+${regel.toleranz} Rundung)` : ""),
    );
    if (!ok) {
      for (const x of verletzt.slice(0, 5)) {
        const id = String(x.r.region_id);
        console.log(`         ${x.w.toFixed(1).padStart(9)} ${regel.einheit}  ${namen.get(id) ?? id}`);
      }
      befunde.push(
        `${regel.titel}: ${verletzt.length} Gemeinden ueber ${regel.grenze} ${regel.einheit}. ` +
          `Grenze: ${regel.herkunft}`,
      );
    }
  }

  // 3. Steht in der Award-Tabelle ueberhaupt der aktuelle Lauf?
  //
  // WARUM: Am 29.07.2026 schrieb der Lauf frische Segmente in die Rohtabelle,
  // baute die Award-Tabelle aber nicht neu — die Ranglisten zeigten den Stand des
  // vorletzten Laufs. Nichts daran war unplausibel, nur veraltet. Die Regeln
  // oben haetten das nie gefunden; sie pruefen Werte, nicht Aktualitaet.
  // Gegenprobe an der Quelle, an einer Stichprobe statt an 591.000 Zeilen.
  console.log("");
  const stichprobe = zeilen.filter((_, i) => i % Math.ceil(zeilen.length / 40) === 0).slice(0, 40);
  const ids = stichprobe.map((r) => String(r.region_id));
  // GEBLAETTERT, auch wenn 40 Gemeinden heute weit unter der Grenze liegen.
  //
  // Ein select() liefert stumm hoechstens 1.000 Zeilen — kein Fehler, keine
  // Warnung, nur ein zu kleines Ergebnis. Im Projekt hat diese Falle schon
  // zweimal zugeschlagen (der Bestandsbericht meldete 1.000 statt 11.407
  // Gemeinden, das Cockpit zeigte 13 statt 779 Kontakte). Hier waere sie noch
  // teurer: Fehlende Rohzeilen sehen aus wie eine Abweichung, die Gegenprobe
  // meldete also eine veraltete Award-Tabelle, die in Wahrheit stimmt. Je
  // Gemeinde koennen mehrere Rohzeilen stehen, die Grenze ist also naeher als
  // die 40 Schluessel vermuten lassen.
  const rohDaten: { region_id: string; kwp: unknown }[] = [];
  let rohFehler: { message: string } | null = null;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("mastr_aggregates_gem")
      .select("region_id, kwp")
      .eq("segment", "privat_dach")
      .in("region_id", ids)
      .order("region_id")
      .range(from, from + 999);
    if (error) {
      rohFehler = error;
      break;
    }
    if (!data?.length) break;
    rohDaten.push(...(data as { region_id: string; kwp: unknown }[]));
    if (data.length < 1000) break;
  }
  if (rohFehler) {
    befunde.push(`Gegenprobe an der Rohtabelle nicht moeglich: ${rohFehler.message}`);
    console.log(`  FEHL Gegenprobe Rohtabelle          ${rohFehler.message}`);
  } else {
    const rohSumme = new Map<string, number>();
    for (const r of rohDaten) {
      rohSumme.set(r.region_id, (rohSumme.get(r.region_id) ?? 0) + num(r.kwp));
    }
    // Beide Seiten summieren dieselben gerundeten Zeilen — mehr als ein Euro
    // Abstand je Gemeinde ist keine Rundung mehr, sondern ein anderer Stand.
    const abweichend = stichprobe.filter((r) => {
      const roh = rohSumme.get(String(r.region_id)) ?? 0;
      return Math.abs(roh - num(r.privat_dach_kwp)) > 1;
    });
    const ok = abweichend.length === 0;
    console.log(
      `  ${ok ? "ok  " : "FEHL"} Award-Tabelle am Datenstand     ${abweichend.length} von ${stichprobe.length} Stichproben weichen ab`,
    );
    if (!ok) {
      for (const r of abweichend.slice(0, 5)) {
        const id = String(r.region_id);
        console.log(
          `         ${namen.get(id) ?? id}: Rohdaten ${(rohSumme.get(id) ?? 0).toFixed(1)} kWp, Award-Tabelle ${num(r.privat_dach_kwp).toFixed(1)} kWp`,
        );
      }
      befunde.push(
        `Award-Tabelle passt nicht zur Rohtabelle (${abweichend.length} von ${stichprobe.length} Stichproben). ` +
          `Wahrscheinlich fehlt mastr_refresh_gemeinde_award() nach dem Lauf — die Ranglisten zeigen dann einen alten Stand.`,
      );
    }
  }

  if (befunde.length > 0) {
    console.log(`\n${befunde.length} Befund(e):\n`);
    for (const b of befunde) console.log(`  - ${b}\n`);
    console.log(
      "Die Grenzen NICHT aufweichen, damit der Befund verschwindet — sie stehen auf Gesetz,\n" +
        "Physik oder gemessener Verteilung. Stattdessen den Klassifizierer in\n" +
        "scripts/mastr-bnetza-refresh.ts pruefen (classifySolarSegment / classifyStorage).",
    );
    process.exit(1);
  }
  console.log("\nAlles plausibel.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
