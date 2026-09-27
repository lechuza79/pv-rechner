/**
 * Short card titles for a town's stories ("Solar im Überblick", "9 neue
 * Solaranlagen"), by rule per story family.
 *
 * The approved design shows a short label on each story card and the full
 * title in the reader. The prototype had the labels written by hand for
 * Höchberg only (scripts/municipality-preview/story-thumb-labels.json); these
 * rules reproduce them and cover every town. A family without a rule keeps
 * its full title — a missing label is better than a made-up one.
 */

type Wert = { label?: string; value?: number | null; unit?: string };
export type KurztitelStory = { label?: string; title?: string; values?: Wert[] };

const zahl = (n: number) => Math.round(n).toLocaleString("de-DE");

/** German genitive of a place name: "Höchbergs", but "Bad Ems’". */
function genitiv(name: string): string {
  return /[sßxz]$/i.test(name) ? `${name}’` : `${name}s`;
}

/** The installation type a story's title starts with ("Gebäudeanlagen: …"). */
function segment(title: string): "dach" | "balkon" | "frei" | null {
  if (/^Gebäudeanlagen/.test(title)) return "dach";
  if (/^Balkonkraftwerke/.test(title)) return "balkon";
  if (/^Freiflächenanlagen/.test(title)) return "frei";
  return null;
}

const NEUE: Record<"dach" | "balkon" | "frei", string> = {
  dach: "neue Dachanlagen",
  balkon: "neue Balkonkraftwerke",
  frei: "neue Freiflächenanlagen",
};

export function kurztitel(story: KurztitelStory, ort: string): string | undefined {
  const title = story.title ?? "";
  const werte = story.values ?? [];
  switch (story.label) {
    case "Bestandsprofil":
      return "Solar im Überblick";
    case "Rang-Monatsupdate":
      return `${genitiv(ort)} Platzierungen`;
    case "Stromwert-Monatsrecap":
      return "Wert des Solarstroms";
    case "Einspeisevergütung-Monatsrecap":
      return "Einspeisevergütung";
    case "Zubau-Monatsrecap": {
      const n = werte.find((w) => w.label === "Neue Anlagen")?.value;
      if (n == null) return undefined;
      return n === 0 ? "Kein neuer Zubau" : n === 1 ? "1 neue Solaranlage" : `${zahl(n)} neue Solaranlagen`;
    }
    case "Solar-Monatsrecap": {
      const monat = /Solar-([A-ZÄÖÜ][a-zäöü]+)/.exec(title)?.[1];
      return monat ? `Der Solar-${monat}` : undefined;
    }
    case "Anzahl und Leistung": {
      const anteil = werte.find((w) => w.label === "Leistungsanteil")?.value;
      const seg = segment(title);
      if (anteil == null || !seg) return undefined;
      if (seg === "dach") return anteil >= 90 ? "Dächer liefern fast alles" : `Dächer liefern ${zahl(anteil)} %`;
      if (seg === "frei") return `Freiflächen liefern ${zahl(anteil)} %`;
      return `Balkone liefern ${zahl(anteil)} %`;
    }
    case "Vorjahreszeitraum": {
      const seg = segment(title);
      const [vorher, jetzt] = werte.map((w) => w.value ?? 0);
      if (!seg || vorher == null || jetzt == null) return undefined;
      return `${jetzt > vorher ? "Mehr" : jetzt < vorher ? "Weniger" : "Gleich viele"} ${NEUE[seg]}`;
    }
    case "Jahresveränderung": {
      const jahr = /\b(20\d\d)\b/.exec(title)?.[1];
      const [vorher, jetzt] = werte.map((w) => w.value ?? 0);
      if (!jahr || vorher == null || jetzt == null) return undefined;
      return `${jetzt >= vorher ? "Mehr" : "Weniger"} Zubau ${jahr}`;
    }
    case "Energie-Jahresprofil": {
      const jahr = /\b(20\d\d)\b/.exec(title)?.[1];
      const wind = werte.find((w) => /Wind/.test(w.label ?? ""))?.value ?? 0;
      if (!jahr) return undefined;
      return wind > 0 ? `Sonne und Wind ${jahr}` : `Das Solarjahr ${jahr}`;
    }
    case "Ertragsspitze als Modell": {
      const wann = /im ([A-ZÄÖÜ][a-zäöü]+ 20\d\d)/.exec(title)?.[1];
      return wann ? `Rekordmonat ${wann}` : undefined;
    }
    default:
      return undefined;
  }
}
