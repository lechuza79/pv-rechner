# Zubau-Story — Datenpflege + Politik-Marker (Runbook)

**Betrifft:** die Datenstory-Seite `/photovoltaik-zubau-deutschland` + das gleiche
einbettbare Widget (`components/charts/ZubauWidget.tsx`). Der Chart hat drei
Bausteine mit UNTERSCHIEDLICHER Wartung:

| Baustein | Quelle | Wartung |
|---|---|---|
| **Zubau-Balken** | MaStR (`getNationalSolarByYear`, live via ISR) | **Keine** — die MaStR-Pipeline aktualisiert monatlich, das laufende Jahr wird automatisch als unvollständig erkannt (kein hartkodiertes Jahr). Selbstwartend. |
| **Vergütungslinie** | `lib/feedin-history.ts` (Stichtags-Reihe) | Jährlich ein Wert anhängen — Teil A |
| **Strompreislinie** | `lib/strommix-history.ts` (`PRICE_HOUSEHOLD`, Eurostat) | Jährlich ein Wert anhängen — Teil B |
| **Politik-Marken** | `ZUBAU_EVENTS` in `components/charts/ZubauWidget.tsx` | Redaktionell — Wächter schlägt vor, Mensch schreibt — Teil C |

---

## Teil A — Vergütungslinie verlängern (jährlich, Januar-Lauf)

Angehängt an den **`eeg-verguetung-verify-halbjaehrlich`**-Wächter. Der ermittelt
am 28.1. ohnehin den ab 1.2. gültigen Teileinspeisungs-Satz ≤10 kWp (Council-
geprüft). Dieser Satz ist zugleich der Reihen-Repräsentant für das **neue Jahr**
(die Reihe führt seit 2024 den früh im Jahr wirksamen Feb-1-Wert — konsistent mit
`lib/feedin-config.ts`).

**Nur im Januar-Lauf** (nicht Juli): Wenn die Prüfung den neuen Feb-1-Wert
bestätigt hat, im selben Fix/Worktree in `lib/feedin-history.ts` das neue Jahr
anhängen:
- `FEEDIN_HISTORY_YEARS`: `<neues Jahr>` ergänzen.
- `FEEDIN_HISTORY_VALUES`: den bestätigten Teileinspeisungs-Satz ≤10 kWp (ct/kWh)
  index-gleich anhängen.
- `FEEDIN_HISTORY_META.dataAsOf` auf den neuen Monat setzen.

**Sicher/Auto:** Es ist derselbe Council-geprüfte Wert, der ohnehin in
`feedin-config.ts` landet — ein Datenpunkt anhängen ist mechanisch. Im selben
Commit wie das Config-Update ausführen. Bei einem **Reform-Hinweis** (Systematik-
Bruch wie 2023): NICHT blind anhängen — an den Menschen, weil die Bezugsgröße der
Reihe sich ändern kann (Teil C prüfen).

## Teil B — Strompreislinie verlängern (jährlich, Juli-Lauf)

Ebenfalls am `eeg-verguetung-verify-halbjaehrlich`-Wächter, aber im **Juli-Lauf**
(bis dahin hat Eurostat das Vorjahr meist vollständig veröffentlicht).

Neuen Haushaltsstrompreis (Jahresmittel, mittlere Verbrauchsklasse 2500–4999 kWh,
inkl. Steuern) aus Eurostat `nrg_pc_204` für das zuletzt VOLLSTÄNDIG publizierte
Jahr holen. Wenn vorhanden, in `lib/strommix-history.ts` anhängen:
- `PRICE_YEARS`: neues Jahr; `PRICE_HOUSEHOLD`: Wert (ct/kWh); optional
  `PRICE_INDUSTRY` aus `nrg_pc_205` (Klasse 2–20 GWh, ohne MwSt.).
- `PRICE_META.dataAsOf` auf das neue Jahr setzen.

Ist das Vorjahr bei Eurostat noch nicht vollständig: überspringen und im Report
vermerken (nächster Lauf holt es nach). Kein Zwang, kein Schätzen.

## Teil C — Politik-Marke vorschlagen (wöchentlich)

Angehängt an den **`foerder-news-waechter`**. Ziel: eine neue **bundesweite**
Weichenstellung, die den PV-Zubau prägt, als Timeline-Marke aufnehmen — aber
NICHT maschinell schreiben.

**Auslöser (nur echte bundesweite Wellen, sparsam):** eine in Kraft getretene
EEG-Reform, eine Änderung der Mehrwertsteuer/Nullsteuer auf PV, ein neues
Solarpaket, der Wegfall/Umbau der Einspeisevergütung für Neuanlagen o. Ä. —
NICHT jede kleine Änderung (die Timeline lebt von wenigen, prägenden Marken).

**Was der Wächter liefert (Vorschlag, KEIN Auto-Commit):** einen Kandidaten im
Stil der bestehenden `ZUBAU_EVENTS` (`components/charts/ZubauWidget.tsx`):
- `year`: Jahr des Inkrafttretens,
- `label`: 1–2 Wörter (z. B. „EEG-Reform"),
- `text`: EIN neutraler Satz in derselben Tonalität wie die vorhandenen Marken,
  belegt durch Primärquelle (Gesetz/Bundesnetzagentur), keine Wertung.
- `government`: WER die Entscheidung getroffen hat — regierende Koalition
  (Parteien) + Kanzler/in + verantwortliches Ressort/Minister, neutral und
  belegt (kein Partei-Lob/-Tadel). Beispiel-Stil: „Ampel-Koalition (SPD/Grüne/
  FDP), Wirtschaftsminister … (…)."

**Geplante/angekündigte Weichenstellung (Ausblick):** Ist eine Reform erst
angekündigt (Referentenentwurf), aber noch nicht beschlossen, bekommt die Marke
`planned: true` — sie erscheint als **hohler** Dot und als **leerer Platzhalter-
Balken** im Ausblicksjahr (`OUTLOOK_YEAR` in `ZubauWidget.tsx`). Sobald sie in
Kraft ist: `planned` entfernen, `government` (wer beschlossen hat) ergänzen, den
Text auf „in Kraft" umstellen. Der Platzhalter-Balken verschwindet automatisch,
sobald die MaStR-Daten das Jahr erreichen (rollover-sicher). Rückt der Ausblick
weiter in die Zukunft, `OUTLOOK_YEAR` anheben.

Den Kandidaten in den Wächter-Report (`/api/alert`) schreiben. **Ein Mensch**
formuliert final, prüft Jahr + Neutralität und trägt ihn in `ZUBAU_EVENTS` ein —
Begründung: die Seite ist zitierfähig und muss 100 % korrekt sein; kuratierten
Fließtext setzt kein Automat ungeprüft. (Analog zum „Förderung einschalten =
Vorschlag statt Auto-Fix".) Ergänzt der Mensch die Marke, ggf. den Ausblick-
Absatz im Artikel (`app/(site)/photovoltaik-zubau-deutschland/client.tsx`)
nachziehen.

---

**Merke:** Die Balken brauchen NIE Handarbeit. A und B sind mechanische
Ein-Wert-Anhänge (sicher/auto). Nur C bleibt bewusst redaktionell — Wächter
meldet, Mensch schreibt.
