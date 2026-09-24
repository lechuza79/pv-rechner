/**
 * Die Rangabzeichen freistellen: den Papier-Hintergrund aus der Grafik nehmen.
 *
 * WARUM (23.09.2026, Befund des Betreibers): Die gelieferten Abzeichen sind
 * transparent — an den Ecken gemessen Alpha 0 —, tragen aber eine
 * halbdurchsichtige, gesprenkelte Papierfläche als Rechteck um das Motiv
 * (beim Gold-Abzeichen 58.909 Pixel mit Alpha zwischen 1 und 240). Auf einer
 * hellen Karte sieht man sie nicht; auf der dunklen Kopf-Kachel der Ortsseite
 * klebt das Abzeichen als hellgrauer Kasten.
 *
 * Diese Kurve wirft genau diese Fläche weg: Alles unter `UNTEN` wird
 * durchsichtig, alles über `OBEN` bleibt voll, dazwischen wird linear
 * gestreckt — die weichen Kanten des Motivs bleiben also weich, statt zu
 * einem harten Ausschnitt zu werden.
 *
 *   npx tsx scripts/rangabzeichen-freistellen.ts          (nur messen)
 *   npx tsx scripts/rangabzeichen-freistellen.ts --schreiben
 *
 * Quelle sind die gelieferten 512er-PNGs des Design-Pakets; geschrieben wird
 * eine verkleinerte Fassung für die Anzeigegröße (96 px, mit Reserve für
 * hochauflösende Bildschirme).
 * Kein WebP: Auf diesem Rechner gibt es keinen Encoder dafür, und ein PNG in
 * dieser Größe kostet weniger als der Umweg über eine neue Abhängigkeit.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const QUELLE = "public/atlas-design-preview/rank-badges";
const ZIEL = "public/gemeinde/rank-badges";
const ABZEICHEN = ["roof-1", "roof-2", "roof-3", "battery-1", "battery-2", "battery-3", "rank-mystery"];
const KANTE = 256;
/** Unterhalb dieser Deckkraft ist es Papier, oberhalb Motiv. Gemessen: die
 *  Fläche liegt bei 20–60, die Motivkanten bei 150 und darüber. */
const UNTEN = 110;
const OBEN = 190;

type Bild = { w: number; h: number; daten: Uint8Array };

function pngLesen(datei: string): Bild {
  const b = readFileSync(datei);
  let off = 8;
  let w = 0,
    h = 0,
    bit = 0,
    farbe = 0;
  const idat: Buffer[] = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const typ = b.subarray(off + 4, off + 8).toString();
    const daten = b.subarray(off + 8, off + 8 + len);
    if (typ === "IHDR") {
      w = daten.readUInt32BE(0);
      h = daten.readUInt32BE(4);
      bit = daten[8];
      farbe = daten[9];
    }
    if (typ === "IDAT") idat.push(daten);
    if (typ === "IEND") break;
    off += 12 + len;
  }
  if (bit !== 8 || farbe !== 6) throw new Error(`${datei}: erwartet 8-Bit RGBA`);
  const roh = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = new Uint8Array(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = roh[p++];
    for (let x = 0; x < stride; x++) {
      const links = x >= 4 ? out[y * stride + x - 4] : 0;
      const oben = y > 0 ? out[(y - 1) * stride + x] : 0;
      const eck = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      let v = roh[p + x];
      if (ft === 1) v += links;
      else if (ft === 2) v += oben;
      else if (ft === 3) v += (links + oben) >> 1;
      else if (ft === 4) {
        const pa = Math.abs(oben - eck),
          pb = Math.abs(links - eck),
          pc = Math.abs(links + oben - 2 * eck);
        v += pa <= pb && pa <= pc ? links : pb <= pc ? oben : eck;
      }
      out[y * stride + x] = v & 255;
    }
    p += stride;
  }
  return { w, h, daten: out };
}

function pngSchreiben(datei: string, bild: Bild) {
  const stride = bild.w * 4;
  const roh = Buffer.alloc(bild.h * (stride + 1));
  for (let y = 0; y < bild.h; y++) {
    roh[y * (stride + 1)] = 0;
    Buffer.from(bild.daten.subarray(y * stride, y * stride + stride)).copy(roh, y * (stride + 1) + 1);
  }
  const chunk = (typ: string, daten: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(daten.length);
    const körper = Buffer.concat([Buffer.from(typ), daten]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(körper) >>> 0);
    return Buffer.concat([len, körper, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(bild.w, 0);
  ihdr.writeUInt32BE(bild.h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    datei,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(roh, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

const CRC_TABELLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABELLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/** Papier weg, Motivkanten weich lassen. */
function freistellen(bild: Bild): number {
  let entfernt = 0;
  for (let i = 3; i < bild.daten.length; i += 4) {
    const a = bild.daten[i];
    if (a === 0) continue;
    if (a <= UNTEN) {
      bild.daten[i] = 0;
      entfernt++;
    } else if (a < OBEN) {
      bild.daten[i] = Math.round(((a - UNTEN) / (OBEN - UNTEN)) * 255);
    } else {
      bild.daten[i] = 255;
    }
  }
  return entfernt;
}

/**
 * Flächenmittel auf die Zielkante. Rechnet mit FRACHTIONALEN Grenzen, weil die
 * Vorlagen verschieden groß sind (512 und 1000 Pixel): Eine Fassung, die einen
 * ganzzahligen Teiler voraussetzte, griff bei 192 zwischen die Pixel und gab
 * gepunktetes Rauschen zurück — im Code unauffällig, erst im Bild zu sehen.
 */
function verkleinern(bild: Bild, kante: number): Bild {
  const daten = new Uint8Array(kante * kante * 4);
  const faktor = bild.w / kante;
  for (let y = 0; y < kante; y++) {
    const y0 = Math.floor(y * faktor),
      y1 = Math.min(bild.h, Math.ceil((y + 1) * faktor));
    for (let x = 0; x < kante; x++) {
      const x0 = Math.floor(x * faktor),
        x1 = Math.min(bild.w, Math.ceil((x + 1) * faktor));
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * bild.w + sx) * 4;
          const al = bild.daten[i + 3];
          // Farben mit der Deckkraft gewichten, sonst blutet das Papier
          // beim Verkleinern in die Kante zurück.
          r += bild.daten[i] * al;
          g += bild.daten[i + 1] * al;
          b += bild.daten[i + 2] * al;
          a += al;
          n++;
        }
      }
      const j = (y * kante + x) * 4;
      daten[j] = a ? Math.round(r / a) : 0;
      daten[j + 1] = a ? Math.round(g / a) : 0;
      daten[j + 2] = a ? Math.round(b / a) : 0;
      daten[j + 3] = n ? Math.round(a / n) : 0;
    }
  }
  return { w: kante, h: kante, daten };
}

const schreiben = process.argv.includes("--schreiben");
for (const name of ABZEICHEN) {
  const quelle = `${QUELLE}/${name}.png`;
  if (!existsSync(quelle)) {
    console.log(`${name}: keine Vorlage`);
    continue;
  }
  const bild = pngLesen(quelle);
  const entfernt = freistellen(bild);
  const klein = verkleinern(bild, KANTE);
  const ziel = `${ZIEL}/${name}.png`;
  if (schreiben) pngSchreiben(ziel, klein);
  const größe = schreiben ? readFileSync(ziel).length : 0;
  console.log(`${name}: ${entfernt.toLocaleString("de-DE")} Papier-Pixel entfernt${schreiben ? `, ${Math.round(größe / 1024)} kB` : ""}`);
}
if (!schreiben) console.log("\nNur gemessen. Schreiben mit --schreiben.");
