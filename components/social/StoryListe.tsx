"use client";

import { StoryTisch } from "./StoryTisch";
import { space } from "../../lib/theme";
import type { Pruefung } from "../../lib/social-pruefung-kern";
import type { Befund as MechanikBefund } from "../../lib/social-mechanik";
import type { SocialPost } from "../../lib/social-posts";

// Die Stories einer Kategorie untereinander.
//
// Sieht nach Zeremonie aus und ist keine: Der Tisch nimmt seit dem
// Freigabe-Umbau eine Rückmeldung entgegen (`onPruefung`), und eine Funktion
// darf eine Server-Komponente nicht durchreichen. Ohne diese Hülle wäre der
// Tisch ein Einstiegspunkt in den Browser-Teil, und Next müsste ALLE seine
// Eigenschaften für übertragbar halten — auch die, die nur eine andere
// Browser-Komponente je setzt. Die Grenze steht damit an einer Stelle, an der
// man sie sieht, statt als Warnung in der Werkzeugleiste.

export function StoryListe({
  eintraege,
}: {
  eintraege: {
    post: SocialPost;
    pruefungen: Pruefung[];
    abdruck: string;
    befunde: MechanikBefund[];
    gesendetAm: string | null;
  }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.huge * 1.5 }}>
      {eintraege.map(({ post, pruefungen, abdruck, befunde, gesendetAm }) => (
        <StoryTisch
          key={post.id}
          post={post}
          pruefungen={pruefungen}
          abdruck={abdruck}
          befunde={befunde}
          gesendetAm={gesendetAm}
        />
      ))}
    </div>
  );
}
