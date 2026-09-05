/**
 * Die SENDESEITE der Schleuse: einen Wächter-Bericht in der Ablage abgeben.
 *
 * `lib/alert-format.ts` entscheidet auf der Empfangsseite, ob ein Bericht
 * zugestellt wird. Hier steht das Gegenstück — wie er überhaupt dort ankommt.
 *
 * WARUM ES DIESE DATEI GIBT (gemessen am 30.08.2026, Lauf 33304098485)
 *
 * Der Tagesbericht der Förder-Erfassung war fertig gerechnet und stand
 * vollständig im Protokoll; zehn Sekunden später warf der einzige, ungeschützte
 * `fetch` ein nacktes „fetch failed". Das Skript endete mit 1, der Workflow
 * wurde rot — und die beiden Schritte DAHINTER (Screening und Leseliste, also
 * die Arbeit an der Katalog-Vollständigkeit) wurden übersprungen. Ein Wackler
 * beim MELDEN hat damit einen Tag ERFASSUNG gekostet. Dieselbe Fehlerklasse,
 * die diesen Workflow schon einmal vier Tage lang stumm hatte (20.–23.08.2026),
 * nur an einer anderen Stelle.
 *
 * ZWEI REGELN, UND DIE ZWEITE MACHT DEN LAUF STRENGER, NICHT LOCKERER:
 *
 *  · Wiederholt wird bei einem Abbruch und bei 5xx/429 — die Ausgänge, die beim
 *    nächsten Versuch anders sein können. Bei 4xx NICHT: Ein falsches Geheimnis
 *    oder eine kaputte Nutzlast wird durch Warten nicht richtig, und drei
 *    Anläufe verzögern dann nur das Rot.
 *
 *  · Ein Antwortcode ungleich 2xx zählt als Fehlschlag. Vorher wurde er bloß
 *    ausgegeben und der Aufrufer endete mit 0: Ein 500 aus unserer eigenen
 *    Ablage hätte einen GRÜNEN Lauf ohne Eintrag hinterlassen — und ein Lauf
 *    ohne Eintrag ist von „gar nicht gelaufen" nicht zu unterscheiden. Genau
 *    dafür gibt es den Bericht.
 *
 * Bleibt es nach allen Versuchen dabei, wirft die Funktion. Das ist gewollt:
 * Dann ist nicht das Netz schuld, sondern unsere Ablage — und das gehört
 * angesehen.
 *
 * Die Funktion steht bewusst hier und nicht im Skript: Im Skript wäre sie nur
 * über einen Import erreichbar, der beim Laden Zugangsdaten verlangt und
 * `main()` startet — also nicht prüfbar. Ein Melde-Weg, dessen Wiederholung
 * niemand nachmessen kann, ist genau die Sorte Sicherheitsnetz, von dem man
 * erst beim Reißen erfährt.
 */

/** Wartezeiten nach Versuch 1 und 2. Danach ist Schluss. */
export const ABLAGE_WARTEZEITEN_MS = [2000, 6000];

/** Ein einzelner Versuch darf nicht ewig hängen — der Lauf hat ein Zeitlimit. */
export const ABLAGE_VERSUCH_TIMEOUT_MS = 20000;

/** Lohnt ein weiterer Versuch? Nur, wenn der Ausgang beim nächsten Mal anders sein kann. */
export function nochmalVersuchen(status: number): boolean {
  return status >= 500 || status === 429;
}

export type AblageOptionen = {
  /** Basis-Adresse der Ablage. Default: die Produktion. */
  basis?: string;
  /** Für Tests: Wartezeiten verkürzen, ohne die Reihenfolge zu ändern. */
  wartezeiten?: number[];
  /** Für Tests einsetzbar. */
  fetchImpl?: typeof fetch;
  /** Für Tests einsetzbar. */
  warte?: (ms: number) => Promise<void>;
  /** Ausgabe. Default: console.log. */
  log?: (zeile: string) => void;
};

/**
 * Legt einen Bericht in der Ablage ab. Wirft, wenn das endgültig misslingt.
 *
 * @param nutzlast  Bericht samt `tag` — ohne Kennzeichen ist er keinem Auftrag
 *                  zuzuordnen und damit von einem ausgefallenen Lauf nicht zu
 *                  unterscheiden.
 * @param secret    Das CRON_SECRET. Wird nie ausgegeben.
 */
export async function berichtAblegen(
  nutzlast: Record<string, unknown>,
  secret: string,
  opts: AblageOptionen = {},
): Promise<void> {
  const basis = opts.basis ?? "https://solar-check.io";
  const wartezeiten = opts.wartezeiten ?? ABLAGE_WARTEZEITEN_MS;
  const tuen = opts.fetchImpl ?? fetch;
  const warte = opts.warte ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = opts.log ?? ((z: string) => console.log(z));

  let letzter = "kein Versuch gelaufen";

  for (let versuch = 1; versuch <= wartezeiten.length + 1; versuch++) {
    let weiterVersuchen = true;

    try {
      const res = await tuen(`${basis}/api/alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(nutzlast),
        signal: AbortSignal.timeout(ABLAGE_VERSUCH_TIMEOUT_MS),
      });

      if (res.ok) {
        const info = (await res.json().catch(() => ({}))) as { skipped?: boolean };
        log(
          `An die Ablage gemeldet: HTTP ${res.status}` +
            (info.skipped ? " (abgelegt, keine Mail — nichts zu entscheiden)" : ""),
        );
        return;
      }

      letzter = `HTTP ${res.status}`;
      weiterVersuchen = nochmalVersuchen(res.status);
    } catch (e) {
      letzter = e instanceof Error ? e.message : String(e);
    }

    const warten = weiterVersuchen ? wartezeiten[versuch - 1] : undefined;
    if (warten === undefined) break;
    log(`Ablage-Versuch ${versuch} fehlgeschlagen (${letzter}) — neuer Versuch in ${warten / 1000}s.`);
    await warte(warten);
  }

  throw new Error(
    `Bericht konnte nicht abgelegt werden (${letzter}). Der Lauf selbst ist gelaufen, nur die Rechenschaft fehlt.`,
  );
}
