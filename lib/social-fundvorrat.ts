import "server-only";
import { supabase } from "./supabase-server";
import { type Fund } from "./social-funde";

/**
 * Der Vorrat an Geschichten: was der Suchlauf gefunden hat, und was ein Mensch
 * damit vorhat.
 *
 * ZWEI BESITZER, EINE ZEILE. Satz, Zahlen und Grundlage gehören dem Lauf und
 * werden bei jedem Durchgang überschrieben — sie sind gerechnet und sollen dem
 * Datenstand folgen. Stand und Notiz gehören dem Menschen und werden vom Lauf
 * nie angefasst. Dieselbe Trennung wie im Förderkatalog zwischen Programmdaten
 * und Beleg-Spalten, und aus demselben Grund: Ein Lauf, der die Vormerkung
 * eines Menschen überschreibt, macht die Ansicht wertlos.
 */

// Die Stände selbst stehen in einem eigenen Modul OHNE Server-Bindung: Diese
// Datei liest die Datenbank, die Liste im Browser braucht aber die
// Beschriftungen. Sie hier zu führen brach den Aufbau mit „importiert etwas,
// das nur auf dem Server läuft" — dieselbe Trennung wie beim
// Aktualisierungsstand der Rechner.
export {
  FUND_STAND_LABEL,
  HAND_STAENDE,
  standMitAbleitung,
  type FundStand,
} from "./social-fundstand";
import type { FundStand } from "./social-fundstand";

export type VorratsFund = Fund & {
  kennung: string;
  stand: FundStand;
  notiz: string | null;
  zuletztGesehen: string;
  erstmalsGesehen: string;
};

type Zeile = {
  kennung: string;
  orte: string[] | null;
  laender: string[] | null;
  evergreen: boolean | null;
  muster: string;
  kategorie: string;
  satz: string;
  staerke: number;
  werte: Fund["werte"];
  grundlage: string;
  stand: string;
  notiz: string | null;
  zuletzt_gesehen: string;
  erstmals_gesehen: string;
};

function ausZeile(z: Zeile): VorratsFund {
  return {
    kennung: z.kennung,
    orte: z.orte ?? [],
    laender: z.laender ?? [],
    evergreen: z.evergreen ?? false,
    muster: z.muster as Fund["muster"],
    kategorie: z.kategorie,
    satz: z.satz,
    staerke: Number(z.staerke),
    werte: z.werte ?? [],
    grundlage: z.grundlage,
    stand: (z.stand as FundStand) ?? "offen",
    notiz: z.notiz,
    zuletztGesehen: z.zuletzt_gesehen,
    erstmalsGesehen: z.erstmals_gesehen,
  };
}

/**
 * Was der Lauf gefunden hat, in den Vorrat schreiben.
 *
 * Zwei Kennungen können im selben Lauf zusammenfallen — dieselbe Gemeinde in
 * zwei Metriken ergibt denselben lesbaren Namen. Die zweite überschriebe die
 * erste stumm, und das Ergebnis wäre ein Satz mit den Zahlen eines anderen
 * Fundes. Deshalb wird vorher entdoppelt, und zwar zugunsten des STÄRKEREN.
 */
export async function schreibeFunde(funde: Fund[], jetztIso: string): Promise<number> {
  if (!supabase || funde.length === 0) return 0;

  const beste = new Map<string, Fund>();
  for (const f of funde) {
    const bisher = beste.get(f.kennung);
    if (!bisher || f.staerke > bisher.staerke) beste.set(f.kennung, f);
  }

  const zeilen = [...beste.values()].map((f) => ({
    kennung: f.kennung,
    muster: f.muster,
    kategorie: f.kategorie,
    satz: f.satz,
    staerke: Number.isFinite(f.staerke) ? Number(f.staerke.toFixed(4)) : 0,
    werte: f.werte,
    grundlage: f.grundlage,
    orte: f.orte ?? [],
    laender: f.laender ?? [],
    evergreen: f.evergreen ?? false,
    zuletzt_gesehen: jetztIso,
  }));

  let geschrieben = 0;
  for (let i = 0; i < zeilen.length; i += 500) {
    const teil = zeilen.slice(i, i + 500);
    // Ohne `stand` und `notiz` in der Nutzlast: Was nicht mitgeschickt wird,
    // bleibt beim Aktualisieren stehen. Sie hier mitzugeben — und sei es mit
    // dem Vorgabewert — setzte bei jedem Lauf jede Vormerkung zurück.
    const { error } = await supabase.from("social_funde").upsert(teil, { onConflict: "kennung" });
    if (error) throw new Error(`Vorrat schreiben fehlgeschlagen: ${error.message}`);
    geschrieben += teil.length;
  }
  return geschrieben;
}

