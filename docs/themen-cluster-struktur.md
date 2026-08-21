> **ÜBERHOLT in einem zentralen Punkt (19.08.2026).** Abschnitt 2 empfiehlt, die
> Kategorien als reine Ansicht zu führen und die Adressen flach zu lassen, und
> Abschnitt 5 schreibt das künftigen Sitzungen vor. **Beides gilt nicht mehr.**
> Der Betreiber hat die flache Struktur am selben Tag als nicht skalierbar
> zurückgewiesen; die Ratgeber liegen seither unter `/balkonkraftwerk/ratgeber/`.
> Verbindlich ist **`docs/themen-bereich-zielbild.md`**.
>
> Warum das Papier trotzdem stehen bleibt: Die Abschnitte 1, 2b und 3 (Ausklapp-
> Menü ist für Suchmaschinen unsichtbar · drei handgepflegte Navigations-Listen ·
> was für den Umbau zu bauen wäre) sind unverändert gültig und stehen nirgends
> sonst. Und die widerlegte Argumentation aus Abschnitt 2 ist die Sorte, die ohne
> Vermerk in einem halben Jahr wiederkommt.

# Themen-Cluster als eigener Bereich: Zielbild und was es kostet

**Auftrag des Betreibers, 19.08.2026.** Die heutige Navigation ist gewachsen, nicht
entworfen: Manche Seiten eines Themas stehen in der Hauptnavigation, manche nicht.
Das Zielbild ist ein Bereich, der sich wie ein eigenes kleines Portal verhält —
Startseite, darunter Kategorien (Tools, Förderprogramme, Ratgeber, später
Produktvergleich), dazu eine Suche und eine echte Bereichsnavigation statt der
heutigen drei Ausklapp-Einträge.

**Entscheidung: zurückgestellt, nicht verworfen.** Bedingung des Betreibers war
ausdrücklich, dass sich das später umbauen lässt. Dieses Dokument beantwortet
genau diese Frage — und hält die eine Weiche fest, die man heute richtig stellen
muss, damit die Antwort „ja, billig" bleibt.

Erprobt wird das Muster am Balkonkraftwerk-Cluster; er ist mit vier Seiten der
erste, der die Größe erreicht.

---

## 1. Die Lage heute (Stand 19.08.2026)

`/balkonkraftwerk` (Einstieg) · `/balkonkraftwerk/rechner` ·
`/balkonkraftwerk/anmelden` · `/balkonkraftwerk/speicher`. Eine fünfte Seite
(`/balkonkraftwerk/foerderung`) entstand am selben Tag in einer parallelen Sitzung.

Im Menü hängt daran eine Ausklapp-Gruppe mit einem Eintrag je Seite.

**Zwei Dinge, die man dabei wissen muss, sonst schätzt man die Dringlichkeit falsch:**

1. **Die Ausklapp-Einträge sind für Suchmaschinen unsichtbar** (nachgemessen
   18.08.2026, festgehalten in CLAUDE.md). `DesktopDropdown` rendert sie erst im
   geöffneten Zustand; sie stehen in keinem ausgelieferten HTML und zählen als
   interner Verweis nicht. **„Manche Seiten stehen im Menü, manche nicht" kostet
   also keine Sichtbarkeit** — es ist eine reine Bedienbarkeitsfrage. Die
   crawlbaren Verweise kommen aus dem Themen-Einstieg, der Fußzeile und den
   Verweisblöcken unter den Artikeln.
2. **Der Themen-Einstieg trägt die Last, nicht das Menü.** Der Umbau, den der
   Betreiber beschreibt, findet deshalb zu neun Zehnteln auf der Einstiegsseite
   statt und nur zu einem Zehntel in der Kopfzeile.

---

## 2. Die eine Weiche, die heute fällt: Kategorien sind eine ANSICHT, kein Ordner

Das ist der Kern dieses Dokuments. Die Kategorien aus dem Zielbild — Tools,
Förderprogramme, Ratgeber, Produktvergleich — können auf zwei Arten existieren:

| | als Adress-Ebene | als Ansicht |
|---|---|---|
| Adresse | `/balkonkraftwerk/ratgeber/speicher` | `/balkonkraftwerk/speicher` |
| Umbau später | jede bestehende Seite zieht um | rein additiv |
| Kosten heute | 2 Weiterleitungen | 0 |
| Kosten in 6 Monaten | 1 je Artikel, plus eingehende Links | 0 |

**Empfehlung: als Ansicht.** Vier Gründe, alle aus dem, was im Projekt schon
entschieden oder gemessen ist:

