"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { Auswahl, type AuswahlEintrag } from "../Auswahl";

// Die Filterleiste des Story-Buckets: Suche · Status · Muster · Kommune ·
// Bundesland — in EINER Zeile.
//
// Vorher standen Status und Muster als zwei Reihen von Knöpfen darüber: bei
// zwölf Mustern und vier Ständen sind das sechzehn Schaltflächen, die zwei
// Bildschirmzeilen fressen und trotzdem nur zwei Fragen beantworten. Aufklapp-
// menüs zeigen dieselbe Auswahl in einer Zeile — und sie sagen, WAS gerade
// gewählt ist, statt es unter fünfzehn nicht gewählten zu verstecken.
//
// KOMMUNE UND BUNDESLAND SIND ZWEI FILTER. „Zeig mir alles über Bayern" und
// „alles über Fürfeld" sind zwei Suchen; in einer gemeinsamen Liste stünden
// sechzehn Länder zwischen zweihundert Gemeinden und wären dort nicht zu
// finden.
//
// Alles steht in der Adresse: Ein gefilterter Bucket muss sich verschicken und
// zurückspringen lassen.

const ALLE = "__alle__";

export function BucketFilter({
  staende,
  muster,
  kommunen,
  laender,
  gewaehlt,
}: {
  staende: AuswahlEintrag[];
  muster: AuswahlEintrag[];
  kommunen: AuswahlEintrag[];
  laender: AuswahlEintrag[];
  gewaehlt: {
    stand: string;
    muster: string;
    ort: string;
    land: string;
    zeit: string;
    suche: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(gewaehlt.suche);

  // Die Adresse ist die Wahrheit: Wer zurückspringt, findet sein Suchwort wieder.
  useEffect(() => setText(gewaehlt.suche), [gewaehlt.suche]);

  function gehe(aenderung: Record<string, string | null>) {
    const q = new URLSearchParams(params?.toString() ?? "");
    for (const [k, w] of Object.entries(aenderung)) {
      if (w && w !== ALLE) q.set(k, w);
      else q.delete(k);
    }
    const t = q.toString();
    router.push(t ? `/admin/redaktion/bucket?${t}` : "/admin/redaktion/bucket");
  }

  const mitAlle = (liste: AuswahlEintrag[], label: string): AuswahlEintrag[] => [
    { schluessel: ALLE, name: label },
    ...liste,
  ];

  const nameVon = (liste: AuswahlEintrag[], wert: string, fallback: string) =>
    liste.find((e) => e.schluessel === wert)?.name ?? fallback;

  const etwasGesetzt =
    gewaehlt.stand ||
    gewaehlt.muster ||
    gewaehlt.ort ||
    gewaehlt.land ||
    gewaehlt.zeit ||
    gewaehlt.suche;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: space.sm,
        marginBottom: space.md,
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          gehe({ suche: text.trim() || null });
        }}
        style={{ flex: "1 1 240px", minWidth: 200, display: "flex" }}
      >
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Suchen — Satz und Grundlage"
          aria-label="Im Story-Bucket suchen"
          style={{
            width: "100%",
            font: "inherit",
            fontSize: 13,
            padding: pad("xs", "sm"),
            borderRadius: v("--radius-sm"),
            border: `1px solid ${v("--color-border")}`,
            background: v("--color-bg"),
            color: v("--color-text-primary"),
          }}
        />
      </form>

      <Auswahl
        titel={gewaehlt.stand ? nameVon(staende, gewaehlt.stand, gewaehlt.stand) : "Status — alle"}
        eintraege={mitAlle(staende, "alle")}
        aktiv={gewaehlt.stand || ALLE}
        onWahl={(w) => gehe({ stand: w })}
        breite={150}
        suchbar={false}
      />

      <Auswahl
        titel={gewaehlt.muster ? nameVon(muster, gewaehlt.muster, gewaehlt.muster) : "Muster — alle"}
        eintraege={mitAlle(muster, "alle")}
        aktiv={gewaehlt.muster || ALLE}
        onWahl={(w) => gehe({ muster: w })}
        breite={165}
        suchPlatzhalter="Muster suchen"
      />

      <Auswahl
        titel={gewaehlt.ort || "Kommune — alle"}
        eintraege={mitAlle(kommunen, "alle")}
        aktiv={gewaehlt.ort || ALLE}
        onWahl={(w) => gehe({ ort: w })}
        breite={175}
        suchPlatzhalter="Kommune suchen"
        // Keine Pfeile bei zweihundert Kommunen: Der Pfeil wäre ein
        // Versprechen, das niemand einlöst.
        pfeile={false}
      />

      <Auswahl
        titel={
          gewaehlt.zeit === "evergreen"
            ? "Evergreens"
            : gewaehlt.zeit === "zeitnah"
              ? "zeitnah"
              : "Haltbarkeit — alle"
        }
        eintraege={[
          { schluessel: ALLE, name: "alle" },
          { schluessel: "evergreen", name: "Evergreens" },
          { schluessel: "zeitnah", name: "zeitnah" },
        ]}
        aktiv={gewaehlt.zeit || ALLE}
        onWahl={(w) => gehe({ zeit: w })}
        breite={165}
        suchbar={false}
      />

      <Auswahl
        titel={gewaehlt.land || "Bundesland — alle"}
        eintraege={mitAlle(laender, "alle")}
        aktiv={gewaehlt.land || ALLE}
        onWahl={(w) => gehe({ land: w })}
        breite={185}
        suchbar={false}
      />

      {etwasGesetzt && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push("/admin/redaktion/bucket");
          }}
          style={{
            font: "inherit",
            fontSize: 13,
            background: "transparent",
            color: v("--color-text-muted"),
            border: "none",
            padding: pad("xs", "sm"),
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          zurücksetzen
        </button>
      )}
    </div>
  );
}
