import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  EXEC_SQL_DDL,
  CALCULATIONS_RLS_DDL,
  SECURITY_POSTURE_DDL,
  SECURITY_DDL,
  auditPosture,
  type SecurityPosture,
} from "../security-sql";

// Diese Tests brauchen keine Datenbank. Sie halten die QUELLE fest, aus der
// die Setup-Route liest — der Fall, gegen den sie sich richten, ist nicht
// "jemand aendert die Datenbank", sondern "jemand nimmt die Absicherung hier
// heraus und niemand merkt es".

/** Alle Treffer einer Gruppe. Als Schleife, weil das Ziel-Target der
 *  TypeScript-Konfiguration den Spread ueber matchAll nicht hergibt. */
function alleTreffer(text: string, re: RegExp, gruppe = 1): string[] {
  const out: string[] = [];
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) out.push(m[gruppe]);
  return out;
}

describe("exec_sql: Rechte", () => {
  it("entzieht anon und authenticated EINZELN, nicht nur PUBLIC", () => {
    // Der eigentliche Fallstrick: Supabase legt ueber Default-Privileges
    // direkte Grants an anon/authenticated an. Ein REVOKE FROM PUBLIC laesst
    // die stehen — am 29.07.2026 nachgestellt, die Funktion blieb oeffentlich.
    expect(EXEC_SQL_DDL).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC/);
    expect(EXEC_SQL_DDL).toMatch(/REVOKE ALL ON FUNCTION %s FROM anon/);
    expect(EXEC_SQL_DDL).toMatch(/REVOKE ALL ON FUNCTION %s FROM authenticated/);
  });

  it("erteilt das Ausfuehrungsrecht ausschliesslich an service_role", () => {
    const grants = alleTreffer(EXEC_SQL_DDL, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+\S+\s+TO\s+([^;']+)/gi)
      .map(s => s.trim());
    expect(grants.length).toBeGreaterThan(0);
    for (const to of grants) {
      expect(to).toBe("service_role");
    }
  });

  it("fasst ALLE Signaturen an, nicht nur die eine bekannte", () => {
    // Ein zweiter Overload traegt seine eigene Rechtevergabe. Wer nur
    // exec_sql(text) absichert, laesst exec_sql(text, text) offen.
    expect(EXEC_SQL_DDL).toMatch(/FROM pg_proc p/);
    expect(EXEC_SQL_DDL).toMatch(/p\.proname = 'exec_sql'/);
    expect(EXEC_SQL_DDL).toMatch(/oid::regprocedure/);
  });

  it("setzt einen festen search_path", () => {
    // SECURITY DEFINER ohne festen Pfad laesst den Aufrufer entscheiden, in
    // welchem Schema ein unqualifizierter Name landet — bei einer Funktion,
    // die als postgres laeuft.
    expect(EXEC_SQL_DDL).toMatch(/SECURITY DEFINER/);
    expect(EXEC_SQL_DDL).toMatch(/SET search_path = public, extensions, pg_temp/);
  });

  it("stellt pg_temp ans Ende des Suchpfads", () => {
    const m = EXEC_SQL_DDL.match(/SET search_path = ([^\n]+)/);
    expect(m).not.toBeNull();
    const parts = m![1].split(",").map(s => s.trim());
    expect(parts[parts.length - 1]).toBe("pg_temp");
  });
});

describe("calculations: Zeilenschutz", () => {
  it("schaltet RLS an", () => {
    expect(CALCULATIONS_RLS_DDL).toMatch(/ALTER TABLE public\.calculations ENABLE ROW LEVEL SECURITY/);
  });

  it("deckt alle vier Zugriffsarten ab und bindet jede an auth.uid()", () => {
    for (const cmd of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      const re = new RegExp(`FOR ${cmd}\\s+(USING|WITH CHECK)\\s*\\(auth\\.uid\\(\\) = user_id\\)`);
      expect(CALCULATIONS_RLS_DDL, `Regel fuer ${cmd} fehlt oder bindet nicht an auth.uid()`).toMatch(re);
    }
  });

  it("ersetzt bestehende Regeln, statt einen zweiten Satz danebenzulegen", () => {
    const drops = alleTreffer(CALCULATIONS_RLS_DDL, /DROP POLICY IF EXISTS "([^"]+)"/g);
    const creates = alleTreffer(CALCULATIONS_RLS_DDL, /CREATE POLICY "([^"]+)"/g);
    expect(creates.length).toBe(4);
    expect([...drops].sort()).toEqual([...creates].sort());
  });

  it("laeuft durch, wenn es die Tabelle nicht gibt", () => {
    expect(CALCULATIONS_RLS_DDL).toMatch(/to_regclass\('public\.calculations'\) IS NULL/);
  });
});

describe("Selbstauskunft", () => {
  it("fuehrt kein uebergebenes SQL aus", () => {
    // Waere sie generisch, waere sie exec_sql mit Rueckgabewert — also
    // dieselbe Luecke ein zweites Mal.
    expect(SECURITY_POSTURE_DDL).not.toMatch(/EXECUTE\s+\w*sql\w*/i);
    expect(SECURITY_POSTURE_DDL).toMatch(/RETURNS jsonb/);
  });

  it("ist selbst nur fuer service_role ausfuehrbar", () => {
    expect(SECURITY_POSTURE_DDL).toMatch(/REVOKE ALL ON FUNCTION public\.sc_security_posture\(\) FROM PUBLIC/);
    expect(SECURITY_POSTURE_DDL).toMatch(/FROM anon/);
    expect(SECURITY_POSTURE_DDL).toMatch(/FROM authenticated/);
    expect(SECURITY_POSTURE_DDL).toMatch(/GRANT EXECUTE ON FUNCTION public\.sc_security_posture\(\) TO service_role/);
  });

  it("buendelt alle drei Teile", () => {
    for (const part of [EXEC_SQL_DDL, CALCULATIONS_RLS_DDL, SECURITY_POSTURE_DDL]) {
      expect(SECURITY_DDL).toContain(part);
    }
  });
});

