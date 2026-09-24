/** Types for the extraction the takeover and the guard both call. */
export type StatischeSektionen = {
  _hinweis: string;
  gespiegelt: string[];
  einleitung: { kicker: string; titel: string; text: string };
  werkzeuge: { kennung: string; hinweis: string | null; titel: string; text: string; links: { text: string; href: string }[] }[];
  atlas: { kicker: string; titel: string; text: string; punkte: string[]; link: { text: string; href: string } };
  ratgeber: {
    titel: string;
    alle: { text: string; href: string };
    eintraege: { kennung: string; bereich: string; titel: string; href: string }[];
  };
  organisationen: { kicker: string; titel: string; eintraege: { titel: string; text: string; href: string }[] };
};
export function lesen(): StatischeSektionen;
