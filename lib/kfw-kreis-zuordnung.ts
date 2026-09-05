/**
 * Kreisnamen des KfW-Berichts auf unsere Gebietsschlüssel abbilden.
 *
 * Der Bericht nennt Kreise beim Namen, unser ganzer Ortsbestand hängt am
 * fünfstelligen Schlüssel (`mastr_regions`). Dazwischen liegt eine Übersetzung,
 * und die ist die Sorte Arbeit, bei der ein Fehler NICHT auffällt: „Karlsruhe"
 * gibt es zweimal — als Stadt und als Landkreis —, und wer sich vertut, hängt
 * die Zahlen des einen an den anderen. Nichts stürzt ab, nichts wird rot, es
 * steht nur die falsche Zahl unter dem richtigen Ortsnamen. Dieselbe Falle wie
 * beim Gemeindeschlüssel im Förderkatalog.
 *
 * Deshalb gilt hier: Der SCHLÜSSEL kommt immer aus dem Register, nie von Hand.
 * Von Hand kommt allein die Verbindung zwischen zwei Schreibweisen desselben
 * Orts — und jede einzelne davon steht unten mit Grund.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WIE DER BERICHT SEINE KREISE SCHREIBT — abgelesen, nicht angenommen
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   „Alb-Donau-Kreis"              Landkreis, schlicht
 *   „Karlsruhe"                    der LANDKREIS Karlsruhe
 *   „Karlsruhe, Stadt"             die Stadt
 *   „München, Landeshauptstadt"    dieselbe Bauform, anderer Zusatz
 *   „Kassel, documenta-Stadt"      und noch einer
 *   „Landkreis Rostock"            hier steht die Art VORNE …
 *   „Rostock"                      … und dann meint der bloße Name die STADT
 *
 * Die letzten beiden Zeilen sind der Grund, warum die Art nicht aus dem
 * einzelnen Namen ablesbar ist, sondern nur aus dem gesamten Namensbestand
 * eines Bundeslands: Ein bloßer Name ist der Landkreis — es sei denn, das Land
 * führt daneben ausdrücklich einen „Landkreis X", dann ist der bloße Name die
 * Stadt. Wer diese Regel wegläßt, hängt die Zahlen der Hansestadt Rostock an
 * den Landkreis Rostock.
 *
 * Und: Ein Kreis kann unter einem FREMDEN Bundesland auftauchen. Der Bericht
 * führt „Bayern / Alb-Donau-Kreis" mit einer einzigen Zusage — eine Buchung,
 * deren Landeszuordnung nicht zur Kreiszuordnung passt. Solche Zeilen gehören
 * demselben Kreis und werden dort aufaddiert; deshalb wird nach dem Land nur
 * ZUERST gesucht, nicht ausschließlich.
 */

/** Eine Kreisregion aus unserem Register. */
export type Kreisregion = {
  region_id: string;
  name: string;
  bezeichnung: string | null;
};

/**
 * Namen, die sich nicht über die Schreibweise auflösen lassen — jeder mit
 * Grund. Der Schlüssel wird NICHT hier getippt: Er wird über den Registernamen
 * gesucht, der daneben steht.
 */
const AUSNAHMEN: { bericht: string; land: string; register: string; grund: string }[] = [
  {
    bericht: "Weiden, Stadt",
    land: "Bayern",
    register: "Weiden i.d.OPf.",
    grund: "Der Bericht kürzt den amtlichen Zusatz „i.d.OPf.“ weg.",
  },
  {
    bericht: "Göttingen",
    land: "Niedersachsen",
    register: "Landkreis Göttingen",
    grund:
      "Im Register steht neben dem Landkreis noch eine Zeile „Göttingen“ ohne Bezeichnung. " +
      "Der Bericht führt nur EINEN Göttingen-Kreis; die zweite Registerzeile bekommt deshalb keine Zahlen.",
  },
];

const STADT_BEZEICHNUNGEN = new Set(["Kreisfreie Stadt", "Stadtkreis"]);

/** Der Ortsname ohne Art-Angabe: „Karlsruhe, Stadt" und „Landkreis Karlsruhe" → „Karlsruhe". */
function grundname(s: string): string {
  return s.split(",")[0].replace(/^(Landkreis|Kreis)\s+/i, "").trim();
}

/** Vergleichsform: Groß/klein, Bindestriche, Punkte und Klammerzusätze weg. */
function vergleichsform(s: string): string {
  return grundname(s)
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[-\s.]/g, "")
    .replace(/ß/g, "ss");
}

export type ZuordnungsErgebnis = {
  /** „Bundesland|Kreisname" → fünfstelliger Gebietsschlüssel. */
  zuordnung: Map<string, string>;
  /** Namen, die sich nicht eindeutig auflösen ließen. */
  offen: { paar: string; kandidaten: string[] }[];
  /** Schlüssel, auf die mehrere VERSCHIEDENE Kreisnamen zeigen — immer ein Fehler. */
  kollisionen: { regionId: string; namen: string[] }[];
  /** Registerzeilen, denen kein Kreis des Berichts entspricht. Kein Fehler. */
  ohneBericht: Kreisregion[];
};

