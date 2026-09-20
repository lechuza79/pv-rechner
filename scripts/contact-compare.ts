/** Compare private, frozen research runs against explicitly reviewed references. */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { compareContactRuns, type ContactRun, type ContactReference } from "../lib/contact-comparison";
const arg = (name: string) => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const before = arg("before"), after = arg("after"), reference = arg("references"), output = arg("output");
if (!before || !after || !reference || !output) throw Error("Use --before=DIR --after=DIR --references=FILE --output=FILE");
const readRuns = (dir: string): ContactRun[] => readdirSync(dir).filter(f => f.endsWith(".json")).sort().map(f => JSON.parse(readFileSync(resolve(dir, f), "utf8")));
const refs: { references: ContactReference[] } = JSON.parse(readFileSync(reference, "utf8"));
const result = compareContactRuns(readRuns(before), readRuns(after), refs.references);
mkdirSync(dirname(resolve(output)), { recursive: true, mode: 0o700 });
writeFileSync(output, JSON.stringify(result, null, 2), { mode: 0o600 });
const { cases: _cases, ...summary } = result;
console.log(JSON.stringify(summary, null, 2));

if (result.beforeOnly.length || result.afterOnly.length) process.exitCode = 1;
