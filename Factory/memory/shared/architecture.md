# Arquitetura: fontes locais

Consulte `package.json`, `src/`, `prisma/` e os documentos em `docs/releases/core/architecture/README.md` e `docs/releases/core/database/README.md`. Os manifests atuais incluem Next.js, React, TypeScript, Prisma, PostgreSQL, Supabase, Leaflet e Turf; isso não confirma serviços habilitados ou conectados.

Antes de mudar código Next.js, leia os guias pertinentes em `node_modules/next/dist/docs/` como determina `AGENTS.md`. Use os scripts documentados e `scripts/with-env.mjs` quando indicado. Variáveis locais ficam exclusivamente em `.env` na raiz; não criar `.env.local`, `.env.test` nem copiar credenciais para evidências.

Verifique no código a implementação e as permissões de cada fluxo. Não deduza que alternativas técnicas, migrações ou tarefas documentadas já foram aprovadas ou executadas. Mudanças em banco ou serviços externos não fazem parte de uma autorização para trabalho local. Para tarefas envolvendo Supabase, consulte a skill específica disponível.

A fábrica usa Python 3.11+ para seus contratos locais; não altera a stack da aplicação nem depende de serviços remotos para a validação do ledger. Configurações pessoais do Codex não são alteradas por esta adaptação.
