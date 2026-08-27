// Erzeugt lib/bundesland-umrisse.ts aus public/geo/de-bundeslaender.geo.json.
//
// Warum vorberechnet und nicht zur Laufzeit: Die Umrisse stehen im Hintergrund
// einer Karte, die als BILD aufgenommen wird. Ein Nachladen wäre beim Auslösen
// des Exports womöglich noch unterwegs, und dann fehlte der Umriss im PNG, ohne
// dass irgendwo ein Fehler auftaucht. Die Rohdatei ist außerdem 260 kB; was hier
// herauskommt, ist ein Bruchteil davon.
//
// Der Erzeuger wird MITGECHECKT, nicht nur sein Ergebnis: Eine Datei, die als
// erzeugt gekennzeichnet ist, deren Generator es aber nicht mehr gibt, ist ein
// stehengebliebener Datenstand, den niemand bemerkt.
//
// Aufruf: npm run geo:umrisse

import { readFileSync, writeFileSync } from "node:fs";

type Ring = [number, number][];

/**
 * Douglas-Peucker. Die Toleranz ist in Grad und bewusst grob: Der Umriss steht
 * schwach hinter Text und soll die Form erkennbar machen, nicht die Küste.
 */
const TOLERANZ = 0.02;

function vereinfachen(punkte: Ring, toleranz: number): Ring {
  if (punkte.length < 3) return punkte;
  const [a] = punkte;
  const b = punkte[punkte.length - 1];
  let maxAbstand = 0;
  let index = 0;
  for (let i = 1; i < punkte.length - 1; i++) {
    const d = abstand(punkte[i], a, b);
    if (d > maxAbstand) {
      maxAbstand = d;
      index = i;
    }
  }
  if (maxAbstand <= toleranz) return [a, b];
  return [
    ...vereinfachen(punkte.slice(0, index + 1), toleranz).slice(0, -1),
    ...vereinfachen(punkte.slice(index), toleranz),
  ];
}

function abstand(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const tk = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + tk * dx), p[1] - (a[1] + tk * dy));
}

type Feature = {
  properties: { name: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

const daten = JSON.parse(readFileSync("public/geo/de-bundeslaender.geo.json", "utf8")) as {
  features: Feature[];
};

const SEITE = 100;

const eintraege = daten.features.map((f) => {
  const polygone: Ring[][] =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates as unknown as Ring[]]
      : (f.geometry.coordinates as unknown as Ring[][]);

  // Nur die AUSSENRINGE. Löcher (Enklaven) trügen bei dieser Deckkraft nichts
  // bei und verdoppelten die Datenmenge.
  const alleRinge = polygone.map((p) => vereinfachen(p[0], TOLERANZ)).filter((r) => r.length >= 3);

  // Winzige Exklaven fliegen raus, und zwar nicht aus Sparsamkeit: Hamburg
  // gehört die Insel Neuwerk, hundert Kilometer nordwestlich in der Nordsee.
  // Sie spannt die Bounding-Box des Landes auf ein Vielfaches auf, und das
  // Stadtgebiet — das, was man erkennen soll — schrumpft dabei auf einen Punkt.
  // Gemessen an der größten Teilfläche, nicht an einem festen Maß: Bremen
  // insgesamt ist kleiner als manche Insel.
  const flaeche = (r: Ring) =>
    Math.abs(
      r.reduce((summe, [x, y], i) => {
        const [x2, y2] = r[(i + 1) % r.length];
        return summe + (x * y2 - x2 * y);
      }, 0) / 2,
    );
  const groesste = Math.max(...alleRinge.map(flaeche));
  const ringe = alleRinge.filter((r) => flaeche(r) >= groesste * 0.03);

  const alle = ringe.flat();
  const minX = Math.min(...alle.map((p) => p[0]));
  const maxX = Math.max(...alle.map((p) => p[0]));
  const minY = Math.min(...alle.map((p) => p[1]));
  const maxY = Math.max(...alle.map((p) => p[1]));

  // Längengrade schrumpfen zum Pol hin. Ohne diese Korrektur wirkt jedes Land
  // spürbar zu breit — bei einem Umriss, den man an der Form erkennen soll, ist
  // das der ganze Unterschied.
  const breitenKorrektur = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const spanX = (maxX - minX) * breitenKorrektur;
  const spanY = maxY - minY;
  const massstab = SEITE / Math.max(spanX, spanY);
  const versatzX = (SEITE - spanX * massstab) / 2;
  const versatzY = (SEITE - spanY * massstab) / 2;

  const rund = (n: number) => Math.round(n * 10) / 10;
  const pfad = ringe
    .map(
      (r) =>
        "M" +
        r
          .map(
            ([x, y]) =>
              `${rund((x - minX) * breitenKorrektur * massstab + versatzX)} ` +
              // Bildschirm-Y läuft nach unten, geografisches Y nach oben.
              `${rund((maxY - y) * massstab + versatzY)}`,
          )
          .join("L") +
        "Z",
    )
    .join("");

  return [f.properties.name, pfad] as const;
});

const inhalt = `// AUTO-generiert von scripts/bundesland-umrisse.ts — nicht von Hand ändern.
// Neu erzeugen: npm run geo:umrisse
//
// Quelle: BKG, Verwaltungsgebiete VG250 (siehe lib/data-sources.ts). Stark
// vereinfacht und je Land seitenverhältnistreu in ein Quadrat von ${SEITE} × ${SEITE}
// eingepasst — die Umrisse stehen als schwaches Zeichen hinter einer Zahl, nicht
// als Karte. Für eine Karte sind sie zu grob; dafür gibt es public/geo/.

export const BUNDESLAND_UMRISS: Record<string, string> = {
${eintraege.map(([name, pfad]) => `  ${JSON.stringify(name)}: ${JSON.stringify(pfad)},`).join("\n")}
};

export const BUNDESLAND_UMRISS_SEITE = ${SEITE};
`;

writeFileSync("lib/bundesland-umrisse.ts", inhalt);
console.log(
  `${eintraege.length} Umrisse, ${Math.round(inhalt.length / 1024)} kB, ` +
    `Punkte gesamt ${eintraege.reduce((n, [, p]) => n + p.split(/[ML]/).length, 0)}`,
);
