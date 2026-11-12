#!/bin/sh
cd "$(dirname "$0")"
curl -s -o /dev/null http://localhost:4790/api/catalog || (nohup node video-studio/vs.mjs serve > video-studio/server.log 2>&1 &) ; sleep 2
(command -v open >/dev/null && open http://localhost:4790) || xdg-open http://localhost:4790
