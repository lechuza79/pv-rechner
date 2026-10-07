/**
 * The columns a table has, read from the DDL that creates it — the one place a
 * collection run's columns are declared.
 *
 * Why this exists (06.10.2026, wind operators): contact columns were added to
 * the code, the DDL got them too, but the setup never ran again. The contact
 * step then failed at night, after the long research, on "column does not
 * exist". Two checks close the gap from both sides:
 *
 *   code → DDL   every row a run writes passes `nurBekannteSpalten`, and a unit
 *                test feeds the row builders through it. A column added to the
 *                code but not to the DDL fails the test, not the night.
 *   DDL → DB     the preflight asks the database for every DDL column
 *                (`fehlendeSpalten`). A DDL that was changed but never run
 *                fails the preflight, before anything starts.
 */

/** Column names of `tabelle` from CREATE TABLE and ALTER TABLE … ADD COLUMN. */
export function spaltenAusDdl(sql: string, tabelle: string): Set<string> {
  const out = new Set<string>();
  const t = tabelle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const create = new RegExp(`CREATE TABLE IF NOT EXISTS ${t}\\s*\\(`, "i").exec(sql);
  if (create) {
    // The body up to the matching closing parenthesis.
    let tiefe = 0, i = create.index + create[0].length - 1, ende = -1;
    for (; i < sql.length; i++) {
      if (sql[i] === "(") tiefe++;
      else if (sql[i] === ")" && --tiefe === 0) { ende = i; break; }
    }
    const rumpf = sql.slice(create.index + create[0].length, ende)
      .split("\n").map((z) => z.replace(/--.*$/, "").trim()).join("\n");
    // Split on top-level commas only: numeric(10,2) carries one inside.
    let tief = 0, teil = "";
    const teile: string[] = [];
    for (const ch of rumpf) {
      if (ch === "(") tief++;
      if (ch === ")") tief--;
      if (ch === "," && tief === 0) { teile.push(teil); teil = ""; } else teil += ch;
    }
    teile.push(teil);
    for (const p of teile) {
      const m = p.trim().match(/^([a-z_][a-z0-9_]*)\s+[a-z]/i);
      if (m && !/^(primary|unique|constraint|foreign|check)$/i.test(m[1])) out.add(m[1].toLowerCase());
    }
  }
  const alter = new RegExp(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS ([a-z_][a-z0-9_]*)`, "gi");
  for (let m; (m = alter.exec(sql)); ) out.add(m[1].toLowerCase());
  return out;
}

/** Throws when a row carries a column the DDL does not declare. */
export function nurBekannteSpalten(tabelle: string, spalten: Set<string>, zeilen: Record<string, unknown>[]): void {
  const fremd = new Set<string>();
  for (const z of zeilen) for (const k of Object.keys(z)) if (!spalten.has(k)) fremd.add(k);
  if (fremd.size) {
    throw new Error(`${tabelle}: Spalte(n) ${[...fremd].join(", ")} stehen nicht in der DDL — erst dort ergänzen, dann --setup`);
  }
}

/**
 * Which DDL columns the live table lacks. One select of every column with
 * limit 0; PostgREST names the first missing one, so the check narrows down
 * column by column only when the combined select fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fehlendeSpalten(c: any, tabelle: string, spalten: Set<string>): Promise<string[]> {
  const liste = [...spalten];
  const alle = await c.from(tabelle).select(liste.join(",")).limit(0);
  if (!alle.error) return [];
  const fehlt: string[] = [];
  for (const s of liste) {
    const r = await c.from(tabelle).select(s).limit(0);
    if (r.error) fehlt.push(s);
  }
  // The combined select failed but no single column does: the table itself is missing.
  return fehlt.length ? fehlt : [`(Tabelle: ${alle.error.message})`];
}
