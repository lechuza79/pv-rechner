import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter über die Widget-Konvention.
 *
 * Der Anlass: Nach dem Ausrollen der Bildexport-Systematik blieben in einzelnen
 * Widgets Reste stehen — hier noch „Quelle:" statt „Datenquelle:", dort ein
 * handgetippter Teilen-Link, woanders ein eigener Marken-Text. Solche Reste
 * findet niemand durch Hinsehen: Man müsste neun Bilder herunterladen und
 * nebeneinanderlegen. Genau das soll niemand mehr tun müssen.
 *
 * Der Test verbietet deshalb die Bauweise, nicht das Symptom: Beschriftungen,
 * Quellen und Teilen-Ziele kommen aus den geteilten Bausteinen
 * (components/WidgetExport.tsx, components/PoweredBy.tsx) und aus dem Register
 * (lib/widget-registry.ts). Wer sie tippt, umgeht die eine Quelle.
 *
 * Ausnahmen stehen unten mit Begründung — dann sind sie eine Entscheidung und
 * kein Versehen. Die Regex aufzuweichen ist nie die Lösung.
 */

const ROOT = join(__dirname, "..", "..");

/** Alle Oberflächen, die ein Widget oder einen exportierbaren Chart zeigen. */
function widgetDateien(): { pfad: string; inhalt: string }[] {
  const dateien: string[] = [];

  const embedRoot = join(ROOT, "app/(embed)/embed");
  for (const eintrag of readdirSync(embedRoot, { withFileTypes: true })) {
    if (!eintrag.isDirectory()) continue;
    for (const datei of readdirSync(join(embedRoot, eintrag.name))) {
      // Nur die Widgets selbst — page.tsx trägt Metadaten (SEO-Texte), keine UI.
      if (datei === "client.tsx") dateien.push(join("app/(embed)/embed", eintrag.name, datei));
    }
  }

  const chartRoot = join(ROOT, "components/charts");
  for (const datei of readdirSync(chartRoot)) {
    if (datei.endsWith(".tsx")) dateien.push(join("components/charts", datei));
  }

  dateien.push("components/MastrLiveRadial.tsx", "components/SimulationPanel.tsx");

  return dateien.map((pfad) => ({ pfad, inhalt: readFileSync(join(ROOT, pfad), "utf8") }));
}

/**
 * Noch nicht umgestellt — die Restliste der Umstellung auf die geteilten
 * Bausteine (Stand 27.07.2026). Diese Widgets bauen ihre Fußzeile noch selbst.
 *
 * Die Liste ist bewusst sichtbar und soll schrumpfen: Wer eines dieser Widgets
 * anfasst, stellt es um und streicht es hier. Sie ist KEIN Ort, um einen neuen
 * Verstoß abzulegen — für alles, was hier nicht steht, ist der Test scharf, und
 * das ist der Punkt: neue Charts können gar nicht erst danebenlaufen.
 */
const NOCH_NICHT_UMGESTELLT = [
  "app/(embed)/embed/ee-ampel/client.tsx",
  "app/(embed)/embed/erzeugung-mini/client.tsx",
  "app/(embed)/embed/foerder-check/client.tsx",
  "app/(embed)/embed/gemeinde-erneuerbare/client.tsx",
  "app/(embed)/embed/gemeinde-solar/client.tsx",
  "app/(embed)/embed/gemeinde-solarleistung/client.tsx",
  "app/(embed)/embed/karte/client.tsx",
  "app/(embed)/embed/kennzahl/client.tsx",
  "app/(embed)/embed/region-anlagentyp/client.tsx",
  "app/(embed)/embed/region-solarleistung/client.tsx",
  "app/(embed)/embed/simulation/client.tsx",
  "components/atlas/GemeindeWidgetShell.tsx",
  // Eigener Embed-Modus mit eigener Fußzeile; steht als Nächstes an.
  "components/SimulationPanel.tsx",
];

/** Einzelne begründete Dauerausnahmen (keine Umstellungs-Reste). */
const ERLAUBT: Record<string, { regel: string; grund: string }[]> = {
  "components/charts/ZubauTimelineChart.tsx": [
    { regel: "quelle-getippt", grund: "reines Chart-Bauteil ohne Fußzeile; enthält kein Credit" },
  ],
  "app/(embed)/embed/pv-zubau-deutschland/client.tsx": [
    {
      regel: "max-breite",
      grund: "dünne Hülle; die Karte samt Breitengrenze steckt in components/charts/ZubauWidget",
    },
  ],
};

function istErlaubt(pfad: string, regel: string): boolean {
  if (NOCH_NICHT_UMGESTELLT.includes(pfad)) return true;
  return (ERLAUBT[pfad] ?? []).some((a) => a.regel === regel);
}

