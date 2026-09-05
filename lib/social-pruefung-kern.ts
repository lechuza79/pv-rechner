// Prüfstufe vor der Veröffentlichung: reiner Teil.
//
// Zwei Prüfungen je Beitrag, und sie hängen NICHT am Beitrag, sondern an seiner
// FASSUNG — Text und Bild zusammen. Das ist der ganze Trick: Wer nach der
// Prüfung etwas ändert, hat eine Freigabe für eine Fassung, die es nicht mehr
// gibt. Der Fingerabdruck macht das sichtbar, statt es zu hoffen.
//
// Dass das Bild dazugehört, war zuerst eine Lücke: Der Abdruck hing allein am
// Text, also blieb die Freigabe gültig, wenn jemand den Kartentyp, eine Serie,
// die Rundung oder das Farbschema änderte. Veröffentlicht wurde dann ein anderes
// Bild als das geprüfte — und das Bild ist genau der Teil, der beim Weiterteilen
// mitreist. Ein Loch in einer Sperre ist kein Feinschliff.
//
// Dieselbe Systematik wie beim Förder-Beleg: Nicht das Datum entscheidet, ob
// eine Prüfung noch gilt, sondern ob sie sich auf das bezieht, was wir gerade
// veröffentlichen wollen.

import type { PostBild } from "./social-posts";

export type PruefArt = "zahlen" | "recht" | "gegenpruefung";

export type Pruefung = {
  post_id: string;
  /** Wofür die Prüfung galt. Ändert sich Text oder Bild, verfällt sie. */
  fassung_fingerabdruck: string;
  art: PruefArt;
  bestanden: boolean;
  /** Was geprüft wurde und was dabei herauskam. Erscheint in der Vorschau. */
  befund: string;
  geprueft_am: string;
};

/**
 * Die Spalte hieß bis zum Umbau `text_fingerabdruck`. Sie umzubenennen ist keine
 * Kosmetik: Ein Feldname, der „Text" sagt und auch das Bild abdeckt, ist genau
 * der Fehler, den dieses Projekt an Beschriftungen sonst verfolgt. Die
 * Umbenennung läuft bedingt, damit die Einrichtung mehrfach aufrufbar bleibt.
 *
 * Alte Abdrücke werden dabei NICHT umgerechnet — sie decken das Bild nicht ab
 * und sind damit keine Freigabe für die Fassung, die heute rausginge. Sie
 * verfallen, und das ist die sichere Richtung.
 */
export const SOCIAL_PRUEFUNG_DDL = `
  CREATE TABLE IF NOT EXISTS social_pruefungen (
    post_id text NOT NULL,
    fassung_fingerabdruck text NOT NULL,
    art text NOT NULL CHECK (art IN ('zahlen', 'recht', 'gegenpruefung')),
    bestanden boolean NOT NULL,
    befund text NOT NULL DEFAULT '',
    geprueft_am timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, art, fassung_fingerabdruck)
  );
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_pruefungen' AND column_name = 'text_fingerabdruck'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_pruefungen' AND column_name = 'fassung_fingerabdruck'
    ) THEN
      ALTER TABLE social_pruefungen RENAME COLUMN text_fingerabdruck TO fassung_fingerabdruck;
    END IF;
  END $$;
  -- Die dritte Prüfart kam später dazu. Die Bedingung wird ersetzt statt
  -- ergänzt, damit die Einrichtung mehrfach aufrufbar bleibt.
  ALTER TABLE social_pruefungen DROP CONSTRAINT IF EXISTS social_pruefungen_art_check;
  ALTER TABLE social_pruefungen ADD CONSTRAINT social_pruefungen_art_check
    CHECK (art IN ('zahlen', 'recht', 'gegenpruefung'));
  ALTER TABLE social_pruefungen ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON social_pruefungen FROM PUBLIC;
  REVOKE ALL ON social_pruefungen FROM anon;
  REVOKE ALL ON social_pruefungen FROM authenticated;
`;

