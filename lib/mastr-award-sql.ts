/**
 * Die Award-Tabelle `mastr_gemeinde_award` und ihr Neuaufbau — an EINER Stelle.
 *
 * Dasselbe Muster wie lib/mastr-region-sql.ts, aus demselben Grund: Die
 * Definition lag in der Setup-Route, und ein Einmal-Skript daneben haette eine
 * zweite Kopie gebraucht. Eine zweite handgetippte Kopie ist ein Fehler, kein
 * Duplikat — beim naechsten Setup-Lauf haette die aeltere die neuere still
 * ueberschrieben.
 *
 * WAS DIE TABELLE IST: eine schmale, vorberechnete Zeile je Gemeinde (~11k) aus
 * EINEM DB-seitigen Lauf ueber die 591k Rohzeilen. Nie live ueber die Rohdaten —
 * das hat am 21.07.2026 die Datenbank lahmgelegt.
 *
 * STICHTAGS-BESTAENDE (28.07.2026): Das Register fuehrt je Anlage das Jahr der
 * Inbetriebnahme, der Bestand Ende <Jahr> ist also die Summe aller Anlagen mit
 * `year <= Jahr`. Daraus fallen zwei Dinge ab, die vorher nicht gingen: das
 * Zubau-Tempo ueber mehrere Zeitraeume und die Rangveraenderung.
 *
 * Ehrlich dazu: Das ist eine Rekonstruktion, kein Schnappschuss von damals.
 * Stillgelegte Anlagen fehlen, Nachmeldungen verschieben aeltere Jahre. Die
 * Beschriftung sagt deshalb "Bestand Ende <Jahr>", nicht "damals gemessen".
 */
