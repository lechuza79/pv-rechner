# Projektanleitung: fachbetriebe

Verbindliches Fachkapitel zu [CLAUDE.md](../../CLAUDE.md). Nur die für den Auftrag relevanten Abschnitte laden. Codepfade in Backticks beziehen sich auf das Repository-Hauptverzeichnis; Verweise wie „oben“ und „siehe Abschnitt“ meinen die entsprechenden Fachabschnitte, die in der zentralen Anleitung verlinkt sind.

## PV-Fachbetriebe (interner Bereich)

Erhebung der Solarteure und Elektro-Fachbetriebe mit PV-Geschäft, angelegt 27.08.2026.
**Anlass ist gemessen:** Der HTW-Rechner — kostenlos, unabhängig, ohne Leadfunnel, also
unser Zwilling — hat 2.080 verweisende Domains, wir null echte; größte Gruppe darunter
sind Fachbetriebe. Ein Fachbetrieb verlinkt einen unabhängigen Rechner, weil er die eigene
Beratung stützt und selbst keinen bauen will. `scripts/fachbetriebe-refresh.ts` +
`lib/fachbetrieb-extrakt.ts`, Tabellen `fachbetriebe`, `fachbetrieb_belege`,
`fachbetrieb_treffer`, `fachbetrieb_suchlauf` (RLS an, nur service_role — die Sätze
enthalten bei Einzelunternehmern personenbezogene Daten). Quellenbewertung:
`docs/fachbetriebe-quellen.md`.

