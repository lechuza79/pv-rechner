# Übergabe: Badge-Widget bauen + erste Badges verschicken

> Briefing für eine eigene Session (Opus genügt). Stand: 19.08.2026, geschrieben von der
> Outreach-Audit-Session. Vorher lesen: CLAUDE.md (Widget-Konvention, geteiltes Bild,
> Einheiten-BLOCKER), `docs/kommunen-award-konsolidierung.md` (Award-Schema + Wer-darf-
> gewinnen-Regel), Memory `project_kommunen_outreach`.

## Auftrag

Das einbettbare **Award-Badge** bauen und an die ersten Gemeinden bringen. Der Betreiber
will die ersten Badges JETZT verschicken — das Badge ist der stärkere Embed-Anreiz als das
nackte Widget (Pressestelle zeigt gern eine Auszeichnung).

Umfang, in dieser Reihenfolge:
1. **Badge-Widget** unter `app/(embed)/embed/…` nach Widget-Konvention — die **neutrale,
   schlichte Variante** (siehe „Optik" unten).
2. **Print-Download** (PNG, gemeindeblatt-tauglich) **mit QR-Code** zurück auf die
   Gemeinde-Atlasseite.
3. **Anbindung ans Anschreiben** — NUR in Absprache (siehe „Koordination").

## Was schon existiert (NICHT neu bauen)

- **Award-Rechenkern:** `lib/awards.ts` (Kategorien, Träger, Größen-Terzile),
  `lib/award-hook.ts` (`computePlacements`, `selectHook`, Stufen Platz 1 / Podium /
  Top-%), `lib/awards-server.ts` (`loadAwardStats`, `buildHookIndex`). Datenstand
  MaStR 05.08.2026, Lauf monatlich am 5.
- **Platzierungs-API:** `/api/atlas/platzierungen?region=<AGS8>` — liefert beste
  Platzierung inkl. `gruppe`, `wert`, `rankingHref`. Live und geprüft (19.08.).
- **Ranking-Seiten:** `/solar-atlas/ranking/<kategorie>/<klasse>/<land>/<kreis>` —
  seit heute mit CO₂-/Stromwert-Spalten und fixierten Spalten auf main.
- **Seiten-Block:** `components/atlas/GemeindePlatzierungen.tsx` (Schlagzeile + Dialog).
- **Anschreiben:** `lib/kommunen-outreach-draft.ts` + Cockpit `/admin/kommunen`.

## Regeln, die hier scharf sind (alle BLOCKER, alle schon einmal schiefgegangen)

- **Badge-Text = Zahlenaussage.** Kategorie ehrlich betiteln, was sie misst; Beschriftung
  ausschließlich aus der Hook-/Kategorie-Quelle (`themaDativ`, `gruppe`, `wert` über
  `lib/atlas-format`), NIE handgetippt. Die Vergleichsgruppe (Größenklasse + Gebiet)
  gehört sichtbar aufs Badge — „Platz 1 im Landkreis" ohne Klasse ist eine falsche
  Aussage (gerankt wird innerhalb der Größenklasse).
- **Krone nur für Bürger-pro-Kopf-Kategorien** (Wer-darf-gewinnen-Regel, siehe
  Konsolidierungs-Doc §„Die Regel"). Ab Platz 4 zeigt das Badge die Stufe („Top 4 %"),
  nie den nackten Platz.
- **Widget-Konvention komplett:** zuerst Registry-Eintrag (`lib/widget-registry.ts`),
  dann Karte, dann Fußzeilen aus den Bausteinen. PoweredBy, Quelle vertikal an der
  rechten Kante, kein Browser-Storage, `ChartActionBar`-Impressumspunkt. Galerie-Sektion
  in `/energie-widgets` ergänzen.
- **Bild-Export:** `WidgetExportFooter`/`ExportOnly`-Systematik; Quelle + Marke ins PNG
  eingebacken; am erzeugten PNG prüfen, nicht am Bildschirm (`e2e/widget-export.spec.ts`
  als Muster). QR-Code selbst rendern (kein externer QR-Dienst — CSP/Datenschutz).
- **Optik:** KEIN KI-generiertes Hochglanz-Siegel — der erste Versuch wurde verworfen
  (Tool-Bewertung 25.07.2026). Gebaut wird die **schlichte, seriöse Variante** aus den
  Design-Tokens (`lib/theme.ts`): Typografie, Rang, Messgröße, Vergleichsgruppe, Jahr,
  Quelle. Flächen, keine Illustrationen. Wenn der Betreiber später Hochglanz will:
  Template-Kit oder Designer, nicht mehr KI-SVG.
- **Local-First:** sichtbares neues Feature → Dev-Server, Link an den Betreiber,
  Browser-Abnahme VOR Merge. Worktree benutzen (`EnterWorktree`).

## Koordination — wichtig

Eine **parallele Session** (Outreach-Audit, Haupt-Repo) baut gerade: neue Testgruppe
(Hessen/RLP/Saarland zuerst, nur Gemeinden mit Mail-Postfach), Versand-Skript über
All-Inkl-SMTP, Antwort-Sync ins Cockpit. **`lib/kommunen-outreach-draft.ts` und das
Cockpit gehören ihr** — die Badge-Erwähnung im Anschreiben (z. B. Badge-Absatz nur für
Sieger-Gemeinden) wird per `send_message` mit ihr abgestimmt oder kommt erst nach deren
Schub 1 dazu. Nicht parallel an denselben Dateien arbeiten. Vor Start: `git fetch` +
`npm run sessions`.

## Offene Produktentscheidungen (an den Betreiber, kurz mit Empfehlung)

1. **Wie kommt das Badge in den Brief?** Empfehlung: Bei Sieger-Gemeinden ein Satz +
   Link auf eine Vorschau-Seite (Badge groß, Embed-Code, Print-Download daneben) —
   kein Anhang, kein iframe-Code im Brief.
2. **Badge auch für Podium/Top-% oder nur Platz 1?** Empfehlung: alle drei Stufen,
   Stufe steht drauf — sonst gibt es für 90 % der Gemeinden nichts zu zeigen.

## Definition of done

- Badge-Widget live in der Galerie, Embed-Code kopierbar, Export-PNG mit Quelle/Marke/QR.
- Vorschau-Seite je Gemeinde erreichbar (Adresse aus `atlasPathForRegionId` ableiten).
- Tests: Registry-Eintrag vollständig, Badge-Beschriftung an die Hook-Quelle genagelt
  (Muster: `lib/__tests__/award-hook.test.ts`), Export-Smoke.
- Browser-Abnahme des Betreibers, dann Merge; Anschreiben-Anbindung mit der
  Outreach-Session abgestimmt.
