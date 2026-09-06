// Eine Ortsgeschichte IST ein Beitrag — das ist die ganze Datei.
//
// WARUM ES SIE GIBT (Betreiber, 06.09.2026: „ich will kein neues System
// entwickeln, sondern die als Teil des Redaktionssystems nutzen"):
//
// Die Gemeindeseiten rechnen seit dem 05.09.2026 Geschichten je Ort, und sie
// standen bis dahin daneben — mit eigener Kategorien-Aufzählung, eigener,
// engerer Formenlehre, ohne Farbschema und ohne Quellenzeile. Damit konnte
// kein Template auf sie greifen, keine Freigabe sie erfassen und niemand sie
// vor dem Versand bearbeiten.
//
// AN DEN DATEN GEMESSEN unterscheiden sie sich nicht: Sie rechnen dieselben
// Familien des Katalogs (G2, G3, G4, G10, G14, G15, G16), tragen wie ein Fund
// des Suchlaufs eine Schlagzeile, benannte Werte mit Einheit und eine
// Grundlage. Was fehlte, waren vier Angaben — Farbschema, Quellenzeile,
// Messzeile und die Frage, welche Formen ihre Zahlen überhaupt hergeben.
//
// DER ORT IST KEINE KATEGORIE, SONDERN EINE ZWEITE DIMENSION. Eine
// Redaktions-Kategorie „Kommune" wäre genau die zweite Ordnung, gegen die
// lib/redaktions-kategorien.ts ausdrücklich gebaut ist: Die sieben Familien
// stünden dann unter einem Reiter und wären dort nicht mehr auseinanderzu-
// halten. Der Ort steht deshalb AM Beitrag (`ort`), und die Ansicht filtert
// danach.
//
// REIN und ohne Datenbank-Importe: Der Aufrufer reicht die Geschichten, den
// Ort und die gespeicherten Fassungen herein.

import type { OrtsStory } from "./orts-stories";
import { moeglicheFormen } from "./social-bildformen";
import { istKartenStil, KARTEN_STIL_STANDARD } from "./social-karten-stil";
import {
  quellenzeileMehrfach,
  type BildSerie,
  type GespeicherteFassung,
  type PostBild,
  type SocialPost,
} from "./social-posts";

/** Welcher Ort — beides gebraucht: der Schlüssel für die Kennung, der Name für die Ansicht. */
export type OrtBezug = { regionId: string; name: string };

/**
 * Die Kennung eines Ortsbeitrags.
 *
 * SIE TRÄGT DEN GEMEINDESCHLÜSSEL, und daran hängt der ganze Zweck: Die
 * redaktionelle Fassung (Text, Farbschema, Bildform) wird unter der
 * Beitrags-Kennung abgelegt. Mit dem Ort darin ist „dieselbe Geschichte, aber
 * für Heringen anders eingestellt" ein eigener Eintrag — genau das, was ein
 * Versandschub braucht.
 *
 * Der Schlüssel steht VOR der Story-Kennung, damit alle Beiträge eines Orts in
 * jeder alphabetischen Liste beieinander stehen.
 *
 * Sie enthält weder Template noch Farbschema — dieselbe Regel wie bei den
 * bundesweiten Beiträgen: Wer umfärbt, darf seine Fassung nicht verlieren.
 */
export function ortsPostId(regionId: string, storyKennung: string): string {
  return `ort-${regionId}-${storyKennung}`;
}

/** Zerlegt eine Ortsbeitrags-Kennung wieder — oder nichts, wenn es keine ist. */
export function ortsPostTeile(id: string): { regionId: string; storyKennung: string } | undefined {
  const m = /^ort-(\d{5,8})-(.+)$/.exec(id);
  return m ? { regionId: m[1], storyKennung: m[2] } : undefined;
}

/**
 * Mit wie vielen Nachkommastellen ein Wert im Bild steht.
 *
 * ABGELESEN, NICHT GEWÄHLT: Die Geschichten runden ihre Werte bereits auf das,
 * was ihr Text nennt (`runde()` in lib/orts-stories.ts). Zeigt das Bild mehr
 * Stellen, widerspricht es dem Satz daneben — die Fehlerklasse, gegen die die
 * Angabe `stellen` überhaupt existiert. Zeigt es weniger, verschwindet eine
 * Unterscheidung, die der Text trifft.
 *
 * Gedeckelt bei zwei Stellen: Ein Fließkomma-Artefakt („1.7999999999999998")
 * darf keine zwanzigstellige Zahl ins Bild schreiben.
 */
export function stellenVon(wert: number): number {
  const s = String(Math.abs(wert));
  const punkt = s.indexOf(".");
  if (punkt < 0 || s.includes("e")) return 0;
  return Math.min(2, s.length - punkt - 1);
}

function serienAus(story: OrtsStory): BildSerie[] {
  return story.werte.map((w) => ({
    label: w.name,
    wert: w.wert,
    einheit: w.einheit,
    stellen: stellenVon(w.wert),
    hervorgehoben: w.haupt === true,
  }));
}

/**
 * Der Beitragstext.
 *
 * Aufbau wie bei den bundesweiten Beiträgen: die Aussage zuerst (sie muss vor
 * dem „mehr anzeigen" des Feeds stehen), dann die Erläuterung, zuletzt die
 * Quellenzeile MIT Marke — im Text muss der Markenname stehen, damit die
 * Erwähnung der Unternehmensseite ihn findet; im Bild steht daneben das Logo.
 */
