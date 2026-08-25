// Reiner Teil der Social-Konten: Typen, das Tabellen-SQL und die Ablauf-Logik.
//
// Getrennt von der Datenbank-Schicht (lib/social-konten.ts), damit ein Test die
// Ablauf-Regel prüfen kann, ohne den Server-Kontext zu brauchen — dieselbe
// Trennung wie zwischen der Stand-Auflösung und ihrer Darstellung.

export type SocialPlattform = "linkedin" | "instagram";

export type SocialKonto = {
  plattform: SocialPlattform;
  /** Kennung des Kontos bei der Plattform (Person-URN bzw. Instagram-User-ID). */
  konto_id: string;
  /** Anzeigename, nur zur Kontrolle im Cockpit — nie Teil einer Anfrage. */
  anzeigename: string | null;
  access_token: string;
  /** Wann der Schlüssel ungültig wird. Treibt die Vorwarnung. */
  gueltig_bis: string;
  /** Berechtigungen, die der Login tatsächlich erteilt hat. */
  scopes: string[];
  aktualisiert_am: string;
};

/**
 * Die Tabelle hat RLS an und KEINE Policy — damit ist sie ausschließlich über
 * den Service-Key erreichbar, wie die Kommunen-Kontakte und die
 * Wächter-Berichte. Ein Zugangsschlüssel, den der öffentliche Anon-Key lesen
 * kann, ist kein Zugangsschlüssel.
 *
 * Der Rechte-Entzug nennt anon und authenticated EINZELN: In Supabase stehen
 * über die Default-Privilegien direkte Rechte an diesen Rollen, die ein Entzug
 * an PUBLIC nicht erreicht (am 29.07.2026 an exec_sql nachgestellt).
 */
export const SOCIAL_KONTEN_DDL = `
  CREATE TABLE IF NOT EXISTS social_konten (
    plattform text PRIMARY KEY CHECK (plattform IN ('linkedin', 'instagram')),
    konto_id text NOT NULL,
    anzeigename text,
    access_token text NOT NULL,
    gueltig_bis timestamptz NOT NULL,
    scopes text[] NOT NULL DEFAULT '{}',
    aktualisiert_am timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE social_konten ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON social_konten FROM PUBLIC;
  REVOKE ALL ON social_konten FROM anon;
  REVOKE ALL ON social_konten FROM authenticated;
`;

/**
 * Wie viele Tage vor Ablauf gewarnt wird.
 *
 * Zwei Wochen, dieselbe Frist wie beim Förder-Beleg: lang genug, dass ein
 * verpasster Tag nichts kostet, kurz genug, dass die Warnung nicht zum
 * Dauerzustand wird und weggeklickt wird.
 */
export const SOCIAL_ABLAUF_WARNUNG_TAGE = 14;

export type AblaufBefund = {
  plattform: SocialPlattform;
  /** Negativ, wenn der Schlüssel bereits abgelaufen ist. */
  tageBisAblauf: number;
  abgelaufen: boolean;
  warnung: boolean;
};

/**
 * Zustand eines Kontos zum übergebenen Zeitpunkt.
 *
 * Der Zeitpunkt wird HEREINGEREICHT, nie aus der eigenen Uhr gezogen — dieselbe
 * Regel wie beim Förder-Verlauf: Eine Funktion mit eigener Uhr lässt sich nicht
 * gegen einen Stichtag testen.
 */
export function ablaufBefund(konto: SocialKonto, jetzt: Date): AblaufBefund {
  const bis = new Date(konto.gueltig_bis).getTime();
  const tage = Math.floor((bis - jetzt.getTime()) / 86_400_000);
  return {
    plattform: konto.plattform,
    tageBisAblauf: tage,
    abgelaufen: tage < 0,
    warnung: tage <= SOCIAL_ABLAUF_WARNUNG_TAGE,
  };
}
