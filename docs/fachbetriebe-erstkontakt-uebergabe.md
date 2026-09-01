# Fachbetriebe ansprechen: Übergabe für die Konzept-Session

**Angelegt 29.08.2026** am Ende der Erhebungs-Session. Auftrag des Betreibers: **erst
konzeptionell/strategisch die Anfrage prüfen**, nicht bauen.

## Was da ist

**3.114 regionale PV-Fachbetriebe**, davon 2.596 mit amtlichem Gemeindeschlüssel. Erreichbar
sind 94 % (84 % E-Mail, 82 % Telefon, dazu Kontaktformulare). Geschäftsfelder zu 96 %:
Photovoltaik 96, Speicher 61, Wärmepumpe 55, Wallbox 55, Balkonkraftwerk 19 %. Gewerk bei
67 %: Elektro 47, Heizung/Sanitär 17, Solarteur 16, Dachdecker 8 %.

Trust-Signale sind dünn und das ist gemessen, nicht versäumt: Meisterbetrieb 27 %,
Handwerkskammer 15 %, Zertifikate 14 %, Gründungsjahr 16 %, Bewertung 5 %. **Wer
Meisterbetrieb ist, schreibt es auf die Startseite; wer es dort nicht schreibt, schreibt es
nirgends.** Über die Website ist diese Grenze nicht zu überwinden — der Erstkontakt ist der
billigste Weg zu diesen Angaben.

**Die Versandmechanik der Kommunen trägt** und ist fast frei von Kommunen-Vokabular:
Versandbremsen (Schulferien und Feiertage des Ziel-Bundeslands, Di–Do, Tagespensum,
Pflichtangaben je Text, Anbieter-Erlaubnisliste, kein Versand ohne DKIM),
Rücklauf-Erkennung und Arbeitsstand. Neu zu bauen wären Brieftext und Zielgruppen-Auswahl.
Fundstellen: `lib/outreach-mail.ts`, `lib/outreach-ruecklauf.ts`, `lib/outreach-status.ts`,
`scripts/kommunen-versand.ts`, `scripts/kommunen-versand-runbook.md`.

## Die Frage, die diese Session beantworten soll

**Mit welchem Anliegen schreiben wir an?** Drei Kandidaten, in der Sitzung vom 29.08.2026
umrissen:

1. **Widget-Einbettung** — „Sie beraten zu PV, wir haben einen unabhängigen Rechner ohne
   Leadfunnel zum Einbetten." Der ursprüngliche Zweck der Erhebung (der Wettbewerbsbefund
   zeigt: Fachbetriebe sind die größte Gruppe unter den 2.080 verweisenden Domains des
   HTW-Rechners). Braucht keine Vorarbeit, ist heute schon wahr.
2. **Datenabgleich** — „Wir führen Sie im Verzeichnis, stimmt das?" Bringt Meisterbrief und
   Angebotsdaten. Setzt aber ein öffentliches Verzeichnis voraus, das es nicht gibt.
3. **Angebots-Feature** — „Nutzer könnten Sie anfragen." Für den Betrieb das
   Interessanteste, aber die Zusage „keine Lead-Erfassung · kein Vertriebskontakt" steht an
   vierzehn Stellen und müsste vorher umformuliert werden. Merkliste:
   `docs/solarteur-widget-offene-fragen.md`.

**Empfehlung aus der Erhebungs-Session: mit dem Widget anfangen.** Es ist ohne Vorarbeit
wahr, und die Antwortquote sagt, ob überhaupt jemand mit uns reden will. Die anderen beiden
lassen sich anhängen, wenn ein Erstkontakt steht.

## Was VOR dem ersten Versand erledigt sein muss

**Die Datenschutzerklärung nennt diese Erhebung mit keinem Wort.** Zwei Legal-Judges haben
das unabhängig festgestellt, und die Ausnahme „unverhältnismäßiger Aufwand" (Art. 14 Abs. 5
lit. b DSGVO) trägt hier nicht: 94 % der Betriebe haben einen Kontaktweg, und wer
Kontaktdaten erhebt, UM Kontakt aufzunehmen, kann sich nicht darauf berufen, Kontakt sei zu
aufwendig. Die Information kann im Anschreiben selbst erfolgen (Art. 14 Abs. 3 lit. b), für
die Nicht-Angeschriebenen braucht es eine öffentliche Datenschutz-Unterseite.

