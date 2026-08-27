# Redaktionssystem — Übergabe

**Auftrag des Betreibers (26.08.2026):** Die Entwicklungsansicht wird zum Design-Werkzeug
umgebaut. Kategorien als Navigation oben, darunter je Kategorie eine kurze Beschreibung und
mehrere Stories. Je Kategorie wird das Design ausgearbeitet — Diagrammform, Typografie, Farbe.
Danach Varianten umschalten (Farbschema, „Highlight" mit blauem statt weißem Grund) und die Kette
Bearbeiten → Planen → Senden → Auswerten.

**Reihenfolge ausdrücklich:** Erst das Beschriebene bauen, dann die offenen Punkte am Ende dieses
Dokuments bewerten. Nicht umgekehrt.

---

## Was steht (nicht neu bauen)

**Sechs Datengeschichten**, alle aus dem Anlagenregister gerechnet (`lib/social-posts.ts`):
Stadt gegen Land bei Balkonkraftwerken · Balkon-Wachstum gegen Solar-Wachstum · Freiflächenanteil
je Bundesland · Aufteilung privat/Gewerbe/Freifläche · Fünf-Jahres-Wachstum je Land · Gemeinden mit
mehr Kilowatt als Einwohnern.

**Die Zahlen** kommen gebündelt aus `lib/social-kennzahlen.ts` (einmal täglich gecacht, Abfrage
über alle rund 10.700 bewohnten Gemeinden).

**Das Kartenbauteil** `components/social/SocialKarte.tsx` mit zwei Größenstufen und zwei
Bildarten (Vergleich, Einzelkennzahl).

**Die Feed-Vorschau** `components/social/FeedVorschau.tsx` — Kopfzeile, Text gekappt, Bild.

**Der Vorlagen-Editor** `components/social/VorlagenEditor.tsx`, bisher an einer Story.

**Die LinkedIn-Anbindung** (`lib/linkedin.ts`): Login, Zugangsschlüssel mit Ablaufwarnung,
Textbeitrag, Bild-Upload, Erwähnung der Unternehmensseite, erster Kommentar mit dem Link.

**Die Prüfstufe** (`lib/social-pruefung-kern.ts`): zwei Prüfungen je Beitrag, ohne sie kein Versand.

**Die Ansicht** `app/(site)/admin/redaktion/` mit Entwicklung, Planung, Auswertung.

---

## Sieben Dinge, die schon Geld gekostet haben

**1. Die Karte hat STUFEN, keinen Maßstab.** Eine 1080er Karte auf 240 Pixel herunterzurechnen
macht die Quellenzeile fünf Pixel groß. Die kleine Stufe lässt deshalb weg (kein Untertitel, keine
Fußzeile, eine Zahl statt zwei) und setzt ihre Schriftgrößen absolut. Wer eine dritte Größe
braucht, ergänzt eine Stufe — er skaliert nicht.

**2. Text und Bild kommen aus EINER Berechnung.** Das ist der Kern des ganzen Systems: Ein Post
kann keine Zahl behaupten, die das Diagramm daneben widerlegt. Wer das Bearbeiten ausbaut, hält
diese Eigenschaft — dafür gibt es die Platzhalter (`lib/social-vorlage.ts`). Im bearbeitbaren Text
stehen Namen, die Werte setzt die Berechnung ein.

**3. Die Bildaussage darf nicht doppelt stehen.** Im Feed trägt die Karte ihre Aussage als Titel;
im Teaser stand sie zusätzlich als Text darunter — dieselbe Zeile zweimal auf 240 Pixeln.

**4. Rundung gehört zur Aussage.** Der Text sagte „8 Prozent", das Bild zeigte „8,1" — aus
derselben Zahl. Die Nachkommastellen stehen deshalb je Serie am Bild und müssen zur Formulierung
passen. Ein Test allein findet das nicht; sichtbar wurde es erst am gerenderten Bild.

**5. Ein Balkenpaar taugt nur, wenn die Längen auseinandergehen.** 1,20 gegen 1,45 Millionen sind
zwei fast gleich lange Balken über ein Fünftel Wachstum. Dafür gibt es die Einzelkennzahl.

**6. Gruppen werden benannt, nicht aus der Sortierung erraten.** Ein Satz nahm die letzten zwei
Einträge einer sortierten Liste und nannte sie „die Stadtstaaten" — richtig, solange die Sortierung
mitspielte, und falsch beim ersten Datenstand, an dem sie es nicht tat.

**7. Kein Superlativ auf kleiner Grundmenge.** Steht im Redaktionsplan
(`lib/redaktionsplan.ts`) neben sieben weiteren Regeln, jede aus einem echten Fehlgriff.

---

## Drei Korrekturen des Betreibers, die in den Umbau gehören

**A. Die Prüfung muss BILD UND TEXT prüfen — offene Lücke.**
Heute hängt der Fingerabdruck nur am Text (`textAbdruck`). Ändert jemand den Kartentyp, eine Serie
oder die Rundung, bleibt die Freigabe gültig, obwohl das veröffentlichte Bild ein anderes ist.
Zu tun: Der Abdruck muss Text **und** die Bilddefinition umfassen. Das ist keine Verfeinerung,
sondern das Schließen eines Lochs in einer Sperre, die es sonst nur halb gibt.

**B. „Text zuerst, die ersten zwei Zeilen tragen alles" war zu absolut.**
Richtig ist: Bild und Text tragen **zusammen**. Der Feed zeigt den Text oben und kappt ihn, das
Bild steht darunter — aber wer nur auf die ersten zwei Zeilen optimiert, baut Textbeiträge mit
Beiwerk statt Beiträge, in denen beides zusammenwirkt. Beim Design je Kategorie ist genau dieses
Zusammenspiel der Gegenstand.

**C. Die Datengeschichten sollen die Website aufwerten — nur später.**
Der erste Anlauf (Teaser plus Fenster auf dem Balkon-Einstieg) wurde zurückgenommen, weil er
overengineered war und weil die Story-Themen kein messbares Suchvolumen haben. **Das heißt nicht,
dass der Inhalt der Website nichts bringt.** Der Betreiber will es verschoben, bis das Posten
steht — nicht verworfen. Beim Wiederaufgreifen ist der belegte Stand: Verborgener Text im HTML
wird indexiert (Googles Spam-Richtlinie nennt Akkordeons ausdrücklich als zulässig), Adress-Anker
gelten nicht als eigene Adressen, und die Fragen mit Nachfrage sind Bestandsfragen („wie viele
Balkonkraftwerke gibt es in Deutschland", 90 Suchen im Monat) — dafür läuft eine eigene Sitzung.

---

## Was der Betreiber sich vorstellt, in seinen Worten

> „den text komplett entfernen. dafür unsere kategorien kurz oben als nav, darunter die
> beschreibung und jeweils x stories. dafür arbeiten wir jeweils das design aus (hier in der app,
> charting, typo usw.). wenn das steht kann ich ggfs. dort themes umschalten oder z.b. sowas machen
> wie ‚highlight' was dann blauen statt weißen bg hat. auf edit kann ich dann ggfs. den text
> editieren > dann post planen > autopost > auswertung auto"

**Ein Hinweis dazu, der vor dem Bauen zu klären ist:** Farbschema und „Highlight" sind
Eigenschaften der KARTE, nicht der Ansicht. Wenn sie beim Posten mitwandern sollen — und das wollen
sie —, gehören sie an die Story und in die Prüfung (siehe Korrektur A). Sonst zeigt das Werkzeug
etwas anderes, als später rausgeht.

---

## Betrieb

**Lokal entwickeln, nicht auf die Hauptlinie schieben.** Der Betreiber hat das ausdrücklich
verlangt: Jede Runde auf `main` kostet Bauminuten für eine Ansicht, die noch in Arbeit ist. Dev-Server
mit eigenem Port starten, Abnahme im Browser, erst dann mergen.

**Die Umgebungsdatei fehlt in frischen Arbeitskopien** — ohne sie scheitert der Produktionsbau an
den Atlas-Seiten, nicht am eigenen Code.

**Zugangsdaten stehen bei Vercel:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`,
`LINKEDIN_ORG_URN`. Der Zugangsschlüssel liegt in der Datenbank und läuft alle zwei Monate ab; der
Gesundheitscheck warnt gestaffelt vorher.

**Tabellen:** `social_konten`, `social_pruefungen`, `social_vorlagen` — angelegt über
`/api/social/setup` (Admin-Session oder Cron-Schlüssel).
