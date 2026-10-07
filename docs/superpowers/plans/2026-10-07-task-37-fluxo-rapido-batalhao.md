# Task 37 — Registro rápido do batalhão — Implementation Plan

> Implementação sequencial no checkout desta task. Não criar clones ou worktrees, não executar commit, push, merge ou deploy.

**Goal:** Permitir que operadores autorizados registrem ocorrências pelo painel com ponto confirmado no mapa, sem depender dos dados do cidadão nem de grupo/evento escolhidos pelo cliente.

**Architecture:** Criar contrato e caso de uso próprios para o batalhão. Reutilizar a transação central de ocorrência, a classificação geográfica, o resolvedor de evento ativo, auditoria, alertas e idempotência; gravar origem do registro e da posição em colunas aditivas, mantendo null nas linhas históricas cuja origem não seja comprovável. Expor formulário autenticado com seletor de posição em mapa e manter os contratos público e manual atuais.

**Tech Stack:** Next.js App Router conforme documentação local da versão instalada; React, react-leaflet, TypeScript, Prisma e PostgreSQL/PostGIS.

**Spec:** Task 37 do Notion — `[0.1.0] 37 — Registrar ocorrências pelo fluxo rápido do batalhão`.

## Global Constraints

- Ocorrências mantêm coordenadas válidas e classificação geográfica; sobreposição a mancha ativa resulta em prioridade ALTA.
- O fluxo cidadão continua exigindo GPS nativo com precisão numérica; o fluxo manual existente continua compatível.
- O fluxo rápido exige confirmação explícita do ponto no mapa e persiste precisão desconhecida como null.
- Grupo padrão, evento ativo, status, prioridade, município e origem são resolvidos no servidor.
- Usar persistência/transação, protocolo, histórico, auditoria, idempotência e alertas in-app do Core; sem tabela/fila paralela.
- Migration apenas aditiva e compatível com dados antigos; nenhuma origem histórica incerta será fabricada.
- Validar autorização no servidor e preservar RLS, grants, município e grupos; não acessar o banco compartilhado para testes.
- Usar somente `.env` na raiz; não exibir credenciais nem dados pessoais reais.
- Não executar commit, push, merge ou deploy.

## Review Focus

- Campo cliente tentando definir grupo, evento, prioridade, status, município ou origem: rejeitar antes de gravar.
- Posição movida após confirmação, coordenada inválida ou fora dos limites: invalidar confirmação ou rejeitar.
- Operador/gestor sem vínculo ao grupo padrão: negar sem escolher outro grupo; administrador respeita o município.
- Ausência de contatos independentes e precisão null: armazenar null sem criar valores fictícios, mantendo restrições dos outros canais.
- Replay de mesma chave após mudança de evento ativo: devolver ocorrência original sem duplicar protocolo, histórico ou alerta.

---

### Task 1: Contrato isolado e autorização do fluxo rápido

**Files:**
- Create: `src/features/occurrences/battalion-input.ts`
- Create: `src/features/occurrences/application/create-battalion-occurrence.ts`
- Test: `tests/unit/battalion-input.spec.ts`
- Test: `tests/unit/create-battalion-occurrence.spec.ts`

- [x] Teste primeiro o parser: tipo ativo permitido, endereço 1–300, descrição 1–500, `needsMedicalSupport` boolean explícito, contatos opcionais/independentes e limites 120/40.
- [x] Teste ponto confirmado, latitude/longitude finitas dentro dos limites, ponto não confirmado e rejeição de campos derivados adicionais.
- [x] Teste permissão de OPERADOR/GESTOR vinculado ao grupo padrão, ADMINISTRADOR municipal e recusa de CONSULTA, estado não ativo, grupo fora de escopo e grupo de outro município.
- [x] Execute os testes novos e confirme a falha inicial.
- [x] Implemente o contrato/caso de uso sem reutilizar `validatePublicInput` para tornar campos públicos opcionais.
- [x] Reexecute os testes novos (12 passaram).

