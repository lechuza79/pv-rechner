import { describe, expect, it } from "vitest";
import { noticeBypassTarget } from "../funding-source-policy";

describe("NOLIS notice page in front of a deep link", () => {
  const req = "https://amtboizenburgland.de/bekanntmachungen/eu-foerderprojekte";
  it("follows the notice to the requested page", () => {
    expect(noticeBypassTarget(req, "https://www.amtboizenburgland.de/?ruri=%2Fbekanntmachungen%2Feu-foerderprojekte%3Fvs%3D1"))
      .toBe("https://www.amtboizenburgland.de/bekanntmachungen/eu-foerderprojekte?vs=1");
  });
  it("never follows to another path, another host or without the marker", () => {
    expect(noticeBypassTarget(req, "https://www.amtboizenburgland.de/?ruri=%2Fandere-seite%3Fvs%3D1")).toBeNull();
    expect(noticeBypassTarget(req, "https://www.amtboizenburgland.de/?ruri=%2F%2Fevil.example%2Fbekanntmachungen%2Feu-foerderprojekte%3Fvs%3D1")).toBeNull();
    expect(noticeBypassTarget(req, "https://evil.example/?ruri=%2Fbekanntmachungen%2Feu-foerderprojekte%3Fvs%3D1")).toBeNull();
    expect(noticeBypassTarget(req, "https://www.amtboizenburgland.de/?ruri=%2Fbekanntmachungen%2Feu-foerderprojekte")).toBeNull();
    expect(noticeBypassTarget(req, "https://www.amtboizenburgland.de/startseite?ruri=%2Fbekanntmachungen%2Feu-foerderprojekte%3Fvs%3D1")).toBeNull();
    expect(noticeBypassTarget(req, req)).toBeNull();
  });
});