/**
 * Alle drei müssen vorliegen. Zwei reichen nicht.
 *
 * Die dritte, die GEGENPRÜFUNG, ist der Teil, den kein Mensch und keine Regel
 * leisten kann: Ob eine Aussage über die Welt stimmt. Die Mechanik stellt
 * Widersprüche IM SYSTEM fest — dass Text und Bild dieselbe Zahl nennen, dass
 * eine Einheit dasteht, dass ein Richtungswort zur Zahl passt. Sie kann nicht
 * feststellen, dass eine in sich stimmige Aussage trotzdem geraten ist.
 *
 * Genau dieser Fall ist an einem Tag zweimal eingetreten: Ein Beitrag
 * behauptete, ein fehlender Anteil sei „vor allem Steckersolar" — eine
 * Überschlagsrechnung, in sich schlüssig, als Sachaussage im Bild. Und ein
 * Katalogbeispiel behauptete ein Ost-West-Gefälle, das es nicht gibt. Beide
 * hätten jede mechanische Regel bestanden.
 *
 * Deshalb ein eigener Prüfstand mit eigenem Auftrag: WIDERLEGEN, nicht
 * bestätigen. Gemessen an den Rechtsbefunden dieses Projekts überlebt knapp ein
 * Fünftel die Gegenprüfung nicht, und bei einem Teil davon hätte die
 * „Korrektur" Richtiges durch Falsches ersetzt — der Gegenprüfer greift deshalb
 * ausdrücklich auch die Bestätigungen an und darf sagen, dass ein Befund
 * übertrieben ist.
 */
export const NOETIGE_PRUEFUNGEN: PruefArt[] = ["zahlen", "recht", "gegenpruefung"];

/**
 * Was die beiden Prüfungen behaupten — und was sie ausdrücklich NICHT abdecken.
 *
 * Steht hier und nicht in der Oberfläche, weil es die Frage ist, die beantwortet
 * wird: Wer eine Freigabe erteilt, muss lesen können, wofür er unterschreibt.
 * Getippt in der Ansicht wäre es eine zweite Fassung, die beim nächsten Umbau
 * stehen bleibt.
 *
 * Das Feld `nichtGeprueft` ist kein Beiwerk. Zwei Prüfungen nebeneinander laden
 * dazu ein, die eine für die andere mitzunehmen — „die Zahlen habe ich ja
 * angesehen" deckt die Namensnennung nicht ab, und umgekehrt.
 */
export type PruefBeschreibung = {
  art: PruefArt;
  name: string;
  /** Die Frage, die mit „bestanden" bejaht wird. */
  frage: string;
  /** Was diese Prüfung nicht mit abdeckt. */
  nichtGeprueft: string;
};

export const PRUEF_BESCHREIBUNG: PruefBeschreibung[] = [
  {
    art: "zahlen",
    name: "Zahlen",
    frage:
      "Sagen Text und Bild dieselbe Zahl, trägt jede Zahl ihre Einheit und ihren Nenner, und ist die Grundmenge groß genug für die Aussage?",
    nichtGeprueft: "Ob die Aussage veröffentlicht werden darf — das ist die Rechtsprüfung.",
  },
  {
    art: "recht",
    name: "Recht und Regeln",
    frage:
      "Hält der Beitrag die Regeln des Redaktionsplans ein — Namensnennung, Sprachregel, Quellenangabe im Bild, kein Link im Text?",
    nichtGeprueft: "Ob die Zahlen stimmen — das ist die Zahlenprüfung.",
  },
  {
    art: "gegenpruefung",
    name: "Gegenprüfung",
    frage:
      "Hat ein unabhängiger Lauf mit dem Auftrag, diesen Beitrag zu WIDERLEGEN, jede Aussage gegen die Quelle gehalten — und ist keine davon eine Plausibilität, die als Messung dasteht?",
    nichtGeprueft:
      "Aussehen und Wirkung. Und alles, was schon die Mechanik entscheidet — die läuft ohnehin und sperrt selbst.",
  },
];

