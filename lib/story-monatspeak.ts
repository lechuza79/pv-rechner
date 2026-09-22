import type { StoryConcept } from "./story-konzepte";

/** Editorial thresholds, not a significance model. Shared by every municipality. */
export const MONTH_PEAK_RULES = { version: "single-month-v1", minMonths: 12, minCount: 10, minLead: 2, lagMonths: 3 } as const;
export type MonthCount = { label: string; value: number };
export type MonthPeakInput = { name: string; months: MonthCount[]; asOf: string; sourceDate: string | null };
export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
}
function ordinal(month: string) { return Number(month.slice(0,4))*12+Number(month.slice(5,7))-1; }
export function evaluateMonthPeak(input: MonthPeakInput) {
  const sorted = [...input.months].sort((a,b)=>a.label.localeCompare(b.label));
  const valid = sorted.length > 0 && sorted.every((m,i)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m.label) && Number.isInteger(m.value) && m.value>=0 && (!i || ordinal(m.label)===ordinal(sorted[i-1].label)+1));
  const months = sorted.filter(m=>ordinal(m.label)<ordinal(input.asOf.slice(0,7))-MONTH_PEAK_RULES.lagMonths);
  const ranked = [...months].sort((a,b)=>b.value-a.value || b.label.localeCompare(a.label));
  const peak = ranked[0];
  const runnerUp = ranked[1];
  let reason = "";
  if(!valid) reason="Die Monatsreihe ist lückenhaft oder ungültig. Keine Story erzeugen.";
  else if(months.length<MONTH_PEAK_RULES.minMonths) reason="Weniger als zwölf abgeschlossene, ausreichend alte Monate. Noch kein Vergleich.";
  else if(!peak || peak.value<MONTH_PEAK_RULES.minCount) reason="Die Menge reicht für dieses Muster nicht: mindestens zehn erfasste Anlagen in einem Monat.";
  else if(peak.value===runnerUp?.value || peak.value<(runnerUp?.value??0)*MONTH_PEAK_RULES.minLead) reason="Kein klar abgesetzter Einzelmonat. Für dieses Muster entsteht keine Story; ein Verlauf kann trotzdem sinnvoll sein.";
  const accepted = !reason;
  return { accepted, reason, months, peak, runnerUp, retrospective: peak ? ordinal(input.asOf.slice(0,7))-ordinal(peak.label)>6 : false, publicationReady: accepted && !!input.sourceDate };
}

/** All copy, highlights and comparison labels come from the same evaluated input. */
export function buildMonthPeakConcept(input: MonthPeakInput): { decision: ReturnType<typeof evaluateMonthPeak>; preview: StoryConcept } {
  const decision = evaluateMonthPeak(input);
  const { months, peak, runnerUp, accepted } = decision;
  const range = months.length ? `${monthLabel(months[0].label)}–${monthLabel(months.at(-1)!.label)}` : "Kein belastbarer Zeitraum";
  const period = peak ? monthLabel(peak.label) : "";
  const total = months.reduce((sum,m)=>sum+m.value,0);
  const share = total && peak ? Math.round(peak.value/total*100) : 0;
  const context = runnerUp?.value ? `Der nächsthöchste Monatswert liegt bei ${runnerUp.value} Anlagen (${months.filter(m=>m.value===runnerUp.value).map(m=>monthLabel(m.label)).join(", ")}).` : "In den übrigen betrachteten Monaten ist keine weitere Anlage erfasst. Daraus wird kein Wachstumsfaktor berechnet.";
  const title = accepted ? `${peak.value} neue Balkonkraftwerke im ${period}` : "Kein Einzelmonatspeak";
  const teaser = accepted ? `${input.name}: ${peak.value} Anlagen sind für ${period} erfasst. ${context}` : decision.reason;
  const prefix = decision.retrospective ? "Rückblick" : "Solar vor Ort";
  return { decision, preview: {
    id:"zubaupeak",label:"Ein Monat sticht heraus",town:input.name,kind:"timeline",title,teaser,period,
    values:months,unit:"Balkonkraftwerke je Inbetriebnahmemonat",
    highlightedMonths:accepted?[peak.label]:[], chartSummary:accepted?`${period}: ${peak.value} Anlagen`:"Monatsverlauf ohne hervorgehobenen Einzelmonat",
    evidence:`${prefix} · ${accepted?"Muster passt":"Keine Story für dieses Muster"} · ${input.sourceDate?`Datenstand ${input.sourceDate}`:"Zeitraum vorhanden · gemeinsamer Datenstand noch abzugleichen"}`,
    copy:accepted?[
      {heading:"Ein Monat fällt auf",text:`Im betrachteten Zeitraum ${range} sind insgesamt ${total} Anlagen erfasst. Davon entfallen ${share} Prozent auf ${period}. ${context}`},
      {heading:"Was sich daraus ablesen lässt",text:`Die Anlagen sind nach ihrem Inbetriebnahmemonat gezählt. Ob eine lokale Aktion zu dem Ausschlag beigetragen hat, ist damit nicht belegt. Die Grafik zeigt die gesamte verfügbare Vergleichsreihe, nicht nur den herausgegriffenen Monat.`},
    ]:[],
    social:accepted?`${prefix} auf ${input.name}: ${peak.value} neue Balkonkraftwerke im ${period}.\n\n${context} Betrachtet haben wir ${months.length} Monate (${range}).\n\n${share} Prozent der ${total} erfassten Anlagen dieses Zeitraums entfallen auf diesen einen Monat. Ein klarer Schwerpunkt – die Ursache lässt sich aus dem Register allein nicht erklären.\n\nMonatswerte und Vergleichsgrundlage gibt es in der vollständigen Story.`:"",
    widget:"Der bestehende Zubau-Verlauf bleibt aktuell. Diese Story hält einen einzelnen Monat und dessen Vergleichsstand fest; kein zusätzliches Widget nötig.",widgetCta:"Aktuellen Zubau ansehen",
    seo:"Teilbarer lokaler Befund mit dauerhaftem Detail. Kein zusätzlicher SEO-Text ohne Erkenntnis.",
    beforeRelease:"Ein gemeinsames Muster für alle Orte. Schwellen sind redaktionelle Auswahlregeln, kein statistischer Test. Exportdatum, Ortszuordnung und Datenqualität vor Veröffentlichung prüfen; alte Ereignisse als Rückblick kennzeichnen.",
    comparison:{scope:`Verglichen werden ${months.length} einzelne Kalendermonate (${range}) derselben Gemeinde. Nur in der Auswertung weiterhin in Betrieb befindliche Steckersolaranlagen; Zuordnung nach Inbetriebnahmedatum. Die drei jüngsten abgeschlossenen Monate und der laufende Monat sind ausgeschlossen.`,limitation:"Beschreibender Vergleich, keine Saisonbereinigung und kein Signifikanztest. Fehlende Monate dürfen nicht als null ergänzt werden, solange die Datenabdeckung unklar ist. Nachmeldungen und Stilllegungen können spätere Auswertungen verändern.",windows:months.map(m=>({label:monthLabel(m.label),value:m.value}))}
  }};
}
