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
  /**
   * Bei welcher Warnstufe zuletzt gemeldet wurde (siehe WARNSTUFEN_TAGE).
   * `null` heißt: noch nie gewarnt. Verhindert, dass derselbe Hinweis bei jedem
   * Lauf erneut zugestellt wird.
   */
  gewarnt_bei_stufe: number | null;
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
  ALTER TABLE social_konten ADD COLUMN IF NOT EXISTS gewarnt_bei_stufe int;
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

/**
 * Restlaufzeiten, bei denen gemeldet wird — absteigend.
 *
 * Gestaffelt statt täglich, weil der Gesundheitscheck alle drei Stunden läuft:
 * Eine Meldung „ab jetzt warnen" ergäbe über hundert Mails in zwei Wochen, und
 * wer so viele bekommt, filtert den Absender weg und verpasst dann die eine,
 * die zählt. Die Stufe wird am Konto vermerkt; gemeldet wird nur, wenn eine
 * NIEDRIGERE Stufe erreicht ist als zuletzt.
 */
export const WARNSTUFEN_TAGE = [14, 7, 3, 1, 0] as const;

export type AblaufBefund = {
  plattform: SocialPlattform;
  /** Negativ, wenn der Schlüssel bereits abgelaufen ist. */
  tageBisAblauf: number;
  abgelaufen: boolean;
  warnung: boolean;
};

/**
 * Die erreichte Warnstufe, oder null wenn noch keine erreicht ist.
 * Ein abgelaufener Zugang landet auf der untersten Stufe (0).
 */
export function warnstufe(tageBisAblauf: number): number | null {
  const erreicht = WARNSTUFEN_TAGE.filter((s) => tageBisAblauf <= s);
  return erreicht.length ? Math.min(...erreicht) : null;
}

/**
 * Soll jetzt gemeldet werden? Nur, wenn eine Stufe erreicht ist, die tiefer
 * liegt als die zuletzt gemeldete.
 */
export function sollWarnen(tageBisAblauf: number, zuletztGemeldet: number | null): boolean {
  const stufe = warnstufe(tageBisAblauf);
  if (stufe === null) return false;
  return zuletztGemeldet === null || stufe < zuletztGemeldet;
}

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
