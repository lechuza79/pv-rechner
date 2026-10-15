/**
 * Der Neuaufbau der Regionssummen — an EINER Stelle, in Schritten.
 *
 * WARUM EIN EIGENES MODUL (07.10.2026): Die Funktion stand nur als Text in der
 * Setup-Route und war damit ausschließlich über einen Aufruf gegen die
 * AUSGELIEFERTE Produktion einspielbar. Eine Änderung daran ließ sich also nicht
 * prüfen, bevor sie live war — genau die Lage, aus der `lib/mastr-region-sql.ts`
 * schon einmal entstanden ist (dort lagen zwei handgetippte Kopien, und ein
 * späterer Setup-Lauf hätte die langsamere zurückgeschrieben). Setup-Route und
 * Einspiel-Skript lesen jetzt beide von hier.
 *
 * DIE HIERARCHIE KOMMT AUS DER ELTERNKETTE, NICHT AUS DEN STELLEN DES
 * SCHLÜSSELS — BLOCKER. Vorher wurde die Zugehörigkeit aus derselben
 * Stellenlogik erzeugt, die der Rollup ersetzen sollte: für Deutschland richtig,
 * für jeden zweiten Markt falsch — die ersten fünf Zeichen von 'chg0261' sind
 * 'chg02' und damit ein Schlüssel, den es nicht gibt. Gemessen am 07.10.2026
 * liefern beide Wege über den deutschen Bestand ZEICHENGLEICH dieselben 43.044
 * Zeilen (null Abweichungen), die Umstellung bewegt also keine einzige Zahl.
 *
 * `SET LOCAL statement_timeout = 0` ALS ERSTE ZEILE EINER FUNKTION IST
 * WIRKUNGSLOS — BLOCKER, und sie stand hier zwei Monate als Absicherung.
 * Postgres legt das Zeitlimit beim START eines Statements fest; wer es INNERHALB
 * des laufenden Statements ändert, verlängert dieses nicht mehr. Gemessen am
 * 07.10.2026: Die Rolle bringt 8 Sekunden mit (von `authenticator` gesetzt), der
 * Neuaufbau braucht rund 6 Sekunden für die Berechnung plus das Schreiben von
 * 65.137 Zeilen — und wurde abgeschnitten, obwohl die Zeile dastand. Der alte
 * Aufbau lief nur deshalb durch, weil er knapp darunter blieb; mit jedem Jahr
 * Zubau wäre er von selbst gekippt, ohne dass sich etwas geändert hätte.
 *
 * Deshalb DREI Funktionen statt einer, jede klar unter dem Limit und jede für
 * sich aufrufbar:
 *   1. `mastr_refresh_region_mitglied()`  — die Zugehörigkeit (gemessen 0,25 s)
 *   2. `mastr_refresh_region_rollup_teil(traeger)` — die Summen EINES Trägers
 *   3. `mastr_refresh_region_rollup()`    — ruft 1 und dann 2 je Träger auf
 *
 * Der dritte bleibt als Name erhalten, weil fünf Stellen im Projekt ihn rufen;
 * wer ihn aus einer Umgebung mit knappem Zeitlimit aufruft, nimmt stattdessen
 * die Einzelschritte. Das Aufteilen je Träger ist nicht Kosmetik: Es macht den
 * Lauf gegen Wachstum robust, statt die Grenze nur weiter hinauszuschieben.
 */
