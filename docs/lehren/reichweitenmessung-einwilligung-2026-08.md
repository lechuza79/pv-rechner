# Warum die Reichweitenmessung ohne Einwilligung läuft — und was daran hängt

**Stand: 27.08.2026.** Diese Datei ist die Rechenschaftsdokumentation zu
§ 25 Abs. 2 Nr. 2 TDDDG. Ohne sie ist die Ausnahme im Streitfall nicht
nachweisbar — die Begründung steht sonst nur in einem Commit-Text.

## Der Anlass

Bei der Prüfung einer ganz anderen Frage (Herkunftskennung der
Kommunen-Briefe) fiel beiläufig auf, dass die Begründung in der
Datenschutzerklärung nicht trug. Dort stand:

> „Da hierbei keine Informationen auf deinem Gerät gespeichert oder abgerufen
> werden, ist dafür keine Einwilligung nach § 25 TDDDG erforderlich."

Zwei Legal-Gutachten (das zweite mit dem Auftrag, das erste zu widerlegen)
haben das übereinstimmend verworfen. **Der Satz war nicht ungenau, sondern
durch den eigenen Quelltext widerlegt** — und er war zugleich die dokumentierte
Rechtsbegründung des Betreibers. Nach der Systematik der Legal-Checkliste
(Punkt 8) ist eine absolute Zusage, die der eigene Code widerlegt, keine
Informationslücke, sondern eine falsche Zusage.

## Was das Messskript wirklich tut

Nachgelesen im ausgelieferten Skript (`/_vercel/insights/script.js`, v0.1.3),
nicht in der Werbeaussage des Anbieters:

- wird mit `cache-control: public, max-age=2678400` ausgeliefert — 31 Tage im
  Browser-Zwischenspeicher,
- liest `document.referrer` und `location.href` und schickt beides per
  `fetch` fort,
- prüft `navigator.webdriver` und die Browserkennung auf Automatisierung und
  misst bei einem Treffer gar nicht; dieser Wert wird nicht übertragen,
- setzt keine Cookies, schreibt nichts in den Browser-Speicher.

**Damit ist § 25 Abs. 1 TDDDG eröffnet.** Nicht wegen des Zwischenspeichers
(darüber lässt sich streiten, und beide Prüfer waren sich uneins), sondern
wegen des zweiten Punktes: Ausgeliefertes JavaScript, das den Browser anweist,
Angaben zu senden, ist nach den EDSA-Leitlinien 2/2023 (Fassung 2.0,
07.10.2024) Rn. 33 ausdrücklich ein „gaining of access"; Rn. 39 zählt dazu
auch Angaben, die Programme auf dem Gerät erst erzeugen, Rn. 53 stellt klar,
dass lokale Erzeugung nichts ausschließt. **Das ist nicht zu drehen, und wer
es versucht, verteidigt die Messung mit einem Satz, der falsch ist.**

## Warum trotzdem keine Einwilligung nötig ist

Tragend ist nicht, dass die Vorschrift nicht greift, sondern dass ihre
**Ausnahme** greift (§ 25 Abs. 2 Nr. 2 TDDDG).

