#!/bin/bash
# Start the local test server on 8773 (serving the repo root) if it is not already running.
cd "$(dirname "$0")/../.." || exit 1
curl -s -o /dev/null http://127.0.0.1:8773/ && exit 0
(setsid nohup python3 -m http.server 8773 --bind 127.0.0.1 > /dev/null 2>&1 &)
for i in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:8773/ && exit 0; sleep 0.3; done
echo "server did not start"; exit 1
