#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Was der wöchentliche Suchlauf gefunden hat, als lesbares Protokoll.

Er läuft im Workflow nach dem Suchlauf und fällt die einzige Entscheidung, die
dort zu treffen ist: War der Lauf ein Erfolg?

EIN LEERER LAUF IST EIN BEFUND, KEIN ERFOLG. Findet die Suche gar nichts,
stimmt etwas mit den Daten nicht — über 11.000 Gemeinden und ein Dutzend Muster
liefern immer etwas. Still grün zu melden wäre der Fall „ein Lauf ohne Urteil",
den dieses Projekt als schlimmer einstuft als einen roten: Rot sieht man,
„nichts passiert" liest man als „alles in Ordnung".

Als eigene Datei und nicht als Text im Workflow, weil er sonst über die
Standardeingabe an Python geht — und von dort liest Python nach der
Locale-Einstellung statt als UTF-8. Die erste Zeile mit einem Umlaut bricht
den Lauf ab, mit einer Meldung, die nach einem Datenfehler aussieht.
"""
import json
import sys
from collections import Counter


def main() -> int:
    if len(sys.argv) < 2:
        print("::error::Kein Antwort-Datensatz übergeben.")
        return 1

    with open(sys.argv[1], encoding="utf-8") as f:
        daten = json.load(f)

    if "error" in daten:
        print(f"::error::Der Suchlauf meldet einen Fehler: {daten['error']}")
        return 1

    funde = daten.get("funde", [])
    geschrieben = daten.get("geschrieben", 0)

    print(f"{len(funde)} gerechnet, {geschrieben} im Vorrat")
    for muster, zahl in Counter(f["muster"] for f in funde).most_common():
        print(f"  {muster:22s} {zahl}")

    if geschrieben == 0:
        print("::error::Der Suchlauf hat nichts in den Vorrat geschrieben.")
        return 1

    # Die zeitgebundenen Funde müssen schnell raus — sie im Protokoll zu nennen
    # erspart den Blick in die Oberfläche.
    zeitnah = [f for f in funde if not f.get("evergreen")]
    if zeitnah:
        print(f"\nZeitnah ({len(zeitnah)}) — diese werden kalt:")
        for f in sorted(zeitnah, key=lambda x: -x.get("staerke", 0))[:8]:
            print("  - " + f["satz"][:150])
    else:
        # Kein Befund, aber erwähnenswert: Der Saisonvergleich sollte fast jede
        # Woche etwas liefern. Bleibt er über Wochen still, lohnt ein Blick.
        print("\nNichts Zeitgebundenes in diesem Lauf.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
