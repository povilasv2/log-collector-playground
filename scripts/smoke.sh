#!/usr/bin/env bash
# End-to-end smoke test: pulls each collector's starter template from /api/templates,
# POSTs it to /api/run, and asserts exit 0 + expected substring in stdout.
#
# Usage: BASE_URL=http://localhost:3000 ./scripts/smoke.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
fail=0

run_case() {
  local collector="$1" expected="$2"

  local template_json
  template_json=$(curl -fsS "$BASE_URL/api/templates/$collector")

  local payload
  payload=$(jq --arg c "$collector" '{collector: $c, config: .config, input: .input}' \
    <<<"$template_json")

  local resp
  resp=$(curl -fsS -X POST "$BASE_URL/api/run" \
    -H 'content-type: application/json' \
    --data "$payload")

  local exit_code stdout stderr timed_out duration
  exit_code=$(jq -r '.exitCode' <<<"$resp")
  stdout=$(jq -r '.stdout'      <<<"$resp")
  stderr=$(jq -r '.stderr'      <<<"$resp")
  timed_out=$(jq -r '.timedOut' <<<"$resp")
  duration=$(jq -r '.durationMs' <<<"$resp")

  # Otel's debug exporter writes to stderr (internal logger). Check both streams.
  if ! grep -qF "$expected" <<<"$stdout$stderr"; then
    echo "FAIL: $collector missing '$expected' (exit=$exit_code timedOut=$timed_out)" >&2
    jq . <<<"$resp" >&2
    fail=1
    return
  fi
  echo "OK: $collector (exit=$exit_code timedOut=$timed_out ${duration}ms)"
}

run_case vector      '"user signed in"'
run_case fluent-bit  '"user signed in"'
run_case fluentd     '"user signed in"'
run_case otel        'user signed in'

exit "$fail"
