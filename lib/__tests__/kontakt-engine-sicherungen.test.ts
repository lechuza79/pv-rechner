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
import { aufEigenerWebsite, ERSTER_FEHLVERSUCH, FUNDSTELLE_ENTFERNT, FUNDSTELLE_UNLESBAR, freigabeUrteil } from "../../scripts/lib/kontakt-freigabe";

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
    expect(k).toMatch(/\.or\("kontakt_email\.is\.null,kontakt_sperrgrund\.not\.is\.null"\)/);
    // No other place writes the note.
    expect(r.match(/kontakt_hand_notiz: `/g)?.length).toBe(1);
    expect(lies("scripts/windbetreiber-kontakte.ts")).not.toMatch(/kontakt_hand_notiz/);
  });
  it("a page a person found is a lead for the engine, on the same website only", () => {
    const k = lies("scripts/windbetreiber-kontakte.ts");
    expect(k).toMatch(/\(ziel !== domain && !weitereSitesVon\(domain\)\.includes\(siteOf\(ziel\)\)\)\) throw/);
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

describe("Klasse 28 — kein Lauf überschreibt eine Entscheidung von Hand", () => {
  const r = lies("scripts/windbetreiber-refresh.ts");
  const neu = r.slice(r.indexOf("async function neuBewerten()"), r.indexOf("// ─── Manual pass"));
  it("re-judging skips manual candidates and every operator a person decided", () => {
    expect(neu).toMatch(/if \(k\.quelle === "manuell" \|\| k\.quelle === "geschwister"\) continue;/);
    // A sibling's proof is re-verified, never judged from an imprint it never had.
    expect(neu).toMatch(/Schwesterbeleg entfallen/);
    expect(neu).toMatch(/if \(vonHandEntschieden\(z\)\) \{[^\n]*widerspruch\.push[^\n]*continue; \}/);
    expect(neu).toMatch(/\|\| vonHandEntschieden\(z\)\) continue;/);
  });
  it("a person can withdraw a wrong website, and the withdrawal is itself a hand decision", () => {
    const z = r.slice(r.indexOf("async function zuruecknehmen()"), r.indexOf("/** A proven website on which a person found no contact."));
    expect(z).toMatch(/grund\.length < 40/);
    expect(z).toMatch(/const ablehnung = \{ ergebnis: "abgelehnt", grund: `von Hand zurückgenommen: /);
    expect(z).toMatch(/suche_notiz: `\$\{VON_HAND\} \$\{z\.website\} zurückgenommen: /);
    expect(z).toMatch(/\.\.\.kontaktFelder\(null, null\)/);
  });

  it("both hand marks count as a decision", () => {
    expect(r).toMatch(/return n\.startsWith\(VON_HAND\) \|\| n\.startsWith\(VON_HAND_GEFUNDEN\);/);
    expect(r).toMatch(/suche_notiz: `\$\{VON_HAND_GEFUNDEN\}, /);
  });
  it("the imprint run only takes operators without website and without a person's 'none'", () => {
    const imp = r.slice(r.indexOf("async function impressumLauf()"), r.indexOf("async function geschwisterLauf()"));
    expect(imp).toMatch(/filter\(\(z\) => !z\.website && !\(z\.suche_notiz \?\? ""\)\.startsWith\(VON_HAND\)\)/);
    // An unreachable or failed check never closes an operator.
    expect(imp).not.toMatch(/gesucht_am/);
  });
});

