"use client";

import { useState } from "react";
import MunicipalStoryPreview, { MunicipalStoryModal } from "../../../scripts/municipality-preview/StorySwipePreview";
import type { StoryConcept } from "../../../lib/story-konzepte";
import geschichten from "./orts-geschichten.json";
import kurztitel from "./orts-geschichten-kurztitel.json";

/**
 * Town stories on the homepage: the shared swipe strip and, on click, the
 * shared reader of THAT town — the same two components the municipality page
 * uses, no second dialog.
 *
 * Content is a dated snapshot of real municipalities (register export named in
 * every story); each story carries its own "Stand". It does not claim to be
 * live. Refresh: regenerate the JSON from the story pool when the register
 * run moves (OFFEN: the generator is not in the repo yet).
 */

type Eintrag = { story: StoryConcept; bild: { art: string }; ags: string; name: string };
const alle = geschichten as unknown as Eintrag[];
const titel = kurztitel as Record<string, string>;
const MASTR_DOWNLOAD = "https://www.marktstammdatenregister.de/MaStR/Datendownload";

// Alternate the visual families across the loop, never the same town twice in a row.
function vorschau(): Eintrag[] {
  const liste: Eintrag[] = [];
  const nutzung = new Map<string, number>();
  for (const art of ["anteilsdonut", "donut", "saeule", "anteilsdonut", "donut", "saeule"]) {
    const kuerzlich = new Set(liste.slice(-2).map((e) => e.ags));
    if (liste.length === 5) kuerzlich.add(liste[0].ags);
    const kandidaten = alle
      .filter((e) => e.bild.art === art && !liste.includes(e) && !kuerzlich.has(e.ags))
      .sort((a, b) => (nutzung.get(a.ags) ?? 0) - (nutzung.get(b.ags) ?? 0));
    const e = kandidaten[0];
    if (e) {
      liste.push(e);
      nutzung.set(e.ags, (nutzung.get(e.ags) ?? 0) + 1);
    }
  }
  return liste;
}
const VORSCHAU = vorschau();

export default function OrtsGeschichten() {
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const ort = gewaehlt === null ? null : alle[gewaehlt];
  const ortsGeschichten = ort ? alle.filter((e) => e.ags === ort.ags).map((e) => e.story) : [];
  const start = ort ? ortsGeschichten.findIndex((s) => s.id === ort.story.id) : 0;

  return (
    <>
      <MunicipalStoryPreview
        stories={VORSCHAU.map((e) => ({ ...e.story, thumbLabel: titel[e.story.id] ?? e.story.title }))}
        name="Dein Ort"
        surfaceScheme="light"
        visualScheme="light"
        showHeader={false}
        showDate={false}
        showTown
        paused={gewaehlt !== null}
        onStoryOpen={(story: StoryConcept) => setGewaehlt(alle.findIndex((e) => e.story.id === story.id))}
      />
      <figcaption className="av-story-source">
        Quelle:{" "}
        <a href={MASTR_DOWNLOAD} target="_blank" rel="noreferrer">
          Bundesnetzagentur · Marktstammdatenregister
        </a>
      </figcaption>
      {ort && (
        <MunicipalStoryModal
          key={ort.ags}
          stories={ortsGeschichten}
          name={ort.name}
          initial={start}
          surfaceScheme="dark"
          onClose={() => setGewaehlt(null)}
        />
      )}
    </>
  );
}