/**
 * Zum Stöbern: der Vorrat, je Muster die stärksten zuerst.
 *
 * NICHT GLOBAL NACH STÄRKE SORTIEREN — die Zahl bedeutet je Muster etwas
 * anderes. Beim Flächenmix ist sie ein Abstand in Prozentpunkten (bis 80), bei
 * allen übrigen ein Faktor (selten über 20). Global sortiert stünden deshalb
 * immer dieselben elf Flächenmix-Funde oben, und zwar nicht weil sie die besten
 * Geschichten sind, sondern weil ihre Skala eine größere Zahl hergibt.
 *
 * Eine gemeinsame Normierung wäre die Alternative und wäre schlechter: Sie
 * erfände eine Vergleichbarkeit zwischen Äpfeln und Birnen, die es nicht gibt.
 * Gruppiert nach Muster stimmt die Reihenfolge innerhalb dessen, was wirklich
 * vergleichbar ist.
 */
export async function leseFunde(opts: {
  stand?: FundStand;
  muster?: string;
  ort?: string;
  land?: string;
  /** „nur Evergreens" oder „nur Zeitgebundenes" — ohne Angabe beides. */
  evergreen?: boolean;
  suche?: string;
  /** Wie viele Zeilen die Datenbank höchstens liefert. */
  grenze?: number;
  /** Wie viele Funde je Muster in der Liste stehen. */
  jeMuster?: number;
}): Promise<VorratsFund[]> {
  if (!supabase) return [];
  let q = supabase
    .from("social_funde")
    .select(
      "kennung, muster, kategorie, satz, staerke, werte, grundlage, orte, laender, evergreen, stand, notiz, zuletzt_gesehen, erstmals_gesehen",
    )
    .order("staerke", { ascending: false })
    .limit(opts.grenze ?? 1000);
  if (opts.stand) q = q.eq("stand", opts.stand);
  if (opts.muster) q = q.eq("muster", opts.muster);
  if (opts.ort) q = q.contains("orte", [opts.ort]);
  if (opts.land) q = q.contains("laender", [opts.land]);
  if (opts.evergreen !== undefined) q = q.eq("evergreen", opts.evergreen);
  if (opts.suche?.trim()) {
    // Über Satz UND Grundlage: In der Grundlage steht, was die Zahlen nicht
    // hergeben — wer danach sucht, sucht meist genau danach.
    const wort = opts.suche.trim().replace(/[%,()]/g, " ");
    q = q.or(`satz.ilike.%${wort}%,grundlage.ilike.%${wort}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Vorrat lesen fehlgeschlagen: ${error.message}`);
  const funde = (data ?? []).map((z) => ausZeile(z as Zeile));

  // JE MUSTER GEKAPPT, NICHT ÜBER ALLE. Die Grenze schnitt vorher global nach
  // Stärke — und weil die Zahl je Muster etwas anderes bedeutet, fielen ganze
  // Muster heraus: Gemessen an 590 Funden fehlten in den ersten 300 die
  // Umkehrungen (14), die Heizungsförderung (5) und die Förderlücke komplett,
  // vom Kontrast kamen 27 von 256 an. Die Filterleiste bot sie mit Zahlen an,
  // in der Liste standen sie nie.
  //
  // Je Muster dieselbe Zahl zu nehmen ist die einzige Kappung, die zur Ansicht
  // passt: Sie gruppiert nach Muster, also muss auch die Grenze dort greifen.
  const proMuster = new Map<string, VorratsFund[]>();
  for (const f of funde) {
    const bisher = proMuster.get(f.muster);
    if (bisher) bisher.push(f);
    else proMuster.set(f.muster, [f]);
  }
  const jeMuster = opts.jeMuster ?? 40;
  return [...proMuster.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, liste]) => liste.slice(0, jeMuster));
}

/** Einen einzelnen Fund holen — der Weg für einen Zuruf mit Kennung. */
export async function leseFund(kennung: string): Promise<VorratsFund | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("social_funde")
    .select(
      "kennung, muster, kategorie, satz, staerke, werte, grundlage, orte, laender, evergreen, stand, notiz, zuletzt_gesehen, erstmals_gesehen",
    )
    .eq("kennung", kennung)
    .maybeSingle();
  if (error) throw new Error(`Fund lesen fehlgeschlagen: ${error.message}`);
  return data ? ausZeile(data as Zeile) : null;
}

