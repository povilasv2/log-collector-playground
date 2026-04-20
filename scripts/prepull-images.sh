#!/usr/bin/env bash
# Local helper — pulls the same collector images the VPS timer does.
# (On the VPS, Ansible installs a rendered version of this at /usr/local/bin.)
set -euo pipefail

images=(
  "timberio/vector:0.54.0-alpine"
  "fluent/fluent-bit:3.1.7"
  "fluent/fluentd:v1.17-debian-1"
)

for img in "${images[@]}"; do
  echo "Pulling ${img}..."
  docker pull --quiet "${img}"
done