### Task 2: Persistência preservadora de origem e precisão

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261007100000_battalion_quick_occurrence/migration.sql` (ajustar timestamp se já existir)
- Modify: `src/features/occurrences/contracts.ts`
- Modify: `src/server/occurrences/persist.ts`
- Modify: `src/server/occurrences/intake.ts`
- Modify: `src/app/api/core/occurrences/route.ts`
- Test: `tests/unit/occurrence-persistence.spec.ts`
- Test: `tests/database/migrations.spec.ts`

- [x] Fixar testes para origem pública/manual/batalhão, posição GPS/mapa, precisão null somente no canal de mapa e compatibilidade de linhas antigas sem origem.
- [x] Criar migration aditiva com origem anulável e constraints que preservem a exigência de precisão para fluxos público/manual sem permitir que callers aleguem proveniência legada.
- [x] Atualizar grants por coluna para `geoalerta_runtime` e `geoalerta_ingest`; manter políticas RLS de escopo existentes.
- [x] Atualizar o Prisma e os comandos comuns de persistência; atribuir origem do lado do servidor aos fluxos público e manual já existentes e permitir null de precisão somente para o ponto confirmado do batalhão.
- [x] Gerar o client Prisma e validar migration/dados em banco isolado (3 testes passaram).

### Task 3: Endpoint transacional, grupo/evento e efeitos do Core

**Files:**
- Create: `src/app/api/core/occurrences/battalion/route.ts`
- Modify: `src/server/occurrences/persist.ts`
- Reuse: `src/server/climate-events/intake.ts`
- Test: `tests/api/battalion-occurrence.spec.ts`
- Test: `tests/database/battalion-occurrence.spec.ts`

- [x] Testar que o servidor resolve tipo ativo e grupo padrão do município; nenhum identificador derivado do payload é aceito.
- [x] Testar vínculo ao evento ativo, ausência de evento, replay idempotente e classificação com coordenadas confirmadas.
- [x] Testar contatos opcionais/privados, protocolo, histórico, auditoria, alerta e dados de origem nos cenários API cobertos.
- [ ] Injetar falha após persistências intermediárias e confirmar rollback de todos os efeitos; exercitar ausência/configuração inválida do grupo padrão sem efeitos parciais.
- [x] Implementar o endpoint com sessão verificada, permissão do grupo padrão, RLS/restrições atuais, chave de idempotência e classificação compartilhada.
- [x] Testar API e banco isolados: 14 testes API e 3 testes de migração passaram; papel sem acesso e payload adulterado foram exercitados.
- [ ] Exercitar grupo/município divergentes e completar a matriz de autorização para os papéis e configurações de produção.

### Task 4: Página autenticada e escolha de ponto no mapa

**Files:**
- Create: `src/features/occurrences/ui/BattalionOccurrenceForm.tsx`
- Create: `src/features/occurrences/ui/BattalionOccurrenceMap.tsx`
- Create: `src/app/painel/ocorrencias/rapida/page.tsx`
- Modify: `src/app/painel/ocorrencias/page.tsx`
- Modify: `src/app/painel/ocorrencias/[id]/page.tsx`
- Test: `tests/e2e/battalion-occurrence.spec.ts`
- Test: `tests/e2e/occurrence-detail.spec.ts`

- [x] Testar entrada de registro rápido, acesso autenticado, perfis recusados e estado sem acesso ao grupo padrão.
- [x] Implementar tipo, referência textual, descrição curta, apoio médico Sim/Não sem seleção prévia, contatos opcionais e marcador movível por clique/arraste.
- [x] Cada movimento invalida a confirmação; envio só habilita após confirmação explícita.
- [ ] Decidir e, se aplicável à especificação, testar sugestão inicial do GPS do operador, sem substituir a confirmação manual.
- [x] Persistir posição final, reutilizar chave no retry inalterado e gerar outra chave após mudanças nos dados.
- [x] Mostrar protocolo e link ao detalhe após sucesso; falha de rede mantém dados, ponto e chave.
- [x] Exibir no detalhe origem do registro e da posição, com rótulo “Não informada” para legado.
- [x] Validar no Playwright desktop e viewport móvel (2 testes passaram), incluindo mover/reconfirmar e retry.

### Task 5: Regressão, evidências e fechamento

**Files:**
- Create: `docs/releases/core/testing/results/2026-10-07-task-37-fluxo-rapido-batalhao.md`
- Modify: página da Task 37 no Notion após evidências finais.

- [x] Rodar TypeScript (incluído no build), lint, unitários, API, banco isolado, E2E desktop/móvel e build; não foi usado o banco compartilhado.
- [x] Regressar os contratos público/manual e a classificação espacial nos testes unitários/API selecionados.
- [x] Registrar comandos, resultados e limitações sem credenciais/dados pessoais reais.
- [ ] Completar revisão integrada manual no navegador e atualizar a Task 37 com evidências. Manter em In progress até essa verificação; não marcar Done antes dos critérios pertinentes.