**Rechtsrahmen ist kalibriert, nicht offen** (siehe CLAUDE.md, Legal-Checkliste Punkt 6):
Maßvolle, schubweise Kaltakquise per Mail ist eine unternehmerische Entscheidung, kein
Verbot — der Empfänger selbst ist nach § 8 Abs. 3 UWG nicht abmahnbefugt. Risikofrei sitzt
es über das **Kontaktformular** der Zielstelle oder einen Permission-Ask. Pflicht in jeder
Mail: Klarname, „Betreiber solar-check.io", Impressum-Link, Datenschutz-Einzeiler.

## Was NICHT nochmal gemacht werden soll

- **Versorger als Anbieter behandeln.** Vier Messversuche am 29.08.2026, keiner zuverlässig:
  Ein Versorger hat eine Informationspflicht, seine Erklärseiten sehen aus wie
  Produktseiten. Von sechs gelesenen Balkon-Seiten verkauften zwei. Herleitung:
  `docs/fachbetriebe-quellen.md`, Abschnitt 1d.
- **Bewertungen öffentlich zeigen.** Scheitert am Bewertungsrecht (§ 5b Abs. 3 UWG, Anhang
  Nr. 23b), nicht an Google. Abschnitt 1b.
- **Die Handwerkskammer-Betriebsdatenbank abfragen.** Zwölf Betriebe gesucht, einer
  gefunden — der Eintrag ist freiwillig. Abschnitt 2.

## Der Bestand ist NICHT für den Versand gebaut

Die Arbeitsstände heißen „offen · vorgemerkt · angesehen · ungeeignet"; ein Zustand wie
„angeschrieben" existiert bewusst nicht und ist per Test verboten, weil er einen Apparat
behaupten würde, den es nicht gibt. Wer den Versand baut, hebt diese Sperre bewusst auf —
sie ist kein Versehen.

---

## Prüfung der Empfehlung (29.08.2026, Konzept-Session)

Auftrag war, die Widget-Empfehlung kritisch zu prüfen statt zu übernehmen. **Sie hält in
dieser Form nicht** — zwei belegte Gründe, ein strategischer.

### 1. Den Rechner, um den es geht, gibt es nicht zum Einbetten

