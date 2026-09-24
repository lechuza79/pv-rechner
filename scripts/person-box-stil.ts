/**
 * Den Stil der Kontakt-Box („ich und der Schreib-mir-Knopf") aus dem
 * Startseiten-Paket herausziehen — damit die Ortsseite DIESELBEN Regeln lädt
 * statt einer nachgebauten Fassung.
 *
 * WARUM (23.09.2026, mehrfach beanstandet): Die Box der Startseite steht in
 * 106 Regeln, in zehn Runden gewachsen; die Ortsseite hatte davon eine
 * handgeschriebene Kurzfassung. Sie sah deshalb „fast" so aus — und ließ sich
 * durch Nachbessern nie einholen. Die Regeln hier abzuschreiben wäre derselbe
 * Fehler noch einmal; also werden sie aus dem Paket gelesen.
 *
 *   npx tsx scripts/person-box-stil.ts            (nur zählen)
 *   npx tsx scripts/person-box-stil.ts --schreiben
 *
 * Nach jedem neuen Design-Paket erneut laufen lassen; ein Test hält die
 * abgelegte Fassung gegen die Quelle.
 */
import { readFileSync, writeFileSync } from "node:fs";

// In dieser Reihenfolge lädt die Startseite ihre Stile; die spätere Datei
// gewinnt. Nur homepage.css zu lesen ergab die Box in ihrem vorletzten Stand:
// Knöpfe nebeneinander statt gestapelt, kein Aquarell hinter dem Bild.
const QUELLEN = ["public/homepage-study/homepage.css", "public/design-lab/homepage-experiments.css"];
const ZIEL = "public/shared-person/person-box.css";

type Regel = { media: string; selektor: string; block: string };

/** Alle Regeln, deren Selektor `merkmal` enthält — mit ihrem Medien-Kontext. */
export function regelnMit(css: string, merkmal: string): Regel[] {
  const treffer: Regel[] = [];
  const lauf = (text: string, media: string) => {
    let i = 0;
    while (i < text.length) {
      const mediaStart = text.indexOf("@media", i);
      const regel = /([^{}@]+)\{([^{}]*)\}/g;
      regel.lastIndex = i;
      const r = regel.exec(text);
      if (mediaStart >= 0 && (!r || mediaStart < r.index)) {
        const auf = text.indexOf("{", mediaStart);
        let tiefe = 0;
        let j = auf;
        for (; j < text.length; j++) {
          if (text[j] === "{") tiefe++;
          else if (text[j] === "}" && --tiefe === 0) break;
        }
        lauf(text.slice(auf + 1, j), text.slice(mediaStart, auf).trim());
        i = j + 1;
        continue;
      }
      if (!r) break;
      const selektor = r[1].replace(/\/\*[\s\S]*?\*\//g, "").split(/\s+/).join(" ").trim();
      if (selektor.includes(merkmal)) treffer.push({ media, selektor, block: r[2].trim() });
      i = r.index + r[0].length;
    }
  };
  lauf(css.replace(/\/\*[\s\S]*?\*\//g, ""), "");
  return treffer;
}

/**
 * Die Farbwerte der Design-Werkstatt, in der die Startseite läuft. Die
 * Knopf-Regeln lesen sie als Variablen; ohne sie bliebe der Knopf durchsichtig
 * statt limette. Gelesen statt getippt — sie stehen in derselben Datei.
 */
export function werkstattFarben(css: string, stand = "lime"): string {
  const treffer = new RegExp(`body\\[data-lab-accent=${stand}\\]\\{([^}]*)\\}`).exec(css);
  return treffer ? treffer[1] : "";
}

export function alsStylesheet(regeln: Regel[], farben = ""): string {
  const zeilen: string[] = [
    "/* ERZEUGT von scripts/person-box-stil.ts — nicht von Hand ändern.",
    "   Quellen: public/homepage-study/homepage.css und\n   public/design-lab/homepage-experiments.css (Startseiten-Paket, in dieser Reihenfolge).",
    "   Die Ortsseite lädt diese Datei, damit ihre Kontakt-Box dieselbe ist. */",
  ];
  if (farben) zeilen.push(`.homepage-study{${farben}}`);
  for (const r of regeln) {
    // „body[data-lab-accent]" ist der Schalter der Design-Werkstatt, mit dem
    // die Startseite läuft — hier gilt immer der fertige Stand, also fällt er
    // weg. Sonst bliebe das Aquarell hinter dem Bild aus.
    const selektor = r.selektor.replace(/body\[data-lab-accent\]\s*/g, "");
    zeilen.push(r.media ? `${r.media}{${selektor}{${r.block}}}` : `${selektor}{${r.block}}`);
  }
  return zeilen.join("\n") + "\n";
}

if (process.argv[1]?.endsWith("person-box-stil.ts")) {
  const regeln = QUELLEN.flatMap((datei) => regelnMit(readFileSync(datei, "utf8"), "person"));
  const stylesheet = alsStylesheet(regeln, werkstattFarben(readFileSync(QUELLEN[1], "utf8")));
  if (process.argv.includes("--schreiben")) {
    writeFileSync(ZIEL, stylesheet);
    console.log(`${regeln.length} Regeln nach ${ZIEL} (${Math.round(stylesheet.length / 1024)} kB).`);
  } else {
    console.log(`${regeln.length} Regeln gefunden, ${Math.round(stylesheet.length / 1024)} kB. Schreiben mit --schreiben.`);
  }
}
