// ─── Was ein Meister zu dieser Empfehlung sagen würde ─────────────────────────
//
// Keine Empfehlung steht ohne fachliche Einordnung auf dem Bildschirm. Die
// Regeln hier stammen aus einer Prüfung durch einen Heizungsbaumeister
// (05.09.2026) und leiten sich ausschließlich aus Angaben ab, die der Rechner
// ohnehin hat — es gibt dafür keine einzige zusätzliche Nutzerfrage.
//
// ZWEI EBENEN, und das ist keine Kosmetik. Ein Neubau-Monoblock mit Propan
// erfüllt sechs Regeln gleichzeitig; stünden alle an der Kachel, läse sie
// niemand, und drei davon stünden zusätzlich unter jeder der drei Kacheln
// dreimal. Also:
//
//   `geraeteHinweise` — was an DIESEM Gerät hängt, an der Kachel, höchstens zwei
//   `fallHinweise`    — was am Haus hängt, einmal unter der Liste
//
// KEINE KAUFAUFFORDERUNG. Das sind fachliche Einordnungen, keine Werbung — die
// Kachel daneben trägt einen Affiliate-Link, und ein Satz, der zum Kauf drängt,
// wäre an dieser Stelle eine geschäftliche Handlung mit ganz anderen
// Anforderungen. Umgekehrt gilt: Was wir nicht wissen, wird als offen benannt,
// nicht plausibel formuliert.
//
// KEINE EINBAUHINWEISE — BLOCKER, Vorgabe des Betreibers am 05.09.2026.
//
// Jeder Hinweis beantwortet genau eine Frage: WAS MUSS ICH KLÄREN ODER WISSEN,
// BEVOR ICH DIESES GERÄT KAUFE? Nicht: wie wird es richtig eingebaut.
//
// Die erste Fassung dieses Moduls hat beides vermischt, und der Betreiber hat
// es an einem Satz festgemacht: „Propan ist schwerer als Luft" — fachlich
// richtig, für die Kaufentscheidung ohne Wert, und niemand liest es. Vier
// weitere Sätze hatten dieselbe Form: der Frostschutz am Monoblock, der
// Kondensatablauf, was der hydraulische Abgleich bewirkt, wie ein Gerät
// aufgestellt gehört. Alles davon geht den Handwerker an, keines den Käufer.
//
// Die Prüffrage bei jeder neuen Regel: Kann der Leser damit VOR dem Kauf etwas
// entscheiden, prüfen oder erfragen? Wenn die Antwort „nein, aber es ist
// wichtig, dass es richtig gemacht wird" lautet, gehört sie nicht hierher.
//
// Ein Kostenposten, der in keinem Gerätepreis steckt, IST ein Kaufhinweis —
// dann steht er als Kostenposten da, nicht als Erklärung seiner Funktion.

import type { WpGeraet } from "./wp-katalog";
import { leistungAmAuslegungspunkt, type WpFall } from "./wp-empfehlung";

/**
 * Der Fall, angereichert um das, was die Hinweise brauchen.
 *
 * Alle vier Zusatzangaben stehen im Rechner bereits und sind im gewählten
 * Sanierungsweg aufgelöst — durchgereicht wird der EFFEKTIVE Zustand, nicht der
 * Rohzustand der Fragen. Wer den Weg „Heizkörper fit machen" wählt, bekommt
 * sonst einen Hinweis, der ihm genau das noch einmal vorschlägt.
 */
export interface WpHinweisFall extends WpFall {
  situation: "bestand" | "neubau";
  heizsystem: "fbh" | "hk_neu" | "hk_alt";
  /** Personen im Haushalt (1, 2, 3,5 oder 5 — die Stufen des Rechners). */
  personen: number;
  heizkoerperTausch: boolean;
}

/**
 * Wie dringend der Hinweis ist.
 *
 *   `warnung`     — kann den Kauf zum Fehlkauf machen oder Geld kosten
 *   `hinweis`     — sollte vor der Bestellung geklärt sein
 *   `einordnung`  — hilft beim Verstehen, hat keine Handlungsfolge
 *
 * Die Reihenfolge ist die Anzeigereihenfolge. An der Kachel überleben nur die
 * ersten beiden — deshalb muss die Einstufung stimmen.
 */
export type HinweisGewicht = "warnung" | "hinweis" | "einordnung";

/**
 * Wozu der Hinweis gehört — Vorgabe des Betreibers am 05.09.2026:
 * „in erster linie sollten hinweise zur auswahl dort stehen. dann evtl. noch
 * sowas wie: apropos…"
 *
 *   `auswahl`  — betrifft, WELCHES Gerät zu diesem Haus passt: Leistung,
 *                Vorlauftemperatur, Eignung, Lieferumfang, was im Preis steckt.
 *                Ohne diese Zeile trifft der Leser eine schlechtere Wahl.
 *   `apropos`  — gehört zum Vorhaben, aber nicht zur Wahl zwischen den
 *                gezeigten Geräten: Genehmigungen, Nachbarschaft, Elektrik,
 *                Kostenposten, die bei jedem Gerät gleich anfallen.
 *
 * Der Unterschied ist keine Wichtigkeit, sondern eine Zuständigkeit. Ein
 * Apropos-Hinweis kann eine Warnung sein (die Erdwärmebohrung braucht drei
 * Monate Vorlauf) und trotzdem für die Auswahl zwischen drei Geräten
 * bedeutungslos — er gilt für alle drei gleich.
 *
 * Warum die Trennung überhaupt: Beim Altbau mit alten Heizkörpern standen
 * NEUN Zeilen unter der Liste. Jede berechtigt, zusammen liest sie niemand.
 * Getrennt sind es drei zur Auswahl und ein abgesetzter Apropos-Block.
 */
