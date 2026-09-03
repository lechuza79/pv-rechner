// Template-basierter Anschreiben-Generator für den Kommunen-Outreach.
//
// Bewusst KEIN LLM: das Projekt hat keine LLM-Anbindung, und die Personalisierung
// kommt aus den echten Zahlen der Gemeinde — der Mensch editiert vor dem Senden
// ohnehin. Eine reine Funktion (server + testbar), keine DB-/Next-Importe.
//
// DER ASK IST DIE MELDUNG, nicht das Widget (Entscheidung 28.07.2026). Ein
// Widget-Einbau bedeutet für eine Verwaltung CMS-Zugriff, IT und
// Datenschutzbeauftragten — vier Beteiligte für ein kostenloses Angebot ohne
// Frist, das sich intern gegen nichts durchsetzt. Eine fertige Meldung braucht
// einen Beteiligten, kein iframe, keine Datenschutzprüfung — und der Link auf
// uns steht danach als echtes <a> im HTML der Gemeindeseite. Das Widget bleibt
// als dauerhafte Alternative, aber nur in der Variante `meldung_plus_widget`.
//
// Betreff + Einstieg kommen aus der Award-Hook-Logik (lib/award-hook.ts) —
// DIESELBE Quelle wie die Anschreiben-Vorschau. Einheiten ausschließlich über
// die kanonischen Formatierer (lib/atlas-format.ts), damit in der Meldung nie
// eine andere Zahl steht als auf der verlinkten Seite.

import { kurzOrtsname } from "./atlas-orte";
import { briefVergleichSatz, type GemeindeVergleich } from "./gemeinde-vergleich";
import { tokens } from "./theme";

// Farben NIE getippt — auch nicht in einer Mail (CLAUDE.md, Farb-Single-Source).
const GRAU = tokens["--color-text-muted"];
const RAHMEN = tokens["--color-border"];
import { WIDGET_AB_EINWOHNER, type AskVariante } from "./kommunen-ask";

