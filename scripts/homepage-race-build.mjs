// Rebuild the static homepage entry from the shared React chart source.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/homepage-race/direct-race.jsx"],
  outdir: "public/homepage-study/race-dist",
  bundle: true, jsx: "automatic", splitting: true, format: "esm", minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": root + "scripts/homepage-race/next-link.jsx",
    "next/navigation": root + "scripts/homepage-race/next-navigation.js",
  },
});