export type HinweisArt = "auswahl" | "apropos";

export interface Hinweis {
  /** Stabile Kennung, damit Tests und Oberfläche denselben Hinweis meinen. */
  id: string;
  text: string;
  gewicht: HinweisGewicht;
  art: HinweisArt;
}

/**
 * Wie viele Hinweise an einer Kachel höchstens stehen — MIT EINER AUSNAHME.
 *
 * Zwei ist die Zahl, ab der eine Kachel gelesen wird statt überflogen. Aber
 * Warnungen werden nie abgeschnitten, auch wenn es drei sind: Eine Warnung ist
 * definitionsgemäß etwas, das den Kauf zum Fehlkauf machen kann, und sie
 * wegzulassen, damit die Kachel aufgeräumter aussieht, wäre genau die
 * Abwägung, die dieses Modul nicht treffen darf.
 *
 * Der Fall tritt real ein: Ein Split-Gerät mit Propan, das als nacktes Gerät
 * verkauft wird, trägt drei Warnungen — Sachkunde des Monteurs, Aufstellort und
 * Lieferumfang. Alle drei entscheiden über den Kauf, keine ist verzichtbar.
 */
export const HINWEISE_JE_KACHEL = 2;

const RANG: Record<HinweisGewicht, number> = { warnung: 0, hinweis: 1, einordnung: 2 };

const ART_RANG: Record<HinweisArt, number> = { auswahl: 0, apropos: 1 };

/**
 * Erst die Auswahl, dann das Übrige — darin nach Dringlichkeit.
 *
 * Die Reihenfolge der beiden Schlüssel ist die Vorgabe: Ein Apropos-Hinweis
 * steht nie über einem Auswahl-Hinweis, auch wenn er eine Warnung ist und
 * jener nur eine Einordnung. Wer die Geräte vergleicht, soll zuerst lesen,
 * was sie unterscheidet.
 */
function sortiere(hinweise: Hinweis[]): Hinweis[] {
  return [...hinweise].sort(
    (a, b) => ART_RANG[a.art] - ART_RANG[b.art] || RANG[a.gewicht] - RANG[b.gewicht],
  );
}

/**
 * Kürzen auf die Grenze — aber jede Warnung überlebt.
 *
 * `slice` allein hätte an einem Split-Gerät mit Propan den Lieferumfang-Hinweis
 * verschluckt, obwohl er dieselbe Dringlichkeit trägt. Was auffüllt, sind
 * Hinweise und Einordnungen, in der Reihenfolge aus `sortiere` — also Auswahl
 * vor Apropos.
 */
function kuerze(sortiert: Hinweis[], grenze: number): Hinweis[] {
  const warnungen = sortiert.filter((h) => h.gewicht === "warnung");
  const rest = sortiert.filter((h) => h.gewicht !== "warnung");
  return [...warnungen, ...rest.slice(0, Math.max(0, grenze - warnungen.length))];
}

/** Die beiden Blöcke unter der Liste, getrennt. */
export function hinweiseNachArt(hinweise: Hinweis[]): Record<HinweisArt, Hinweis[]> {
  return {
    auswahl: hinweise.filter((h) => h.art === "auswahl"),
    apropos: hinweise.filter((h) => h.art === "apropos"),
  };
}

