import { describe, expect, it } from "vitest";
import type { Adresse, Aufloeser, Hop, Oeffner } from "../fremdbild";
import { FREMDBILD_MAX_BYTES, fremdbildTyp, holeFremdbild, istOeffentlicheIp, pruefeZiel } from "../fremdbild";

/**
 * The installer logo is fetched server-side (so visitor IPs stay with us). That
 * makes our server fetch a URL the installer controls — these tests pin the
 * SSRF guard, the format check and the size cap. Each was broken on purpose
 * once before check-in and turned red.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(40).fill(0)]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const OEFFENTLICH: Adresse = { address: "93.184.215.14", family: 4 };

function dns(tabelle: Record<string, Adresse[]>): Aufloeser {
  return async (host) => {
    const r = tabelle[host];
    if (!r) throw new Error("ENOTFOUND");
    return r;
  };
}

/** Fake network: answers per URL; records every connection it was asked to open. */
function netz(antworten: Record<string, Hop>) {
  const geoeffnet: { url: string; adresse: string }[] = [];
  const oeffnen: Oeffner = async (url, adresse) => {
    geoeffnet.push({ url: url.toString(), adresse: adresse.address });
    const a = antworten[url.toString()];
    if (!a) throw new Error("unexpected fetch " + url.toString());
    return a;
  };
  return { oeffnen, geoeffnet };
}

const ok = (body: Uint8Array): Hop => ({ status: 200, location: null, body });
const weiter = (location: string): Hop => ({ status: 302, location, body: new Uint8Array(0) });

describe("Adressen: nur öffentliche", () => {
  it("weist interne Bereiche ab", () => {
    for (const ip of [
      "127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1",
      "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255",
      "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254",
      "64:ff9b::a9fe:a9fe", "ff02::1",
    ]) {
      expect(istOeffentlicheIp(ip), ip).toBe(false);
    }
  });

  it("lässt öffentliche Adressen durch", () => {
    for (const ip of ["93.184.215.14", "8.8.8.8", "172.32.0.1", "2a00:1450:4001:80b::200e", "::ffff:8.8.8.8"]) {
      expect(istOeffentlicheIp(ip), ip).toBe(true);
    }
  });

  it("kein Name gilt als öffentlich, ohne aufgelöst zu sein", () => {
    expect(istOeffentlicheIp("localhost")).toBe(false);
  });
});

describe("Ziel eines Sprungs", () => {
  const auf = dns({ "betrieb.de": [OEFFENTLICH], "intern.de": [{ address: "10.1.2.3", family: 4 }] });

  it("nur http und https, nur Standard-Ports, keine Zugangsdaten", async () => {
    expect(await pruefeZiel("file:///etc/passwd", auf)).toBeNull();
    expect(await pruefeZiel("ftp://betrieb.de/logo.png", auf)).toBeNull();
    expect(await pruefeZiel("https://betrieb.de:6379/x", auf)).toBeNull();
    expect(await pruefeZiel("https://user:pw@betrieb.de/x", auf)).toBeNull();
    expect(await pruefeZiel("https://betrieb.de/logo.png", auf)).not.toBeNull();
    expect(await pruefeZiel("http://betrieb.de:80/logo.png", auf)).not.toBeNull();
  });

  it("ein Name, der auf eine interne Adresse zeigt, wird abgewiesen", async () => {
    expect(await pruefeZiel("https://intern.de/logo.png", auf)).toBeNull();
  });

  it("EINE interne Adresse unter mehreren genügt zur Ablehnung", async () => {
    const gemischt = dns({ "gemischt.de": [OEFFENTLICH, { address: "127.0.0.1", family: 4 }] });
    expect(await pruefeZiel("https://gemischt.de/x", gemischt)).toBeNull();
  });

  it("IP-Literale werden direkt geprüft", async () => {
    expect(await pruefeZiel("http://169.254.169.254/latest/meta-data", auf)).toBeNull();
    expect(await pruefeZiel("http://[::1]/x", auf)).toBeNull();
  });
});

