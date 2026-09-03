/**
 * Wo im Weg ein Fund steht: Bucket → Entwurf → Beitrag → geplant.
 *
 * OHNE SERVER-BINDUNG, und das ist der Grund für dieses eigene Modul. Die
 * Stände standen zuerst bei der Ablage — die liest die Datenbank und ist
 * deshalb serverseitig. Die Liste im Browser braucht aber die Beschriftungen,
 * und der Aufbau brach mit „importiert etwas, das nur auf dem Server läuft".
 * Dieselbe Trennung wie beim Aktualisierungsstand der Rechner: Das Auflösen
 * gehört auf den Server, das Beschriften darf überall passieren.
 *
 * DIE STÄNDE SIND DER WEG, NICHT EINE BEWERTUNG. „Vorgemerkt" allein sagte
 * nicht, ob schon jemand daran gearbeitet hat — und genau das ist die Frage,
 * mit der man vor einer Liste von sechshundert Funden steht.
 */

export type FundStand = "offen" | "vorgemerkt" | "verworfen" | "beitrag" | "geplant";

export const FUND_STAND_LABEL: Record<FundStand, string> = {
  offen: "offen",
  vorgemerkt: "vorgemerkt",
  verworfen: "verworfen",
  beitrag: "Beitrag",
  geplant: "geplant",
};

/**
 * Was ein Mensch im Bucket selbst setzen kann.
 *
 * Die übrigen zwei folgen aus dem, was anderswo passiert — sie hier anzubieten
 * hieße, zwei Wahrheiten zu führen.
 */
export const HAND_STAENDE: FundStand[] = ["offen", "vorgemerkt", "verworfen"];

/**
 * Die zwei Stände, die sich nicht setzen lassen, sondern folgen.
 *
 * ABGELEITET, NICHT GESPEICHERT. Ein Fund ist „Beitrag", sobald ein fertiger
 * Beitrag seine Kennung trägt, und „geplant", sobald der einen Platz im
 * Kalender hat. Beides irgendwo mitzuschreiben hieße, dieselbe Tatsache an zwei
 * Orten zu führen — und der zweite ist der falsche, sobald jemand vergisst, ihn
 * nachzuziehen. Genau diese Fehlerklasse steckte im Förderkatalog, bis das
 * Prüfdatum nur noch aus einer Quelle kam.
 *
 * EIN VERWORFEN BLEIBT VERWORFEN: Wer einen Fund weggeworfen hat, soll ihn
 * weggeworfen sehen — auch wenn zufällig ein gleichnamiger Beitrag vorliegt.
 * Sonst überschriebe die Ableitung eine Entscheidung, die ein Mensch anders
 * getroffen hat.
 */
export function standMitAbleitung(
  fund: { kennung: string; stand: FundStand },
  beitragsKennungen: Set<string>,
  geplanteKennungen: Set<string>,
): FundStand {
  if (fund.stand === "verworfen") return "verworfen";
  if (geplanteKennungen.has(fund.kennung)) return "geplant";
  if (beitragsKennungen.has(fund.kennung)) return "beitrag";
  return fund.stand;
}
