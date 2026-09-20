/**
 * Zeigt ein Programm auf die Gemeinden, zu denen es gehört?
 *
 * Das URTEIL steht hier, der Abruf im Skript (`scripts/funding-ags-verify.ts`).
 * Getrennt, weil sonst nur das fertige Ergebnis prüfbar wäre: Ein Wächter, der
 * sein Urteil hereingereicht bekommt, hat die Ableitung nie unter Test — genau
 * daran hat die erste Fassung des Firewall-Wächters zwei von drei Sabotagen
 * überlebt (CLAUDE.md, „Der Wächter musste zweimal gebaut werden").
 *
 * WARUM ES DIESE PRÜFUNG GIBT (19.08.2026): Ein achtstelliger
 * Gemeindeschlüssel ist eine Zahl ohne Aussehen. Vertippt man sich um eine
 * Stelle, bleibt er gültig und zeigt auf einen anderen Ort — kein Typfehler,
 * kein roter Test, keine kaputte Seite. Nur bekommt die falsche Gemeinde eine
 * Förderung angeboten und die richtige nicht.
 */
import { foerdergebiete, type FundingProgram } from "./funding-programs";

export type AgsBefund = {
  /** Programm- bzw. Verzeichnis-Kennung, unter der der Befund steht. */
  id: string;
  /** Der beanstandete Schlüssel — leer, wo der Befund mehrere zugleich betrifft. */
  schluessel: string;
  /** Klartext für das Protokoll des nächtlichen Laufs. */
  text: string;
};

/** Namensvergleich: Groß-/Kleinschreibung, Bindestriche und Zusätze raus. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-zäöüß]/g, "");
}

/**
 * Trägt das Programm einen GEMEINDEVERBAND statt einer Gemeinde?
 *
 * Das entscheidet, ob der Namensvergleich überhaupt greifen kann — und es ist
 * gemessen, nicht angenommen: Das Melderegister führt unter „Verbandsgemeinde"
 * NULL Einträge (12.09.2026 abgefragt). Es kennt Ortsgemeinden, keine Verbände.
 * „Verbandsgemeinde Brohltal" gegen „Schalkenbach" zu halten kann deshalb nie
 * passen, egal wie viele Gebiete das Programm trägt.
 *
 * KEINE gepflegte Ausnahmeliste, sondern die Bauformen des deutschen
 * Kommunalrechts — sie kommen nicht monatlich dazu. Wer hier etwas ergänzt,
 * ergänzt eine Verbandsform, nie einen Einzelfall, der gerade stört.
 */
function istGemeindeverband(region: string): boolean {
  return /^(verbandsgemeinde|samtgemeinde|städteregion|staedteregion|amt)\b/i.test(region.trim());
}

/**
 * Prüft ein Programm gegen die Namen, die das Melderegister unter seinen
 * Fördergebieten führt.
 *
 * `registerNamen` bildet Schlüssel → Name ab; ein fehlender Eintrag heißt „im
 * Melderegister nicht vorhanden".
 */
export function pruefeProgramm(
  p: Pick<FundingProgram, "id" | "region" | "agsCode" | "agsCodes">,
  registerNamen: Map<string, string>,
): AgsBefund[] {
  const gebiete = foerdergebiete(p).filter((g) => g.length === 8);
  if (!gebiete.length) return [];
  const befunde: AgsBefund[] = [];

  // Gilt für einzelne wie für mehrere Gebiete: Jeder Schlüssel muss existieren.
  for (const g of gebiete) {
    if (!registerNamen.has(g)) {
      befunde.push({ id: p.id, schluessel: g, text: `${g} existiert im Melderegister nicht` });
    }
  }

  // GEMEINDE als Träger: Der Ortsname des Programms muss zum Registernamen
  // passen. Das ist der eigentliche Tippfehler-Fang — ein um eine Stelle
  // verdrehter Schlüssel bleibt gültig und zeigt auf einen anderen Ort.
  //
  // Es gilt NUR bei genau einem Gebiet: Trägt eine Gemeinde mehrere Schlüssel,
  // ist einer davon zwangsläufig nicht sie selbst.
  if (gebiete.length === 1 && !istGemeindeverband(p.region)) {
    const echt = registerNamen.get(gebiete[0]);
    if (echt && !norm(echt).startsWith(norm(p.region).slice(0, 5))) {
      befunde.push({
        id: p.id,
        schluessel: gebiete[0],
        text: `${gebiete[0]} → "${echt}" statt "${p.region}"`,
      });
    }
    return befunde;
  }

  // GEMEINDEVERBAND oder mehrere Gebiete: Der Namensvergleich kann hier nicht
  // greifen (siehe `istGemeindeverband`), also tritt der LANDKREIS an seine
  // Stelle. Die Ortsgemeinden einer Verbandsgemeinde teilen ihn sich (CLAUDE.md:
  // „Ihr gemeinsames Präfix ist der Landkreis"); die ersten fünf Stellen müssen
  // über alle Gebiete gleich sein. Das fängt den Vertipper, der in einen
  // anderen Kreis springt.
  //
  // EIN VERTIPPER INNERHALB DESSELBEN KREISES BLEIBT UNENTDECKT. Das ist die
  // ehrliche Grenze dieser Prüfung und kein Grund, sie wegzulassen: Bis zum
  // 12.09.2026 war an Mehrfach-Gebieten ÜBERHAUPT NICHTS geprüft.
  const kreise = new Set(gebiete.map((g) => g.slice(0, 5)));
  if (kreise.size > 1) {
    befunde.push({
      id: p.id,
      schluessel: "",
      text: `Fördergebiete liegen in mehreren Landkreisen (${[...kreise].sort().join(", ")}) — bei „${p.region}" ist das ein Tippfehler-Verdacht`,
    });
  }
  return befunde;
}

/**
 * Dasselbe für einen Eintrag des Städte-Verzeichnisses.
 *
 * Ein vertippter Schlüssel wirkt hier nicht auf einen Förderbetrag, sondern auf
 * den Anlagenbestand, der unter dem Ortsnamen steht — genauso stumm.
 */
export function pruefeVerzeichnis(
  c: { slug: string; name: string; ags: string },
  registerNamen: Map<string, string>,
): AgsBefund[] {
  if (c.ags.length !== 8) return [];
  const echt = registerNamen.get(c.ags);
  if (!echt) {
    return [{ id: `Verzeichnis ${c.slug}`, schluessel: c.ags, text: `${c.ags} existiert im Melderegister nicht` }];
  }
  if (!norm(echt).startsWith(norm(c.name).slice(0, 5))) {
    return [{ id: `Verzeichnis ${c.slug}`, schluessel: c.ags, text: `${c.ags} → "${echt}" statt "${c.name}"` }];
  }
  return [];
}
