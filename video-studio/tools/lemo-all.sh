#!/bin/sh
# Render a 5 s preview of every lemo-opuscar style into video-studio/examples/lemo-opuscar--<style>.mp4
VS=$(cd "$(dirname "$0")/.." && pwd); LIB="$VS/../repos/lemomo-ai_lemo-opuscar"; LIB=$(cd "$LIB" && pwd)
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8 LEMO_OPUSCAR_HOME="$(cd "$LIB" && pwd -W)" LIB PY="$LIB/.venv/bin/python"
LOG="$VS/examples/lemo-previews.log"; : > "$LOG"
prev() { node "$VS/tools/lemo-preview.mjs" "$1" "$VS/examples/lemo-opuscar--$1.mp4" > "$VS/examples/.lemo-$1.log" 2>&1; }
prep() { D="$LIB/styles/$1/demo"; cd "$LIB"
  for f in tools/fonts.sh tools/fetch_fonts.sh; do [ -f "$D/$f" ] && sh "$D/$f" >/dev/null 2>&1; done
  [ -f "$D/fetch_fonts.mjs" ] && (cd "$D" && mkdir -p fonts && node fetch_fonts.mjs >/dev/null 2>&1)
  for f in tools/fonts.py tools/fetch_fonts.py; do [ -f "$D/$f" ] && "$PY" -X utf8 -I "$D/$f" "$D" >/dev/null 2>&1; done
  for f in "$D"/paper.py "$D"/*tex*.py "$D"/tools/*tex*.py "$D"/tools/paper*.py "$D"/tools/prep*.py "$D"/tools/fetch*.py "$D"/tools/plate*.py "$D"/prep*.py "$D"/fetch*.py; do [ -f "$f" ] && (cd "$LIB" && "$PY" -X utf8 -I "$f" "$D" >/dev/null 2>&1); done
  grep -q "fetch.sh hdri" "$D/build.sh" && sh tools/fetch.sh hdri >/dev/null 2>&1
  node core/render/events.mjs "$D" >/dev/null 2>&1; true; }
# a font the demo fetches from the web is missing (gitignored): put the library's own OFL face there so the page loads
fontfix() { L="$VS/examples/.lemo-$1.log"; n=0
  for f in $(grep -oE "/styles/$1/demo/[^ ,)]+\.(woff2|woff|ttf|otf)" "$L" | sort -u); do
    [ -f "$LIB$f" ] || { mkdir -p "$(dirname "$LIB$f")"; cp "$LIB/core/fonts/f0.woff2" "$LIB$f"; n=$((n+1)); }
  done; [ $n -gt 0 ]; }
for d in "$LIB"/styles/shadow-puppet/ "$LIB"/styles/*/; do s=$(basename "$d"); [ "$s" = _template ] && continue
  [ -d "$LIB/films/fire-$s" ] && { echo "$s skip (fire version)" >> "$LOG"; continue; }
  [ -s "$VS/examples/lemo-opuscar--$s.mp4" ] && { echo "$s skip" >> "$LOG"; continue; }
  if prev "$s"; then echo "$s ok" >> "$LOG"; continue; fi
  prep "$s"
  if prev "$s"; then echo "$s ok (after prep)" >> "$LOG"; continue; fi
  tries=0; while fontfix "$s" && [ $tries -lt 4 ]; do tries=$((tries+1)); prev "$s" && break; done
  if [ -s "$VS/examples/lemo-opuscar--$s.mp4" ] && grep -q "frames from" "$VS/examples/.lemo-$s.log"; then echo "$s ok (fallback font)" >> "$LOG"; else echo "$s FAIL: $(grep -v '^\s*$' "$VS/examples/.lemo-$s.log" | tail -2 | tr '\n' ' ' | cut -c1-200)" >> "$LOG"; rm -f "$VS/examples/lemo-opuscar--$s.mp4"; fi
done
echo ALLDONE >> "$LOG"
