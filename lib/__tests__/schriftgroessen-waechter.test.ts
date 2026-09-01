import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter gegen getippte Schriftgrößen.
 *
 * Der Anlass ist gemessen, nicht befürchtet: Die Schriftgrößen-Tokens gibt es
 * seit Juli 2026. In den sechs Wochen danach wuchs der Bestand getippter Größen
 * trotzdem von 1.046 auf 1.413 Stellen (+35 %) und von 25 auf 33 verschiedene
 * Werte — weil nichts sie erzwang. 63 Dateien benutzten 12 und 13 nebeneinander,
 * 32 mischten vier oder fünf Werte zwischen 10 und 14 px. Ein Unterschied von
 * einem Pixel, den dieselbe Datei an verschiedenen Stellen verschieden trifft,
 * drückt keine Rangfolge aus; er ist Drift.
 *
 * Der Test verbietet deshalb nicht die falsche Größe, sondern die Bauweise, die
 * sie ermöglicht: eine Zahl direkt an einer Schriftgröße. Größen kommen aus der
 * Skala in lib/theme.ts. Wo das im Einzelfall nicht geht, steht der Fall unten
 * mit Begründung — dann ist es eine Entscheidung und kein Versehen.
 *
 * Vorbild: lib/__tests__/einheiten-waechter.test.ts. Der ist der Grund, warum
 * Einheiten seit einem Jahr nicht mehr driften.
 */

const ROOT = join(__dirname, "..", "..");

/** Durchsucht wird der ganze Oberflächen-Code. */
const VERZEICHNISSE = ["app", "components", "lib"];

/**
 * Eine getippte Schriftgröße in allen vier Schreibweisen, die im Projekt
 * vorkommen: Stil-Objekt (`fontSize: 13`), JSX-Attribut (`fontSize={13}`),
 * CSS im Template-String (`font-size:13px`) und SVG-Attribut
 * (`font-size="13"`). Berechnete Ausdrücke (`fontSize: size * 0.62`) fallen
 * nicht darunter — dort steht die Größe schon in einer Variablen.
 */
