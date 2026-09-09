/**
 * Was der tägliche Rücklauf-Lauf zu melden hat — als reine Funktion.
 *
 * WOZU DIESE DATEI: Der Lauf holt das Postfach ab und trägt Status nach. Bis
 * zum 09.09.2026 endete er damit im Protokoll eines Terminals, das niemand
 * öffnet. Trier antwortete am 09.09. auf ein Anschreiben, und dieselbe Antwort
 * lag Tage später immer noch ungelesen da; die Auswertung meldete
 * währenddessen „keine Reaktion". Ein Automatismus, dessen Ergebnis nirgends
 * ankommt, ist von einem stillstehenden nicht zu unterscheiden.
 *
 * DIE URTEILSBILDUNG STEHT HIER UND NICHT IM SKRIPT, weil sie sonst nur über
 * einen Import erreichbar wäre, der beim Laden ein Postfach verlangt — also
 * nicht prüfbar. Dieselbe Trennung wie bei der Sendeseite der Schleuse.
 *
 * WAS EINE ENTSCHEIDUNG IST, UND WAS NICHT (die Schleuse stellt nur
 * Entscheidungen zu — alles andere landet stumm in der Ablage):
 *
 *  · ANTWORT → Entscheidung. Ein Mensch hat geschrieben und wartet. Das ist
 *    der einzige Rücklauf, der ohne Zutun verfällt: Eine Gemeinde, die keine
 *    Antwort bekommt, fragt kein zweites Mal.
 *  · WIDERSPRUCH → Entscheidung. Er ist bereits vollzogen (die Gemeinde steht
 *    auf „gesperrt", und das ist eine Einbahnstraße). Gerade deshalb gehört er
 *    gemeldet: Ist er falsch erkannt, ist das die einzige Gelegenheit, es zu
 *    merken.
 *  · UNZUSTELLBAR → erledigt, keine Entscheidung. Der Lauf hat den Status
 *    gesetzt, zu entscheiden gibt es nichts.
 *  · ABWESENHEIT und UNKLAR-MASCHINELL → nur Details. Sie ändern nichts, und
 *    eine Mail je Urlaubsnotiz wäre der Lärm, nach dem niemand mehr hinsieht.
 *
 * NUR NEUES WIRD GEMELDET. Der Lauf sieht dasselbe Postfach jeden Tag und
 * findet dieselbe Antwort wieder; gemeldet wird, was er WIRKLICH nachgetragen
 * hat (die Dublettenprüfung des Laufs entscheidet das). Sonst stünde Trier
 * jeden Morgen erneut in der Mail und wäre nach einer Woche genau das, was
 * dieser Bericht verhindern soll: etwas, das man wegklickt.
 */

export type BerichtBefund = {
  art: string;
  /** Name der Gemeinde. Ein Ortsschlüssel sagt einem Menschen nichts. */
  name: string | null;
  betreff: string;
  von: string;
  datum: string;
};

export type BerichtEingabe = {
  /** Was dieser Lauf tatsächlich neu nachgetragen hat. */
  neu: BerichtBefund[];
  /** Wie viele Mails keiner Gemeinde zuzuordnen waren. */
  unklar: number;
  /** Zeitraum des Abrufs in Tagen — sonst ist „nichts Neues" nicht einzuordnen. */
  tage: number;
};

export type Bericht = {
  decisions: string[];
  done: string[];
  details: string;
  audience: "betreiber" | "claude";
};

/** Eine Zeile über eine Rückmeldung, wie ein Mensch sie lesen will. */
function zeile(b: BerichtBefund): string {
  return `${b.name ?? b.von} (${b.datum}): „${b.betreff}"`;
}

export function ruecklaufBericht(e: BerichtEingabe): Bericht {
  const antworten = e.neu.filter((b) => b.art === "antwort");
  const widersprueche = e.neu.filter((b) => b.art === "widerspruch");
  const unzustellbar = e.neu.filter((b) => b.art === "unzustellbar");

  const decisions: string[] = [];
  for (const b of antworten) {
    decisions.push(`${zeile(b)} — hat geantwortet und wartet auf eine Reaktion.`);
  }
  for (const b of widersprueche) {
    decisions.push(
      `${zeile(b)} — als Widerspruch eingestuft und dauerhaft gesperrt. Falls das ein Irrtum ist, jetzt melden.`,
    );
  }

  const done: string[] = [];
  if (unzustellbar.length) {
    done.push(
      `${unzustellbar.length} ${unzustellbar.length === 1 ? "Adresse" : "Adressen"} als unzustellbar vermerkt: ` +
        unzustellbar.map((b) => b.name ?? b.von).join(", "),
    );
  }
  // Die maschinellen Meldungen zusammen, nicht einzeln: Sie ändern nichts, und
  // vierzehn Zeilen Urlaubsnotiz verdecken die eine Antwort darüber.
  const stumm = e.neu.length - antworten.length - widersprueche.length - unzustellbar.length;
  if (stumm) {
    done.push(
      `${stumm} maschinelle Meldung${stumm === 1 ? "" : "en"} (Abwesenheit, Eingangsbestätigung) — ohne Folge.`,
    );
  }
  if (!e.neu.length) done.push(`Postfach der letzten ${e.tage} Tage abgerufen, nichts Neues.`);

  const details =
    `Abruf über ${e.tage} Tage. ${e.neu.length} neue ${e.neu.length === 1 ? "Rückmeldung" : "Rückmeldungen"} nachgetragen.` +
    (e.unklar
      ? ` ${e.unklar} Mail${e.unklar === 1 ? "" : "s"} ließen sich keiner Gemeinde zuordnen — im Postfach ansehen.`
      : "");

  return {
    decisions,
    done,
    details,
    // Ohne Entscheidung geht der Bericht an Claude und wird stumm abgelegt.
    audience: decisions.length ? "betreiber" : "claude",
  };
}
