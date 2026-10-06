# Lifecycle de zonas de inundação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for native execution or `superpowers:subagent-driven-development` for delegated execution. Execute one task at a time and wait for review/method selection before implementation.

**Goal:** Implement consulta histórica por vigência e transições auditadas para zonas versionadas, sem alterar classificações antigas de ocorrências.

**Architecture:** Uma função privada PostGIS seleciona, para cada zona, a versão efetiva em um instante de referência. A classificação corrente, as políticas RLS, a API administrativa e a visualização histórica reutilizam essa regra. O fluxo de mutação permanece append-only, exige autorização e motivo, e mantém sobreposições distintas.

**Tech Stack:** Next.js 16.3.5, TypeScript 5, Prisma 7.10.0, PostgreSQL/PostGIS, React 19, React Leaflet 5, Playwright 1.63.0.

**Spec:** `docs/superpowers/specs/2026-10-05-flood-zone-lifecycle-design.md`

## Global Constraints

- Antes de alterar código Next.js, ler a documentação relevante em `node_modules/next/dist/docs/` e seguir as convenções da versão instalada.
- Nenhuma migration pode apagar ou reescrever versões históricas, IDs, vínculos ou ocorrências.
- Operações de zona exigem Administrador autenticado; a aplicação não confia em papéis enviados pelo navegador.
- Versões são append-only; mutações e auditoria são transacionais; edição concorrente obsoleta retorna conflito.
- Não adicionar dependências sem necessidade demonstrada.
- Executar validação integrada de PostGIS/RLS apenas contra banco de teste isolado autorizado; nunca homologar com serviço compartilhado automaticamente.
- Não executar `git commit`, `git push`, `git merge`, rebase nem deploy. O usuário revisa e publica as mudanças.
- Mocks não são evidência de RLS/PostGIS real; relatar validação básica e integrada separadamente.

## Review Focus

1. Uma nova versão futura não pode ocultar a versão ainda vigente antes do seu início efetivo; testar ambos os lados do instante de transição.
2. `valid_from` é inclusivo e `valid_to` exclusivo, inclusive quando coincidem com a consulta.
3. Uma versão escolhida inativa ou expirada não pode fazer a consulta voltar para uma versão mais antiga.
4. Zonas distintas com sobreposição parcial continuam classificando juntas; duplicidade espacial exata do mesmo tipo e vigência coincidente exige justificativa auditada.
5. Leitura e mutação por usuário anônimo, não administrador ou sessão expirada continuam negadas; conflitos de versão não sobrescrevem mudanças concorrentes.

---

### Task 1: Seleção temporal compartilhada no PostGIS e classificação

**Files:**
- Create: `prisma/migrations/202610020010_risk_zone_lifecycle_history/migration.sql`
- Create: `tests/database/risk-zone-temporal-selection.spec.ts`
- Modify: `tests/database/risk-zone-read-guards.spec.ts`
- Modify: `tests/unit/occurrence-persistence.spec.ts`
- Modify: `tests/api/manual-occurrence.spec.ts`

**Interfaces:**
- Produces: função SQL `geoalerta_private.effective_risk_zone_version(target_zone uuid, at_instant timestamptz) RETURNS integer`.
- A função escolhe a versão elegível com maior `valid_from` menor ou igual ao instante; `NULL` é aceito somente como início aberto da versão inicial; empate usa a maior `version`.
- Após escolher a versão, os chamadores verificam `active` e o intervalo explícito; não há fallback para uma versão anterior se a escolhida estiver inativa ou expirada.
- Atualiza `geoalerta_private.is_current_risk_zone`, `geoalerta_private.zone_is_classifiable` e as políticas de leitura/classificação/ingestão para usarem a mesma seleção temporal em `transaction_timestamp()`.

