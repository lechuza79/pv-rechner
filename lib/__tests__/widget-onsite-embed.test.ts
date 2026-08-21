import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  WIDGET_VAR_QUELLE,
  widgetVarsAusTokens,
  WIDGET_THEME_DEFAULTS,
} from "../widget-theme";
import { parseHostPfad } from "../widget-settings";
import { exportHelligkeitsTokens } from "../chart-export";
import { tokens, stageDefaults, STAGE_COUNT } from "../theme";

const lies = (datei: string) => readFileSync(join(process.cwd(), datei), "utf8");

// Was ein iframe NICHT von der Seite erbt, muss ihm gereicht werden. Drei Dinge
// fehlten auf /atomstrom-import gleichzeitig, alle drei unsichtbar im Code und
// sofort sichtbar im Browser: die Tagesfarben, der Pfad der Seite (und damit die
// Erkennung, dass der „nächste Schritt" auf sie selbst zeigt) und ein Ziel für
// den Klick — der Artikel öffnete sich im Chart-Rahmen.
describe("First-Party-Embed: was das iframe von der Seite braucht", () => {
  it("die Farbzuordnung deckt jedes Widget-Token ab, das die Karte selbst malt", () => {
    // Der Kartengrund, die Schrift und der Akzent kommen im Embed nicht über die
    // --color-* Aliase, sondern direkt aus diesen Tokens. Fehlt eines, bleibt
    // genau dieser Teil der Karte auf der Voreinstellung stehen.
    ["--widget-bg", "--widget-fg", "--widget-muted", "--widget-accent"].forEach((t) =>
      expect(Object.keys(WIDGET_VAR_QUELLE)).toContain(t),
    );
    // Jede Quelle ist ein echtes Design-Token, kein erfundener Name.
    Object.keys(WIDGET_VAR_QUELLE).forEach((widgetVar) => {
      expect(tokens).toHaveProperty(WIDGET_VAR_QUELLE[widgetVar]);
    });
  });

  it("reicht auch die Schriften durch — und das Embed-Layout hält sie bereit", () => {
    // Ein Chart in einer anderen Schrift als der Text daneben fällt auf, und in
    // den großen Kennzahlen sind es andere Ziffern.
    expect(Object.keys(WIDGET_VAR_QUELLE)).toContain("--widget-font-family");
    expect(Object.keys(WIDGET_VAR_QUELLE)).toContain("--widget-font-mono");

    const layout = lies("app/(embed)/layout.tsx");
    // Die durchgereichten Stacks verweisen auf die next/font-Variablen — ohne
    // sie im Embed-Layout liefe die Übergabe ins Leere und ersetzte eine
    // funktionierende Schrift durch keine.
    expect(layout).toContain("--font-dm-sans");
    expect(layout).toContain("--font-jetbrains-mono");
    // Fremde Einbettungen dürfen das nichts kosten: ohne Vorabladen holt der
    // Browser die Dateien nur, wo eine Regel sie wirklich verlangt.
    expect(layout.match(/^\s+preload: false,$/gm) ?? []).toHaveLength(2);
    // Und sie bleiben dort auf der neutralen System-Schrift.
    expect(layout).toMatch(/--widget-font-family:\s*system-ui/);
  });

  it("die Tinte folgt dem Hintergrund, nicht der Textfarbe", () => {
    const hell = widgetVarsAusTokens((t) => (t === "--color-bg" ? "#FFFFFF" : "#3F3F3F"));
    const dunkel = widgetVarsAusTokens((t) => (t === "--color-bg" ? "#14161A" : "#EDEDED"));
    // Gitterlinien und Ränder müssen auf dunklem Grund hell werden, sonst
    // verschwindet das Chart-Raster in der Nacht-Stufe.
    expect(hell["--widget-ink"]).toBe("#0F0F0F");
    expect(dunkel["--widget-ink"]).toBe("#FFFFFF");
  });

  it("die Seite reicht Pfad und Farben ans iframe — und nennt sich als Quelle", () => {
    const quelle = lies("components/AutoHeightIframe.tsx");
    expect(quelle).toContain("hp=");
    expect(quelle).toContain("widget:theme");
    // „seite" ist der Unterschied zwischen unserer Tagesstufe und dem Schema
    // eines Einbettenden — davon hängt die Helligkeit des geteilten Bildes ab.
    expect(quelle).toContain('quelle: "seite"');
    // Ohne Beobachter bliebe das Widget auf der Stufe des Seitenaufrufs stehen.
    expect(quelle).toContain("data-theme");
  });
});