export const MASTR_AWARD_SQL = `
      CREATE TABLE IF NOT EXISTS mastr_gemeinde_award (
        region_id text PRIMARY KEY,
        population int NOT NULL,
        privat_dach_kwp numeric NOT NULL DEFAULT 0,
        gewerbe_dach_kwp numeric NOT NULL DEFAULT 0,
        freiflaeche_kwp numeric NOT NULL DEFAULT 0,
        balkon_count int NOT NULL DEFAULT 0,
        balkon_kwp numeric NOT NULL DEFAULT 0,
        batterie_privat_kwh numeric NOT NULL DEFAULT 0,
        batterie_privat_count int NOT NULL DEFAULT 0,
        batterie_gewerbe_kwh numeric NOT NULL DEFAULT 0,
        batterie_gewerbe_count int NOT NULL DEFAULT 0,
        wind_kwp numeric NOT NULL DEFAULT 0,
        biomasse_kwp numeric NOT NULL DEFAULT 0,
        wasser_kwp numeric NOT NULL DEFAULT 0,
        solar_zubau_kwp numeric NOT NULL DEFAULT 0,
        zubau_year int
      );
      -- Bestände zu Stichtagen. Das Register führt je Anlage das Jahr der
      -- Inbetriebnahme, der Bestand Ende <Jahr> ist also die Summe aller Anlagen
      -- mit year <= Jahr — ohne historische Importe.
      --
      -- EHRLICH GESAGT ist das eine Rekonstruktion, kein Schnappschuss von
      -- damals: Anlagen, die seither stillgelegt wurden, fehlen, und
      -- Nachmeldungen verschieben ältere Jahre. Für Tempo und Rangbewegung ist
      -- das die übliche und einzige verfügbare Grundlage; die Beschriftung sagt
      -- "Bestand Ende <Jahr>", nicht "damals gemessen".
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS solar_kwp numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS solar_kwp_ly numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS solar_kwp_l3 numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS solar_kwp_l5 numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS privat_dach_kwp_ly numeric NOT NULL DEFAULT 0;
      -- Private Daecher auch drei und fuenf Jahre zurueck. Das Zubau-Tempo einer
      -- BUERGER-Kategorie darf nicht die Gesamt-Solarleistung nehmen: Ein
      -- Investoren-Solarpark haette sonst ein Dorf an die Spitze gesetzt
      -- (gemessen: Theilheim mit 7.975 Wp je Kopf, waehrend der Bestands-Erste
      -- des Kreises bei 1.623 liegt).
      -- Anzahl der privaten Dachanlagen. Erst damit laesst sich pruefen, ob eine
      -- "private" Anlage ueberhaupt Wohnhausgroesse hat: Die Einordnung kommt aus
      -- einem angekreuzten Feld im Register (Nutzungsbereich = Haushalt), OHNE
      -- Groessenpruefung. Dolgesheim fuehrte die Pro-Kopf-Liste mit 88 Anlagen a
      -- 107 kWp an — das sind Gewerbehallen, keine Einfamilienhaeuser.
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS privat_dach_count int NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS privat_dach_kwp_l3 numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS privat_dach_kwp_l5 numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS balkon_count_ly int NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS batterie_privat_kwh_ly numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS freiflaeche_kwp_ly numeric NOT NULL DEFAULT 0;
      ALTER TABLE mastr_gemeinde_award ADD COLUMN IF NOT EXISTS wind_kwp_ly numeric NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_mga_population ON mastr_gemeinde_award (population);
      ALTER TABLE mastr_gemeinde_award ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_gemeinde_award_anon_read') THEN
          CREATE POLICY mastr_gemeinde_award_anon_read ON mastr_gemeinde_award FOR SELECT TO anon USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mastr_gemeinde_award_service_write') THEN
          CREATE POLICY mastr_gemeinde_award_service_write ON mastr_gemeinde_award FOR ALL TO service_role USING (true);
        END IF;
      END $$;

      -- Zubau = installierte Solarleistung des letzten VOLLSTÄNDIGEN Jahres. Jahr
      -- zur Laufzeit, nicht hart verdrahtet (rollover-sicher).
      CREATE OR REPLACE FUNCTION mastr_refresh_gemeinde_award()
      RETURNS void LANGUAGE plpgsql AS $fn$
      DECLARE ly int := EXTRACT(YEAR FROM CURRENT_DATE)::int - 1;
      BEGIN
        SET LOCAL statement_timeout = 0;
        TRUNCATE mastr_gemeinde_award;
        INSERT INTO mastr_gemeinde_award (
          region_id, population,
          privat_dach_kwp, gewerbe_dach_kwp, freiflaeche_kwp,
          balkon_count, balkon_kwp,
          batterie_privat_kwh, batterie_privat_count,
          batterie_gewerbe_kwh, batterie_gewerbe_count,
          wind_kwp, biomasse_kwp, wasser_kwp,
          solar_zubau_kwp, zubau_year,
          solar_kwp, solar_kwp_ly, solar_kwp_l3, solar_kwp_l5,
          privat_dach_count,
          privat_dach_kwp_ly, privat_dach_kwp_l3, privat_dach_kwp_l5,
          balkon_count_ly, batterie_privat_kwh_ly,
          freiflaeche_kwp_ly, wind_kwp_ly
        )
        SELECT a.region_id, r.population,
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='privat_dach'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='gewerbe_dach'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='freiflaeche'),0),
          coalesce(sum(a.count) FILTER (WHERE a.energietraeger='solar'    AND a.segment='steckersolar'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='steckersolar'),0),
          coalesce(sum(a.kwh)   FILTER (WHERE a.energietraeger='speicher' AND a.segment='batterie_privat'),0),
          coalesce(sum(a.count) FILTER (WHERE a.energietraeger='speicher' AND a.segment='batterie_privat'),0),
          coalesce(sum(a.kwh)   FILTER (WHERE a.energietraeger='speicher' AND a.segment='batterie_gewerbe'),0),
          coalesce(sum(a.count) FILTER (WHERE a.energietraeger='speicher' AND a.segment='batterie_gewerbe'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='wind'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='biomasse'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='wasser'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.year = ly),0),
          ly,
          -- Bestände: heute, Ende letztes volles Jahr, vor drei, vor fünf Jahren.
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.year <= ly),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.year <= ly - 2),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.year <= ly - 4),0),
          coalesce(sum(a.count) FILTER (WHERE a.energietraeger='solar'    AND a.segment='privat_dach'),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='privat_dach'  AND a.year <= ly),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='privat_dach'  AND a.year <= ly - 2),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='privat_dach'  AND a.year <= ly - 4),0),
          coalesce(sum(a.count) FILTER (WHERE a.energietraeger='solar'    AND a.segment='steckersolar' AND a.year <= ly),0),
          coalesce(sum(a.kwh)   FILTER (WHERE a.energietraeger='speicher' AND a.segment='batterie_privat' AND a.year <= ly),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='solar'    AND a.segment='freiflaeche'  AND a.year <= ly),0),
          coalesce(sum(a.kwp)   FILTER (WHERE a.energietraeger='wind'     AND a.year <= ly),0)
        FROM mastr_aggregates_gem a
        JOIN mastr_regions r ON r.region_id = a.region_id
        WHERE r.level = 'gemeinde' AND r.population > 0 AND r.slug IS NOT NULL
        GROUP BY a.region_id, r.population;
      END;
      $fn$;
      REVOKE ALL ON FUNCTION mastr_refresh_gemeinde_award() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION mastr_refresh_gemeinde_award() TO service_role;
    `;