- [x] **Step 1: Escrever testes de banco para seleção temporal.** Cobrir versão inicial sem início, versão futura, fronteiras inclusiva/exclusiva, versão inativa e ausência de fallback.
- [x] **Step 2: Executar o teste de banco e confirmar falha.** Run: `npm run test:db -- tests/database/risk-zone-temporal-selection.spec.ts`. Expected: FAIL nos casos de versões futuras/fronteiras, pois a política atual escolhe `max(version)` global.
- [x] **Step 3: Implementar a função e substituir as políticas na migration aditiva.** Não alterar migrations aplicadas; conceder execução somente às roles runtime/ingest necessárias e preservar `SECURITY DEFINER` com `search_path` fechado.
- [x] **Step 4: Atualizar a classificação e a asserção unitária.** Trocar a condição de versão máxima global em `src/server/occurrences/persist.ts` pela função temporal, preservando a interseção de borda e todos os IDs/versões correspondentes.
- [x] **Step 5: Atualizar as fixtures de abertura manual.** Criar cenários com versão futura e instante atual; verificar que prioridade e vínculos usam a versão efetiva.
- [x] **Step 6: Executar testes da unidade e do banco.** Run: `npm run test:unit -- tests/unit/occurrence-persistence.spec.ts` e `npm run test:db -- tests/database/risk-zone-temporal-selection.spec.ts tests/database/risk-zone-read-guards.spec.ts`. Expected: PASS com RLS real no banco de teste isolado.

### Task 2: Transições administrativas, auditoria e duplicidade

**Files:**
- Modify: `src/features/occurrences/domain/risk-zones.ts`
- Modify: `src/app/api/core/admin/risk-zones/route.ts`
- Modify: `src/features/occurrences/ui/RiskZonePanel.tsx`
- Modify: `tests/unit/risk-zones.spec.ts`
- Modify: `tests/api/risk-zones.spec.ts`

**Interfaces:**
- Mutação administrativa exige `reason` não vazio, versão esperada em atualizações e `validFrom` explícito para versões posteriores à primeira.
- Criação começa inativa. Ativar, desativar, reativar e substituir são versões novas.
- `replacesZoneId` é opcional e, quando informado, deve referenciar outra zona existente; registrá-lo em `audit_events.changes` junto do motivo.
- Antes de gravar, comparar com outras zonas usando `ST_Equals`, tipo igual e intervalo de vigência coincidente. Sem justificativa, devolver conflito identificável; com justificativa, gravar e auditar a exceção. Sobreposição parcial continua permitida.
- Não criar rota de exclusão física nem conceder `UPDATE`/`DELETE` na tabela de versões.

- [x] **Step 1: Escrever testes unitários de validação.** Cobrir criação inativa, início efetivo ausente em atualização, motivo vazio, referência de substituição inválida e datas invertidas.
- [x] **Step 2: Executar os testes unitários e confirmar falha.** Run: `npm run test:unit -- tests/unit/risk-zones.spec.ts`. Expected: FAIL nos novos contratos de entrada.
- [x] **Step 3: Escrever testes API do Administrador.** Cobrir transições, auditoria com ator/motivo, versão obsoleta (409), duplicidade sem justificativa recusada, exceção justificada registrada e acesso negado para outros papéis.
- [x] **Step 4: Implementar validação de domínio e transação administrativa.** Fazer checagem de duplicidade em PostGIS dentro da mesma transação da criação/versão e da auditoria; distinguir a mesma `zone_id` de uma duplicidade entre IDs diferentes.
- [x] **Step 5: Atualizar o painel administrativo.** Iniciar formulários inativos, solicitar motivo de alteração e justificar duplicidade antes do envio; manter o fluxo de criação de versão e mensagens acessíveis de conflito/sucesso.
- [x] **Step 6: Executar testes unitários e de API.** Run: `npm run test:unit -- tests/unit/risk-zones.spec.ts` e `npm run test:api -- tests/api/risk-zones.spec.ts`. Expected: PASS; auditoria só muda junto com a versão gravada.

### Task 3: Consulta de uma data e comparação visual

**Files:**
- Modify: `src/app/api/core/admin/risk-zones/route.ts`
- Modify: `src/features/occurrences/ui/RiskZonePanel.tsx`
- Create: `src/features/occurrences/ui/RiskZoneHistoryMap.tsx`
- Modify: `tests/api/risk-zones.spec.ts`
- Create: `tests/e2e/risk-zone-history.spec.ts`

