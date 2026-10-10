import { cache } from "react";
import { getStrommixYtd } from "../../../lib/strommix-ytd";
import { getNuclearImport, nf1 } from "./figure";
import { nuclearDailyEnergy } from "../../../lib/nuclear-daily";

export const getSeoVariant = cache(async () => {
  const { chartResult, asOf } = await getNuclearImport();
  const ytd = await getStrommixYtd(asOf);
  const daily = nuclearDailyEnergy(chartResult?.data ?? [], asOf.toISOString());
  const latest = daily.days.at(-1);
  const yearAnswer = ytd
    ? `In den ${ytd.weeks} erfassten Wochen ${ytd.year} wurden rechnerisch ${nf1(ytd.nuclearGwh / 1000)} TWh Atomstrom nach Deutschland importiert.`
    : "Die Jahresmenge des rechnerischen Atomstrom-Imports ist aktuell nicht verfügbar.";
  // Compare calendar dates in Germany, independent of cached retrieval time.
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const dayLabel = latest?.date === yesterday ? "Gestern" : latest
    ? `Am ${new Date(`${latest.date}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" })}`
    : "Gestern";
  const dayAnswer = latest?.gwh != null
    ? `${dayLabel} waren es ${nf1(latest.gwh)} GWh${latest.partial ? " als bisher erfasste Teilmenge. Für diesen Tag fehlen noch Messintervalle." : "."}`
    : "Für gestern liegt noch keine auswertbare Strommenge vor.";
  const previous = daily.days.at(-2);
  const comparable = latest?.gwh != null && previous?.gwh != null && !latest.partial && !previous.partial;
  const difference = comparable ? latest!.gwh! - previous!.gwh! : null;
  const dayComparison = comparable
    ? `Am Vortag waren es ${nf1(previous!.gwh!)} GWh. ${difference === 0 ? "Die Tagesmengen waren gleich groß." : `Das sind ${nf1(Math.abs(difference!))} GWh ${difference! < 0 ? "weniger" : "mehr"}${previous!.gwh! > 0 ? `, eine Veränderung um ${nf1(Math.abs(difference! / previous!.gwh! * 100))} %` : ""}.`}`
    : "Ein Tagesvergleich wird nur bei zwei vollständig erfassten Tagen angegeben.";
  const ogParams = ytd ? new URLSearchParams({ view: "atomstrom", year: String(ytd.year), weeks: String(ytd.weeks), share: String(ytd.nuclearShare), twh: String(ytd.nuclearGwh / 1000) }) : new URLSearchParams({view:"brand", t:"Atomstrom-Import", s:"Aktuelle Strommengen, Herkunft und Einordnung"});
  return { ytd, daily, yearAnswer, dayAnswer, dayComparison, ogPath: `/api/og?${ogParams}` };
});
