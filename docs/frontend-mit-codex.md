# Frontend mit Codex: wie eine Seite live geht, ohne zwei Tage zu kosten

Geschrieben am 23.09.2026, nach dem Livegang der Ortsseite. Sie kam als
fertiger, abgenommener Entwurf und brauchte von dort bis zur Produktion
**zwei Tage**, in denen fast nichts an der Gestaltung lag. Diese Datei sagt,
woran es lag und was beim nächsten Mal anders läuft.

Zielbild für die kommende Arbeit (Betreiber, 23.09.2026): **Codex baut echte
Seiten und shippt sie.** Was hier steht, ist die Vorbedingung dafür.

---

## Die acht Kostenstellen, jede mit Beleg

### 1. Der Entwurf wird durch React noch einmal gerendert

Die Ortsseite nimmt das Markup aus dem Design-Paket und rendert es ein zweites
Mal durch React. Daraus kam der teuerste Teil des Tages:

- Die Hero-Szene startet, **bevor** React übernimmt, und schreibt ihren Zustand
  an dasselbe Element, das React gleich noch einmal anfasst → Hydrations-Konflikt
  auf jedem Seitenaufruf. Der Rundgang fällt bei Konsolenfehlern durch; damit war
  das ein Livegang-Blocker, der weder im Diff noch im Browser sichtbar war.
- Drei Stylesheets (Navigationspaket, Design-System, Entwurf) treffen dieselben
  Elemente. Der Entwurf lädt zuletzt, also gewinnt er — eine Korrektur wirkt erst
  mit seitenweit eindeutigem Selektor, teils nur mit Vorrang-Kennzeichnung.

**Was daraus folgt:** Vor der nächsten Seite entscheiden, ob die Hülle so
ausgeliefert wird, wie Codex sie baut (gleiches HTML, gleiche Stylesheets,
gleiche Skripte), und die Daten als Werte hineingehen — statt als zweite
Render-Schicht. Das entfernt die ganze Fehlerklasse, statt sie zu bewachen.

### 2. Der eingebaute Browser dieser Sitzung misst falsch

Er läuft als versteckter Reiter. Alles, was an Sichtbarkeit hängt, verhält sich
dort anders als bei einem Menschen:

- Die 3D-Szene startet absichtlich nicht (`document.hidden`), bleibt auf
  „pending" stehen und sieht dadurch **kaputt** aus. Dreimal als Regression
  gemeldet, dreimal keine.
- Ein Hinweis-Zeiger, der über einen Sichtbarkeits-Beobachter erscheint, wird
  nie sichtbar → „Zeiger fehlt" ist dort nicht messbar.
- Ein Stylesheet kam aus dem Zwischenspeicher, während die Datei auf der Platte
  längst neu war → „gemessen, ist behoben" gegen „ist immer noch kaputt".

**Regel:** Was an Sichtbarkeit, Beobachtern oder Animation hängt, wird im
Browser-Testlauf gemessen (echter sichtbarer Browser), nicht in der Vorschau
dieser Sitzung. Für einen Befund im versteckten Reiter gilt: **erst die
Gegenprobe an einer Seite, von der bekannt ist, dass sie funktioniert.**
Verhält sie sich gleich, ist der Messplatz die Ursache.

### 3. Ein Bau zerlegt den laufenden Vorschau-Server