const GETIPPT = [
  /fontSize: *[0-9]/,
  /fontSize=\{ *[0-9]/,
  /font-size: *[0-9]/,
  /font-size=" *[0-9]/,
];

/**
 * Dauerhafte Ausnahmen: Stellen, an denen Schriftgröße und GEOMETRIE
 * aneinander gerechnet sind. Eine Größe dort zu ändern, ohne ihre
 * Partnerkonstante neu herzuleiten, erzeugt Überlappung — und zwar nur im
 * erzeugten Bild, nicht auf der Seite, wo es niemand sieht.
 *
 * Wer eine dieser Dateien in die Skala holen will, leitet die Partnerkonstante
 * mit her. Das ist eine eigene Arbeit, kein Nebenbei-Fix.
 */
const GEOMETRIE_GEBUNDEN: { datei: string; grund: string }[] = [
  {
    datei: "lib/chart-export.ts",
    grund:
      "Neun Größen mit je einer von Hand geeichten Partnerkonstante: die " +
      "Titelbreite rechnet mit 8 px je Zeichen (auf 14 geeicht), der " +
      "Legendenvorschub mit 6,5 (auf 11 geeicht), dazu feste Blockhöhen, die " +
      "auf eine größere Schrift gar nicht reagieren.",
  },
  {
    datei: "components/WidgetExport.tsx",
    grund:
      "Die senkrechte Quellenangabe rechnet ihre Größe selbst aus — in " +
      "0,2er-Schritten von 9 auf 6 px herunter, bis der Text in die Spur " +
      "passt. Eine grobe Stufe zerstört den Mechanismus, und die Kante trägt " +
      "die Lizenzpflichtangabe.",
  },
  {
    datei: "components/charts/LineChart.tsx",
    grund:
      "Die Größe der Kurvenbeschriftung bestimmt über einen Zuschlag von " +
      "einem Viertel den rechten Rand der Zeichenfläche, nicht nur den Text.",
  },
  {
    datei: "components/social/SocialKarte.tsx",
    grund:
      "Zwei benannte Stufen mit eigenen absoluten Werten; die kleine lässt " +
      "Inhalt weg statt ihn zu verkleinern. Die Karte schneidet ab, was " +
      "wächst. Das ist bereits die gewünschte Lösung in klein.",
  },
  {
    datei: "components/atlas/RankingTable.tsx",
    grund:
      "Die Spaltenbreiten sind im Browser gemessene Kopfzeilenbreiten mit " +
      "ein bis zwei Pixeln Luft; aus ihnen entstehen Tabellenbreite, " +
      "Rasterspalten und Scroll-Rastpunkte.",
  },
  {
    datei: "app/api/og/route.tsx",
    grund:
      "Das Vorschaubild ist eine feste Leinwand ohne Stylesheet — es kennt " +
      "die Tokens nicht und braucht eigene Größen.",
  },
  {
    datei: "components/MastrLiveRadial.tsx",
    grund:
      "Größen sind mit Radien und Strichstärken des Rings gepaart; der Kopf " +
      "benutzt bereits bewusst die Skala.",
  },
];

/**
 * Einzelne Zeilen mit Begründung — für Dateien, die ansonsten auf der Skala
 * stehen. Der Vergleich läuft über ein Textfragment der Zeile, damit ein
 * Verschieben im Code die Ausnahme nicht ins Leere laufen lässt.
 */
const ERLAUBTE_ZEILEN: { fragment: string; grund: string }[] = [
  {
    fragment: "fontSize: 12.5",
    grund:
      "Zubau-Widget: bewusst nicht-runder Wert, gegen die Bildaufnahme " +
      "gerechnet — sie rendert breiter, als die Messung auf der Seite ergibt.",
  },
  {
    fragment: "font-size:15px !important",
    grund:
      "Kennzahl-Kachel im kompakten eingebetteten Zustand. Wert und Einheit " +
      "sind dort ein Rangfolge-Paar; die Zahl darf nicht ohne ihre Einheit " +
      "bewegt werden. Steht auf der Liste, bis der Embed-Bereich dran ist.",
  },
];

/**
 * Vorübergehend offen — mit Frist, sonst wird daraus eine stille Dauerausnahme.
 *
 * Die Kommunen-Ansicht wird gerade von einer anderen Sitzung umgebaut (eigener
 * Arbeitsstand, laufender Dev-Server). Zwei Sitzungen in derselben Datei ist
 * genau der Fall, den die Koordinationsregel verhindern soll; die Typografie
 * folgt, sobald dieser Umbau auf der Hauptlinie ist.
 *
 * Läuft die Frist ab, wird dieser Test rot. Das ist Absicht: Ein „OFFEN" ohne
 * Wecker ist ein Vorsatz, kein Termin.
 */
const NOCH_OFFEN: { datei: string; bis: string; grund: string }[] = [
  {
    datei: "app/(site)/admin/kommunen/client.tsx",
    bis: "2026-11-01",
    grund:
      "Eine andere Sitzung baut diese Ansicht gerade um. Keine Oberfläche mit " +
      "Publikum, kein Bild-Export — die 41 Stellen kosten niemanden etwas, " +
      "solange sie eingeplant bleiben.",
  },
];

function dateienUnter(rel: string): string[] {
  const abs = join(ROOT, rel);
  const out: string[] = [];
  const lauf = (p: string) => {
    for (const eintrag of readdirSync(p)) {
      if (eintrag === "node_modules" || eintrag === "__tests__") continue;
      const voll = join(p, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.tsx?$/.test(eintrag) && !eintrag.includes(".test.")) out.push(voll);
    }
  };
  if (statSync(abs).isDirectory()) lauf(abs);
  else out.push(abs);
  return out;
}

describe("Wächter: keine getippten Schriftgrößen", () => {
  it("nimmt jede Schriftgröße aus der Skala, außer mit Begründung", () => {
    const ausgenommen = new Set([
      ...GEOMETRIE_GEBUNDEN.map((a) => a.datei),
      ...NOCH_OFFEN.map((a) => a.datei),
    ]);
    const dateien = VERZEICHNISSE.flatMap(dateienUnter);
    expect(dateien.length).toBeGreaterThan(200);

    const funde: string[] = [];
    for (const datei of dateien) {
      const rel = datei.slice(ROOT.length + 1);
      if (ausgenommen.has(rel)) continue;
      readFileSync(datei, "utf8")
        .split("\n")
        .forEach((zeile, i) => {
          if (!GETIPPT.some((re) => re.test(zeile))) return;
          if (ERLAUBTE_ZEILEN.some((a) => zeile.includes(a.fragment))) return;
          funde.push(`${rel}:${i + 1}  ${zeile.trim().slice(0, 120)}`);
        });
    }

    // Bei einem Treffer: die Größe gehört in die Skala in lib/theme.ts. Braucht
    // die Rolle wirklich eine eigene Größe, kommt ein neues Token dazu
    // (Betreiber, 01.09.2026) — nicht eine getippte Zahl und nicht eine
    // aufgeweichte Regex.
    expect(funde).toEqual([]);
  });

  it("nennt für jede Ausnahme einen Grund und meint eine Datei, die es gibt", () => {
    for (const a of GEOMETRIE_GEBUNDEN) {
      expect(a.grund.length, a.datei).toBeGreaterThan(40);
      expect(() => statSync(join(ROOT, a.datei)), a.datei).not.toThrow();
    }
    for (const a of ERLAUBTE_ZEILEN) expect(a.grund.length, a.fragment).toBeGreaterThan(40);
  });

  it("zeigt jede Stufe der Skala im Design-Guide", () => {
    // Der Guide ist die Stelle, an der über eine Größe entschieden wird. Bis
    // zum 01.09.2026 stand dort eine handgetippte Liste mit acht Zeilen, von
    // denen keine mehr stimmte — man baut danach, ohne es zu merken. Eine neue
    // Stufe, die dort fehlt, existiert für den Entwurf nicht.
    const theme = readFileSync(join(ROOT, "lib/theme.ts"), "utf8");
    const guide = readFileSync(join(ROOT, "app/(site)/admin/theme/client.tsx"), "utf8");
    const stufen = [...theme.matchAll(/'(--font-size-[a-z0-9-]+)':/g)].map((m) => m[1]);
    expect(stufen.length).toBeGreaterThanOrEqual(12);
    const fehlend = stufen.filter((t) => !guide.includes(`"${t}" as const`));
    expect(fehlend, `Diese Stufen fehlen im Design-Guide: ${fehlend.join(", ")}`).toEqual([]);
  });

  it("lässt keine offene Frist verstreichen", () => {
    const heute = new Date().toISOString().slice(0, 10);
    for (const a of NOCH_OFFEN) {
      expect(a.grund.length, a.datei).toBeGreaterThan(40);
      expect(() => statSync(join(ROOT, a.datei)), a.datei).not.toThrow();
      // Abgelaufen heißt: entweder die Datei umstellen oder die Frist mit
      // einem neuen Grund verlängern. Stillschweigend weiterlaufen lassen ist
      // die einzige Möglichkeit, die dieser Test ausschließt.
      expect(a.bis > heute, `Frist für ${a.datei} ist am ${a.bis} abgelaufen`).toBe(true);
    }
  });
});