- **Verzeichnistiefe kommt in Googles URL-Empfehlung gar nicht vor.** Sie verlangt
  Adressen, die logisch und für Menschen verständlich aufgebaut sind — mehr nicht
  (am 19.08.2026 im Original gelesen). Die Zuspitzung „Tiefe ist kein
  Rankingfaktor“ ist uns nur sekundär belegt und gilt nach Regel 6 nicht als Beleg.
- **Das Projekt hat diese Entscheidung schon einmal getroffen — genauso.**
  „`/ratgeber` ist eine ANSICHT, kein Ordner": Die Registry akzeptiert jeden
  Pfad und speist Übersicht, Krümelspur und Sitemap. Ein Ratgeber im Cluster
  bleibt Registry-Eintrag. Es gibt keinen Grund, dieselbe Frage im Cluster
  anders zu beantworten als eine Ebene darüber.
- **Die Steuerungseinheit existiert bereits.** CLAUDE.md hält fest, dass ein
  Präfix die einzige Einheit ist, die Kopfzeile, Middleware, robots und
  gestaffelte Index-Freischaltung kennen. Dieses Präfix ist `/balkonkraftwerk`.
  Ein zweites darunter steuert nichts, was das erste nicht schon steuert.
- **Die Asymmetrie der Kosten zeigt in dieselbe Richtung** wie beim Cluster
  selbst, nur umgekehrt: Dort war Verschachteln billiger, weil der Umzug sonst
  je Seite bezahlt wird. Hier ist Flachbleiben billiger, weil die Zwischenebene
  keinen Nutzen bringt, für den man den Umzug bezahlen würde.

**Praktische Folge — das ist die Zusage, um die es dem Betreiber ging:** Solange
diese Weiche so steht, ist der ganze Umbau **additiv**. Keine Weiterleitung,
keine bewegte Adresse, kein Rankingrisiko. Es kommt Oberfläche dazu, es zieht
nichts um.

**Wer die Weiche später anders stellen will**, tut das für einen Grund, der hier
nicht steht — und bezahlt dann eine Weiterleitung je Artikel plus den Verlust
eingehender Links. Ab etwa fünf Artikeln im Cluster ist das die teurere Hälfte
des Umbaus.

---

## 2b. Der eigentliche Strukturfehler: drei handgepflegte Listen

Beim Aufschreiben gefunden, und es ist die Antwort auf „wie müssen wir es machen,
damit wir später umbauen können". Eine neue Seite in einem Cluster muss heute an
**drei** Stellen von Hand eingetragen werden:

1. die Menügruppe in `components/Header.tsx` (`BALKON_ITEMS`),
2. die Markierungs-Kette in derselben Datei (Pfad → Schlüssel),
3. die Fußzeile in `components/Footer.tsx` (`GROUPS`),

dazu die Ratgeber-Registry, wenn es ein Artikel ist. **Beim Speicher-Ratgeber
sind zwei davon vergessen worden** — und keine davon fällt im Browser auf: Die
Seite funktioniert, sie ist nur nirgends verlinkt. Genau daher kommt der Eindruck
„manche Seiten stehen im Menü, manche nicht". Das ist keine Nachlässigkeit,
sondern die absehbare Folge von drei Listen ohne gemeinsame Quelle.

**Die Fußzeile ist dabei die wichtige der drei.** Sie ist neben dem
Themen-Einstieg der einzige Ort, an dem der Cluster von außerhalb überhaupt
crawlbar verlinkt ist. Eine vergessene Zeile dort kostet echte Auffindbarkeit;
eine vergessene Zeile im Menü kostet nur Bedienbarkeit.

**Sofortmaßnahme (19.08.2026):** `lib/__tests__/nav-aktiv.test.ts` leitet die
Wahrheit jetzt aus dem **Dateibaum** ab — was als Seite unter einem Cluster
existiert, muss in Menü **und** Fußzeile stehen und einen eigenen
Markierungs-Schlüssel haben. Bewusst nicht Liste gegen Liste: Das würde nur
festschreiben, was schon da ist. Gegenprobe gemacht, der Test wird rot, wenn ein
Eintrag fehlt.

**Der strukturelle Schritt, wenn der Umbau kommt:** die Navigation als
Datenstruktur statt als JSX-Arrays in zwei Komponenten — ein Modul in der Art von
`lib/ratgeber.ts`, mit einem Cluster-Feld je Eintrag. Dann lesen Menü, Fußzeile,
die künftige Bereichsnavigation, die Kategorie-Listen auf der Einstiegsseite und
der Suchindex aus **derselben** Quelle, und der Umbau besteht darin, eine weitere
Ansicht darauf zu setzen — nicht darin, fünf Dateien synchron zu halten. **Das
ist die eigentliche Voraussetzung dafür, dass „später umbauen" billig bleibt**,
neben der Adress-Weiche aus Abschnitt 2. Der Test oben ist bis dahin das Netz,
kein Ersatz.

