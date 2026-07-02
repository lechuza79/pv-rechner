// Fact-check FAQ content for /atomstrom-import.
//
// Texts are taken verbatim from docs/faq-atomstrom-final.md (v5). Each item has a
// jargon-free short answer (rendered bold) and a longer Erläuterung (rendered as
// body text; glossary terms are linked at render time). The groups map to the
// page's charts: `import` sits under the nuclear-share donut, `strommix` under the
// full mix widget, `zubau` under the build-out chart, `weitere` at the page end.

export interface FaqItem {
  /** Question — rendered as the accordion summary. */
  q: string;
  /** Jargon-free one-to-two-sentence answer, shown bold. */
  short: string;
  /** Erläuterung with numbers, sources, nuance. Glossary terms linked at render. */
  long: string;
}

export const importFaqs: FaqItem[] = [
  {
    q: `Bedeutet der Import, dass Deutschland "dreckigen" Strom nachkauft?`,
    short: `Nein. Der Strom, den Deutschland aus dem Ausland dazukauft, ist überwiegend sauberer Strom. Und es ist ohnehin nur ein kleiner Teil von dem, was Deutschland insgesamt braucht.`,
    long: `Deutschland kauft im Schnitt etwas mehr Strom im Ausland ein, als es dorthin verkauft. 2025 waren das rund 76 Terawattstunden eingekauft und rund 54 Terawattstunden verkauft — macht unterm Strich ein Plus von etwa 22 Terawattstunden, was rund 4,4 % des gesamten deutschen Strombedarfs entspricht (495 Terawattstunden im Jahr 2025). Der große Rest kommt aus deutscher Erzeugung. Von dem eingekauften Strom stammten 55 % aus erneuerbaren Quellen, 23 % aus Atomkraft und 13 % aus fossilen Kraftwerken (Fraunhofer ISE). Deutschland kauft vor allem deshalb zu, weil es im europäischen Strommarkt gerade günstiger ist — nicht, weil im Inland zu wenig Strom erzeugt wird.`,
  },
  {
    q: `Ist der Stromimport nicht heuchlerisch, wenn Deutschland selbst kein Atomkraft will?`,
    short: `Das ist eher eine Meinungsfrage als ein Fakt. Deutschland kauft im europäischen Strommarkt einfach dort ein, wo es gerade am günstigsten ist — so wie jedes andere Land auch.`,
    long: `Ein Teil des importierten Stroms stammt aus Atomkraft, vor allem aus Frankreich — umgerechnet auf den gesamten deutschen Strombedarf sind das rund 3,5 %. Deutschland entscheidet dabei nicht bewusst "wir wollen Atomstrom", sondern kauft im europäischen Strommarkt automatisch dort ein, wo der Strom gerade am günstigsten angeboten wird, egal aus welcher Quelle er kommt. Ob das im Widerspruch zum eigenen Atomausstieg steht, ist eine politische Bewertungsfrage, keine, die sich einfach mit richtig oder falsch beantworten lässt.`,
  },
  {
    q: `Wäre Deutschland mit eigenen Kernkraftwerken unabhängiger vom Ausland?`,
    short: `Kaum, und schon gar nicht schnell. Neue Kraftwerke zu bauen dauert so lange, dass es keine kurzfristige Lösung wäre. Und selbst Länder mit eigenen Atomkraftwerken kaufen weiterhin Strom im Ausland, wenn es dort günstiger ist.`,
    long: `Ein neues Kernkraftwerk zu planen und zu bauen dauert in der Regel zehn bis fünfzehn Jahre oder länger. Auch die 2023 abgeschalteten deutschen Kraftwerke wieder in Betrieb zu nehmen, gilt als wirtschaftlich kaum sinnvoll. Selbst Frankreich mit seinem großen Atomkraftpark kauft weiterhin Strom aus dem europäischen Ausland ein, wenn es dort günstiger ist — vollständige Unabhängigkeit vom Ausland ist im vernetzten europäischen Stromnetz für kein Land normal, egal welche Kraftwerke es betreibt.`,
  },
  {
    q: `Droht ohne Speicher und Backup ein Blackout bei Dunkelflauten?`,
    short: `Bisher nicht. Das deutsche Stromnetz gehört zu den zuverlässigsten der Welt — auch mit viel Wind- und Solarstrom.`,
    long: `Eine "Dunkelflaute" ist ein Zeitraum, in dem gleichzeitig wenig Wind weht und wenig Sonne scheint, sodass Wind- und Solaranlagen kaum Strom liefern. Ein "Blackout" wäre ein großflächiger, unkontrollierter Ausfall der Stromversorgung im ganzen Netz — etwas anderes als eine kurze, örtliche Störung, wie sie zum Beispiel durch Bauarbeiten entstehen kann. Solche Dunkelflauten gab es 2025 je nach Definition an 19 bis 22 Tagen, also an etwa einem von 17 Tagen im Jahr. Trotzdem war die Stromversorgung in Deutschland 2024 im Schnitt nur 11,7 Minuten im ganzen Jahr pro Haushalt unterbrochen (2023: 12,8 Minuten) — einer der niedrigsten Werte weltweit, deutlich besser als zum Beispiel in den USA (70 bis 80 Minuten). Schwieriger wird es bei mehrtägigen Dunkelflauten: Dauert eine solche Phase eine Woche oder länger an, reichen die heutigen Batteriespeicher nicht aus, die eher für Stunden bis ein bis zwei Tage gebaut sind. Deshalb wird diskutiert, ob man dafür zusätzlich Gaskraftwerke braucht oder ein neues Bezahlmodell, bei dem Kraftwerke schon dafür Geld bekommen, dass sie im Ernstfall bereitstehen.`,
  },
];

