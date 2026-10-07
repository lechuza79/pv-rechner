import { describe, expect, it } from "vitest";
import {
  OFFEN,
  aussendungsLabel,
  baueKennzahlen,
  briefId,
  istSozial,
  ordneFundZu,
  presseId,
  type Brief,
  type Fund,
  type PresseMail,
} from "../aussand-kennzahlen";

// Real cases from 07.10.2026.
const niddaBrief: Brief = { regionId: "06440016", kampagne: "mail-he-rp-sl", gesendetAm: "2026-08-20T08:00:00Z", zugestellt: true };
const presseNidda: PresseMail = { zielgruppe: "presse", anlass: "pressemitteilung", bezug: ["06440"], gesendetAm: "2026-09-29T08:00:00Z", zugestellt: true };
const presseWesel: PresseMail = { zielgruppe: "presse", anlass: "pressemitteilung", bezug: ["05170"], gesendetAm: "2026-09-30T08:22:46Z", zugestellt: true };
const gude: Fund = { regionId: "06440016", url: "https://gude.news/nidda-bei-balkonkraftwerken-im-wetteraukreis-vorne/", mitLink: true, gesehenAb: "2026-09-18" };
const radiokw: Fund = { regionId: "05170024", url: "https://www.radiokw.de/artikel/moers-hat-kreisweit-die-meisten-solaranlagen-2774388", mitLink: true, gesehenAb: "2026-10-06" };

describe("Zuordnung eines Links zur Aussendung", () => {
  it("gude.news über Nidda gehört zum Brief, nicht zur späteren Pressemitteilung", () => {
    expect(ordneFundZu(gude, [niddaBrief], [presseNidda])?.aussendung).toBe(briefId("mail-he-rp-sl"));
  });

  it("auch ein Fund NACH der Pressemitteilung bleibt beim früheren Brief (suedhessen.app, 01.10.)", () => {
    const fund: Fund = { ...gude, url: "https://suedhessen.app/redaktionnidda/x/", gesehenAb: "2026-10-01" };
    expect(ordneFundZu(fund, [niddaBrief], [presseNidda])?.aussendung).toBe(briefId("mail-he-rp-sl"));
  });

  it("radiokw.de über Moers gehört zur Pressemitteilung über den Kreis Wesel (kein Brief an Moers)", () => {
    const z = ordneFundZu(radiokw, [niddaBrief], [presseWesel]);
    expect(z?.aussendung).toBe(presseId(presseWesel));
    expect(z?.sendTag).toBe("2026-09-30");
  });

  it("der Bezug deckt in beide Richtungen: Gemeinde-Bezug deckt den Kreis", () => {
    const kreisFund: Fund = { regionId: "07335", url: "https://x.de/a", mitLink: true, gesehenAb: "2026-10-01" };
    const m: PresseMail = { ...presseWesel, bezug: ["07335000"] };
    expect(ordneFundZu(kreisFund, [], [m])?.aussendung).toBe(presseId(m));
  });

  it("am selben Tag gewinnt der Brief vor der Pressemitteilung", () => {
    const brief: Brief = { regionId: "07335", kampagne: null, gesendetAm: "2026-09-30T10:25:59Z", zugestellt: true };
    const presse: PresseMail = { ...presseWesel, bezug: ["07335"], gesendetAm: "2026-09-30T10:25:00Z" };
    const fund: Fund = { regionId: "07335", url: "https://y.de/b", mitLink: true, gesehenAb: "2026-09-30" };
    expect(ordneFundZu(fund, [brief], [presse])?.art).toBe("brief");
  });

  it("eine Aussendung nach dem Fund zählt nicht, eine unzustellbare auch nicht", () => {
    expect(ordneFundZu({ ...gude, gesehenAb: "2026-08-19" }, [niddaBrief], [])).toBeNull();
    expect(ordneFundZu(gude, [{ ...niddaBrief, zugestellt: false }], [])).toBeNull();
  });
});