// ─── Realitaets-Anker: erkennt die Bewertung die echten Fehlerfaelle? ───────

const GESUND: SecurityPosture = {
  exec_sql: [{
    args: "sql text",
    security_definer: true,
    owner: "postgres",
    search_path: ["search_path=public, extensions, pg_temp"],
    acl: "{postgres=X/postgres,service_role=X/postgres}",
    execute_anon: false,
    execute_authenticated: false,
    execute_service_role: true,
    execute_public: false,
  }],
  calculations: {
    exists: true,
    rls_enabled: true,
    policies: [
      { name: "Users read own calculations", cmd: "r", using: "(auth.uid() = user_id)", with_check: null },
      { name: "Users insert own calculations", cmd: "a", using: null, with_check: "(auth.uid() = user_id)" },
      { name: "Users update own calculations", cmd: "w", using: "(auth.uid() = user_id)", with_check: null },
      { name: "Users delete own calculations", cmd: "d", using: "(auth.uid() = user_id)", with_check: null },
    ],
  },
  tables_without_rls: [],
  tables_rls_without_policy: [],
};

const klon = (): SecurityPosture => JSON.parse(JSON.stringify(GESUND));

describe("auditPosture", () => {
  it("nickt den gesunden Zustand ab", () => {
    const r = auditPosture(GESUND);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("schlaegt an, wenn anon exec_sql ausfuehren darf", () => {
    // Genau der Zustand vom Juli 2026.
    const p = klon();
    p.exec_sql[0].execute_anon = true;
    expect(auditPosture(p).ok).toBe(false);
  });

  it("schlaegt bei einem Recht fuer PUBLIC an", () => {
    const p = klon();
    p.exec_sql[0].execute_public = true;
    expect(auditPosture(p).ok).toBe(false);
  });

  it("schlaegt an, wenn ein zweiter Overload offen steht", () => {
    const p = klon();
    p.exec_sql.push({ ...GESUND.exec_sql[0], args: "sql text, params text", execute_anon: true });
    expect(auditPosture(p).ok).toBe(false);
  });

  it("schlaegt an, wenn service_role das Recht VERLIERT", () => {
    // Kein Sicherheitsloch, aber alle Setup-Routen waeren tot — und das
    // faellt sonst erst beim naechsten Datenlauf auf.
    const p = klon();
    p.exec_sql[0].execute_service_role = false;
    expect(auditPosture(p).ok).toBe(false);
  });

  it("schlaegt bei SECURITY DEFINER ohne festen search_path an", () => {
    const p = klon();
    p.exec_sql[0].search_path = null;
    expect(auditPosture(p).ok).toBe(false);
  });

  it("schlaegt an, wenn der Zeilenschutz auf calculations ausgeht", () => {
    const p = klon();
    p.calculations!.rls_enabled = false;
    expect(auditPosture(p).ok).toBe(false);
  });

  it("schlaegt an, wenn eine der vier Regeln fehlt", () => {
    for (const cmd of ["r", "a", "w", "d"]) {
      const p = klon();
      p.calculations!.policies = p.calculations!.policies.filter(x => x.cmd !== cmd);
      expect(auditPosture(p).ok, `fehlende Regel ${cmd} nicht erkannt`).toBe(false);
    }
  });

  it("schlaegt an, wenn eine Regel nicht mehr an auth.uid() bindet", () => {
    // Eine Regel mit USING (true) ist formal eine Regel — und laesst jeden
    // Angemeldeten alle fremden Berechnungen lesen.
    const p = klon();
    p.calculations!.policies[0].using = "true";
    expect(auditPosture(p).ok).toBe(false);
  });

  it("meldet Tabellen ohne Zeilenschutz", () => {
    const p = klon();
    p.tables_without_rls = ["irgendwas_neues"];
    expect(auditPosture(p).ok).toBe(false);
  });

  it("meldet nicht, wenn die Tabelle gar nicht existiert", () => {
    // Ein frisches Projekt ohne calculations ist kein Sicherheitsproblem.
    const p = klon();
    p.calculations = { exists: false, rls_enabled: false, policies: [] };
    expect(auditPosture(p).ok).toBe(true);
  });
});

describe("Eine Quelle", () => {
  it("definiert exec_sql nirgends sonst im Repo", () => {
    const root = resolve(__dirname, "..", "..");
    const skip = new Set(["node_modules", ".next", ".next-dev", ".git", "docs", ".claude"]);
    const treffer: string[] = [];

    const lauf = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (skip.has(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { lauf(p); continue; }
        if (!/\.(ts|tsx|sql)$/.test(name)) continue;
        if (p.endsWith("lib/security-sql.ts") || p.includes("__tests__")) continue;
        if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(public\.)?exec_sql/i.test(readFileSync(p, "utf8"))) {
          treffer.push(p.slice(root.length + 1));
        }
      }
    };
    lauf(root);

    expect(treffer, `exec_sql wird an weiteren Stellen definiert: ${treffer.join(", ")}`).toEqual([]);
  });
});