export type DraftContext = {
  name: string;
  /**
   * KANONISCHE Adresse der Gemeindeseite — die steht in der Meldung, also in
   * dem Text, den die Gemeinde veröffentlicht.
   *
   * NIE eine Zähl-Weiterleitung (/r/…) an dieser Stelle: Eine Verwaltung
   * veröffentlicht keine kryptische Umleitung, sie kann jederzeit brechen, und
   * als Backlink ist sie schwächer als die echte Adresse — was genau das Ziel
   * des ganzen Vorhabens untergräbt.
   */
  pageUrl: string | null;
  /**
   * KEIN ZÄHL-LINK IM BRIEF (Entscheidung des Betreibers, 31.07.2026).
   *
   * Der Brief trug bis dahin zusätzlich eine Weiterleitung `solar-check.io/r/…`,
   * die Öffnungen zählte. Eine kryptische Adresse in einer Nachricht ans Rathaus
   * kostet Vertrauen, und der Erkenntnisgewinn ist gering: Gezählt wird, dass
   * irgendjemand geklickt hat — nicht, ob die Meldung erscheint, und das ist die
   * einzige Frage, auf die es ankommt.
   *
   * Die Weiterleitung selbst (`/r/[token]`) und die Zählfelder bleiben bestehen;
   * nur der Brief benutzt sie nicht mehr. Der einzige Link auf uns ist damit die
   * kanonische Adresse der Gemeindeseite (`pageUrl`) plus die Rangliste.
   */
  /** Betreff aus der Hook-Logik (Messgröße im Klartext, kein interner Titel). */
  betreff: string;
  /** Einstiegssatz aus der Hook-Logik. */
  einstieg: string;
  /** Welcher Ask? Steuert einzig den Widget-Absatz — alles andere ist identisch,
   *  damit die beiden Varianten vergleichbar bleiben. */
  variante: AskVariante;
  /**
   * Funktion der im Impressum benannten OPERATIVEN Stelle, falls vorhanden
   * („Referentin für Öffentlichkeitsarbeit"). Nur dann wird direkt adressiert.
   *
   * Gemessen am 27.07.2026: Von 21 kleinen Gemeinden nannte genau EINE jemand
   * anderen als den Bürgermeister. Die Person, die die Website pflegt, steht
   * dort schlicht nicht öffentlich — deshalb ist der Regelfall NICHT die
   * namentliche Anrede, sondern ein Text, der eine Weiterleitung übersteht.
   */
  funktion?: string | null;
  /**
   * Einwohnerzahl — allein für die Frage, wen die Weiterleitungs-Bitte nennt.
   *
   * Eine Ortsgemeinde mit 300 Einwohnern hat keine Pressestelle, und ein Brief,
   * der eine verlangt, verrät im ersten Satz, dass er an tausend Adressen
   * gleichzeitig ging.
   */
  einwohner?: number | null;
  /** Zahlen für die Meldung — aus derselben Quelle wie die Atlas-Seite. */
  zahlen: {
    anlagen: number;
    leistungKwp: number;
    /**
     * Davon auf privaten Daechern. MUSS mit, weil die Gesamtleistung in kleinen
     * Orten von einem einzigen Solarpark beherrscht wird.
     *
     * DER FALL (31.07.2026): Gluesing, 110 Einwohner, 2,1 MWp — der Brief
     * eroeffnete mit "18.894 Wp pro Person" und behauptete zwei Zeilen spaeter
     * etwas ueber private Daecher. Die Zahl stimmt und erzaehlt trotzdem die
     * falsche Geschichte: Sie gehoert einem Investor, nicht den Buergern.
     */
    privatDachKwp: number | null;
    wpProKopf: number | null;
    /** Datenstand des Marktstammdatenregisters, ISO (YYYY-MM-DD). */
    stand: string;
  };
  /** Wo die Bestleistung gilt: „im Landkreis Würzburg", „in Bayern". */
  wo: string;
  /** Die Messgröße als Superlativ: „die meiste private Speicherkapazität".
   *  NUR bei Platz 1 verwendbar — und nur im Fliesstext, nicht in der Überschrift. */
  bestleistung: string;
  /** Kurzform als Präpositionalphrase: „bei Hausspeichern", „beim Solar-Zubau
   *  seit Ende 2023". Trägt die Überschrift der Meldung. */
  phrase: string;
  /**
   * Dieselbe Messgröße im DATIV: „privater Speicherkapazität je Einwohner".
   *
   * IM DATIV, weil sie ausnahmslos hinter „bei" steht. Deutsche Kasusbildung
   * per Regel produziert zuverlässig Murks — „bei private Speicherkapazität"
   * stand genau so im Entwurf. Dieselbe Falle wie im Anschreiben, dort schon
   * zweimal getreten.
   */
  themaDativ: string;
  /**
   * Die Vergleichsgruppe, in der der Rang gilt: „Kleinen Gemeinden im Landkreis
   * Würzburg". Ohne sie behauptet die Meldung einen kreisweiten Bestwert und
   * belegt ihn mit einer klassen-internen Zahl.
   */
  gruppe: string;
  /**
   * Der Wert der GERANKTEN Messgröße, fertig formatiert („38 je 1.000 Ew.").
   *
   * WARUM ER SEIN MUSS: Die Meldung belegte den Superlativ vorher mit den
   * Gesamt-Solarzahlen — Anlagen, Leistung, Watt je Kopf. Die Überschrift nannte
   * aber etwas ganz anderes, etwa Balkonkraftwerke je 1.000 Einwohner. Damit war
   * der Satz auch beim echten Sieger falsch: Ein Nachbarort mit Solarpark hat
   * mehr Gesamtleistung und widerlegt ihn auf unserer eigenen Atlas-Seite, die
   * in derselben Meldung verlinkt ist.
   */
  rangWert?: string | null;
  /** Die Stückzahl hinter der Rate („1.061 Hausspeicher"). Eine Rate ohne ihre
   *  Grundmenge kann jede Größe vortäuschen — siehe `basis` in lib/awards.ts. */
  rangBasis?: string | null;
  /**
   * Die Pro-Kopf-Lage des Orts — DIESELBE Rechnung, aus der die verlinkte
   * Gemeindeseite ihren Einleitungssatz bildet (lib/gemeinde-vergleich.ts).
   *
   * WARUM NICHT MEHR NUR EINE ZAHL: Der Brief bekam bis zum 20.08.2026 einen
   * fertigen Anteil hereingereicht und formulierte daraus selbst. Die Seite
   * rechnete parallel ihren eigenen — auf einer anderen Messgröße. Damit
   * konnten sich Brief und verlinkte Seite widersprechen, ohne dass eine der
   * beiden Stellen davon etwas wusste. Jetzt kommt beides aus einem Objekt,
   * und der Satz entsteht in `briefVergleichSatz`.
   *
   * WARUM DER BRIEF DIE PRIVATEN DÄCHER NENNT und nicht die Gesamtleistung:
   * Die Gesamtleistung gehört in vielen Orten zu großen Teilen einem
   * Freiflächenpark. Ein Ort käme damit auf „380 % über dem Landesschnitt",
   * ohne dass ein einziger Bürger etwas dafür getan hätte — und die Meldung
   * handelt von den Bürgern.
   *
   * WARUM ÜBERHAUPT EIN VERGLEICH: „13,2 MWp" sagt einer Pressestelle nichts.
   * „42 % mehr als im hessischen Durchschnitt" sagt ihr genau das, was sie
   * veröffentlichen will (Vorgabe des Betreibers, 19.08.2026).
   */
  vergleich?: GemeindeVergleich | null;
  /** Ortsangabe im Dativ für den Vergleichssatz („in Hessen"). Steht getrennt,
   *  weil der Vergleich selbst keinen Satzbau kennt — die Seite schreibt
   *  „dem Hessen-Schnitt", der Brief „im Durchschnitt in Hessen". */
  vergleichBezug?: string;
  /**
   * Empfängeradresse, NUR für die Herkunftsangabe nach Art. 14.
   *
   * Sie steht nirgends im Brieftext — sie entscheidet allein, ob dort „Website
   * von Daubach" oder „Impressum von vg-nahe-glan.de" steht. Rund zehn Briefe
   * behaupteten die falsche Quelle.
   */
  empfaenger?: string | null;
  /** Platz und Gruppengröße für den Beleg. */
  rang?: { platz: number; von: number } | null;
  /**
   * Weitere Spitzenplätze — im BRIEF, nicht in der Meldung.
   *
   * Die Meldung trägt EINE Aussage, sonst kann eine Pressestelle sie nicht
   * übernehmen. Der Brief darf zeigen, dass es nicht bei einer bleibt: Das ist
   * das stärkste Argument dafür, dass die Zahlen kein Zufallstreffer sind.
   */
  weitere?: { phrase: string; gruppe: string; platz: number; von: number }[];
  /** Die vollständige Rangliste zum Nachprüfen. Steht seit dem 19.08.2026 NICHT
   *  mehr im Brief (ein dritter Link war einer zu viel) — das Cockpit zeigt sie
   *  weiterhin, damit ein Mensch vor dem Versand nachsehen kann. */
  ranglisteUrl?: string | null;
  /**
   * Live-Vorschau der Grafik für DIESEN Ort, für den Widget-Absatz.
   *
   * Ein Link statt eines Anhangs: Ein Bild in der ersten unverlangten Mail
   * einer noch unbekannten Absenderdomain ist ein Spam-Muster, und der Brief
   * bleibt reiner Text.
   */
  widgetUrl?: string | null;
};