---

## 3. Was gebaut werden müsste

Grob nach Aufwand, nicht nach Wichtigkeit.

**a) Der Themen-Einstieg wird eine echte Bereichs-Startseite.**
Heute beantwortet er drei Kernfragen im Fließtext und zeigt den Weg in drei
Schritten. Dazu käme eine Gliederung nach Kategorie — Tools, Förderprogramme,
Ratgeber —, jede mit ihren Einträgen. **Wichtig: nicht in einen Kachel-Verteiler
zurückfallen.** Die gerechneten Kurzantworten sind der Grund, warum die Seite
kein Thin Content ist; die Kategorien kommen daneben, nicht an ihre Stelle.

**b) Eine Bereichsnavigation unter der Kopfzeile.**
Eine Zeile, die auf jeder Seite des Clusters dieselben Kategorien zeigt und die
aktuelle markiert. Anders als die Ausklapp-Gruppe steht sie im ausgelieferten
HTML und **zählt damit als interner Verweis** — das ist ihr eigentlicher Gewinn
gegenüber heute, nicht die Bedienbarkeit. Zwei Fallen: Sie darf die Kopfzeile
nicht breiter machen (der Überlauf-Vorfall vom 19.08.2026 steht in CLAUDE.md),
und sie braucht dieselbe Markierungs-Systematik wie das Menü — je Seite ein
Schlüssel, spezifische Pfade vor dem Präfix.

**c) Eine Liste je Kategorie.**
Für Ratgeber ist die Datenquelle da (die Registry), es fehlt nur eine gefilterte
Ansicht: „alle Registry-Einträge, deren Pfad unter diesem Cluster liegt". Für
Tools und Förderprogramme gibt es heute keine Liste, die man filtern könnte —
die müsste entstehen, und zwar als **eine** Quelle, nicht als getippte Aufzählung
je Cluster.

**d) Die Suche — der größte und einzige wirklich neue Posten.**
Im Projekt existiert heute **nichts** davon: keine Suchseite, kein Index, keine
`SearchAction` in den strukturierten Daten. Das ist kein Umbau, sondern ein neues
Feature, und es hat eine eigene Vorfrage: Soll sie nur den Cluster durchsuchen
oder die ganze Seite? Bei rund 40 redaktionellen Seiten plus den Verzeichnissen
reicht sehr wahrscheinlich ein statischer Index über Titel, Teaser und
Überschriften, gebaut zur Build-Zeit — keine Suchmaschine als Abhängigkeit, keine
laufenden Kosten, kein Datenschutz-Zusatz. Erst wenn die Ortsseiten mitgesucht
werden sollen, wird es eine Datenbankfrage.

**e) Produktvergleich** — eigenes Thema, bereits geparkt und begründet in
`docs/balkon-vergleichsseite-konzept.md`. Hängt an einer Anmeldung bei einem
Partnerprogramm und damit an einer Entscheidung des Betreibers.

---

## 4. Was der Betreiber entscheiden muss, bevor gebaut wird

1. **Wie viele Cluster bekommen das?** Balkonkraftwerk hat die Größe erreicht.
   Wärmepumpe und Photovoltaik hätten sie auch, sind aber heute flach über die
   ganze Seite verteilt — für sie wäre es ein echter Umzug mit Weiterleitungen,
   nicht ein additiver Umbau. Empfehlung: erst Balkonkraftwerk, dann messen.
2. **Suche über den Cluster oder über die ganze Seite?** Bestimmt den Aufwand
   deutlich (siehe d).
3. **Verdrängt die Bereichsnavigation die Ausklapp-Gruppe im Menü, oder kommt sie
   dazu?** Beides nebeneinander ist doppelt; die Gruppe ersatzlos zu streichen
   nimmt den Einstieg von jeder Seite außerhalb des Clusters.

## 5. Was bis dahin gilt

Neue Seiten im Cluster kommen **flach** unter das Themen-Präfix
(`/balkonkraftwerk/<slug>`), bekommen einen Registry-Eintrag, einen Eintrag in
der Ausklapp-Gruppe mit **eigenem** Markierungs-Schlüssel und einen Verweis vom
Themen-Einstieg. `lib/__tests__/nav-aktiv.test.ts` prüft seit dem 19.08.2026 die
Gegenrichtung mit: Jede Seite des Clusters muss im Menü stehen — sonst fällt eine
neue Seite still heraus, so wie der Speicher-Ratgeber zunächst.
