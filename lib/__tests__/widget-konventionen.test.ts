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

  dateien.push(
    "components/MastrLiveRadial.tsx",
    "components/SimulationPanel.tsx",
    // Die ortsbezogenen Karten (Gemeinde, Bundesland) und ihre geteilte Hülle:
    // Die Embed-Routen sind dünne Hüllen um diese Bauteile — ohne sie prüfte der
    // Wächter bei fünf Widgets nur die Verpackung.
    "components/atlas/GemeindeWidgetShell.tsx",
    "components/atlas/GemeindeErneuerbareWidget.tsx",
    "components/atlas/GemeindeSolarLive.tsx",
    "components/RegionAnlagentypWidget.tsx",
    "components/RegionSolarLive.tsx",
  );

  return dateien.map((pfad) => ({ pfad, inhalt: readFileSync(join(ROOT, pfad), "utf8") }));
}

/**
 * Regeln, die für eine Datei (noch) nicht gelten — Umstellungs-Reste UND
 * begründete Dauerausnahmen, beide hier, beide REGELGENAU.
 *
 * Regelgenau ist der Punkt: Früher stand daneben eine pauschale Restliste, die
 * für die genannten Dateien JEDE Regel abschaltete — auch „bild-fuss", also
 * ausgerechnet die mit dem Lizenzrisiko. Eine Ausnahme darf immer nur das
 * abschalten, was tatsächlich offen ist.
 *
 * Die Liste ist bewusst sichtbar und soll schrumpfen: Wer eines dieser Widgets
 * anfasst, stellt es um und streicht seinen Eintrag. Sie ist KEIN Ort, um einen
 * neuen Verstoß abzulegen — für alles, was hier nicht steht, ist der Test
 * scharf, und das ist der Punkt: neue Charts können gar nicht erst danebenlaufen.
 */
const ERLAUBT: Record<string, { regel: string; grund: string }[]> = {
  // ── Umstellungs-Reste (Stand 27.07.2026): bauen ihre Fußzeile noch selbst ──
  "app/(embed)/embed/ee-ampel/client.tsx": [
    { regel: "share-url", grund: "noch nicht auf das Register umgestellt" },
    { regel: "max-breite", grund: "noch nicht auf das Register umgestellt" },
  ],
  "app/(embed)/embed/foerder-check/client.tsx": [
    { regel: "share-url", grund: "noch nicht auf das Register umgestellt" },
  ],
  "app/(embed)/embed/karte/client.tsx": [
    { regel: "share-url", grund: "noch nicht auf das Register umgestellt" },
    { regel: "max-breite", grund: "noch nicht auf das Register umgestellt" },
  ],
  "app/(embed)/embed/kennzahl/client.tsx": [
    { regel: "share-url", grund: "noch nicht auf das Register umgestellt" },
    { regel: "max-breite", grund: "noch nicht auf das Register umgestellt" },
  ],

  // ── Dauerausnahmen ────────────────────────────────────────────────────────
  "components/charts/ZubauTimelineChart.tsx": [
    { regel: "quelle-getippt", grund: "reines Chart-Bauteil ohne Fußzeile; enthält kein Credit" },
  ],
  "app/(embed)/embed/pv-zubau-deutschland/client.tsx": [
    {
      regel: "max-breite",
      grund: "dünne Hülle; die Karte samt Breitengrenze steckt in components/charts/ZubauWidget",
    },
  ],
  // Die vier ortsbezogenen Embed-Routen reichen nur Daten + Einstellungen an das
  // Bauteil weiter; Breitengrenze, Fußzeile und Bild-Fuß stecken in der geteilten
  // Hülle components/atlas/GemeindeWidgetShell, die hier mitgeprüft wird.
  "app/(embed)/embed/gemeinde-erneuerbare/client.tsx": [
    { regel: "max-breite", grund: "dünne Hülle; Breitengrenze in GemeindeWidgetShell" },
  ],
  "app/(embed)/embed/gemeinde-solarleistung/client.tsx": [
    { regel: "max-breite", grund: "dünne Hülle; Breitengrenze in GemeindeWidgetShell" },
  ],
  "app/(embed)/embed/region-anlagentyp/client.tsx": [
    { regel: "max-breite", grund: "dünne Hülle; Breitengrenze in GemeindeWidgetShell" },
  ],
  "app/(embed)/embed/region-solarleistung/client.tsx": [
    { regel: "max-breite", grund: "dünne Hülle; Breitengrenze in GemeindeWidgetShell" },
  ],
};

