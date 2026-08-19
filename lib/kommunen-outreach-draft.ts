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
import type { AskVariante } from "./kommunen-ask";

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
   * Wie viel mehr Solarleistung auf den PRIVATEN Dächern steht als im
   * Landesschnitt, als Anteil (0,42 = 42 % mehr).
   *
   * WARUM AUF DEN PRIVATEN DÄCHERN und nicht auf der Gesamtleistung: Die
   * Gesamtleistung gehört in vielen Orten zu großen Teilen einem
   * Freiflächenpark. Ein Ort käme damit auf „380 % über dem Landesschnitt",
   * ohne dass ein einziger Bürger etwas dafür getan hätte — und die Meldung
   * handelt von den Bürgern.
   *
   * WARUM ÜBERHAUPT EIN VERGLEICH: „13,2 MWp" sagt einer Pressestelle nichts.
   * „42 % mehr als im hessischen Durchschnitt" sagt ihr genau das, was sie
   * veröffentlichen will (Vorgabe des Betreibers, 19.08.2026).
   */
  vergleich?: { anteil: number; bezug: string } | null;
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

export type OutreachDraft = { subject: string; body: string; meldung: string };

const SIGNATURE = `Sebastian Schäder
Betreiber solar-check.io
Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz`;

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
/**
 * Ab wann ein Vorsprung eine Meldung wert ist.
 *
 * Unter zehn Prozent ist der Unterschied für einen Leser keiner, und er wäre
 * auch keiner: Die Einwohnerzahlen stammen aus einer anderen Quelle als die
 * Anlagendaten, und beide haben ihren eigenen Stichtag.
 */
const MIN_VERGLEICH = 0.1;

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
  // Ab dem Dreifachen wird aus dem Prozentsatz ein Vielfaches: „280 % mehr"
  // liest niemand als Größenordnung, „fast das Vierfache" schon. Dieselbe
  // Schwelle wie auf der Gemeindeseite.
  const vergleichSatz = (() => {
    const a = c.vergleich?.anteil;
    if (a == null || !Number.isFinite(a) || a < MIN_VERGLEICH) return "";
    const bezug = c.vergleich!.bezug;
    if (a >= 2) {
      const fach = (a + 1).toLocaleString("de-DE", { maximumFractionDigits: 1 });
      return ` Auf den privaten Dächern steht damit je Einwohner das ${fach}-fache des Durchschnitts ${bezug}.`;
    }
    const pct = Math.round(a * 100);
    return ` Auf den privaten Dächern steht damit je Einwohner ${pct} % mehr Solarleistung als im Durchschnitt ${bezug}.`;
  })();

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

  return `${ueberschrift}

${anlagenSatz}${vergleichSatz}${belegSatz}

Grundlage sind die Anlagendaten des Marktstammdatenregisters der Bundesnetzagentur (Stand: ${standLabel(stand)}), Datenlizenz dl-de/by-2-0; Einwohnerzahlen vom Statistischen Bundesamt. Eine laufend aktualisierte Übersicht für ${kurz} gibt es unter ${c.pageUrl ?? "solar-check.io"}.`;
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
  const weiterleitung = c.funktion
    ? ""
    : `\n\nfalls Sie nicht zuständig sind: bitte an die Website- oder Pressestelle weiterleiten.`;
  const einstiegGross = !c.funktion;

  // Der Widget-Absatz ist der EINZIGE Unterschied zwischen den Varianten —
  // sonst waere nicht zu erkennen, ob eine Reaktion am Widget oder am Text lag.
  //
  // DIE VORSCHAU STATT EINES ANHANGS.
  //
  // „Sollen wir ein Bild des Widgets mitschicken?" — nein. Ein Anhang oder ein
  // eingebettetes Bild bei der ersten unverlangten Mail einer noch unbekannten
  // Absenderdomain ist ein Spam-Muster, und der Brief ist reiner Text, was für
  // die Zustellung spricht. Ein Link kostet nichts und zeigt dasselbe: die
  // fertige Grafik für DIESEN Ort, in einem Klick.
  const widgetAbsatz =
    c.variante === "meldung_plus_widget"
      ? `\n\nDie Zahlen gibt es auch als Grafik für Ihre Website. Sie aktualisiert sich monatlich von selbst und setzt keine Cookies; Farben und Schrift lassen sich anpassen. Wenn Sie sie einbauen möchten, schicke ich Ihnen den Code.${
          c.widgetUrl ? `\n\nSo sieht sie für ${kurzOrtsname(c.name)} aus:\n${c.widgetUrl}` : ""
        }`
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
      ? `\n\nAuch sonst steht ${kurzOrtsname(c.name)} weit vorn, jeweils unter den ${kleinKlasse(weitereListe[0].gruppe)}: ${weitereListe
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
  // DIE RANGLISTEN-ZEILE IST RAUS (Entscheidung des Betreibers, 19.08.2026).
  //
  // Sie stand als eigener Absatz zwischen Meldung und Widget-Hinweis und war
  // der dritte Link im Brief. Nachprüfbar bleibt der Rang trotzdem: Die
  // Gemeindeseite, die in der Meldung steht, führt selbst zu den Ranglisten.
  // Das Feld `ranglisteUrl` bleibt im Kontext — das Cockpit zeigt es weiterhin
  // an, damit ein Mensch vor dem Versand nachsehen kann.
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

Der Text ist frei verwendbar, gern auch gekürzt. Ich bitte nur darum, den Link stehen zu lassen. Kein Vertrieb und keine Kosten; anmelden muss sich auch niemand. Die Zahlen aktualisiere ich monatlich.${weitereAbsatz}${linkZeile}${widgetAbsatz}

Mit freundlichen Grüßen
${SIGNATURE}

${dsgvoHinweis(herkunftsangabe(c.name, c.empfaenger))}`;

  return { subject: c.betreff, body, meldung };
}