describe("Klasse 29 — falsch eingeordnet heißt übergeben, nicht nur markieren", () => {
  it("hands utilities over as search candidates, measures without --schreiben, skips citizens' companies", () => {
    const r = lies("scripts/windbetreiber-refresh.ts");
    const u = r.slice(r.indexOf("async function uebergeben()"), r.indexOf("// ─── Completeness"));
    expect(u).toMatch(/if \(!flag\("schreiben"\)\) \{ console\.log\("Nur gemessen/);
    expect(u).toMatch(/herkunft: "suche"/);
    expect(u).toMatch(/!\/b\(\?:ü\|ue\)rger\/i\.test\(z\.name\)/);
    expect(u).toMatch(/!bekannt\.has\(z\.website\)/);
  });
});

describe("Klasse 35 — ein einzelner Lesefehler sperrt keinen Kontakt (Outreach, 06.10.2026)", () => {
  it("blocks at once only for a finding about the source", () => {
    expect(freigabeUrteil("Adresse steht nicht mehr auf der Fundstelle", null)).toEqual({ grund: "Adresse steht nicht mehr auf der Fundstelle", sperren: true });
    expect(freigabeUrteil(FUNDSTELLE_ENTFERNT, null).sperren).toBe(true);
    expect(freigabeUrteil(null, `${ERSTER_FEHLVERSUCH} ${FUNDSTELLE_UNLESBAR}`)).toEqual({ grund: null, sperren: false });
  });
  it("marks a first unreadable read and blocks at the second", () => {
    const erst = freigabeUrteil(FUNDSTELLE_UNLESBAR, null);
    expect(erst).toEqual({ grund: `${ERSTER_FEHLVERSUCH} ${FUNDSTELLE_UNLESBAR}`, sperren: false });
    expect(freigabeUrteil(FUNDSTELLE_UNLESBAR, erst.grund).sperren).toBe(true);
  });
  it("the wind release writes through the rule and keeps the release on a first failure", () => {
    const k = lies("scripts/kontakte-freigabe.ts");
    expect(k).toMatch(/const u = freigabeUrteil\(grund, vorherWind\.get\(schluessel\)\);/);
    expect(k).toMatch(/: \{ kontakt_sperrgrund: u\.grund \};/);
    expect(lies("scripts/lib/kontakt-freigabe.ts")).toMatch(/HTTP 40\[4\]\|HTTP 410\/\.test\(da\.fehler/);
  });
});

describe("Klasse 38 — Bestandsregeln nie in der geteilten Maschine", () => {
  it("the wind contact rules live in the stock's script, outside the files hashed into the municipal rule version", async () => {
    const { JUDGE_FILES } = await import("../../scripts/lib/contact-v2-config");
    expect(JUDGE_FILES.some((f: string) => /windbetreiber|kontakt-lauf/.test(f))).toBe(false);
    for (const f of JUDGE_FILES) expect(lies(f), f).not.toMatch(/windbetreiber|allgemeinAuf|impressumPostfach/i);
    const k = lies("scripts/windbetreiber-kontakte.ts");
    expect(k).toMatch(/ergebnisForm: \(basis, _m, evidence\) => impressumPostfach\(basis, evidence\)/);
    expect(k).toMatch(/htmlVorbereiten: \{ kennung: "wind-\d+"/);
    // A change to the wind rules re-judges the wind results.
    expect(k).toMatch(/rules: windRegeln\(\)/);
  });
});

describe("Klasse 39 — Kontakt-Lücken der Handprüfung", () => {
  it("decodes bracket-written addresses, and only those", async () => {
    const { klammerAdressen } = await import("../../scripts/windbetreiber-kontakte");
    expect(klammerAdressen("windmanager(at)wpd.de")).toBe("windmanager@wpd.de");
    expect(klammerAdressen("info(a)naturenergie-heidenrod.de")).toBe("info@naturenergie-heidenrod.de");
    expect(klammerAdressen("h.selzer(@)beg-hochwald.de")).toBe("h.selzer@beg-hochwald.de");
    expect(klammerAdressen("Windpark (at) Musterdorf")).toBe("Windpark (at) Musterdorf");
  });
  it("takes a clean imprint mailbox when nothing else was selected, whatever its name", async () => {
    const { impressumPostfach } = await import("../../scripts/windbetreiber-kontakte");
    const basis = { general: [], kanaele: {}, fundstellen: {} } as never;
    const ev = (email: string, url: string, reasons: string[] = []) => ({ email, url, reasons }) as never;
    const r = impressumPostfach(basis, [ev("socialmedia@geres-group.de", "https://geres-group.de/impressum/"), ev("jobs@geres-group.de", "https://geres-group.de/karriere/")]);
    expect(r).toMatchObject({ general: ["socialmedia@geres-group.de"], outcome: "general-only" });
    // A conflict on ANOTHER page does not matter; one on the imprint itself does.
    expect(impressumPostfach(basis, [ev("info@x.de", "https://x.de/impressum", ["published-address-conflict"])])).toEqual({});
    // A free-mail box in the imprint counts; on another page it stays foreign.
    expect(impressumPostfach(basis, [ev("matthes.kg@t-online.de", "https://matthes-kg.de/impressum/", ["mailbox-foreign-domain"])])).toMatchObject({ general: ["matthes.kg@t-online.de"] });
    expect(impressumPostfach(basis, [ev("info@agentur.de", "https://x.de/impressum", ["mailbox-foreign-domain"])])).toEqual({});
    expect(impressumPostfach(basis, [ev("a@t-online.de", "https://x.de/impressum", ["mailbox-foreign-domain", "excluded-purpose"])])).toEqual({});
    // Nothing is overridden when the engine already chose.
    expect(impressumPostfach({ general: ["info@x.de"], kanaele: {} } as never, [ev("a@x.de", "https://x.de/impressum")])).toEqual({});
  });
  it("treats customer-service and city-office boxes as general, never a person", async () => {
    const { WIND_ROLLENWERK } = await import("../../scripts/windbetreiber-kontakte");
    for (const m of ["cs", "kundenservice", "info.berlin", "customer-service"]) expect(WIND_ROLLENWERK.allgemein.test(m), m).toBe(true);
    for (const m of ["michael.monjean", "koenig", "kappler", "information"]) expect(WIND_ROLLENWERK.allgemein.test(m), m).toBe(false);
  });
  it("lets a redirect target or the imprint's domain count as the same website, in release and report", () => {
    expect(lies("scripts/kontakte-freigabe.ts")).toMatch(/weitereSites: weitere\.get\(r\.website\)/);
    expect(lies("scripts/lib/kontakt-freigabe.ts")).toMatch(/\(p\.weitereSites \?\? \[\]\)\.some\(\(d\) => aufEigenerWebsite\(p\.belegUrl!, d\)\)/);
    expect(lies("scripts/windbetreiber-refresh.ts")).toMatch(/!weitereSitesVon\(z\.website\)\.includes\(siteOf\(h \?\? ""\)\)/);
  });
  it("counts as the same website only a start-page redirect or the same name under another ending", () => {
    const k = lies("scripts/windbetreiber-kontakte.ts");
    const w = k.slice(k.indexOf("export function weitereSitesVon("), k.indexOf("function bestandAus("));
    expect(w).toMatch(/if \(impressumHerkunft\(i\.impressum_url, domain\) === "alias"\) out\.add/);
    expect(w).toMatch(/if \(pfad !== "\/" && pfad !== ""\) continue;/);
    expect(w).not.toMatch(/for \(const u of \[i\.impressum_url, i\.start\]\)/);
  });

  it("renders the page a person points to before judging it", () => {
    const k = lies("scripts/windbetreiber-kontakte.ts");
    const spur = k.slice(k.indexOf('if (mode === "spur")'), k.indexOf("const r = await recherchieren(bestand, e, BUDGET, { vonHand: true });"));
    expect(spur).toMatch(/const gerendert = await seiteGerendert\(url\);/);
    expect(spur).toMatch(/via: "browser-handspur"/);
  });
});

describe("Klasse 42 — Inhalt in Attributen von Web-Komponenten", () => {
  it("expands escaped HTML of a custom element, and nothing else", async () => {
    const { webKomponentenAusklappen } = await import("../web-komponenten");
    const roh = `<eon-ui-rte-renderer content="&lt;h5&gt;E.DIS Netz GmbH&lt;/h5&gt;&lt;p&gt;Langewahler Straße 60&lt;/p&gt;"></eon-ui-rte-renderer>`;
    expect(webKomponentenAusklappen(roh)).toMatch(/<h5>E\.DIS Netz GmbH<\/h5><p>Langewahler Straße 60<\/p>/);
    const normal = `<div content="&lt;b&gt;x&lt;/b&gt;"></div><my-el text="Hallo"></my-el>`;
    expect(webKomponentenAusklappen(normal)).toBe(normal);
  });
  it("is used by the browser read, the website check and the wind contact search", () => {
    expect(lies("scripts/lib/kontakt-browser.ts")).toMatch(/return webKomponentenAusklappen\(html\)/);
    expect(lies("scripts/windbetreiber-refresh.ts").match(/webKomponentenAusklappen\(r0\.html\)/g)?.length).toBe(2);
    expect(lies("scripts/windbetreiber-kontakte.ts")).toMatch(/webKomponentenAusklappen\(html\)/);
  });
});

describe("Klasse 43 — Serverfehler mit vollständiger Seite", () => {
  it("the website check reads a 5xx page when it carries a real page, and only there", () => {
    expect(lies("scripts/windbetreiber-refresh.ts").match(/fetchLive\([su], \{ auchServerfehler: true \}\)/g)?.length).toBe(2);
    const l = lies("scripts/lib/kontakt-lauf.ts");
    expect(l).toMatch(/opts\.auchServerfehler && res\.status >= 500/);
    expect(l).toMatch(/\.length < 2000\) return \{ error:/);
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
    expect(holen).toMatch(/if \(!abrufWiederholen\(alt\) && !ohneBrowser && !vonHandNeu\) return alt;/);
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
    for (const c of ["lastCheck()", "platzCheck(MAIN)", "zugangCheck(", "abhaengigkeitenCheck(", "paralleleLaeufeCheck(", "keineBezahlteSucheCheck(", "fehlendeSpalten(", "Registerstand gelesen", "Keine offenen Entscheidungen"]) {
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

  it("measures free space and fails below the limit", async () => {
    const { platzCheck } = await import("../../scripts/lib/vorflug");
    expect((await platzCheck("/", 0).pruefen()).ok).toBe(true);
    expect((await platzCheck("/", 1e9).pruefen()).ok).toBe(false);
  });

  it("a check that throws counts as failed, never as skipped", () => {
    expect(lies("scripts/lib/vorflug.ts")).toMatch(/catch \(e\) \{ ergebnisse\.push\(\{ name: c\.name, ok: false/);
  });
});