describe("Tabelle", () => {
  const heute = "2026-10-07";
  const briefe: Brief[] = [
    niddaBrief,
    { regionId: "06440099", kampagne: "mail-he-rp-sl", gesendetAm: "2026-08-21T08:00:00Z", zugestellt: false },
    { regionId: "05970001", kampagne: "kreise-2026-10", gesendetAm: "2026-10-06T08:00:00Z", zugestellt: true },
  ];
  const funde: Fund[] = [
    gude,
    { regionId: "06440016", url: "https://www.facebook.com/", mitLink: true, gesehenAb: "2026-08-21" },
    { regionId: "06440016", url: "https://www.nidda.de/news/", mitLink: false, gesehenAb: "2026-08-21" },
    radiokw,
  ];
  const k = baueKennzahlen({
    briefe,
    presse: [presseWesel],
    funde,
    mitSeite: new Set(["06440016", "06440099", "05970001"]),
    geoeffnet: (id, _tag, w) => id === "06440016" && w !== 2,
    heute,
  });
  const brief = k.zeilen.find((z) => z.id === briefId("mail-he-rp-sl"))!;
  const kreise = k.zeilen.find((z) => z.id === briefId("kreise-2026-10"))!;
  const presse = k.zeilen.find((z) => z.id === presseId(presseWesel))!;

  it("Mails zählen nur Zugestellte", () => {
    expect(brief.mails).toBe(1);
  });

  it("ein Fenster, das noch nicht vorbei ist, zeigt „noch offen“, nie eine Zahl", () => {
    expect(kreise.seite?.[2]).toBe(OFFEN);
    expect(kreise.links[28]).toBe(OFFEN);
    expect(kreise.seite?.bisher).toBe(0);
    expect(brief.seite?.[2]).toBe(0);
    expect(brief.seite?.bisher).toBe(1);
  });

  it("Links nach Fenster, soziale Netze getrennt, ohne Link zählt nicht", () => {
    expect(brief.links[2]).toEqual({ gesamt: 1, sozial: 1 });
    expect(brief.links[28]).toEqual({ gesamt: 1, sozial: 1 });
    expect(brief.links.bisher).toEqual({ gesamt: 2, sozial: 1 });
  });

  it("Presse hat keinen Seitenwert je Mail", () => {
    expect(presse.seite).toBeNull();
    expect(presse.links[2]).toEqual({ gesamt: 0, sozial: 0 });
    expect(presse.links.bisher).toEqual({ gesamt: 1, sozial: 0 });
  });

  it("soziale Netze werden am Host erkannt", () => {
    expect(istSozial("https://de.linkedin.com/posts/x")).toBe(true);
    expect(istSozial("https://m.facebook.com/x")).toBe(true);
    expect(istSozial("https://gude.news/x")).toBe(false);
  });

  it("Beschriftung aus den Daten, unbekannte Kennung bleibt sichtbar", () => {
    expect(aussendungsLabel("brief:mail-he-rp-sl", "2026-08-20", "2026-08-26", ["06440016", "07137225", "10045112"])).toBe(
      "Gemeinden Hessen, Rheinland-Pfalz, Saarland (20.–26.08.)",
    );
    expect(aussendungsLabel("brief:sonderlauf", "2026-09-30", "2026-09-30")).toBe("sonderlauf (30.09.)");
  });
});

describe("Artikel einer angeschriebenen Redaktion", () => {
  it("gehört zur Pressemitteilung, auch wenn der Ort vorher einen Brief bekam (homburg1 / Blieskastel)", async () => {
    const { ordneFundZu } = await import("../aussand-kennzahlen");
    const briefe = [{ regionId: "10045112", kampagne: "mail-he-rp-sl", gesendetAm: "2026-08-24T08:00:00Z", zugestellt: true }];
    const presse = [{ domain: "homburg1.de", zielgruppe: "presse", anlass: "pressemitteilung", bezug: ["10045"], gesendetAm: "2026-09-30T08:00:00Z", zugestellt: true }];
    const z = ordneFundZu({ regionId: "10045112", url: "https://homburg1.de/blieskastel-264043/", mitLink: true, gesehenAb: "2026-10-06" }, briefe, presse);
    expect(z?.art).toBe("presse");
    // A portal that did NOT get the press mail stays with the earlier letter.
    const y = ordneFundZu({ regionId: "10045112", url: "https://andere-zeitung.de/x", mitLink: true, gesehenAb: "2026-10-06" }, briefe, presse);
    expect(y?.art).toBe("brief");
  });
});