**Interfaces:**
- `GET /api/core/admin/risk-zones?at=<ISO-8601>` devolve o snapshot administrativo no instante solicitado.
- `GET /api/core/admin/risk-zones?at=<ISO-8601>&compareAt=<ISO-8601>` devolve dois snapshots identificados, cada zona com `zoneId`, `version`, `name`, `type`, `active`, `validFrom`, `validTo` e GeoJSON.
- Instantes inválidos retornam 400; requisições sem a capacidade `administer` retornam o erro de autorização existente.
- A tela administrativa oferece dois seletores de data/hora e um mapa de comparação responsivo com legenda que distingue as duas datas, tipo e estado; não adiciona ferramenta de desenho nem lê dados privados de ocorrências.

- [x] **Step 1: Escrever testes API para snapshots e comparação.** Usar versões antes/agendadas/depois de inativação e validar seleção efetiva, campos retornados, limite de permissões e entrada temporal inválida.
- [x] **Step 2: Executar os testes API e confirmar falha.** Run: `npm run test:api -- tests/api/risk-zones.spec.ts`. Expected: FAIL porque o endpoint atual retorna somente a versão mais recente.
- [x] **Step 3: Implementar a consulta parametrizada de snapshot.** Usar a mesma função/ordenação temporal da Task 1; validar parâmetros antes do SQL e exigir sessão/capacidade administrativa em toda chamada.
- [x] **Step 4: Construir o mapa histórico separado do mapa operacional de ocorrências.** Usar React Leaflet já instalado, desenhar as duas coleções GeoJSON em cores distintas e ajustar limites ao conjunto combinado sem alterar clustering, filtros ou consulta de ocorrências.
- [x] **Step 5: Integrar os seletores à tela administrativa.** Exibir estado vazio, carregamento, erro recuperável e a identificação de versão/vigência; manter a visualização histórica somente leitura.
- [x] **Step 6: Executar testes API e de navegador.** Run: `npm run test:api -- tests/api/risk-zones.spec.ts` e `npm run test:e2e -- tests/e2e/risk-zone-history.spec.ts`. Expected: Administrador compara dois instantes e usuário sem permissão não acessa a tela nem o endpoint.

### Task 4: Verificação de regressão e aceite local

**Files:**
- Modify, se necessário: `tests/api/public-occurrences.spec.ts`
- Modify, se necessário: `tests/api/manual-occurrence.spec.ts`
- Modify, se necessário: `tests/database/risk-zone-temporal-selection.spec.ts`
- Modify, se necessário: `tests/e2e/risk-zone-history.spec.ts`

**Interfaces:**
- Nenhuma interface nova; este fechamento comprova conjuntamente o contrato das Tasks 1–3.

- [x] **Step 1: Executar TypeScript e lint dos arquivos alterados.** Run: `npm exec -- tsc --noEmit` e `npm run lint -- <lista de arquivos alterados>`. Expected: exit code 0.
- [x] **Step 2: Executar suítes unitárias, API, database e navegador afetadas.** Run: `npm run test:unit`, `npm run test:api -- tests/api/risk-zones.spec.ts tests/api/public-occurrences.spec.ts tests/api/manual-occurrence.spec.ts`, `npm run test:db -- tests/database/risk-zone-temporal-selection.spec.ts tests/database/risk-zone-read-guards.spec.ts` e `npm run test:e2e -- tests/e2e/risk-zone-history.spec.ts`. Expected: PASS no alvo isolado autorizado.
- [x] **Step 3: Executar build de produção local.** Run: `npm run build`. Expected: compilação concluída sem erros.
- [x] **Step 4: Conferir o fluxo no navegador local.** Em sessão administrativa, criar inativa, ativar, agendar versão futura, comparar duas datas, encerrar e confirmar ausência de fallback; em sessão sem acesso, confirmar 403/redirect. Registrar limitações sem alegar homologação compartilhada.

