# Plano de execução — Task 36: dashboard por evento climático

**Especificação de aceite:** Task 36 no Notion, `[0.1.0] 36 — Acompanhar e comparar eventos no dashboard` (`3f1efe2e-57f2-81cf-b2fa-f1378118fd64`). Esta página é a fonte funcional; este plano organiza a implementação sem duplicar nem alterar a especificação.

## Resultado esperado

Em `/painel`, mostrar o evento ativo do município por padrão e permitir comparar dois eventos, dentro do escopo autorizado do usuário. Para cada evento, apresentar total e distribuições por tipo, prioridade, apoio médico e status; exibir categorias e percentuais coerentes, refletir atualizações e não enviar ocorrências nem dados pessoais ao navegador.

## Decisões técnicas propostas

- Preservar a separação existente entre indicadores do painel e exploração do mapa. Não reutilizar a consulta de marcadores nem o limite temporal/paginação das telas de ocorrências.
- Fazer a agregação no servidor, com contagem SQL de todos os registros autorizados, não excluídos logicamente e vinculados pelo `climate_event_id` persistido.
- Entregar lista/estado dos eventos selecionáveis e agregados em uma leitura coerente. Validar IDs e município no servidor; confiar no isolamento RLS já aplicado ao ator para escopo de grupos e nunca retornar dados de ocorrência.
- Modelar `needs_medical_support` em três categorias: Sim, Não e Não informado. Completar status/categorias sem registros com zero e percentuais com total zero também como zero.
- Manter a interação no limite Client Component necessário para seleção e Atualizar, reutilizando o padrão de componentes do dashboard e expondo tabelas textuais acessíveis junto aos gráficos.
- Não alterar schema nem aplicar migrations no banco compartilhado para esta tarefa. Os testes de banco serão feitos no alvo isolado; a verificação atual mostrou que o banco da equipe não tem `needs_medical_support`, embora tenha `climate_events` e `occurrences.climate_event_id`.

## Etapas de implementação

1. **Domínio e contrato** — criar tipos e validação para seleção de evento base/comparado, estados elegíveis e resultado agregado; definir estado vazio, ID inválido e categorias estáveis. Escrever primeiro testes unitários para estas regras.
2. **Consulta protegida** — criar consulta/aplicação server-only para opções e agregados. Usar uma instrução SQL agregada sobre o conjunto autorizado, excluir `deleted_at` e preservar tipos históricos. Escrever testes de banco para distribuição exata, evento vazio, exclusão, isolamento de grupo/município, período completo e volume acima de paginação/marcadores.
3. **API** — adicionar endpoint autenticado no padrão `/api/core`, validando autorização dos dois eventos antes de retornar resultados genéricos para IDs inválidos ou fora do município. Testar contrato, seleção ativa por padrão e ausência de dados pessoais.
4. **Dashboard** — integrar seletor de eventos ao `/painel`; mostrar seleção, totais, abertos/concluídos/cancelados e gráficos lado a lado com as mesmas categorias, quantidades e percentuais. Cobrir carregamento, sem histórico, zero ocorrências, erro, atualização e evento ativo encerrado entre leituras.
5. **Fechamento** — testes E2E com dataset determinístico A/B/C, combinações de desktop/celular/teclado, lint dos arquivos alterados, TypeScript, testes afetados e build. Registrar comandos, resultados e limitações em `docs/releases/core/testing/results/` e só então marcar aceite no Notion.

## Verificações de segurança e consistência

- Confirmar que cada distribuição soma o mesmo total do evento e que `Não informado` nunca é convertido em `Não`.
- Exercitar usuário de dois grupos diferentes, outro município, usuário suspenso e usuário sem sessão com os papéis reais da fixture/test database.
- Comparar respostas com fixtures determinísticas; incluir tipo desativado presente no histórico, evento vazio, evento sem ocorrências, ocorrência sem evento e registro excluído.
- Confirmar que nenhum dado pessoal ou contagem de grupo não autorizado aparece na resposta/API, inclusive nos erros.
- Verificar que Atualizar refaz opções e agregados juntos e que estado atual substitui rótulos antigos de “ativo”.

## Limites

Não implementar gravidade, comparação de mapa, snapshots, séries diárias, normalização por duração, BI ou sincronização com planilhas. Não modificar PRs, banco remoto, migrations, commits ou deploys.

## Pré-condições e estado observados

- Tasks 34 e 35 estão aceitas e integradas em `geo-alerta-0-1-0` (PRs #4 e #5).
- O checkout-base estava limpo e igual a `origin/geo-alerta-0-1-0` em `48adcfb` antes de iniciar este plano.
- A validação Next.js deve seguir os guias locais de Server/Client Components, Fetching Data e Route Handlers em `node_modules/next/dist/docs/01-app/01-getting-started/`.
- O banco compartilhado tem as migrations de eventos climáticos, mas ainda não reflete todo o código integrado: falta a coluna `occurrences.needs_medical_support`; também não consta o índice `audit_events_at_id_desc` da Task 30. Isso é sincronização de banco separada, não autorização para aplicar DDL remoto nesta tarefa.

## Método de execução proposto

Execução nativa nesta sessão, em branch `feat/task-36-dashboard-eventos` criada a partir de `geo-alerta-0-1-0`, sem novo worktree e sem commits. As etapas dependem do contrato/query/API anterior; manter uma sequência única reduz divergência entre a agregação protegida e os componentes que a consomem.
