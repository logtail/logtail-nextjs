#!/usr/bin/env bash
# Plans the live legs of the E2E workflow: the Node.js, Next.js and React versions each leg runs examples/logger with,
# as exact versions. Prints the matrix as a JSON array, the include list of the live job in e2e.yml.
#   floor   the oldest versions package.json declares: the Node.js major of engines.node, the newest patch of the
#           Next.js minor of peerDependencies.next, and the newest release of the React major of peerDependencies.react
#   latest  the newest stable Node.js release, and what npm's latest tags name for Next.js and React
#   canary  the newest Node.js nightly build, Next.js's canary tag, and the newest React release that canary accepts
# @types/react and @types/react-dom follow React's major on the floor, their latest tag on the other legs.
# Env: LEG (all, floor, latest or canary), CLIENT_FROM (checkout or npm), and NODE_VERSION, NEXT_VERSION,
#      REACT_VERSION: versions (or npm tags and ranges) that replace the planned ones in every leg.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

# A registry hiccup at schedule time should not file a Linear issue, so lookups are retried.
retry() {
  local attempt
  for attempt in 1 2 3; do
    "$@" && return
    [ "$attempt" = 3 ] || sleep 10
  done
  echo "$* failed 3 times" >&2
  return 1
}

# The newest version of npm package $1 that $2 names: an exact version, a tag such as latest, or a range.
newest() {
  local versions
  versions=$(retry npm view "$1@$2" version --json) || return 1
  jq -r 'if type == "array" then .[] else . end' <<<"$versions" | sort -V | tail -n 1
}

# The version of the newest Node.js release on nodejs.org, without a pre-release suffix such as -alpha.0.
newest_node() {
  retry curl -fsS -m 60 https://nodejs.org/dist/index.json \
    | jq -r '[.[].version | ltrimstr("v") | select(test("^[0-9]+\\.[0-9]+\\.[0-9]+$"))] | sort_by(split(".") | map(tonumber)) | last'
}

# The version of the newest Node.js nightly that has a Linux x64 build: a nightly's builds are uploaded one by one.
newest_node_nightly() {
  retry curl -fsS -m 60 https://nodejs.org/download/nightly/index.json \
    | jq -r '[.[] | select(.files | index("linux-x64"))] | sort_by(.date) | last | .version | ltrimstr("v")'
}

# The version a >= floor in package.json starts at, e.g. 15.0 for ">=15.0", or "" when it is no plain >= floor.
floor_of() { jq -r "$1" "$ROOT/package.json" | sed -n 's/^>= *\([0-9][0-9.]*\)$/\1/p'; }

FLOOR_NODE=$(floor_of .engines.node)
FLOOR_NEXT=$(floor_of .peerDependencies.next)
FLOOR_REACT=$(floor_of .peerDependencies.react)
for floor in "engines.node $FLOOR_NODE" "peerDependencies.next $FLOOR_NEXT" "peerDependencies.react $FLOOR_REACT"; do
  read -r field version <<<"$floor"
  [ -n "${version:-}" ] || { echo "package.json's $field is no plain >=X.Y floor, which is all this plan reads" >&2; exit 1; }
done

# The client the example installs: the tarball packed from the checkout, or the newest release on npm.
if [ "${CLIENT_FROM:-checkout}" = npm ]; then
  CLIENT=$(newest @logtail/next latest)
else
  CLIENT=$(jq -r .version "$ROOT/package.json")
fi

LEGS=$([ "${LEG:-all}" = all ] && echo "floor latest canary" || echo "$LEG")
MATRIX='[]'
for leg in $LEGS; do
  case "$leg" in
    floor)
      # The Node.js major, e.g. 18: setup-node installs its newest release.
      node=${FLOOR_NODE%%.*}
      next=$(newest next "$FLOOR_NEXT")
      react=$(newest react "${FLOOR_REACT%%.*}")
      types="${FLOOR_REACT%%.*}" ;;
    latest)
      node=$(newest_node)
      next=$(newest next latest)
      react=$(newest react latest)
      types=latest ;;
    canary)
      node=$(newest_node_nightly)
      next=$(newest next canary)
      react=$(newest react "$(retry npm view "next@$next" peerDependencies.react)")
      types=latest ;;
    *) echo "unknown leg $leg" >&2; exit 1 ;;
  esac
  node=${NODE_VERSION:-$node}
  [ -z "${NEXT_VERSION:-}" ] || next=$(newest next "$NEXT_VERSION")
  [ -z "${REACT_VERSION:-}" ] || react=$(newest react "$REACT_VERSION")
  types_react=$(newest @types/react "$types")
  types_react_dom=$(newest @types/react-dom "$types")
  for value in "$node" "$next" "$react" "$types_react" "$types_react_dom" "$CLIENT"; do
    [ -n "$value" ] && [ "$value" != null ] || { echo "the $leg leg could not be planned: node '$node', next '$next', react '$react', @types/react '$types_react', @types/react-dom '$types_react_dom', client '$CLIENT'" >&2; exit 1; }
  done
  MATRIX=$(jq -c --arg leg "$leg" --arg node "$node" --arg next "$next" --arg react "$react" \
    --arg types_react "$types_react" --arg types_react_dom "$types_react_dom" \
    --arg source "${CLIENT_FROM:-checkout}" --arg client "$CLIENT" '. + [{
      name: "\($leg) (Node.js \($node), Next.js \($next), React \($react))",
      leg: $leg, node: $node, next: $next, react: $react, types_react: $types_react, types_react_dom: $types_react_dom,
      source: $source, client: $client,
      # The floor runs on the oldest Ubuntu image GitHub offers, the other legs follow ubuntu-latest.
      runner: (if $leg == "floor" then "ubuntu-24.04" else "ubuntu-latest" end)
    }]' <<<"$MATRIX")
done
# Job names become artifact names (e2e-summary-<job name>), which must not contain any of these.
if jq -e 'any(.[].name; test("[:\"<>|*?/\\\\]"))' <<<"$MATRIX" >/dev/null; then
  echo "a job name holds a character artifact names do not allow: $(jq -c 'map(.name)' <<<"$MATRIX")" >&2
  exit 1
fi
echo "$MATRIX"
