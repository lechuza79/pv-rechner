/**
 * Which municipality a wind turbine belongs to: where it STANDS, not where it
 * was registered.
 *
 * Every Atlas number counts by the register's municipality key. For wind that
 * key is wrong for roughly one turbine in five. Steinfurt, measured 09.10.2026:
 * 38 turbines with 94 MW stand on its land, the register gives it 20 MW,
 * because 76 MW (Hollich-Sellen, Hollich, Dumte, Borghorst-Laer) were filed
 * under "Gemeinde: Nordwalde" — while Gemarkung, place, postcode and parcel of
 * the very same entries all say Steinfurt. The register does not check the
 * municipality field against the parcel. The town noticed and wrote to us.
 *
 * Rule: a turbine with a coordinate goes to the municipality whose area
 * contains it (BKG VG250, the official boundaries). These cases keep the
 * register key, all in the conservative direction:
 *
 *  - no usable coordinate, or the point lies in no municipality (sea, typo);
 *  - the coordinate is too coarse to place anything (fewer than three
 *    decimals: "49 / 12" or "51.47 / 8.1" stand in the register, kilometres
 *    from any park);
 *  - the point is within GRENZ_TOLERANZ_M of the register municipality. VG250
 *    follows the 1:250,000 landscape model, its borders sit up to about a
 *    hundred metres off; a turbine on the border is not evidence that the
 *    register is wrong;
 *  - the entry's own place and parcel district (Ort, Gemarkung) name the
 *    register municipality and not the one under the point. Then two fields
 *    agree against the coordinate, and the coordinate is the suspect: Gägelow
 *    filed a turbine 36 km away in Schossin, Esterwegen one 44 km away in
 *    Lingen. The text never MOVES a turbine — it only vetoes a move. Where it
 *    names neither (an Ortsteil as Gemarkung, an empty field), the coordinate
 *    decides, as in Steinfurt, where Ort and Gemarkung both confirm it;
 *  - the point is more than FERN_M from the register municipality and the
 *    text does not confirm the new one.
 *
 * Solar stays on the register key: a rooftop is registered at its own address,
 * the mismatch is a wind (and open-field) phenomenon of parks spread over
 * several parishes.
 */
import { imPolygon, type Flaeche } from "./gpkg-punkt";
import { wgs84NachUtm32 } from "./utm32";

export const GRENZ_TOLERANZ_M = 150;

/**
 * Beyond this distance from the register municipality a move needs the entry's
 * own text on its side. A park filed under the neighbour sits a few kilometres
 * off (Steinfurt: 11 km); 48 km (Simonswald → Dotternhausen, place field
 * "Gütenbach") is a typo in the coordinate, not in the municipality.
 */
export const FERN_M = 20_000;

export type WindZuordnung =
  | { regionId: string; quelle: "standort" }
  | {
      regionId: string;
      quelle: "register";
      grund: "gleich" | "ohne-koordinate" | "ungenau" | "ausserhalb" | "grenznah" | "text-widerspricht" | "zu-weit";
    };

/** At least three decimals (~100 m) in a raw register coordinate. */
export function koordinateGenau(raw: string | null | undefined): boolean {
  const s = (raw ?? "").trim();
  const komma = s.indexOf(".");
  return komma >= 0 && s.length - komma - 1 >= 3 && Number.isFinite(Number(s));
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "Halle (Saale)" → "halle", "Geislingen an der Steige" → "geislingen". */
function kern(name: string): string {
  return norm(name.split(/ \(|,| an der | am | im | in der | ob der | bei | vor der /)[0]);
}

/** Does a free-text place field name this municipality (as whole words)? */
export function nenntGemeinde(text: string | null | undefined, gemeindeName: string | undefined): boolean {
  if (!text || !gemeindeName) return false;
  const k = kern(gemeindeName);
  // "Remlingen-Semmenstedt" is written "Remlingen" in the place field.
  const teile = gemeindeName.includes("-") ? gemeindeName.split("-").map(kern).filter((t) => t.length >= 5) : [];
  const t = ` ${norm(text)} `;
  return [k, ...teile].some((w) => w.length >= 3 && t.includes(` ${w} `));
}

/** Distance from a point to a polygon's outline, in the polygon's unit (metres for UTM). */
export function abstandZumRand(x: number, y: number, f: Flaeche): number {
  let best = Infinity;
  for (const ring of f.ringe) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j];
      const [x2, y2] = ring[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
      const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
      if (d < best) best = d;
    }
  }
  return best;
}

export type GemeindeFlaechen = {
  /** Municipality key of the area containing the point, or null. */
  finde(x: number, y: number): string | null;
  /** All parts (islands, exclaves) of one municipality. */
  teile(ags: string): Flaeche[];
};

export function gemeindeFlaechen(flaechen: Flaeche[], finde: (x: number, y: number) => string | null): GemeindeFlaechen {
  const nachAgs = new Map<string, Flaeche[]>();
  for (const f of flaechen) {
    const liste = nachAgs.get(f.id);
    if (liste) liste.push(f);
    else nachAgs.set(f.id, [f]);
  }
  return { finde, teile: (ags) => nachAgs.get(ags) ?? [] };
}

export type WindEintrag = {
  registerAgs: string;
  /** Raw register strings — their precision is part of the evidence. */
  breitengrad: string | null | undefined;
  laengengrad: string | null | undefined;
  ort?: string | null;
  gemarkung?: string | null;
};

export function windGemeinde(e: WindEintrag, flaechen: GemeindeFlaechen & { name(ags: string): string | undefined }): WindZuordnung {
  const registerAgs = e.registerAgs;
  if (!e.breitengrad?.trim() || !e.laengengrad?.trim()) {
    return { regionId: registerAgs, quelle: "register", grund: "ohne-koordinate" };
  }
  if (!koordinateGenau(e.breitengrad) || !koordinateGenau(e.laengengrad)) {
    return { regionId: registerAgs, quelle: "register", grund: "ungenau" };
  }
  const lat = Number(e.breitengrad);
  const lon = Number(e.laengengrad);
  const { x, y } = wgs84NachUtm32(lat, lon);
  const standort = flaechen.finde(x, y);
  if (standort === null) return { regionId: registerAgs, quelle: "register", grund: "ausserhalb" };
  if (standort === registerAgs) return { regionId: registerAgs, quelle: "register", grund: "gleich" };
  const eigene = flaechen.teile(registerAgs);
  const abstand = eigene.length
    ? Math.min(...eigene.map((f) => (imPolygon(x, y, f) ? 0 : abstandZumRand(x, y, f))))
    : Infinity;
  if (abstand <= GRENZ_TOLERANZ_M) return { regionId: registerAgs, quelle: "register", grund: "grenznah" };
  const texte = [e.ort, ...(e.gemarkung ?? "").split(/[,;/]/)];
  const alt = flaechen.name(registerAgs);
  const neu = flaechen.name(standort);
  const sagtAlt = texte.some((t) => nenntGemeinde(t, alt));
  const sagtNeu = texte.some((t) => nenntGemeinde(t, neu));
  if (sagtAlt && !sagtNeu) return { regionId: registerAgs, quelle: "register", grund: "text-widerspricht" };
  if (abstand > FERN_M && !sagtNeu) return { regionId: registerAgs, quelle: "register", grund: "zu-weit" };
  return { regionId: standort, quelle: "standort" };
}
