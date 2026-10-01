# GeoAlerta Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. O desenvolvimento foi escolhido pelo usuário para execução por agentes; `superpowers:executing-plans` só se aplica se o usuário posteriormente escolher execução direta.

**Goal:** Entregar abertura pública com GPS e gestão autorizada de ocorrências, com migrations Prisma no Supabase e cobertura automatizada Playwright.

**Architecture:** Manter um monólito modular Next.js com domínio puro, casos de uso e adaptadores de Prisma/PostGIS, Auth, Storage e Realtime. O servidor valida cada operação; RLS protege dados e feed de alertas, e transações preservam classificação, histórico e idempotência. O código legado é preservado com funcionalidades adicionais desativadas.

**Tech Stack:** Next.js 16.3.5 e React 19.2.8 do manifesto atual, TypeScript, Prisma ORM 7/Prisma Migrate com adapter PostgreSQL, Supabase Auth/PostgreSQL/PostGIS/Storage/Realtime, Leaflet e Playwright Test. Fixar versões novas após verificar compatibilidade; não atualizar Next.js/React como efeito lateral.

**Spec:** [PRD](../../releases/core/PRD.md), [histórias e requisitos](../../releases/core/requirements.md), [arquitetura](../../releases/core/architecture/README.md), [banco](../../releases/core/database/README.md) e [testes](../../releases/core/testing/automated-tests.md). Ler todas as specs antes de executar.

## Global Constraints

- Toda ocorrência registrada pelo cidadão deve conter dados precisos de geolocalização (latitude e longitude) extraídos nativamente do dispositivo.
- Toda nova ocorrência deve ser verificada geograficamente em relação aos polígonos de "manchas de inundação" e áreas de risco cadastrados no sistema.
- Prioridade inicial é `ALTA` quando a localização intersecta qualquer zona ativa cadastrada e `NORMAL` nos demais casos.
- Estados internos fixos nesta release: `NOVA`, `EM_TRIAGEM`, `EM_ATENDIMENTO`, `RESOLVIDA`, `CANCELADA`. `NOVA` é o estado inicial.
- Estados: `PENDENTE`, `ATIVO`, `SUSPENSO`, `DESATIVADO`. Só `ATIVO` opera o painel.
- Não haverá integração bidirecional com planilhas externas nesta fase.
- Painel oficial em `/painel`; alertas operacionais somente in-app e CSV como download local.
- A migração de dados é aditiva e não usa `DROP` nas tabelas legadas.
- O projeto adota a convenção de utilizar única e exclusivamente o arquivo `.env` na raiz do repositório para variáveis locais de ambiente (não versionado e protegido pelo `.gitignore`).
- O assistente de IA NUNCA deve executar comandos de `git commit`, `git push`, `git merge` ou disparar deploys em produção/Vercel.
- Prisma Migrate é o histórico único de alterações Core; SQL complementar fica nas mesmas migrations. Credenciais de execução não são as de migration.
- Prisma e clientes Supabase não entram no domínio. Navegador não grava diretamente dados operacionais sensíveis.
- Capacidade planejada: 100 novas ocorrências/hora em crise, 10 sessões simultâneas de backoffice e histórico de ao menos 50 mil ocorrências.
- Em rede operacional, p95 da confirmação de registro sem foto até 3 segundos; p95 da primeira página da lista até 3 segundos; alerta in-app até 5 segundos após persistência. Fotos têm medição separada.
- Antes de escrever código Next.js, ler os guias relevantes em `node_modules/next/dist/docs/` da versão instalada; não assumir convenções de versões anteriores.

## Review Focus

- Reenvio após perda da resposta, incluindo mesma chave com corpo diferente: um protocolo por tentativa; conflito sem duplicação — tarefa 3, `public-occurrences.spec.ts`.
- Sessão anterior à suspensão e conexão reutilizada por outro grupo: negar nova operação e evento sem conservar contexto — tarefas 2 e 6, `access-rls.spec.ts` e `realtime-rls.spec.ts`.
- Ponto na borda, buraco ou duas zonas sobrepostas: classificação espacial determinística e auditável — tarefa 3, `geofencing.spec.ts`.
- Edições concorrentes e falha na auditoria: conflito explícito ou rollback, sem perda silenciosa — tarefa 5, `occurrence-commands.spec.ts` e `transactions.spec.ts`.
- Legado com status desconhecido ou localização ausente: interromper saneamento pendente sem apagar ou inventar dados — tarefa 1, `migrations.spec.ts`.

---

## Organização dos agentes e mapa de arquivos

**Estado:** plano para revisão; esta solicitação entrega documentação e não autoriza iniciar a implementação do produto. Após revisão, usar um agente implementador por tarefa e um revisor independente, com checagem de spec e qualidade antes da próxima tarefa. Ao final, fazer revisão integrada. A coordenação passa os documentos, arquivos e interfaces da tarefa; nenhum agente depende apenas do histórico deste chat.

