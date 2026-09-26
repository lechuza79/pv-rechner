import { describe, expect, it } from "vitest";
import { kurztitel } from "../story-kurztitel";

describe("Kurztitel der Geschichten", () => {
  // The five labels the approved prototype had written by hand for Höchberg
  // (scripts/municipality-preview/story-thumb-labels.json, with the stories'
  // data) — copied here because the prototype folder does not go to main.
  const HAND = [
    {
      "label": "Bestandsprofil",
      "title": "Wie sich die Solarleistung auf die Anlagentypen verteilt",
      "values": [
        {
          "label": "Gebäudeanlagen",
          "value": 9113.199999999999,
          "unit": "kWp"
        },
        {
          "label": "Balkonkraftwerke",
          "value": 225.17000000000002,
          "unit": "kWp"
        }
      ],
      "kurz": "Solar im Überblick"
    },
    {
      "label": "Anzahl und Leistung",
      "title": "Gebäudeanlagen: 74,5 % der Anlagen, 98 % der Solarleistung",
      "values": [
        {
          "label": "Anlagenanteil",
          "value": 74.5,
          "unit": "%"
        },
        {
          "label": "Leistungsanteil",
          "value": 97.6,
          "unit": "%"
        }
      ],
      "kurz": "Dächer liefern fast alles"
    },
    {
      "label": "Rang-Monatsupdate",
      "title": "Höchberg: die Platzierungen im September 2026",
      "values": [
        {
          "label": "private Solarleistung auf den Dächern je Einwohner · Deutschland · Gemeinden und Kleinstädte (5.000–19.999 Einwohner)",
          "value": 978,
          "unit": "Platz"
        },
        {
          "label": "private Solarleistung auf den Dächern je Einwohner · Bayern · Gemeinden und Kleinstädte (5.000–19.999 Einwohner)",
          "value": 359,
          "unit": "Platz"
        }
      ],
      "kurz": "Höchbergs Platzierungen"
    },
    {
      "label": "Zubau-Monatsrecap",
      "title": "9 neue Solaranlagen im August 2026",
      "values": [
        {
          "label": "Neue Anlagen",
          "value": 9,
          "unit": "Anlagen"
        },
        {
          "label": "Neue Modulleistung",
          "value": 70.07000000000001,
          "unit": "kWp"
        }
      ],
      "kurz": "9 neue Solaranlagen"
    },
    {
      "label": "Vorjahreszeitraum",
      "title": "Gebäudeanlagen: mehr im Vorjahresvergleich",
      "values": [
        {
          "label": "2025",
          "value": 33,
          "unit": "Anlagen"
        },
        {
          "label": "2026",
          "value": 53,
          "unit": "Anlagen"
        }
      ],
      "kurz": "Mehr neue Dachanlagen"
    }
  ];

  it("trifft die von Hand geschriebenen Kurztitel des freigegebenen Entwurfs (Höchberg)", () => {
    for (const { kurz, ...story } of HAND) expect(kurztitel(story, "Höchberg"), story.label).toBe(kurz);
    expect(HAND.length).toBe(5);
  });

  it("baut Einzahl und Null richtig", () => {
    const zubau = (n: number) => kurztitel({ label: "Zubau-Monatsrecap", values: [{ label: "Neue Anlagen", value: n }] }, "X");
    expect(zubau(1)).toBe("1 neue Solaranlage");
    expect(zubau(0)).toBe("Kein neuer Zubau");
    expect(zubau(1250)).toBe("1.250 neue Solaranlagen");
  });

  it("Genitiv bei Namen auf s", () => {
    expect(kurztitel({ label: "Rang-Monatsupdate" }, "Bad Ems")).toBe("Bad Ems’ Platzierungen");
  });

  it("ohne Regel kein erfundener Titel", () => {
    expect(kurztitel({ label: "Unbekannt", title: "Irgendwas" }, "X")).toBeUndefined();
  });
});
