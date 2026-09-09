import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { firewallBefund, firewallUrteil } from "../../scripts/health-check";

// ─── Warum es diesen Test gibt ───────────────────────────────────────────────
//
// Der Bot-Schutz von solar-check.io steht seit dem 08.09.2026 scharf. Die
// Einstellung liegt bei Vercel in der Projektkonfiguration, NICHT im Repo — sie
// ist in keinem Vergleich der Änderungen sichtbar, und wer Projektrechte hat,
// kann sie in einer Minute still zurückstellen. Dieselbe Klasse wie die
// Build-Maschine und die Function-Region: eine Einstellung, deren Rückfall
// niemand bemerkt, weil die Seite dabei völlig gesund aussieht.
//
// Auffangen kann das nur eine wiederkehrende MESSUNG gegen die Produktion. Der
// Gesundheitscheck macht sie; dieser Test nagelt fest, dass er sie auch macht
// und dass sein Urteil in beide Richtungen stimmt.
//
// Die drei Fälle sind nicht gleichwertig. Zwei davon kosten Geld, wenn sie
// kippen — der dritte kostet Sichtbarkeit und ist der unscheinbarste:
// Antworten robots.txt und Sitemap einem Crawler nicht mehr, crawlt er gar
// nicht mehr richtig, und das fällt erst Wochen später an ausbleibendem
// Verkehr auf.

const OK = {
  statusEigen: 200,
  statusFremd: 429,
  statusRobots: 200,
  eigeneDurch: true,
  fremdeAbgewiesen: true,
  anweisungenOffen: true,
};

describe("Firewall-Wächter: Urteil", () => {
  it("meldet nichts, wenn alles wie gewollt steht", () => {
    expect(firewallBefund(OK)).toEqual([]);
  });

  it("meldet nichts, wenn die Produktion gar nicht antwortet", () => {
    // Dann ist die Produktion das Problem, und das meldet der übrige
    // Gesundheitscheck. Hier einen Firewall-Befund zu erzeugen hieße, eine
    // Beobachtung zu behaupten, die es nicht gab — dieselbe Trennung wie beim
    // Förder-Wächter zwischen „hat sich geändert" und „Abruf kam nicht durch".
    expect(firewallBefund(null)).toEqual([]);
  });

  it("schlägt an, wenn unsere eigene Automatik ausgesperrt wird", () => {
    const b = firewallBefund({ ...OK, statusEigen: 429, eigeneDurch: false });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatch(/eigene Automatik/i);
  });

  it("schlägt an, wenn der Bot-Schutz nicht mehr greift", () => {
    // Der wahrscheinlichste Rückfall: jemand stellt die Einstellung bei Vercel
    // wieder auf Beobachten. Dann antwortet die Seite jedem mit 200.
    const b = firewallBefund({ ...OK, statusFremd: 200, fremdeAbgewiesen: false });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatch(/Bot-Schutz greift nicht/i);
  });

  it("schlägt an, wenn die Crawler-Anweisungen nicht mehr jedem antworten", () => {
    const b = firewallBefund({ ...OK, statusRobots: 429, anweisungenOffen: false });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatch(/Crawler-Anweisungen/i);
  });

  it("zählt eine harte Abweisung genauso wie die Prüfaufgabe", () => {
    // Vercel antwortet auf die Prüfaufgabe mit 429. Wird der Schutz je auf
    // hartes Abweisen gestellt, kommt 403 — das ist kein Befund, sondern
    // dieselbe Wirkung. Ohne diesen Zweig würde der Wächter bei einer
    // VERSCHÄRFUNG rot und trainierte uns an, Rot zu ignorieren.
    expect(firewallBefund({ ...OK, statusFremd: 403 })).toEqual([]);
  });

  it("meldet mehrere Befunde gleichzeitig", () => {
    expect(
      firewallBefund({
        statusEigen: 429,
        statusFremd: 200,
        statusRobots: 429,
        eigeneDurch: false,
        fremdeAbgewiesen: false,
        anweisungenOffen: false,
      }),
    ).toHaveLength(3);
  });
});

