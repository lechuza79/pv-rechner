/** Wording per level; the district texts are the default. Plain data, usable on server and client. */
export type RaceWording = {title:string;members:string;leaders:string;unit:string};
export const DISTRICT_RACE_WORDING: RaceWording = {title:"Welche Gemeinde hat die meisten Solaranlagen?",members:"Alle Gemeinden im Landkreis",leaders:"Die zehn führenden Gemeinden",unit:"Orte"};

/** What the page calls its members, per level. The district texts are the accepted originals. */
export const LEVEL_TEXT: Record<"landkreis" | "bundesland" | "de", {noun: string; member: string; overview: string; table: string; tableHeading: string; race: RaceWording}> = {
  landkreis: {noun: "Gemeinden", member: "Gemeinde", overview: "Gemeindeübersicht", table: "Alle Gemeinden in der ausführlichen Tabelle", tableHeading: "Die Gemeinden im Ranking", race: DISTRICT_RACE_WORDING},
  bundesland: {noun: "Kreise und kreisfreie Städte", member: "Kreis", overview: "Kreisübersicht", table: "Alle Kreise in der ausführlichen Tabelle", tableHeading: "Die Kreise im Ranking",
    race: {title: "Welcher Kreis hat die meisten Solaranlagen?", members: "Alle Landkreise und kreisfreien Städte", leaders: "Die zehn führenden Kreise", unit: "Kreise"}},
  de: {noun: "Bundesländer", member: "Bundesland", overview: "Länderübersicht", table: "Alle Bundesländer in der ausführlichen Tabelle", tableHeading: "Die Bundesländer im Ranking",
    race: {title: "Welches Bundesland hat die meisten Solaranlagen?", members: "Alle Bundesländer", leaders: "Die zehn führenden Bundesländer", unit: "Bundesländer"}},
};
