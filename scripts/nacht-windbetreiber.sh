#!/bin/sh
# Wind farm operators: from the register to a released contact, one step after
# another so the machine is never flooded (load reached 1,000 when such runs
# overlapped other sessions, 22.09.2026). Same pattern as nacht-kontakte.sh.
# Nothing is sent. Log: scripts/.cache/nacht-windbetreiber-<date>.log in the main checkout.
#   sh scripts/nacht-windbetreiber.sh
set -u
cd "$(dirname "$0")/.."
LOG="$(git rev-parse --path-format=absolute --git-common-dir)/../scripts/.cache/nacht-windbetreiber-$(date +%F).log"
schritt() { echo "=== $(date +%T) $*" >>"$LOG"; "$@" >>"$LOG" 2>&1 || echo "!!! FEHLGESCHLAGEN: $*" >>"$LOG"; }
zweifach() {
  # Both halves report their own failure; a dropped background status turns a
  # broken step into a silent one.
  echo "=== $(date +%T) $*" >>"$LOG"
  "$@" --part=0 --parts=2 >>"$LOG" 2>&1 & pid=$!
  "$@" --part=1 --parts=2 >>"$LOG" 2>&1 || echo "!!! FEHLGESCHLAGEN: $* --part=1" >>"$LOG"
  wait "$pid" || echo "!!! FEHLGESCHLAGEN: $* --part=0" >>"$LOG"
}

echo "=== Start $(date)" >"$LOG"
# 1. Operators from the latest register export (reads the cache if this export was read before).
schritt npx tsx scripts/windbetreiber-refresh.ts --register
# 2. Every stored verdict under today's rules (cache only), then the websites
#    the register itself offers, proven by their imprint.
schritt npx tsx scripts/windbetreiber-refresh.ts --neu-bewerten
schritt npx tsx scripts/windbetreiber-refresh.ts --impressum
# 3. One search per address for the rest, largest capacity first.
schritt npx tsx scripts/windbetreiber-refresh.ts --suche
# 4. Contacts on every proven website, then written and released.
zweifach npx tsx scripts/windbetreiber-kontakte.ts --mode=research
schritt npx tsx scripts/windbetreiber-kontakte.ts --mode=evaluate
schritt npx tsx scripts/windbetreiber-kontakte.ts --mode=apply --schreiben
schritt npx tsx scripts/kontakte-freigabe.ts --bestand=windbetreiber --schreiben
# 5. The stock against all others, the completeness report, the list for the manual pass.
schritt npx tsx scripts/bestaende-abgleich.ts
schritt npx tsx scripts/windbetreiber-refresh.ts --stand
schritt npx tsx scripts/windbetreiber-refresh.ts --offen
echo "=== Ende $(date)" >>"$LOG"