Der Anschreiben-Satz aus dem Kandidaten 1 („wir haben einen unabhängigen Rechner ohne
Leadfunnel zum Einbetten") ist heute **unwahr**. `WIDGETS.rechner` in
`lib/widget-registry.ts` trägt `embeddable: false` mit dem Kommentar „es gibt kein
/embed/rechner"; der Amortisationsrechner ist verlinkbar, nicht einbettbar.

Einbettbar und für einen Fachbetrieb überhaupt brauchbar ist heute:

| Widget | für wen | Verkaufsrisiko |
|---|---|---|
| `/embed/simulation` (Ertrag nach PLZ) | 96 % (PV) | mittel |
| `/embed/foerder-check` | **nur Wärmepumpe/BEG**, also 55 % | keins |
| `/embed/gemeinde-solar` u. a. | alle, lokaler Bezug | keins |
| `/embed/einspeiseverguetung-verlauf` | alle, als Ratgeber-Element | keins |
| `/embed/gruengas-heizkosten` | Heizung/Sanitär (17 %) | keins |

**Der Fördercheck deckt die kommunalen Programme NICHT ab** — er rechnet ausschließlich
BEG-Wärmepumpe. Ein PV-Fördercheck aus dem Katalog (110+ kommunale Programme, täglich
belegt) wäre das inhaltlich stärkste Angebot an einen Fachbetrieb, weil er sein Angebot
billiger macht statt es in Frage zu stellen — er ist aber nicht gebaut.

### 2. Gemessen wurde VERLINKEN, gefragt wird EINBETTEN

Die 2.080 verweisenden Domains des HTW-Rechners belegen eine Handlung: einen Link setzen,
überwiegend aus Ratgebertext. Einbetten ist eine andere und deutlich teurere Handlung —
CMS öffnen, fremden Code einfügen, eine fremde Marke samt Weg-von-hier-Knopf auf die
eigene Seite stellen. **Wir belegen A und fragen nach B.**

Dazu eine Asymmetrie, die der Wettbewerbsbefund nicht nennt: HTW ist eine **Hochschule**.
Ein Teil des Verlinkungsgrundes ist geliehene Autorität, die wir nicht haben und über eine
Positionierungsaussage („unabhängig, ohne Leadfunnel") nicht ersetzen. Und HTW ist seit
Jahren die Nummer 1 auf „pv rechner" — es ist der bekannte Standard, wir sind unbekannt.

**Fair dagegengehalten:** Auf einer Achse ist das Einbetten für ihn *besser* als ein Link —
die Interaktion bleibt auf seiner Seite. Das „schickt Besucher weg"-Argument trägt nicht,
ein Link tut genau dasselbe und wird trotzdem 2.080-mal gesetzt.

### 3. Der Preis eines Fehlversuchs ist die Liste

Das Erheben kostete 1,68 $ und war reversibel. Ein Schub ist eine **einmalige erste
Begegnung** mit jeder der 3.114 Adressen. Das Argument der Übergabe („die Antwortquote
sagt, ob überhaupt jemand mit uns reden will") hält der Nachfrage nicht stand: Eine
Nullquote ist mehrdeutig — schwaches Angebot, schwacher Text, unbekannter Absender,
Spamfilter — und die Mehrdeutigkeit ist dann mit der Liste bezahlt. **Das schwächste der
drei Angebote zuerst zu senden, verbrennt die Adressen für das stärkste.**

### Empfehlung: die offene Frage stellen, statt sie mit einem Schub zu umgehen

Der Wettbewerbsbefund hat es selbst formuliert, **vor** der Erhebung, und es ist bis heute
unbeantwortet: „ob Solarteure ein Widget einer Seite einbetten würden, die ihnen keine
Leads liefert … ist eine Frage an drei Betriebe, nicht an eine Datenbank." Dieselbe Regel
steht als Merksatz im Projekt (`feedback_messgeraet_eichen`: erst drei Fälle von Hand).

Also: **fünf bis zehn Betriebe, Telefon oder Kontaktformular, ohne Angebot.** Kostet einen
Nachmittag, ist reversibel, trägt kein Schub-Risiko — und beantwortet drei Dinge auf
einmal: ob überhaupt Interesse besteht, *welches* Werkzeug er wollen würde (die Tabelle
oben ist unsere Vermutung, nicht seine Antwort), und ob er im Gespräch seinen Meisterbrief
nennt (das ist der Ertrag, den Kandidat 2 verspricht — ohne dessen Mail).

Erst danach ein **kleiner** erster Schub (30–50, nicht 3.114) mit dem Werkzeug, das die
Gespräche genannt haben. Die Versandmechanik der Kommunen kann das Tagespensum bereits.

### Rangfolge der drei Kandidaten nach dieser Prüfung

- **Datenabgleich fällt ganz weg**, und zwar deutlicher als in der Übergabe: Nicht nur
  fehlt das öffentliche Verzeichnis — eine Mail, die Daten abfragt ohne dem Empfänger
  etwas zu geben, ist die denkbar schlechteste erste Begegnung.
- **Angebots-Feature bleibt das stärkste Angebot** und taugt trotzdem nicht als
  Erstkontakt: Es braucht die Umformulierung der Zusage an vierzehn Stellen, zwei
  Betreiber-Entscheidungen und zwei Legal-Judges. Und die Frage „hätten Sie gern
  Anfragen?" beantwortet jeder mit ja, misst also nichts. **Es ist aber der Grund, den
  Widget-Schub klein zu halten** — dieselbe Mail wäre mit dem Anfrage-Feature ungleich
  stärker.
- **Widget bleibt der richtige Erstkontakt**, aber mit ehrlichem Inhalt (Werkzeuge und
  lokale Daten, nicht „der Rechner") und erst nach den Gesprächen.

### Vor dem ersten Gespräch zu messen

**Bettet heute schon jemand unsere Widgets ein?** Die Zählung läuft seit 25.08.2026
(`lib/embed-herkunft.ts`, Ansicht `/admin/einbettungen`). Diese Session kam an die
Datenbank nicht heran. Steht dort ein Fachbetrieb, ist er der wärmste erste Anruf, den es
gibt — und die Antwort auf die offene Frage kommt von jemandem, der sie schon beantwortet
hat.

### Unverändert blockierend

Die Datenschutzerklärung nennt diese Erhebung mit keinem Wort. Das gilt auch für den
Anruf: Die Informationspflicht nach Art. 14 DSGVO hängt am Kontakt, nicht am Medium. Ob
ein Telefonanruf zusätzlich § 7 Abs. 2 Nr. 1 UWG auslöst (mutmaßliche Einwilligung
gegenüber sonstigen Marktteilnehmern), ist **nicht geprüft** und gehört vor dem ersten
Anruf an zwei Legal-Judges — nicht an den Betreiber.

---

## Beschlossen im Gespräch (01.09.2026): Rückkanal, Stufen, ema-Befund

Die Prüfung oben ist an vier Stellen vom Betreiber korrigiert worden. Was jetzt gilt:

### Das Angebot ist NICHT das Widget, sondern eine gebrandete Rechner-Seite

Der Betrieb bekommt eine Adresse bei uns, unter der der Rechner mit **seinem** Kopf öffnet
(Logo, Name — beides ist erhoben). Er verlinkt sie von seiner Website. Kein Einbau, kein
CMS, kein Code — damit fällt der Einwand aus Abschnitt „Prüfung", Punkt 1 und 2: dass der
Amortisationsrechner nicht einbettbar ist, spielt keine Rolle, und verlinken ist genau die
Handlung, die beim HTW-Rechner 2.080-mal gemessen wurde.

**Die Seite wird VOR dem Anschreiben gebaut** und liegt als Link in der Mail. Damit ist
„zuerst geben" wörtlich wahr statt behauptet. Klassifiziert als **Demo**, nur über den
Link erreichbar, nicht indexiert, mit unserer Marke darauf.

**Rechtsfragen dazu, alle ungeprüft, vor dem ersten Link an zwei Legal-Judges:** fremdes
Logo auf einer Seite, die wir hosten, ohne Einwilligung · Abgrenzung zur Irreführung (die
Seite darf nicht so aussehen, als sei sie seine — Co-Branding, kein Nachbau) · Impressum ·
ob ein Anruf § 7 Abs. 2 Nr. 1 UWG auslöst.

### Der Rückkanal ist der Kern, nicht das Beiwerk

Der Nutzer rechnet, sieht sein Ergebnis, und schickt es mit einem Klick an genau diesen
Betrieb. Der Teilen-Link, der ein Ergebnis vollständig in einer Adresse abbildet, ist
gebaut; der Mailversand auch. Es fehlen die Partner-Kennung und ein Formular.

**Rechtlich erheblich kleiner als das Angebots-Feature** aus
`docs/solarteur-widget-offene-fragen.md`: Dort wählt der Nutzer aus einer Liste — also
Rangfolge, Neutralität, Provision, Kennzeichnungspflicht. Hier ist der Betrieb durch die
Herkunft des Besuchers gesetzt, es gibt keine Auswahl. Offen bleiben Nutzer-Einwilligung,
Datenschutzerklärung und die Umformulierung der Zusage an vierzehn Stellen.

**Der Nutzen wird als ARBEITSERSPARNIS formuliert, nicht als „mehr Anfragen":** Die Anfrage
kommt vorstrukturiert — Dach, Verbrauch, gewünschte Größe, Ergebnis. Er spart das erste
Telefonat. Das ist konkret und in einem Satz erklärbar.

### Die eine Grenze, die nicht verhandelbar ist

**Entweder unsere Marke und neutrale Zahlen — oder seine Zahlen ohne unsere Marke. Nie
beides.** Die Mischform (unser Logo unter seinen Preisen) verkauft Neutralität als
Verpackung und ist genau das, was wir dem Wettbewerb vorwerfen. Sie fällt zufällig mit der
Preisstufung zusammen: Wer unsere Marke trägt, verlinkt uns und zahlt nichts; wer sie
weglassen will, zahlt.

### Was ema-energiewelt.de zeigt — abgerufen am 01.09.2026

Deren Fachpartner-Programm ist am selben Tag im Volltext gelesen worden
(`/pv-netzanmeldung-fuer-solarteure`). Es verkauft **keine Reichweite und kein Werkzeug,
sondern Verwaltungsarbeit**: Netzanmeldung beim Verteilnetzbetreiber, 299 € netto einzeln,
200 € im 100er-Paket, kein Abo, keine Grundgebühr, Vorkasse-Pakete mit 180 Tagen
Gültigkeit, Zugang ohne Freigabeprozess sofort aktiv. Rechner und Atlas sind dort der
Traffic-Motor, nicht das Produkt.

**Was wir abschauen:**
- **Die Nutzenachse.** Ein Betrieb zahlt für Arbeit, die er hasst — belegt mit Zahlen, die
  sie selbst nennen: 1–2 Stunden manuelle Antragserstellung je Projekt, rund 880
  Verteilnetzbetreiber mit je eigenen Formularen.
- **Kein Abo, keine Grundgebühr, Vorkasse.** Passt zum Handwerk, keine laufende Bindung.
- **Sofort aktiv, kein Freigabeprozess.** Niedrigste denkbare Einstiegshürde.
- **Die FAQ IST das Verkaufsinstrument** — sie beschreibt die Schmerzen mit Zahlen und
  Quellen. Das ist unsere Kernkompetenz und kostet uns nichts Neues.

**Was daraus für unsere Bezahlstufe folgt — und das korrigiert die Planung:** Für
„dasselbe Widget ohne unser Logo" gibt es **keinen belegten Zahlungswillen**. Der
gemessene Zahlungswille im Markt liegt bei abgenommener Arbeit. Die aussichtsreicheren
Bezahlkandidaten sind deshalb die vorstrukturierte Anfrage und die Förderdaten im
Angebotswerkzeug des Betriebs — nicht das Weglassen unserer Marke.

**Was wir NICHT abschauen:** die Netzanmeldung selbst. Das ist ein Dienstleistungsgeschäft
mit Menschen dahinter (sie reichen ein und klären Rückfragen), skaliert schlecht und ist
nicht unser Geschäft. Ebenso wenig ihre Lead-Vermittlung an Fachpartner.

**Nebenbefund, im Erstkontakt zu bedenken:** Ema wirbt um dieselben Betriebe, ein Teil
unserer Liste hat deren Mail also schon bekommen. Und ihr Kernwerkzeug heißt „Solar-Check"
— unser Domainname (siehe `docs/seo/befund-2026-08-29-ema-energiewelt-ortsseiten.md`).

### Die Stufen (Leistungsumfang, keine Beträge)

Beträge bewusst offen — sie gehören dem Betreiber und brauchen eine eigene Runde.

| Stufe | Was er bekommt | Was er gibt | Preis |
|---|---|---|---|
| **0 Demo** | gebrandete Rechner-Seite bei uns, fertig gebaut, per Link erreichbar | nichts | frei |
| **1 Partner** | dazu Rückkanal (vorstrukturierte Anfrage) + hinterlegter Umkreis | Link von seiner Website | frei |
| **2 Einbettung** | Werkzeuge auf seiner Seite, unsere Marke, unsere Zahlen | Link | frei |
| **3 Whitelabel** | ohne unsere Marke, eigene Preise, eigene Zusatzfragen | — | zahlt |
| **4 später** | Förderdaten in seinem Angebotswerkzeug; Verkehr aus unseren Ortsseiten | — | zahlt |

Stufe 3 ist nach dem ema-Befund die **schwächste** Bezahlstufe und sollte nicht die erste
sein, die wir bepreisen. 4 ist der wahrscheinlichere Umsatz.

### „Pilotpartner, noch x von y Plätzen frei"

Nur, wenn die Begrenzung echt ist — erfundene Knappheit ist Irreführung nach § 5 UWG,
ausgerechnet auf der Seite, die mit Ehrlichkeit wirbt. Echt wird sie, wenn Pilotpartner
wirklich einzeln betreut werden; dann ist eine kleine Zahl begründbar. Und der Pilotstatus
muss sagen, was danach kommt („in der Pilotphase kostenlos, danach sprechen wir über den
Preis"), sonst ist der Dooropener eine Falle.

### Reihenfolge

Gespräche (5–10, Telefon oder Kontaktformular, ohne Angebot) → Demo-Seite + Rückkanal
bauen → Testballon 30–50. Die Datenschutzerklärung ist vor jedem davon fällig.

### Netzanmeldung: geprüft am 01.09.2026 — für uns kein Geschäft

Anlass war die Frage, ob emas Verwaltungsgeschäft wirklich so unautomatisierbar ist, wie
ihre Verkaufsseite es darstellt. An Primärquellen geprüft, nicht an deren Selbstauskunft:

**Was den Vorgang trägt:**
- **Es gibt keine Schnittstelle.** Die Netzbetreiber betreiben Portale mit Login, keine
  Programmierschnittstelle. Die vielzitierte Zerez-Schnittstelle betrifft **Zertifikate von
  Herstellern**, nicht die Anmeldung.
- **Der Zugang ist an den EINGETRAGENEN BETRIEB gebunden.** § 13 Abs. 2 NAV: Arbeiten an
  der Anlage nur durch ein in ein Installateurverzeichnis eingetragenes
  Installationsunternehmen. Ein Dienstleister kann die Anfrage stellen, die Fertigmeldung
  nicht. Bei kleineren Netzen kommt eine „Gastinstallateur"-Registrierung beim technischen
  Betriebsführer dazu (belegt bei EVA Alzenau → Bayernwerk).
- **Es ist nicht nur Ausfüllen, sondern Urteil.** Bayernwerk fährt ein kriterienbasiertes
  Zuteilungsverfahren mit „privilegierten Kundengruppen": Nachweis hochladen und einen
  bestimmten Vermerk ins Kommentarfeld schreiben, sonst wird der Antrag nicht bearbeitet.
  Solche Sonderregeln muss man je Netzbetreiber kennen.
- **Ein Teil der Unterlagen kann nur vom Kunden kommen.** Netze BW verlangt einen
  maßstabsgerechten Lageplan mit Grundstücksgrenzen, dazu Messkonzept und Veräußerungsform.

**Gegenbefund zu emas Verkaufsargument:** „880 Netzbetreiber mit je eigenen Formularen" ist
zu hoch gegriffen. Kleine Netzbetreiber nutzen das Portal ihres technischen Betriebsführers
— Alzenau reicht über Bayernwerk ein. **Gemessen an einem Beispiel, nicht hochgerechnet.**

**Urteil: nicht nachbauen.** Vier Gründe, keiner davon Aufwand: der Zugang hängt am
eingetragenen Betrieb, es gibt keine Schnittstelle für Software, der Engpass liegt beim
Netzbetreiber (zwei bis acht Wochen Bearbeitung) und nicht beim Ausfüllen — und der Markt
ist besetzt (neben ema mindestens `pv-anlagen-anmelden.de`, bundesweit zum Festpreis).

**Was bleibt, ist die Nutzenachse, nicht das Produkt.** Unsere Entsprechung von
„abgenommener Arbeit" liegt in unserem eigenen Bestand: die vorstrukturierte Anfrage (er
spart das erste Telefonat) und die Förderrecherche (er muss nicht herausfinden, ob die
Gemeinde seines Kunden zahlt).

**Am 01.09.2026 gelesene Quellen:** netze-bw.de (Ablauf, verlangte Unterlagen) ·
bayernwerk-netz.de (Zuteilungsverfahren, privilegierte Kundengruppen) · eva-alzenau.de
(Gastinstallateur, Portal des technischen Betriebsführers) · § 13 NAV auf
gesetze-im-internet.de · erneuerbareenergien.de zur Zerez-Schnittstelle ·
ema-energiewelt.de/pv-netzanmeldung-fuer-solarteure (Preise, Leistungsumfang).
