# Ticket 20 — regressão local de navegador e validação básica

**Data:** 2026-10-06  
**Checkout:** `geo-alerta-0-1-0`, commit `3b0ca73`, com alterações locais não commitadas das Tasks 30/31.  
**Alvo:** aplicação local e banco sintético allowlisted `localhost:5433/geoalerta_test`. Nenhum teste desta rodada usou o projeto Supabase GeoAlerta.

## Validação local

- TypeScript (`node node_modules/typescript/bin/tsc --noEmit`): aprovado.
- ESLint (`npm run lint`): 0 erros e 8 avisos já presentes — 7 em `src/features/occurrences/ui/RiskZonePanel.tsx` e 1 em `tests/e2e/hosted-core-notifications-reconnect.spec.ts`.
- Unitários (`npm run test:unit`): 155 aprovados.
- API (`npm run test:api`): 42 aprovados.
- PostgreSQL/PostGIS (`npm run test:db`): 31 aprovados.
- Build de produção Webpack (`npm run build -- --webpack`): aprovado, com compilação, TypeScript e 34 páginas estáticas. A primeira tentativa no sandbox foi impedida pelo SWC ao canonicalizar a raiz do workspace; a execução local autorizada concluiu com sucesso. O Next.js emitiu apenas o aviso de `package-lock.json` fora da raiz do repositório.

## Matriz de navegadores

Comando: `npm run test:browsers -- --grep-invert 'reconecta o feed de alertas'`. Foram executados 118 testes: **97 aprovados e 21 reprovados**. O teste hospedado de reconexão foi excluído nos três projetos desktop porque as credenciais sintéticas `TASK26_*` não estavam configuradas; ele não conta como aprovado.

- Chromium: 28/34 aprovados.
- Firefox: 27/34 aprovados.
- WebKit: 27/34 aprovados.
- Mobile Chromium (Pixel 7): 8/8 aprovados.
- Mobile WebKit (iPhone 13): 7/8 aprovados.

Falhas observadas:

- O teste de login procura o título exato `Dashboard`; a tela atual apresenta `Quadro de situação` (Chromium, Firefox e WebKit).
- Os testes dos indicadores mantêm datas fixas de junho de 2024; a tela inicia no período atual e rejeita o intervalo intermediário acima do limite de 31 dias (Chromium, Firefox e WebKit).
- O teste de criação manual procura `form` → label `Tipo`; o DOM atual expõe o seletor, mas não sob esse ancestral (Chromium, Firefox e WebKit).
- A comparação histórica de zonas não apresenta o título esperado na tela atual (Chromium, Firefox e WebKit). O lint também sinaliza estado e funções de histórico sem uso em `RiskZonePanel.tsx`.
- O teste das marcas institucionais encontra as imagens, mas `naturalWidth` é zero em Firefox e WebKit porque a rota de teste bloqueia solicitações externas; Chromium e mobile Chromium passaram.
- O teste de retry idempotente falha no Firefox por usar um locator genérico `role=status` que corresponde a dois elementos; o snapshot registra a ocorrência criada e o protocolo `7007`.

Os casos locais usam Auth/Realtime de fixture/simulados e não comprovam serviços Supabase reais. A matriz encontrou regressões ou incompatibilidades de teste e, portanto, não satisfaz o aceite integrado.

## Capacidade e rastreabilidade

O relatório de 2026-10-01 continua aprovado para o cenário executado naquela revisão: 60 minutos, 50 mil ou mais ocorrências históricas, 100 criações, 10 sessões, 2.652 requisições, CSV de 100.480 linhas e zero erros inesperados. O artefato não registra SHA. Desde a referência `8c7f0e6`, o commit atual inclui mudanças em 35 arquivos de aplicação, scripts e banco (981 inserções e 896 remoções), além das alterações locais das Tasks 30/31. Não é possível atribuir aquele resultado de carga ao candidato atual; conforme decisão do usuário, nova medição fica para o futuro MCP dedicado e não bloqueia esta Task.

A restauração aprovada da Task 19 é de 2026-10-01 e cobre 30 migrations/27 tabelas. O checkout atual contém 44 diretórios de migration, incluindo a migration local ainda não commitada da Task 30. Nenhuma restauração foi executada nesta rodada. Auth, objetos privados do Storage, papéis globais e publicação Realtime permanecem limites separados da restauração PostgreSQL.

## Estado do aceite após a primeira matriz (registro histórico)

Na primeira matriz, a Task 20 permaneceu **In Progress** porque havia casos E2E reprovados, reconexão/serviços hospedados sem validação e restauração da Task 19 defasada em relação ao conjunto de migrations atual. As correções e a nova matriz estão registradas abaixo. A carga foi posteriormente removida do fechamento por decisão do usuário; nenhum backup ou restore novo foi executado.

## Revalidação após correções — 2026-10-06 (registro anterior ao fechamento)