export const MASTR_ROLLUP_SQL = `
-- ─── Schritt 1: wer liegt unter wem ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION mastr_refresh_region_mitglied()
RETURNS bigint LANGUAGE plpgsql AS $fn$
DECLARE anzahl bigint;
BEGIN
  -- Die Gemeinde ist Mitglied VON SICH SELBST (die erste Zeile der Rekursion).
  -- Ohne sie gäbe es für eine Gemeinde keinen Eintrag, und die Abfragen, die
  -- über die Zugehörigkeit eingrenzen, lieferten dort nicht „wenig", sondern
  -- NICHTS — eine leere Gemeindeseite ohne Fehlermeldung. Gemessen am
  -- 06.10.2026: genau das passierte beim ersten Versuch (0 statt 81 Zeilen für
  -- Nordkirchen).
  TRUNCATE mastr_region_mitglied;
  INSERT INTO mastr_region_mitglied (region_key, gemeinde_id)
  WITH RECURSIVE orte AS (SELECT DISTINCT region_id FROM mastr_aggregates_gem),
  kette(region_key, gemeinde_id) AS (
    SELECT o.region_id, o.region_id FROM orte o
    UNION
    SELECT r.parent_region_id, k.gemeinde_id
      FROM kette k JOIN mastr_regions r ON r.region_id = k.region_key
     WHERE r.parent_region_id IS NOT NULL
  )
  -- Die Wurzel eines Marktes trägt im Verzeichnis ihren Namen ('de'), als
  -- Rollup-Schlüssel aber den leeren String — die Umrechnung steht hier und in
  -- den Atlas-Funktionen, sonst nirgends.
  SELECT DISTINCT CASE WHEN region_key = 'de' THEN '' ELSE region_key END, gemeinde_id
    FROM kette;

  SELECT count(*) INTO anzahl FROM mastr_region_mitglied;
  -- LAUT SCHEITERN, NICHT STILL: Eine leere Zugehörigkeit ergäbe einen leeren
  -- Rollup, und ein leerer Rollup sieht auf jeder Kreis- und Landesseite wie
  -- „hier steht nichts" aus — ohne Fehler, ohne roten Test, ohne kaputtes
  -- Aussehen. Genau die Fehlerklasse, gegen die der Rest dieses Projekts
  -- gebaut ist.
  IF anzahl = 0 THEN
    RAISE EXCEPTION 'mastr_region_mitglied ist leer — Rollup nicht gebaut';
  END IF;
  RETURN anzahl;
END;
$fn$;

-- ─── Schritt 2: die Summen EINES Energieträgers ──────────────────────────────
CREATE OR REPLACE FUNCTION mastr_refresh_region_rollup_teil(p_traeger text)
RETURNS bigint LANGUAGE plpgsql AS $fn$
DECLARE anzahl bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mastr_region_mitglied) THEN
    RAISE EXCEPTION 'mastr_region_mitglied ist leer — erst mastr_refresh_region_mitglied() aufrufen';
  END IF;
  -- Gelöscht wird nur DIESER Träger: Ein TRUNCATE nähme die Träger mit, die
  -- schon fertig sind, und ein abgebrochener Lauf hinterließe dann weniger als
  -- vorher statt gleich viel.
  DELETE FROM mastr_region_rollup WHERE energietraeger = p_traeger;
  INSERT INTO mastr_region_rollup (region_key, energietraeger, segment, year, count, kwp, kwh)
  SELECT m.region_key, a.energietraeger, a.segment, a.year,
         sum(a.count)::bigint, sum(a.kwp), sum(a.kwh)
    FROM mastr_aggregates_gem a
    JOIN mastr_region_mitglied m ON m.gemeinde_id = a.region_id
   -- NUR OBERREGIONEN. Die Gemeinde ist in der Zugehörigkeit Mitglied von sich
   -- selbst (die Abfragen grenzen darüber ein), im Rollup hat sie nichts zu
   -- suchen: Für einen Gemeindeschlüssel trifft die Reihen-Abfrage ohnehin
   -- genau eine Zeile über den Primärschlüssel der Rohtabelle. Ohne diese
   -- Zeile wächst der Rollup um die Gemeinden mit — gemessen am 07.10.2026
   -- von 65.137 auf 80.560 Zeilen, für keinen einzigen Leser.
     AND m.region_key <> m.gemeinde_id
     AND a.energietraeger = p_traeger
   GROUP BY 1,2,3,4;
  SELECT count(*) INTO anzahl FROM mastr_region_rollup WHERE energietraeger = p_traeger;
  RETURN anzahl;
END;
$fn$;

-- ─── Schritt 3: alles zusammen ───────────────────────────────────────────────
-- Der Name bleibt, weil fünf Stellen im Projekt ihn rufen. Wer ein knappes
-- Zeitlimit hat, ruft die Schritte einzeln.
CREATE OR REPLACE FUNCTION mastr_refresh_region_rollup()
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE t text;
BEGIN
  PERFORM mastr_refresh_region_mitglied();
  FOR t IN SELECT DISTINCT energietraeger FROM mastr_aggregates_gem LOOP
    PERFORM mastr_refresh_region_rollup_teil(t);
  END LOOP;
  -- Was es in den Aggregaten nicht mehr gibt, darf in den Summen nicht
  -- stehenbleiben: Ein Träger, der aus dem Register fällt, hinterließe sonst
  -- für immer seine alten Zahlen.
  DELETE FROM mastr_region_rollup r
   WHERE NOT EXISTS (SELECT 1 FROM mastr_aggregates_gem a WHERE a.energietraeger = r.energietraeger);
END;
$fn$;

REVOKE ALL ON FUNCTION mastr_refresh_region_mitglied() FROM PUBLIC;
REVOKE ALL ON FUNCTION mastr_refresh_region_rollup_teil(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION mastr_refresh_region_rollup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mastr_refresh_region_mitglied() TO service_role;
GRANT EXECUTE ON FUNCTION mastr_refresh_region_rollup_teil(text) TO service_role;
GRANT EXECUTE ON FUNCTION mastr_refresh_region_rollup() TO service_role;
`;

/**
 * Der Aufbau in Schritten, von außen gesteuert.
 *
 * Gegen ein Zeitlimit von acht Sekunden ist das der einzige Weg, der auch in
 * fünf Jahren noch durchläuft: Jeder Aufruf ist ein eigenes Statement und
 * bekommt seine eigenen acht Sekunden.
 */
export async function rollupSchrittweise(
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>,
  traeger: string[],
): Promise<void> {
  const { error: e1 } = await rpc("mastr_refresh_region_mitglied");
  if (e1) throw new Error(`Zugehörigkeit: ${e1.message}`);
  for (const t of traeger) {
    const { error } = await rpc("mastr_refresh_region_rollup_teil", { p_traeger: t });
    if (error) throw new Error(`Summen für ${t}: ${error.message}`);
  }
}
