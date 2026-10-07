import { describe, expect, it } from "vitest";
import { SZENEN_BASIS_URL, szeneUrl } from "../szenen-speicher";
import { corsXml } from "../hetzner-s3";

type Regel = { source: string; destination: string };

describe("scene bucket", () => {
  it("the site proxies scene paths to the bucket named in lib/szenen-speicher.ts", async () => {
    const config = (await import("../../next.config.js")).default as { rewrites: () => Promise<{ beforeFiles: Regel[] }> };
    const regel = (await config.rewrites()).beforeFiles.find(r => r.source.startsWith("/geo/landscape-tours/"));
    expect(regel, "scene rewrite missing").toBeDefined();
    expect(regel!.destination).toBe(`${SZENEN_BASIS_URL}/landscape-tours/:place/:file`);
  });

  it("builds the scene address per place", () => {
    expect(szeneUrl("05166012")).toBe(`${SZENEN_BASIS_URL}/landscape-tours/05166012/scene.json`);
  });

  it("CORS only allows reading", () => {
    const xml = corsXml(["https://solar-check.io"]);
    expect(xml).toContain("<AllowedMethod>GET</AllowedMethod>");
    expect(xml).not.toMatch(/PUT|POST|DELETE/);
  });
});
