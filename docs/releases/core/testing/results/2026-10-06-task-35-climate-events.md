# Task 35 — Gestão de eventos climáticos

Data: 2026-10-06  
Branch: `feat/task-35-eventos-climaticos`  
Base: `geo-alerta-0-1-0` (`3b0ca738f3ef678540badca2588494d800a7c894`)

## Implementado

- Migration aditiva para eventos climáticos e vínculo opcional da ocorrência; registros históricos permanecem sem vínculo.
- Ciclo Planejado → Em andamento → Encerrado, edição com versão, auditoria, unicidade de evento ativo por município e proteção contra vínculos entre municípios.
- Resolução do evento ativo no servidor durante a ingestão pública, preservando vínculo e idempotência em replay.
- Correção justificada do vínculo por usuário autorizado, além de detalhe, filtro, exportação CSV e página administrativa.
- Encerramento bloqueado por ocorrências não terminais, inclusive excluídas logicamente ou invisíveis ao gestor; acesso segue o município e os grupos existentes.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm run test:unit` | 156 aprovados |
| `npm run test:api` | 46 aprovados |
| `npm run test:db -- --grep climate-event` | 3 aprovados no banco isolado |
| `npm run test:e2e -- --grep climate-events` | 2 aprovados |
| `node node_modules/typescript/bin/tsc --noEmit` | aprovado |
| `npm run lint` | 0 erros; 8 warnings em `RiskZonePanel.tsx` e `hosted-core-notifications-reconnect.spec.ts` |
| `npm run build` | aprovado; compilação, TypeScript e geração de rotas concluídos |

O teste de banco isolado confirmou a migration aditiva e preservação de três registros legados, escopo RLS da ingestão, início concorrente por município, municípios distintos, integridade municipal e bloqueio de encerramento para `NOVA`, `EM_TRIAGEM` e `EM_ATENDIMENTO`, incluindo registro excluído e grupo fora do escopo. A tentativa de encerramento bloqueada não alterou estado/versão; o encerramento válido registrou auditoria.

O cenário controlado de corrida manteve o encerramento aberto em uma transação enquanto a ingestão aguardava o lock municipal. Após confirmar o encerramento, a nova ocorrência foi gravada com `climate_event_id` nulo; o teste passou no PostgreSQL isolado.

## Limitações e pendências

- A suíte completa `npm run test:db` teve 31 aprovados e 3 falhas de setup preexistentes: os testes de migração procuram `prisma/migrations/202610060003_public_occurrence_medical_support/migration.sql`, que pertence à Task 34 e não existe nesta branch independente da Task 35. Os três testes específicos de eventos climáticos passaram. A migration da Task 34 não foi copiada para esta branch.
- A branch continua sem commit e sem integração. O `AGENTS.md` proíbe commits e merges pela IA; a integração depende de revisão e commit pelo usuário. A Task 36 deve aguardar essa integração e também a integração necessária da Task 34.
- Nenhum dado real, credencial ou payload pessoal foi incluído neste registro.