/**
 * Ordnet die Kreisnamen des Berichts den Gebietsschlüsseln zu.
 *
 * `paare` sind Zeichenketten „Bundesland|Kreisname", wie sie aus dem Bericht
 * fallen. `landAgs` bildet den Bundeslandnamen auf seine zwei Stellen ab.
 *
 * Geprüft wird in eine Richtung streng und in die andere nachsichtig: JEDER
 * Kreis des Berichts muss genau einen Schlüssel bekommen, aber nicht jede
 * Registerzeile muss im Bericht vorkommen. Das Register führt Zeilen, die keine
 * Kreise (mehr) sind; sie hier zum Fehler zu erklären hieße, über ihre
 * Geschichte etwas zu behaupten, das wir nicht geprüft haben.
 */
export function ordneKreiseZu(
  paare: string[],
  register: Kreisregion[],
  landAgs: Map<string, string>,
): ZuordnungsErgebnis {
  // Schritt 1: Aus dem Namensbestand JE BUNDESLAND ablesen, welche bloßen
  // Namen in Wahrheit Städte sind — nämlich die, zu denen das Land zusätzlich
  // einen ausdrücklichen „Landkreis X" führt.
  const landkreisVorne = new Map<string, Set<string>>();
  for (const p of paare) {
    const [land, name] = p.split("|");
    if (!/^(Landkreis|Kreis)\s/i.test(name)) continue;
    const s = landkreisVorne.get(land) ?? new Set<string>();
    s.add(vergleichsform(name));
    landkreisVorne.set(land, s);
  }

  const istStadt = (land: string, name: string): boolean => {
    if (/^(Landkreis|Kreis)\s/i.test(name)) return false;
    if (name.includes(",")) return true;
    return landkreisVorne.get(land)?.has(vergleichsform(name)) ?? false;
  };

  const zuordnung = new Map<string, string>();
  const offen: ZuordnungsErgebnis["offen"] = [];

  const suche = (land: string, name: string, nurLand: boolean): Kreisregion[] => {
    const ags = landAgs.get(land);
    const topf = nurLand && ags ? register.filter((m) => m.region_id.slice(0, 2) === ags) : register;
    let kandidaten = topf.filter((m) => vergleichsform(m.name) === vergleichsform(name));
    if (kandidaten.length > 1) {
      const nachArt = kandidaten.filter(
        (m) => STADT_BEZEICHNUNGEN.has(m.bezeichnung ?? "") === istStadt(land, name),
      );
      if (nachArt.length) kandidaten = nachArt;
    }
    return kandidaten;
  };

  for (const paar of paare) {
    const [land, name] = paar.split("|");

    const ausnahme = AUSNAHMEN.find((a) => a.bericht === name && a.land === land);
    if (ausnahme) {
      const ags = landAgs.get(land);
      const treffer = register.filter(
        (m) => m.name === ausnahme.register && (!ags || m.region_id.slice(0, 2) === ags),
      );
      if (treffer.length === 1) {
        zuordnung.set(paar, treffer[0].region_id);
        continue;
      }
      offen.push({ paar, kandidaten: treffer.map((m) => `${m.region_id} ${m.name}`) });
      continue;
    }

    let kandidaten = suche(land, name, true);
    if (kandidaten.length === 0) kandidaten = suche(land, name, false);
    if (kandidaten.length === 1) zuordnung.set(paar, kandidaten[0].region_id);
    else offen.push({ paar, kandidaten: kandidaten.map((m) => `${m.region_id} ${m.name}`) });
  }

  // Kollisionen: derselbe Schlüssel für zwei verschiedene ORTSNAMEN. Zwei
  // Bundesland-Schreibungen desselben Namens sind dagegen in Ordnung — sie
  // sind die Buchungen, deren Landeszuordnung nicht zur Kreiszuordnung passt.
  const proSchluessel = new Map<string, string[]>();
  for (const [paar, id] of zuordnung) {
    const liste = proSchluessel.get(id) ?? [];
    liste.push(paar);
    proSchluessel.set(id, liste);
  }
  const kollisionen: ZuordnungsErgebnis["kollisionen"] = [];
  for (const [regionId, namen] of proSchluessel) {
    const formen = new Set(namen.map((p) => vergleichsform(p.split("|")[1])));
    const arten = new Set(namen.map((p) => istStadt(p.split("|")[0], p.split("|")[1])));
    if (formen.size > 1 || arten.size > 1) kollisionen.push({ regionId, namen });
  }

  const belegt = new Set(zuordnung.values());
  const ohneBericht = register.filter((m) => !belegt.has(m.region_id));

  return { zuordnung, offen, kollisionen, ohneBericht };
}
