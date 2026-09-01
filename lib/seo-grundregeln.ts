/**
 * Die Regeln, nach denen über eine Index-Freigabe entschieden wird.
 *
 * WARUM ES DIESE DATEI GIBT (29.08.2026): An einem einzigen Tag wurde die
 * Freigabe der Ortsseiten fünfmal in die Gegenrichtung entschieden — jedes Mal
 * nach einer neuen Einzelmessung, jedes Mal plausibel begründet, und jedes Mal
 * mit einem der immer gleichen Denkfehler. Der Betreiber hat das als „viel zu
 * fragil“ und „nur noch Rumgeeier“ benannt, und das trifft zu: Was fehlte, war
 * nicht eine weitere Messung, sondern eine festgeschriebene Entscheidungsregel.
 *
 * Jede Regel hier steht auf einem BELEG, nicht auf einer Erfahrung — und der
 * zugehörige Test verhindert, dass die Frage ohne Widerlegung dieses Belegs
 * wieder aufgemacht wird.
 *
 * Wer eine Regel kippen will, kippt ihren Beleg. Eine neue Stichprobe genügt
 * nicht; das war der Mechanismus, der uns den Tag gekostet hat.
 */

export type Grundregel = {
  /** Kurzname, taucht in Testmeldungen auf. */
  id: string;
  /** Die Regel in einem Satz. */
  regel: string;
  /** Woher sie kommt — Fundstelle oder Messung, nie „ist bekannt“. */
  beleg: string;
  /** Der Fehlschluss, den sie verhindert. */
  verhindert: string;
};

export const SEO_GRUNDREGELN: Grundregel[] = [
  {
    id: "leeres-suchvolumen",
    regel:
      "Ein leeres Suchvolumen heißt „unter der Meldeschwelle“, niemals „keine Nachfrage“. " +
      "Es darf allein keine Entscheidung tragen.",
    beleg:
      "Gemessen 29.08.2026: Der Dienst liefert über 477 Einträge keinen einzigen Wert unter 10 " +
      "und meldet fehlende Werte als „null“ (= keine Daten). Gegenprobe an eigenen Zahlen: " +
      "„stadt essen solarförderung 2026“ hat kein gemeldetes Volumen und brachte in 90 Tagen " +
      "einen echten Klick.",
    verhindert:
      "„Nach diesen Orten sucht niemand“ — stand so als Begründung unter zwei zurückgenommenen " +
      "Schüben und unter der Landkreis-Sperre.",
  },
  {
    id: "kein-ertrag-ist-kein-schaden",
    regel:
      "Geringe erwartete Nachfrage ist KEIN Grund, eine Seite zurückzuhalten. Zurückgehalten " +
      "wird nur, was belegbar schadet.",
    beleg:
      "Betreiber-Einwand 29.08.2026 („aber was bringt es die seiten nicht zu releasen?“), dem " +
      "nichts entgegenzusetzen war: Die Inhalte existieren bereits, das Veröffentlichen kostet " +
      "nichts zusätzlich, und ein Schaden ließ sich in keiner Messung des Tages zeigen.",
    verhindert:
      "Die Verwechslung von „bringt wenig“ mit „schadet“. Sie führte am selben Tag zu einer " +
      "Empfehlung gegen die Freigabe von 145 Seiten mit echtem Inhalt.",
  },
  {
    id: "keine-eigenkannibalisierung",
    regel:
      "Zwei eigene Seiten auf derselben Anfrage kosten einander NICHT die Position. Google zeigt " +
      "höchstens zwei Seiten je Domain in den Top-Ergebnissen und wählt selbst aus.",
    beleg:
      "Google Search Central, „A Guide to Google Search Ranking Systems“, Abschnitt zum " +
      "Site-Diversity-System (am 29.08.2026 im Original gelesen).",
    verhindert:
      "Ausnahmelisten und Sonderzustände zum Schutz vor einem Schaden, den es nicht gibt — " +
      "zwischenzeitlich ein dritter robots-Zustand samt zweiter Datenquelle im Seitenaufbau.",
  },
  {
    id: "crawl-budget",
    regel:
      "Crawl-Budget ist unterhalb von rund 10.000 Seiten kein Argument gegen eine Freigabe. " +
      "Die Kosten des eigenen Renderns sind ein anderes Thema und werden getrennt gemessen.",
    beleg:
      "Google Search Central, „Large site owner's guide to managing your crawl budget“: relevant " +
      "ab einer Million Seiten, oder ab 10.000 bei täglichen Änderungen. Wir liegen bei rund 100 " +
      "indexierten Seiten.",
    verhindert:
      "Crawl-Budget als Universalargument gegen jede Seitengattung — und die Verwechslung mit " +
      "der gemessenen Renderlast der Ranglisten-Seiten (57 % aller Funktionsaufrufe).",
  },
];

/**
 * Die Fehlschlüsse, die als Freigabe-Begründung NICHT mehr zulässig sind.
 *
 * Sie stehen hier als Muster, weil sie in genau diesem Wortlaut im Code standen
 * und beim Wiederlesen erneut überzeugt hätten.
 */
export const UNZULAESSIGE_BEGRUENDUNGEN: { muster: RegExp; warum: string }[] = [
  {
    muster: /kein(?:e)? messbare[sn]? suchvolumen.{0,40}(also|deshalb|daher)/i,
    warum: "Leeres Suchvolumen ist eine Messgrenze, kein Befund (siehe Regel „leeres-suchvolumen“).",
  },
  {
    muster: /die null ist (also )?echt/i,
    warum:
      "Eine Gegenprobe an großen Städten zeigt nur, dass das Muster dort trifft — nicht, dass " +
      "die fehlenden Werte echte Nullen sind.",
  },
];