/** Eine Kilowattzahl für den Fließtext — eine Nachkommastelle, deutsches Komma. */
function kw(wert: number): string {
  return (Math.round(wert * 10) / 10).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

// ─── Gerätebezogene Hinweise ─────────────────────────────────────────────────

/**
 * Ab welchem Verhältnis wir das Taktverhalten ansprechen.
 *
 * Unterhalb von 1,3 moduliert praktisch jedes Inverter-Gerät noch sauber
 * herunter; die harte Ausschlussgrenze liegt bei 1,6 (siehe `wp-empfehlung`).
 * Dazwischen ist ein Gerät erlaubt, aber der Nutzer soll wissen, was er kauft.
 */
const TAKT_AB_FAKTOR = 1.3;

/**
 * Die Hinweise zu einem Gerät, nach Dringlichkeit sortiert und gekürzt.
 *
 * Die Grenze ist ein Parameter, damit Prüfungen die REGEL sehen können und
 * nicht nur, was davon auf die Kachel passt. Ohne sie prüft ein Test, dessen
 * Hinweis gerade abgeschnitten wird, stillschweigend nichts mehr.
 */
export function geraeteHinweise(
  g: WpGeraet,
  fall: WpHinweisFall,
  grenze: number = HINWEISE_JE_KACHEL,
): Hinweis[] {
  const alle: Hinweis[] = [];
  const real = leistungAmAuslegungspunkt(g, fall);

  // ── A1: reichlich Leistung, aber noch erlaubt ──────────────────────────────
  // Der frühere Satz hieß „läuft öfter im Takt" und benannte die Folge nicht.
  // Genau das hat die fachliche Prüfung als Verharmlosung beanstandet: Gute
  // Inverter modulieren bis 25–30 % ihrer Maximalleistung, viele nur bis 40 %.
  // Bei mildem Wetter kommt ein zu großes Gerät nicht weit genug herunter und
  // schaltet ein und aus statt durchzulaufen — Hersteller geben höchstens drei
  // Verdichterstarts je Stunde frei.
  if (real >= fall.auslegungKw * TAKT_AB_FAKTOR) {
    alle.push({
      id: "leistung-takten",
      text:
        `Dieses Gerät liefert am kältesten Tag rund ${kw(real - fall.auslegungKw)} kW mehr, ` +
        `als dein Haus braucht. An milden Tagen kommt es dann nicht weit genug herunter und ` +
        `schaltet sich häufiger ein und aus — das kostet Jahresarbeitszahl und Lebensdauer ` +
        `des Verdichters.`,
      gewicht: "warnung",
      art: "auswahl",
    });
  }

  // ── A2: Leistung aus der Typenbezeichnung abgeleitet ───────────────────────
  // Sie taugt zur Vorauswahl, aber sie ist auf ganze Kilowatt gerundet.
  // Gemessene Abweichung im eigenen Bestand: bis 0,63 kW.
  if (g.herkunft === "typenschluessel") {
    alle.push({
      id: "leistung-abgeleitet",
      text:
        "Die Heizleistung steht in diesem Angebot nicht, wir haben sie aus der " +
        "Typenbezeichnung abgeleitet. Sie ist auf ganze Kilowatt gerundet und kann rund ein " +
        "halbes Kilowatt danebenliegen — für die Vorauswahl reicht das, für die Bestellung nicht.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  // ── B1: höchste Vorlauftemperatur unbekannt ────────────────────────────────
  // BEWUSST ZWEI FASSUNGEN. Der frühere Satz stand unkonditioniert da. Gemessen
  // tragen 291 von 755 Geräten keine Angabe — bei einem 35-°C-Neubau erzeugt
  // ein Warnton dort Sorge ohne Anlass: Von den Geräten MIT Angabe liegen nur
  // vier bei 35 °C, alle übrigen zwischen 55 und 75 °C. Bei 55 °C ist es
  // dagegen genau die Angabe, an der die Eignung hängt.
  if (g.vorlaufMaxC === null) {
    alle.push(
      fall.vorlaufC >= 50
        ? {
            id: "vorlauf-unbekannt-kritisch",
            text:
              "Der Händler nennt für dieses Gerät keine höchste Vorlauftemperatur. Bei deinen " +
              `${fall.vorlaufC} °C ist genau das die Angabe, an der die Eignung hängt — lass sie ` +
              "dir vor der Bestellung schriftlich geben.",
            gewicht: "warnung",
            art: "auswahl",
          }
        : {
            id: "vorlauf-unbekannt-unkritisch",
            text:
              "Der Händler nennt keine höchste Vorlauftemperatur. Für deine Heizung mit " +
              `${fall.vorlaufC} °C spielt das keine Rolle; fürs Warmwasser braucht das Gerät ` +
              "rund 50 °C, und das schafft heute jede aktuelle Baureihe.",
            gewicht: "einordnung",
            art: "auswahl",
          },
    );
  }

  // ── B4: Propan bei hoher Vorlauftemperatur ─────────────────────────────────
  // Bewusst NICHT als „R32 kann das nicht" formuliert: R32-Baureihen reichen bis
  // 62–65 °C. Die gemessene Verteilung stützt nur die positive Aussage — die
  // 75-°C-Klasse (98 Geräte) ist praktisch durchweg Propan.
  if (fall.vorlaufC >= 50 && g.kaeltemittel === "r290") {
    alle.push({
      id: "propan-hohe-vorlauftemperatur",
      text:
        "Geräte mit Propan erreichen die hohen Vorlauftemperaturen ohne elektrische " +
        `Nachheizung. Bei deinen ${fall.vorlaufC} °C ist das der praktische Vorteil, nicht nur ` +
        "die Förderfähigkeit ab 2028.",
      gewicht: "einordnung",
      art: "auswahl",
    });
  }

  // ── C1: Split — der Monteur braucht eine Zertifizierung ────────────────────
  //
  // Zwei Rechtsprüfungen am 05.09.2026, die zweite mit dem Auftrag, die erste
  // zu widerlegen. Ergebnis: trägt, aber auf einer anderen Grundlage als
  // angenommen.
  //
  // Die ursprüngliche Fassung stützte sich auf die Durchführungsverordnung
  // (EU) 2015/2067 und nahm an, dass Propan-Geräte AUSGENOMMEN sind, weil dort
  // nur fluorierte Treibhausgase erfasst waren. Beides ist überholt:
  //
  //   - DVO (EU) 2015/2067 ist AUFGEHOBEN (Art. 11 DVO (EU) 2024/2215 vom
  //     06.09.2024, ABl. L 2024/2215 vom 09.09.2024).
  //   - Art. 2 Abs. 1 Buchst. b DVO 2024/2215 erfasst die Installation, „wenn
  //     diese fluorierte Treibhausgase … oder die alternativen Stoffe Ammoniak
  //     (NH3), Kohlendioxid (CO2) oder Kohlenwasserstoffe enthalten". Propan
  //     ist ein Kohlenwasserstoff — die vermutete Lücke gibt es nicht mehr.
  //   - Die deutsche Umsetzung ist neu gefasst: ChemKlimaschutzV vom
  //     14.04.2026, BGBl. 2026 I Nr. 100, in Kraft seit 17.04.2026. Für den
  //     BETRIEB ist § 10 Abs. 1 die tragende Norm (Verweis auf Art. 10 Abs. 2
  //     VO (EU) 2024/573: „fluorierte Treibhausgase ODER relevante
  //     Alternativen"), NICHT Art. 2 Abs. 2 DVO 2024/2215 — dessen Wortlaut
  //     verlangt in beiden Sprachfassungen F-Gase UND Alternativen und träfe
  //     wörtlich gelesen kein einziges Gerät.
  //
  // Warum der Satz nur Split-Geräte trifft: Art. 3 Nr. 17 VO 2024/573
  // definiert „Installation" als das Verbinden von Teilen am Ort des künftigen
  // Betriebs, „was das Verbinden von Gasleitungen eines Systems zur Schließung
  // eines Kreislaufs einschließt, und zwar ungeachtet, ob das System nach dem
  // Zusammenbau befüllt werden muss oder nicht" — das erfasst auch vorbefüllte
  // Schnellkupplungs-Splits. Ein werkseitig geschlossener Monoblock (Art. 3
  // Nr. 9) fällt nicht darunter.
  //
  // KEINE BAGATELLGRENZE. Die 5 Tonnen CO2-Äquivalent aus Art. 5 Abs. 1
  // VO 2024/573 betreffen allein die Dichtheitskontrollen; die
  // Zertifizierungspflicht knüpft über Art. 10 Abs. 1 an die Geräteliste in
  // Art. 5 Abs. 2 an, ohne Mengenschwelle. Art. 3 Abs. 2 Buchst. b
  // DVO 2024/2215 sieht mit Zertifikat A2 eigens eine Kategorie für Füllmengen
  // unter 3 kg vor. Wer hier eine Schwelle einbaut, erfindet eine.
  //
  // „Zertifizierter Kältefachbetrieb" statt „Kälteschein": Letzteres ist kein
  // Rechtsbegriff. Deutsches Recht kennt zwei Dinge — die Sachkunde der Person
  // (§ 6 ChemKlimaschutzV) und das Unternehmenszertifikat (§ 10). Der Käufer
  // fragt sinnvoll nach dem zweiten.
  //
  // NICHT ergänzen: „Bei Propan brauchst du das nicht" (seit 2024 falsch, und
  // es ist die gefährliche Richtung) und „jeder Handgriff nur vom
  // Zertifizierten" (Art. 3 Abs. 3 Buchst. a und Abs. 4 DVO 2024/2215 lassen
  // Löten sowie Auszubildende unter Aufsicht ausdrücklich zu).
  if (g.aufbau === "split") {
    alle.push({
      id: "split-sachkunde",
      text:
        "Ein Split-Gerät darf nur ein zertifizierter Kältefachbetrieb anschließen, auch bei " +
        "Propan — nicht jeder Heizungsbauer hat die Zulassung. Kläre das, bevor du bestellst.",
      gewicht: "warnung",
      art: "auswahl",
    });
  }

  // ── C4: Propan — Aufstellort ───────────────────────────────────────────────
  //
  // Zwei Rechtsprüfungen, beide mit demselben Ergebnis: Der Aufstellort ist
  // eine technische Anforderung, KEINE öffentlich-rechtliche Pflicht des
  // Bewohners. Die Gefahrstoffverordnung nimmt private Haushalte aus (§ 1
  // Abs. 4 S. 1 Nr. 2), die Betriebssicherheitsverordnung gilt für
  // Arbeitsmittel (§ 1 Abs. 1). Verbindlich ist die Herstellervorgabe
  // gegenüber dem einbauenden BETRIEB — als geschuldete Beschaffenheit
  // (§ 633 BGB), nicht als Empfehlung. Deshalb heißt es „Halte den Bereich
  // frei, den die Aufstellanleitung vorgibt" und nicht „muss frei bleiben":
  // Der erste Entwurf behauptete eine Pflicht, die den Leser nicht trifft.
  //
  // Die zweite Prüfung hat gezielt nach übersehenem Landesrecht gesucht:
  // Feuerungsverordnungen greifen nicht (eine Wärmepumpe ist keine
  // Feuerstätte), die Landesbauordnungen regeln Abstandsflächen und Lärm, das
  // Störfallrecht beginnt bei 50 Tonnen Propan. Es gibt keine.
  //
  // KEINE METERZAHL — BLOCKER. Die kursierende Angabe „mindestens 1 Meter nach
  // DIN EN 378" ist beiden Prüfungen nur in Sekundärquellen begegnet; die Norm
  // ist kostenpflichtig und lag keiner von beiden im Volltext vor. Die zweite
  // Prüfung hat das ausdrücklich als Nachtrags-Verbot formuliert: Der
  // Schutzbereich wächst mit der Füllmenge, und eine zu kleine getippte Zahl
  // ist an genau der Stelle gefährlich, an der sie gelesen wird. Wer sie
  // nachtragen will, beschafft zuerst die Norm.
  //
  // Die ZÜNDQUELLE ist die zweite Hälfte derselben Regel und fehlte in der
  // ersten Fassung — gefunden von der Gegenprüfung. Sie ist für den Käufer
  // genauso prüfbar wie der Lichtschacht.
  if (g.kaeltemittel === "r290") {
    alle.push({
      id: "propan-aufstellort",
      text:
        "Für Propan-Geräte gibt der Hersteller einen Freibereich vor, in dem kein Lichtschacht, " +
        "kein Kellerfenster und keine Außensteckdose liegen darf. Prüf vor dem Kauf, ob dein " +
        "geplanter Standort das hergibt.",
      gewicht: "warnung",
      art: "auswahl",
    });
  }

  // ── C2: Bauart unbekannt ───────────────────────────────────────────────────
  // 302 von 755 Geräten sagen nicht, ob Monoblock oder Split. Ohne diese Zeile
  // fehlt der Hinweis ausgerechnet dort, wo wir ihn nicht stellen können —
  // dieselbe markenabhängige Verzerrung wie bei der Vorlauftemperatur.
  if (g.aufbau === null) {
    alle.push({
      id: "aufbau-unbekannt",
      text:
        "Ob das ein Monoblock oder ein Split-Gerät ist, sagt das Angebot nicht. Davon hängt " +
        "ab, welcher Betrieb es anschließen darf und wo es stehen kann — vor der Bestellung klären.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  // ── Weggefallen am 05.09.2026: der Monoblock-Hinweis zu Frostschutz und
  // Kondensatablauf.
  //
  // Fachlich richtig — zwei der häufigsten Rückruf-Gründe —, aber ein reiner
  // Einbauhinweis: Er sagt dem Käufer, was sein Handwerker tun muss, und
  // ändert an seiner Kaufentscheidung nichts. Der Betreiber hat diese ganze
  // Klasse ausgeschlossen. Wer ihn wieder aufnehmen will, muss sagen, was der
  // Leser damit VOR dem Kauf entscheidet.

  // ── C5: Kältemittel unbekannt ──────────────────────────────────────────────
  // 392 von 755 ohne Angabe — die Lücke ist siebenmal so groß wie der Fall, den
  // der vorhandene Hinweis zu fluorierten Kältemitteln abdeckt.
  if (g.kaeltemittel === null) {
    alle.push({
      id: "kaeltemittel-unbekannt",
      text:
        "Welches Kältemittel drin ist, sagt das Angebot nicht. Ab 2028 fördert die BEG nur " +
        "noch natürliche Kältemittel — wenn du später baust, ist das die Angabe, nach der du " +
        "fragen musst.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  // ── F1 / F2: was im Preis steckt ───────────────────────────────────────────
  // Belegt aus der eigenen Leitquelle (Verbraucherzentrale RLP, 160 echte
  // Angebote): Median-Gesamtkosten 34.979 €, gemessener Median-Paketpreis im
  // Katalog 10.298 €. Der leistungsunabhängige Block allein — Montage 6.997 +
  // Elektro 3.032 + Fundament 1.507 + hydraulischer Abgleich 1.159 + Warmwasser
  // 2.589 + Puffer 1.368 — sind 16.652 €.
  if (g.umfang === "geraet") {
    alle.push({
      id: "umfang-nacktes-geraet",
      text:
        "Das ist die Wärmepumpe allein. Warmwasserspeicher, Puffer, Regelung, Hydraulik, " +
        "Elektroanschluss, Fundament und Inbetriebnahme fehlen — nach der Auswertung von 160 " +
        "echten Angeboten ist das Gerät nur rund ein Viertel bis ein Drittel der Gesamtkosten.",
      gewicht: "warnung",
      art: "auswahl",
    });
  } else {
    // „Paketpreis" liest sich sonst wie „schlüsselfertig". Gemessen tragen nur
    // fünf von 755 Geräten „inkl. Inbetriebnahme" in ihrem Namen.
    alle.push({
      id: "umfang-paket",
      text:
        "Im Paket stecken Außen- und Innenteil. Montage, Elektroanschluss, Fundament, " +
        "hydraulischer Abgleich und Inbetriebnahme kommen zum Preis dazu — sie sind der " +
        "größere Teil der Kosten.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  return kuerze(sortiere(alle), grenze);
}

// ─── Fallbezogene Hinweise ───────────────────────────────────────────────────

/** Ab dieser Auslegung wird das Angebot spürbar dünner. */
const GROSSE_ANLAGE_KW = 10;

/** Ab dieser Haushaltsgröße reicht ein kleiner Speicher nicht mehr. */
const GROSSER_HAUSHALT_PERSONEN = 3.5;

export function fallHinweise(fall: WpHinweisFall): Hinweis[] {
  const alle: Hinweis[] = [];

  // ── A3: große Anlage, dünnes Angebot ───────────────────────────────────────
  // Gemessen am echten Katalog: Bei 11,3 kW und 55 °C bleiben 33 geeignete
  // Geräte aus 5 Marken und KEIN Komplettpaket — gegenüber 202 Geräten aus 11
  // Marken im Neubaufall.
  if (fall.auslegungKw >= GROSSE_ANLAGE_KW) {
    alle.push({
      id: "grosse-anlage",
      text:
        "In dieser Anlagengröße wird das Angebot dünn. Prüf mit dem Fachbetrieb, ob sich die " +
        "Heizlast senken lässt — ein Heizkörpertausch oder einzelne Dämmmaßnahmen machen ein " +
        "kleineres Gerät möglich, und das ist in Anschaffung und Betrieb günstiger.",
      gewicht: "einordnung",
      art: "auswahl",
    });
  }

  // ── B2: die Vorlauftemperatur hängt an wenigen Räumen ──────────────────────
  // Die Vorlauftemperatur einer Anlage bestimmt der ungünstigste Raum, nie das
  // Mittel. Der Rechner kennt den Heizkörpertausch als Weg — ist er schon
  // gewählt, wäre der Hinweis ein Vorschlag für etwas bereits Entschiedenes.
  if (fall.heizsystem === "hk_alt" && !fall.heizkoerperTausch) {
    alle.push({
      id: "heizkoerper-einzelne-raeume",
      text:
        `An den ${fall.vorlaufC} °C Vorlauf hängt, welche Geräte überhaupt in Frage kommen. ` +
        "Meist erzwingen nur zwei oder drei Räume diese Temperatur — mit getauschten " +
        "Heizkörpern dort reicht ein kleineres und günstigeres Gerät.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  // ── B3: die Vorlauftemperatur ist geschätzt, nicht gemessen ────────────────
  // Der einzige belastbare Weg zur echten Vorlauftemperatur ohne raumweise
  // Heizlastberechnung — und er kostet den Nutzer nichts.
  //
  // BEWUSST OHNE PROZENTANGABE zur Effizienz je Kelvin. Die geläufige
  // Faustregel (2–3 % je Grad) widerspricht der Jahresarbeitszahl-Rechnung
  // dieses Projekts (0,05 Punkte je Grad, bei einer Jahresarbeitszahl von 3,25
  // also rund 1,5 %). Zwei Genauigkeitsaussagen nebeneinander, die nicht
  // zusammenpassen, sind die Fehlerklasse, die dieses Projekt als schwerste
  // führt. Wer die Zahl haben will, rechnet sie aus der eigenen Formel.
  if (fall.situation === "bestand") {
    alle.push({
      id: "vorlauf-geschaetzt",
      text:
        "Die Vorlauftemperatur ist hier aus dem Gebäudetyp geschätzt, und sie entscheidet, " +
        "welches Gerät passt. Nachprüfen kostet nichts: an einem kalten Tag den Vorlauf der " +
        "jetzigen Heizung auf den Zielwert stellen und schauen, ob alle Räume warm werden.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  // ── D: Schall und Nachbarschaft (nur Luft/Wasser) ──────────────────────────
  // Maßgeblich ist der Immissionsort am nächsten fremden Wohnraum, nicht das
  // Gerät: Freifeld Lp = Lw − 10·log(2πr²), bei 3 m also rund 17 dB Abnahme;
  // eine reflektierende Wand bringt +3 dB, eine Ecke +6 dB.
  //
  // BEWUSST OHNE DEZIBEL-ANGABE zum Gerät: Gemessen trägt KEINES der 755
  // Produktangebote einen Schallleistungspegel. Eine gerätebezogene Zahl wäre
  // erfunden.
  if (fall.wpType === "lwwp") {
    alle.push({
      id: "schall-nachbarschaft",
      text:
        "Das Gerät steht draußen und läuft auch nachts; maßgeblich ist, was am nächsten " +
        "fremden Wohnraum ankommt. Ob dein geplanter Standort die Nachtwerte einhält, gehört " +
        "vor den Kauf geklärt — der Abstand entscheidet darüber mehr als das Gerät.",
      gewicht: "warnung",
      art: "apropos",
    });
    // Abstandsflächen sind Landesrecht und von Land zu Land verschieden;
    // mehrere Länder haben Wärmepumpen bis zu bestimmten Größen freigestellt.
    // Wir kennen das Bundesland hier nicht — die Postleitzahl steht im
    // Förder-Check, nicht in der Geräteauswahl. Eine Meterzahl wäre für die
    // Mehrheit falsch, deshalb nennt der Satz nur die Zuständigkeit.
    alle.push({
      id: "abstand-landesrecht",
      text:
        "Wie nah das Gerät an die Grundstücksgrenze darf, regelt die Bauordnung deines " +
        "Bundeslandes und ist von Land zu Land verschieden. Das gehört geklärt, bevor der " +
        "Aufstellort feststeht.",
      gewicht: "hinweis",
      art: "apropos",
    });
  }

  // ── E: Erdwärme ────────────────────────────────────────────────────────────
  if (fall.wpType === "swwp") {
    // ── E1: Genehmigung ──────────────────────────────────────────────────────
    //
    // DER TEUERSTE SATZ DIESES MODULS, und die erste Rechtsprüfung lag hier
    // gleich dreifach daneben — gefunden von der Gegenprüfung am 05.09.2026.
    //
    //   1. FALSCHE TRAGENDE NORM. Sie ordnete die geschlossene Sonde § 9
    //      Abs. 2 Nr. 2 WHG zu und schloss Abs. 1 ausdrücklich aus. Die
    //      LAWA-Empfehlungen (Bund/Länder-Arbeitsgemeinschaft Wasser,
    //      beschlossen 03./04.04.2019, Empfehlung 1) sagen das Gegenteil:
    //      „Werden bei diesen Erdarbeiten Stoffe in das Grundwasser
    //      eingebracht, erfüllt dies grundsätzlich den Tatbestand einer
    //      erlaubnispflichtigen Benutzung (§§ 8 Abs. 1, 9 Abs. 1 Nr. 4 WHG)."
    //      Abs. 2 Nr. 2 trifft nur den Sonderfall der Sonde oberhalb des
    //      ersten Grundwasserleiters.
    //
    //   2. RECHTSLAGE ÜBERSEHEN. § 49 WHG gilt in der Fassung des
    //      Geothermie-Beschleunigungsgesetzes vom 22.12.2025 (BGBl. 2025 I
    //      Nr. 348, in Kraft seit 23.12.2025). Dessen § 11a Abs. 7 WHG setzt
    //      für Erdwärmepumpen bis 50 MW eine Entscheidungsfrist von DREI
    //      MONATEN, die erst mit der Vollständigkeitsbestätigung läuft.
    //
    //   3. FALSCHER ZEITANKER — und das ist der Schaden. Die erste Fassung
    //      nannte „mindestens einen Monat"; das ist die Anzeigefrist nach § 49
    //      Abs. 1 S. 1, nicht die Dauer bis zur Entscheidung. Neben einem
    //      Kaufknopf einen Monat zu nennen, wo drei realistisch sind, schickt
    //      jemanden zu früh in die Bestellung.
    //
    // Der Satz nennt bewusst KEINEN Verpflichteten („braucht grünes Licht"
    // statt „musst du anmelden"): In der Praxis erstattet der Bohrbetrieb die
    // Bohranzeige, während der Grundstückseigentümer die Erlaubnis beantragt —
    // und § 49 Abs. 4 WHG lässt abweichendes Landesrecht ausdrücklich zu.
    //
    // WASSERSCHUTZGEBIETE: § 49 AwSV, nicht der BW-Leitfaden von 2005, den die
    // erste Prüfung zitierte (ein Beleg von 2005 trägt keine Aussage über
    // 2026). Abs. 1 verbietet Anlagen im Fassungsbereich und in der engeren
    // Zone, Abs. 2 S. 1 Nr. 4 in der weiteren Zone ausdrücklich „Anlagen mit
    // Erdwärmesonden", Abs. 4 erlaubt die Einzelfallabweichung. Der Satz sagt
    // deshalb SONDEN, nicht „Erdwärme": Kollektoren sind nicht erfasst, und
    // § 49 Abs. 1 S. 3 WHG privilegiert sie bis 4 m Tiefe außerhalb von
    // Wasserschutzgebieten sogar ausdrücklich.
    //
    // NICHT ergänzen: „Ab 100 Metern brauchst du zusätzlich eine
    // bergrechtliche Genehmigung." § 127 Abs. 1 BBergG verlangt eine Anzeige
    // zwei Wochen vorher; ein Betriebsplan kommt nur auf behördliche
    // Anordnung, und nach Abs. 2 gilt bis 400 m das Schweigen der Behörde nach
    // vier Wochen als „nicht erforderlich". Das ist Sache des Bohrbetriebs.
    alle.push({
      id: "erdwaerme-genehmigung",
      text:
        "Eine Erdwärmebohrung braucht vorher grünes Licht von der unteren Wasserbehörde — " +
        "rechne mit rund drei Monaten, denn so lange darf sie sich für die Entscheidung Zeit " +
        "nehmen. In Wasserschutzgebieten sind Erdwärmesonden fast überall verboten: kläre " +
        "beides, bevor du ein Gerät aussuchst.",
      gewicht: "warnung",
      art: "apropos",
    });
    // BEWUSST OHNE EURO-ZAHL. Im Projekt gibt es keine belegte Preisreihe je
    // Bohrmeter; eine geratene Zahl neben lauter belegten wäre der teuerste
    // Fehler. Wird eine Reihe beschafft, kann die Zahl hinein.
    alle.push({
      id: "erdwaerme-bohrkosten",
      text:
        "Der Preis hier ist der des Geräts. Die Erdsonde kommt vollständig dazu — Bohrung, " +
        "Anbindung, Sole und Verteiler sind bei einer Erdwärmeanlage der größere Kostenblock, " +
        "nicht die Wärmepumpe.",
      gewicht: "warnung",
      art: "apropos",
    });
    if (fall.situation === "bestand") {
      alle.push({
        id: "erdwaerme-zufahrt",
        text:
          "Das Bohrgerät muss auf dein Grundstück. Prüf früh, ob es eine Zufahrt gibt, die " +
          "breit genug ist, und ob der Garten die Baustelle verkraftet — im Bestand scheitert " +
          "Erdwärme öfter daran als an der Technik.",
        gewicht: "hinweis",
        art: "apropos",
      });
    }
  }

  // ── F3: Speichergröße gegen Haushaltsgröße ─────────────────────────────────
  // Eine Wärmepumpe lädt den Speicher mit rund 50 °C statt der 60 °C eines
  // Gaskessels; derselbe Speicher liefert deshalb weniger Mischwasser als
  // vorher. Der Eins-zu-eins-Tausch ist die häufigste Enttäuschung nach dem
  // Einbau.
  if (fall.personen >= GROSSER_HAUSHALT_PERSONEN) {
    alle.push({
      id: "speicher-haushaltsgroesse",
      text:
        "Bei eurer Haushaltsgröße gehört ein Warmwasserspeicher ab etwa 300 Litern dazu — " +
        "mehr als bei der alten Heizung, weil eine Wärmepumpe den Speicher kühler lädt. Prüf " +
        "im Angebot, welche Größe drinsteht.",
      gewicht: "hinweis",
      art: "auswahl",
    });
  }

  // ── F5: Zählerschrank im Bestand ───────────────────────────────────────────
  // BEWUSST AN DER SITUATION und nicht am Dämmzustand: Die Dämmstufe ist kein
  // Baujahr, und aus ihr eine Aussage über die Elektroinstallation abzuleiten
  // wäre geraten.
  if (fall.situation === "bestand") {
    alle.push({
      id: "zaehlerschrank",
      text:
        "In älteren Häusern reicht der Zählerschrank für eine Wärmepumpe oft nicht. Lass ihn " +
        "vom Elektriker ansehen, bevor du bestellst — ein neuer steht in keinem Gerätepreis.",
      gewicht: "warnung",
      art: "apropos",
    });
    // Die Maßnahme, die zwischen gerechneter und tatsächlicher
    // Vorlauftemperatur steht — und damit zwischen unserer Jahresarbeitszahl
    // und der echten. Mittelwert 1.159 € nach derselben Angebotsauswertung.
    // Als KOSTENPOSTEN, nicht als Erklärung seiner Funktion. Die erste Fassung
    // beschrieb, was ohne Abgleich passiert — richtig, aber Sache des
    // Handwerkers. Für die Kaufentscheidung zählt, dass er dazugehört und im
    // Gerätepreis nicht enthalten ist. Mittelwert 1.159 € aus der Auswertung
    // von 160 echten Angeboten (Verbraucherzentrale RLP).
    alle.push({
      id: "hydraulischer-abgleich",
      text:
        "Zur Wärmepumpe gehört ein hydraulischer Abgleich der Heizung — nach der Auswertung " +
        "von 160 echten Angeboten rund 1.150 Euro, die in keinem Gerätepreis stecken.",
      gewicht: "hinweis",
      art: "apropos",
    });
  }

  // ── F4: Netzbetreiber und Steuerbarkeit ────────────────────────────────────
  //
  // Zwei Rechtsprüfungen; die zweite hatte ausdrücklich den Auftrag, die
  // doppelte 4,2 kW als Verschmelzung zweier Größen zu widerlegen. Sie hat sie
  // im Volltext der Festlegung bestätigt — es sind wirklich zwei Rollen mit
  // derselben Zahl (Bundesnetzagentur, BK6-22-300 vom 27.11.2023, Anlage 1):
  //
  //   Ziffer 2.4.1 Buchst. b — SCHWELLE: eine Wärmepumpenheizung „unter
  //   Einbeziehung von Zusatz- oder Notheizvorrichtungen (z.B. Heizstäbe) …
  //   mit einer Netzanschlussleistung von mehr als 4,2 Kilowatt (kW)".
  //
  //   Ziffer 4.5.1 S. 1 — MINDESTLEISTUNG: „Für jede steuerbare
  //   Verbrauchseinrichtung …, die gemäß Ziffer 4.4.a. (Direktansteuerung)
  //   angesteuert wird, beträgt die Mindestleistung 4,2 kW."
  //
  // Wer hier „aufräumt", macht eine richtige Angabe falsch.
  //
  // Drei Formulierungen, die verworfen wurden:
  //   - „Der Netzbetreiber muss zustimmen" — § 19 Abs. 2 S. 1 NAV verlangt für
  //     zusätzliche Verbrauchsgeräte nur die MITTEILUNG; die Zustimmung in
  //     S. 3 betrifft ausdrücklich nur Ladeeinrichtungen über 12 kVA. Das ist
  //     die klassische Verschärfung, die abschreckt.
  //   - „In der Regel steuerbar" — zu weich. Ziffer 3.1 Buchst. b verpflichtet
  //     ALLE Betreiber mit Inbetriebnahme nach dem 31.12.2023; ausgenommen ist
  //     nur, was nicht der Raumheizung dient. (Die Ausnahme für nachweislich
  //     nicht steuerbare Geräte in Ziffer 10.6 läuft am 31.12.2026 aus — ein
  //     Satz, der sich darauf stützte, würde zum Jahreswechsel falsch.)
  //   - „In Ausnahmefällen kurzzeitig begrenzen" — halb erfunden.
  //     „Ausnahmefälle" trägt (Ziffer 4.1: nur bei Gefährdung oder Störung der
  //     Netzsicherheit), „kurzzeitig" nicht: Ziffer 4.3 bemisst die Dauer
  //     allein danach, wie lange sie erforderlich ist. Die zwei Stunden aus
  //     Ziffer 10.5 Buchst. c gelten nur der befristeten präventiven Steuerung.
  //
  // „Deinem Hausanschluss" statt „dir": Bei Steuerung über ein
  // Energiemanagementsystem ist die Mindestleistung nach Ziffer 4.5.2 eine
  // SUMME für den ganzen Anschluss — bei zwei Geräten darf die Wärmepumpe auf
  // null, solange die Wallbox den Rest bekommt. Im Regelfall dieses Rechners
  // (eine steuerbare Einrichtung) stimmen beide Lesarten; die gewählte auch im
  // anderen Fall.
  alle.push({
    id: "netzbetreiber-steuerbar",
    text:
      "Eine neue Wärmepumpe über 4,2 Kilowatt Anschlussleistung meldet der Fachbetrieb beim " +
      "Netzbetreiber an, und sie muss steuerbar sein — dafür kostet dich ihr Strom dauerhaft " +
      "weniger. Bei drohender Überlastung darf der Netzbetreiber drosseln, aber nicht " +
      "abschalten: mindestens 4,2 Kilowatt bleiben deinem Hausanschluss.",
    gewicht: "hinweis",
    art: "apropos",
  });

  // ── F7: Pufferspeicher bei Heizkörpern ─────────────────────────────────────
  // Mindestumlaufwassermenge nach Herstellervorgabe. Der häufigste Grund, warum
  // ein rechnerisch richtig ausgelegtes Gerät trotzdem taktet — und der Fall,
  // in dem der Nutzer die Ursache bei der Maschine sucht statt in der Hydraulik.
  if (fall.heizsystem !== "fbh") {
    alle.push({
      id: "pufferspeicher",
      text:
        "Zu einer Heizkörperanlage gehört meist ein Pufferspeicher, damit die Wärmepumpe nicht " +
        "ständig ein- und ausschaltet. Er steckt in keinem der Gerätepreise.",
      gewicht: "hinweis",
      art: "apropos",
    });
  }

  return sortiere(alle);
}

/**
 * Der Satz unter der ganzen Liste — die Gesamteinordnung des Meisters.
 *
 * Er sagt in einem Satz, was diese Liste ist und was sie nicht ist. Ohne ihn
 * liest sich eine Reihe von Geräten mit Preisen und Kaufknöpfen wie eine
 * Kaufempfehlung; sie ist eine Vorauswahl.
 */
export const WP_HINWEIS_SCHLUSS =
  "Diese Liste sagt, welche Geräte zu deiner gerechneten Heizlast und Vorlauftemperatur " +
  "passen könnten — sie ersetzt keine Heizlastberechnung und keinen Blick auf Aufstellort, " +
  "Heizflächen und Elektrik vor Ort, und genau daran entscheidet sich am Ende, welches Gerät " +
  "in dein Haus gehört.";
