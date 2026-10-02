#!/bin/bash
set -euo pipefail

# The firewall is the reason this container exists, so refuse to start the
# workload when it cannot be established (fail closed).
if [ "$(id -u)" -eq 0 ]; then
  /usr/local/bin/project-firewall.sh
else
  echo "ERROR: entrypoint must run as root to set up the firewall" >&2
  exit 1
fi

exec "$@"
