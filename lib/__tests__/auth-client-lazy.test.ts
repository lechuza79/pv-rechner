import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hatSitzungsCookie } from "../auth";

const lies = (p: string) => readFileSync(join(__dirname, "..", "..", p), "utf8");

describe("Supabase-Browser-Client nur bei Bedarf", () => {
  it("lädt den Client nie statisch — sonst steckt er im gemeinsamen Bündel jeder Seite", () => {
    const quelle = lies("lib/auth.ts");
    expect(quelle).not.toMatch(/^import[^;]*from\s+["']\.\/supabase-browser["']/m);
    expect(quelle).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@supabase\//m);
    expect(quelle).toMatch(/import\(["']\.\/supabase-browser["']\)/);
  });

  it("erkennt die Sitzungs-Cookies, auch gestückelt, aber nicht den Prüfschlüssel", () => {
    expect(hatSitzungsCookie("sb-abcd-auth-token=base64-xyz")).toBe(true);
    expect(hatSitzungsCookie("a=1; sb-abcd-auth-token.0=base64-xyz; sb-abcd-auth-token.1=zz")).toBe(true);
    expect(hatSitzungsCookie("sb-abcd-auth-token-code-verifier=abc")).toBe(false);
    expect(hatSitzungsCookie("sc-angemeldet-bleiben=1; theme=dark")).toBe(false);
    expect(hatSitzungsCookie("")).toBe(false);
  });

  it("weckt den Kopfzeilen-Zustand nach einer Anmeldung im selben Tab", () => {
    const quelle = lies("lib/auth.ts");
    const anmelden = quelle.slice(quelle.indexOf("export async function signInWithPassword"), quelle.indexOf("export async function signUpWithPassword"));
    expect(anmelden).toMatch(/weckeAuth\(\);\s*return \{\};/);
  });
});