export function pruefBeschreibung(art: PruefArt): PruefBeschreibung {
  const b = PRUEF_BESCHREIBUNG.find((x) => x.art === art);
  // Eine Prüfart ohne Beschreibung wäre ein Formular ohne Frage. Lieber laut.
  if (!b) throw new Error(`Keine Beschreibung für die Prüfart "${art}"`);
  return b;
}

/**
 * Ein Befund ist Pflicht, und zwar im Klartext.
 *
 * Eine Freigabe ohne Befund hielte fest, dass jemand geklickt hat, nicht was er
 * geprüft hat — dieselbe Fehlerklasse wie ein Prüfdatum, hinter dem keine
 * Prüfung steht. Bei „nicht bestanden" ist der Befund sogar die ganze Aussage:
 * Ohne ihn weiß niemand, was zu ändern ist.
 *
 * Die Untergrenze hält den Reflex auf, nicht einen entschlossenen Menschen —
 * „ok" und „passt" fallen durch, eine erfundene Zeile nicht. Das ist die
 * ehrliche Reichweite einer solchen Schranke, und mehr wird hier auch nicht
 * behauptet.
 */
export const BEFUND_MIN_ZEICHEN = 12;

export function pruefeBefund(befund: string): { ok: true } | { ok: false; grund: string } {
  const t = befund.trim();
  if (!t) return { ok: false, grund: "Ohne Befund keine Prüfung — was wurde angesehen?" };
  if (t.length < BEFUND_MIN_ZEICHEN) {
    return {
      ok: false,
      grund: `Der Befund ist zu knapp (mindestens ${BEFUND_MIN_ZEICHEN} Zeichen). Er steht später am veröffentlichten Beitrag.`,
    };
  }
  return { ok: true };
}

/** Ist das eine Prüfart, die wir kennen? */
export function istPruefArt(wert: unknown): wert is PruefArt {
  return typeof wert === "string" && (NOETIGE_PRUEFUNGEN as string[]).includes(wert);
}

/** Was veröffentlicht würde: der Text und das Bild daneben. */
export type Fassung = { text: string; bild: PostBild | null };

/**
 * Das Bild als stabile Zeichenkette.
 *
 * Bewusst über ALLE Felder, nach Namen sortiert, statt über eine Aufzählung der
 * heute bekannten. Eine Aufzählung müsste jemand pflegen, und beim nächsten Feld
 * — einer zweiten Achse, einer Bildunterschrift — würde sie vergessen. Dann
 * hinge die Freigabe wieder an weniger, als das Bild zeigt, ohne dass irgendwo
 * etwas rot wird.
 */
function stabil(wert: unknown): string {
  if (wert === null || wert === undefined) return "∅";
  if (Array.isArray(wert)) return "[" + wert.map(stabil).join(",") + "]";
  if (typeof wert === "object") {
    return (
      "{" +
      Object.keys(wert as Record<string, unknown>)
        .sort()
        .map((k) => `${k}=${stabil((wert as Record<string, unknown>)[k])}`)
        .join(",") +
      "}"
    );
  }
  return String(wert);
}