export const strommixFaqs: FaqItem[] = [
  {
    q: `Sind Erneuerbare nicht "grundlastfähig"?`,
    short: `Das stimmt zwar, ist aber heute nicht mehr das entscheidende Problem — das Stromsystem wurde in den letzten Jahren genau darauf ausgelegt, damit umzugehen.`,
    long: `Früher war wichtig, dass Kraftwerke rund um die Uhr gleichmäßig Strom liefern können ("grundlastfähig") — das konnten vor allem Kohle- und Atomkraftwerke. Wind- und Solaranlagen können das nicht, weil ihre Erzeugung vom Wetter abhängt. Im heutigen Stromsystem kommt es aber vor allem darauf an, wie viel zusätzlicher Strom gebraucht wird, wenn Wind und Sonne nicht reichen — dafür gibt es mittlerweile Speicher, Stromimporte und flexible Kraftwerke, die genau in diese Lücke einspringen. Seit dem Atomausstieg im April 2023 und dem Abschalten mehrerer Kohlekraftwerke im Juli 2023 blieb die Stromversorgung stabil.`,
  },
  {
    q: `Kommt der Netzausbau nicht hinterher?`,
    short: `Teilweise ja — aber das liegt an Planung und Genehmigungsverfahren, nicht daran, dass Erneuerbare grundsätzlich nicht funktionieren.`,
    long: `Der Ausbau der Stromleitungen, vor allem von Nord- nach Süddeutschland, kommt tatsächlich langsamer voran als geplant. Weil das Netz an manchen Stellen noch nicht mitkommt, müssen Netzbetreiber immer wieder kurzfristig einzelne Kraftwerke hoch- oder runterregeln, um Engpässe auszugleichen — das hat zwischen November 2023 und Oktober 2024 rund 1,57 Milliarden Euro gekostet. Das ist aber ein Problem von Planung und Genehmigungsverfahren, kein technisches Limit der erneuerbaren Energien selbst.`,
  },
  {
    q: `Ist Atomkraft nicht CO2-ärmer als der deutsche Strommix?`,
    short: `Im Moment schon — aber das ist der falsche Vergleich. Verglichen mit Wind- und Solarstrom sind sich alle drei sehr ähnlich klimafreundlich.`,
    long: `Rechnet man den gesamten Lebensweg eines Kraftwerks mit ein — vom Bau über den Betrieb bis zur Entsorgung —, verursacht Atomkraft im Schnitt rund 12 Gramm CO2 pro Kilowattstunde Strom, mit einer großen Bandbreite je nach Studie (zwischen 4 und 110 Gramm, unter anderem abhängig davon, wie das Uran abgebaut wurde). Der deutsche Strommix insgesamt liegt aktuell bei rund 300 bis 400 Gramm. Der eigentlich interessante Vergleich ist aber nicht Atomkraft gegen den gesamten Mix, sondern Atomkraft gegen Wind- und Solarstrom: Windstrom liegt bei rund 3 bis 7 Gramm, Solarstrom bei rund 19 bis 59 Gramm — alle drei also in einer ähnlichen, sehr niedrigen Größenordnung. Der 12-Gramm-Wert für Atomkraft rechnet außerdem mit ein, wie viel CO2 die Endlagerung des Atommülls verursachen würde — obwohl es weltweit noch gar kein fertiges Endlager gibt, auf dessen echten Daten man sich stützen könnte.`,
  },
];