function textAus(story: OrtsStory, standIso: string): string {
  return [story.titel, "", story.text, "", quellenzeileMehrfach(story.quellen, standIso, true)].join(
    "\n",
  );
}

function bildAus(story: OrtsStory, standIso: string, fassung?: GespeicherteFassung): PostBild {
  const basis: PostBild = {
    stil: istKartenStil(fassung?.stil) ? fassung.stil : KARTEN_STIL_STANDARD,
    art: story.bildform,
    aussage: story.titel,
    gemessen: story.gemessen,
    serien: serienAus(story),
    ganzes: story.ganzes,
    quelle: quellenzeileMehrfach(story.quellen, standIso, false),
  };
  // Eine gewählte Bildform gilt nur, wenn sie für DIESE Zahlen trägt — dieselbe
  // Bedingung wie bei den bundesweiten Beiträgen. Ändern sich die Daten (eine
  // dritte Serie, ein weggefallenes Ganzes), fällt die Geschichte auf ihre
  // eingebaute Form zurück, statt eine Aussage zu zeigen, die das Bild nicht
  // hergibt.
  if (fassung?.form && moeglicheFormen(basis).includes(fassung.form)) {
    return { ...basis, art: fassung.form };
  }
  return basis;
}

/**
 * Ein Ortsbeitrag: der Beitrag selbst plus das, was die ORTSSEITE zusätzlich
 * zeigt.
 *
 * Warum getrennt und nicht alles am Beitrag: `SocialPost` ist die Einheit des
 * Redaktionssystems und gilt für bundesweite Beiträge genauso. Ein Feld
 * „Beschriftung der Ortsgeschichte" dort wäre für dreizehn von vierzehn
 * Beiträgen leer — und ein leeres Feld ist eine Einladung, es irgendwann
 * anders zu füllen.
 *
 * Der Redaktionstisch nimmt `post`, die Ortsseite das Ganze.
 */
export type OrtsBeitrag = {
  post: SocialPost;
  /**
   * Die Beschriftung der Kategorie, fertig aufgelöst („Stichtag").
   *
   * Nicht aus dem Katalog ableitbar: Zwei Geschichten derselben Familie heißen
   * verschieden — „Was der Ort eingespielt hat" und „Stichtag" sind beide G4.
   */
  label: string;
  /**
   * Die zwei bis drei Sätze der Geschichte — OHNE Schlagzeile und OHNE
   * Quellenzeile.
   *
   * Nicht `post.text`: Der ist für den Feed gebaut und trägt beides mit, weil
   * dort nichts danebensteht. Auf der Ortsseite steht die Schlagzeile im Bild
   * und die Quelle an der Kante der Karte — beides ein zweites Mal darunter
   * wäre dieselbe Angabe zweimal.
   *
   * Und ausdrücklich NICHT über `SocialPost.onsite`: Das Feld verspricht
   * „dieselbe Erkenntnis in anderer Stimme" (der Feed spricht in der ersten
   * Person, eine Ratgeberseite nicht). Eine Ortsgeschichte hat nur eine Stimme;
   * das Feld zu füllen hieße, eine Unterscheidung zu behaupten, die es hier
   * nicht gibt.
   */
  text: string;
  /** Woran die Geschichte hängt, im Klartext — für den Hinweis hinter dem „?". */
  grundlage: string;
  /** Die Kennung OHNE Ortspräfix — sie benennt die Datei beim Herunterladen. */
  storyKennung: string;
};

/**
 * Die Geschichten eines Orts als Beiträge des Redaktionssystems.
 *
 * Reihenfolge unverändert: Die Geschichten kommen schon nach Gewicht sortiert,
 * und eine zweite Ordnung hier wäre eine zweite Wahrheit über ihre Stärke.
 */
export function ortsPosts(opts: {
  stories: OrtsStory[];
  ort: OrtBezug;
  /** Datenstand des Anlagenregisters (ISO) — er steht in jeder Quellenzeile. */
  standIso: string;
  /** Was der Redaktionstisch je Beitrag gespeichert hat. */
  fassungen?: Record<string, GespeicherteFassung>;
}): OrtsBeitrag[] {
  const { stories, ort, standIso, fassungen = {} } = opts;
  return stories.map((story) => {
    const id = ortsPostId(ort.regionId, story.kennung);
    const fassung = fassungen[id];
    const post: SocialPost = {
      id,
      // Die interne Bezeichnung der Vorschau, nicht Teil des Beitrags. Der
      // Ortsname steht davor, weil in einem Schub Dutzende Beiträge derselben
      // Familie nebeneinanderliegen und sonst gleich hießen.
      titel: `${ort.name} — ${story.kategorieLabel}`,
      kategorie: story.kategorie,
      ort,
      storyArt: story.art,
      kanal: ["linkedin", "instagram"],
      text: textAus(story, standIso),
      bild: bildAus(story, standIso, fassung),
      // Die Grundlage IST der Beleg: Grundmenge, Nenner und Annahmen im
      // Klartext. Dazu die Werte, damit ein Prüfer sie gegen das Bild halten
      // kann, ohne es zu rendern.
      belege: [
        story.grundlage,
        ...story.werte.map(
          (w) => `${w.name}: ${w.wert.toLocaleString("de-DE")}${w.einheit ? ` ${w.einheit}` : ""}`,
        ),
      ],
    };
    return {
      post,
      label: story.kategorieLabel,
      text: story.text,
      grundlage: story.grundlage,
      storyKennung: story.kennung,
    };
  });
}