/**
 * Regeln, die NIE ausgenommen werden dürfen — egal, was in ERLAUBT steht.
 * „bild-fuss" ist die Attributions-Regel: Ein Bild ohne Quelle geht in die Welt
 * und lässt sich nicht zurückholen. Eine Ausnahme davon wäre kein Rest, sondern
 * ein Lizenzverstoß mit Ansage.
 */
const UNVERHANDELBAR = ["bild-fuss"];

/**
 * Zerlegt eine Datei in ihre CODE-Zeilen — Kommentare fliegen raus.
 *
 * Eine Konvention wird im Code beschrieben („kein ‚Powered by' im
 * First-Party-Embed", „Quelle: kommt aus DataSourceNote"). Würde der Wächter
 * diese Sätze anschlagen, bestünde der billigste Weg zu Grün darin, die
 * Begründung zu löschen. Deshalb genau eine Stelle, die Kommentare erkennt —
 * eine zweite Kopie wäre wieder eine Fehlerquelle.
 */
function codeZeilen(inhalt: string): { zeile: string; nr: number }[] {
  const raus: { zeile: string; nr: number }[] = [];
  let imBlock = false;
  inhalt.split("\n").forEach((roh, i) => {
    const startet = /\{?\/\*/.test(roh);
    const endet = /\*\/\}?/.test(roh);
    const warImBlock = imBlock;
    if (startet && !endet) imBlock = true;
    else if (endet && imBlock) imBlock = false;
    if (warImBlock || startet) return;
    if (/^\s*\*/.test(roh)) return; // JSDoc-Fortsetzung
    const ohneZeilenkommentar = roh.replace(/\/\/.*$/, "");
    if (!ohneZeilenkommentar.trim()) return;
    raus.push({ zeile: ohneZeilenkommentar, nr: i + 1 });
  });
  return raus;
}

function istErlaubt(pfad: string, regel: string): boolean {
  if (UNVERHANDELBAR.includes(regel)) return false;
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
      codeZeilen(inhalt).forEach(({ zeile, nr }) => {
        if (/(>|\s)Quelle:\s*(\{|[A-Za-zÄÖÜ])/.test(zeile) && !/label=/.test(zeile)) {
          treffer.push(`${pfad}:${nr}  ${zeile.trim().slice(0, 90)}`);
        }
      });
    }
    expect(treffer, `Beschriftung gehört an DataSourceNote (label="…"):\n${treffer.join("\n")}`).toEqual([]);
  });

  it("niemand tippt „Powered by“ von Hand", () => {
    // Die Markenzeile kommt aus PoweredBy; im Bild trägt sie je nach Art des
    // Widgets einen anderen Text (brandLabel). Ein getippter String friert die
    // falsche Variante ein.
    // Kommentare zählen nicht — genau wie bei der „Quelle:"-Regel. Ein Hinweis
    // wie „onsite: kein ‚Powered by'" beschreibt die Konvention, er bricht sie
    // nicht; ihn rot zu färben würde nur dazu führen, dass er gelöscht wird.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (istErlaubt(pfad, "powered-by")) continue;
      codeZeilen(inhalt).forEach(({ zeile, nr }) => {
        if (/["'>]Powered by/.test(zeile)) treffer.push(`${pfad}:${nr}`);
      });
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

  it("wo ein Bild-Fuß steht, steht auch der Sammler für die Hilfetexte", () => {
    // Der Bild-Fuß zeigt die Texte hinter den „?"-Knöpfen — aber nur, wenn ein
    // ExportNotesProvider sie eingesammelt hat. Fehlt er, passiert nichts
    // Sichtbares: Der erste Tooltip, den jemand später in die Karte baut,
    // verschwindet lautlos aus dem Bild.
    //
    // Warum diese Regel und nicht „Provider ins Layout": Auf einer Seite können
    // zwei Widgets mit eigenem Bild-Fuß stehen; ein gemeinsamer Provider weiter
    // oben würde beiden ALLE Notizen ins Bild schreiben. Der Sammler gehört
    // deshalb um die einzelne Karte — und weil man das vergessen kann, prüft es
    // der Wächter statt eines Kommentars.
    const treffer: string[] = [];
    for (const { pfad, inhalt } of dateien) {
      if (istErlaubt(pfad, "notizen-sammler")) continue;
      if (!/<WidgetExportFooter/.test(inhalt)) continue;
      if (!/<ExportNotesProvider/.test(inhalt)) treffer.push(pfad);
    }
    expect(
      treffer,
      `Bild-Fuß ohne <ExportNotesProvider> um die Karte:\n${treffer.join("\n")}`
    ).toEqual([]);
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
