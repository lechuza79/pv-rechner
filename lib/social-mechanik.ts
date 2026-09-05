// Die mechanische Prüfung einer Fassung: was eine Maschine ENTSCHEIDEN kann.
//
// DIE TRENNLINIE, an der alles hängt (aus der Prüfrunde vom 28.08.2026):
//
//   SPERREN darf, was einen WIDERSPRUCH IM SYSTEM feststellt.
//   HINWEISEN darf, was ein URTEIL ÜBER DIE WELT fällt.
//
// Nicht „parameterfrei ja/nein" — das war eine frühere, zu grobe Fassung. Eine
// Regel wie „ein Superlativ braucht eine Mindestgrundmenge" enthält eine
// gegriffene Zahl und muss trotzdem sperren. Der Unterschied liegt darin, WEM
// der Parameter gehört: Die Mindestgröße ist ein Feld, das die Kennzahl ohnehin
// führt und anderswo begründet; die Regel prüft nur, ob der Satz zu dem Feld
// passt. Eine Enge-Schwelle für ein Balkendiagramm erfindet die Regel dagegen
// selbst — und eine an fünf Fällen geeichte Zahl fiel beim sechsten.
//
// WARUM DAS SO SCHARF GETRENNT WIRD: Eine Sperre, die zu oft zu Unrecht feuert,
// wird abgeschaltet — und nimmt die richtigen mit. Gemessen an den echten
// Beiträgen: Der naive Abgleich „jede Bildzahl muss wörtlich im Text stehen"
// hat 21 % Fehlalarm, die Sprachregel 50 %, der Rundungsabgleich 100 %. Alle
// drei sind deshalb Hinweise. Die Kollisionsregel hat 0 % und sperrt.
//
// JEDE REGEL HIER IST AN DEN 14 ECHTEN BEITRÄGEN GEEICHT, bevor sie sperren
// durfte. Wer eine hinzufügt, misst sie genauso — eine Regel, die nur gegen
// erfundene Testdaten geprüft wurde, kennt die Fälle nicht, die es wirklich gibt.

import { DATA_SOURCES } from "./data-sources";
import type { SocialKennzahlen, SocialPost } from "./social-posts";

export type Schwere = "sperre" | "hinweis";

export type Befund = {
  /** Stabiler Schlüssel der Regel. Wandert in den Prüfbefund. */
  regel: string;
  schwere: Schwere;
  /** Was konkret nicht stimmt — mit dem Fundstück, nicht nur der Regel. */
  text: string;
};

export type Regel = {
  schluessel: string;
  name: string;
  schwere: Schwere;
  /** Was sie feststellt, in einem Satz. Erscheint im Prüfbefund. */
  prueft: string;
};

/* ────────────────────────────────────────────────────────────────────────────
   Hilfen
   ──────────────────────────────────────────────────────────────────────────── */

/** Alles, was im Bild als Text sichtbar wird. */
function bildTexte(post: SocialPost): string[] {
  const b = post.bild;
  if (!b) return [];
  return [
    b.aussage,
    b.gemessen,
    b.quelle,
    ...b.serien.flatMap((s) => [s.label, s.zusatz ?? "", s.delta ?? "", s.einheit ?? ""]),
  ].filter(Boolean);
}

/** Text plus Bild — alles, was ein Leser zu sehen bekommt. */
function allesSichtbare(post: SocialPost): string {
  return [post.text, ...bildTexte(post)].join("\n");
}

/* ────────────────────────────────────────────────────────────────────────────
   Die Regeln
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Kein Link im Beitragstext.
 *
 * Ein Link drückt die Verbreitung; er gehört in den ersten Kommentar. Gemessen:
 * null Treffer und null Fehlalarm-Kandidaten an den 14 Beiträgen — die Marke
 * steht als Wort im Text, nicht als Adresse.
 */
function regelKeinLink(post: SocialPost): Befund[] {
  const treffer = post.text.match(/https?:\/\/\S+|\bwww\.\S+|\b[\w-]+\.(?:de|io|com|org|net)\b/gi);
  return treffer
    ? [{ regel: "kein-link", schwere: "sperre", text: `Der Beitragstext enthält eine Adresse: ${treffer.join(", ")}` }]
    : [];
}

