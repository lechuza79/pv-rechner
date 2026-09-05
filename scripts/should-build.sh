#!/usr/bin/env bash
# =============================================================================
# Vercel Ignored Build Step — entscheidet vor jedem Bau: ist der noetig?
# -----------------------------------------------------------------------------
# Exit 0 = Bau ueberspringen · Exit 1 = bauen
#
# Eingetragen in der Vercel-Projekteinstellung (Settings -> Git -> Ignored
# Build Step) als:  bash scripts/should-build.sh
#
# HERKUNFT: Uebernommen am 26.08.2026 aus dem Schwesterprojekt life-is-a-binge,
# wo die Fallstricke bereits durch echte Ausfaelle gelernt wurden. Nicht neu
# gebaut — die dortige Fassung kennt drei Fallen, die man sonst einzeln wieder
# hineinlaufen muesste.
#
# WAS VORHER HIER STAND, und warum es weg musste:
#
#   git diff --quiet HEAD^ HEAD -- ":!*.md" ":!.claude/"
#
# Diese Zeile hatte einen Fehler, der in der Projektanweisung als BLOCKER steht
# und real Schaden angerichtet hat: Bei einem MERGE-Commit vergleicht `HEAD^`
# gegen den ERSTEN Elternteil. Wer origin/main in seinen Zweig mergt und dann
# vorspult, dessen Tip zeigt als Diff nur, was aus main kam — die eigene Arbeit
# steckt im zweiten Elternteil und ist fuer den Filter unsichtbar. Kam von dort
# nur eine Markdown-Zeile, wurde der Bau uebersprungen. Am 19.08.2026 blieben so
# zehn neue Foerderprogramme unsichtbar, waehrend git, CI und der Push alle
# gruen waren. Gemessen ueber den Abrechnungsmonat 25.07.–24.08.2026: 14 von 174
# Zusammenfuehrungen liefen in genau diese Falle.
#
# Dieses Skript vergleicht stattdessen gegen den zuletzt ERFOLGREICH
# AUSGELIEFERTEN Stand. Die Merge-Falle ist damit konstruktiv weg: Es wird nie
# gegen einen Elternteil verglichen, sondern gegen das, was wirklich live ist.
#
# Uebersprungen wird, wenn ALLE geaenderten Dateien unter eines faellt:
#   - *.md      (Markdown irgendwo im Repo)
#   - .claude/  (Claude-Konfiguration, Gedaechtnis, Plaene)
#   - docs/     (Vorfallsberichte, Konzepte — nie Teil des Web-Builds)
#
# Notausgang: "[force build]" in einer Commit-Nachricht baut immer.
#
# RICHTUNG DER VORSICHT: Uebersprungen wird nur, wenn der Vergleich gegen den
# exakt ausgelieferten Stand moeglich war. Laesst sich der Bezugspunkt nicht
# herstellen, wird GEBAUT. Ein unnoetiger Bau kostet gut eine Minute; ein still
# uebersprungener kostet eine Auslieferung, die niemandem auffaellt.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# VORSCHAU-BAUTEN GAR NICHT ERST STARTEN.
#
# Es gibt kein Staging, und die Vorschau-Umgebung hat keinen Datenbank-
# schluessel — jeder Zweig-Push baute eine Vorschau, die zuverlaessig
# scheiterte: Bauminuten plus Fehlermail pro Push, bei rund elf parallelen
# Arbeitsstaenden dauerhaft.
#
# Die Bedingung ist bewusst POSITIV formuliert (`= "preview"`, nicht
# `!= "production"`): Waere VERCEL_ENV je leer, wuerde die Negativform JEDEN Bau
# ueberspringen, auch den der Produktion.
#
# Wer Vorschauen doch braucht: Datenbankschluessel in die Vorschau-Umgebung
# legen UND diesen Block entfernen — beides, sonst scheitern sie weiter.
# -----------------------------------------------------------------------------
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  echo "🛑 Vorschau-Umgebung — kein Bau (kein Staging vorhanden)."
  exit 0
fi

