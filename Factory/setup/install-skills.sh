#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js e npm são necessários para executar o bootstrap das skills." >&2
  exit 1
fi

# Desabilita a telemetria opcional do Skills CLI neste bootstrap.
export DISABLE_TELEMETRY=1

npx --yes skills add https://github.com/vercel-labs/skills \
  --skill find-skills --agent codex --copy --yes
npx --yes skills add https://github.com/vercel-labs/agent-browser \
  --skill agent-browser --agent codex --copy --yes
npx --yes skills add https://github.com/obra/superpowers \
  --skill using-superpowers --agent codex --copy --yes
npx --yes skills add https://github.com/mattpocock/skills \
  --skill grill-me --skill to-tickets --skill to-spec --skill to-prd \
  --agent codex --copy --yes
npx --yes skills add https://github.com/blader/humanizer \
  --skill humanizer --agent codex --copy --yes
npx --yes skills add https://github.com/ayghri/i-have-adhd \
  --skill i-have-adhd --agent codex --copy --yes

echo "Skills instaladas em escopo de projeto. Consulte Factory/setup/skills.md para validação e setup opcional do agent-browser."