export const zubauFaqs: FaqItem[] = [
  {
    q: `Ist Atomkraft nicht die nötige Brückentechnologie fürs Klimaziel?`,
    short: `Dafür bräuchte man vor allem eins: Zeit — und genau die haben wir für die nächsten Klimaziele nicht.`,
    long: `Ein neues Kernkraftwerk zu bauen dauert zehn bis fünfzehn Jahre oder länger, und es gehört zu den teuersten Wegen überhaupt, um CO2 einzusparen — teurer als praktisch jede andere Option außer klassischen Kohlekraftwerken. Um die Klimaziele bis 2030 oder 2035 zu erreichen, wirken Energiesparmaßnahmen und der Ausbau von Wind- und Solarenergie deutlich schneller.`,
  },
  {
    q: `Lösen kleine modulare Reaktoren (SMR) das Bauzeit- und Kostenproblem der Atomkraft?`,
    short: `Bisher nicht. Das Versprechen von schnellen, günstigen Mini-Kraftwerken hat sich in der Praxis noch nirgendwo bestätigt.`,
    long: `Weltweit sind laut der Internationalen Atomenergie-Behörde bisher nur zwei sogenannte kleine modulare Reaktoren (kompakte, in Fabriken vorgefertigte Mini-Atomkraftwerke) in Betrieb, in China und Russland — beides Einzelstücke, keine Serienproduktion. Das bekannteste westliche Projekt dieser Art, in den USA von der Firma NuScale geplant, wurde 2023 wieder eingestellt, nachdem sich die geplanten Baukosten fast verdoppelt hatten. Fachleute schätzen, dass sich die versprochenen niedrigeren Kosten erst einstellen würden, wenn tausende dieser kleinen Reaktoren gebaut würden — davon ist die Branche weit entfernt. Die EU plant, die ersten solcher Anlagen frühestens Anfang der 2030er Jahre ans Netz zu bringen; belastbare Erfahrungswerte aus dem laufenden Betrieb gibt es also noch nicht.`,
  },
];

