# Detalhe autorizado de ocorrência e histórico — Plano de Implementação

> **Para agentes de implementação:** use `superpowers:executing-plans` e execute as tarefas na ordem. Cada tarefa termina com testes; commits estão proibidos pelas regras do repositório.

**Objetivo:** permitir que usuários autenticados consultem o detalhe e o histórico resumido de ocorrências dentro de seu escopo, sem expor dados pessoais ou diferenças privadas a quem não tem essa capacidade.

**Arquitetura:** a API do Next.js valida sessão e escopo por meio de `withSession` e obtém uma projeção explícita do banco. Uma função SQL de leitura entrega apenas eventos seguros para a timeline; a página `/painel/ocorrencias/[id]` consome o contrato da API e apresenta a classificação gravada na abertura, incluindo as versões das zonas, sem recalcular registros antigos.

**Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, Prisma 7.10.0, PostgreSQL/PostGIS, Supabase SSR e Playwright Test.

**Especificação:** História 05 no [Notion](https://app.notion.com/p/3ebefe2e57f2812eb108f82ba114ef05?pvs=204), `docs/releases/core/PRD.md` (US-05, RF-010, RF-015, RNF-001), `docs/releases/core/requirements.md` e `.scratch/release-0.1.0/issues/05-consultar-detalhe-e-historico-autorizados.md`.

## Restrições globais

- “Operador e Gestor consultam apenas os grupos atribuídos; Administrador opera no município configurado; ID fora do escopo não revela existência nem conteúdo.”
- “A classificação informa as zonas e versões consideradas na abertura, sem recalcular silenciosamente registros antigos.”
- “Consulta não recebe nome, contato ou referência de foto na interface, resposta da API, acesso direto ao banco ou diferenças privadas do histórico.”
- “O detalhe inicial usa fixtures sem foto. A evidência opcional e seu acesso são entregues no ticket 06.”
- Variáveis locais somente em `.env` na raiz do repositório.
- A IA não executa `git commit`, `git push`, `git merge` ou deploy; executar e verificar em workspace local/isolado.
- Ler o guia instalado do Next.js em `node_modules/next/dist/docs/` antes de escrever código Next.js e obedecer aos avisos de depreciação.

## Foco da revisão

- UUID malformado, inexistente ou fora do grupo deve resultar na mesma resposta 404 sem revelar existência; teste `RF-010 detalhe inexistente e fora do escopo têm resposta indistinguível` em `tests/api/occurrence-detail.spec.ts`.
- Operador/Gestor com vários grupos deve ver apenas os grupos atribuídos e Administrador somente o município configurado; teste `RF-010 detalhe respeita grupos atribuídos e município` em `tests/api/occurrence-detail.spec.ts` e `tests/database/occurrence-detail.spec.ts`.
- Consulta não pode receber dados pessoais em campos aninhados ou na timeline; teste `RF-015 resposta de Consulta omite dados privados inclusive no histórico` em `tests/api/occurrence-detail.spec.ts`.
- Ocorrência legada sem coordenada deve exibir localização indisponível sem coordenada inventada; teste `RF-010 ocorrência sem posição mostra estado indisponível` em `tests/e2e/occurrence-detail.spec.ts`.
- Zona desativada ou alterada depois da abertura deve continuar aparecendo com a versão registrada; teste `RF-010 detalhe mostra versões classificadas na abertura` em `tests/api/occurrence-detail.spec.ts`.

## Arquivos e responsabilidades

- `src/app/api/core/occurrences/[id]/route.ts`: autenticação, consulta autorizada e projeção de detalhe.
- `prisma/migrations/202609300006_occurrence_detail_read/migration.sql`: função de histórico resumido com checagem de escopo, sem `reason`/`changes`, e grants mínimos.
- `src/app/painel/ocorrencias/[id]/page.tsx`: detalhe acessível, estados de carregamento/erro e timeline.
- `tests/api/occurrence-detail.spec.ts`: contrato da resposta e isolamento de grupos.
- `tests/database/occurrence-detail.spec.ts`: grants/RLS e histórico sanitizado via role restrita.
- `tests/e2e/occurrence-detail.spec.ts`: comportamento visível e ausência de dados privados.

---

### Tarefa 1: API de detalhe e projeção sanitizada

**Arquivos:**
- Modificar `src/app/api/core/occurrences/[id]/route.ts`.
- Criar `prisma/migrations/202609300006_occurrence_detail_read/migration.sql`.
- Criar `tests/api/occurrence-detail.spec.ts`.
- Criar `tests/database/occurrence-detail.spec.ts`.

**Interfaces:**
- Consome `withSession(work)` e `AccessError` de `src/server/access/session.ts` e `src/server/access/context.ts`.
- Produz `GET /api/core/occurrences/:id` com JSON de `id`, `protocol`, `type`, `description`, `status: { code, label }`, `priority`, `group: { id, name }`, `position: { latitude, longitude, accuracy } | null`, `openedAt`, `updatedAt`, `version`, `classification: { zones: [{ id, name, version }] } | null` e `events: [{ id, kind, actorId, at }]`.
- A resposta não inclui `reporter_name`, `reporter_contact`, `photo_url`, `photo_object_key`, `reason` ou `changes`, inclusive para Consulta.
- ID malformado, apagado, inexistente ou fora do escopo usa o contrato 404 atual (`NOT_FOUND`).
- A migration expõe a função `public.core_occurrence_history(uuid)` apenas para a role de execução; devolve eventos resumidos e não torna colunas privadas da tabela-base acessíveis diretamente.

- [x] **Passo 1: Escrever testes de API e banco que falham**

  `RF-010 detalhe autorizado retorna os campos operacionais, posição, classificação e timeline`; validar cada campo do contrato acima.

  `RF-010 detalhe inexistente e fora do escopo têm resposta indistinguível`; testar UUID malformado, ID sem ocorrência, grupo B com ator só do grupo A e ocorrência excluída; todos devem retornar 404 com o mesmo corpo.

  `RF-015 resposta de Consulta omite dados privados inclusive no histórico`; gravar valores sentinela pessoais em campos legados e evento, chamar API como Consulta e afirmar que nenhuma sentinela, `reason`, `changes`, nem chaves de foto estão presentes.

  `RF-010 detalhe respeita grupos atribuídos e município`; Operador do grupo A não vê B, Gestor de A/B vê ambos e Admin de outro município não vê ocorrência municipal.

  `RF-010 detalhe mostra versões classificadas na abertura`; semear versão histórica inativa e versão atual, e afirmar que apenas o `zone_id/version` registrado na classificação é apresentado.

  `RF-015 Consulta lê somente timeline sanitizada no banco`; com role restrita e identidade Consulta, confirmar que `core_occurrence_history(id)` retorna os campos resumidos e que leitura direta das colunas `reason`/`changes` ou da tabela privada falha com privilégio negado.

- [x] **Passo 2: Rodar os testes novos e observar a falha esperada**

  Rode `npm run test:api -- --grep "RF-010|RF-015"` e `npm run test:db -- --grep "RF-010|RF-015"`.

  Esperado: falha porque a rota só retorna campos básicos, não existe projeção de histórico sanitizada e a leitura de detalhe/classificação não cumpre o contrato.

- [x] **Passo 3: Implementar o contrato da API e a função SQL**

  Validar o UUID antes da consulta, selecionar apenas colunas operacionais necessárias, extrair longitude/latitude de PostGIS, resolver rótulo do status e grupo, juntar as zonas pela versão gravada e ordenar eventos por `at, id`. Criar a função SQL de timeline sanitizada com `SECURITY DEFINER`, `search_path` fixo, escopo validado por `core_has_access` e execução revogada de `PUBLIC`; não conceder leitura direta de `reason` ou `changes` à role de execução.

- [x] **Passo 4: Rodar novamente API e banco**

  Rode `npm run test:api -- --grep "RF-010|RF-015"` e `npm run test:db -- --grep "RF-010|RF-015"`.

  Esperado: os testes novos passam; os testes de autorização e migração existentes não regredem.

---

### Tarefa 2: Página de detalhe e verificação no navegador

**Arquivos:**
- Criar `src/app/painel/ocorrencias/[id]/page.tsx`.
- Criar `tests/e2e/occurrence-detail.spec.ts`.

**Interfaces:**
- Consome o JSON de `GET /api/core/occurrences/:id` definido na Tarefa 1.
- Produz uma página autenticada com resumo da ocorrência, localização/precisão, classificação na abertura, histórico cronológico e retorno à lista.
- Exibe estado indisponível para posição nula; não inventa coordenadas, não exibe foto nesta história e não mostra dados privados para Consulta.
- Erros de não encontrado/acesso não autorizado usam a mesma apresentação neutra de ocorrência indisponível.

- [x] **Passo 1: Escrever testes de navegador que falham**

  `RF-010 detalhe apresenta protocolo, classificação, localização e histórico`; iniciar sessão autorizada, abrir o ID e conferir os campos e ordem da timeline.

  `RF-015 Consulta não vê dados pessoais ou diferenças privadas`; abrir o detalhe como Consulta e confirmar que valores sentinela, contato, foto, motivo e diffs não aparecem no DOM.

  `RF-010 ocorrência sem posição mostra estado indisponível`; abrir fixture legada sem posição e confirmar texto de localização indisponível e ausência de coordenadas.

  `RF-010 ocorrência fora do escopo mostra estado indisponível`; abrir ID do grupo não atribuído e conferir que a página não revela conteúdo nem existência.

- [x] **Passo 2: Rodar os testes novos e observar a falha esperada**

  Rode `npm run test:e2e -- --grep "RF-010|RF-015"`.

  Esperado: falha porque a rota de página não existe.

- [x] **Passo 3: Implementar a página de detalhe**

  Seguir o padrão suportado pela versão instalada do Next.js conforme a documentação lida na Tarefa 1. Usar componentes sem dependência de dados privados, `Link` para retorno, rótulos em português e estados de carregamento/indisponível; buscar exclusivamente o endpoint da Tarefa 1.

- [x] **Passo 4: Rodar os testes de navegador e a suíte de aceitação da história**

  Rode `npm run test:e2e -- --grep "RF-010|RF-015"`, `npm run test:api` e `npm run test:db`.

  Esperado: testes novos e suítes API/banco passam; não aparece sentinela privada na página ou resposta.

---

## Critérios de conclusão

- Todos os critérios de aceite da História 05 têm evidência nos testes de navegador, API e banco.
- Leitura autorizada apresenta o registro; leitura cruzada e IDs inválidos/não encontrados têm resposta neutra 404.
- Dados pessoais e detalhes privados do histórico não escapam para Consulta por nenhuma camada testada.
- A classificação histórica usa a versão registrada na abertura.
- Nenhum commit, push, merge, deploy ou escrita em ambiente compartilhado é realizada pela IA.
- Ao terminar, a história do Notion passa de `In progress` para `Done` somente após revisão e verificação dos testes.

## Revisão final

- E2E, API e banco preparam seus próprios vínculos de classificação e validam a mesma zona nas versões 1 e 2, evitando dependência da ordem das suítes.
- A revisão adicionou cobertura para escopo da função SECURITY DEFINER, políticas RLS de classificação/zonas, exclusão lógica, múltiplos grupos e limite municipal.
- Fixtures de banco criam a ocorrência excluída antes do vínculo de classificação para respeitar a chave estrangeira em banco limpo.
- Revisão independente: nenhum problema crítico; achados importantes corrigidos e revalidados.
- Verificação final: `npm run test:api` (11/11), `npm run test:db` (13/13), `npm run test:e2e -- --grep 'RF-010|RF-015'` (4/4), `npx tsc --noEmit` e `git diff --check` passaram.
