#!/bin/sh
# Mods have no package.json, so node can't import their .js as modules: copy
# every file that doesn't import herdr to tests/build as .mjs, then run the tests.
set -e
cd "$(dirname "$0")/.."
rm -rf tests/build
find mods -name '*.js' ! -name main.js | while read -r f; do
  grep -q 'from "herdr"' "$f" && continue
  out="tests/build/${f#mods/}"; out="${out%.js}.mjs"
  mkdir -p "$(dirname "$out")"
  sed 's/\(from "\.[^"]*\)\.js"/\1.mjs"/' "$f" > "$out"
done
node --test tests/*.test.mjs