/**
 * HIER WIRD NICHT MEHR GEHASHT — das tut serverseitig `lib/social-pruefung.ts`.
 *
 * Vorher stand an dieser Stelle eine FNV-1a-Prüfsumme mit 32 Bit plus
 * Textlänge. Sie musste im Browser laufen, deshalb war sie handgeschrieben —
 * und sie ist eine Streuspeicher-Funktion aus dem Lehrbuch, nicht
 * kollisionsfest. Zu einem freigegebenen Text ließ sich in Sekunden ein anderer
 * bauen, der denselben Abdruck ergibt und damit dessen Freigabe erbt. Weil der
 * Text über die Fassungs-Route frei setzbar ist und diese den Cron-Schlüssel
 * akzeptiert, war das kein Gedankenspiel: Der ganze Entwurf hing an „gleicher
 * Abdruck heißt gleiche Fassung", und genau das war nicht wahr. Gefunden von
 * einem adversarialen Prüfer mit dem Auftrag, das Tor zu widerlegen.
 *
 * Die Lösung ist nicht ein stärkerer Hash IM BROWSER, sondern gar keiner. Der
 * Browser braucht ihn nicht: Er muss nur wissen, ob sein Entwurf noch dem
 * abgelegten Stand entspricht — und das weiß er, weil er die Änderung selbst
 * gemacht hat. Den Abdruck des abgelegten Standes reicht der Server herunter.
 * Damit gibt es genau EINE Stelle, die ihn rechnet, und sie darf ein echtes
 * Verfahren benutzen.
 *
 * Was hier bleibt, ist die KANONISCHE FASSUNG — die Zeichenkette, über die
 * gehasht wird. Sie ist rein und gehört zur Aussage, nicht zur Kryptografie.
 */

/**
 * Fingerabdruck der Fassung: Text UND Bild.
 *
 * Der Text geht NORMALISIERT ein: Ein zusätzlicher Zeilenumbruch oder ein
 * doppeltes Leerzeichen ist keine inhaltliche Änderung und soll keine Prüfung
 * entwerten — sonst wird die Sperre zur Schikane und irgendwann umgangen. Jede
 * Änderung an Wörtern oder Zahlen dagegen erzeugt einen neuen Abdruck.
 *
 * Das Bild geht UNNORMALISIERT ein, bis auf die Reihenfolge der Feldnamen: Dort
 * gibt es kein Beiwerk. Eine Nachkommastelle mehr ist im Bild eine andere
 * Aussage, kein Formatierungsunterschied.
 *
 * Folge, die man kennen muss: Bewegt sich der Datenstand, bewegen sich die
 * Werte im Bild, und die Freigabe verfällt. Das ist beabsichtigt — die
 * Zahlenprüfung galt genau diesen Zahlen.
 */
export function fassungsText(fassung: Fassung): string {
  const text = fassung.text.replace(/\s+/g, " ").trim().toLowerCase();
  const bild = fassung.bild ? stabil(fassung.bild) : "∅";
  return text + " " + bild;
}

export type PruefUrteil = { ok: true } | { ok: false; grund: string };

/**
 * Darf diese Fassung raus? Beide Prüfungen müssen für GENAU diesen Text und
 * dieses Bild vorliegen und bestanden sein.
 */
export function urteil(abdruck: string, vorhandene: Pruefung[]): PruefUrteil {
  const passend = vorhandene.filter((p) => p.fassung_fingerabdruck === abdruck);

  const fehlend = NOETIGE_PRUEFUNGEN.filter((art) => !passend.some((p) => p.art === art));
  if (fehlend.length) {
    // Der Unterschied ist wichtig für die Meldung: Eine Prüfung, die es für
    // eine ÄLTERE Fassung gab, ist etwas anderes als gar keine.
    const veraltet = fehlend.filter((art) => vorhandene.some((p) => p.art === art));
    return {
      ok: false,
      grund: veraltet.length
        ? `Text oder Bild wurden nach der Prüfung geändert. Erneut prüfen: ${veraltet.join(", ")}.`
        : `Noch nicht geprüft: ${fehlend.join(", ")}.`,
    };
  }

  const durchgefallen = passend.filter((p) => !p.bestanden);
  if (durchgefallen.length) {
    return {
      ok: false,
      grund: `Prüfung nicht bestanden (${durchgefallen.map((p) => p.art).join(", ")}): ${durchgefallen
        .map((p) => p.befund)
        .filter(Boolean)
        .join(" · ")}`,
    };
  }

  return { ok: true };
}
