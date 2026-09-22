#!/bin/sh
# One night run that brings every population's contacts up to date, one step
# after another so the machine is never flooded (22.09.2026: running these in
# parallel with other sessions pushed the load to 1,000 and every test timed out).
# Nothing is sent. Log: scripts/.cache/nacht-kontakte-<date>.log in the main checkout.
#   sh scripts/nacht-kontakte.sh
set -u
cd "$(dirname "$0")/.."
LOG="$(git rev-parse --path-format=absolute --git-common-dir)/../scripts/.cache/nacht-kontakte-$(date +%F).log"
schritt() { echo "=== $(date +%T) $*" >>"$LOG"; "$@" >>"$LOG" 2>&1 || echo "!!! FEHLGESCHLAGEN: $*" >>"$LOG"; }
zweifach() {
  # Both halves must report their own failure: a background job whose status is
  # dropped turns a broken step into a silent one, and a run without a verdict
  # is worse than a red one.
  echo "=== $(date +%T) $*" >>"$LOG"
  "$@" --part=0 --parts=2 >>"$LOG" 2>&1 & pid=$!
  "$@" --part=1 --parts=2 >>"$LOG" 2>&1 || echo "!!! FEHLGESCHLAGEN: $* --part=1" >>"$LOG"
  wait "$pid" || echo "!!! FEHLGESCHLAGEN: $* --part=0" >>"$LOG"
}

echo "=== Start $(date)" >"$LOG"
# Craft businesses: the rules changed, so evaluate offline, write, release.
schritt npx tsx scripts/fachbetriebe-kontakte.ts --mode=evaluate
schritt npx tsx scripts/fachbetriebe-kontakte.ts --mode=apply --schreiben
schritt npx tsx scripts/kontakte-freigabe.ts --bestand=fachbetriebe --schreiben
# Utilities.
schritt npx tsx scripts/versorger-kontakte.ts --mode=evaluate
schritt npx tsx scripts/versorger-kontakte.ts --mode=apply --schreiben
schritt npx tsx scripts/kontakte-freigabe.ts --bestand=versorger --schreiben
# Press: close the gaps, then release every contact.
zweifach npx tsx scripts/presse-kontakte.ts --mode=research
zweifach npx tsx scripts/presse-kontakte.ts --mode=browser
schritt npx tsx scripts/presse-kontakte.ts --mode=evaluate
schritt npx tsx scripts/presse-kontakte.ts --mode=apply --schreiben
zweifach npx tsx scripts/kontakte-freigabe.ts --bestand=presse --schreiben
# Municipalities: re-evaluate under the current rules, then write.
zweifach npx tsx scripts/contact-municipal-v2.ts --mode=evaluate
schritt npx tsx scripts/contact-municipal-v2.ts --mode=summary
schritt npx tsx scripts/contact-municipal-v2.ts --mode=apply --schreiben
echo "=== Ende $(date)" >>"$LOG"