**Estratégia de validação vigente para as histórias 06–20:** este plano técnico antecede a divisão atual do backlog. Durante cada história, fazer verificação de tipos, lint apenas dos arquivos alterados e testes unitários relevantes, incluindo doubles para sucesso, entrada inválida e falha quando aplicável. Não exigir Docker, imagens, banco/serviços Supabase locais ou dependências novas. Builds ocorrem em marcos de integração e no fechamento. Os comandos API, database, navegador, carga e restauração descritos nos passos técnicos são alvos de integração, não uma exigência por edição/história; a execução integrada será consolidada na história 20 em um projeto Supabase exclusivo de homologação. A suíte atual prepara banco/serviços simulados em alguns projetos; precisa adaptar fixtures e preparar contas, permissões e buckets para Supabase real. Alterar somente a URL não basta. Nenhum mock prova segurança ou funcionamento integrado. Consulte as listas específicas nas histórias `.scratch/release-0.1.0/issues/06`–`20`.

Ordem: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. Os arquivos compartilhados da fundação têm um responsável; não editar a mesma configuração em agentes concorrentes. As fatias compartilham identidade, banco e ciclo de vida, por isso este plano integrado tem checkpoints verificáveis em vez de planos que duplicariam contratos.

| Unidade / caminhos | Responsabilidade |
|---|---|
| `scripts/with-env.mjs`, `prisma.config.ts`, `prisma/` | Ambiente local, schema e histórico de migrations. |
| `src/server/database/` | Cliente e contexto transacional confiável. |
| `src/features/access/` | Identidade, capacidades, estado e grupos. |
| `src/features/occurrences/` | Contratos, domínio, aplicação, persistência, geometria e UI de ocorrências. |
| `src/features/administration/` | Comandos auditados de acesso, regras e zonas. |
| `src/app/api/core/` | Adaptadores HTTP dos contratos abaixo. |
| `src/app/`, `src/components/`, `src/modules/registry.ts` | Integrar as superfícies atuais preservando implementações legadas. |
| `tests/fixtures/`, `tests/unit/`, `tests/api/`, `tests/database/`, `tests/e2e/`, `tests/load/` | Dados sintéticos, regras, integração, jornadas e evidências de capacidade. |

Cada pasta nova recebe `README.md` com propósito, interfaces e comando de verificação na tarefa que a cria. Cada entrega termina com diff local, testes e revisão; **o passo de commit sugerido pela skill é substituído por entrega para revisão**, pois `AGENTS.md` proíbe commits por IA.

## Contratos compartilhados decididos neste plano

Definir os tipos em `src/features/occurrences/contracts.ts` e `src/features/access/contracts.ts` na tarefa 1. Os DTOs são independentes do Prisma. Datas na API usam ISO 8601; IDs e protocolos são strings; versões começam em `1`.

```ts
type Status = 'NOVA' | 'EM_TRIAGEM' | 'EM_ATENDIMENTO' | 'RESOLVIDA' | 'CANCELADA';
type Priority = 'NORMAL' | 'ALTA';
type Role = 'CONSULTA' | 'OPERADOR' | 'GESTOR' | 'ADMINISTRADOR';
type AccessState = 'PENDENTE' | 'ATIVO' | 'SUSPENSO' | 'DESATIVADO';
type Actor = { userId: string; role: Role; groupIds: string[]; municipalityId: string; state: AccessState };
type GeoPosition = { latitude: number; longitude: number; accuracy: number };
type PublicOccurrenceInput = { type: string; description: string; reporterName: string; reporterContact: string; position: GeoPosition; photoToken?: string };
type OpenResult = { id: string; protocol: string; status: Status; priority: Priority; version: number };
type OccurrenceRow = OpenResult & { type: string; groupId: string; createdAt: string; updatedAt: string };
type OccurrenceFilters = { from?: string; to?: string; status?: Status; priority?: Priority; type?: string; groupId?: string; page?: number; pageSize?: number; sort?: 'createdAt' | 'priority' | 'status'; direction?: 'asc' | 'desc' };
type OccurrencePage = { items: OccurrenceRow[]; page: number; pageSize: number; total: number };
type OccurrenceDetail = OccurrenceRow & { position: GeoPosition; description: string; deletedAt: string | null; privateData?: { reporterName: string; reporterContact: string; photoUrl?: string }; events: { id: string; kind: string; actorId: string | null; at: string; reason?: string }[] };
type OccurrenceMutation =
  | { kind: 'edit'; type?: string; description?: string; groupId?: string }
  | { kind: 'transition'; target: Status; reason?: string }
  | { kind: 'reclassify'; priority: Priority; reason: string }
  | { kind: 'delete' | 'restore'; reason: string };
type AlertEvent = { eventId: string; occurrenceId: string; groupId: string; priority: Priority; status: Status; at: string };
type MapQuery = { west: number; south: number; east: number; north: number; from: string; to: string };
type DashboardView = { markers: { id: string; latitude: number; longitude: number; priority: Priority; status: Status }[]; counts: { byStatus: Record<Status, number>; byPriority: Record<Priority, number> }; limited: boolean };
type ProfilePatch = { name?: string; phone?: string; columns?: string[] };
type ProfileView = { userId: string; name: string; email: string; phone: string | null; role: Role; groupIds: string[]; state: AccessState; columns: string[] };
```

