# Contratos e saneamento Core

`contracts.ts` define ocorrências, dados privados, eventos, zonas versionadas, classificação, transições, auditoria, idempotência e feed mínimo. Datas são strings ISO 8601 e os tipos não importam framework, ORM ou SDK. A posição é opcional somente na projeção de detalhe para representar legado incompleto; novas entradas exigem posição.

`legacy.ts` mapeia somente os quatro estados aprovados. O relatório identifica estados desconhecidos e localização nula sem modificar entradas; não substitui a futura validação transacional na migration.

`public-input.ts` valida DTO público e chave de idempotência, sem framework/ORM/SDK. Texto é preservado como texto; a UI usa escape React, sem HTML executável. Grupo/status/prioridade não vêm do cidadão. A abertura sem foto usa `src/server/occurrences/`; a página pública anterior permanece preservada em `src/modules/legacy-public-page.tsx`, sem rota ativa.

Verificação: `npm run test:unit` e `node node_modules/typescript/bin/tsc --noEmit`.

`list-input.ts` define filtros, limites, links e whitelist de colunas da lista. A query SQL parametrizada em `src/server/occurrences/list.ts` aplica RLS, exclusão lógica, filtros e paginação no servidor; total e página compartilham o snapshot de uma instrução SQL. A UI usa `/painel/ocorrencias`; `/painel/tabela` redireciona filtros compatíveis e mantém a implementação anterior em `src/modules/legacy-occurrence-table.tsx`.
