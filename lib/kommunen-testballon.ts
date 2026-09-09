// Auswahl der Versandliste („Testballon") — reine Funktionen, damit die Regeln
// testbar sind und nicht in einer API-Route verschwinden.
//
// Die Auswahl wird FESTGESCHRIEBEN, nicht bei jedem Aufruf neu gefiltert: Der
// Aufhänger einer Gemeinde ändert sich mit jedem Monatslauf der Anlagendaten.
// Ein reiner Filter hätte in Charge 2 andere Gemeinden als in Charge 1, und die
// Staffelung wäre wertlos — genau ihr Zweck ist, dass Charge 2 dieselbe Sorte
// Gemeinde trifft wie die 15 aus Charge 1.

export type Kandidat = {
  regionId: string;
  name: string;
  population: number;
  /** Verwaltungs-Verbund: im Impressum belegte fremde Domain, sonst der eigene
   *  Website-Host. Nie zwei aus einem Verbund in derselben Charge. */
  verbundKey: string | null;
  /** Stärke des Aufhängers: „sieger" ist die Vorgabe für den Testballon. */
  hookKind: string;
  /** Rang innerhalb der Aufhänger-Art (kleiner = stärker), z. B. Platz 1 von N. */
  hookRang: number;
  /** Größe der Vergleichsgruppe: „Platz 1 von 34" wiegt schwerer als „von 5". */
  hookTotal: number;
  /** Erreichbar? Ohne Kontaktweg ist die Gemeinde nicht anschreibbar. */
  hatKanal: boolean;
};

export type Auswahl = {
  gewaehlt: { regionId: string; charge: number }[];
  /** Was NICHT hineinkam und warum — stilles Abschneiden liest sich wie
   *  „alle berücksichtigt", obwohl es das nicht war. */
  bericht: {
    poolGesamt: number;
    ohneKanal: number;
    verbundGeschwister: number;
    kleinGewaehlt: number;
    grossGewaehlt: number;
    kleinFehlend: number;
    grossFehlend: number;
  };
};

export type AuswahlRegeln = {
  /** Zielmenge insgesamt. */
  ziel: number;
  /**
   * Umfang EINER Charge — der Schub eines Tages.
   *
   * Vorher hieß das Feld `charge1` und teilte die Auswahl in „die ersten 50"
   * und „der Rest". Das passte zum Testballon, aber nicht zum Versand: Der
   * läuft gedrosselt mit 15–25 Mails am Tag, und eine Charge, die größer ist
   * als ein Tagespensum, sagt nichts mehr darüber aus, was an einem Tag
   * hinausging. Jetzt ist die Charge das Tagespensum, und die Nummer steht an
   * der Gemeinde: Nach dem Versand ist ohne Zeitstempel-Arithmetik ablesbar,
   * mit welchem Schub sie angeschrieben wurde.
   */
  chargeGroesse: number;
  /** Anteil Gemeinden unter der Einwohnergrenze (z. B. 2/3). */
  kleinAnteil: number;
  /** Einwohnergrenze zwischen „klein" und „groß". */
  grenze: number;
};

export const TESTBALLON_REGELN: AuswahlRegeln = {
  ziel: 100,
  chargeGroesse: 20,
  kleinAnteil: 2 / 3,
  grenze: 10_000,
};

/**
 * Ein Versand-Schub: welches Gebiet, welcher Kanal, welche Kampagnen-Kennung.
 *
 * WARUM ALS DATENSATZ UND NICHT ALS AUFRUF-PARAMETER: Die Auswahl wird in der
 * Datenbank festgeschrieben. Wer sie mit anderen Parametern ein zweites Mal
 * zieht, bekommt eine andere Liste unter demselben Namen — und die Auswertung
 * vergleicht danach zwei Dinge, die nur gleich heißen. Der Schub steht deshalb
 * hier, mit Begründung, und die Route nimmt nur noch seinen Schlüssel.
 */