/** Wie viele je Muster und Stand — für die Übersicht. */
export async function zaehleFunde(): Promise<{ muster: string; stand: string; zahl: number }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("social_funde").select("muster, stand");
  if (error) throw new Error(`Vorrat zählen fehlgeschlagen: ${error.message}`);
  const zaehler = new Map<string, number>();
  for (const z of data ?? []) {
    const k = `${z.muster}|${z.stand}`;
    zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
  }
  return [...zaehler.entries()].map(([k, zahl]) => {
    const [muster, stand] = k.split("|");
    return { muster, stand, zahl };
  });
}

/** Was ein Mensch entscheidet: Stand und Notiz. */
export async function setzeStand(
  kennung: string,
  stand: FundStand,
  notiz?: string,
): Promise<void> {
  if (!supabase) throw new Error("Datenbank nicht verfügbar");
  const feld: { stand: FundStand; notiz?: string } = { stand };
  if (notiz !== undefined) feld.notiz = notiz;
  const { error } = await supabase.from("social_funde").update(feld).eq("kennung", kennung);
  if (error) throw new Error(`Stand setzen fehlgeschlagen: ${error.message}`);
}

/**
 * Alle Orte, die im Vorrat vorkommen — für den Filter.
 *
 * Aus dem Feld, nicht aus den Sätzen: Ein Filter, der „Dörfer" als Ortsnamen
 * anbietet, führt in die Irre.
 */
export async function orteImVorrat(): Promise<{
  kommunen: { name: string; zahl: number }[];
  laender: { name: string; zahl: number }[];
}> {
  if (!supabase) return { kommunen: [], laender: [] };
  const { data, error } = await supabase.from("social_funde").select("orte, laender");
  if (error) throw new Error(`Orte lesen fehlgeschlagen: ${error.message}`);

  const zaehle = (feld: "orte" | "laender") => {
    const zaehler = new Map<string, number>();
    for (const z of data ?? []) {
      for (const o of (z[feld] as string[] | null) ?? []) {
        if (o) zaehler.set(o, (zaehler.get(o) ?? 0) + 1);
      }
    }
    return [...zaehler.entries()]
      .map(([name, zahl]) => ({ name, zahl }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  };
  return { kommunen: zaehle("orte"), laender: zaehle("laender") };
}


/**
 * Die Funde, die für EINE Ortsseite in Frage kommen — Ort, Landkreis, Land.
 *
 * WARUM NICHT NUR DER ORT SELBST: Die Muster suchen Auffälliges, und ein
 * durchschnittlicher Ort ist per Definition keins. Gemessen am 05.09.2026:
 * 313 Funde nennen einen Ort, verteilt auf 197 Gemeinden — bei 11.000
 * Ortsseiten stünde damit auf 98 % von ihnen nie einer. Ein Fund über den
 * eigenen Landkreis oder über den Nachbarort im selben Kreis ist auf dieser
 * Seite aber genauso eine Nachricht; nur die NÄHE unterscheidet sie.
 *
 * Die Reihenfolge ist die Nähe: der eigene Ort zuerst, dann der Landkreis,
 * dann das Land. Innerhalb einer Stufe bleibt die Stärke des Suchlaufs.
 *
 * `stand` bleibt Sache des Aufrufers: Ein Fund im Zustand „offen" hat noch
 * niemand angesehen und gehört nicht auf eine öffentliche Seite.
 */
export async function fundeFuerOrt(opts: {
  ort: string;
  /** Die übrigen Gemeinden des Landkreises — die Seite lädt sie ohnehin. */
  kreisOrte?: string[];
  land?: string | null;
  stand?: FundStand;
  grenze?: number;
}): Promise<VorratsFund[]> {
  const alle = await leseFunde({ stand: opts.stand, grenze: 1000 });
  const kreis = new Set((opts.kreisOrte ?? []).filter((n) => n !== opts.ort));
  const naehe = (f: VorratsFund): number => {
    // Beide Listen sind am Typ optional: Ein bundesweiter Fund nennt bewusst
    // niemanden. Leer und fehlend sind hier dasselbe.
    const orte = f.orte ?? [];
    const laender = f.laender ?? [];
    if (orte.includes(opts.ort)) return 0;
    if (orte.some((o) => kreis.has(o))) return 1;
    if (opts.land && laender.includes(opts.land) && orte.length === 0) return 2;
    return 99;
  };
  return alle
    .map((f) => ({ f, n: naehe(f) }))
    .filter((x) => x.n < 99)
    .sort((a, b) => a.n - b.n || b.f.staerke - a.f.staerke)
    .slice(0, opts.grenze ?? 6)
    .map((x) => x.f);
}
