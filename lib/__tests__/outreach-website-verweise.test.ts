import { describe, expect, it } from "vitest";
import { ordneWebsiteVerweis, type Angeschrieben } from "../outreach-website-verweise";

// The two real cases from 26.09.2026 that the per-page check missed.
const ANGESCHRIEBEN: Angeschrieben[] = [
  { name: "Berkenthin", website: "https://www.amt-berkenthin.de", pfad: "/solar-atlas/schleswig-holstein/kreis-herzogtum-lauenburg/berkenthin" },
  { name: "Trier", website: "https://www.trier.de", pfad: "/solar-atlas/rheinland-pfalz/trier/trier" },
  { name: "Nidda", website: "https://www.nidda.de", pfad: "/solar-atlas/hessen/landkreis-wetteraukreis/nidda" },
  { name: "Münzenberg", website: "https://www.muenzenberg.de", pfad: "/solar-atlas/hessen/landkreis-wetteraukreis/muenzenberg" },
];

describe("ordneWebsiteVerweis", () => {
  it("attributes a regional paper linking the district page to the one contacted place below it", () => {
    const z = ordneWebsiteVerweis(
      { host: "ln-online.de", besucher: 8, pfade: [{ pfad: "/solar-atlas/schleswig-holstein/kreis-herzogtum-lauenburg", besucher: 8 }] },
      ANGESCHRIEBEN,
    );
    expect(z).toMatchObject({ art: "gemeinde", gemeinde: "Berkenthin" });
  });

  it("attributes the municipality's own website even when it links our home page", () => {
    const z = ordneWebsiteVerweis({ host: "trier.de", besucher: 8, pfade: [{ pfad: "/", besucher: 8 }] }, ANGESCHRIEBEN);
    expect(z).toMatchObject({ art: "gemeinde", gemeinde: "Trier" });
  });

  it("breaks a district tie only with the one contacted place that has answered", () => {
    const liste: Angeschrieben[] = [
      ...ANGESCHRIEBEN.map((a) => (a.name === "Berkenthin" ? { ...a, status: "veroeffentlicht" } : a)),
      { name: "Salem", website: null, pfad: "/solar-atlas/schleswig-holstein/kreis-herzogtum-lauenburg/salem", status: "kontaktiert" },
    ];
    const z = ordneWebsiteVerweis(
      { host: "ln-online.de", besucher: 8, pfade: [{ pfad: "/solar-atlas/schleswig-holstein/kreis-herzogtum-lauenburg", besucher: 8 }] },
      liste,
    );
    expect(z).toMatchObject({ art: "gemeinde", gemeinde: "Berkenthin" });
  });

  it("counts a social network on municipality pages there, even with a stray home-page visit", () => {
    const z = ordneWebsiteVerweis(
      { host: "facebook.com", besucher: 9, pfade: [{ pfad: "/solar-atlas/hessen/landkreis-wetteraukreis/nidda", besucher: 6 }, { pfad: "/", besucher: 3 }] },
      ANGESCHRIEBEN,
    );
    expect(z).toEqual({ art: "ortsseite" });
  });

  it("does not attribute a social network to a place because one visitor opened a state page", () => {
    const liste: Angeschrieben[] = [
      ...ANGESCHRIEBEN,
      { name: "Aue-Bad Schlema", website: null, pfad: "/solar-atlas/sachsen/landkreis-erzgebirgskreis/aue-bad-schlema", status: "veroeffentlicht" },
    ];
    const z = ordneWebsiteVerweis(
      {
        host: "lm.facebook.com",
        besucher: 47,
        pfade: [
          { pfad: "/solar-atlas/hessen/landkreis-wetteraukreis/nidda", besucher: 34 },
          { pfad: "/solar-atlas/sachsen", besucher: 1 },
        ],
      },
      liste,
    );
    expect(z).toEqual({ art: "ortsseite" });
  });

  it("does not guess when several contacted places lie below the landing page", () => {
    const z = ordneWebsiteVerweis(
      { host: "wetterauer-zeitung.de", besucher: 3, pfade: [{ pfad: "/solar-atlas/hessen/landkreis-wetteraukreis", besucher: 3 }] },
      ANGESCHRIEBEN,
    );
    expect(z).toMatchObject({ art: "ohne-ort" });
  });

  it("leaves visits on the municipality page itself to the per-page check", () => {
    const z = ordneWebsiteVerweis(
      { host: "facebook.com", besucher: 6, pfade: [{ pfad: "/solar-atlas/hessen/landkreis-wetteraukreis/nidda", besucher: 6 }] },
      ANGESCHRIEBEN,
    );
    expect(z).toEqual({ art: "ortsseite" });
  });

  it("ignores search engines, mailboxes and mail scanners", () => {
    for (const host of ["google.com", "email.t-online.de", "smex-ctp.trendmicro.com", "vercel.com"]) {
      expect(ordneWebsiteVerweis({ host, besucher: 5, pfade: [{ pfad: "/", besucher: 5 }] }, ANGESCHRIEBEN)).toBeNull();
    }
  });

  it("keeps an unknown site on a calculator as a lead without a place", () => {
    const z = ordneWebsiteVerweis({ host: "lokalo.de", besucher: 1, pfade: [{ pfad: "/", besucher: 1 }] }, ANGESCHRIEBEN);
    expect(z).toMatchObject({ art: "ohne-ort" });
  });
});
