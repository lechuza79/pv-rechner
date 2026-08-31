# Risikoprüfung der Drittlandübermittlung — Angebotsprüfung Wärmepumpe

**Erstellt:** 28.08.2026 · **Verantwortlicher:** siehe Impressum solar-check.io
**Nächste Überprüfung:** 28.08.2027, oder früher bei einer Änderung der Rechtslage
oder des Anbieters.

Dieses Dokument hält fest, warum die Übermittlung eines hochgeladenen
Wärmepumpen-Angebots in die Vereinigten Staaten vertretbar ist. Es ist die
Prüfung, die der Europäische Gerichtshof in *Schrems II* (C-311/18) vom
Verantwortlichen verlangt, wenn er sich auf Standardvertragsklauseln stützt.

## 1. Was übermittelt wird

Ein vom Nutzer selbst ausgewähltes Angebotsdokument. Es enthält typischerweise:

- Name und Anschrift des Nutzers,
- Firmenname, Anschrift und Kalkulation des Handwerksbetriebs,
- technische Angaben und Preise.

**Keine besonderen Kategorien** nach Art. 9 DSGVO. Keine Zahlungsdaten, keine
Zugangsdaten, keine Standortdaten über die Anschrift hinaus. Der Umfang ist
durch den Nutzer bestimmt: Er wählt das Dokument aus und weiß, was darin steht.

## 2. Empfänger und Rechtsgrundlage

Anthropic PBC, San Francisco, als Auftragsverarbeiter nach Art. 28 DSGVO.

**Kein Angemessenheitsbeschluss.** Der Anbieter ist im EU-U.S. Data Privacy
Framework nicht als Teilnehmer gelistet — geprüft am 27.08.2026 über einen
Vollabzug des amtlichen Registers (7.561 Einträge, Volltextsuche über
Organisationsnamen und erfasste Einheiten, mit Gegenprobe an einem bekannten
Teilnehmer). Der Befund ist vor einem Livegang erneut zu prüfen; eine
Zertifizierung kann jederzeit hinzukommen.

**Übermittlungsinstrument:** Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c
DSGVO, Modul 2, als Bestandteil des Auftragsverarbeitungsvertrags des Anbieters.

**Zusätzlich:** ausdrückliche Einwilligung des Nutzers vor jedem einzelnen
Vorgang, Art. 6 Abs. 1 lit. a und Art. 49 Abs. 1 lit. a DSGVO. Sie steht neben
den Klauseln, nicht an ihrer Stelle — die Einwilligung trägt den Einzelfall auch
dann, wenn das Instrument nach Art. 46 in Zweifel geriete.

## 3. Rechtslage im Empfängerland

Maßgeblich ist der Zugriff öffentlicher Stellen. Zwei Vorschriften stehen im
Vordergrund:

- **50 U.S.C. § 1881a (FISA 702):** Verpflichtet „electronic communication
  service provider". Ob ein Anbieter generativer Modelle darunterfällt, ist nicht
  abschließend geklärt. Wir nehmen die für uns ungünstige Annahme an, dass er es
  könnte.
- **Executive Order 12333:** betrifft Erfassung auf dem Transportweg. Die
  Übertragung erfolgt durchgehend verschlüsselt (TLS).

## 4. Bewertung des tatsächlichen Risikos

Vier Umstände, die zusammen die Bewertung tragen:

1. **Kein Personenbezug im Auftrag.** Die Anweisung an das Modell untersagt
   ausdrücklich, Namen oder Anschriften in die Antwort aufzunehmen. Das mindert
   nicht die Übermittlung selbst, aber alles, was danach kommt.
2. **Keine Speicherung auf unserer Seite und keine Zusammenführung.** Das
   Dokument wird nach der Auswertung verworfen; es entsteht kein Bestand, der
   sich abfragen ließe.
3. **Geringe Attraktivität.** Ein Heizungsangebot eines Privathaushalts ist für
   die genannten Zugriffsbefugnisse ohne Belang; sie zielen auf
   auslandsnachrichtendienstliche Erkenntnisse.
4. **Freiwilligkeit und Vorhersehbarkeit.** Der Nutzer entscheidet je Vorgang,
   ob er das Dokument übermittelt, und wird vorher über Empfänger, Land und das
   fehlende Angemessenheitsniveau unterrichtet.

**Ergebnis:** Das Restrisiko ist gering und durch die getroffenen Maßnahmen
angemessen begrenzt. Die Übermittlung ist vertretbar.

## 5. Ergänzende Maßnahmen

- Übertragung ausschließlich verschlüsselt.
- Verarbeitungsregion ausdrücklich auf die USA festgelegt statt „global", damit
  die Angabe in der Datenschutzerklärung zutrifft und nicht „irgendwo" lautet.
- Vertraglicher Ausschluss der Nutzung zu Trainingszwecken.
- Keine Ablage des Dokuments, kein Protokoll seines Inhalts. Fehlermeldungen des
  Dienstes werden nicht nach außen gegeben — sie könnten Teile des Dokuments
  enthalten.
- Serverseitige Prüfung der Einwilligung; ohne sie wird nichts übermittelt.

## 6. Was diese Prüfung NICHT abdeckt

Sie gilt für die Prüfung eines Angebots **ohne Speicherung**. Sobald aus den
ausgelesenen Werten ein eigener Datenbestand entsteht, ändern sich Zweck,
Rechtsgrundlage und Speicherdauer — dann ist sie neu zu führen, und es kommen
eine Datenschutz-Folgenabschätzung nach Art. 35 DSGVO sowie die
Informationspflichten gegenüber dem Handwerksbetrieb nach Art. 14 DSGVO hinzu.