export type Schub = {
  /** Kennung in `kommunen_kontakt.kampagne`. */
  kampagne: string;
  /** Zweistellige Länderschlüssel. */
  bl: string[];
  /**
   * Welcher Kontaktweg zählt als erreichbar.
   *
   * „rollen-postfach": nur Gemeinden mit einem Funktions-Postfach
   * (info@/rathaus@). Das ist der Kanal, der später vollautomatisch skaliert —
   * ein Test über Kontaktformulare würde etwas prüfen, das wir nicht ausbauen
   * wollen, und die Formulare sind zudem der datenschutzfreundlichere, aber
   * nicht automatisierbare Weg.
   */
  kanal: "rollen-postfach" | "beliebig";
  regeln: AuswahlRegeln;
  /**
   * Ab wann dieser Schub versendet werden soll (ISO-Tag).
   *
   * AM SCHUB, NICHT IM TEST. Die Ferienprüfung stand mit einem festen Stichtag
   * im Testfile — dem Tag, an dem der DAMALIGE Schub festgelegt wurde. Beim
   * nächsten Schub prüfte sie ihn gegen ein fremdes Datum und wurde rot, obwohl
   * am neuen Schub nichts falsch war: Mecklenburg-Vorpommern hatte am
   * 19.08.2026 noch Ferien, im September nicht mehr.
   *
   * Ein Test mit „heute" wäre die andere Falle — er würde irgendwann rot, ohne
   * dass sich etwas geändert hat. Das Datum gehört deshalb an den Schub: Es ist
   * seine Aussage, nicht die des Tests.
   *
   * Für die abgeschlossenen Schübe ist es der GEMESSENE erste Versandtag aus
   * dem Kontaktregister, kein aus dem Gedächtnis geschriebenes Datum: Beim
   * ersten Versuch stand für den August-Schub der 08.08. da, tatsächlich lief
   * er am 20.08. — und der Test wurde zu Recht rot, weil Hessen am 08.08. noch
   * Ferien hatte.
   */
  abIso: string;
  /** Warum GERADE dieses Gebiet, gerade jetzt. */
  grund: string;
};

/**
 * Der Schub, der gerade dran ist.
 *
 * ER WIRD GEPFLEGT UND VERALTET TROTZDEM. Am 06.09.2026 zeigte er auf
 * „mail-he-rp-sl", dessen 79 Gemeinden längst alle angeschrieben waren; vier
 * der fünf Schübe waren durch. Wer sich darauf verlässt, arbeitet an Orten, an
 * denen sich nichts mehr ändern lässt — die Templates-Ansicht leitet deshalb
 * selbst ab, welcher Schub offene Gemeinden hat, statt dieser Angabe zu folgen.
 * Sie bleibt als Voreinstellung für den Zug-Lauf, nicht als Wahrheit.
 */
export const AKTUELLER_SCHUB = "mail-sept-26";

/**
 * Die alte Testballon-Auswahl aus Baden-Württemberg und Bayern.
 *
 * Sie wird NICHT gelöscht: Beide Länder haben bis zum 12.09. bzw. 14.09.2026
 * Sommerferien, die Liste ist also nicht falsch, sondern zu früh. Sie wird ab
 * Mitte September die zweite Welle — deshalb nur umbenannt, damit „welcher
 * Schub war das?" beantwortbar bleibt.
 */
export const GEPARKTE_KAMPAGNE_BWBY = "testballon-bwby-geparkt";