- **Checkout:** `geo-alerta-0-1-0`, `3b0ca73`, mantendo as alterações locais das Tasks 30/31. Nenhum commit foi criado.
- **Matriz Playwright local:** 118/118 aprovados — Chromium 34/34, Firefox 34/34, WebKit 34/34, mobile Chromium 8/8 e mobile WebKit 8/8. A reconexão hospedada foi excluída nos três navegadores desktop (3 casos) por ausência de `TASK26_MANAGER_EMAIL` e `TASK26_MANAGER_PASSWORD`; esses casos não contam como aprovação.
- As 21 falhas da primeira rodada foram resolvidas: título esperado, datas/estado vazio das fixtures, locators de criação e retry, renderização da comparação histórica e espera de imagens lazy-load. A seção de comparação histórica voltou a renderizar o formulário, erros e o mapa já existentes no componente.
- **Verificações locais:** TypeScript aprovado; lint sem erros nem avisos; unitários 155/155; API 42/42; PostgreSQL/PostGIS 31/31; build Webpack aprovado, com 34 páginas estáticas.
- **Carga:** não executada por decisão do usuário. O aceite do Notion foi atualizado para retirar a carga e as medições de capacidade desta Task e transferi-las para o futuro MCP dedicado. Capacidade permanece sem comprovação.
- **Serviços hospedados:** a matriz de 118 testes usa o banco PostgreSQL/PostGIS local e autenticação fixture; não comprova Auth/Storage/Realtime reais no candidato. O projeto dedicado de homologação foi localizado e confirmado ativo, mas não foi alvo desta rodada. A reconexão hospedada permanece sem execução por falta das credenciais sintéticas exigidas pelo teste.
- **Dependência da Task 19:** permanece `In progress`. A evidência disponível cobre 30 migrations/27 tabelas, enquanto o checkout atual possui 44 diretórios de migration. Nenhuma restauração foi executada, conforme a orientação vigente de não fazer isso agora.
- **Estado atual:** Task 20 permanece **In progress**. A matriz local e os checks locais passaram, porém reconexão/serviços hospedados do candidato e a dependência explícita de restauração da Task 19 seguem pendentes. A Task não foi marcada como Done.

## Evidência adicional — exportação CSV de 50 mil registros — 2026-10-06 (antes da decisão final de escopo)

- Foi acrescentado `tests/api/occurrence-export-50k.spec.ts`, que cria 50.000 registros sintéticos no banco local explicitamente allowlisted, autentica como gestor, exporta pelo endpoint real com filtros de data, tipo e grupo, confere os cabeçalhos de contagem, 50.000 linhas de dados mais cabeçalho, primeiro/último protocolo e snapshot dos registros antes/depois. O `finally` remove apenas os registros identificados pelo prefixo aleatório do teste.
- O teste específico passou (1/1); a suíte API completa passou (43/43); TypeScript (`tsc --noEmit`) passou; lint passou sem saída/diagnósticos.
- O relatório é evidência do endpoint e banco sintético local na revisão `3b0ca73` com alterações locais presentes; não demonstra exportação no Supabase hospedado.
- A Task 20 permanece **In progress**: a restauração atual da Task 19 não foi executada conforme orientação do usuário; a reconexão/validação do candidato nos serviços hospedados também não foi comprovada. O ensaio de carga e métricas de capacidade continuam removidos do fechamento e sem execução.

## Fechamento da Task 20 — 2026-10-06

- **Decisão de escopo do usuário:** a Task 19 não bloqueia o fechamento da Task 20; sua restauração segue separada e sem execução. O ensaio de uma hora e as métricas de capacidade ficam para o MCP dedicado, sem declaração de capacidade nesta Task.
- **Validação local no checkout `3b0ca73`:** TypeScript e lint aprovados; unitários 155/155; API 43/43 (inclui o CSV de 50 mil); PostgreSQL/PostGIS 31/31; build Webpack aprovado com 34 páginas estáticas; Playwright 118/118 nos cinco perfis de navegador.
- **Integrações reais já validadas:** os relatórios `ticket-20-2026-10-01.md`, `real-services-2026-10-01.json`, `real-spatial-recovery-2026-10-01.json`, `real-group-isolation-2026-10-01.json`, `real-mutations-2026-10-01.json`, `real-public-photos-2026-10-01.json` e `real-browser-alerts-2026-10-01.json` cobrem Auth, sessão suspensa sem refresh, canal antigo, isolamento entre grupos, PostGIS, transições, Storage privado, Realtime e reconciliação. A Task 26 acrescenta E2E hospedado 1/1 na homologação Supabase temporária, com reconexão/snapshot, alertas autorizados, RLS, Auth e Storage; as contas e linhas específicas daquele E2E foram removidas ao final. O E2E hospedado não foi repetido nesta rodada porque o `.env` local aponta ao projeto GeoAlerta principal e o usuário exige preservar esse projeto; os três casos omitidos da matriz atual não são contados como aprovação, e a evidência 1/1 da Task 26 permanece identificada como execução separada. A revisão entre o commit testado pela Task 26 (`19c59c3`) e o checkout atual não encontrou mudanças na lógica de autorização/Auth, Storage ou feed Realtime do servidor; as alterações visuais atuais passaram pela matriz local.
- `docs/releases/core/testing/automated-tests.md` relaciona histórias/requisitos aos testes e relatórios; a matriz local e os relatórios integrados foram revisados em conjunto. O CSV de 50 mil foi verificado novamente no checkout atual.
- **Conclusão:** os critérios de aceite da Task 20 ficam atendidos com essas evidências e limitações explicitadas. A Task 19 permanece `In progress` separadamente. Nenhum commit, push, merge ou deploy foi executado.