Limites técnicos propostos para teste, definidos na [spec de arquitetura](../../releases/core/architecture/README.md#10-limites-e-contratos-propostos-para-implementação): nome 1–120 caracteres, contato 1–40, descrição 1–2.000, tipo 1–80; precisão finita ≥ 0; fotos JPEG/PNG/WebP até 5 MiB com conteúdo verificado; token de upload vinculado à tentativa e inutilizável por outra. Limite público de 20 novas tentativas/minuto por origem confiável de rede, com contador compartilhado; replays idempotentes não contam como novas tentativas. Não confiar em header de IP arbitrário.

Lista: página padrão `1`, tamanho padrão `50`, máximo `100`, ordenação padrão `createdAt desc` com ID como desempate. Mapa: intervalo padrão de 7 dias, máximo de 31 dias, até 1.000 pontos por recorte e indicação `limited=true` se houver pontos omitidos pelo limite. Contagens cobrem o recorte inteiro autorizado. CSV percorre todas as páginas e não adota o limite de pontos do mapa. Esses limites são decisões propostas da spec técnica, não medições de capacidade.

HTTP: `/api/core/public/occurrences` recebe `POST` com `Idempotency-Key`; primeiro registro retorna `201`, replay `200`. APIs protegidas retornam `401` sem identidade, `403` sem capacidade, `404` para ID fora do escopo, `409` para versão/chave conflitante, `422` para entrada inválida e `429` para abuso. Erro JSON: `{ error: { code: string, message: string } }`, sem dados privados. Mutações usam `{ expectedVersion, command }`; nunca aceitar prioridade inicial, grupo público ou papel fornecidos pelo cliente.

### Task 1: Fundação Prisma, ambiente e suíte verificável

**Cobertura:** RNF-007 e pré-requisitos das demais histórias.

**Files:**
- Create: `scripts/with-env.mjs`, `prisma.config.ts`, `prisma/schema.prisma`, migrations geradas em `prisma/migrations/`, `src/server/database/prisma.ts`, `src/features/occurrences/contracts.ts`, `src/features/access/contracts.ts`, `playwright.config.ts`.
- Create: `tests/fixtures/core.ts`, `tests/fixtures/database.ts`, `tests/database/migrations.spec.ts`, `tests/database/legacy-preservation.spec.ts`.
- Modify: `package.json`, `package-lock.json`, `.gitignore`; criar READMEs nas pastas novas.

**Interfaces:**
- Consumes: esquema legado inventariado em cópia isolada, contratos acima e [baseline/migrations](../../releases/core/database/README.md).
- Produces: `loadLocalEnv(root: string): void` em `scripts/with-env.mjs`; CLI `node scripts/with-env.mjs <executable> [...args]` resolve executáveis locais e preserva exit code; export `prisma` apenas no servidor; todos os tipos compartilhados.
- Produces: `seedCoreScenario(runId: string): Promise<CoreFixture>` e `cleanupCoreScenario(runId: string): Promise<void>` em `tests/fixtures/core.ts`; `CoreFixture` contém `groupAId`, `groupBId`, IDs das zonas e contas sintéticas por papel/estado. `assertTestTarget(url: string): void` em `tests/fixtures/database.ts` recusa qualquer destino fora da lista explícita de teste.

- [ ] **Step 1: Preparar o runner e conexões de teste.** Conferir Node/TypeScript, fixar dependências Prisma/adapter/Playwright/tsx/dotenv compatíveis e scripts do plano de testes, instalar browsers e ler os guias locais de Next.js. Criar o carregador de `.env` na raiz do repositório, config Playwright e guarda de alvo isolado; não criar/copiar segredos. Resultado: os executáveis resolvem dependências locais e a configuração identifica exclusivamente o ambiente isolado; após o passo 2, `npm run test:db -- --list` descobre os casos.
- [ ] **Step 2: Escrever testes de migration antes do schema Core.** Casos `RNF-007 reproduz schema Core em banco vazio`, `RNF-007 preserva legado ao aplicar baseline e expansão`, `RNF-007 bloqueia saneamento pendente`: conferir `expect(coreTablesPresent).toBe(true)`, `expect(after.legacyIds).toEqual(before.legacyIds)`, `expect(unknownStatuses).toEqual([])` antes da restrição; a fixture problemática deve produzir relatório e bloquear avanço, sem alterar os dados. Localização ausente não pode ser preenchida com valor inventado.
- [ ] **Step 3: Rodar o teste e observar falha de comportamento.** `npm run test:db -- tests/database/migrations.spec.ts tests/database/legacy-preservation.spec.ts`; esperado: falha por schema Core ausente, não por erro de instalação/autenticação.
- [ ] **Step 4: Implementar fundação e baseline local.** Inventariar a cópia, criar schema e tipos, baseline equivalente e expansão aditiva conforme spec de banco. Gerar nomes de migrations com Prisma, acrescentar SQL complementar antes da aplicação e separar dados privados/feed de alertas. Criar as fixtures mínimas da interface; guardar relatório de pré-migration sanitizado.
- [ ] **Step 5: Verificar e entregar para revisão.** `node scripts/with-env.mjs prisma validate`, `node scripts/with-env.mjs prisma generate`, `npm run test:db -- tests/database/migrations.spec.ts tests/database/legacy-preservation.spec.ts`. Esperado: schema/client válidos, PASS em banco vazio e cópia compatível; amostra inválida bloqueada sem perda. Entregar diff e resultados ao revisor; nenhum commit.

### Task 2: Identidade, autorização e RLS com contexto por transação

**Cobertura:** RF-005, RNF-001; base de RF-010/RF-013.

**Files:**
- Create: `src/features/access/domain/permissions.ts`, `src/features/access/application/resolve-actor.ts`, `src/features/access/infrastructure/supabase-session.ts`, `src/server/database/actor-transaction.ts`.
- Create: `tests/unit/permissions.spec.ts`, `tests/api/access.spec.ts`, `tests/database/access-rls.spec.ts`; nova migration de políticas se a fundação aplicada precisar de ajuste.
- Modify: `src/app/login/page.tsx`, `src/app/painel/layout.tsx`, proteção de sessão em `src/middleware.ts` ou seu substituto exigido pelos guias instalados, sem manter mecanismos duplicados.

**Interfaces:**
- Consumes: `Actor`, `Role`, `AccessState`, client/fixtures da tarefa 1.
- Produces: `resolveActor(): Promise<Actor>` para sessão verificada no servidor e perfil/grupos atuais; `can(actor: Actor, capability: Capability, groupId?: string): boolean`. `Capability` é união de `READ`, `READ_PRIVATE`, `WRITE`, `RECLASSIFY`, `REOPEN`, `EXPORT`, `ADMIN`; matriz exata da seção 3 do PRD.
- Produces: `withActorTransaction<T>(actor: Actor, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>` no adaptador de banco; usa contexto verificado local à transação, role `geoalerta_runtime` sem bypass e políticas baseadas em identidade/perfil atuais. `Prisma.TransactionClient` permanece no adaptador, sem vazar ao domínio. Escrita direta Data API com `anon`/`authenticated` permanece sem grant.

- [ ] **Step 1: Escrever casos positivos e negativos de toda a matriz.** `RNF-001 aplica papel e grupo`, `RF-005 nega conta não ativa com sessão anterior`, `RNF-001 não conserva identidade no pool`: `expect(can(consulta, 'WRITE', groupAId)).toBe(false)`, `expect(can(operador, 'WRITE', groupAId)).toBe(true)`, `expect(can(operador, 'READ', groupBId)).toBe(false)`; repetir capacidades/papéis do PRD. No banco/API, usuário suspenso recebe negação; usuário B não lê A após reutilização da conexão, inclusive depois de erro/rollback.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:unit -- tests/unit/permissions.spec.ts`, `npm run test:api -- tests/api/access.spec.ts`, `npm run test:db -- tests/database/access-rls.spec.ts`. Esperado: permissões ausentes/incorretas identificadas pelos casos.
- [ ] **Step 3: Implementar as interfaces e proteger sessões.** Supabase identifica; perfil/grupo/estado atual autoriza. Configurar role e claims transacionais sem interpolação insegura; restringir grants/RLS por operação e dados privados. Testes de banco incluem acesso direto Data API e tentativas de alterar papel/grupo indevidamente. Não usar `user_metadata` como autoridade nem `BYPASSRLS` para resolver erro.
- [ ] **Step 4: Verificar e revisar.** Repetir os três comandos do passo 2, com PASS da matriz completa. Revisor confere que ocultar botões não é a única proteção, que perfil bloqueado não opera com JWT antigo e que nenhuma identidade persiste após a transação. Entregar evidências sem commit.

### Task 3: Abertura, geofencing, idempotência e foto privada

**Cobertura:** US-01, RF-001–RF-004, RNF-002.

**Files:**
- Create: `src/features/occurrences/domain/position.ts`, `src/features/occurrences/application/open-occurrence.ts`, `src/features/occurrences/infrastructure/postgis.ts`, `src/features/occurrences/infrastructure/repository.ts`, `src/features/occurrences/infrastructure/photos.ts`, `src/features/occurrences/infrastructure/intake-limit.ts`.
- Create: `src/app/api/core/public/occurrences/route.ts`, `src/app/api/core/public/photos/route.ts`, `src/app/api/core/occurrences/[id]/photo/route.ts`.
- Create: `tests/api/public-occurrences.spec.ts`, `tests/api/photos.spec.ts`, `tests/database/geofencing.spec.ts`, `tests/database/storage.spec.ts`, `tests/e2e/public-occurrence.spec.ts`.
- Modify: `src/app/page.tsx`, `src/server/database/actor-transaction.ts`; complementar migrations sem reescrever as já aplicadas.

**Interfaces:**
- Consumes: contratos da tarefa 1 e autorização da tarefa 2.
- Produces: `openOccurrence(input: PublicOccurrenceInput, idempotencyKey: string): Promise<OpenResult>`; `classifyPosition(position: GeoPosition, at: Date): Promise<{ priority: Priority; matches: { zoneId: string; version: number }[] }>` no adaptador espacial, participando da mesma transação de criação.
- Produces: `stagePhoto(file: File, idempotencyKey: string): Promise<{ photoToken: string }>` no servidor; `getAuthorizedPhotoUrl(actor: Actor, occurrenceId: string): Promise<{ url: string; expiresAt: string }>`; somente token vinculado à tentativa permite anexar a foto. URL assinada expira em 60 segundos.
- Produces: `POST /api/core/public/occurrences` e `POST /api/core/public/photos`; `GET /api/core/occurrences/[id]/photo` protegido por `READ_PRIVATE` e grupo.
- Produces: `createGeofencingAdapter(tx: Prisma.TransactionClient): { classifyPosition(position: GeoPosition, at: Date): Promise<{ priority: Priority; matches: { zoneId: string; version: number }[] }> }` mantém triagem na transação; `assertIntakeAllowed(originKey: string, idempotencyKey: string): Promise<void>` usa a origem confiável obtida pelo adaptador HTTP, com contador compartilhado e replay sem novo consumo.
- Produces: `withIntakeTransaction<T>(idempotencyKey: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>` em `src/server/database/actor-transaction.ts`, sob `geoalerta_ingest` e contexto local da tentativa; restringir grants/policies a criar e retornar os dados dessa tentativa, sem leitura de terceiros.

- [ ] **Step 1: Escrever cenários de abertura e falhas.** Casos `US-01 confirma protocolo após gravar`, `RF-002 bloqueia GPS negado`, `RF-003 inclui borda e ignora buraco/inativa`, `RNF-002 repetição concorrente é idempotente`, `RF-004 falha de foto permite escolha explícita`: `expect(created.status).toBe('NOVA')`, `expect(inside.priority).toBe('ALTA')`, `expect(outside.priority).toBe('NORMAL')`, `expect(replay.protocol).toBe(created.protocol)`, `expect(recordCount).toBe(1)`. Corpo divergente retorna `409`; a 21ª nova tentativa/minuto da mesma origem retorna `429`; upload falso ou >5 MiB não é aceito, token alheio é negado e URL expirada falha. Confirmar estado no banco, não somente na tela.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:api -- tests/api/public-occurrences.spec.ts tests/api/photos.spec.ts`; `npm run test:db -- tests/database/geofencing.spec.ts tests/database/storage.spec.ts`; `npm run test:e2e -- tests/e2e/public-occurrence.spec.ts`. Esperado: comportamento Core ainda não atendido.
- [ ] **Step 3: Implementar abertura transacional e adaptadores.** Validar os limites do contrato; obter GPS nativo na UI; PostGIS com longitude/latitude e SRID corretos inclui borda. Persistir ocorrência, zonas/versões, protocolo, idempotência, auditoria e alerta atomicamente sob role de ingestão restrita. Verificar conteúdo da imagem; Storage privado e token de tentativa impedem associação arbitrária. Falha de foto oferece retry ou envio explicitamente confirmado sem foto; falha de resposta permite replay.
- [ ] **Step 4: Verificar e revisar.** Repetir comandos do passo 2; PASS para coordenadas, sobreposição, concorrência, abuso e privacidade. Revisor verifica que grupo e prioridade inicial não vêm do cliente e que reenvio não cria segundo alerta/evento. Entregar evidências sem commit.

### Task 4: Lista autorizada, preferências e CSV completo

**Cobertura:** US-04, RF-008, RF-009, RF-016, RNF-003/RNF-006.

**Files:**
- Create: `src/features/occurrences/application/query-occurrences.ts`, `src/features/occurrences/application/export-occurrences.ts`, `src/features/occurrences/infrastructure/csv.ts`, `src/features/occurrences/ui/OccurrenceList.tsx`, `src/features/access/infrastructure/preferences.ts`.
- Create: `src/app/api/core/occurrences/route.ts`, `src/app/api/core/occurrences/export/route.ts`, `src/app/painel/ocorrencias/page.tsx`.
- Create: `tests/api/occurrence-queries.spec.ts`, `tests/api/csv-export.spec.ts`, `tests/unit/csv.spec.ts`, `tests/e2e/occurrence-list.spec.ts`.
- Modify: `src/app/painel/layout.tsx`; reaproveitar o comportamento útil de `src/lib/csvUtils.ts` sem mudar silenciosamente seu contrato legado. Preferências usam interface de perfil implementada na tarefa 7; nesta tarefa testar o contrato com adaptador mínimo de preferências próprio.

**Interfaces:**
- Consumes: `Actor`, `OccurrenceFilters`, `OccurrencePage`, autorização e repositório anteriores.
- Produces: `listOccurrences(actor: Actor, filters: OccurrenceFilters): Promise<OccurrencePage>`; `exportOccurrences(actor: Actor, filters: OccurrenceFilters): AsyncIterable<string>` com paginação interna e escopo da lista; `escapeCsvCell(value: string): string` trata prefixos de fórmula e escape CSV.
- Produces: `GET /api/core/occurrences`, `GET /api/core/occurrences/export`; `getColumns(userId: string): Promise<string[]>`, `saveColumns(userId: string, columns: string[]): Promise<void>` em `src/features/access/infrastructure/preferences.ts`, chamado apenas com ID verificado e colunas autorizadas.

- [ ] **Step 1: Escrever casos de lista e exportação.** `RF-009 pagina e preserva filtros na URL`, `RF-009 preferência pertence à conta`, `RF-016 exporta além da página`: `expect(page.items).toHaveLength(50)`, `expect(page.total).toBe(125)`, `expect(csvRows).toHaveLength(125)`, `expect(operadorExport.status()).toBe(403)`; outra conta mantém suas colunas. Testar cada filtro, sort não permitido, grupo não autorizado, pageSize>100 e células `=`, `+`, `-`, `@`, aspas e linhas múltiplas.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:api -- tests/api/occurrence-queries.spec.ts tests/api/csv-export.spec.ts`; `npm run test:unit -- tests/unit/csv.spec.ts`; `npm run test:e2e -- tests/e2e/occurrence-list.spec.ts`.
- [ ] **Step 3: Implementar consultas, preferências e CSV.** Aplicar autorização antes de filtrar; validar lista permitida de ordenação/colunas; desempatar por ID e persistir URL. CSV deve iterar conjunto autorizado completo com encoding UTF-8 e tratamento de fórmulas; colunas pessoais exigem `READ_PRIVATE` e não vêm de uma seleção arbitrária do cliente.
- [ ] **Step 4: Verificar e revisar.** Repetir comandos anteriores; PASS de dados, URL, isolamento de preferências e download completo. Revisor compara filtros de API, lista e CSV e confere ausência de leitura do histórico inteiro por página. Entregar sem commit.

### Task 5: Detalhe, criação manual e mutações auditadas

**Cobertura:** US-05, RF-010, RF-011, RF-012, RF-015.

**Files:**
- Create: `src/features/occurrences/domain/lifecycle.ts`, `src/features/occurrences/application/get-occurrence.ts`, `src/features/occurrences/application/change-occurrence.ts`, `src/features/occurrences/application/create-manual-occurrence.ts`.
- Create: `src/app/api/core/occurrences/[id]/route.ts`, `src/app/painel/ocorrencias/[id]/page.tsx`, `src/features/occurrences/ui/OccurrenceDetail.tsx`.
- Create: `tests/unit/lifecycle.spec.ts`, `tests/api/occurrence-commands.spec.ts`, `tests/database/transactions.spec.ts`, `tests/e2e/occurrence-detail.spec.ts`.
- Modify: `src/app/api/core/occurrences/route.ts` para criação manual e repositório da tarefa 3.

**Interfaces:**
- Consumes: `Actor`, `PublicOccurrenceInput`, `OccurrenceDetail`, `OccurrenceMutation`, `OpenResult`, regras iniciais do PRD e repositório/triagem anteriores.
- Produces: `getOccurrence(actor: Actor, id: string): Promise<OccurrenceDetail>`; `createManualOccurrence(actor: Actor, input: PublicOccurrenceInput, groupId: string, idempotencyKey: string): Promise<OpenResult>`; `changeOccurrence(actor: Actor, id: string, expectedVersion: number, command: OccurrenceMutation): Promise<OpenResult>`.
- Produces: `GET/PATCH /api/core/occurrences/[id]`; `POST /api/core/occurrences` protegido por `WRITE`, GPS e grupo. `PATCH` recebe `{ expectedVersion, command }`; omite `privateData` para Consulta e protege também o acesso direto ao banco.

- [ ] **Step 1: Escrever testes de transições e concorrência.** `RF-011 aceita somente transições configuradas`, `RF-012 exclusão/restauração é lógica`, `RF-015 falha de auditoria reverte mudança`, `RF-011 duas versões iguais geram conflito`: `expect(statuses.sort()).toEqual([200, 409])`, `expect(eventCount).toBe(beforeEventCount + 1)`, `expect(afterFailedChange).toEqual(before)`, `expect(consultaDetail.privateData).toBeUndefined()`. Cobrir todas as transições da seção 6 do PRD, gestor/admin com motivo em reabertura/repriorização, criação manual com GPS, reatribuição e registro excluído bloqueado.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:unit -- tests/unit/lifecycle.spec.ts`; `npm run test:api -- tests/api/occurrence-commands.spec.ts`; `npm run test:db -- tests/database/transactions.spec.ts`; `npm run test:e2e -- tests/e2e/occurrence-detail.spec.ts`.
- [ ] **Step 3: Implementar interfaces e transação.** Usar versão esperada na condição da atualização, incrementar uma vez e gravar evento na mesma transação. Autorizar grupo/capacidade, rejeitar transição desabilitada, exigir motivo nas ações especificadas e preservar dados na exclusão/restauração. Criação manual reutiliza triagem/validação e registra ator; mudança posterior de zona não recalcula ocorrências anteriores.
- [ ] **Step 4: Verificar e revisar.** Repetir comandos do passo 2; PASS de todas as transições, conflitos, rollback e ocultação de dados pessoais. Revisor confere mutações via API/banco, eventos imutáveis e nenhum sobrescrito silencioso. Entregar sem commit.

### Task 6: Dashboard, mapa limitado e Realtime autorizado

**Cobertura:** US-03, RF-007, RNF-001/RNF-003/RNF-006.

**Files:**
- Create: `src/features/occurrences/application/get-dashboard.ts`, `src/features/occurrences/infrastructure/realtime.ts`, `src/app/api/core/dashboard/route.ts`.
- Create: `tests/api/dashboard.spec.ts`, `tests/database/realtime-rls.spec.ts`, `tests/e2e/dashboard.spec.ts`.
- Modify: `src/app/painel/page.tsx`, `src/components/MapComponent.tsx`; migrations novas para publicação/políticas se necessário.

**Interfaces:**
- Consumes: `Actor`, `MapQuery`, `DashboardView`, `AlertEvent`, feed transacional da tarefa 3 e detalhe da tarefa 5.
- Produces: `getDashboard(actor: Actor, query: MapQuery): Promise<DashboardView>`; `subscribeOccurrenceAlerts(onEvent: (event: AlertEvent) => void, onReconnect: () => void): () => void` retorna cleanup e usa sessão Supabase verificada para assinatura; `GET /api/core/dashboard`.

- [ ] **Step 1: Escrever testes de alerta e reconexão.** `RF-007 ocorrência confirmada alerta no escopo`, `RF-007 reconexão recupera estado`, `RNF-001 suspensão bloqueia canal aberto`: duas sessões A/B, criação em A; `expect(alertA.occurrenceId).toBe(created.id)`, `expect(eventsB).toHaveLength(0)`; após desconexão/reconexão a visão inclui a ocorrência sem duplicar alerta. `expect(Object.keys(event).sort()).toEqual(['at','eventId','groupId','occurrenceId','priority','status'])`; conta suspensa não recebe próximo evento. Conferir `markers.length<=1000`, `limited` e contagens sem truncamento.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:api -- tests/api/dashboard.spec.ts`; `npm run test:db -- tests/database/realtime-rls.spec.ts`; `npm run test:e2e -- tests/e2e/dashboard.spec.ts`.
- [ ] **Step 3: Implementar dashboard e assinatura.** Aplicar escopo/recorte no servidor; publicar somente `occurrence_alerts`, nunca a linha com dados pessoais/descrição. Mostrar alerta visual, link ao detalhe e indicador de limitação no mapa. Revalidar acesso no banco a cada evento, limpar assinatura ao sair e recarregar estado autorizado na reconexão.
- [ ] **Step 4: Verificar e revisar.** Repetir comandos do passo 2; PASS com Realtime real, inclusive sessão suspensa e filtro de outro grupo. Revisor mede alerta em ambiente de teste e distingue essa medição da capacidade sob carga. Entregar sem commit.

### Task 7: Administração e perfil com auditoria

**Cobertura:** US-02/US-06, RF-006, RF-013, RF-014, RF-015.

**Files:**
- Create: `src/features/access/application/profile.ts`, `src/features/administration/contracts.ts`, `src/features/administration/application/manage-access.ts`, `src/features/administration/application/manage-rules.ts`, `src/features/administration/application/manage-zones.ts`.
- Create: `src/app/painel/perfil/page.tsx`, `src/app/painel/admin/page.tsx`; Route Handlers em `src/app/api/core/profile/route.ts` e `src/app/api/core/admin/{users,groups,transitions,zones}/route.ts` (quatro diretórios concretos).
- Create: `tests/api/administration.spec.ts`, `tests/e2e/administration.spec.ts`, `tests/e2e/access-profile.spec.ts`.
- Modify: políticas auditadas em nova migration quando necessário e preferências da tarefa 4.

**Interfaces:**
- Consumes: `Actor`, `ProfilePatch`, `ProfileView`, preferências, autorização, auditoria e regras/zonas versionadas anteriores.
- Produces: `updateOwnProfile(actor: Actor, patch: ProfilePatch): Promise<ProfileView>`; `GET/PATCH /api/core/profile` com `GET` retornando `ProfileView` e `PATCH` limitado a `ProfilePatch`.
- Produces: contratos administrativos em `src/features/administration/contracts.ts`: `UserCommand = { kind:'create'; name:string; email:string; role:Role; groupIds:string[] } | { kind:'update'; userId:string; role?:Role; groupIds?:string[]; state?:AccessState }`; `GroupCommand = { kind:'save'; id?:string; name:string; defaultForPublic:boolean }`; `TransitionCommand = { kind:'transition'; from:Status; to:Status; enabled:boolean } | { kind:'presentation'; status:Status; label:string; order:number }`; `ZoneCommand = { kind:'save'; id?:string; expectedVersion?:number; name:string; type:'INUNDACAO'|'RISCO'; geometry:{ type:'Polygon'|'MultiPolygon'; coordinates:number[][][]|number[][][][] }; active:boolean; validFrom:string; validTo:string|null }`. Apresentação de estado fica em `status_presentations`, separada das transições e dos códigos imutáveis.
- Produces: `manageUser(actor: Actor, command: UserCommand): Promise<ProfileView>`, `manageGroup(actor: Actor, command: GroupCommand): Promise<{ id:string }>`, `manageTransition(actor: Actor, command: TransitionCommand): Promise<void>`, `manageZone(actor: Actor, command: ZoneCommand): Promise<{ id:string; version:number }>`; endpoints administrativos `GET/POST` listam projeções autorizadas/executam comandos, `POST transitions` retorna `204` e os demais `200` com os resultados definidos.

- [ ] **Step 1: Escrever casos administrativos e de perfil.** `RF-006 não permite promoção pelo próprio perfil`, `RF-013 suspende sessão prévia`, `RF-014 regra nova não reescreve histórico`, `RF-014 zona inativa não eleva próxima ocorrência`: `expect(nonAdmin.status()).toBe(403)`, `expect(profile.role).toBe(before.role)`, `expect(suspendedAction.status()).toBe(403)`, `expect(previousOccurrence.priority).toBe('ALTA')`, `expect(newOccurrence.priority).toBe('NORMAL')`. Cobrir conta pendente/ativa/desativada, criação Auth e falha parcial, grupos padrão/múltiplos, geometria inválida, códigos de status fixos e auditoria de cada alteração.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:api -- tests/api/administration.spec.ts`; `npm run test:e2e -- tests/e2e/administration.spec.ts tests/e2e/access-profile.spec.ts`; `npm run test:db -- tests/database/access-rls.spec.ts`.
- [ ] **Step 3: Implementar perfil e interfaces administrativas.** Perfil só edita campos permitidos da própria conta. Administração exige `ADMIN`, escopo municipal e evento auditado. Criação de usuário Supabase ocorre somente no servidor; falha de provisionamento deixa conta `PENDENTE` sem privilégios efetivos e permite retomada auditada, pois Auth externo não participa da transação Prisma. Alterar regras e zonas versionadas sem apagar histórico; grupo público padrão deve ser único por município.
- [ ] **Step 4: Verificar e revisar.** Repetir comandos do passo 2; PASS de perfil, matriz de acesso, provisionamento, regras, zonas e auditoria. Revisor verifica ausência de autocadastro de operador e que estado da conta é verificado no banco além da UI. Entregar sem commit.

### Task 8: Desativação do legado e aceite integrado

**Cobertura:** US-07, RF-017, RNF-004/RNF-005/RNF-007 e aceite completo do PRD.

**Files:**
- Modify: `src/modules/registry.ts`, `src/app/painel/{recursos,abrigos,equipes,voluntarios}/page.tsx` (quatro arquivos), `src/app/rastreio/page.tsx`, `src/app/painel/tabela/page.tsx`, `src/app/painel/layout.tsx`; guardar implementações de rota que seriam substituídas em `src/modules/legacy/` antes de criar bloqueios.
- Create: `tests/e2e/legacy-disabled.spec.ts`, `tests/api/legacy-disabled.spec.ts`, `tests/load/core-load.ts`, `tests/load/restore.ts`; atualizar `tests/database/legacy-preservation.spec.ts`.
- Modify: READMEs do produto e da suíte; criar `docs/releases/core/testing/results/README.md` e relatório Markdown somente após execução.

**Interfaces:**
- Consumes: todos os contratos e jornadas anteriores; nenhuma nova operação de produto.
- Produces: rota antiga `/painel/tabela` redireciona para `/painel/ocorrencias` preservando filtros compatíveis; cinco rotas desativadas retornam página inativa sem montar componentes de módulo, e operações legadas ficam negadas também na camada de banco/API.
- Produces: `runCoreLoad(): Promise<LoadReport>` em `tests/load/core-load.ts`; `LoadReport` contém duração, total enviado/persistido, erros, duplicações, p95 de registro/lista, atraso de alertas e contagem de linhas exportadas. `verifyRestore(): Promise<{ restored:boolean; idsPreserved:boolean; elapsedMs:number }>` em `tests/load/restore.ts`, sempre em segundo alvo descartável.

- [ ] **Step 1: Escrever testes de bloqueio e preservação.** `RF-017 rota direta não inicia módulo`, `RF-017 legado é preservado`: visitar as cinco rotas, `expect(legacyMenuLinks).toHaveLength(0)`, `expect(gpsHeartbeats).toHaveLength(0)`, `expect(legacySubscriptions).toHaveLength(0)`, `expect(after.legacyIds).toEqual(before.legacyIds)`; tentativas diretas de operar tabelas legadas são negadas. Conferir redirecionamento da tabela antiga sem apagar seu código original.
- [ ] **Step 2: Rodar e observar falha.** `npm run test:e2e -- tests/e2e/legacy-disabled.spec.ts`; `npm run test:api -- tests/api/legacy-disabled.spec.ts`; `npm run test:db -- tests/database/legacy-preservation.spec.ts`.
- [ ] **Step 3: Implementar desativação e executores de evidência.** Flags e guardas impedem montar módulos/GPS; negar operações antigas e encerrar assinaturas. Preservar implementações em `src/modules/legacy/` quando substituir wrappers de rota; não excluir código, tabelas, arquivos ou dados. Criar executores de carga/restauração com guarda de alvo da tarefa 1 e metas exatas do plano de testes.
- [ ] **Step 4: Verificar aceite integrado.** `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:api`, `npm run test:db`, `npm run test:browsers`. Esperado: PASS sem teste crítico pulado, incluindo as suites do passo 2; registrar incompatibilidade ou falha real, sem chamar teste não executado de aprovado.
- [ ] **Step 5: Executar capacidade e recuperação em alvos isolados.** `npm run test:load`, `npm run test:restore`; esperado: cenário completo de uma hora/100 ocorrências/rajada de 10/10 sessões/50 mil registros e metas do PRD, CSV completo e restauração íntegra. Se o ambiente não permitir execução, registrar a limitação e manter o aceite pendente.
- [ ] **Step 6: Revisão final por agente independente e entrega ao usuário.** Comparar US-01–US-07, RF-001–RF-017 e RNF-001–RNF-007 com relatórios; conferir fronteiras, segurança, migrations e preservação. Entregar diff, evidências sanitizadas, riscos concretos e pendências. Somente o usuário decide integração e publicação; não executar commit/push/merge/deploy.

## Auto-revisão do plano

- Cobertura: tarefa 3 atende US-01; tarefas 2/7 atendem US-02; 6 atende US-03; 4 atende US-04; 5 atende US-05; 7 atende US-06; 8 atende US-07. Fundação/migrations em 1 e verificações integradas em 8 cobrem RNFs transversais.
- Contratos: tipos compartilhados são definidos antes dos consumidores; contexto Prisma fica no adaptador. API, UI e testes usam os mesmos nomes e enums; nenhuma tarefa pode alterar uma interface sem revisar seus consumidores.
- Review Focus: os cinco casos têm dono e teste explícito, incluindo legado incompleto, suspensão com sessão antiga, borda/buraco e falha transacional.
- Execução: tarefas incluem configuração e documentação necessárias ao seu próprio aceite. Nenhum passo de commit ou deploy é atribuído à IA.
- Pendências de ambiente: dependências/guia Next.js, credenciais isoladas e inventário real serão verificados na tarefa 1; não são tratados como disponíveis nesta revisão documental. Capacidade e restauração só são aprovadas com execução real.