export const SCHUEBE: Record<string, Schub> = {
  // ABGESCHLOSSEN (alle 79 Gemeinden angeschrieben, gemessen 06.09.2026). Der
  // Eintrag bleibt: Die Auswertung braucht ihn, und „welcher Schub war das?"
  // muss beantwortbar bleiben. Er stand bis dahin als `AKTUELLER_SCHUB` da —
  // die Markierung war einen Schub zu alt.
  "mail-he-rp-sl": {
    kampagne: "mail-he-rp-sl",
    bl: ["06", "07", "10"], // Hessen, Rheinland-Pfalz, Saarland
    kanal: "rollen-postfach",
    regeln: TESTBALLON_REGELN,
    abIso: "2026-08-20",
    grund:
      "Sommerferien dort am 07.08.2026 zu Ende (KMK-Kalender), nächste Ferien erst ab 05.10.2026 — " +
      "das breiteste Versandfenster aller Länder im August/September.",
  },
  [GEPARKTE_KAMPAGNE_BWBY]: {
    kampagne: GEPARKTE_KAMPAGNE_BWBY,
    bl: ["08", "09"], // Baden-Württemberg, Bayern
    // Diese Auswahl ist im Juli 2026 über BEIDE Kanäle gezogen worden. Sie
    // wird nicht neu gezogen — die Gemeinden tragen die Kampagne bereits, und
    // ein zweiter Zug würde sie gerade deshalb überspringen. Wer sie versendet,
    // sieht im Paket, welche kein Rollen-Postfach haben; die bleiben liegen.
    kanal: "beliebig",
    regeln: TESTBALLON_REGELN,
    // Bayerns Ferien enden am 14.09., und der erste Tag danach ist gesperrt
    // (Betreiber, 01.09.2026: volles Postfach). Der 16.09. ist der erste
    // Versandtag — der Test hat das gefunden, der Kommentar unten war um zwei
    // Tage zu optimistisch.
    abIso: "2026-09-16",
    grund:
      "Geparkt: In beiden Ländern laufen die Sommerferien bis 12.09. bzw. 14.09.2026. " +
      "Ab Mitte September die zweite Welle.",
  },
  /**
   * Der Schub für das Fenster bis zu den Herbstferien (Betreiber, 06.09.2026:
   * „ich würde was nehmen wo schon länger keine Ferien mehr sind").
   *
   * FÜNF LÄNDER, WEIL EINES NICHT REICHT — und das ist gemessen, nicht
   * angenommen. Der erste Vorschlag war Rheinland-Pfalz allein: Dort waren 178
   * erreichbare Gemeinden keiner Kampagne zugeordnet, mehr als in jedem anderen
   * Land außer Bayern. Der Trockenlauf zog daraus **siebzehn**.
   *
   * Der Grund steht in CLAUDE.md und wurde hier ein zweites Mal bezahlt: Der
   * Engpass ist nicht die Adresse, sondern der AUFHÄNGER. Die Auswahl nimmt nur
   * Gemeinden, die in irgendetwas auf Platz 1 stehen; von den 128 mit Aufhänger
   * hatten 111 kein Funktions-Postfach. Wer nach freien Adressen plant, plant
   * mit einer Zahl, die zehnmal zu groß ist.
   *
   * DIE FÜNF sind nach FERIENABSTAND gewählt, nicht nach Geografie: In allen
   * ist der Sommer seit mindestens 15 Tagen vorbei, in Rheinland-Pfalz seit 30
   * (der längste Abstand aller Länder). Die nächsten Ferien beginnen am 05.10.
   * in Rheinland-Pfalz und am 12./15.10. in den übrigen — die rheinland-
   * pfälzischen Gemeinden gehen also in den ersten Chargen hinaus, lange davor.
   * Baden-Württemberg und Bayern bleiben draußen, dort laufen die Sommerferien
   * noch.
   *
   * Ertrag im Trockenlauf: 74 Gemeinden (63 kleine, 11 große) aus einem Pool
   * von 442 mit Aufhänger. Bei zwanzig je Charge sind das knapp vier Wochen —
   * genau das Fenster.
   */
  "mail-sept-26": {
    kampagne: "mail-sept-26",
    // Rheinland-Pfalz, Niedersachsen, Thüringen, Schleswig-Holstein,
    // Mecklenburg-Vorpommern.
    bl: ["07", "03", "16", "01", "13"],
    kanal: "rollen-postfach",
    regeln: TESTBALLON_REGELN,
    // Dienstag: Der Versand läuft Di–Do, und heute (Sonntag) wäre kein
    // Versandtag. Das Datum ist der erste, an dem der Schub laufen kann.
    abIso: "2026-09-08",
    grund:
      "Ferienfreies Fenster bis Anfang Oktober: Sommerferien in allen fünf Ländern seit 15 bis " +
      "30 Tagen vorbei (KMK-Kalender), nächste ab 05.10. (RP) bzw. 12./15.10. Ein Land allein " +
      "trägt nicht — Rheinland-Pfalz ergab im Trockenlauf 17 Gemeinden, weil der Engpass der " +
      "Aufhänger ist und nicht die Adresse.",
  },
  "mail-ni-hb": {
    kampagne: "mail-ni-hb",
    bl: ["03", "04"], // Niedersachsen, Bremen
    kanal: "rollen-postfach",
    regeln: TESTBALLON_REGELN,
    abIso: "2026-08-27",
    grund: "Reserve für den zweiten Schub: Ferien seit 12.08.2026 vorbei, nächste ab 12.10.2026.",
  },
  "mail-nord-ost": {
    kampagne: "mail-nord-ost",
    // Schleswig-Holstein, Hamburg, Berlin, Brandenburg, Mecklenburg-Vorpommern,
    // Sachsen, Sachsen-Anhalt, Thüringen.
    bl: ["01", "02", "11", "12", "13", "14", "15", "16"],
    kanal: "rollen-postfach",
    regeln: TESTBALLON_REGELN,
    abIso: "2026-09-01",
    grund:
      "Acht Länder in einem Schub statt jede Woche einen neuen festzuschreiben. " +
      "Alle acht sind ab dem 27.08.2026 durchgehend ferienfrei; die nächsten Ferien " +
      "beginnen frühestens im Oktober. Der Versand prüft die Ferien ohnehin je " +
      "Gemeinde, die Bündelung spart nur das wiederholte Festschreiben.",
  },
  "mail-nrw": {
    kampagne: "mail-nrw",
    bl: ["05"], // Nordrhein-Westfalen
    kanal: "rollen-postfach",
    regeln: TESTBALLON_REGELN,
    abIso: "2026-09-03",
    grund:
      "Eigener Schub, weil die Sommerferien dort erst am 01.09.2026 enden — " +
      "einen Tag später als bei den übrigen. In einem gemeinsamen Schub hätte der " +
      "Versand die NRW-Gemeinden am ersten Tag stillschweigend übersprungen, und " +
      "übersprungene Gemeinden sind von versendeten schwer zu unterscheiden.",
  },
};

