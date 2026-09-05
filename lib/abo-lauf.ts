import "server-only";

// ─── Der Versandlauf: aus Zahlen wird Post ───────────────────────────────────
//
// Er beantwortet je Ort eine einzige Frage — „gibt es hier etwas zu berichten?"
// — und schickt nur dann. Die Antwort rechnet `gemeindeMeldungen()`, also
// dieselbe Funktion, die auch den Block auf der Gemeindeseite speist. Eine
// zweite Fassung davon wäre der Weg, auf dem eine Mail etwas behauptet, das
// die verlinkte Seite widerlegt — genau der Fehler, der beim
// Kommunen-Anschreiben passiert ist.
//
// ─── Was diesen Lauf von einem Newsletter-Versand unterscheidet ──────────────
//
// KEIN TAKT. Er läuft, wann er läuft; ob eine Mail entsteht, entscheidet
// ausschließlich der Anlass. Genau das steht neben dem Anmeldeknopf, und eine
// Mail ohne Anlass wäre die Zusage gebrochen, für die sich jemand eingetragen
// hat.
//
// EINE MAIL JE ORT UND ABONNENT, nie zwei am selben Tag. Der Merker dafür ist
// der Zeitpunkt der letzten Meldung an dieser Zeile — und der wird VOR dem
// Versand gesetzt, nicht danach: Bricht der Lauf zwischen zwei Empfängern ab,
// darf der Neustart niemanden ein zweites Mal anschreiben. Der Preis ist, dass
// ein fehlgeschlagener Versand als „geschrieben" gilt; das ist die günstigere
// Richtung.
//
// EIN VERSANDFENSTER, ABER KEINE FERIENBREMSE. Die Anschreiben an Rathäuser
// halten Schulferien, Wochentag und Tagespensum ein — das sind Bremsen gegen
// Kaltakquise. Hier haben Menschen die Meldung bestellt; ihnen etwas
// vorzuenthalten, weil in ihrem Bundesland Ferien sind, wäre keine Rücksicht.
// Geprüft wird nur, ob der Zeitpunkt die Mail unnötig begräbt, und das auch
// erst ab einer Menge, bei der der gemessene Unterschied überhaupt einen
// Empfänger ausmacht (siehe `lib/versandzeit.ts`).
//
// KEINE EIGENE EMPFÄNGER-ABFRAGE. Wer bekommt eine Meldung, beantwortet
// `empfaengerFuerOrt()` — die einzige Stelle, die auf „bestätigt" filtert.
// Nach der Abmeldung bleibt die Zeile als Nachweis stehen, und ein zweiter
// Lesepfad würde genau diese Trennung aufheben.

import { empfaengerFuerOrt, versandVermerken, type GemeindeAbo } from "./gemeinde-abo";
import { gemeindeMeldungen, hatNachricht, type Meldung } from "./gemeinde-meldungen";
import { aboMeldungsMail } from "./abo-mail";
import { abmeldeLink, einstellungenLink } from "./abo-token";
import { sendeAboMail } from "./abo-versand";
import { getRegionAtlasData } from "./mastr-data";
import { getRegionById, atlasPathForRegionId } from "./atlas";
import { tagMonatJahr } from "./stand-format";
import { versandzeitOk } from "./versandzeit";

export type LaufErgebnis = {
  /** Orte, für die es überhaupt Abonnenten gibt. */
  orteGeprueft: number;
  /** Orte, die gerade nichts zu berichten hatten. */
  orteStill: number;
  versendet: number;
  fehlgeschlagen: number;
  /** Gesetzt, wenn der Lauf wegen des Versandfensters nichts geschickt hat. */
  verschoben: string | null;
  /** Was schiefging — für den Bericht, nicht für den Nutzer. */
  fehler: string[];
};

/**
 * Ein Ort, seine Empfänger und seine Meldungen.
 *
 * Getrennt vom Versand, damit sich das Ergebnis prüfen lässt, ohne dass eine
 * Mail hinausgeht — und damit ein Probelauf dasselbe rechnet wie der echte.
 */
export async function meldungenFuerOrt(
  regionId: string,
  heuteJahr: number,
): Promise<{ meldungen: Meldung[]; ortName: string; ortUrl: string | null; standIso: string } | null> {
  const region = await getRegionById(regionId);
  if (!region) return null;

  const atlas = await getRegionAtlasData(regionId);
  if (!atlas) return null;

  const meldungen = gemeindeMeldungen({
    daten: {
      name: region.name,
      regionId,
      population: region.population ?? null,
      solar: atlas.solar,
      speicher: atlas.speicher,
      standIso: atlas.data_as_of,
    },
    heuteJahr,
  });

  const pfad = await atlasPathForRegionId(regionId);
  return {
    meldungen,
    ortName: region.name,
    ortUrl: pfad,
    standIso: atlas.data_as_of,
  };
}

/**
 * Der Lauf.
 *
 * `orte` sind die Gemeindeschlüssel, für die es Abonnenten gibt — der Aufrufer
 * ermittelt sie, damit dieser Lauf nicht die ganze Tabelle scannt.
 *
 * `jetzt` und `basisUrl` werden hereingereicht: die Zeit, weil sich sonst nichts
 * prüfen lässt, ohne die Systemuhr zu verstellen; die Adresse, weil ein Link,
 * der in der Entwicklung auf die Produktion zeigt, jede Bestätigung ins Leere
 * laufen lässt (genau so ist es beim ersten Test passiert).
 */
