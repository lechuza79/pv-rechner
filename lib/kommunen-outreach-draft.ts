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

import { fmtPvLeistung, fmtWattProKopf } from "./atlas-format";
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
  /** Die vollständige Rangliste zum Nachprüfen — der Rang im Brief ist eine
   *  Behauptung, bis man sie ansehen kann. */
  ranglisteUrl?: string | null;
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
  const { anlagen, leistungKwp, wpProKopf, stand } = c.zahlen;
  // In der MELDUNG der Kurzname: Kein Ort schreibt seinen Unterscheidungszusatz
  // in die eigene Pressemitteilung („In Langen (Hessen) sind …"). Der volle Name
  // steht weiter im Anschreiben drumherum.
  const kurz = kurzOrtsname(c.name);
  // "pro Person" statt "je Einwohnerin und Einwohner": Die Doppelform macht den
  // Satz schwerfaellig, ohne ihn genauer zu machen. Entscheidung des Betreibers
  // (31.07.2026). Die Einheit selbst kommt weiter aus dem kanonischen
  // Formatierer — nur die Bezugsgroesse ist umformuliert.
  // Der Anteil privater Daecher gehoert in denselben Satz. Ohne ihn eroeffnet
  // die Meldung mit einer Zahl, die einem Solarpark gehoert, und behauptet
  // danach etwas ueber die Buerger.
  const { privatDachKwp } = c.zahlen;
  const privatAnteil = leistungKwp > 0 && privatDachKwp != null ? privatDachKwp / leistungKwp : null;
  const privatSatz =
    privatDachKwp != null && privatAnteil != null && privatAnteil >= 0.35
      ? `, davon ${fmtPvLeistung(privatDachKwp)} auf privaten Dächern`
      : "";
  // Die Pro-Kopf-Zahl NUR, wenn sie die Buerger meint. Wo Freiflaeche und
  // Gewerbe dominieren, sagt sie ueber den Ort nichts aus.
  const proKopfSatz =
    wpProKopf != null && (privatAnteil == null || privatAnteil >= 0.5)
      ? `, das entspricht ${fmtWattProKopf(wpProKopf)} pro Person`
      : "";
  const platz = c.rang?.platz ?? null;

  // DIE UEBERSCHRIFT BEHAUPTET NUR, WAS STIMMT.
  // Vorher stand dort bedingungslos der Superlativ — auch auf Platz 3 und auch
  // dann, wenn es gar keine Platzierung gab.
  const unterDen = `unter den ${c.gruppe}`;

  // DIE UEBERSCHRIFT IST KURZ UND BEHAUPTET KEINEN GELTUNGSBEREICH.
  //
  // Vorher stand dort die volle Aussage mit Messgroesse, Superlativ und
  // Vergleichsgruppe — 95 Zeichen, und als Schlagzeile unbrauchbar. Eine
  // Pressestelle kuerzt so etwas selbst, und dabei faellt zuverlaessig genau der
  // Teil weg, der die Aussage wahr macht (die Groessenklasse).
  //
  // Deshalb: Die Ueberschrift nennt Ort, Platz und Thema — mehr nicht. Sie
  // behauptet keinen Geltungsbereich und kann damit nicht falsch werden. Der
  // vollstaendige, praezise Satz steht im Fliesstext darunter, wo Platz dafuer
  // ist. Dieselbe Aufteilung wie bei Betreff und Einstieg des Anschreibens.
  const ueberschrift =
    platz != null
      ? `${kurz}: Platz ${platz} ${c.phrase}`
      : `Solarausbau in ${kurz}: der aktuelle Stand`;

  // DER BELEGSATZ NENNT DIE GERANKTE GROESSE, nicht die Gesamtzahlen.
  // Die Gesamtzahlen bleiben als Einordnung stehen — sie belegen den Rang aber
  // nicht, weil sie etwas anderes messen (Solarparks und Gewerbe zaehlen mit).
  //
  // „DAMIT" BEHAUPTETE EINE ABLEITUNG, DIE ES NICHT GIBT.
  // Der Satz davor nennt Anlagenzahl und Gesamtleistung; der Rang misst etwas
  // anderes (Hausspeicher, Balkongeräte, Zubau in einem Zeitfenster). Der
  // Kommentar oben weiß das ausdrücklich — „Damit" sagte trotzdem das
  // Gegenteil, und ein Redakteur, der den Satz prüft, findet einen Fehlschluss
  // und traut danach auch dem Rest nicht. „Zugleich" behauptet nur, dass beides
  // gilt, und genau das stimmt.
  //
  // Die Klammer trägt jetzt auch die STÜCKZAHL hinter der Rate. Eine Rate ohne
  // ihre Grundmenge kann jede Größe vortäuschen — dieselbe Begründung wie beim
  // Feld `basis` in lib/awards.ts, nur war sie im Brief nie angekommen.
  const klammer = [c.rangWert, c.rangBasis].filter(Boolean).join(", ");
  const klammerTeil = klammer ? ` (${klammer})` : "";
  const belegSatz =
    platz === 1
      ? ` Zugleich hat ${kurz} ${c.bestleistung} ${unterDen} — Platz 1 von ${c.rang?.von.toLocaleString("de-DE")}${klammerTeil}.`
      : platz != null
        ? ` Bei ${c.themaDativ} liegt ${kurz} auf Platz ${platz} von ${c.rang?.von.toLocaleString("de-DE")} ${unterDen}${klammerTeil}.`
        : "";

  // SINGULAR IST TEIL DER RICHTIGKEIT. „In Hamm sind 1 Solaranlagen mit
  // zusammen 1 kWp in Betrieb" stand so in einem echten Brief (16 Einwohner,
  // ein Balkonkraftwerk). Dieselbe Regel wie in CLAUDE.md, „Zahlen und
  // Einheiten", Punkt 4: „1 neue Anlagen" ist derselbe Fehler in Worten.
  //
  // WESSEN ZAHL STEHT ZUERST?
  //
  // In Ferschweiler gehören 96 % der installierten Leistung einem
  // Freiflächenpark. Die Meldung eröffnete mit „18,7 MWp" und sagte im nächsten
  // Satz etwas über Hausbatterien — ein Ortsbürgermeister erkennt seinen Ort in
  // dieser Zahl nicht wieder und misstraut ihr. Unterhalb eines Drittels
  // privaten Anteils führen deshalb die privaten Dächer, und die Gesamtzahl
  // steht dahinter, wo sie hingehört. Weggelassen wird nichts.
  const investorenGepraegt = privatAnteil != null && privatAnteil < 0.35 && privatDachKwp != null;
  const anlagenSatz = investorenGepraegt
    ? `In ${kurz} stehen ${fmtPvLeistung(privatDachKwp!)} Solarleistung auf privaten Dächern; zusammen mit Gewerbe- und Freiflächenanlagen sind es ${fmtPvLeistung(leistungKwp)} aus ${anlagen.toLocaleString("de-DE")} Anlagen`
    : anlagen === 1
      ? `In ${kurz} ist 1 Solaranlage mit ${fmtPvLeistung(leistungKwp)} in Betrieb`
      : `In ${kurz} sind ${anlagen.toLocaleString("de-DE")} Solaranlagen mit zusammen ${fmtPvLeistung(leistungKwp)} in Betrieb`;

  return `${ueberschrift}

${anlagenSatz}${privatSatz}${proKopfSatz}.${belegSatz}

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
  const widgetAbsatz =
    c.variante === "meldung_plus_widget"
      ? `\n\nDieselbe Übersicht gibt es auch als Widget für Ihre Website — cookielos, monatlich aktuell, im Design anpassbar. Sagen Sie Bescheid, dann schicke ich den Code.`
      : "";

  // Weitere Spitzenplaetze — nur im Brief, nie in der Meldung. Sie belegen, dass
  // die Zahl kein Zufallstreffer ist.
  const weitereListe = (c.weitere ?? []).filter((w) => w.platz && w.von);
  const weitereAbsatz = weitereListe.length
    ? `\n\n${c.name} liegt auch hier vorn:\n${weitereListe
        .map((w) => `· Platz ${w.platz} von ${w.von.toLocaleString("de-DE")} ${w.phrase} unter den ${w.gruppe}`)
        .join("\n")}`
    : "";

  // Der Rang ist eine Behauptung, bis man ihn nachsehen kann — aber das braucht
  // keinen eigenen Absatz. Und keinen zweiten Link daneben: der Zähl-Link ist
  // raus (siehe DraftContext), die Rangliste ist der einzige Beleg-Link.
  const linkZeile = c.ranglisteUrl ? `\n\nVollständige Rangliste: ${c.ranglisteUrl}` : "";

  // DER ASK STAND NIRGENDS.
  // „Fertig formuliert zum Übernehmen" beschreibt den Text; „frei verwendbar,
  // gern gekürzt" setzt die Entscheidung, ihn zu veröffentlichen, bereits
  // voraus. Nach zehn Sekunden wusste der Leser, dass jemand Zahlen über seinen
  // Ort hat — nicht, was er damit tun soll. Jetzt steht es als Bitte da.
  const body = `Sehr geehrte Damen und Herren,${weiterleitung}

${einstiegGross ? "Aus" : "aus"} dem amtlichen Marktstammdatenregister ergibt sich für ${c.name} gerade eine Meldung — fertig formuliert zum Übernehmen:

────────────────────────────
${meldung}
────────────────────────────

Wenn Sie mögen, stellen Sie den Text als Kurzmeldung auf Ihre Website — frei verwendbar, gern gekürzt; ich bitte nur darum, den Link stehen zu lassen. Kein Vertrieb, keine Kosten, keine Anmeldung; die Zahlen aktualisiere ich monatlich.${weitereAbsatz}${linkZeile}${widgetAbsatz}

Mit freundlichen Grüßen
${SIGNATURE}

—
${dsgvoHinweis(herkunftsangabe(c.name, c.empfaenger))}`;

  return { subject: c.betreff, body, meldung };
}
