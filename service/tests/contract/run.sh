#!/usr/bin/env bash
# Contract conformance check (A.9): the RUNNING service vs ../../openapi.yaml.
# Usage: BASE_URL=http://localhost:3000 bash tests/contract/run.sh
# Requires: pip install schemathesis
#
# Deliberately excluded (recorded in docs/decisions/0002-implementasi.md):
#   positive_data_acceptance  - well-formed bodies may legitimately get 409/422
#   unsupported_method        - the framework answers 404, not 405
#   coverage phase            - sends undeclared query params and expects 400
set -euo pipefail
SPEC="$(cd "$(dirname "$0")/../../.." && pwd)/openapi.yaml"
schemathesis run "$SPEC" --url "${BASE_URL:-http://localhost:3000}" \
  --checks all \
  --exclude-checks positive_data_acceptance,unsupported_method \
  --phases examples,fuzzing,stateful