describe("Abruf des Bildes", () => {
  const auf = dns({
    "betrieb.de": [OEFFENTLICH],
    "cdn.betrieb.de": [OEFFENTLICH],
    "intern.de": [{ address: "192.168.0.10", family: 4 }],
  });

  it("holt ein PNG und verbindet mit genau der geprüften Adresse", async () => {
    const n = netz({ "https://betrieb.de/logo.png": ok(PNG) });
    const r = await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen });
    expect(r?.typ).toBe("image/png");
    expect(n.geoeffnet).toEqual([{ url: "https://betrieb.de/logo.png", adresse: OEFFENTLICH.address }]);
  });

  it("öffnet NIE eine Verbindung zu einem internen Ziel", async () => {
    const n = netz({});
    expect(await holeFremdbild("https://intern.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
    expect(n.geoeffnet).toHaveLength(0);
  });

  it("eine Weiterleitung auf ein internes Ziel wird nicht verfolgt", async () => {
    const n = netz({ "https://betrieb.de/logo.png": weiter("http://169.254.169.254/latest/meta-data/") });
    expect(await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
    expect(n.geoeffnet).toHaveLength(1);
  });

  it("eine Weiterleitung auf einen Namen mit interner Adresse ebenso", async () => {
    const n = netz({ "https://betrieb.de/logo.png": weiter("https://intern.de/logo.png") });
    expect(await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
    expect(n.geoeffnet).toHaveLength(1);
  });

  it("folgt einer öffentlichen Weiterleitung, auch relativ", async () => {
    const n = netz({
      "https://betrieb.de/logo.png": weiter("https://cdn.betrieb.de/a"),
      "https://cdn.betrieb.de/a": weiter("/b.png"),
      "https://cdn.betrieb.de/b.png": ok(PNG),
    });
    const r = await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen });
    expect(r?.typ).toBe("image/png");
  });

  it("höchstens drei Weiterleitungen", async () => {
    const n = netz({
      "https://betrieb.de/0": weiter("/1"),
      "https://betrieb.de/1": weiter("/2"),
      "https://betrieb.de/2": weiter("/3"),
      "https://betrieb.de/3": weiter("/4"),
      "https://betrieb.de/4": ok(PNG),
    });
    expect(await holeFremdbild("https://betrieb.de/0", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
    expect(n.geoeffnet).toHaveLength(4);
  });

  it("SVG wird abgewiesen, auch mit Bild-Endung", async () => {
    const n = netz({ "https://betrieb.de/logo.png": ok(SVG) });
    expect(await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
  });

  it("zu groß wird abgewiesen", async () => {
    const gross = new Uint8Array(FREMDBILD_MAX_BYTES + 1);
    gross.set(PNG);
    const n = netz({ "https://betrieb.de/logo.png": ok(gross) });
    expect(await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
  });

  it("ein Fehlerstatus liefert nichts", async () => {
    const n = netz({ "https://betrieb.de/logo.png": { status: 500, location: null, body: PNG } });
    expect(await holeFremdbild("https://betrieb.de/logo.png", { aufloesen: auf, oeffnen: n.oeffnen })).toBeNull();
  });
});

describe("Format an den ersten Bytes", () => {
  it("erkennt die fünf Rasterformate", () => {
    expect(fremdbildTyp(PNG)).toBe("image/png");
    expect(fremdbildTyp(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    expect(fremdbildTyp(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(fremdbildTyp(new TextEncoder().encode("GIF89a\0\0"))).toBe("image/gif");
    expect(fremdbildTyp(new Uint8Array([0, 0, 1, 0, 1, 0, 16, 16]))).toBe("image/x-icon");
  });

  it("SVG, HTML und HEIC sind keine", () => {
    expect(fremdbildTyp(SVG)).toBeNull();
    expect(fremdbildTyp(new TextEncoder().encode("<!doctype html><html>"))).toBeNull();
    expect(fremdbildTyp(new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode("ftypheic")]))).toBeNull();
  });
});