describe("Firewall-Wächter: die Ableitung aus den Antwortcodes", () => {
  // Diese Prüfungen gab es beim ersten Anlauf NICHT, und genau das war die
  // Lücke: Die Urteils-Prüfungen oben reichen den Befund fertig herein, also
  // blieb eine Sabotage an der Ableitung („gilt immer als abgewiesen") ohne
  // Wirkung auf den Testlauf. Absichtlich kaputtgemacht, grün geblieben,
  // umgebaut.
  it("erkennt den gewollten Zustand", () => {
    const b = firewallUrteil(200, 429, 200);
    expect(b).not.toBeNull();
    expect(firewallBefund(b)).toEqual([]);
  });

  it("erkennt einen Bot-Schutz, der nicht mehr greift", () => {
    const b = firewallUrteil(200, 200, 200);
    expect(b?.fremdeAbgewiesen).toBe(false);
    expect(firewallBefund(b)).toHaveLength(1);
  });

  it("erkennt eine ausgesperrte eigene Automatik", () => {
    expect(firewallUrteil(429, 429, 200)?.eigeneDurch).toBe(false);
  });

  it("erkennt gesperrte Crawler-Anweisungen", () => {
    expect(firewallUrteil(200, 429, 429)?.anweisungenOffen).toBe(false);
  });

  it("hält eine harte Abweisung für gleichwertig", () => {
    expect(firewallUrteil(200, 403, 200)?.fremdeAbgewiesen).toBe(true);
  });

  it("urteilt gar nicht, wenn die Produktion nicht antwortet", () => {
    expect(firewallUrteil(0, 0, 0)).toBeNull();
  });

  it("urteilt aber, sobald EINE Antwort kam", () => {
    // Nur der fremde Abruf scheiterte — das ist ein Befund, kein Ausfall.
    expect(firewallUrteil(200, 0, 200)).not.toBeNull();
  });
});

describe("Firewall-Wächter: der Gesundheitscheck ruft ihn wirklich auf", () => {
  // Ein Urteil, das nie gefällt wird, ist von keinem nicht zu unterscheiden.
  // Genau diese Lücke hat im Projekt schon einmal fünf Wochen offen gestanden
  // (die Selbstauskunft der Datenbank-Sicherheitsgrenze wurde gebaut und nie
  // abgefragt). Deshalb wird hier die VERWENDUNG geprüft, nicht das Vorhandensein.
  const quelle = readFileSync(join(__dirname, "../../scripts/health-check.ts"), "utf8");

  it("misst die Firewall im Lauf", () => {
    expect(quelle).toMatch(/const firewall = await messeFirewall\(\)/);
  });

  it("reicht das Urteil an Claude weiter, nicht nur ins Protokoll", () => {
    expect(quelle).toMatch(/forClaude\.push\(\.\.\.firewallBefund\(firewall\)\)/);
  });

  it("prüft die SEITE mit einer fremden Kennung, nicht mit unserer eigenen", () => {
    // Mit einer unserer eigenen Kennungen zu prüfen wäre ein Wächter, der sich
    // selbst bestätigt: Die greift die Ausnahmeregel ab, und er bliebe grün,
    // egal wie der Bot-Schutz steht. Genau das ist beim Bauen als Sabotage
    // durchgerutscht, weil der Test nur nach dem Vorkommen der Zeichenkette
    // irgendwo in der Datei suchte — sie stand aber auch in der
    // robots.txt-Prüfung. Deshalb wird jetzt das PAAR geprüft.
    expect(quelle).toMatch(/hole\(ziel, "fremder-crawler-pruefung/);
    expect(quelle).not.toMatch(/hole\(ziel, "solar-check-health-check"\),\s*\n\s*\/\/[^\n]*\n\s*hole\(ziel, "solar-check/);
  });

  it("prüft die Crawler-Anweisungen ebenfalls mit einer fremden Kennung", () => {
    expect(quelle).toMatch(/robots\.txt`, "fremder-crawler-pruefung/);
  });
});
