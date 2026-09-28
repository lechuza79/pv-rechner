import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import type { Adresse, Aufloeser, Hop, Oeffner } from "./fremdbild";

// Real network I/O for `lib/fremdbild.ts`. Kept apart so the guard logic there
// is testable without a network — and so it is obvious that THIS file only
// does what it is told: connect to one already-checked address, never follow a
// redirect, stop reading at the size cap.

export const aufloesen: Aufloeser = async (host) => {
  const r = await dnsLookup(host, { all: true, verbatim: true });
  return r.map((a) => ({ address: a.address, family: a.family === 6 ? 6 : 4 }));
};

const UA = "Mozilla/5.0 (compatible; solar-check.io logo fetch; +https://solar-check.io/impressum)";

export const oeffnen: Oeffner = (url, adresse, maxBytes, timeoutMs) =>
  new Promise<Hop>((fertig, fehler) => {
    // The connection is PINNED to the address `pruefeZiel` checked. Without
    // this, the HTTP client would resolve the name a second time, and a
    // rebinding DNS server could answer 127.0.0.1 on that second query.
    const festeAdresse: LookupFunction = (_host, optionen, cb) => {
      const a: Adresse = adresse;
      if (optionen && (optionen as { all?: boolean }).all) {
        (cb as unknown as (e: null, r: { address: string; family: number }[]) => void)(null, [a]);
      } else {
        cb(null, a.address, a.family);
      }
    };

    const modul = url.protocol === "https:" ? https : http;
    const req = modul.request(
      url,
      {
        method: "GET",
        lookup: festeAdresse,
        headers: { "User-Agent": UA, Accept: "image/*" },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === "string" ? res.headers.location : null;
        const laenge = Number(res.headers["content-length"]);
        if (status === 200 && Number.isFinite(laenge) && laenge > maxBytes) {
          res.destroy();
          fertig({ status, location, body: new Uint8Array(maxBytes + 1) });
          return;
        }
        if (status !== 200) {
          res.resume();
          fertig({ status, location, body: new Uint8Array(0) });
          return;
        }
        const teile: Buffer[] = [];
        let gelesen = 0;
        res.on("data", (c: Buffer) => {
          teile.push(c);
          gelesen += c.length;
          if (gelesen > maxBytes) {
            // Stop at the cap; the caller sees length > maxBytes and rejects.
            res.destroy();
            fertig({ status, location, body: new Uint8Array(Buffer.concat(teile).subarray(0, maxBytes + 1)) });
          }
        });
        res.on("end", () => fertig({ status, location, body: new Uint8Array(Buffer.concat(teile)) }));
        res.on("error", fehler);
      },
    );
    // Hard deadline for the whole hop, not just socket idleness.
    const uhr = setTimeout(() => req.destroy(new Error("timeout")), timeoutMs);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", fehler);
    req.on("close", () => clearTimeout(uhr));
    req.end();
  });