/**
 * Versandliste zusammenstellen.
 *
 * Reihenfolge der Regeln:
 *  1. Nur erreichbare Gemeinden (Kontaktformular oder Rollen-Postfach).
 *  2. Je Verwaltungs-Verbund nur EINE — die mit dem stärksten Aufhänger. Der
 *     Rest bleibt unangetastet („zurückgestellt", nicht verbrannt): Wenn sich
 *     die Verbund-Annahme als falsch erweist, kostet das eine spätere Mail,
 *     nicht eine verbrannte Gemeinde.
 *  3. Zwei Töpfe nach Einwohnerzahl, damit der Testballon nicht nur aus
 *     Großstädten besteht — der Ausbau soll für kleine Gemeinden funktionieren.
 *  4. Charge 1 (50) nimmt die STÄRKSTEN aus beiden Töpfen — die Sieger zuerst.
 */
export function waehleTestballon(kandidaten: Kandidat[], regeln = TESTBALLON_REGELN): Auswahl {
  const poolGesamt = kandidaten.length;
  const erreichbar = kandidaten.filter((k) => k.hatKanal);
  const ohneKanal = poolGesamt - erreichbar.length;

  // Stärkster zuerst: kleinerer Rang schlägt größeren; bei gleichem Rang wiegt
  // die größere Vergleichsgruppe schwerer („Platz 1 von 34" statt „von 5"), erst
  // danach entscheidet die Einwohnerzahl. Ohne die Gruppengröße sortiert die
  // Liste faktisch nur nach Einwohnern — dann stehen München und Stuttgart oben
  // und der Testballon prüft nicht, was er prüfen soll.
  const staerke = (a: Kandidat, b: Kandidat) =>
    a.hookRang - b.hookRang || b.hookTotal - a.hookTotal || b.population - a.population;

  // Je Verbund nur der stärkste Kandidat.
  const proVerbund = new Map<string, Kandidat>();
  const ohneVerbund: Kandidat[] = [];
  for (const k of erreichbar.slice().sort(staerke)) {
    if (!k.verbundKey) {
      ohneVerbund.push(k);
      continue;
    }
    if (!proVerbund.has(k.verbundKey)) proVerbund.set(k.verbundKey, k);
  }
  const entdoppelt = [...ohneVerbund, ...Array.from(proVerbund.values())].sort(staerke);
  const verbundGeschwister = erreichbar.length - entdoppelt.length;

  const zielKlein = Math.round(regeln.ziel * regeln.kleinAnteil);
  const zielGross = regeln.ziel - zielKlein;
  const klein = entdoppelt.filter((k) => k.population < regeln.grenze);
  const gross = entdoppelt.filter((k) => k.population >= regeln.grenze);

  const nimmKlein = klein.slice(0, zielKlein);
  const nimmGross = gross.slice(0, zielGross);
  // Reicht ein Topf nicht, wird aus dem anderen aufgefüllt — aber im Bericht
  // steht, dass die Mischung nicht erreicht wurde.
  const fehlt = regeln.ziel - nimmKlein.length - nimmGross.length;
  if (fehlt > 0) {
    nimmKlein.push(...klein.slice(nimmKlein.length, nimmKlein.length + fehlt));
    const rest = regeln.ziel - nimmKlein.length - nimmGross.length;
    if (rest > 0) nimmGross.push(...gross.slice(nimmGross.length, nimmGross.length + rest));
  }

  // REIHENFOLGE: die stärksten zuerst, und in JEDER Charge dieselbe Mischung
  // aus kleinen und großen Gemeinden. Würde erst der kleine Topf abgearbeitet
  // und dann der große, bestünde der erste Versandtag nur aus Dörfern — und die
  // erste Rückmeldung, an der sich alles Weitere ausrichtet, käme aus einer
  // Gruppe statt aus dem Querschnitt.
  const reihenfolge: Kandidat[] = [];
  let ik = 0;
  let ig = 0;
  while (ik < nimmKlein.length || ig < nimmGross.length) {
    // Der kleine Topf ist doppelt so groß wie der große (2/3 zu 1/3), also
    // kommt nach je zwei kleinen eine große Gemeinde. Der Bruch wird nicht
    // gerechnet, sondern gemessen: Wer im Verhältnis zurückliegt, ist dran.
    const kleinDran =
      ik < nimmKlein.length &&
      (ig >= nimmGross.length || ik / Math.max(nimmKlein.length, 1) <= ig / Math.max(nimmGross.length, 1));
    if (kleinDran) reihenfolge.push(nimmKlein[ik++]);
    else reihenfolge.push(nimmGross[ig++]);
  }
  //
  // HÖCHSTENS EINE GEMEINDE JE LANDKREIS UND TAG.
  //
  // Charge 1 enthielt vier winzige Ortsgemeinden aus dem Landkreis Birkenfeld,
  // jede mit einem eigenen „Platz 1 im Landkreis". Ihre Ortsbürgermeister
  // sitzen in derselben Verbandsgemeinde-Sitzung und lesen dieselbe
  // Kreiszeitung — vier gleichzeitige „Ihr Ort ist Nummer 1" entlarven das
  // Verfahren, und zwar bei allen vieren gleichzeitig. In Rheinland-Pfalz
  // kommt hinzu, dass die Verbandsgemeinde-Verwaltung die Geschäfte der
  // Ortsgemeinden führt: Zwei Briefe aus demselben Kreis landen mit einiger
  // Wahrscheinlichkeit auf demselben Schreibtisch.
  //
  // Die Regel verschiebt nur, sie streicht nicht: Wer heute nicht dran ist,
  // rutscht in die nächste Charge.
  const groesse = Math.max(1, regeln.chargeGroesse);
  const gewaehlt: { regionId: string; charge: number }[] = [];
  const chargen: { kreise: Set<string>; anzahl: number }[] = [];
  for (const k of reihenfolge) {
    const kreis = k.regionId.slice(0, 5);
    let ziel = chargen.findIndex((c) => c.anzahl < groesse && !c.kreise.has(kreis));
    if (ziel < 0) {
      chargen.push({ kreise: new Set(), anzahl: 0 });
      ziel = chargen.length - 1;
    }
    chargen[ziel].kreise.add(kreis);
    chargen[ziel].anzahl++;
    gewaehlt.push({ regionId: k.regionId, charge: ziel + 1 });
  }

  return {
    gewaehlt,
    bericht: {
      poolGesamt,
      ohneKanal,
      verbundGeschwister,
      kleinGewaehlt: nimmKlein.length,
      grossGewaehlt: nimmGross.length,
      kleinFehlend: Math.max(0, zielKlein - nimmKlein.length),
      grossFehlend: Math.max(0, zielGross - nimmGross.length),
    },
  };
}
