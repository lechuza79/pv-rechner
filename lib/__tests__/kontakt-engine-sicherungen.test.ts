/**
 * The machine safeguards of the contact engine, one block per fault class of
 * docs/lehren/kontakt-engine-fehler.md. Each test checks the USE of a rule on
 * the path that matters, not only that the rule exists — a rule that exists but
 * is bypassed by one write looks exactly like a rule that works.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { nurBekannteSpalten, spaltenAusDdl } from "../ddl-spalten";
import { WINDBETREIBER_SQL } from "../windbetreiber-sql";
import { kontaktFelder, websiteFelder } from "../windbetreiber";
import { BEZAHLTE_SUCHE_FLAG, BezahlteSucheGesperrt, bezahlteSucheFreigabe } from "../../scripts/lib/bezahlte-suche";
import { aufEigenerWebsite } from "../../scripts/lib/kontakt-freigabe";

const WURZEL = resolve(__dirname, "../..");
const lies = (p: string) => readFileSync(resolve(WURZEL, p), "utf8");

function dateien(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(resolve(WURZEL, dir))) {
    const p = `${dir}/${n}`;
    if (n === "node_modules" || n.startsWith(".")) continue;
    if (statSync(resolve(WURZEL, p)).isDirectory()) out.push(...dateien(p));
    else if (/\.(ts|sh)$/.test(n)) out.push(p);
  }
  return out;
}

describe("Klasse 1 — bezahlte Suche nur mit ausdrücklicher Freigabe", () => {
  it("refuses without the flag and allows with it", () => {
    expect(() => bezahlteSucheFreigabe(["node", "x.ts"])).toThrow(BezahlteSucheGesperrt);
    expect(() => bezahlteSucheFreigabe(["node", "x.ts", BEZAHLTE_SUCHE_FLAG])).not.toThrow();
  });

  // Collection runs: everything that searches for organisations or contacts.
  // SEO ranking and backlink scripts use the service for what it is for.
  const ERHEBUNG = /kontakt|contact|fachbetrieb|presse|windbetreiber|solarpark|versorger|bestaende|kommunen-presse/;
  const erhebung = dateien("scripts").filter((d) => ERHEBUNG.test(d));

  it("every SERP fetch of a collection run passes the gate first, outside any try", () => {
    let gefunden = 0;
    for (const d of erhebung) {
      const zeilen = lies(d).split("\n");
      zeilen.forEach((z, i) => {
        if (!/fetch[^\n]*api\.dataforseo\.com\/v3\/serp\//.test(z)) return;
        gefunden++;
        // Up to the enclosing function's start: the gate, and no try between gate and fetch
        // would hide nothing — a try BEFORE the gate would swallow the refusal.
        const vorher = zeilen.slice(0, i).reverse();
        const fn = vorher.findIndex((v) => /^(?:export )?async function |^(?:export )?function /.test(v));
        const rumpf = vorher.slice(0, fn < 0 ? 40 : fn + 1).reverse().join("\n");
        expect(rumpf, `${d}:${i + 1} ruft die Suche ohne Freigabe`).toMatch(/bezahlteSucheFreigabe\(\)/);
        const gate = rumpf.lastIndexOf("bezahlteSucheFreigabe()");
        const tryVorGate = rumpf.slice(0, gate).lastIndexOf("try {");
        expect(tryVorGate, `${d}:${i + 1}: die Freigabe steht in einem try und würde verschluckt`).toBe(-1);
      });
    }
    // The four known clients; if this drops, a client moved and the test must follow it.
    expect(gefunden).toBeGreaterThanOrEqual(4);
  });

  it("no unattended script carries the flag or a search step", () => {
    for (const d of dateien("scripts").filter((x) => /nacht-.*\.sh$/.test(x))) {
      const t = lies(d);
      expect(t, d).not.toContain(BEZAHLTE_SUCHE_FLAG);
      expect(t, d).not.toMatch(/windbetreiber-refresh\.ts --suche|dataforseo/i);
    }
  });

  it("the wind stock has no machine search left at all", () => {
    const t = lies("scripts/windbetreiber-refresh.ts");
    expect(t).not.toMatch(/from "\.\/lib\/serp"|serp\(|dataforseo/i);
    expect(t).toMatch(/Es gibt keine Maschinen-Suche mehr/);
  });
});

describe("Klasse 2 — Spalten: Code ⊂ DDL ⊂ Datenbank", () => {
  const betreiber = spaltenAusDdl(WINDBETREIBER_SQL, "windbetreiber");
  const kandidaten = spaltenAusDdl(WINDBETREIBER_SQL, "windbetreiber_kandidaten");

  it("reads the columns from CREATE TABLE and ALTER TABLE, without the neighbour table's", () => {
    expect(betreiber.has("mastr_nr")).toBe(true);
    expect(betreiber.has("kontakt_sperrgrund")).toBe(true);
    expect(betreiber.has("ergebnis")).toBe(false);
    expect(kandidaten.has("ergebnis")).toBe(true);
    expect(kandidaten.has("primary")).toBe(false);
    expect(spaltenAusDdl("CREATE TABLE IF NOT EXISTS t (a numeric(10,2), b text, PRIMARY KEY (a)); ALTER TABLE t ADD COLUMN IF NOT EXISTS c int;", "t")).toEqual(new Set(["a", "b", "c"]));
  });

  it("refuses a row with a column the DDL lacks", () => {
    expect(() => nurBekannteSpalten("windbetreiber", betreiber, [{ mastr_nr: "x", kontakt_neu: 1 }])).toThrow(/kontakt_neu/);
  });

  it("every row builder writes only declared columns", () => {
    const beleg = { kandidat: { domain: "a.de", quelle: "manuell" as const }, beleg: { wie: "name" as const, textstelle: "t" }, impressum: { impressum_url: "https://a.de/impressum" } };
    nurBekannteSpalten("windbetreiber", betreiber, [websiteFelder(beleg, "2026-10-06"), websiteFelder(null, "2026-10-06")]);
    nurBekannteSpalten("windbetreiber", betreiber, [kontaktFelder({ email: "info@a.de", kanal: "allgemein", url: "https://a.de/impressum" }, "2026-10-06"), kontaktFelder(null, null)]);
  });

  it("every write to the wind tables goes through the column check", () => {
    for (const d of ["scripts/windbetreiber-refresh.ts", "scripts/windbetreiber-kontakte.ts"]) {
      const zeilen = lies(d).split("\n");
      zeilen.forEach((z, i) => {
        if (!/\.from\((?:"windbetreiber[a-z_]*"|tabelle)\)\.(?:update|upsert|insert)\(/.test(z)) return;
        const davor = zeilen.slice(Math.max(0, i - 8), i + 1).join("\n");
        expect(davor, `${d}:${i + 1} schreibt ohne Spaltenprüfung`).toMatch(/spalten\(|nurBekannteSpalten\(/);
      });
    }
  });

  it("the preflight asks the live database for every DDL column of both tables", () => {
    const t = lies("scripts/windbetreiber-refresh.ts");
    expect(t).toMatch(/\["windbetreiber", "windbetreiber_kandidaten"\]\.map[\s\S]{0,200}fehlendeSpalten\(await db\(\), t, spaltenAusDdl\(WINDBETREIBER_SQL, t\)\)/);
  });
});

describe("Klasse 5 — seitenweises Lesen nur sortiert", () => {
  const ERHEBUNG = /kontakt|contact|fachbetrieb|presse|windbetreiber|solarpark|versorger|bestand|kommunen/;
  it("every paginated read of a collection script carries a sort order", () => {
    let gesehen = 0;
    for (const d of dateien("scripts").filter((x) => ERHEBUNG.test(x) && x.endsWith(".ts"))) {
      const zeilen = lies(d).split("\n");
      zeilen.forEach((z, i) => {
        if (!/\.range\(/.test(z)) return;
        gesehen++;
        const davor = zeilen.slice(Math.max(0, i - 8), i + 1).join("\n");
        expect(davor, `${d}:${i + 1} liest seitenweise ohne Sortierung`).toMatch(/\.order\(|q\.order\(k\)/);
      });
    }
    expect(gesehen).toBeGreaterThan(15);
  });
});

describe("Klasse 13 — Kontakt nur von der eigenen belegten Website", () => {
  it("knows a page of the site from a page elsewhere", () => {
    expect(aufEigenerWebsite("https://www.wpd.de/impressum", "wpd.de")).toBe(true);
    expect(aufEigenerWebsite("https://de.wpd.de/kontakt", "wpd.de")).toBe(true);
    expect(aufEigenerWebsite("https://notwpd.de/impressum", "wpd.de")).toBe(false);
    expect(aufEigenerWebsite("https://northdata.de/wpd", "wpd.de")).toBe(false);
  });

  it("the release of wind contacts demands the own website, and the check runs before any fetch", () => {
    expect(lies("scripts/kontakte-freigabe.ts")).toMatch(/domain: r\.website, nurEigeneWebsite: true/);
    const f = lies("scripts/lib/kontakt-freigabe.ts");
    expect(f.indexOf("nurEigeneWebsite && !aufEigenerWebsite")).toBeGreaterThan(-1);
    expect(f.indexOf("nurEigeneWebsite && !aufEigenerWebsite")).toBeLessThan(f.indexOf("const jeSeite"));
  });

  it("a contact never outlives its website or its evaluation", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    // A changed or withdrawn website clears the contact.
    expect(r.match(/websiteFelder\((?:best|null), HEUTE\), \.\.\.kontaktFelder\(null, null\)/g)?.length).toBeGreaterThanOrEqual(2);
    const k = lies("scripts/windbetreiber-kontakte.ts");
    // A website whose evaluation finds nothing writes "no contact", and old-rule results are refused.
    const schleife = k.slice(k.indexOf("for (const r of alle)"), k.indexOf("const felder = kontaktFelder(k, "));
    expect(schleife.length, "Schleife oder Kontaktfelder nicht gefunden").toBeGreaterThan(20);
    // Nothing may leave the loop before the fields are built — except a website
    // whose written contact already equals the result (with or without one).
    const ohneGleich = schleife.replace(/if \(z && \(z\.kontakt_email \?\? null\) === \(k\?\.email \?\? null\) && \(z\.kontakt_beleg_url \?\? null\) === \(k\?\.url \?\? null\)\) \{ unveraendert\+\+; continue; \}/, "");
    expect(ohneGleich).not.toMatch(/\bcontinue\b|\breturn\b/);
    expect(k).toMatch(/unter alten Regeln[\s\S]*erst --mode=evaluate/);
  });

  it("the completeness report flags a contact whose proof page is off the website", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    expect(r).toMatch(/liegt nicht auf \$\{z\.website\}/);
    expect(r).toMatch(/const kv = kontaktVerstoss\(z\)/);
  });
});

describe("Lückenlos — Website UND Kontakt, oder ein Vermerk von Hand", () => {
  it("VOLLSTÄNDIG needs no open operator, no open website without contact and no violation", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    expect(r).toMatch(/handOffen === 0 && kontaktOffen === 0 && verstoesse\.length === 0 \? "VOLLSTÄNDIG"/);
  });
  it("'no contact' is a person's note on a website without contact, never a machine's", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    const k = r.slice(r.indexOf("async function keinKontakt()"), r.indexOf("// ─── Completeness"));
    expect(k).toMatch(/notiz\.length < 40/);
    expect(k).toMatch(/kontakt_hand_notiz: `\$\{VON_HAND\} \$\{notiz\}`/);
    expect(k).toMatch(/\.is\("kontakt_email", null\)/);
    // No other place writes the note.
    expect(r.match(/kontakt_hand_notiz: `/g)?.length).toBe(1);
    expect(lies("scripts/windbetreiber-kontakte.ts")).not.toMatch(/kontakt_hand_notiz/);
  });
  it("a page a person found is a lead for the engine, on the same website only", () => {
    const k = lies("scripts/windbetreiber-kontakte.ts");
    expect(k).toMatch(/organisationsDomain\(url\) !== domain\) throw/);
    expect(k).toMatch(/recherchieren\(bestand, e, BUDGET, \{ vonHand: true \}\)/);
  });
});

describe("Klasse 26 — das gespeicherte Impressum ergänzt die Seite, ersetzt sie nicht", () => {
  it("stores the imprint text under its own address, so the live page is still fetched", () => {
    const k = lies("scripts/windbetreiber-kontakte.ts");
    const f = k.slice(k.indexOf("function impressumAlsSeite("), k.indexOf("function bestandAus("));
    expect(f).toMatch(/#text-der-website-pruefung/);
    expect(f).not.toMatch(/\{ url: imp\.impressum_url, /);
  });
});

describe("Klasse 5/14 — Berichte lügen nicht mit 0 MW", () => {
  it("a report without the register read fails instead of counting 0 MW", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    const stand = r.slice(r.indexOf("async function stand()"), r.indexOf("function kontaktVerstoss"));
    expect(stand).toMatch(/const st = registerPflicht\(\);/);
    expect(stand).not.toMatch(/registerCache\(\)|st\?\./);
    // The register read is found without the 3-GB export next to it.
    const cache = r.slice(r.indexOf("function registerCache()"), r.indexOf("function registerPflicht"));
    expect(cache).not.toMatch(/findCachedZip/);
  });
});

describe("Klasse 7 — ein gescheiterter Abruf ist keine Antwort", () => {
  it("the imprint cache retries a transient failure instead of returning it", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    const holen = r.slice(r.indexOf("async function impressumHolen("), r.indexOf("type Zeile = {"));
    expect(holen).toMatch(/if \(!abrufWiederholen\(alt\) && !ohneBrowser\) return alt;/);
    // A plain-fetch failure is no answer for a check that may use the browser.
    expect(holen).toMatch(/const ohneBrowser = LESART === "nachholen" && mitBrowser && !alt\.text && !alt\.startText && !alt\.browser_versucht/);
    // Re-judging never touches the network.
    expect(holen.indexOf('if (LESART === "zwischenspeicher") return alt;')).toBeLessThan(holen.indexOf("abrufWiederholen(alt)"));
    expect(r.slice(r.indexOf("async function neuBewerten()"), r.indexOf("async function neuBewerten()") + 80)).toMatch(/LESART = "zwischenspeicher"/);
    expect(holen).not.toMatch(/if \(existsSync\(datei\)\) return /);
  });
});

describe("Vorflug — jede bekannte Absturzursache vor dem Start", () => {
  it("runs every check, and the verdict is the conjunction", () => {
    const t = lies("scripts/windbetreiber-refresh.ts");
    const v = t.slice(t.indexOf("async function vorflugLauf()"), t.indexOf("async function main()"));
    for (const c of ["lastCheck()", "zugangCheck(", "abhaengigkeitenCheck(", "paralleleLaeufeCheck(", "keineBezahlteSucheCheck(", "fehlendeSpalten(", "Registerstand gelesen", "Keine offenen Entscheidungen"]) {
      expect(v, c).toContain(c);
    }
    expect(lies("scripts/lib/vorflug.ts")).toMatch(/const bereit = ergebnisse\.every\(\(e\) => e\.ok\)/);
  });

  it("the unattended run starts with the preflight and stops when it is not ready", () => {
    const n = lies("scripts/nacht-windbetreiber.sh");
    const vorflug = n.indexOf("--vorflug");
    expect(vorflug).toBeGreaterThan(-1);
    for (const schritt of ["--register", "--neu-bewerten", "--impressum", "--mode=research", "--mode=apply"]) expect(n.indexOf(schritt), schritt).toBeGreaterThan(vorflug);
    expect(n).toMatch(/ABBRUCH: Vorflug nicht bereit[\s\S]*exit 1/);
    // Both halves of a parallel step report their own failure.
    expect(n).toMatch(/wait "\$pid" \|\| echo "!!! FEHLGESCHLAGEN/);
  });

  it("a check that throws counts as failed, never as skipped", () => {
    expect(lies("scripts/lib/vorflug.ts")).toMatch(/catch \(e\) \{ ergebnisse\.push\(\{ name: c\.name, ok: false/);
  });
});
