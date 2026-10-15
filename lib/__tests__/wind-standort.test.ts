import { describe, expect, it } from "vitest";
import type { Flaeche } from "../gpkg-punkt";
import { wgs84NachUtm32 } from "../utm32";
import {
  FERN_M,
  GRENZ_TOLERANZ_M,
  gemeindeFlaechen,
  koordinateGenau,
  nenntGemeinde,
  windGemeinde,
} from "../wind-standort";

describe("wgs84NachUtm32", () => {
  it("trifft den Mittelmeridian: Meridianbogen × 0,9996", () => {
    const p = wgs84NachUtm32(48, 9);
    expect(p.x).toBeCloseTo(500000, 3);
    // GRS80 meridian arc to 48° N = 5,318,427.27 m.
    expect(p.y).toBeCloseTo(5318427.27 * 0.9996, 0);
  });
  it("Kölner Dom liegt bei rund E 356.559 / N 5.645.280", () => {
    const p = wgs84NachUtm32(50.941278, 6.958281);
    expect(Math.abs(p.x - 356559)).toBeLessThan(5);
    expect(Math.abs(p.y - 5645280)).toBeLessThan(10);
  });
});

/** A square municipality of `seite` metres, south-west corner at (x0, y0) in UTM. */
function quadrat(id: string, name: string, x0: number, y0: number, seite: number): Flaeche {
  return {
    id,
    name,
    minX: x0,
    minY: y0,
    maxX: x0 + seite,
    maxY: y0 + seite,
    ringe: [[[x0, y0], [x0 + seite, y0], [x0 + seite, y0 + seite], [x0, y0 + seite], [x0, y0]]],
  };
}

// Anchor near Steinfurt; build two adjacent 10 km municipalities west/east of it,
// and a far one 30 km east.
const basis = wgs84NachUtm32(52.15, 7.35);
const X0 = Math.floor(basis.x / 1000) * 1000 - 10000;
const Y0 = Math.floor(basis.y / 1000) * 1000 - 5000;
const flaechen: Flaeche[] = [
  quadrat("05566064", "Nordwalde", X0, Y0, 10000),
  quadrat("05566084", "Steinfurt", X0 + 10000, Y0, 10000),
  quadrat("05566999", "Fernhausen", X0 + 50000, Y0, 10000),
];
const namen = new Map(flaechen.map((f) => [f.id, f.name]));
const welt = {
  ...gemeindeFlaechen(flaechen, (x, y) => {
    for (const f of flaechen) if (x >= f.minX && x <= f.maxX && y >= f.minY && y <= f.maxY) return f.id;
    return null;
  }),
  name: (ags: string) => namen.get(ags),
};

/** lat/lon strings (6 decimals) of a UTM point — found by a short search, the inverse is not needed elsewhere. */
function punkt(x: number, y: number): { breitengrad: string; laengengrad: string } {
  let lat = 52.15;
  let lon = 7.35;
  for (let i = 0; i < 50; i++) {
    const p = wgs84NachUtm32(lat, lon);
    lat += (y - p.y) / 111_200;
    lon += (x - p.x) / (111_200 * Math.cos((lat * Math.PI) / 180));
  }
  return { breitengrad: lat.toFixed(6), laengengrad: lon.toFixed(6) };
}

const inSteinfurt = punkt(X0 + 15000, Y0 + 5000);