export type OutreachDraft = { subject: string; body: string; bodyHtml: string; meldung: string };

/**
 * Die HTML-Fassung wird AUS DEM TEXT erzeugt, nie daneben geschrieben.
 *
 * Zwei getrennt gepflegte Fassungen desselben Briefes laufen auseinander — und
 * die, die auseinanderläuft, ist die, die niemand liest (dieselbe Systematik
 * wie überall in diesem Projekt: eine Quelle, keine zweite). Deshalb baut diese
 * Funktion das HTML mechanisch aus der Textfassung: Absätze werden Absätze,
 * Adressen werden Verweise, der Fuß wird klein und grau.
 *
 * BEWUSST MINIMAL. Keine Schriftart, keine Farben außer dem Grau des Fußes,
 * keine Bilder, keine Tabellen, kein Kopfbereich. Die Mail soll aussehen wie
 * geschrieben, nicht wie gestaltet — eine gestaltete Mail ist bei einer
 * unverlangten Erstansprache genau das falsche Signal, und ein Bild wäre ein
 * Spam-Muster.
 */
/**
 * Zeilen, die leiser sein sollen als der Rest: Quellenangabe, die
 * Rollenzeile unter der Unterschrift und die Pflichtangaben im Fuß.
 *
 * ERKANNT AM INHALT, nicht an einer Auszeichnung im Text. Ein Marker im
 * Klartext („[klein]…") stünde in der Textfassung sichtbar da, und die ist die
 * Hauptfassung. Die Liste ist kurz und steht neben dem Text, der sie erzeugt.
 *
 * KEINE Basisgröße für den Rest: Mailprogramme setzen ihre eigene, und die
 * kennt der Empfänger. Wer sie überschreibt, macht den Brief auf fremden
 * Geräten kleiner statt größer.
 */
/**
 * Die Signatur ist die aus dem Mailprogramm des Betreibers (Vorgabe 20.08.2026)
 * — dieselbe, die jemand sieht, der später auf den Brief antwortet. Zwei
 * Fassungen desselben Absenders wären in genau dem Moment sichtbar, in dem
 * jemand prüft, ob da wirklich ein Mensch sitzt.
 *
 * „Betreiber solar-check.io" ist bewusst raus: Die Rolle steht schon im ersten
 * Satz des Briefes, und wer sie unter den Namen setzt, sagt sie zweimal.
 *
 * Die Telefonnummer ist eine Entscheidung des Betreibers, keine Pflicht — für
 * die Anbieterkennzeichnung genügt ein Weg für unmittelbaren Kontakt, und den
 * trägt die Mailadresse. Sie steht hier, weil eine Pressestelle mit einer
 * Rückfrage zu einer Zahl eher anruft als schreibt.
 */
const NAMENSZUSATZ = "Dipl. Des.";

export const SIGNATURE = `Sebastian Schäder
${NAMENSZUSATZ}

solar-check.io
0177/2897086`;