export async function aboLauf(o: {
  orte: string[];
  jetzt: Date;
  basisUrl: string;
  /** Nichts versenden, nur rechnen. Für den Probelauf. */
  trocken?: boolean;
}): Promise<LaufErgebnis> {
  const erg: LaufErgebnis = {
    orteGeprueft: 0,
    orteStill: 0,
    versendet: 0,
    fehlgeschlagen: 0,
    verschoben: null,
    fehler: [],
  };
  const heuteJahr = o.jetzt.getUTCFullYear();
  const jetztIso = o.jetzt.toISOString();

  // ─── Erst rechnen, dann schicken ──────────────────────────────────────────
  //
  // Zwei Durchgänge statt einem, weil das Versandfenster die Menge kennen muss,
  // BEVOR die erste Mail draußen ist. Ein Fenster, das mitten im Lauf zuschlägt,
  // hätte die Hälfte verschickt und die andere Hälfte auf morgen vertagt — und
  // wer dann nachsieht, findet einen Lauf, der weder gelaufen noch gestoppt ist.
  const versandliste: { abo: GemeindeAbo; stoff: NonNullable<Awaited<ReturnType<typeof meldungenFuerOrt>>> }[] = [];

  for (const regionId of o.orte) {
    erg.orteGeprueft++;

    let stoff: Awaited<ReturnType<typeof meldungenFuerOrt>>;
    try {
      stoff = await meldungenFuerOrt(regionId, heuteJahr);
    } catch (e) {
      erg.fehler.push(`${regionId}: Daten nicht ladbar — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (!stoff || !stoff.ortUrl) {
      erg.fehler.push(`${regionId}: kein Ort oder keine Adresse dazu`);
      continue;
    }

    // DIE EIGENTLICHE ENTSCHEIDUNG. `hatNachricht` ist schärfer als „es gibt
    // eine Meldung": Eine reine Bestandsbeschreibung stand beim letzten Mal
    // genauso da und ist keine Nachricht.
    if (!hatNachricht(stoff.meldungen)) {
      erg.orteStill++;
      continue;
    }

    const empfaenger = await empfaengerFuerOrt(regionId);
    const offen = empfaenger.filter((abo) => !schonHeuteGeschrieben(abo, o.jetzt));
    if (offen.length === 0) {
      erg.orteStill++;
      continue;
    }
    for (const abo of offen) versandliste.push({ abo, stoff });
  }

  // ─── Das Versandfenster ───────────────────────────────────────────────────
  //
  // Es greift NICHT im Probelauf: Der verschickt ohnehin nichts, und ein
  // Probelauf, der außerhalb des Fensters schweigt, verbirgt genau das, wofür
  // es ihn gibt.
  const fenster = versandzeitOk(o.jetzt, versandliste.length);
  if (!fenster.ok && !o.trocken) {
    erg.verschoben = `${fenster.grund}. Nächstes Fenster: ${fenster.naechstes}. ${versandliste.length} Meldungen warten.`;
    return erg;
  }
  if (!fenster.ok) erg.verschoben = `Nur im Probelauf gerechnet — echt wäre verschoben: ${fenster.grund}.`;

  for (const { abo, stoff } of versandliste) {
    if (o.trocken) {
      erg.versendet++;
      continue;
    }

    // VOR dem Versand vermerken, nicht danach — siehe Kopf. Schlägt das
    // Vermerken fehl, wird gar nicht erst gesendet: Lieber eine Meldung zu
    // wenig als dieselbe zweimal.
    try {
      await versandVermerken(abo.id, jetztIso);
    } catch (e) {
      erg.fehlgeschlagen++;
      erg.fehler.push(`${abo.id}: Versandmerker nicht gesetzt — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const abmeldeUrl = abmeldeLink(o.basisUrl, abo.id);
    const einstellungenUrl = einstellungenLink(o.basisUrl, abo.id);
    const mail = aboMeldungsMail({
      ortName: stoff.ortName,
      ortUrl: `${o.basisUrl}${stoff.ortUrl}`,
      einstellungenUrl,
      meldungen: stoff.meldungen,
      abmeldeUrl,
      standLabel: tagMonatJahr(stoff.standIso.slice(0, 10)),
    });

    const versand = await sendeAboMail({
      an: abo.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      abmeldeUrl,
      art: "meldung",
    });

    if (versand.ok) erg.versendet++;
    else {
      erg.fehlgeschlagen++;
      erg.fehler.push(`${abo.id}: ${versand.fehler}`);
    }
  }

  return erg;
}

/**
 * Hat dieses Abo heute schon Post bekommen?
 *
 * Die Bremse gegen den doppelten Versand. Sie greift am KALENDERTAG, nicht an
 * einem Zeitabstand: Zwei Läufe am selben Tag sollen sich nicht überholen, ein
 * Lauf am nächsten Tag aber schreiben dürfen, wenn es einen neuen Anlass gibt.
 */
function schonHeuteGeschrieben(abo: GemeindeAbo, jetzt: Date): boolean {
  if (!abo.letzteMailAm) return false;
  return abo.letzteMailAm.slice(0, 10) === jetzt.toISOString().slice(0, 10);
}
