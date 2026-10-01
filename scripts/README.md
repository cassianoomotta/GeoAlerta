# Comandos locais Core

`with-env.mjs` carrega somente `.env` na raiz, preserva variáveis já injetadas e resolve os executáveis instalados sem shell. Arquivos `.env.*` alternativos são recusados. Nenhum comando inicia migrations automaticamente. Node 24.14.0 foi verificado nesta implementação.

`npm run inventory:legacy` consulta apenas metadados em uma transação READ ONLY. Exige `TEST_DATABASE_URL` e uma lista JSON explícita em `TEST_DATABASE_ALLOWLIST`; não conecta ao banco de execução. A saída contém esquema, constraints, índices e extensões, sem registros de cidadãos ou URLs de credenciais. O inventário ainda precisa incluir confirmação de políticas, publicação, contagens e arquivos em alvo isolado antes da baseline.

`npm run inventory:legacy -- --write-evidence` inclui políticas/publicações e salva o resultado sanitizado em `docs/releases/core/testing/results/ticket-01-observed-inventory.json`. A ausência das tabelas legadas é indicada explicitamente; sucesso do comando não significa que há uma cópia legada disponível ou que a baseline está aprovada.

`npm run test:restore` executa a restauração real do schema `public` usando `pg_dump`/`pg_restore`. Exige `RESTORE_SOURCE_URL`, `RESTORE_DATABASE_URL` (distintos e ambos em `TEST_DATABASE_ALLOWLIST`), `RESTORE_SOURCE_IS_SYNTHETIC=true`, origem sintética confirmada, destino vazio e ambos diferentes do banco operacional. O comando nunca limpa o destino; se houver tabelas, interrompe. `RESTORE_REPORT_PATH` é opcional e deve apontar para um arquivo ainda inexistente. O relatório contém contagens e hashes de linhas, sem URLs, credenciais nem valores das linhas. O dump PostgreSQL não inclui os bytes de objetos no Storage e a recuperação de Auth requer procedimento próprio; ambos são registrados como limitações. Não use com Docker nem com um projeto Supabase compartilhado.

`prepare-legacy.ts` reproduz a fonte histórica autorizada pelo usuário somente em alvo de teste vazio; não reaplica criação em cópia existente. Em Docker PostgreSQL puro, usa pré-requisitos SQL sintéticos de plataforma explicitamente declarados. A baseline foi criada após observar esse esquema reproduzido. Prisma 7.10.0 CLI, client e adapter têm versões alinhadas.

Verificação: `npm run test:unit`, `npm run test:db`, `node scripts/with-env.mjs playwright test --list`.