/**
 * Die Quellenzeile im Bild nennt eine LIZENZ, nicht nur einen Namen.
 *
 * Die Lizenzen kommen aus dem Quellenregister, nie aus einer Liste hier — und
 * ausdrücklich NUR die Lizenzen, nie die Bereitsteller-Namen. Genau daran ist
 * die Prüfung dieses Projekts schon einmal gescheitert: Sie ließ den
 * Behördennamen als dritten Zweig zu, und darüber ist ein Lizenzverstoß
 * monatelang durchgerutscht.
 *
 * Verallgemeinert und hier festgehalten, weil es die teuerste Bauform ist:
 * BEI EINER PFLICHT-PRÜFUNG MUSS JEDER ZWEIG EINES ODER DIE PFLICHT ALLEIN
 * ERFÜLLEN. Ein Zweig, der nur dasteht, damit die Prüfung grün bleibt, hebt sie
 * auf.
 */
const BEKANNTE_LIZENZEN: string[] = Array.from(
  new Set(
    Object.values(DATA_SOURCES).flatMap((q) =>
      "license" in q && typeof q.license === "string" && q.license.length > 0 ? [q.license as string] : [],
    ),
  ),
);

function regelQuelleLizenz(post: SocialPost): Befund[] {
  if (!post.bild) return [];
  const q = post.bild.quelle ?? "";
  if (!q.trim()) {
    return [{ regel: "quelle-lizenz", schwere: "sperre", text: "Das Bild trägt keine Quellenangabe." }];
  }
  if (!BEKANNTE_LIZENZEN.some((l) => q.includes(l))) {
    return [
      {
        regel: "quelle-lizenz",
        schwere: "sperre",
        text: `Die Quellenangabe im Bild nennt keine Lizenz: „${q}"`,
      },
    ];
  }
  return [];
}

/**
 * Steht die Einheit nicht an der Zahl, sollte sie sonstwo im Bild stehen.
 *
 * HINWEIS, NICHT SPERRE — und das ist gemessen, nicht vorsichtig geschätzt. Der
 * echte Fund dieser Regel ist schwer: ein Bild mit „4.080" und „2.553" und
 * nirgends „kWh", also eine Zahl ohne Einheit, nach der Regel dieses Projekts
 * der schwerste mögliche Fehler. Aber an den 14 echten Beiträgen meldete sie
 * viermal, und drei davon zu Unrecht: Die Einheit steht als Abkürzung an der
 * Serie („je 1.000 Ew.") und ausgeschrieben im Untertitel („je 1.000
 * Einwohner"). Ein Zeichenkettenvergleich kann das nicht trennen, und jede
 * Abkürzungstabelle, die es könnte, wäre wieder ein Urteil.
 *
 * Drei von vier falsch ist genau die Quote, bei der eine Sperre nach drei Wochen
 * abgeschaltet wird — und dann nimmt sie den einen echten Fund mit.
 */