describe("Widget-Konvention", () => {
  const dateien = widgetDateien();

  it("findet überhaupt Widget-Dateien", () => {
    expect(dateien.length).toBeGreaterThan(10);
  });

  it("niemand tippt „Quelle:“ oder „Datenquelle:“ von Hand", () => {
    // Die Beschriftung gehört zu DataSourceNote (Prop `label`). Getippt driftet
    // sie: Im Bild muss „Datenquelle:" stehen, damit klar ist, dass sich der
    // Credit auf die DATEN bezieht und nicht auf das Chart.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (istErlaubt(pfad, "quelle-getippt")) continue;
      // ">Quelle:" oder "Quelle: {" im JSX-Text — nicht in Kommentaren.
      // Kommentare zählen nicht — auch nicht mehrzeilige JSX-Kommentare, in
      // denen die Konvention ja gerade beschrieben wird.
      let imKommentar = false;
      inhalt.split("\n").forEach((zeile, i) => {
        const startet = /\{?\/\*/.test(zeile);
        const endet = /\*\/\}?/.test(zeile);
        const warImKommentar = imKommentar;
        if (startet && !endet) imKommentar = true;
        else if (endet && imKommentar) imKommentar = false;
        if (warImKommentar || startet) return;
        const ohneZeilenkommentar = zeile.replace(/\/\/.*$/, "");
        if (/^\s*\*/.test(zeile)) return;
        if (/(>|\s)Quelle:\s*(\{|[A-Za-zÄÖÜ])/.test(ohneZeilenkommentar) && !/label=/.test(ohneZeilenkommentar)) {
          treffer.push(`${pfad}:${i + 1}  ${zeile.trim().slice(0, 90)}`);
        }
      });
    }
    expect(treffer, `Beschriftung gehört an DataSourceNote (label="…"):\n${treffer.join("\n")}`).toEqual([]);
  });

  it("niemand tippt „Powered by“ von Hand", () => {
    // Die Markenzeile kommt aus PoweredBy; im Bild trägt sie je nach Art des
    // Widgets einen anderen Text (brandLabel). Ein getippter String friert die
    // falsche Variante ein.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (istErlaubt(pfad, "powered-by")) continue;
      if (/["'>]Powered by/.test(inhalt)) treffer.push(pfad);
    }
    expect(treffer, `„Powered by" gehört in components/PoweredBy.tsx:\n${treffer.join("\n")}`).toEqual([]);
  });

  it("Teilen-Ziele stehen im Register, nicht in der Datei", () => {
    // Ein getippter Link zeigt irgendwann auf eine Seite, die es nicht mehr gibt
    // — und niemand merkt es, weil er nur im geteilten Bild auftaucht.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (istErlaubt(pfad, "share-url")) continue;
      const zeilen = inhalt.split("\n");
      zeilen.forEach((zeile, i) => {
        if (/^\s*(\/\/|\*)/.test(zeile)) return;
        if (/const\s+SHARE_URL\s*=\s*["'`]https:\/\/solar-check\.io/.test(zeile)) {
          treffer.push(`${pfad}:${i + 1}`);
        }
      });
    }
    expect(treffer, `Teilen-Ziel gehört in lib/widget-registry.ts:\n${treffer.join("\n")}`).toEqual([]);
  });

  it("jede Karte mit Bild-Export trägt auch einen Bild-Fuß", () => {
    // mode: "node" heißt: die Karte wird 1:1 fotografiert. Ohne Bild-Fuß fehlt
    // dem Bild die Quelle — das ist der Attributions-Fall, wegen dem der
    // Download beim Grüngas-Widget schon einmal abgeschaltet wurde.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (istErlaubt(pfad, "bild-fuss")) continue;
      const istNodeExport = /mode:\s*["']node["']/.test(inhalt);
      if (!istNodeExport) continue;
      if (!/WidgetExportFooter/.test(inhalt)) treffer.push(pfad);
    }
    expect(treffer, `Karte fotografiert sich selbst, hat aber keinen Bild-Fuß:\n${treffer.join("\n")}`).toEqual([]);
  });

  it("Embed-Karten begrenzen ihre Breite", () => {
    // Ohne Grenze füllt ein Chart jede angebotene Breite; das Bild wird extrem
    // flach und lässt jede Kurve flacher wirken, als sie ist.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (!pfad.startsWith("app/(embed)/embed/")) continue;
      if (!pfad.endsWith("client.tsx")) continue;
      if (istErlaubt(pfad, "max-breite")) continue;
      if (!/maxWidth/.test(inhalt)) treffer.push(pfad);
    }
    expect(treffer, `Embed-Karte ohne maximale Breite:\n${treffer.join("\n")}`).toEqual([]);
  });
});