**Der Rückkanal ist GEBAUT, aber es ist nichts verschickt — Stand 09.09.2026.** Bis zum
03.09. stand hier „es gibt keinen Vermittlungsweg"; das ist überholt, und ein überholter
BLOCKER ist schlimmer als keiner. Was es gibt, steht im nächsten Abschnitt („Die
betriebseigene Rechner-Seite"). Was es NICHT gibt: einen Versandlauf an Fachbetriebe.
Kein Betrieb ist angeschrieben, keine Seite ist verlinkt, und die zwei Entscheidungen
davor gehören weiterhin dem Betreiber — ob überhaupt angeschrieben wird, und ob die
Zusage „ohne Verkaufsanrufe · keine Lead-Erfassung · kein Vertriebskontakt" angefasst
wird. **Sie stimmt mit dem Rückkanal nicht mehr**, denn dort gibt es genau darüber einen
Knopf; der PV-Rechner sagt auf einer Partnerseite deshalb schon heute etwas anderes als
sonst („Wir geben nichts weiter, außer du bittest uns darum"). Offen bleibt außerdem die
Informationspflicht nach Art. 14 DSGVO für die ERHEBUNG der Betriebsadressen — die
Datenschutzerklärung nennt sie bis heute nicht.

### Die betriebseigene Rechner-Seite und der Rückkanal (fertig, nicht ausgerollt)

Ein Fachbetrieb bekommt eine eigene Adresse, unter der unser Rechner mit SEINEM Kopf
öffnet; sein Websitebesucher rechnet dort und kann ihm das Ergebnis schicken. Gebaut
zwischen dem 01. und 09.09.2026, im Browser geprüft, **noch von niemandem abgenommen und
an niemanden verschickt.**

- **Die Kennung ist aus der Domain abgeleitet, nicht geraten und nicht gespeichert.** Eine
  Datenbankspalte wäre eine zweite Wahrheit; eine ratbare Adresse verriete, welche
  Betriebe wir erfasst haben. Ohne hinterlegte Mailadresse entsteht **keine** Seite — ein
  Anfrage-Knopf ohne Empfänger liefe ins Leere. Der Schlüssel dafür ist aus `CRON_SECRET`
  **abgeleitet** (`lib/fachbetrieb-kennung.ts`, seit 28.09.2026), nicht der Cron-Schlüssel
  selbst — und **ein neuer `CRON_SECRET` macht jede verschickte Partner-Adresse tot.**
- **Das Logo des Betriebs kommt über UNSEREN Server** (`/api/fachbetrieb-logo/<kennung>`,
  Regeln in `lib/fremdbild.ts`): nur die Kennung rein, Adresse aus der Datenbank, nur
  öffentliche Ziele (auch nach jeder Weiterleitung, Verbindung auf die geprüfte Adresse
  festgelegt), 512 KB, nur Rasterformate an den ersten Bytes, **kein SVG**. Direkt
  eingebunden ginge die IP jedes Besuchers an den Betrieb.
- **Die Seite ist für Suchmaschinen gesperrt.** Eine indexierte Seite mit fremdem
  Firmennamen auf UNSERER Domain träte gegen seine eigene Website an — das ist ein Grund,
  nicht mitzumachen, und im Anschreiben umgekehrt ein Verkaufsargument.
- **Der EMPFEHLUNGSWEG ist dort der Standard**, nicht der direkte Rechner (Betreiber,
  03.09.2026: „in der regel weiß man ja nicht was man braucht"). Welcher Weg erscheint,
  ergibt sich aus dem Zustand in der Adresse, nicht aus einem gespeicherten Schalter —
  ein geteilter Link zeigt beim Empfänger dasselbe wie beim Absender. Der letzte Schritt
  springt dort **direkt ins Ergebnis**; die Zwischenansicht der Empfehlung wird
  übersprungen, weil das Ergebnis dieselbe Anlage samt Begründung trägt.
- **Drei Stellen des Empfehlungswegs mussten dafür Parameter werden**, jede einzeln
  gemessen: wohin er seinen Zwischenstand schreibt, wohin er am Ende übergibt, und wohin
  „Zurück" im ersten Schritt führt. Ohne sie setzte er den Besucher mitten im Vorgang auf
  solar-check.io ab — mit dem Ergebnis, aber ohne den Betrieb, der ihn geschickt hat.
- **Der Knopf sagt „Unverbindlich bei X anfragen", nicht „schicken"** (Hinweis von außen,
  03.09.2026): „schicken" liest sich, als ginge beim Klick schon etwas hinaus —
  tatsächlich öffnet er nur den Fragebogen. Die Zeile darunter sagt NICHT „im nächsten
  Schritt", weil die Übersicht der Angaben im dritten steht.
- **Was der Betrieb bekommt:** einen Brief mit Anrede und Unterschrift, nicht einen
  Datenauszug — ein Handwerksbetrieb bekommt täglich Post von Lead-Portalen, und die
  sieht genau so aus. Darin die Angaben getrennt (Name, Kontakt, Anschrift), bis zu zwei
  Fotos als Anhang und ein Link auf die Rechnung. **Antworten gehen direkt an den
  Interessenten**, nicht über uns.
- **Der Empfänger kommt aus der Datenbank, nie aus der Anfrage.** Nähme die Route eine
  Adresse entgegen, wäre sie ein offener Versandweg mit unserem Absender darunter —
  dieselbe Bauregel wie beim Förder-Abruf.
- **Bilder werden im Browser verkleinert** (1.600 px, Qualität 0,8). Zwei gewöhnliche
  Handyfotos ergaben kodiert rund 8 MB und scheiterten damit **immer** an der 4,5-MB-Grenze
  der Plattform — nach vollständig ausgefülltem Fragebogen, mit der Meldung „bitte später
  noch einmal versuchen", die nie zum Erfolg führen konnte.
- **Die Antwortadresse wird aus dem Freitext HERAUSGESUCHT.** Das Kontaktfeld ist
  absichtlich frei („wer nur anrufen lassen will, soll keine Mailadresse erfinden
  müssen"); „mail@x.de oder 0170…" ging vorher als Ganzes als Antwortadresse hinaus und
  ließ den kompletten Versand scheitern. Ist sie unklar, bleibt sie weg.
- **Die Anfrage-Statistik ist anonym und wird GERECHNET, nicht abgeschrieben.** Betrieb,
  Kalendertag statt Uhrzeit, zwei PLZ-Stellen statt fünf, Anlagengröße in Stufen, ob eine
  Nachricht dabei war. Kein Name, kein Kontakt, keine Anschrift — Adresse plus
  Anlagengröße wäre die Beschreibung genau eines Haushalts. **Anlagengröße und Speicher
  werden aus den Listenplätzen des Teilen-Links aufgelöst**: Vorher las sie nur die
  Sonderfelder für selbst eingetippte Zahlen, und jeder Standardfall schrieb eine Zeile
  mit zwei leeren Werten — die Auswertung, für die es das Modul gibt, wäre bei der
  Mehrheit leer gewesen, ohne dass etwas angeschlagen hätte.
- **Die Auflösung der Kennung ist eine Stunde zwischengespeichert.** Sie rechnet über alle
  rund 3.100 Betriebe und lief vorher zweimal je Seitenaufruf ohne Cache — acht
  Datenbankabfragen pro Aufruf, bei einem Schub an hunderte Betriebe genau das Lastmuster
  des Juli-Ausfalls. **Fünf Minuten wären der falsche Fix gewesen** (Cache-Deckel im
  Seitenrahmen); Aktualität kommt über den Marker.

**OFFEN, bevor irgendetwas verschickt wird:**
1. **Abnahme im Browser** durch den Betreiber — die Seite und der Rückkanal sind sichtbare
   neue Funktionalität und wurden ihm nie gezeigt.
2. **Der Testbetrieb liegt in der Produktionsdatenbank** („Solar Check Testbetrieb GmbH",
   angelegt für den Versandtest). Das Skript dazu liegt in `scripts/_testbetrieb.ts` und
   entfernt ihn mit `--weg`; es hat bewusst keinen Eintrag in der Skriptliste, damit es
   niemand versehentlich aufruft.
3. **Der Anschreiben-Entwurf ist nicht abgenommen** und argumentiert mit dem falschen
   Painpoint — siehe nächster Abschnitt.
4. **Die Datenschutzerklärung** nennt die Erhebung der Betriebsadressen nicht (Art. 14).
5. **Zwei Entscheidungen des Betreibers:** ob angeschrieben wird, und ob die Zusage
   angefasst wird.

**Bewertungen öffentlich zeigen scheitert am BEWERTUNGSRECHT, nicht an Google (geprüft
29.08.2026, zwei Legal-Judges).** Wer Verbraucherbewertungen zugänglich macht, muss sagen,
ob und wie er ihre Echtheit sicherstellt (§ 5b Abs. 3 UWG); sie ohne Überprüfung als echt
auszugeben, ist per se unlauter (Anhang Nr. 23b zu § 3 Abs. 3 UWG). Wir können nichts
überprüfen — und hier sind Mitbewerber und Verbände anspruchsberechtigt, also Stellen, die
tatsächlich abmahnen. **Der zuerst genannte Grund „ein gespeicherter Wert veraltet und ist
dann eine unwahre Tatsachenbehauptung (§ 824 BGB)" trägt NICHT** und darf nicht
wiederverwendet werden: Ein datierter Wert sagt etwas über den Stichtag, und Absatz 2 nimmt
aus, wo der Empfänger ein berechtigtes Interesse hat. Wer ihn für die Hürde hält, glaubt,
ein „Stand: 08/2026" räume sie ab — und lässt die echte stehen. **Intern zur Priorisierung
wäre der Bezug über einen Datenlieferanten vertretbar**, aber schon das Speichern ist
Vervielfältigung (§ 87b Abs. 1 UrhG) — „wird ja nicht angezeigt" ist keine
urheberrechtliche Kategorie. Herleitung, Gegenargumente und der DMA-Weg über den Betrieb
selbst: `docs/fachbetriebe-quellen.md`, Abschnitt 1b.

**Google scheidet als QUELLE aus — als Anzeige nicht (geprüft 06.10.2026, Volltexte in
`docs/quellen/fachbetriebe/`, Gegenprüfung durch einen zweiten Legal-Judge).** Für ein Konto
mit deutscher Rechnungsadresse gilt seit 08.07.2025 die **EWR-Fassung** der Maps Platform
Terms, nicht die globale; die frühere Begründung zitierte die falsche. Das Speicherverbot
steht dort unverändert (Ziff. 3.3.2(a)(iii) „copy and save business names, addresses, or
user reviews", (b) kein Zwischenspeichern außer der `place_id`) — ein Bewertungswert kommt
also nie in unsere Datenbank, auch nicht intern. **Die Verzeichnis-Klausel der globalen
Fassung (3.2.3(d)(iii)) fehlt in der EWR-Fassung**; an ihre Stelle tritt eine
**abschließende** Liste erlaubter Verwendungen der Places-Daten (Service Terms Ziff. 15.2),
von der **Googles fertiges Anzeige-Bauteil ausgenommen ist** (Ziff. 15.3). Zwei Fallen, die
der Gegenprüfer gefunden hat: Die Acceptable Use Policy verbietet, Google-Daten mit eigenen
personenbezogenen Daten zu einem neuen Merkmal zu verbinden — das trifft gerade die
*interne* Sichtung („geeignet / ungeeignet"), nicht die Anzeige; und eine Seite, die nur
aus Google-Inhalt besteht, ist keine „Customer Application". Eine Bewertung wird deshalb
weiterhin **nur** als Selbstauskunft der eigenen Website erfasst (`bewertung_quelle`), nie
als „Google-Bewertung" beschriftet; gezeigt werden darf sie nur live über das Bauteil.

**Ein Batch-Upsert vereinheitlicht die Spaltenmenge — BLOCKER, und der teuerste Unfall
dieses Bereichs.** PostgREST baut aus einem Batch EIN Insert mit EINER Spaltenliste;
trägt eine Zeile ein Feld und die anderen 499 nicht, bekommen diese 499 dort **NULL**
und überschreiben den bestehenden Wert. Kein Fehler, keine Warnung. Real passiert am
29.08.2026, obwohl der Fall im Projekt bereits dokumentiert war: Der Über-uns-Lauf
setzte ein Trust-Signal nur dort in die Zeile, wo es sich geändert hatte — die
vorsichtige Bauweise, wie man denkt. Meisterbetrieb fiel von 676 auf 167, das
Geschäftsfeld Photovoltaik von 2.913 auf 135. **Die Absicherung sitzt jetzt in der
Schreibfunktion** (ungleiche Feldmengen werden gruppiert und getrennt geschrieben), nicht
in einer Regel für Aufrufer — eine Regel, an die sich jeder künftige Lauf erinnern muss,
ist keine; dieser Lauf hätte sie gebraucht und nicht gehabt.
`lib/__tests__/upsert-spaltenmenge.test.ts`, in beide Richtungen kaputtgemacht und rot
gesehen.
- **Die zweite Lehre wiegt schwerer als die erste: Was keinen Beleg hat, ist bei einem
  Schreibfehler unwiederbringlich.** Die Trust-Signale kamen vollständig aus
  `fachbetrieb_belege` zurück — genau dafür gibt es sie. Die Geschäftsfelder nicht, für
  sie legt kein Lauf einen Beleg an; sie mussten neu abgerufen werden (`--felder`).

**Die frei abrufbare Kammer-Betriebsdatenbank ist ERLEDIGT — nicht rechtlich, sondern
praktisch (gemessen 29.08.2026).** Zwölf Betriebe gezielt gesucht, **einer** gefunden;
Gegenprobe mit einem Gattungsbegriff im selben Umkreis: 26 Treffer, die Suche
funktioniert also. Der Grund war die ganze Zeit erkennbar: **Die Mitgliedschaft ist
Pflicht, der Eintrag in dieses Verzeichnis freiwillig.** Wer das amtliche Merkmal will,
fragt die **Handwerksrolle** (§ 6 Abs. 2 HwO, 53 Anträge, nur zulassungspflichtige
Handwerke) — oder, am billigsten, den Betrieb selbst beim ohnehin geplanten Erstkontakt.
**Die Rechtsprüfung war trotzdem nicht umsonst**: Ihre Ergebnisse gelten für jede fremde
Datenbank, die dieses Projekt je abgleicht.

**Die Handwerkskammer ist GEPRÜFT, nicht mehr offen (29.08.2026, zwei Legal-Judges):
intern zulässig, öffentlich später.** Tragend ist allein das Datenbankrecht, und die
eine Bedingung, die wirklich zählt, heißt **abgleichen statt abernten**: gezielt
nachschlagen, was wir schon haben, nie ganze Gewerke-Kategorien durchgehen (EuGH
C-203/02 Rn. 89 verbietet nur, was die Datenbank wieder erstellt). **Die DNG-Begründung
unten ist hinfällig** — beide Fassungen streiten über die Ausnahmen, ohne zu prüfen, ob
die Kammer überhaupt „öffentliche Stelle" im Sinne des DNG ist; das Gesetz hat dafür
eine eigene Definition. Herleitung, Bedingungen und der amtliche Weg über § 6 Abs. 2 HwO:
`docs/fachbetriebe-quellen.md`.

**Der Merksatz „öffentliche Stelle, also kein § 87b UrhG" trägt bei Handwerkskammern
NICHT.** Sie sind zwar Körperschaften des öffentlichen Rechts (§ 90 Abs. 1 HwO), aber
§ 2 Abs. 5 DNG gilt nur im Anwendungsbereich des Gesetzes — und § 2 Abs. 3 Nr. 1 nimmt
davon aus, was personenbezogen ist (Buchst. a Doppelbuchst. aa) und was nicht zum
gesetzlichen Auftrag gehört (Buchst. d; die Betriebsdatenbank ist eine freiwillige
Werbedatenbank, nicht die Handwerksrolle nach § 6 HwO). Die Quelle ist fachlich die beste
von allen — amtliche Gewerke aus der Handwerksrolle, Landkreis frei Haus — und bleibt
eine **offene Entscheidung für zwei Legal-Judges**, keine Sackgasse. Der Förder-Merksatz
wäre hier ungeprüft übernommen worden; genau davor warnt die Faktenprüfungs-Regel, dass
ein „gilt nicht für X" eine eigene Fundstelle braucht.

**Betrieb oder Portal entscheidet die STREUUNG, nicht eine gepflegte Liste**
(`portalSchwelle`). Ein Fachbetrieb erscheint in ein bis drei Landkreisen, ein
Vergleichsportal in jedem. Eine Sperrliste wäre dasselbe Wettrennen wie beim Förder-Crawl.
Die Schwelle wächst mit der Zahl der abgefragten Kreise — sonst wäre in einem Teillauf
jedes Portal ein „Betrieb", und nach der Vollabfrage prüft das niemand mehr nach.

**„betrieb" braucht einen Beleg aus dem Impressum — BLOCKER (06.10.2026).** Die Streuung
trennt nur Portal von regional; ob ein regionaler Eintrag ein Handwerksbetrieb ist, sagt
sie nicht. Bis zu diesem Tag schrieb die Streuungs-Phase trotzdem `betrieb` und
überschrieb dabei bei jedem Suchlauf jede Rückstufung; das Photovoltaik-Wort genügte als
Beleg, und das erfüllen Stadtwerke, Verbände und Händler genauso. Gemessen an 50
zufälligen „Betrieben": 10 waren keine. Jetzt entscheidet `lib/fachbetrieb-einordnung.ts`
an zwei Hälften: **wer der Anbieter ist** (Anbieterblock des Impressums, Seitentitel —
nie ein Satz irgendwo auf der Seite: „Mitglied im … e.V." und „Handwerkskammer,
Körperschaft des öffentlichen Rechts" stehen bei echten Betrieben) und **ob es einen
Gewerksbeleg gibt** (Kammer, Meister/Handwerksrolle, Gewerk im Anbieternamen oder in der
Selbstbeschreibung, Montage-Angebot). Ohne Beleg heißt es `unklar`, nie `betrieb`; die
Streuung darf nur noch `ueberregional` schreiben (`artNachStreuung`). Die alten Muster
liefen über den ganzen Seitentext, stuften dadurch echte Betriebe zurück (eine
Energiegenossenschaft als Kunde im Impressum genügte) und ihr „e.V." traf nie (ein `\b`
nach einem Punkt verlangt ein Wortzeichen dahinter). Neu belegen: `npm run fachbetriebe --
--belegen --nur-messen --protokoll <datei>`, gegenlesen, dann `--aus <datei>`.
**Versorger und Medien werden nicht nur zurückgestuft, sondern an ihre Liste übergeben**,
wenn sie dort fehlen (Betreiber: „dorthin verschieben anstatt zu löschen") — als
Kandidat mit `herkunft='suche'` bzw. ohne `ist_medium`, damit die eigenen Prüfungen
dieser Bestände urteilen und die Kollisionsregel sie nicht für amtlich hält.
**Ergebnis am 06.10.2026:** von 3.009 „Betrieben" 2.548 belegt, 176 keine (64 Versorger,
37 Verbände, 35 Kommunen/Agenturen, 24 Portale, 14 Händler, 2 Medien), 285 ohne Beleg
(Stichprobe: rund ein Drittel davon doch Betriebe ohne lesbaren Nachweis). 74 Versorger
und 6 Medien-Kandidaten übergeben. **Alte Rückstufungen hebt die Regel nur mit Kammer im
Impressum auf** — die schwächeren Belege hätten Stadtportale, ein Ministerium und
Bürgerprojekte zu Betrieben gemacht (Gegenlesen von 77 Hochstufungen). Sechs Messläufe,
jeder gegengelesen; die Fehlgriffe stehen als Tests in
`lib/__tests__/fachbetrieb-einordnung.test.ts`.

**Kein Merkmal ohne Beleg.** Jeder Fund landet mit Fundstelle, Textstelle und Datum in
`fachbetrieb_belege`; die Spalte in `fachbetriebe` ist nur die Auswertung. Eine spätere
Neubewertung kostet damit keinen zweiten Crawl. „Vermutlich Meisterbetrieb" gibt es nicht.

**Die Trust-Signale stehen NICHT im Impressum.** Beim Eichen an drei Betrieben trug keines
der drei Impressen die Handwerkskammer, obwohl § 5 Abs. 1 Nr. 5 DDG sie für
zulassungspflichtige Handwerke verlangt; Meisterbetrieb, Gründungsjahr und Einzugsgebiet
standen im Marketing-Text der Startseite. Beide Seiten werden gelesen. Und die
Impressum-Adresse ist nicht ratbar — `/impressum` traf in zwei von drei Fällen daneben.

**Wer einen Extraktor baut, liest dreißig Zeilen Ergebnis von Hand gegen.** Der erste
Profil-Lauf lieferte gute Quoten (88 % mit Anschrift, 40 % mit Handelsregisternummer) und
enthielt sechs Fehlerklassen, von denen keine an einer Quote zu erkennen war: Rechtsform
aus der Wortmitte („DORFMANAGEMENT" → AG), Gründungsjahr aus einem beliebigen
„seit"-Satz, eine Beispieladresse und die Adresse des Hosters als Kontaktweg, eine
Überschrift als Kammername, und „nichts gefunden" als Urteil „ist kein Betrieb". Alle sechs
sind in `lib/__tests__/fachbetrieb-extrakt.test.ts` festgenagelt; **ein Muster
aufzuweichen, damit mehr Treffer entstehen, ist genau der Weg, auf dem sie zurückkommen.**

**Ein Formular IST ein Kontaktweg.** 473 Betriebe hatten keine auslesbare E-Mail, 233 gar
keinen Weg — der stand meist auf der **Kontaktseite**, oft als Formular statt als Adresse
(135 neue Adressen, 699 Formulare). Dieselbe Systematik wie bei den Gemeinden. **Das
GEWERK prüft man dort aber NICHT**: Auf einer Kontaktseite steht das Angebot nicht, und
der erste Anlauf löste damit fast nichts auf. Dafür ist die **Navigation der Startseite**
zuständig — sie steht statisch im HTML, auch wenn der Inhalt per Skript nachlädt.

**„Nichts gefunden" und „noch nicht angesehen" müssen unterscheidbar bleiben.** Von 908
unklaren Domains wurden 55 doch Betriebe, 74 Nicht-Betriebe (überwiegend kommunale
Solarkataster) und **758 zweimal geprüft ohne PV-Angebot** — dahinter stecken
Elektrobetriebe ohne PV-Geschäft und geparkte Domains, keine verborgenen Fachbetriebe.
Sie behalten „unklar" (ein Angebot kann auf einer ungelesenen Unterseite stehen), aber ihr
Grund sagt, dass zweimal nachgesehen wurde. Ohne diesen Unterschied prüft die nächste
Sitzung dieselben 758 noch einmal.

**Die Angebots-Unterseiten schlagen die Sitemap — gemessen, nicht vermutet (29.08.2026).**
An denselben 20 Betrieben: über die Navigation 3 Treffer für 4,3 Abrufe, über die Sitemap
1 Treffer für 6,2. Sie ist bei 17 von 20 lesbar, und genau ihre **Vollständigkeit** ist
das Problem — sie listet Blogartikel und Rechtstexte gleichrangig neben den
Leistungsseiten. **Die Navigation ist bereits die Auswahl, die der Betrieb selbst
getroffen hat.** Im Förderbereich liegt es umgekehrt (dort fand der Crawl nur 13 %, die
Volltextsuche musste nachhelfen); der Unterschied ist die Größe: Eine Kommunalseite hat
Tausende Seiten, eine Firmenseite dreißig. **Eine Adresse, die das gesuchte Wort selbst
trägt, ist bereits der Beleg** — null Abrufe. Ergebnis über beide Bestände: Balkonkraftwerk
von 8 % auf 19 % bei den Fachbetrieben, Speicher von 44 auf 61 %, Wärmepumpe von 45 auf 55 %.

**Das ANGEBOT wird in beiden Beständen erhoben, die Bestände bleiben getrennt**
(Betreiber-Vorgabe 29.08.2026: „Nutzer suchen explizit nach Hilfe bei der Montage. Dazu
können wir passende Betriebe listen — egal ob Versorger oder nicht"). Geteilt sind die
Suchmuster und die Seitenauswahl — sie ein zweites Mal zu schreiben wäre ein Fehler, kein
Duplikat. Getrennt bleibt die Einordnung: Ein Stadtwerk, das Balkonkraftwerke verkauft, ist
kein Handwerksbetrieb. **Bei Balkonkraftwerken liegen die Versorger anteilig VORN** (200
von 937 = 21 %, gegen 19 % der Fachbetriebe), bei Photovoltaik weit zurück (44 % gegen
96 %). Wer dort nur Handwerk listet, lässt ein Viertel der Anbieter weg.

**`decodeURIComponent` wirft bei kaputten Adressen — nie ungeschützt aufrufen.** Zweimal
einen Erhebungslauf abgerissen: am 28.08. nach 450 von 1.254 Domains, am 29.08. nach 2.400
von 2.850. **Beim zweiten Mal existierte die Absicherung bereits** — als try/catch an genau
der Stelle, an der es beim ersten Mal passiert war; zwei neue Aufrufer bekamen sie nicht
mit. Sie steht jetzt in einer Funktion, und
`lib/__tests__/adress-dekodierung-waechter.test.ts` verbietet den direkten Aufruf überall
sonst. **Der Wächter prüft beide Richtungen** — auch, ob die erlaubten Schutzfunktionen
wirklich abfangen; einer, der nur Aufrufstellen zählt, ließe eine Schutzfunktion durch, die
gar nichts schützt.

**Ein Prüfmuster findet nur, wonach es sucht — irgendwann muss man alles lesen.** Nach dem
ersten Namens-Umbau meldete die Musterprüfung 0,3 % verdächtige Namen, und der Betreiber
sagte trotzdem: „es müssen alle korrekt sein." Die vollständige Durchsicht — alle Namen
nach Länge sortiert, in Blöcken gelesen — fand danach **sechs** Klassen, die kein Muster
gesucht hatte: Anschrift ohne Trennzeichen hinter der Rechtsform („Banik Haustechnik
Schwabach GmbH O´Brien-Straße 2 91126 Schwabach"), Leistungsversprechen ganz ohne Namen
(167 Stück), Impressum-Vorspann („Diese Webseite ist ein Angebot von …"), reine
Leistungsaufzählungen, Menüpunkte als Name („Start" elfmal) und zwei unerkannte
Trennzeichen (das freistehende „I" als Pipe-Ersatz, „ᐅ"). **Die Länge war der Schlüssel:**
Jeder einzelne Name sah für sich plausibel aus, nur die Sortierung machte die Klassen
sichtbar. Ergebnis 2.826 → 2.513 Namen; wo keiner bleibt, zeigt die Liste die Anschrift,
und die stimmt immer.

**Der Beleg muss den FUND tragen, nicht das geputzte Urteil — sonst ist jede Verbesserung
einbahnig.** Der Namensbeleg speicherte das Ergebnis der Reinigung; damit putzt ein
Nachlauf ein zweites Mal, was schon geputzt war, und ein Fehlgriff ist unwiederbringlich.
Gemessen, als eine zu breite Werbesatz-Regel aus „Welt in Elbe-Elster e.V." ein „Welt"
machte — der Rohfund stand nirgends mehr. Der Titel-Rückfall legte überdies **gar keinen**
Beleg an, weshalb genau diese zwei Namen nicht wiederherstellbar waren. **Aber: vom Beleg
auszugehen wäre der übernächste Fehler** — er ist nicht durchweg der bessere Fund (bei
era-goslar.de steht dort „AG Solar", in der Tabelle das richtige „ERA-Goslar"). Der
Nachputz putzt nach; die Quellenwahl bleibt im Profil-Lauf, wo sie gemessen wird.

**Nach einem Fix an einem Extraktor läuft die Messung NOCH EINMAL.** Ein Fix öffnet
leicht eine neue Fehlerklasse, und die sieht genauso plausibel aus wie die alte: Die
Zerlegung von Seitentiteln senkte die kaputten Namen von 20 % auf 1,4 % — und schnitt
dabei „Uwe Schmidt Elektroinstallation Gas | Wasser | Sanitär GmbH" zu „Sanitär GmbH"
zusammen, weil die Striche dort eine Aufzählung IM Namen sind und kein Titel-Trenner.
Sichtbar wurde das nur, weil dieselbe Auszählung ein zweites Mal lief. Zweiter belegter
Fall: Die Werbesatz-Regel las „IM" in „IM Elektrotechnik Nord" als Verhältniswort, und
`Solar\w*` fraß „Solarma" — der Bestand verlor daraufhin **mehr** Namen statt weniger (168
statt 131), und das sah man nur an der Zahl. **Branchenwörter gehören eng gefasst, und
durchgehende Großschreibung schützt:** „PV ELEKTRO" ist ein Firmenname, keine Aufzählung.

**Eine Spalte prüft man dort, wo sie später gelesen wird — nicht in der Datenbank.** Die
Firmennamen sahen einzeln unauffällig aus; untereinander in der Ansicht standen dann
„Impressum - 3E-Elektrotechnik GmbH", „Home | ABEL ReTec" und einmal bloß „GmbH & Co. KG"
ohne Namen. In einem Anschreiben wäre jeder davon peinlich. `firmennameSaeubern` ist
deshalb streng: Was nach dem Putzen nur noch aus einer Rechtsform besteht, wird verworfen.

**Das GEWERK ist eine eigene Größe, nicht das Geschäftsfeld.** Die Geschäftsfelder sagen,
WAS angeboten wird (Photovoltaik, Speicher, Wallbox), das Gewerk sagt, WER es anbietet —
ein Elektrobetrieb, ein Dachdecker und ein reiner Solarteur bauen dieselbe Anlage und sind
drei verschiedene Gesprächspartner. Angelegt 28.08.2026 auf Vorgabe des Betreibers, weil
der Bereich um Heizungsbauer und weitere Gewerke wachsen soll; mehrere je Betrieb sind der
Normalfall (67 % tragen mindestens eines, 40 von 3.117 vier oder mehr — echte
Komplettanbieter).

**Bewertungen gehen NUR über die strukturierten Daten der eigenen Website**
(`AggregateRating` nach schema.org). Das hebt die Quote von 42 auf 156 Betriebe (5 %) und
bleibt trotzdem eine Minderheit — mehr gibt kein zulässiger Weg her, Google ist gesperrt.
Die Herkunft heißt immer „eigene Website", auch wenn der Betrieb dort seine Google-Sterne
wiedergibt: Wir haben die Zahl von ihm, nicht von Google.

**Ein Trust-Signal misst, ob der Betrieb es HINSCHREIBT — nicht, ob er es hat.** Vor
dem Über-uns-Lauf zweimal an 30 Betrieben geeicht (29.08.2026), und die Eichung hat
die Erwartung widerlegt: Von 21 erreichbaren „Über uns"-Seiten brachten **zwei**
einen Meisterbetrieb, eine ein Gründungsjahr, **keine** eine Handwerkskammer.
Hochgerechnet 22 % → 27 %, also eine Nachlese statt des vermuteten Hebels. Der
Grund gilt über diesen Lauf hinaus: **Wer Meisterbetrieb ist, schreibt es auf die
Startseite; wer es dort nicht schreibt, schreibt es nirgends.** Im
zulassungspflichtigen Elektrohandwerk sind fast alle Meisterbetriebe — unsere Quote
misst die Erwähnung, nicht den Bestand. Über die Website ist diese Grenze nicht zu
überwinden; dafür braucht es eine amtliche Quelle (Handwerkskammer, Rechtslage
geprüft — siehe `docs/fachbetriebe-quellen.md`). **Und genau dafür ist das Eichen
da:** ohne es wären 6.000 Abrufe für einen Ertrag gelaufen, den niemand
nachgemessen hätte.

**Adressen werden GELESEN, nicht geraten — dreimal dieselbe Lehre.** Impressum, Kontaktseite
und Favicon liegen alle unter frei gewählten Pfaden; `/impressum` traf in zwei von drei
Fällen daneben, `/favicon.ico` bei einem Drittel. Wer rät, hält „nicht gefunden" für „gibt
es nicht".

**Die Ansicht (`/admin/fachbetriebe`) kann bewusst wenig.** Filter, Details, Arbeitsstand,
Notiz — kein Versand, kein Anschreiben, keine Auswahlliste. Die Stände heißen „offen ·
vorgemerkt · angesehen · ungeeignet"; ein Zustand wie „angeschrieben" würde einen Apparat
behaupten, den es nicht gibt, und `lib/__tests__/fachbetrieb-stand.test.ts` verbietet
solche Namen. **Die Zahl `3/8` zählt belegte Merkmale, nicht Qualität** — ein
Meisterbetrieb, der seinen Titel nicht auf die Website schreibt, bekommt weniger Punkte
als einer, der es tut; gemessen wird unser Datenstand, nicht der Betrieb.

**Bei Versorgern sagt das Merkmal „nennt das Thema", nicht „bietet an" — und das ist
gemessene Resignation, keine Nachlässigkeit (29.08.2026).** Vier Anläufe, jeder an denselben
von Hand belegten Fällen geeicht (zwei Verkäufer, drei reine Erklärseiten): Verkaufssprache
in derselben Zeile → 30 von 910 mit Photovoltaik, absurd streng. Umfeld von ±300 Zeichen
(Maße aus dem Förder-Screener) → 4 von 5, durchgefallen an einer **Beispielrechnung**
(„72,- € EEG-Förderung") — ein nackter Betrag belegt keinen Verkauf. Betrag nur mit
Kaufkontext → 3 von 5, jetzt fielen die echten Verkäufer durch, weil ihre Preisseite nicht
unter den ersten Unterseiten lag. **Der Grund, warum es hier schwerer ist als bei
Fachbetrieben: Ein Versorger hat eine Informationspflicht, und seine Erklärseiten sehen
Produktseiten zum Verwechseln ähnlich — inklusive Beträge.** Belastbar ist nur die
Handprüfung: von sechs gelesenen Balkon-Seiten verkauften **zwei**. Wer die Spalte als
Anbieterliste nutzt, rechnet diese Quote ein oder liest nach. **Aufhören zu messen ist hier
das Ergebnis, nicht das Aufgeben** — ein fünftes Muster hätte dieselbe Quote mit mehr
Selbstvertrauen geliefert.

**Bei Versorgern belegt die ERWÄHNUNG kein Angebot — BLOCKER (29.08.2026).** Ein Versorger
hat eine Informationspflicht gegenüber seinen Kunden, ein Handwerksbetrieb nicht: Bei einem
Solarteur IST die Erwähnung das Angebot, bei einem Stadtwerk ist sie oft nur Aufklärung.
Sechs Balkon-Seiten von Vertrieben im Wortlaut gelesen — drei erklären bloß, was ein
Balkonkraftwerk ist, einer schickt den Leser zum Netzbetreiber; verkauft haben zwei.
Deshalb zählt ein Geschäftsfeld dort nur mit Verkaufssprache daneben, und die **Adresse
allein zählt gar nicht** („/balkonkraftwerk" führt genauso oft auf eine Erklärseite).
**Dieselbe Frage an zwei Bestände braucht nicht dieselbe Beweisschwelle** — die Mechanik zu
teilen war richtig, die Schwelle mitzuteilen nicht.

**Ein NETZBETRIEB ist kein Anbieter — BLOCKER (29.08.2026).** Die Versorger-Adressen
stammen aus dem Anlagenregister und benennen überwiegend die Netzgesellschaft, nicht den
Vertrieb: 225 der 937. Bei ihnen maß das Geschäftsfeld „erwähnt" statt „bietet an" — ein
Netzbetreiber MUSS über Balkonkraftwerke schreiben (Anmeldepflicht), ohne eines zu
verkaufen. Zwölf von Hand nachgelesen, **kein einziger verkauft**. Deshalb zählt dort nur,
was neben Verkaufssprache steht; die Adresse allein nicht („/balkonkraftwerk-anmelden"
trägt das Wort und ist kein Angebot). Aufgefallen ist es dem Betreiber an einem Link, nicht
einer Quote. **Die Lücke dahinter ist offen:** Wo wir den Netzbetrieb haben, fehlt der
Vertrieb, und der verkauft und montiert.

**Nicht mit dem Versorger-Modul vermischen** (937 Stadtwerke, `docs/versorger-uebergabe.md`).
Fachbetriebe sind Handwerk, Versorger sind Energieversorger — andere Käufer, andere
Budgets, anderer Rechtsrahmen.

**Der Erstkontakt ist die billigste Quelle für alles, was die Website nicht hergibt** —
Meisterbrief, Balkonkraftwerk-Angebot, aktuelle Bewertung. Übergabe für die Konzept-Session
(Anliegen, Rechtsrahmen, was die Kommunen-Mechanik schon kann und was fehlt):
`docs/fachbetriebe-erstkontakt-uebergabe.md`. **Vor dem ersten Versand:** Die
Datenschutzerklärung nennt diese Erhebung mit keinem Wort, und die Ausnahme
„unverhältnismäßiger Aufwand" trägt hier nicht — wer Kontaktdaten erhebt, UM Kontakt
aufzunehmen, kann Kontakt nicht als zu aufwendig ausgeben.

**Das Angebots-Feature ist seit 03.09.2026 gebaut — aber nur auf der Partnerseite, nie im
allgemeinen Rechner.** Die Merkliste `docs/solarteur-widget-offene-fragen.md` gilt
weiter für das, was daraus einmal werden soll. **Die Reihenfolge ist die Trennlinie zum
gesamten Wettbewerb und wird nie umgedreht:** Der Nutzer sieht erst sein Ergebnis und
stellt DANACH selbst eine Anfrage. Auf solar-check.io selbst gibt es diesen Knopf nicht —
er erscheint ausschließlich, wo jemand über die Seite eines Betriebs gekommen ist. Zwei
Fragen bleiben beim Betreiber: ob Geld je Anfrage fließt, und ob der Betrieb den Kontakt
behalten darf, wenn nichts daraus wird.

**Der Pitch argumentiert mit VERTRAUEN, nicht mit besseren Anfragen — der Entwurf tut das
noch nicht** (gemessen 01.09.2026, Bedarfsrecherche mit neun Painpoints und Beleglage).
Von neun adressiert unser Produkt **zwei, und beide sind derselbe**: die Verunsicherung
der Endkunden (von Installateuren an erster Stelle genannt, rund 72 % — Magazin-
Leserumfrage 03/2024 mit Selbstselektion, **nie als „gemessen" führen**) und den
Vertrauensschaden aus der Insolvenzwelle. Die anderen sieben sind Abläufe, dort sitzen
Anbieter mit belegtem Zahlungswillen. **Der Anschluss ist ihr Geschäftsmodell:** Ihr
wichtigster Auftragskanal ist die Empfehlung, sie verkaufen über Glaubwürdigkeit — ein
unabhängiger Rechner ohne Leadverkauf ist für sie kein Werkzeug, sondern ein Beleg ihrer
Redlichkeit. Der Entwurf in `docs/fachbetriebe-anschreiben.md` argumentiert stattdessen
mit „Sie bekommen bessere Anfragen": Painpoint 5, der am schwächsten belegte der Liste,
und genau der, an dem ein Dutzend Software-Anbieter sitzt. **Vor dem Versand umbauen.**
Die vollständige Argumentation samt Belegstärke je Zahl und den drei Sätzen, die ein
Gegenleser zuerst angreift, steht in `docs/fachbetriebe-angebot-argumente.md`.

**Der einzige direkte Wettbewerber ist Solantiq** (`docs/wettbewerb-solantiq.md`, eigene
Bedienung des Rechners am 03.09.2026, nicht sein Marketing gelesen): einbettbarer
PV-Rechner unter fremder Marke für 588 bis 1.788 € im Jahr, Zielgruppe Solarinstallateure,
Zweck wörtlich „Lead-Generierung". **Er kann mehrere Dachflächen einzeln** (Größe in m²,
Neigung, gradgenaue Ausrichtung), hat einen Verschattungs-Schieber und deckt Österreich
und die Schweiz mit ab. **Der Unterschied ist nicht die Oberfläche, sondern gerechnet
gegen geraten:** Dort stellt der Nutzer die Eigenverbrauchsquote selbst ein — die Zahl, an
der die ganze Wirtschaftlichkeit hängt. **Die eine echte Lücke ist die Dachfläche in
Quadratmetern** (36 % der Betriebs-Anfrageformulare fragen danach). Sie automatisch zu
füllen ist gescheitert (siehe Google-Dachanalyse unten); die naheliegende Antwort ist
dieselbe wie bei Solantiq — fragen, mit der Modulzahl daneben.

**Was der Rechner-Flow von dem abdeckt, was Betriebe ohnehin fragen** (eigene Messung an
76 Anfrageformularen, 01.09.2026): Von den elf häufigsten Feldern liefert er sieben. Es
fehlen Dachfläche (36 %), Dacheindeckung (9 %) und Eigentümer/Mieter (7 %); Zählerschrank
und Dachzustand deckt der Foto-Upload des Rückkanals ab.

**Die automatische Dachanalyse über Googles Solar-Schnittstelle ist geprüft und
VERWORFEN** (03.09.2026, `docs/quellen/fachbetriebe/google-solar-api-lizenz.md`).
Rechtlich ist alles geklärt — zwei Legal-Judges, der zweite hat den ersten in drei Punkten
gekippt; der Zugang steht und kostet bei unserem Volumen nichts. Gescheitert ist es an der
Datenqualität: **Google kennt keine Grundstücksgrenzen.** Die Antwort beschreibt ein
Gebäude im Sinne des Höhenmodells, bei Reihen- und Doppelhäusern also die ganze Zeile — am
Referenzfall 141 m² für ein Haus mit rund 60, Modulbelegung quer über zwei Häuser. Keine
Angabe in der Antwort sagt, welcher Teil einem gehört. **Nicht erneut prüfen**, solange
Google keine Zuordnung von Adresse zu einzelner Dachfläche liefert. Zwei Lehren daraus
gelten allgemein: Eine schematische Zeichnung taugt nicht zur Bestätigung einer
automatischen Erkennung (es braucht das Original, nicht die Ableitung) — und das Bild
allein reicht nicht, wenn niemand die Gegend kennt: Bestätigen kann nur der Nutzer.
