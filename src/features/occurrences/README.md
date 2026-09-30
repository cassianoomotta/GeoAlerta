# Contratos e saneamento Core

`contracts.ts` define ocorrências, dados privados, eventos, zonas versionadas, classificação, transições, auditoria, idempotência e feed mínimo. Datas são strings ISO 8601 e os tipos não importam framework, ORM ou SDK. A posição é opcional somente na projeção de detalhe para representar legado incompleto; novas entradas exigem posição.

`legacy.ts` mapeia somente os quatro estados aprovados. O relatório identifica estados desconhecidos e localização nula sem modificar entradas; não substitui a futura validação transacional na migration.

Verificação: `npm run test:unit` e `node node_modules/typescript/bin/tsc --noEmit`.
