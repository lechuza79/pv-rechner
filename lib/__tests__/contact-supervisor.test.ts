import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
it("keeps resumable supervision safe across crashes and hangs", () => {
  expect(() => execFileSync("python3", ["scripts/__tests__/contact_supervisor_test.py"], {timeout:20000, stdio:"pipe"})).not.toThrow();
}, 25000);