describe("Der Pfad der einbettenden Seite", () => {
  it("nimmt einen eigenen Pfad an", () => {
    expect(parseHostPfad("?onsite=1&hp=%2Fatomstrom-import")).toBe("/atomstrom-import");
  });

  it("weist alles zurück, was auf eine fremde Adresse zeigen könnte", () => {
    expect(parseHostPfad("?hp=%2F%2Fboese.example")).toBeNull();
    expect(parseHostPfad("?hp=https%3A%2F%2Fboese.example")).toBeNull();
    expect(parseHostPfad("?hp=atomstrom-import")).toBeNull();
    expect(parseHostPfad("?onsite=1")).toBeNull();
  });
});

describe("Der nächste Schritt im iframe", () => {
  const footer = lies("components/WidgetExport.tsx");

  it("vergleicht mit dem Pfad der SEITE, nicht mit dem des Widgets", () => {
    // `usePathname()` ist im iframe `/embed/…` — der Vergleich lief damit immer
    // ins Leere, und auf /atomstrom-import stand ein Knopf, der genau diese
    // Seite noch einmal aufrief.
    expect(footer).toContain("parseHostPfad");
    expect(footer).toMatch(/hostPfad\s*\?\?\s*pathname/);
  });

  it("navigiert das ganze Fenster statt des Rahmens", () => {
    expect(footer).toContain('"_top"');
    expect(footer).toContain("target={ctaZiel}");
  });
});

describe("Das geteilte Bild bleibt hell", () => {
  const hell = stageDefaults(STAGE_COUNT - 1);

  it("dreht die Tagesfarben der eigenen Seite zurück", () => {
    const werte = exportHelligkeitsTokens({ themeQuelle: "seite", eigenesSchema: true });
    expect(werte).not.toBeNull();
    // Beides muss hell werden: die Site-Tokens UND die Widget-Tokens, mit denen
    // die Karte ihren eigenen Grund malt.
    expect(werte!["--color-bg"]).toBe(hell["--color-bg"]);
    expect(werte!["--widget-bg"]).toBe(hell["--color-bg"]);
    expect(werte!["--widget-bg"]).toBe(WIDGET_THEME_DEFAULTS.bg);
  });

  it("lässt das Schema eines Einbettenden in Ruhe", () => {
    expect(exportHelligkeitsTokens({ themeQuelle: "einbettend", eigenesSchema: true })).toBeNull();
  });

  it("stellt ohne jedes Schema trotzdem auf hell", () => {
    const werte = exportHelligkeitsTokens({ themeQuelle: undefined, eigenesSchema: false });
    expect(werte!["--color-bg"]).toBe(hell["--color-bg"]);
  });
});

// Ein geteiltes Bild wird ohne die Seite drumherum gelesen. Was die Seite im
// Text erklärt, muss deshalb an der Zahl selbst stehen.
describe("Was das Bild allein tragen muss", () => {
  it("nennt den Datenstand des Datensatzes, nicht den heutigen Tag", () => {
    const client = lies("app/(embed)/embed/zubau-erneuerbare-atom/client.tsx");
    // Ohne Angabe stempelt der Quellenvermerk das Abrufdatum — bei Live-Daten
    // richtig, neben einer Reihe, die 2024 endet, eine falsche Aussage.
    expect(client).toContain("COUNTRY_COMPARE_META.dataAsOf");
  });

  it("sagt an der Kernenergie-Zahl, dass der Import darin steckt", () => {
    const client = lies("app/(embed)/embed/strommix/client.tsx");
    // Die Zahl summiert heimische Erzeugung und rechnerischen Import; seit
    // April 2023 ist sie ausschließlich Import. „Kernenergie" allein liest sich
    // im weitergereichten Bild als deutsche Erzeugung.
    expect(client).toMatch(/label="Kernenergie \(inkl\. Import\)"/);
  });
});

describe("Aktionsmenü in einer Karte, die abschneidet", () => {
  const bar = lies("components/ChartActionBar.tsx");

  it("richtet sich nach der Karte, nicht nach einer festen Seite", () => {
    // Beide Fehlrichtungen sind real vorgekommen: linksbündig ab einem Knopf am
    // rechten Rand ragte das Menü rechts hinaus, rechtsbündig ab einem nach dem
    // Umbruch links stehenden Knopf nach links. Die Karte schneidet beides ab
    // (overflow: hidden). Deshalb wird gemessen statt gesetzt.
    expect(bar).toContain("clippendeGrenze");
    expect(bar).toMatch(/overflowX/);
    // Gemessen wird am Knopf, BEVOR das Menü steht — sonst säße es einen Frame
    // lang an der falschen Stelle.
    expect(bar).toMatch(/setAusrichtung/);
  });

  it("die Menübreite steht nur an einer Stelle", () => {
    // Sie entscheidet zugleich über die Aufklapp-Richtung; zwei Kopien liefen
    // sonst auseinander und die Richtung würde für eine Breite gewählt, die das
    // Menü gar nicht hat.
    expect(bar).toContain("MENU_BREITE");
    expect(bar.match(/\b184\b/g) ?? []).toHaveLength(1);
  });
});