Zweimal an einem Abend: Ein Produktionsbau löscht das fertige Paket und legt es
neu an; der Server, der daraus ausliefert, hält die alten Dateinamen im Kopf.
Ergebnis beim Betreiber: einmal eine Seite ganz ohne Gestaltung, einmal eine
Seite ohne jede Funktion (die JavaScript-Datei antwortete mit „gibt es nicht").
Beides sah aus wie ein Regressionsfehler und war keiner.

**Regel:** Nie bauen, solange der Vorschau-Server des Betreibers läuft. Wer
bauen muss, hat einen eigenen Server auf eigenem Port — und sagt vorher
Bescheid.

### 4. Zum Abnehmen gehört ein Bild

„Passt das auf 375 px?" ist keine Frage an den Betreiber. Seine Ansage steht
seit dem 05.09.2026 im Projekt: „ich kann das nicht testen. das muss ein system
100 % zuverlässig testen. wie soll mir ein fehler auffallen?"

**Regel:** Zur Abnahme geht, was er **entscheidet** (Soll es so aussehen? Soll
es so heißen? Gehört das auf die Seite?). Alles, was man messen kann, misst ein
Lauf. Fällt einem zu einer Änderung keine Entscheidung ein, gehört an ihre
Stelle ein Test — und ohne Bild ist jede Zustimmung eine über etwas Ungesehenes.

### 5. Ein Test, den es nicht mehr gibt, ist eine verlorene Zusage

Mit den Tests der alten Ortsseite wurde auch der gelöscht, der festhielt, dass
die Geschichten-Karte in ihren Rahmen passt — die Karte gibt es weiter. Die
Anleitung nannte ihn noch, deshalb fiel die Prüfung der Anleitung aus und riss
den ganzen Testlauf mit.

**Regel:** Wer Seiten austauscht, geht ihre Tests einzeln durch: Gilt die Zusage
weiter? Dann zieht der Test mit um. Gilt sie nicht mehr? Dann verschwindet auch
ihr Satz in der Anleitung — im selben Commit.

### 6. Wer auf die Hauptlinie schiebt, bleibt bis zum Urteil

Der Merge war grün (Typprüfung, 4.931 Tests), die Prüfung auf der Hauptlinie
nicht: drei Befunde, die erst dort auftraten. Ohne die zweite Sitzung, die es
gemeldet hat, wären sie über Nacht stehen geblieben.

**Regel:** Nach dem Schieben bleibt man da, bis der Lauf durch ist. Rot wird
behoben oder zurückgenommen — vor Feierabend.

### 7. Was im fertigen Paket anders ist als beim Entwickeln

Drei Prüfmechanismen hingen am Entwicklungsmodus und fielen beim Umstellen auf
den fertigen Bau um, alle drei ohne echten Produktfehler dahinter. Und
umgekehrt: Ein Fehler, der nur im fertigen Paket auftritt, sieht wie ein Zufall
aus (Bauabbruch ohne Stapelspur, mal an diesem, mal an jenem Stand).

**Regel:** Vor dem Livegang einmal gegen den fertigen Bau prüfen, nicht nur
gegen den Entwicklungs-Server. Der Unterschied ist real und trifft genau die
Dinge, die man zuletzt prüft.

### 8. Eine Messung ohne Gegenprobe ist keine

Zwei Wächter waren fertig und grün und sahen **nichts** — einer übersprang seine
eigene Sabotage-Datei, der andere belegte sich selbst. Dieselbe Klasse traf
heute die Kontrast-Prüfung der zweiten Sitzung: Sie las den Seitengrund statt
den gemalten Hintergrund und meldete eine unsichtbare Überschrift, die es nicht
gab.

**Regel:** Jeden neuen Wächter absichtlich kaputtmachen und rot sehen — und
danach den Rückweg prüfen, also dass er wieder grün wird. Geprüft wird die
VERWENDUNG, nie das bloße Vorhandensein.

---

## Der Ablauf, den ich für die nächste Seite empfehle

1. **Codex baut die Seite** im Design-Paket und nimmt sie mit dem Betreiber am
   Bild ab. Das ist die einzige Abnahme, die er wirklich leisten kann.
2. **Anbindung ohne zweite Render-Schicht.** Dieselbe Hülle, Daten als Werte.
3. **Ein Lauf, der misst, was ein Blick nicht kann:** kein seitlicher Überlauf
   auf Telefonbreite, keine Konsolenfehler, die Karten und Bilder passen in ihre
   Rahmen, jede Zahl trägt ihre Einheit.
4. **Gegen den fertigen Bau prüfen**, nicht nur gegen den Entwicklungs-Server.
5. **Schieben und dableiben**, bis der Lauf auf der Hauptlinie durch ist.
6. **Danach live nachmessen** — Antwortzeiten, Zwischenspeicher, Konsolenfehler,
   Indexierung. Genau dort ist heute der Stadtstaaten-Fehler aufgefallen, den
   vorher nichts gezeigt hatte.

---

## Was heute offen geblieben ist

- **Die Lizenz im geteilten Bild ist behoben** (23.09.2026): Der Bild-Fuß der
  Ortsgeschichten trug nur den Namen der Quelle; Lizenz und Änderungshinweis
  werden jetzt aus dem Quellen-Register ergänzt, wo die Zeile eine bekannte
  Quelle nennt. Eigene Modelle bleiben unberührt — ihnen eine fremde Lizenz
  anzuhängen wäre die nächste Falschangabe.
- **Der Karten-Test misst nur Telefonbreite.** Auf Schreibtischbreite ragt die
  erste Karte des Karussells aus ihrem Rahmen, ein Klick auf ihre Mitte trifft
  den Rahmen und wird stumm verschluckt. Der Weg ist bekannt (eine Geschichte
  lässt sich über die Adresse öffnen, dann entfällt der Klick); Frist steht im
  Test.
- **Die Trennung Entwurf/React** (Punkt 1) ist beschrieben, nicht entschieden.

## Collapsible content

All expandable content uses the shared disclosure transition, including closing.
Native `details` elements use the global rule in `lib/theme.ts`; controlled React
panels use `components/Collapse.tsx`. Keep content mounted while closing and inert
when closed. Reuse `--disclosure-duration` and `--disclosure-easing`, rather than
adding component-specific timings. Respect `prefers-reduced-motion`. Browsers
without intrinsic-size transitions retain the native, immediately usable disclosure.

## Heat pump result and release checks (26 September 2026)

The existing-heating question can be deferred with “Später im Fördercheck beantworten”.
Unconfirmed answers never add a personal funding bonus: the initial result uses base
funding only. The funding modal and the editable result overview share
`BegFundingQuestions`; income options come from `beg-funding-options.ts`, including
the family-only band up to EUR 60,000. Income uses the tax-assessment average for
the second and third years before application, for owners and their partners.
Source checked: KfW programme 458 partner page, income bonus and household-income
definition (26 September 2026). Rates and model coefficients remain unchanged.

Building, price and PV settings keep draft answers until explicitly recalculated;
cancel discards the draft. Applying a change restarts the result count and race.
A manually entered net investment is no longer accepted by this UI: gross cost,
funding and net cost must remain reconcilable. Legacy share URLs remain readable.

Release coverage: full Vitest suite and production build, plus scoped browser tests
for the initial flow, deferred funding, explicit confirmation and advertising
labels. Check the actual production build at desktop and narrow phone widths.
The seller address and withdrawal notice must remain visible below the products;
showing them only in a details modal is insufficient.

## Shared widgets and explanatory tooltips — required

Before adding widget UI, consult `docs/zentrale-visuals-konzept.md` and `lib/widget-registry.ts`. Reuse the registered chart and `ExportableWidgetFrame` / `ChartOptionsMenu`; extend their props when an option is missing instead of copying their markup or behavior into a page. Page and embed variants must consume the same widget.

All explanatory tooltips use `components/InfoTooltip.tsx`. Supply content plus `label`, `trigger`, or the default help icon. GlossaryTerm delegates to it. Legacy municipality scripts declare the markup consumed by `InfoTooltipBindings`; they must not implement their own tooltip position, portal, hover, or dismissal handlers. Changes to shared behavior belong in InfoTooltip and must be checked at desktop and narrow mobile widths, including keyboard and outside dismissal.

`lib/__tests__/shared-tooltip-conventions.test.ts` rejects new independent tooltip renderers in app/components/municipality scripts. Existing chart-value readouts and the navigation label have named, bounded exceptions; do not broaden the exceptions to make a new help tooltip pass. This test runs with `npm test` in CI.

The same reuse requirement applies to every accepted shared component, not only tooltips. The authoritative catalogs remain `lib/bausteine-registry.ts`, `lib/chart-katalog.ts` and `lib/widget-registry.ts` (do not create a parallel registry); frame/menu/modal/export, settings, maps, composition, annual energy, monthly solar, current power and growth belong there. `shared-widget-architecture.test.ts` guards their existing consumer dependencies and rejects widget-local menu/encoder implementations. Existing widget/export tests additionally protect source attribution and the light export theme. A new accepted shared component must extend the catalog and the relevant architecture/behavior test in the same change. A page-specific layout is an explicit option of that component, not a copied implementation.
