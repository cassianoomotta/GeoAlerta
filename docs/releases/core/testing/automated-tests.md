# Planejamento de testes automatizados — GeoAlerta Core

**Ferramenta principal:** Playwright Test (`@playwright/test`, TypeScript). **Objetivo:** validação básica leve durante cada história e aceite integrado real no fechamento da release. Este documento planeja trabalho futuro; não afirma que os cenários descritos passaram.

## 1. Objetivo e camadas

Comprovar as sete [histórias](../requirements.md), as permissões reais e a integridade do banco organizado com Prisma. Há duas etapas, com estados distintos: **implementação concluída e validação básica aprovada** por história; depois, **aceite integrado concluído** somente após evidência no projeto Supabase de homologação. Uma história pode avançar com a integração pendente, mas isso não é aceite integral. Cenários usam IDs `US`, `RF` ou `RNF` e descrevem Dado/Quando/Então.

### Validação básica durante cada história

- Conferir tipos com `npm exec -- tsc --noEmit` (TypeScript já consta nas dependências; não há script `typecheck` em `package.json`).
- Executar lint somente nos arquivos alterados com `npm run lint -- <arquivos-alterados>`.
- Executar `npm run test:unit -- <arquivo-ou-padrão-relevante>` para regras e validações puras relevantes. O script `test:unit` existe e seleciona o projeto Playwright `unit`.
- Quando houver fronteira de infraestrutura, cobrir sucesso, entrada inválida e falha com implementações falsas de repositório, autenticação ou armazenamento. Essas verificações cobrem comportamento local, não segurança nem disponibilidade do serviço real.
- Não exigir Docker, imagens de containers, banco local, serviços Supabase locais ou dependências novas. Não executar projetos `api`, `database` ou navegador como requisito de cada história, pois a configuração atual prepara banco/servidor para eles.
- Fazer build em marcos de integração e no fechamento da release, sem exigir repetição a cada edição: `npm run build` é o script disponível.

O trabalho de desenvolver novos testes unitários e doubles usados pelas histórias deve ocorrer dentro das histórias pertinentes. Esta atualização não implementa novos testes, scripts ou adaptações da suíte.

| Projeto Playwright | Caminho planejado | O que comprova |
|---|---|---|
| `unit` | `tests/unit/**/*.spec.ts` | Funções puras de domínio, coordenadas, transições, permissões e tratamento CSV; sem abrir navegador. |
| `api` | `tests/api/**/*.spec.ts` | API local com `APIRequestContext`, sessões emitidas pelo SDK Supabase e Auth HTTP de fixture, validação, idempotência e conflitos. |
| `database` | `tests/database/**/*.spec.ts` | Preparação Prisma/SQL contra PostgreSQL/PostGIS isolado; alguns serviços Supabase são representados por fixtures SQL. Não prova Auth, Storage ou Realtime remotos. |
| `chromium` | `tests/e2e/**/*.spec.ts` | Jornada na aplicação local em desktop; usa a preparação e o Auth HTTP de fixture configurados pelo runner. |
| `firefox`, `webkit` | `tests/e2e/**/*.spec.ts` | Compatibilidade dos fluxos críticos; sem reutilizar sessão de outro browser. |
| `mobile-chromium`, `mobile-webkit` | `tests/e2e/public-occurrence.spec.ts` | Formulário público em viewport móvel, geolocalização e upload. |