export const weitereFaqs: FaqItem[] = [
  {
    q: `Hat der Atomausstieg die Strompreise erhöht?`,
    short: `Er hat einen kleinen Anteil daran — aber der Hauptgrund für die hohen Strompreise war die Gaskrise, nicht der Ausstieg.`,
    long: `Deutschland hat mit rund 38 Cent pro Kilowattstunde (2025) einen der höchsten Strompreise Europas. Der stärkste Preistreiber seit 2022 war die Gaskrise: An der Strombörse bestimmt meist das teuerste noch gebrauchte Kraftwerk den Preis für den gesamten Markt, und das ist oft ein Gaskraftwerk. Atomkraftwerke produzieren im laufenden Betrieb sehr günstig, ihr Wegfall macht Strom also etwas teurer — aber das ist nur einer von mehreren Gründen, nicht der Hauptgrund.`,
  },
  {
    q: `Sind Erneuerbare nur mit EEG-Subvention wettbewerbsfähig?`,
    short: `Früher schon, heute kaum noch — neue Wind- und Solaranlagen gehören mittlerweile zu den günstigsten Kraftwerken überhaupt.`,
    long: `Die frühere Förderabgabe für Ökostrom (EEG-Umlage) wurde 2022 abgeschafft; die Förderung von Wind- und Solarenergie läuft seither aus dem Bundeshaushalt statt über den Strompreis — die Subvention besteht also weiter, nur anders finanziert. Auch Atomkraft kommt nicht ohne staatliche Unterstützung aus, wie das Beispiel Frankreich zeigt.`,
  },
  {
    q: `Hat Frankreich trotz Atomkraft günstigeren Strom?`,
    short: `Ja, aktuell deutlich — aber nicht einfach nur, weil dort Atomkraftwerke stehen. Der französische Staat stützt die Preise zusätzlich massiv mit Steuergeld.`,
    long: `Deutsche Haushalte zahlten 2025 im Schnitt rund 38,35 Cent pro Kilowattstunde, französische rund 26,64 Cent — etwa ein Drittel weniger. Der hohe Anteil an Atomkraft in Frankreich (60 bis 70 %) sorgt für stabile Erzeugungskosten. Gleichzeitig stützt der französische Staat den Energiekonzern EDF aber auch massiv finanziell: Ab 2026 garantiert eine neue Regelung EDF einen Durchschnittspreis von rund 7 Cent pro Kilowattstunde für seinen Atomstrom, vorher waren es nur 4,2 Cent — der Preisunterschied zu Deutschland dürfte also kleiner werden. Der Anteil von Steuern und Abgaben am Strompreis ist in beiden Ländern übrigens ähnlich hoch, jeweils etwa ein Drittel — der Preisunterschied kommt also nicht vom Steuersystem, sondern vor allem von den Erzeugungskosten und davon, wie viel Deutschland gerade in den Ausbau seiner Stromnetze investiert.`,
  },
  {
    q: `Ist das AKW-Risiko medial überzeichnet?`,
    short: `Unfälle sind selten, aber wenn etwas passiert, kann der Schaden riesig sein — deshalb lässt sich das Risiko schwer mit anderen Energiequellen vergleichen.`,
    long: `Schwere Unfälle in Atomkraftwerken kommen statistisch selten vor. Wenn aber doch etwas passiert, wie in Tschernobyl oder Fukushima, ist das Ausmaß des Schadens — betroffene Fläche, Dauer, Kosten — außergewöhnlich groß im Vergleich zu Unfällen bei anderen Energiequellen. Ein realistisches Bild des Risikos braucht deshalb beides: wie wahrscheinlich ein Unfall ist und wie groß der Schaden im Ernstfall wäre — nicht nur die Häufigkeit allein.`,
  },
  {
    q: `Ist das Endlager-Problem technisch lösbar?`,
    short: `In der Theorie ja — in der Praxis hat es weltweit noch niemand geschafft.`,
    long: `Es gibt derzeit weltweit kein einziges Endlager für hochradioaktiven Atommüll, das tatsächlich in Betrieb ist. Für die insgesamt rund 245.000 Tonnen abgebrannter Brennelemente, die weltweit bisher angefallen sind, existiert also noch kein fertiges, umgesetztes Konzept zur dauerhaften Lagerung.`,
  },
  {
    q: `Ist die PV-Produktion selbst nicht sauber?`,
    short: `Die Herstellung kostet Energie, aber unterm Strich ist Solarstrom trotzdem klar klimafreundlicher als Kohle oder Gas.`,
    long: `Rechnet man den gesamten Lebensweg einer Solaranlage mit ein — von der Herstellung der Module bis zur Entsorgung —, verursacht Solarstrom rund 19 bis 59 Gramm CO2 pro Kilowattstunde. Wie hoch der Wert am Ende ausfällt, hängt vor allem davon ab, mit welchem Strommix die Module hergestellt wurden, oft in China. In der EU gibt es inzwischen eine gesetzliche Pflicht, ausgediente Module zurückzunehmen und zu recyceln.`,
  },
  {
    q: `Sind Vogelschlag, Landschaftsverbrauch und Infraschall nicht ernste Probleme bei Windkraft?`,
    short: `Windräder schaden manchen Vögeln, aber deutlich weniger als Glasscheiben, Katzen oder Autos. Gesundheitsschäden durch Infraschall konnten Wissenschaftler bislang nicht nachweisen.`,
    long: `Nach Schätzungen des Naturschutzbunds NABU sterben in Deutschland jährlich rund 100.000 Vögel an Windkraftanlagen. Zum Vergleich: An Glasscheiben sterben bis zu 115 Millionen Vögel im Jahr, durch frei laufende Hauskatzen 20 bis 100 Millionen, im Straßen- und Bahnverkehr rund 70 Millionen. Zum Thema Infraschall (extrem tiefe, für Menschen kaum hörbare Töne, die auch von Windrädern erzeugt werden) kam eine 2024 im Auftrag des Umweltbundesamts erstellte Auswertung aller bisherigen Studien zu dem Ergebnis, dass es keine verlässlichen Belege für gesundheitliche Schäden dadurch gibt. Der Flächenverbrauch von Windparks in der Landschaft bleibt dagegen ein echter Zielkonflikt, den man gegeneinander abwägen muss, statt ihn einfach wegzuwischen.`,
  },
  {
    q: `War der Atomausstieg ideologisch statt faktenbasiert?`,
    short: `Das ist eine Meinungsfrage, keine, die sich eindeutig mit Fakten beantworten lässt.`,
    long: `Der Atomausstieg war eine politische Entscheidung, bei der Sicherheitsbedenken, Kosten und gesellschaftliche Stimmung eine Rolle spielten, unter anderem nach der Reaktorkatastrophe in Fukushima 2011. Einzelne Argumente dafür lassen sich sachlich prüfen, etwa ob die Sicherheitsbedenken berechtigt waren oder wie teuer die Entscheidung war. Ob man die gesamte Entscheidung als "ideologisch" oder "faktenbasiert" bezeichnet, ist aber am Ende eine Wertung, keine Tatsache.`,
  },
];