# -----------------------------------------------------------------------------
# Bezugspunkt: der Commit, der auf dieser Umgebung gerade live ist.
#
# VERCEL_GIT_PREVIOUS_SHA ist der Stand der letzten ERFOLGREICHEN Auslieferung
# fuer Projekt und Zweig — er rueckt NICHT vor, wenn dieses Skript einen Bau
# abbricht. Jeder uebersprungene Bau laesst den Bezugspunkt also weiter
# zurueckfallen. Vercel klont flach (`--depth=10`); driftet der Bezugspunkt
# ueber zehn Commits hinaus, ist er im Arbeitsklon nicht mehr da. Genau das ist
# dem Schwesterprojekt am 15.07.2026 passiert (Bezugspunkt 16 Commits zurueck).
# Das ist der Teufelskreis: Ueberspringen erzeugt Drift, Drift macht den
# Bezugspunkt unerreichbar.
#
# Deshalb: Ist der Stand bekannt, aber lokal nicht vorhanden, wird er
# nachgeholt statt einen Bereich zu raten. Nur wenn am Ende kein brauchbarer
# Bezugspunkt dasteht, wird gebaut.
# -----------------------------------------------------------------------------
BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"

commit_exists() {
  git cat-file -e "${1}^{commit}" 2>/dev/null
}

if [ -n "$BASE" ] && ! commit_exists "$BASE"; then
  echo "🔎 Bezugspunkt $BASE fehlt im flachen Klon — wird nachgeholt."
  git fetch --depth=1 origin "$BASE" 2>/dev/null \
    || git fetch --deepen=100 origin 2>/dev/null \
    || true
fi

if [ -z "$BASE" ]; then
  echo "⚠️  VERCEL_GIT_PREVIOUS_SHA ist nicht gesetzt (erste Auslieferung auf"
  echo "    diesem Zweig, oder keine erfolgreiche zum Vergleichen) — es wird gebaut."
  exit 1
fi

if ! commit_exists "$BASE"; then
  echo "⚠️  Bezugspunkt $BASE auch nach dem Nachholen unerreichbar — es wird gebaut."
  exit 1
fi

echo "🔍 Vergleich des ausgelieferten Stands gegen HEAD: ${BASE}..HEAD"

# Notausgang: "[force build]" in irgendeiner Commit-Nachricht seit dem Bezugspunkt.
if ! FORCE_LOG=$(git log "${BASE}..HEAD" --pretty=%B 2>/dev/null); then
  echo "⚠️  Commit-Log seit dem Bezugspunkt nicht lesbar — es wird gebaut."
  exit 1
fi

if printf '%s' "$FORCE_LOG" | grep -qF '[force build]'; then
  echo "🚨 [force build] in einer Commit-Nachricht gefunden — es wird gebaut."
  exit 1
fi

# Welche Dateien unterscheiden den ausgelieferten Stand von HEAD?
# Zwei Punkte mit Absicht: Drei Punkte brauchen einen Merge-Basis-Commit, den
# ein flacher Klon (oder ein mit --depth=1 nachgeholter Bezugspunkt) nicht
# unbedingt hat. Zwei Punkte vergleichen ausserdem gegen das, was wirklich live
# ist — damit werden auch Ruecknahmen und erzwungene Pushes erfasst.
if ! CHANGED=$(git diff --name-only "$BASE" HEAD 2>/dev/null); then
  echo "⚠️  Vergleich gegen den Bezugspunkt fehlgeschlagen — es wird gebaut."
  exit 1
fi

if [ -z "$CHANGED" ]; then
  # Baumgleich — so sieht aber auch ein von Hand ausgeloestes "Redeploy" aus.
  # Der Absicht folgen und bauen.
  echo "⚠️  Keine erkennbaren Dateiaenderungen — es wird trotzdem gebaut."
  exit 1
fi

echo ""
echo "📝 Geaenderte Dateien:"
echo "$CHANGED" | sed 's/^/   /'
echo ""

# Uebersprungen wird nur, was den ausgelieferten Web-Build nachweislich nicht
# beruehrt. BEWUSST NICHT dabei: scripts/** und .github/** — die Waechter-Laeufe
# holen sich ihren Stand aus dem Repo, und eine Aenderung dort soll ausgeliefert
# werden.
NON_SKIPPABLE=$(echo "$CHANGED" | grep -Ev '^(.*\.md|\.claude/.*|docs/.*)$' || true)

if [ -z "$NON_SKIPPABLE" ]; then
  echo "🛑 Nur Dokumentation geaendert — Bau wird uebersprungen."
  echo "   Trotzdem bauen: '[force build]' in eine Commit-Nachricht schreiben."
  exit 0
fi

echo "✅ Bau noetig — diese Dateien sind keine Dokumentation:"
echo "$NON_SKIPPABLE" | sed 's/^/   /'
exit 1