Usar projetos sem navegador para domínio, API e banco; carga possui executor próprio em `tests/load/`, sem simular capacidade por quantidade de browsers E2E. O uso de Playwright para API e geolocalização segue as referências oficiais: [API testing](https://playwright.dev/docs/api-testing), [emulação](https://playwright.dev/docs/emulation).

## 2. Estrutura e comandos disponíveis e planejados

```text
playwright.config.ts
tests/
  README.md
  fixtures/          # dados, usuários, sessões e geometrias sintéticas
  unit/              # regras puras, sem infraestrutura
  api/               # HTTP real e acesso com/sem autorização
  database/          # migrations, RLS, PostGIS, Storage e preservação
  e2e/               # jornadas no navegador
  load/              # carga, métricas e restauração isolada
```

Scripts existentes em `package.json`, executados na raiz e carregando exclusivamente `.env` da raiz por `scripts/with-env.mjs`. Os comandos que usam esse wrapper exigem o `.env` da raiz localmente (CI recebe variáveis injetadas); não há `.env.local`, `.env.test` ou outro arquivo local alternativo:

| Comando disponível | Implementação do script |
|---|---|
| `npm run lint -- <arquivos>` | `node scripts/with-env.mjs eslint <arquivos>` |
| `npm run test:unit -- <arquivo-ou-padrão>` | `node scripts/with-env.mjs playwright test --project=unit <arquivo-ou-padrão>` |
| `npm run test:api` | `node scripts/with-env.mjs playwright test --project=api` |
| `npm run test:db` | `node scripts/with-env.mjs playwright test --project=database --workers=1` |
| `npm run test:e2e` | `node scripts/with-env.mjs playwright test --project=chromium` |
| `npm run test:browsers` | `node scripts/with-env.mjs playwright test --project=chromium --project=firefox --project=webkit --project=mobile-chromium --project=mobile-webkit` |
| `npm run build` | `node scripts/with-env.mjs next build` |
| `npm exec -- tsc --noEmit` | TypeScript CLI existente; não há script `typecheck`. |

`test:load`, `test:restore` e `typecheck` não são scripts atualmente disponíveis. Não os trate como comandos prontos; os trabalhos associados a carga e recuperação estão explicitados nas histórias 19 e 20. O Playwright atual configura `webServer` para API/navegadores, `baseURL` explícita, locale `pt-BR`, timezone `America/Sao_Paulo`, retries locais `0` e CI `1`. Suites de banco/restauração não devem rodar em paralelo com suites que dependem do mesmo banco.

## 3. Ambiente e fixtures da validação integrada

- Usar um projeto Supabase exclusivo de homologação, com PostGIS, Auth, Storage e Realtime reais no aceite integrado. A conexão não autoriza aplicar migrations remotas nesta tarefa; preparação e execução ocorrem em trabalho posterior e controlado.
- Não criar credenciais nem consultar dados de produção. Localmente, todas as variáveis ficam em `.env` na raiz do repositório; CI recebe variáveis injetadas, sem outro arquivo local de ambiente.
- Gerar usuários sintéticos para Consulta, Operador, Gestor e Administrador, grupos A/B e contas `PENDENTE`, `ATIVO`, `SUSPENSO`, `DESATIVADO`. Testar cada capacidade concedida e negada, inclusive conta sem grupo e usuário com múltiplos grupos.
- Cada execução recebe `runId`; cada teste usa dados próprios. Sessões de usuários distintos ficam em contextos distintos; arquivos de `storageState` ficam ignorados pelo Git e nunca em relatório público.
- Fixture espacial: quadrado ativo em SRID 4326 com vértices `[[-51,-30],[-50,-30],[-50,-29],[-51,-29],[-51,-30]]`; ponto interno `latitude=-29.5, longitude=-50.5`, externo `latitude=-28.5, longitude=-50.5` e borda `latitude=-29.5, longitude=-51`. Acrescentar zona inativa, vencida, futura, sobreposta e polígono com buraco. Precisão sintética padrão `10` metros.
- Simular sucesso do GPS com geolocalização/permissões do contexto. Simular `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT` e ausência da API com `addInitScript`; o sucesso deve usar a API do navegador, não inputs manuais de coordenadas.
- Fotos sintéticas válidas e inválidas; limites de tamanho/formato definidos no contrato de upload. Fixtures não gravam URLs públicas ou dados pessoais reais.
- Pré-migration: amostras dos quatro estados legados conhecidos, um valor desconhecido e localização ausente; amostras preservadas de recursos, abrigos, equipes e voluntários. Carga: ao menos 50 mil ocorrências sintéticas em grupos/estados variados.
- A suíte atual prepara banco e serviços simulados em alguns projetos. Para Supabase real, adaptar as fixtures e preparar contas, papéis, grupos, permissões e buckets; trocar somente a URL não é suficiente. Setup privilegiado pode preparar o ambiente, mas assertions de permissão usam credenciais de aplicação e usuários reais. Não usar conexão administrativa nem mocks como prova de RLS.

## 4. Matriz de cobertura

Os caminhos são futuros e relativos à raiz. As verificações abaixo constituem o mínimo de aceite; nenhum ID fica coberto apenas por um teste de renderização.

| História / requisitos | Arquivos de teste planejados | Cenários e assertions |
|---|---|---|
| US-01 / RF-001, RF-002 | `tests/e2e/public-occurrence.spec.ts`, `tests/api/public-occurrences.spec.ts` | Sem login + GPS válido → protocolo persistido e `NOVA`; precisão guardada. GPS negado/ausente/timeout/indisponível → sem criação. API rejeita latitude fora de ±90, longitude fora de ±180, valores não numéricos e precisão negativa. |
| US-01 / RF-003 | `tests/database/geofencing.spec.ts` | Dentro/borda de zona ativa → `ALTA`; fora, buraco, inativa ou fora da vigência → `NORMAL`; longitude/latitude corretas; versão/zonas da classificação persistidas e sem reclassificação retroativa. |
| US-01 / RF-004 | `tests/api/photos.spec.ts`, `tests/e2e/public-occurrence.spec.ts`, `tests/database/storage.spec.ts` | Sem foto permitido; foto válida privada; extensão/MIME/conteúdo adulterados e tamanho acima do limite recusados; falha de upload não mostra sucesso com foto; novo envio ou confirmação sem foto; URL temporária expira e conta sem capacidade não a obtém. |
| US-02 / RF-005, RF-006 | `tests/api/access.spec.ts`, `tests/e2e/access-profile.spec.ts`, `tests/database/access-rls.spec.ts` | Login ativo e logout; credenciais inválidas; painel sem sessão; contas não ativas negadas com sessão antiga; perfil próprio permite nome/telefone/preferências e nega e-mail/papel/grupo/estado e alteração de outra conta. |
| US-03 / RF-007 | `tests/e2e/dashboard.spec.ts`, `tests/api/dashboard.spec.ts`, `tests/database/realtime-rls.spec.ts` | Mapa/contagens somente no escopo e recorte delimitado; alerta visual de ocorrência confirmada em dois contextos; outro grupo não recebe evento; feed não contém dados privados; reconexão busca estado corrente; suspensão com canal aberto impede novos eventos. |
| US-04 / RF-008, RF-009 | `tests/e2e/occurrence-list.spec.ts`, `tests/api/occurrence-queries.spec.ts` | Atalho de status e demais filtros na URL; paginação e ordenação no servidor; colunas persistidas por conta; preferência não expõe campos proibidos; grupo/ordenação/tamanho de página manipulados não ampliam acesso. |
| US-04 / RF-016 | `tests/api/csv-export.spec.ts`, `tests/e2e/occurrence-list.spec.ts`, `tests/unit/csv.spec.ts` | Somente Gestor/Admin; download local com todas as linhas filtradas autorizadas, mais que uma página; caracteres portugueses, aspas/separador/quebra de linha e prefixos `=`, `+`, `-`, `@` tratados; sem truncamento em 50 mil registros. |
| US-05 / RF-010, RF-011 | `tests/api/occurrence-commands.spec.ts`, `tests/e2e/occurrence-detail.spec.ts`, `tests/unit/lifecycle.spec.ts` | Detalhe pelo grupo e dados privados por capacidade; criação manual com GPS e classificação; edição de campos e reatribuição autorizadas; cada transição inicial permitida e negada; reabertura/repriorização só Gestor/Admin com motivo. |
| US-05 / RF-012, RF-015 | `tests/api/occurrence-commands.spec.ts`, `tests/database/transactions.spec.ts` | Exclusão/restauração somente Admin com motivo; ocultação operacional, preservação e evento; excluído não transiciona; falha de auditoria reverte toda mutação; duas alterações com mesma versão → uma aprovada e outra `409`, sem perda silenciosa. |
| US-06 / RF-013, RF-014, RF-015 | `tests/e2e/administration.spec.ts`, `tests/api/administration.spec.ts`, `tests/database/access-rls.spec.ts` | Criação de conta e grupos, papel, ativação/suspensão/desativação e auditoria; negar não Admin; grupo padrão aplicado; transições/rótulos/ordem editáveis, códigos fixos; zona inválida recusada, ativação/desativação/vigência e versões explicáveis. |
| US-07 / RF-017 | `tests/e2e/legacy-disabled.spec.ts`, `tests/api/legacy-disabled.spec.ts`, `tests/database/legacy-preservation.spec.ts` | Menu sem módulos; cinco rotas diretas inativas e operações bloqueadas; nenhum heartbeat GPS ou assinatura legada; código preservado e IDs/contagens/arquivos legados sem perdas após migration. |

| RNF | Arquivos / evidência adicional |
|---|---|
| RNF-001 | `tests/database/access-rls.spec.ts`, `storage.spec.ts`, `realtime-rls.spec.ts`: acesso positivo/negativo em API, banco e canal; pool não conserva identidade anterior. |
| RNF-002 | `tests/api/public-occurrences.spec.ts`: mesma chave/corpo em paralelo retorna mesmo protocolo, corpo diferente com mesma chave retorna `409`, rajada abusiva retorna `429` sem inserir, textos maliciosos não executam script. |
| RNF-003 | `tests/api/occurrence-queries.spec.ts`, `dashboard.spec.ts` e relatório de carga: paginação e limites de mapa efetivos. |
| RNF-004 | `tests/load/core-load.ts`: executar o cenário de capacidade e registrar p95, erros, contagens, consultas e atraso Realtime. |
| RNF-005 | Todos os projetos; cada cenário BDD do PRD tem caso automatizado com ID e resultado verificável. |
| RNF-006 | `tests/e2e/dashboard.spec.ts`, `occurrence-list.spec.ts`: alertas in-app e exportação local; nenhuma etapa operacional depende de e-mail ou sincronização de planilha. |
| RNF-007 | `tests/database/migrations.spec.ts`, `legacy-preservation.spec.ts`, `tests/load/restore.ts`: banco vazio, baseline em cópia existente, rollback transacional e restauração. |

## 5. Concorrência, migrations e falhas

1. Disparar duas tentativas simultâneas com a mesma chave/corpo; conferir um registro, um protocolo e um evento de abertura. Chave repetida com corpo diferente deve falhar.
2. Abrir a mesma versão em duas sessões; salvar alterações divergentes; conferir um sucesso, um conflito e histórico íntegro. Falha na gravação da auditoria não pode deixar mutação parcial.
3. Executar baseline + migrations em banco vazio; conferir constraints, índices, PostGIS, RLS, grants, Storage privado e publicação do feed.
4. Executar sobre cópia sintética do legado; comparar IDs/contagens/dados/arquivos, mapear estados conhecidos e impedir avanço com status desconhecido ou saneamento pendente. Nova entrada sempre exige GPS; dado legado incompleto não é apagado nem ganha coordenada inventada.
5. Reutilizar conexões com usuários de grupos diferentes e depois sem identidade; garantir isolamento e nenhuma leitura residual. Testar RLS com role sem `BYPASSRLS` e as políticas Data API com JWT real.
6. Induzir erro HTTP, perda de rede, desconexão Realtime e falha de Storage em cenários controlados; conferir mensagens recuperáveis, ausência de confirmação enganosa e retomada idempotente. Não mockar autorização, migrations ou PostGIS nos testes que comprovam esses recursos.

## 6. Capacidade e recuperação

**Cenário do PRD:** banco com pelo menos 50 mil ocorrências; 100 novas ocorrências durante uma hora, incluindo rajada de 10 envios em um minuto; 10 sessões simultâneas de backoffice fazendo lista, mapa e atualizações. Medir também fotos e CSV durante a atividade.

**Metas propostas:** p95 de confirmação sem foto ≤ 3 segundos, p95 de primeira página da lista ≤ 3 segundos, alertas visuais ≤ 5 segundos após persistência. Registrar latência das fotos separadamente, erros, duplicações, conflitos esperados, volume consultado, Realtime e crescimento do Storage. Não transformar essas metas em capacidade comprovada até executar o cenário completo.

O executor de carga ainda precisa ser implementado na história 20; quando disponível, usará clientes HTTP para entrada e dez sessões de backoffice com observação do painel, separando métricas de rede, servidor e renderização. Exportação deve conter o conjunto completo sem truncamento e sem alterar dados. A história 19 deve implementar/adaptar e executar a restauração de backup sintético em segundo alvo descartável, reaplicar verificações de integridade e documentar tempo/resultado. Nenhum teste de restauração escreve no alvo de origem.

## 7. Evidências e aceite

- Relatórios HTML e JUnit, trace no primeiro retry e screenshot em falhas; redigir fixtures para que nenhum artefato contenha dados reais. Referência: [reporters do Playwright](https://playwright.dev/docs/test-reporters).
- PR de código não é criado automaticamente neste planejamento. O agente entrega diff local, lista de arquivos, comandos, falhas observadas antes da implementação, resultados posteriores e limitações; um revisor independente confere as histórias e permissões.
- Antes da aprovação do usuário: todos os cenários obrigatórios passam, nenhuma história crítica é pulada, RLS/Storage/Realtime e migrations foram verificados de verdade, e carga/restauração têm evidências. Teste instável ou não executado não conta como PASS.
- Resultados futuros ficam em `test-results/` e `playwright-report/`, ignorados pelo Git; estados de autenticação e tokens ficam fora do versionamento. Registrar um resumo sanitizado em Markdown em `docs/releases/core/testing/results/` somente quando houver execução, com `README.md` nessa nova pasta.
- Somente o usuário faz commit, push, merge, aplica alterações em ambiente compartilhado e publica. Os agentes implementam e testam localmente conforme o [plano](../../../superpowers/plans/2026-09-29-geoalerta-core.md).
