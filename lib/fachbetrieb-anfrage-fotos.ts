// ─── Photos attached to a request to a solar installer ─────────────────────────
//
// The photos go as mail attachments to a third party under OUR sender name.
// Name and MIME type come from the browser and are freely choosable, so they
// prove nothing: a script could attach an executable named "dach.jpg". The
// decision is therefore made on the file's first bytes (its signature), and the
// attachment name gets the extension of what the bytes actually are.
//
// Accepted: JPEG, PNG, WebP, HEIC/HEIF. The browser form always sends a
// downscaled JPEG; the other formats are allowed for robustness only.

export const MAX_FOTOS = 2;
/**
 * Upper bound for ONE photo as base64 text. Below the platform's 4.5 MB request
 * limit: the browser shrinks each photo to a few hundred kilobytes, so anything
 * above this is either a detour around that shrinking or an attempt to use the
 * route as storage.
 */
export const MAX_FOTO_BASE64_ZEICHEN = 1_500_000;

export type BildArt = "jpeg" | "png" | "webp" | "heic";

const ENDUNG: Record<BildArt, string> = { jpeg: "jpg", png: "png", webp: "webp", heic: "heic" };

// ISO-BMFF brands that denote HEIC/HEIF still images. AVIF ("avif", "avis") is
// deliberately NOT on the list.
const HEIF_MARKEN = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

function ascii(b: Uint8Array, von: number, bis: number): string {
  return String.fromCharCode(...b.subarray(von, bis));
}

/** Identifies the image format from its magic bytes; null if it is not one we accept. */
export function bildArtAusSignatur(b: Uint8Array): BildArt | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "png";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "webp";
  if (b.length >= 12 && ascii(b, 4, 8) === "ftyp" && HEIF_MARKEN.has(ascii(b, 8, 12))) return "heic";
  return null;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type GeprueftesFoto = { filename: string; content: string };
export type FotoPruefung =
  | { ok: true; fotos: GeprueftesFoto[] }
  | { ok: false; grund: "zu-viele" | "zu-gross" | "kein-bild" | "ungueltig" };

/**
 * Checks the raw `fotos` field of the request. Anything that is not clearly a
 * small image rejects the WHOLE request — silently dropping a file would send
 * the installer a mail that mentions photos which are not attached.
 */
export function pruefeFotos(roh: unknown): FotoPruefung {
  if (roh === undefined || roh === null) return { ok: true, fotos: [] };
  if (!Array.isArray(roh)) return { ok: false, grund: "ungueltig" };
  if (roh.length > MAX_FOTOS) return { ok: false, grund: "zu-viele" };

  const fotos: GeprueftesFoto[] = [];
  for (const eintrag of roh) {
    if (!eintrag || typeof eintrag !== "object") return { ok: false, grund: "ungueltig" };
    const { name, inhalt } = eintrag as { name?: unknown; inhalt?: unknown };
    if (typeof name !== "string" || typeof inhalt !== "string") return { ok: false, grund: "ungueltig" };
    if (inhalt.length === 0 || inhalt.length > MAX_FOTO_BASE64_ZEICHEN) return { ok: false, grund: "zu-gross" };
    if (!BASE64.test(inhalt)) return { ok: false, grund: "ungueltig" };

    const art = bildArtAusSignatur(new Uint8Array(Buffer.from(inhalt.slice(0, 64), "base64")));
    if (!art) return { ok: false, grund: "kein-bild" };

    // The name comes from the client. Everything except letters, digits, dot,
    // dash and space goes; the extension is replaced by the one the bytes prove.
    const basis = name.split(/[\\/]/).pop() ?? "";
    const stamm =
      basis.replace(/\.[^.]*$/, "").replace(/[^\w.\- ]+/g, "").replace(/\.+/g, "-").replace(/^[-. ]+/, "").slice(0, 70) ||
      "foto";
    fotos.push({ filename: `${stamm}.${ENDUNG[art]}`, content: inhalt });
  }
  return { ok: true, fotos };
}