function regelEinheitImBild(post: SocialPost): Befund[] {
  const b = post.bild;
  if (!b || b.einheitAmWert !== false) return [];
  // OHNE die Einheit-Felder selbst. Erste Fassung nahm sie mit — und fand die
  // Einheit dann immer, nämlich in sich selbst. Die Regel war grün und hat
  // nichts geprüft. Steht „nicht an der Zahl", wird das Feld gar nicht
  // gerendert; es zählt hier also nicht als sichtbar.
  const sichtbar = [
    b.aussage,
    b.gemessen,
    b.quelle,
    ...b.serien.flatMap((s) => [s.label, s.zusatz ?? "", s.delta ?? ""]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const fehlend = Array.from(new Set(b.serien.map((s) => s.einheit).filter((e): e is string => !!e))).filter(
    (e) => !sichtbar.includes(e.toLowerCase()),
  );
  return fehlend.length
    ? [
        {
          regel: "einheit-im-bild",
          schwere: "hinweis",
          text: `Die Einheit steht nicht an der Zahl — steht sie sonstwo im Bild? Nicht wörtlich gefunden: ${fehlend.join(", ")}`,
        },
      ]
    : [];
}

/**
 * Eine Jahreszahl trägt kein Tausendertrennzeichen.
 *
 * „Stand 2.024" — passiert, wenn ein Jahr durch den Formatierer für Mengen
 * läuft. Stand live im Text UND im Bild; über 2.200 Tests haben es nicht
 * gesehen, weil keiner auf Formatierung schaute.
 *
 * Der Wertebereich ist die Absicherung gegen Fehlalarm: „2.553 Kilowattstunden"
 * ist eine gültige Menge und liegt außerhalb. Eine Menge von exakt 2.024 Stück
 * wäre ein Fehlalarm — und kostet eine Umformulierung, während das Übersehen
 * eine falsche Jahreszahl in jedem Bild lässt.
 */
function regelJahrOhneTrennzeichen(post: SocialPost): Befund[] {
  const treffer = new Set<string>();
  for (const m of allesSichtbare(post).matchAll(/\b([12]\.\d{3})\b/g)) {
    const zahl = Number(m[1].replace(".", ""));
    if (zahl >= 1900 && zahl <= 2100) treffer.add(m[1]);
  }
  return treffer.size
    ? [
        {
          regel: "jahr-trennzeichen",
          schwere: "sperre",
          text: `Eine Jahreszahl trägt einen Tausenderpunkt: ${[...treffer].join(", ")}`,
        },
      ]
    : [];
}

/**
 * Nichts Kaputtes im sichtbaren Text.
 *
 * Entsteht aus einer Division ohne Nenner: „Jedes 0-te Programm fördert …".
 * Kein Ermessen, kein Parameter — eine Rechnung, die durchgeschlagen ist.
 */
function regelKaputteZahl(post: SocialPost): Befund[] {
  const treffer = allesSichtbare(post).match(/\bNaN\b|\bInfinity\b|\bundefined\b|\b0-te[rns]?\b|\bnull\b/g);
  return treffer
    ? [
        {
          regel: "kaputte-zahl",
          schwere: "sperre",
          text: `Eine Rechnung ist in den sichtbaren Text durchgeschlagen: ${[...new Set(treffer)].join(", ")}`,
        },
      ]
    : [];
}

/**
 * Prozentwerte brauchen ein Ganzes.
 *
 * Ohne Ganzes normiert die Darstellung am größten Wert — dann ist der Balken für
 * 35 Prozent so lang wie die Fläche und behauptet ein Ganzes, das er nicht hat.
 * Die Regel verlangt ein FELD, sie fällt kein Urteil.
 */
function regelProzentBrauchtGanzes(post: SocialPost): Befund[] {
  const b = post.bild;
  if (!b) return [];
  const prozent = b.serien.some((s) => (s.einheit ?? "").trim() === "%");
  return prozent && b.ganzes == null
    ? [
        {
          regel: "prozent-ohne-ganzes",
          schwere: "sperre",
          text: "Das Bild zeigt Prozentwerte, nennt aber kein Ganzes — der ungefüllte Rest behauptet dann etwas, das es nicht gibt.",
        },
      ]
    : [];
}

/**
 * Eine Aussage über eine Grundmenge muss zu der Grundmenge passen.
 *
 * Die Anomalie-Geschichte nennt einen Ort und sagt dazu, er liege über der
 * Schwelle, ab der eine Quote nicht mehr aus einer Handvoll Geräte entsteht.
 * Steht dort ein kleinerer Ort, sagt der Satz das Gegenteil der Zahlen — und
 * niemand sieht es. Das ist der dokumentierte „16 Einwohner, Platz 1 von
 * 150"-Fehler, nur im Beitrag statt im Brief.
 *
 * Der Parameter gehört der KENNZAHL, nicht dieser Regel: Sie vergleicht zwei
 * Felder, die das System ohnehin führt.
 */
function regelGrundmenge(post: SocialPost, k: SocialKennzahlen): Befund[] {
  if (post.kategorie !== "g10") return [];
  const a = k.anomalie;
  return a.einwohner < a.mindestEinwohner
    ? [
        {
          regel: "grundmenge",
          schwere: "sperre",
          text: `Der genannte Ort hat ${a.einwohner} Einwohner und liegt damit UNTER der eigenen Mindestgröße von ${a.mindestEinwohner}.`,
        },
      ]
    : [];
}

/**
 * Ein Richtungswort muss zu der Zahl passen, die es beschreibt.
 *
 * Das Modul wirbt damit, dass die Richtung gerechnet wird. An drei Stellen wird
 * sie es nicht: Dreht man die Zahlen um, sagt der Beitrag weiterhin „zwei von
 * drei Gemeinden", „nur gut ein Viertel", „nur halb so viele". Beim
 * Aufteilungs-Beitrag widersprechen sich Text und Bild dann direkt.
 *
 * GESCHLOSSENES WÖRTERBUCH, kein Sprachmodell: Jeder Eintrag nennt das Band, in
 * dem er wahr ist. Trifft ein Wort zu und liegt KEINE Zahl des Beitrags in
 * seinem Band, ist das ein Widerspruch im System — nicht ein Urteil über Stil.
 * Das Wörterbuch darf wachsen, ohne dass die Regel weicher wird.
 */
const RICHTUNGSWOERTER: { wort: RegExp; von: number; bis: number; was: string }[] = [
  // Die Artikel gehören ins Muster, nicht der Nominativ allein: „in DEN meisten
  // Gemeinden" ist der Normalfall im Deutschen, und die erste Fassung mit
  // `\bdie meisten\b` hat ihn nicht gefunden — eine Regel, die am häufigsten
  // vorkommenden Beugung vorbeiläuft, prüft fast nichts.
  { wort: /\b(die|den|der) meisten\b/i, von: 50, bis: 100, was: "über die Hälfte" },
  { wort: /\bzwei von drei\b/i, von: 60, bis: 73, was: "rund zwei Drittel" },
  { wort: /\bjede[rsnm]? zweite[rsn]?\b/i, von: 45, bis: 55, was: "rund die Hälfte" },
  { wort: /\bgut ein Viertel\b/i, von: 25, bis: 32, was: "gut ein Viertel" },
  { wort: /\bknapp ein Viertel\b/i, von: 20, bis: 25, was: "knapp ein Viertel" },
  { wort: /\bein Drittel\b/i, von: 30, bis: 37, was: "rund ein Drittel" },
  { wort: /\bzwei Drittel\b/i, von: 63, bis: 70, was: "rund zwei Drittel" },
];

function regelRichtungswort(post: SocialPost): Befund[] {
  const b = post.bild;
  if (!b) return [];
  // NUR bei ANTEILEN. Ein Anteilswort kann nur einem Anteil widersprechen —
  // gegen eine Stückzahl gehalten ist der Bandvergleich sinnlos. Gemessen: Ohne
  // diese Bedingung meldete die Regel bei einem Beitrag, dessen Serie 6.848
  // Gemeinden zählt, weil 6.848 nicht zwischen 50 und 100 liegt. Das ist kein
  // Widerspruch, sondern ein Kategorienfehler in der Regel selbst.
  const istAnteil = b.ganzes != null || b.serien.some((s) => (s.einheit ?? "").trim() === "%");
  if (!istAnteil) return [];
  const werte = b.serien.map((s) => s.wert);
  if (!werte.length) return [];

  // NUR die Bildaussage und die erste Textzeile, NICHT der ganze Fließtext.
  //
  // An den echten Beiträgen gemessen: Über den ganzen Text gelesen hatte die
  // Regel 2 von 2 Treffern falsch — „die meisten Leute hätten ohnehin ein
  // eigenes Dach" ist kein Anteil, den das Bild zeigt, sondern eine Beobachtung
  // über Menschen. Ein Richtungswort irgendwo in der Prosa beschreibt nicht
  // zwangsläufig die Serie daneben.
  //
  // Die Bildaussage tut es immer, und die erste Zeile ist die Behauptung, die
  // der Feed vor „mehr anzeigen" zeigt. Genau dort saß der dokumentierte Fall:
  // Titel „Zwei von drei Gemeinden", Bild „In den meisten Gemeinden" — beide
  // beschreiben dieselbe Serie, und beim Drehen der Zahlen drehte keiner mit.
  const gepruefterOrt = [b.aussage, post.text.split("\n")[0] ?? ""].join(" \n ");

  const befunde: Befund[] = [];
  for (const r of RICHTUNGSWOERTER) {
    if (!r.wort.test(gepruefterOrt)) continue;
    if (!werte.some((w) => w >= r.von && w <= r.bis)) {
      befunde.push({
        regel: "richtungswort",
        schwere: "sperre",
        text: `Aussage und Zahl widersprechen sich: „${r.was}", aber die Werte sind ${werte.join(", ")}.`,
      });
    }
  }
  return befunde;
}

/* ────────────────────────────────────────────────────────────────────────────
   Hinweise — Urteile über die Welt, gemessen mit Fehlalarm
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Sprachregel: „in [Ort] stehen …", nie „[Ort] hat geschafft/versäumt".
 *
 * HINWEIS, nicht Sperre — gemessen 50 Prozent Fehlalarm. „Hamburg hat seine
 * Solarleistung vervierfacht" ist der echte Fall, „Brandenburg hat 70 Prozent
 * auf Freiflächen stehen" ist rein beschreibend und wäre falsch gesperrt.
 * Beides ist „[Ort] hat …"; der Unterschied liegt im Vollverb am Satzende, und
 * den bekommt eine Wortliste nicht sauber.
 */
function hinweisSprachregel(post: SocialPost, k: SocialKennzahlen): Befund[] {
  // Nur bei einem ECHTEN Ortsnamen. Über jedes großgeschriebene Wort gelesen
  // meldete die Regel an den 14 Beiträgen achtmal, davon sechsmal Unsinn
  // („Einwohner hat", „Balkonspeicher hat gar keine Dachanlage"). Ein Hinweis,
  // der zu zwei Dritteln danebenliegt, wird weggelesen — und dann auch dort, wo
  // er recht hat.
  const orte = [...k.laender.map((l) => l.name), k.anomalie.ort].filter(Boolean);
  const befunde: Befund[] = [];
  for (const ort of orte) {
    const treffer = post.text.match(new RegExp(`\\b${ort} hat\\b[^.]*`, "g"));
    for (const t of treffer ?? []) {
      befunde.push({
        regel: "sprachregel",
        schwere: "hinweis",
        text: `Schreibt einem Ort eine Leistung zu — bitte lesen: „${t.trim().slice(0, 90)}"`,
      });
    }
  }
  return befunde;
}

/* ────────────────────────────────────────────────────────────────────────────
   Zusammenführung
   ──────────────────────────────────────────────────────────────────────────── */

export const MECHANIK_REGELN: Regel[] = [
  { schluessel: "kein-link", name: "Kein Link im Text", schwere: "sperre", prueft: "Der Beitragstext enthält keine Adresse." },
  { schluessel: "quelle-lizenz", name: "Lizenz im Bild", schwere: "sperre", prueft: "Die Quellenangabe im Bild nennt eine Lizenz aus dem Quellenregister." },
  { schluessel: "einheit-im-bild", name: "Einheit sichtbar", schwere: "hinweis", prueft: "Steht die Einheit nicht an der Zahl, steht sie sonstwo im Bild." },
  { schluessel: "jahr-trennzeichen", name: "Jahreszahl", schwere: "sperre", prueft: "Eine Jahreszahl trägt keinen Tausenderpunkt." },
  { schluessel: "kaputte-zahl", name: "Keine kaputte Rechnung", schwere: "sperre", prueft: "Kein Rechenrest im sichtbaren Text." },
  { schluessel: "prozent-ohne-ganzes", name: "Prozent braucht ein Ganzes", schwere: "sperre", prueft: "Prozentwerte im Bild nennen ihr Ganzes." },
  { schluessel: "grundmenge", name: "Grundmenge", schwere: "sperre", prueft: "Eine Aussage über die Grundmenge passt zur eigenen Mindestgröße." },
  { schluessel: "richtungswort", name: "Richtungswort", schwere: "sperre", prueft: "Ein Richtungswort passt zu der Zahl, die es beschreibt." },
  { schluessel: "sprachregel", name: "Sprachregel", schwere: "hinweis", prueft: "Kein Satz schreibt einer Verwaltung eine Leistung zu." },
];

/**
 * Alle mechanischen Regeln über eine Fassung.
 *
 * Rein: keine Datenbank, keine Uhr. Die Regeln, die die Anschreiben-Liste oder
 * den Releaseplan brauchen, sitzen in der Server-Schicht darüber — hier bleibt,
 * was sich allein aus dem Beitrag und seinen Kennzahlen entscheiden lässt.
 */
export function pruefeMechanisch(post: SocialPost, k: SocialKennzahlen): Befund[] {
  return [
    ...regelKeinLink(post),
    ...regelQuelleLizenz(post),
    ...regelEinheitImBild(post),
    ...regelJahrOhneTrennzeichen(post),
    ...regelKaputteZahl(post),
    ...regelProzentBrauchtGanzes(post),
    ...regelGrundmenge(post, k),
    ...regelRichtungswort(post),
    ...hinweisSprachregel(post, k),
  ];
}

/** Nur das, was den Versand verhindert. */
export function sperren(befunde: Befund[]): Befund[] {
  return befunde.filter((b) => b.schwere === "sperre");
}