Die Datenschutzkonferenz verweigert dazu bewusst jede pauschale Aussage
(Orientierungshilfe für Anbieter:innen digitaler Dienste, 20.11.2024, Rn. 87:
„Aus mehreren Gründen finden sich in dieser Orientierungshilfe keine derartigen
Aussagen") und stellt stattdessen einen offenen Test auf: Rn. 77 fragt, ob die
Zwecke „nutzerorientiert" verfolgt werden; Rn. 90 sagt, selbst die einfache
Messung von Besucherzahlen sei „nicht per se" Bestandteil des Basisdienstes,
„sondern abhängig vom jeweils konkret verfolgten Zweck" — und nennt als
Gegenbeispiel ausdrücklich die Wirtschaftlichkeit von Werbeanzeigen.

**Dieses Gegenbeispiel trifft hier nicht zu, und darauf beruht die
Einordnung:**

| Kriterium | Hier |
|---|---|
| Werbevermarktung | keine — die Seite zeigt keine Werbung |
| Verkauf von Kontakten / Leads | keiner, ausdrücklich das Gegenmodell |
| Weitergabe an Dritte | keine |
| Seitenübergreifende Verfolgung | keine |
| Dauerhafte Wiedererkennung | keine; die Kennung wird nach 24 Stunden verworfen |
| Benutzerdefinierte Variablen | **keine** — Ereignisse tragen keine Eigenschaften |
| Interne Verweisquellen | werden vom Skript verworfen |
| Abfrageteil der Adresse | wird von uns entfernt, bevor er die Messung erreicht |

Die letzten beiden Zeilen sind die, die dieses Projekt selbst hergestellt hat.

## Die zwei Änderungen vom 27.08.2026

**1. Der Abfrageteil der Adresse erreicht die Messung nicht mehr.**
Das Skript überträgt `location.href` vollständig — und die Rechner schreiben
die **Postleitzahl des Nutzers** genau dorthin, damit sich ein Ergebnis teilen
lässt. Damit erreichte jede eingegebene Postleitzahl die Messung, zusammen mit
Ortsangabe bis zur Stadt, Gerätetyp, Browserversion und der Tageskennung. Das
war die einzige Stelle im ganzen Aufbau, an der sich ernsthaft eine Frage nach
Personenbezug stellte — und die Datenschutzerklärung sagte an anderer Stelle
zu, die Postleitzahl fließe *nicht* in die Reichweitenmessung ein.

**Warum die vorhandene Regel das nicht gefangen hat:** Sie lautet „eigene
Ereignisse tragen NIE Postleitzahl, Freitext oder Personenbezug" — und sie
wurde eingehalten. Der Weg lief über den **Seitenaufruf**, den sie nicht
erfasst. Ein zweiter Kanal, auf den niemand geschaut hat, weil der erste
sauber war. Behoben in `components/WebAnalytics.tsx`, festgenagelt in
`lib/__tests__/analytics-ohne-query.test.ts` — der Test prüft den KANAL
(niemand bindet die Messung ungefiltert ein), nicht den Inhalt.

**2. Ereignisse tragen keine Eigenschaften mehr.**
`pv_ergebnis` trug Anlagen- und Speichergröße, und im Ereignis-Katalog stand
ein ausgearbeiteter Plan, das auf fünf weitere Dimensionen auszubauen — samt
der Feststellung, die Datenschutzerklärung sei „bereits offen formuliert" und
decke die Erweiterung ab. Genau das sind die „benutzerdefinierten Variablen"
aus Rn. 88, und Rn. 89 sagt, dass eine enge Einordnung verfällt, sobald „ein
weiteres Auswertungsergebnis hinzukommt".

**Die Entscheidung war deshalb nicht, einmal aufzuräumen, sondern die Grenze
in den Typ zu legen:** `trackEvent` nimmt keine Eigenschaften mehr entgegen.
Eine Aufräumaktion hätte den Zustand einmal hergestellt und beim nächsten
`trackEvent("…", { … })` wieder verloren, ohne dass jemand merkt, dass er
gerade eine Rechtsfrage neu aufmacht. Was der Typ nicht hergibt, kann niemand
versehentlich mitschicken.

**Was das gekostet hat:** die Frage „welche Anlagengrößen rechnen die Leute".
Das war die einzige Auswertung, die etwas über den NUTZER sagte statt über die
Seite. Der Trichter — welcher Schritt erreicht, wo abgebrochen wird — ist
vollständig erhalten und kommt ohne jede Angabe über den Nutzer aus.

## Was künftig die Einordnung kippen würde

Wer eines davon einführt, macht die Messung einwilligungspflichtig und muss
diese Datei und `/datenschutz` mit ändern:

- eine Ereignis-Eigenschaft, gleich welcher Art (der Typ verhindert es),
- ein Ereignisname, der einen Messwert verpackt (`pv_ergebnis_10kwp`),
- eine dauerhafte oder seitenübergreifende Wiedererkennung,
- Weitergabe der Messdaten an Dritte oder Zusammenführung mit anderen
  Beständen (etwa dem Kommunen-Kontaktbestand),
- Werbevermarktung oder Leadverkauf auf der Seite — dann greift das
  Gegenbeispiel aus Rn. 90 unmittelbar.

## Was ausdrücklich NICHT als Begründung taugt

- **„Es wird nichts auf dem Gerät gespeichert."** Widerlegt (EDSA Rn. 33, 39,
  53). Der Satz ist zusätzlich gefährlich, weil er Gestaltungen mitdecken
  würde, die wirklich kippen — er merkt den Unterschied nicht.
- **„Die Daten sind anonym."** Der einzelne Datenpunkt ist im Moment der
  Erhebung nicht aggregiert und trägt eine Tageskennung. „Anonym" beschreibt,
  was wir am Ende auswerten, nicht was übertragen wird — und genau so steht es
  jetzt auf der Seite.
- **„Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO."** Richtig für die
  nachgelagerte Verarbeitung, aber es ersetzt die Ausnahme nach § 25 nicht
  (DSK Rn. 69, 98). Beide Ebenen sind getrennt zu prüfen. Der Satz gehört
  trotzdem in die Erklärung — ihn „vorsichtshalber" zu streichen entfernt eine
  richtige Pflichtangabe.

## Fundstellen (am 27.08.2026 im Volltext gelesen)

- § 25 TDDDG; § 28 Abs. 1 Nr. 13, Abs. 2 TDDDG (Bußgeldrahmen)
- EDSA-Leitlinien 2/2023 zur technischen Reichweite von Art. 5 Abs. 3
  ePrivacy-RL, Fassung 2.0 vom 07.10.2024 — Rn. 33, 37, 39, 40, 44, 47–53, 56
- DSK, Orientierungshilfe für Anbieter:innen digitaler Dienste, 20.11.2024 —
  Rn. 24, 26, 69, 77, 78, 87–90, 98
- Vercel, „Web Analytics — Privacy and Compliance" (Stand 26.06.2026) sowie
  das ausgelieferte Skript selbst
- **Nicht im Original beschafft:** EuGH C-673/17 (Planet49) Rn. 70 wurde nur in
  der wörtlichen Wiedergabe des EDSA gelesen; der zweite Prüfer hat den
  deutschen Urteilstext über `infocuria.curia.europa.eu` nachgereicht. Für die
  hier tragende Frage (Ausnahme, nicht Anwendbarkeit) ist die Stelle nicht
  entscheidend.