describe("windGemeinde", () => {
  it("Steinfurt: im Register Nordwalde, Ort und Gemarkung Steinfurt, steht in Steinfurt → Standort", () => {
    const z = windGemeinde({ registerAgs: "05566064", ...inSteinfurt, ort: "Steinfurt", gemarkung: "Burgsteinfurt" }, welt);
    expect(z).toEqual({ regionId: "05566084", quelle: "standort" });
  });

  it("ohne Text entscheidet die Koordinate", () => {
    expect(windGemeinde({ registerAgs: "05566064", ...inSteinfurt }, welt).regionId).toBe("05566084");
  });

  it("stimmen Register und Standort überein, bleibt alles", () => {
    expect(windGemeinde({ registerAgs: "05566084", ...inSteinfurt }, welt)).toMatchObject({ grund: "gleich" });
  });

  it("ohne Koordinate bleibt der Registerschlüssel", () => {
    expect(windGemeinde({ registerAgs: "05566064", breitengrad: "", laengengrad: null }, welt)).toMatchObject({
      regionId: "05566064",
      grund: "ohne-koordinate",
    });
  });

  it("grobe Koordinaten verschieben nichts", () => {
    const z = windGemeinde({ registerAgs: "05566064", breitengrad: "52.15", laengengrad: "7.5" }, welt);
    expect(z).toMatchObject({ regionId: "05566064", grund: "ungenau" });
  });

  it("knapp jenseits der Grenze (innerhalb der Toleranz) bleibt der Registerschlüssel", () => {
    const p = punkt(X0 + 10000 + GRENZ_TOLERANZ_M / 2, Y0 + 5000);
    expect(windGemeinde({ registerAgs: "05566064", ...p }, welt)).toMatchObject({ regionId: "05566064", grund: "grenznah" });
  });

  it("deutlich jenseits der Toleranz wird verschoben", () => {
    const p = punkt(X0 + 10000 + GRENZ_TOLERANZ_M * 3, Y0 + 5000);
    expect(windGemeinde({ registerAgs: "05566064", ...p }, welt).regionId).toBe("05566084");
  });

  it("nennen Ort und Gemarkung nur die Registergemeinde, ist die Koordinate verdächtig", () => {
    const z = windGemeinde({ registerAgs: "05566064", ...inSteinfurt, ort: "Nordwalde", gemarkung: "Nordwalde" }, welt);
    expect(z).toMatchObject({ regionId: "05566064", grund: "text-widerspricht" });
  });

  it("nennt der Text beide, entscheidet die Koordinate", () => {
    const z = windGemeinde({ registerAgs: "05566064", ...inSteinfurt, ort: "Nordwalde", gemarkung: "Steinfurt" }, welt);
    expect(z.regionId).toBe("05566084");
  });

  it("weit weg und ohne Bestätigung im Text bleibt der Registerschlüssel", () => {
    const p = punkt(X0 + 55000, Y0 + 5000);
    expect(FERN_M).toBeLessThan(40000);
    expect(windGemeinde({ registerAgs: "05566064", ...p, ort: "Irgendwo" }, welt)).toMatchObject({ grund: "zu-weit" });
  });

  it("weit weg, aber der Text bestätigt die neue Gemeinde → Standort", () => {
    const p = punkt(X0 + 55000, Y0 + 5000);
    expect(windGemeinde({ registerAgs: "05566064", ...p, ort: "Fernhausen" }, welt).regionId).toBe("05566999");
  });

  it("außerhalb jeder Gemeinde (See, Tippfehler) bleibt der Registerschlüssel", () => {
    const p = punkt(X0 + 35000, Y0 + 5000);
    expect(windGemeinde({ registerAgs: "05566064", ...p }, welt)).toMatchObject({ grund: "ausserhalb" });
  });
});

describe("Hilfen", () => {
  it("koordinateGenau verlangt drei Nachkommastellen", () => {
    expect(koordinateGenau("52.103246")).toBe(true);
    expect(koordinateGenau("52.103")).toBe(true);
    expect(koordinateGenau("51.47")).toBe(false);
    expect(koordinateGenau("49")).toBe(false);
    expect(koordinateGenau("")).toBe(false);
  });

  it("nenntGemeinde vergleicht ganze Wörter und kürzt Zusätze", () => {
    expect(nenntGemeinde("Steinfurt", "Steinfurt")).toBe(true);
    expect(nenntGemeinde("Burgsteinfurt", "Steinfurt")).toBe(false);
    expect(nenntGemeinde("Halle", "Halle (Saale)")).toBe(true);
    expect(nenntGemeinde("Geislingen-Stötten", "Geislingen an der Steige")).toBe(true);
    expect(nenntGemeinde("Remlingen", "Remlingen-Semmenstedt")).toBe(true);
    expect(nenntGemeinde("Groß Pankow", "Groß Pankow (Prignitz)")).toBe(true);
    expect(nenntGemeinde("Großenhain", "Groß Pankow (Prignitz)")).toBe(false);
  });
});
