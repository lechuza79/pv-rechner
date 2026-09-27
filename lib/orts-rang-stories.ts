import type { OrtsStory } from "./orts-stories";
import { rankMovement, type RankObservation } from "./orts-story-feed";

/** Generate a dated draft; neither a repeated observation nor a zero change is news. */
export function rankStory(base: OrtsStory, name: string, regionId: string, before: RankObservation, after: RankObservation): OrtsStory | null {
  const change = rankMovement(before, after, regionId);
  if (change === null || change === 0) return null;
  const old = before.ranks.find(r => r.regionId === regionId)!;
  const current = after.ranks.find(r => r.regionId === regionId)!;
  return {
    ...base,
    kennung: `rangbewegung-${base.kennung}-${after.sourceDate}`,
    titel: `${name}: von Platz ${old.rank} auf Platz ${current.rank}`,
    gemessen: base.gemessen,
    text: `${Math.abs(change)} ${Math.abs(change) === 1 ? "Platz" : "Plätze"} ${change > 0 ? "aufgestiegen" : "abgestiegen"} gegenüber dem Datenstand vom ${new Date(before.sourceDate).toLocaleDateString("de-DE", { timeZone: "UTC" })}. Verglichen werden dieselben ${after.members.length} Gemeinden.`,
    werte: [
      { name: `Platz am ${before.sourceDate}`, wert: old.rank, einheit: "" },
      { name: `Platz am ${after.sourceDate}`, wert: current.rank, einheit: "", haupt: true },
    ],
    grundlage: `${base.grundlage} Zwei gespeicherte Datenstände mit gleicher Vergleichsgruppe und Berechnungsmethode. Eine Rangänderung allein belegt keine Ursache; auch Nachmeldungen und die Entwicklung anderer Orte können beitragen.`,
    gewicht: 90,
  };
}
