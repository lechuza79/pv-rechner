import { test, expect } from "@playwright/test";
import { readFile } from "fs/promises";

// Smoke test for the widget export layer (components/WidgetExport.tsx).
//
// The image is the one surface nobody looks at while developing: a broken or
// half-empty PNG looks fine on the page and only shows up after someone shared
// it. So the test does what a person would do — click "download", then check
// that a real image came out and that everything the page explains only on
// hover made it into the file.

const OUT_DIR = process.env.EXPORT_OUT_DIR;

test.describe("Widget-Bildexport", () => {
  test("Grüngas-Widget: Download liefert ein vollständiges Bild", async ({ page }) => {
    await page.goto("/embed/gruengas-heizkosten");
    await expect(page.getByText("Die Rechnung über 20 Jahre")).toBeVisible();

    // Was nur im Bild steht, muss im Seiten-DOM vorbereitet sein …
    const exportOnly = page.locator("[data-sc-export-only]");
    await expect(exportOnly.first()).toBeAttached();
    // … und darf auf der Seite NICHT sichtbar sein.
    await expect(exportOnly.first()).toBeHidden();

    // Legende und die Texte hinter den „?" sitzen im Bild-Fuß.
    const footer = exportOnly.filter({ hasText: "Ersparnis über 20 Jahre" });
    await expect(footer).toContainText("Gasheizung");
    await expect(footer).toContainText("Wärmepumpe + PV");

    // Die Quelle steht NICHT mehr im Bild-Fuß, sondern senkrecht an der rechten
    // Kante — auf der Seite und im Bild dieselbe Stelle. Zwei Kopien derselben
    // Angabe waren der Grund, aus dem sie im Bild anders aussah als auf der
    // Seite. Der Vermerk muss vollständig sein (Bereitsteller UND Lizenz) und
    // darf nicht aus dem Bild geworfen werden.
    const kante = page.locator('[title^="Quelle:"]');
    await expect(kante).toHaveCount(1);
    await expect(kante).toContainText("Institut der deutschen Wirtschaft");
    // Der Zusatz hinter dem Namen (hier die Einordnung, bei Behördendaten der
    // Änderungshinweis) muss die Kürzung überleben — er ist bei dl-de/by-2-0
    // Pflichtbestandteil, und die alte Kurzform warf genau ihn weg.
    await expect(kante).toContainText("Preisszenarien");
    await expect(kante).toHaveAttribute("data-sc-export-css", /opacity:\s*1/);
    await expect(exportOnly.filter({ hasText: "Quelle:" })).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTitle("Als Bild herunterladen").click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();

    const buf = await readFile(path!);
    // Ein leeres/kollabiertes PNG ist wenige Dutzend Bytes groß — der häufigste
    // stille Fehler dieser Pipeline.
    expect(buf.byteLength).toBeGreaterThan(30_000);
    expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");

    // Maße direkt aus dem PNG-Header (IHDR): Breite/Höhe in Byte 16–24.
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBeGreaterThan(600);
    expect(height).toBeGreaterThan(400);

    if (OUT_DIR) await download.saveAs(`${OUT_DIR}/gruengas-export.png`);
  });
});

test.describe("Anlagenbestand-Widget", () => {
  test("Download liefert ein Bild, das für sich steht", async ({ page }) => {
    await page.goto("/embed/anlagenbestand-deutschland");
    await expect(page.getByText("Solaranlagen in Deutschland").first()).toBeVisible();

    // Die Legende steht bei diesem Widget SICHTBAR in der Karte, nicht nur im
    // Bild-Fuß: Zwei gleich lange Balken je Zeile sind ohne sie zwei
    // unbeschriftete Streifen — auf der Seite genauso wie im Bild.
    await expect(page.getByText("Anteil an der Anzahl")).toBeVisible();
    await expect(page.getByText("Anteil an der Leistung")).toBeVisible();

    // Quelle senkrecht an der Kante, vollständig samt Lizenz und
    // Änderungshinweis (dl-de/by-2-0 verlangt beides).
    const kante = page.locator('[title^="Quelle:"]');
    await expect(kante).toHaveCount(1);
    await expect(kante).toContainText("Bundesnetzagentur");
    await expect(kante).toContainText("dl-de/by-2-0");

    // Ein Anteil unter einem Prozent darf nicht als „0 %" dastehen: 19.374
    // Freiflächenanlagen sind nicht nichts. Im Bild kann das niemand nachfragen.
    await expect(page.locator("body")).not.toContainText(/(?<!\d,)\b0 %/);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTitle("Als Bild herunterladen").click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();

    const buf = await readFile(path!);
    expect(buf.byteLength).toBeGreaterThan(30_000);
    expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(buf.readUInt32BE(16)).toBeGreaterThan(600);
    expect(buf.readUInt32BE(20)).toBeGreaterThan(400);

    if (OUT_DIR) await download.saveAs(`${OUT_DIR}/anlagenbestand-export.png`);
  });
});

test.describe("Stromkosten-Rennen", () => {
  test("Download liefert ein Bild mit Stand, Legende und Annahmen", async ({ page }) => {
    await page.goto("/embed/pv-kostenrennen");
    await expect(page.getByText("Das Stromkosten-Rennen").first()).toBeVisible();

    // Der Schieberegler ist Bedienung und fliegt aus dem Bild; der eingestellte
    // Stand (Jahr, „nach n Jahren") steht als Text im Kopf und bleibt.
    await expect(page.locator("[data-sc-export-ignore]").filter({ has: page.getByRole("slider", { name: "Jahr wählen" }) })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Anhalten|Abspielen|Noch einmal/ })).toBeVisible();

    const exportOnly = page.locator("[data-sc-export-only]");
    await expect(exportOnly.first()).toBeAttached();
    await expect(exportOnly.first()).toBeHidden();
    // Legende (beide Haushalte) und die Texte hinter den „?" sitzen im Bild-Fuß.
    const footer = exportOnly.filter({ hasText: "Der Beispielhaushalt" });
    await expect(footer).toContainText("Ohne PV-Anlage");
    await expect(footer).toContainText("Mit PV-Anlage");
    await expect(footer).toContainText("Was hier zählt");

    const kante = page.locator('[title^="Quelle:"]');
    await expect(kante).toHaveCount(1);
    await expect(kante).toContainText("PVGIS");

    const downloadPromise = page.waitForEvent("download");
    await page.getByTitle("Als Bild herunterladen").click();
    const download = await downloadPromise;
    const buf = await readFile((await download.path())!);
    expect(buf.byteLength).toBeGreaterThan(30_000);
    expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(buf.readUInt32BE(16)).toBeGreaterThan(500);
    expect(buf.readUInt32BE(20)).toBeGreaterThan(400);
    if (OUT_DIR) await download.saveAs(`${OUT_DIR}/kostenrennen-export.png`);
  });
});