const LEISE_ZEILEN = [
  /^Quelle:/,
  // IMPRESSUM UND DATENSCHUTZ STEHEN HIER NICHT MEHR.
  //
  // Sie liegen im Fuß, und der setzt seine Größe bereits am Absatz. Die Zeilen
  // trugen zusätzlich diese Auszeichnung — 12px INNERHALB des Fußes — und waren
  // damit die kleinste Schrift des ganzen Briefes. Eine Vergrößerung des Fußes
  // wirkte an ihnen deshalb gar nicht: Die innere Angabe gewinnt.
  //
  // Allgemein: Zwei Größenangaben für dieselbe Zeile sind keine Staffelung,
  // sondern ein Wettlauf, den man erst am erzeugten HTML sieht.
  // NUR DER TITEL IST LEISE. Name, Adresse und Nummer stehen in Textgröße:
  // In einem Brief steht der Absender so groß wie das, was er schreibt, und
  // eine Telefonnummer, die zum Anruf einladen soll, gehört nicht in die
  // kleinste Zeile der Seite. Eine Zwischenfassung setzte die ganze Signatur
  // klein — der Grund dafür lag im damals zu kleinen Fließtext, nicht am Namen.
  new RegExp(`^${NAMENSZUSATZ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
];

/**
 * Leiser heißt KLEINER, nicht grauer (Vorgabe des Betreibers, 19.08.2026).
 *
 * Erste Fassung machte beides gleichzeitig. Farbe und Größe zusammen sind eine
 * Auszeichnung zu viel: Der Unterschied soll spürbar sein, nicht auffällig.
 * Grau bleibt allein im Fuß, wo es um Pflichtangaben geht.
 */
const LEISE_STIL = `font-size:${tokens["--font-size-small"]}`;

/**
 * BEIDE GRÖSSEN WERDEN GESETZT, sonst stimmt die Staffelung nicht.
 *
 * Zwei Fehlversuche, beide im echten Postfach gesehen: 16px für den Fließtext
 * war deutlich zu groß. Gar keine Angabe war noch schlechter — Apple Mail setzt
 * unausgezeichnetes HTML kleiner als 13px, damit war der Brieftext KLEINER als
 * seine eigene Fußzeile.
 *
 * Die Lehre: Wer eine Staffelung will, muss beide Enden angeben. Eine Größe
 * gegen eine unbekannte Voreinstellung zu stellen, ist keine Staffelung,
 * sondern eine Wette.
 */
const TEXT_STIL = `font-size:${tokens["--font-size-body"]};line-height:1.6`;

export function briefAlsHtml(body: string): string {
  // Auch Anführungszeichen: Der verlinkte Text landet in einem HTML-Attribut,
  // und ein `"` darin bricht es auf. Ein Eingabepfad dafür existiert heute
  // nicht (Ortsnamen kommen aus dem amtlichen Verzeichnis), aber eine
  // unvollständige Schranke ist keine.
  const esc = (t: string) =>
    t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  // Adressen anklickbar machen. Der Punkt am Satzende gehört nicht zur Adresse.
  //
  // Dazu die EIGENE Domain ohne Protokoll: In der Signatur steht „solar-check.io"
  // so, wie man es aufschreibt, und im HTML wäre das sonst als einzige Adresse
  // des Briefes tote Schrift. Bewusst nur unsere eigene Domain — eine allgemeine
  // Regel für „Wort mit Punkt drin" macht aus jedem Dateinamen einen Link.
  const verlinke = (t: string) =>
    t
      .replace(/https?:\/\/[^\s<]+[^\s<.,;:)]/g, (u) => `<a href="${u}">${u}</a>`)
      .replace(/(^|[\s(])(solar-check\.io)(?![\w./-])/g, (_, vor, d) => `${vor}<a href="https://${d}">${d}</a>`);

  const [oben, ...unten] = body.split(`\n${FUSS_TRENNER}\n`);
  // Zeilenweise, damit eine leise Zeile MITTEN in einem Absatz leise sein kann —
  // „Betreiber solar-check.io" steht direkt unter dem Namen, nicht als eigener
  // Absatz.
  const zeile = (z: string) => {
    const inhalt = verlinke(esc(z));
    return LEISE_ZEILEN.some((re) => re.test(z.trim()))
      ? `<span style="${LEISE_STIL}">${inhalt}</span>`
      : inhalt;
  };
  //
  // EINE STRICHLINIE WIRD EINE LINIE.
  //
  // Im Quelltext der ersten echten Probemail (20.08.2026) hing die untere
  // Trennlinie der Meldung im selben Absatz wie die Quellenzeile — und erbte
  // damit deren Kursiv und deren Schriftgröße. Der Grund: Trenner und Meldung
  // stehen im Text nur durch einen einzelnen Zeilenumbruch getrennt, die
  // Absatzteilung sieht sie also als einen Block.
  //
  // In der Textfassung sind die Striche richtig — dort gibt es keine Linien.
  // In der HTML-Fassung sind sie ein Notbehelf, der wie ein Fehler aussieht.
  const TRENNER = `<hr style="border:0;border-top:1px solid ${RAHMEN};margin:18px 0">`;
  const absatz = (t: string, stil = "") => {
    const teile: string[] = [];
    let puffer: string[] = [];
    const abgeben = () => {
      while (puffer.length && !puffer[puffer.length - 1].trim()) puffer.pop();
      if (puffer.length) {
        teile.push(`<p${stil ? ` style="${stil}"` : ""}>${puffer.map(zeile).join("<br>")}</p>`);
      }
      puffer = [];
    };
    for (const z of t.split("\n")) {
      if (/^-{10,}$/.test(z.trim())) {
        abgeben();
        teile.push(TRENNER);
      } else {
        puffer.push(z);
      }
    }
    abgeben();
    return teile.join("\n");
  };

  // Die Quellenzeile kursiv: Sie gehört zur Meldung, ist aber nicht ihre
  // Aussage. Kursiv ist die leiseste Auszeichnung, die es gibt, und sie
  // überlebt das Kopieren in ein Redaktionssystem.
  const kopf = oben
    .split("\n\n")
    .map((a) => (a.startsWith("Quelle:") ? absatz(a, `font-style:italic;${LEISE_STIL}`) : absatz(a)))
    .join("\n");
  const fussText = unten.join(`\n${FUSS_TRENNER}\n`);
  const fuss = fussText
    ? `\n<hr style="border:0;border-top:1px solid ${RAHMEN};margin:24px 0 12px">\n` +
      fussText
        .split("\n\n")
        // 13px, nicht 12: Der Fuß soll als Fuß erkennbar sein, aber die
        // Pflichtangaben muss man auch lesen können — im echten Postfach war
        // die Impressum-Zeile die kleinste Schrift des Briefes (Betreiber,
        // 20.08.2026). Grau trägt den Unterschied bereits, deshalb steht hier
        // seit der Skala die volle Fließtext-Stufe: Die Zwischengröße 13, mit
        // der es damals behoben wurde, gibt es nicht mehr, und die Stufe
        // darunter wäre wieder die kleinste Schrift des Briefes.
        .map((a) => absatz(a, `color:${GRAU};font-size:${tokens["--font-size-body"]};line-height:1.5`))
        .join("\n")
    : "";
  return `<div style="max-width:640px;${TEXT_STIL}">\n${kopf}${fuss}\n</div>`;
}



/**
 * Alles, was nach der Unterschrift kommt: Pflichtangaben, keine Botschaft.
 *
 * In der Textfassung durch eine Linie abgesetzt, in der HTML-Fassung zusätzlich
 * kleiner und grau. Es soll erkennbar der Fuß sein und nicht mit dem Angebot
 * konkurrieren.
 */
const FUSS_TRENNER = "--";

/**
 * Der ORTSNAME statt der Gattung: "Website Ihrer Markt" stand so im Brief, weil
 * "Markt" maennlich ist und "Ihrer" nur zu Stadt und Gemeinde passt. Der Name
 * hat kein Geschlecht und ist ausserdem konkreter — jede Beugungstabelle waere
 * eine Falle, die irgendwann wieder zuschnappt.
 *
 * Die Pflichtangabe nach Art. 14 ist der Hinweis auf Herkunft, Zweck und
 * Widerspruchsrecht; den traegt der Link auf die Datenschutzerklaerung.
 */
const dsgvoHinweis = (quelle: string) =>
  `Datenschutz-Hinweis (Art. 14 DSGVO): Ihre öffentlich verfügbaren Kontaktdaten (${quelle}) nutze ich für dieses Angebot. Herkunft, Zweck, Speicherdauer und Ihr Widerspruchsrecht: https://solar-check.io/datenschutz`;

/**
 * WOHER DIE ADRESSE WIRKLICH STAMMT.
 *
 * Vorher stand dort ausnahmslos „Website von <Ortsname>". Bei rund zehn Briefen
 * war das falsch: Die Adresse kam aus dem Impressum der Verbandsgemeinde, nicht
 * aus dem des Ortes. Art. 14 verlangt die tatsächliche Herkunft — und eine
 * falsche Quellenangabe ausgerechnet in dem Absatz, der Seriosität herstellen
 * soll, ist die teuerste Stelle für eine Ungenauigkeit.
 *
 * Steht die Adresse auf der Domain des Ortes, bleibt der Satz wie er war; sonst
 * nennt er die Domain, aus deren Impressum wir sie haben.
 */
export function herkunftsangabe(ortsname: string, empfaenger?: string | null): string {
  const domain = (empfaenger ?? "").split("@")[1]?.trim().toLowerCase();
  if (!domain) return `Website von ${ortsname}`;
  const kern = ortsname.toLowerCase().replace(/[^a-zäöüß]/g, "");
  const stamm = domain.split(".").slice(0, -1).join(".");
  const passt = kern.length >= 4 && stamm.replace(/[^a-zäöüß]/g, "").includes(kern.slice(0, 5));
  return passt ? `Website von ${ortsname}` : `Impressum von ${domain}`;
}

/**
 * ENTFERNT AM 31.07.2026: Der Brief sprach die Gattung nirgends mehr an, seit
 * der Datenschutz-Hinweis den Ortsnamen nennt. Eine Funktion, die "Große
 * Kreisstadt" auf "Stadt" reduziert, braucht nur, wer daraus einen gebeugten
 * Satz baut — und genau das war die Falle ("Website Ihrer Markt").
 */

/**
 * Die Größenklasse klein, wo sie im Satz steht: „unter den mittelgroßen Städten
 * in Hessen" statt „unter den Mittelgroßen Städten in Hessen".
 *
 * Der Klassenname ist ein Eigenname der Rangliste und wird dort groß geführt.
 * Im Fließtext einer Pressemeldung liest ein Redakteur ihn aber als Tippfehler,
 * und der Brief verspricht einen Text, den man ohne Redigieren übernehmen kann.
 *
 * NUR das erste Wort und NUR, wenn es ein Adjektiv ist. „Gemeinden und
 * Kleinstädten" beginnt mit einem Substantiv — eine Regel „erstes Wort klein"
 * hätte daraus „gemeinden und Kleinstädten" gemacht. Deshalb eine ausdrückliche
 * Liste statt einer Heuristik.
 */
// Die Schwelle „ab wann ein Vorsprung eine Meldung wert ist" stand hier als
// MIN_VERGLEICH und lebt jetzt in lib/gemeinde-vergleich.ts — dort sieht sie
// auch die Gemeindeseite, die denselben Vergleich zieht.

const KLASSEN_ADJEKTIVE = ["Kleinen", "Mittelgroßen", "Großen", "Kleine", "Mittelgroße", "Große"];

export function kleinKlasse(gruppe: string): string {
  const [erstes, ...rest] = gruppe.split(" ");
  if (!rest.length || !KLASSEN_ADJEKTIVE.includes(erstes)) return gruppe;
  return [erstes.toLowerCase(), ...rest].join(" ");
}

/** "2026-07-15" → "15. Juli 2026". */
function standLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Die fertige Meldung — der eigentliche Ask.
 *
 * TON: berichtend, nicht lobend. „In X sind 412 Anlagen in Betrieb, der höchste
 * Wert im Landkreis" kann eine Pressestelle ohne Rückfrage übernehmen; „X ist
 * Spitzenreiter" muss sie erst prüfen und umschreiben. Jede Zahl trägt ihre
 * Quelle, damit die Meldung ohne uns nachprüfbar bleibt.
 */
export function renderMeldung(c: DraftContext): string {
  const { anlagen, stand } = c.zahlen;
  // In der MELDUNG der Kurzname: Kein Ort schreibt seinen Unterscheidungszusatz
  // in die eigene Pressemitteilung („In Langen (Hessen) sind …"). Der volle Name
  // steht weiter im Anschreiben drumherum.
  const kurz = kurzOrtsname(c.name);
  const platz = c.rang?.platz ?? null;

  // DIE MELDUNG ZÄHLT DINGE, SIE MISST SIE NICHT.
  //
  // Vorher eröffnete sie mit „13,2 MWp auf privaten Dächern; zusammen mit
  // Gewerbe- und Freiflächenanlagen sind es 41,8 MWp aus 2.106 Anlagen" und
  // belegte den Rang mit „404 Wh je Einwohner". Vier Größen, drei davon in
  // Einheiten, die außerhalb der Branche niemand im Kopf umrechnet — und der
  // Empfänger ist eine Pressestelle, keine Netzabteilung (Entscheidung des
  // Betreibers, 19.08.2026).
  //
  // Stückzahlen können alle: „2.106 Solaranlagen", „1.061 Hausspeicher". Sie
  // sind nebenbei die robustere Angabe — eine Leistungssumme wird in kleinen
  // Orten von einem einzigen Solarpark beherrscht, eine Anlagenzahl nicht. Die
  // ganze Fallunterscheidung, die das früher abfangen musste, ist damit weg.
  //
  // Die genauen Leistungswerte stehen weiterhin auf der verlinkten
  // Gemeindeseite. Wer sie braucht, ist einen Klick entfernt.
  //
  // SINGULAR IST TEIL DER RICHTIGKEIT. „In Hamm sind 1 Solaranlagen" stand so
  // in einem echten Brief.
  const anlagenSatz =
    anlagen === 1
      ? `In ${kurz} ist eine Solaranlage in Betrieb.`
      : `In ${kurz} sind ${anlagen.toLocaleString("de-DE")} Solaranlagen in Betrieb.`;

  //
  // EINE EINZIGE LEISTUNGSAUSSAGE, UND ZWAR ALS VERGLEICH.
  //
  // Genannt wird sie NUR, wenn der Ort über dem Landesschnitt liegt. Das ist
  // keine Schönfärberei, sondern der Zweck des Textes: Wir bieten eine Meldung
  // an, keine Bilanz. Liegt der Ort darunter, steht dort schlicht nichts — die
  // verlinkte Gemeindeseite sagt es ohnehin, und zwar in beide Richtungen.
  //
  // Der Satz selbst entsteht in lib/gemeinde-vergleich.ts, gemeinsam mit dem
  // Einleitungssatz der verlinkten Seite. Zwei Fassungen desselben Vergleichs
  // sind hier schon einmal auseinandergelaufen — bis hin zu zwei verschiedenen
  // Schwellen für „ab wann ein Vielfaches statt eines Prozentsatzes", die
  // beide im Kommentar als dieselbe beschrieben waren.
  const vergleichSatz = c.vergleich
    ? briefVergleichSatz(c.vergleich, c.vergleichBezug ?? "")
    : "";

  const unterDen = `unter den ${kleinKlasse(c.gruppe)}`;

  // DIE UEBERSCHRIFT IST KURZ UND BEHAUPTET KEINEN GELTUNGSBEREICH.
  // Eine Pressestelle kuerzt eine lange Schlagzeile selbst, und dabei faellt
  // zuverlaessig der Teil weg, der die Aussage wahr macht (die Groessenklasse).
  // Deshalb: Ort, Platz, Thema — mehr nicht. Der vollstaendige Satz steht
  // darunter, wo Platz dafuer ist.
  const ueberschrift =
    platz != null
      ? `${kurz}: Platz ${platz} ${c.phrase}`
      : `Solarausbau in ${kurz}: der aktuelle Stand`;

  // Die Klammer traegt die STUECKZAHL hinter der Rate, nicht die Rate selbst.
  // Eine Rate ohne ihre Grundmenge kann jede Groesse vortaeuschen; die Rate
  // ohne Grundmenge ist ausserdem genau die Zahl, die niemand einordnen kann.
  const klammerTeil = c.rangBasis ? ` (${c.rangBasis})` : "";

  // „ZUGLEICH" STATT „DAMIT": Der Satz davor zaehlt Solaranlagen, der Rang misst
  // etwas anderes (Hausspeicher, Balkongeraete, Zubau in einem Zeitfenster).
  // „Damit" behauptete eine Ableitung, die es nicht gibt — ein Redakteur, der
  // das prueft, findet einen Fehlschluss und traut danach dem Rest nicht.
  const belegSatz =
    platz === 1
      ? ` Zugleich hat ${kurz} ${c.bestleistung} ${unterDen}: Platz 1 von ${c.rang?.von.toLocaleString("de-DE")}${klammerTeil}.`
      : platz != null
        ? ` Bei ${c.themaDativ} liegt ${kurz} auf Platz ${platz} von ${c.rang?.von.toLocaleString("de-DE")} ${unterDen}${klammerTeil}.`
        : "";

  //
  // DER LINK STEHT IN DER MELDUNG, NICHT IM BRIEF DRUMHERUM — er ist der ganze
  // Zweck. Veröffentlicht die Gemeinde den Text ohne ihn, haben wir einen
  // Aufsatz verschenkt und nichts bekommen. Deshalb steht er auf einer eigenen
  // Zeile: Er soll beim Kürzen als Erstes auffallen, nicht als Letztes.
  //
  // DIE QUELLENZEILE IST PFLICHT, aber sie darf kurz sein. Die Datenlizenz
  // dl-de/by-2-0 verlangt einen Quellenvermerk mit dem Namen der
  // bereitstellenden Stelle — „Bundesnetzagentur" kann deshalb nicht weg, der
  // ganze Satz drumherum schon (Vorgabe des Betreibers, 19.08.2026).
  //
  // DIE HIER VERLINKTE ORTSSEITE IST AB DEM VERSAND FÜR SUCHMASCHINEN OFFEN.
  // Der Versand schaltet sie frei (lib/atlas-outreach-freigabe.ts), nicht erst
  // eine erkannte Veröffentlichung. Grund, gemessen am 29.08.2026: Wallertheim
  // veröffentlichte eine eigene Meldung mit diesem Link in seiner Dorf-App und
  // schickte 47 Besucher — unsere Verweis-Erhebung sah davon nichts, weil
  // Verzeichnisse App-Plattformen nicht crawlen und der Link `rel="noreferrer"`
  // trägt. Wer auf den Nachweis wartet, wartet in solchen Fällen für immer.
  //
  // WER DEN LINK HIER ÄNDERT, ändert damit auch, welche Seite freigeschaltet
  // wird: Die Freigabe hängt am Gemeindeschlüssel des Empfängers, nicht an
  // dieser Zeichenkette. Zeigt der Brief künftig woandershin, muss die Freigabe
  // mitwandern — sonst ist wieder eine Seite verlinkt und gesperrt.
  return `${ueberschrift}

${anlagenSatz}${vergleichSatz}${belegSatz}

Laufend aktualisierte Übersicht für ${kurz}: ${c.pageUrl ?? "https://solar-check.io"}

Quelle: Marktstammdatenregister der Bundesnetzagentur (Stand: ${standLabel(stand)}), Datenlizenz dl-de/by-2-0; Einwohnerzahlen: Statistisches Bundesamt.`;
}

export function renderOutreachDraft(c: DraftContext): OutreachDraft {
  const meldung = renderMeldung(c);

  // KURZ. Der Brief hatte 2.400 Zeichen und las sich wie ein Aufsatz — in einem
  // Rathaus liest das niemand zu Ende. Was bleibt, ist der Anlass, die fertige
  // Meldung, die eine Bitte und die Unterschrift. Jeder Satz, der nur hoeflich
  // war, ist raus.
  //
  // Wer die Website betreut, ist bei kleinen Gemeinden nicht ermittelbar (siehe
  // `funktion`). Die Bitte um Weiterleitung steht deshalb GANZ OBEN und nennt
  // die gesuchte Rolle — jetzt aber in einer Zeile statt in einem Absatz.
  //
  // DIE ANREDE TRÄGT DEN NÄCHSTEN SATZ — oder eben nicht.
  //
  // Der Fehler (gemessen 19.08.2026 an 88 von 100 echten Briefen): Nach „Sehr
  // geehrte Damen und Herren," stand ein vollständiger Satz mit großem
  // Anfangsbuchstaben, und der eigentliche Einstieg begann eine Zeile darunter
  // klein („aus dem amtlichen Marktstammdatenregister…"). Der kleine
  // Buchstabe gehört an die Anrede, nicht hinter einen abgeschlossenen Satz.
  // In einem Rathaus liest man so etwas als „nicht selbst geschrieben" — und
  // damit ist der Brief erledigt, bevor die erste Zahl gelesen wurde.
  //
  // Also: Steht die Weiterleitungs-Bitte da, ist SIE der Satz, der die Anrede
  // fortsetzt (klein), und der Einstieg beginnt danach groß. Steht sie nicht
  // da, setzt der Einstieg die Anrede fort (klein).
  //
  // WEN DIE BITTE NENNT, HÄNGT AN DER GRÖSSE.
  //
  // „Pressestelle" ist in einer 300-Einwohner-Ortsgemeinde niemand. Die Grenze
  // ist NICHT hier gesetzt, sondern die bereits hergeleitete aus
  // lib/kommunen-ask.ts: Sie ist genau damit begründet, dass eine Verwaltung ab
  // dieser Größe erfahrungsgemäß eine Pressestelle oder ein
  // Klimaschutzmanagement hat.
  //
  // Und Social Media gehört dazu: Für viele kleine Gemeinden ist die
  // Facebook-Seite der schnellere Weg als die Website, und das Mitteilungsblatt
  // ist dort verbreiteter als jede Pressestelle.
  const grosseVerwaltung = (c.einwohner ?? 0) > WIDGET_AB_EINWOHNER;
  const weiterleitung = c.funktion
    ? ""
    : grosseVerwaltung
      ? `\n\nfalls Sie nicht zuständig sind: bitte an die Pressestelle oder an die Redaktion von Website und Social Media weiterleiten.`
      : `\n\nfalls Sie nicht zuständig sind: bitte an die Stelle weiterleiten, die Website, Mitteilungsblatt oder Social Media betreut.`;
  const einstiegGross = !c.funktion;

  // Der Widget-Absatz ist der EINZIGE Unterschied zwischen den Varianten —
  // sonst waere nicht zu erkennen, ob eine Reaktion am Widget oder am Text lag.
  //
  // KEINE VORSCHAU, KEIN ANHANG (Stand 19.08.2026).
  //
  // KEIN ANHANG, aber wieder ein Vorschau-Link (20.08.2026).
  //
  // Der Anhang war nie eine Option: ein Bild in der ersten unverlangten Mail
  // einer Absenderdomain ohne Sendehistorie ist ein Spam-Muster. Der
  // Vorschau-Link dagegen war einen Tag lang draußen, weil die Grafik in
  // schmaler Darstellung nicht vorzeigbar war — die Quellenangabe an der Kante
  // lief quer über die letzte Kachel, und Zahl und Einheit brachen um.
  //
  // Beides ist behoben (die Kante hat eine eigene, feste Spur über die volle
  // Kartenhöhe, Zahl und Einheit stehen gestaffelt nebeneinander), nachgesehen
  // bei 375, 640, 900 und 1.280 px. Damit gilt wieder das Ursprüngliche: Ein
  // Angebot, das man ansehen kann, ist besser als eines, das man glauben muss.
  const widgetAbsatz =
    c.variante === "meldung_plus_widget"
      ? `\n\nDie Zahlen gibt es auch als Grafik für Ihre Website. Sie aktualisiert sich monatlich von selbst, Farben und Schrift lassen sich anpassen.${
          c.widgetUrl ? ` So sieht sie für ${c.name} aus: ${c.widgetUrl}` : ""
        } Für Kommunen ist das kostenfrei; wenn Sie sie einbauen möchten, schicke ich Ihnen den Code.`
      : "";

  // Weitere Spitzenplaetze — nur im Brief, nie in der Meldung. Sie belegen, dass
  // die Zahl kein Zufallstreffer ist.
  //
  // DIE VERGLEICHSGRUPPE STEHT EINMAL, NICHT IN JEDER ZEILE.
  //
  // Vorher endete jede Zeile mit „unter den Mittelgroßen Städten in Hessen" —
  // bei drei Zeilen dreimal dieselben sechs Wörter untereinander. Das ist die
  // Stelle, an der ein Brief aussieht, als hätte ihn eine Vorlage ausgespuckt.
  // Ist die Gruppe bei allen Einträgen dieselbe, wird sie ausgeklammert; sonst
  // bleibt sie an der Zeile, weil sie sonst etwas Falsches behaupten würde.
  const weitereListe = (c.weitere ?? []).filter((w) => w.platz && w.von);
  const gruppenGleich =
    weitereListe.length > 0 && weitereListe.every((w) => w.gruppe === weitereListe[0].gruppe);
  const weitereAbsatz = weitereListe.length
    ? gruppenGleich
      ? // Die Vergleichsgruppe steht hier NICHT mehr (Vorgabe des Betreibers,
        // 19.08.2026). Sie steht bereits in der Meldung darüber, und „von 53"
        // sagt von selbst, dass es um eine Teilmenge geht — Hessen hat keine
        // 53 Gemeinden.
        `\n\nAuch sonst steht ${kurzOrtsname(c.name)} weit vorn: ${weitereListe
          .map((w) => `Platz ${w.platz} von ${w.von.toLocaleString("de-DE")} ${w.phrase}`)
          .join(", ")}.`
      : `\n\nAuch sonst steht ${kurzOrtsname(c.name)} weit vorn:\n${weitereListe
          .map(
            (w) =>
              `· Platz ${w.platz} von ${w.von.toLocaleString("de-DE")} ${w.phrase} unter den ${kleinKlasse(w.gruppe)}`,
          )
          .join("\n")}`
    : "";

  //
  // KEINE RANGLISTEN-ZEILE IM BRIEF (Entscheidung des Betreibers, 20.08.2026,
  // nach einem Hin und Her — deshalb steht die Begründung hier ausführlich).
  //
  // Sie war am 19.08. gestrichen, am 20.08. als Beleg mit Sprungmarke wieder
  // eingebaut und am selben Tag wieder verworfen. Der Auftrag „mit Anker auf die
  // Tabelle verlinken" galt der GEMEINDESEITE, nicht dem Brief — dort führt die
  // Verlinkung in die Tabelle, und dort gehört sie hin.
  //
  // Für den Brief zählt die Rechnung anders herum: Er soll möglichst wenige
  // Links tragen, und der Rang bleibt über die Gemeindeseite erreichbar, die in
  // der Meldung ohnehin steht. Ein dritter Link kostet mehr, als die eingesparte
  // Klickstrecke wert ist.
  //
  // `ranglisteUrl` bleibt im Kontext: Das Cockpit zeigt sie weiterhin an, damit
  // ein Mensch die behauptete Platzierung vor dem Versand nachsehen kann.
  const linkZeile = "";

  // DER ASK STAND NIRGENDS.
  // „Fertig formuliert zum Übernehmen" beschreibt den Text; „frei verwendbar,
  // gern gekürzt" setzt die Entscheidung, ihn zu veröffentlichen, bereits
  // voraus. Nach zehn Sekunden wusste der Leser, dass jemand Zahlen über seinen
  // Ort hat — nicht, was er damit tun soll. Jetzt steht es als Bitte da.
  const body = `Sehr geehrte Damen und Herren,${weiterleitung}

${einstiegGross ? "Im" : "im"} Marktstammdatenregister der Bundesnetzagentur steckt gerade eine kleine Meldung für ${c.name}. Ich habe sie fertig formuliert, Sie können sie so übernehmen:

----------------------------------------
${meldung}
----------------------------------------

Der Text ist frei verwendbar, gern auch gekürzt. Ich bitte nur darum, den Link stehen zu lassen. Für Kommunen ist das Angebot kostenfrei, und anmelden muss sich auch niemand. Die Zahlen aktualisiere ich monatlich.${linkZeile}${weitereAbsatz}${widgetAbsatz}

Mit freundlichen Grüßen
${SIGNATURE}

${FUSS_TRENNER}
Impressum: https://solar-check.io/impressum
Datenschutz: https://solar-check.io/datenschutz

${dsgvoHinweis(herkunftsangabe(c.name, c.empfaenger))}`;

  return { subject: c.betreff, body, bodyHtml: briefAlsHtml(body), meldung };
}
