# Testes automatizados

- [automated-tests.md](automated-tests.md): estratégia Playwright, matriz de histórias/requisitos, fixtures, cenários negativos, migrations, capacidade e critérios de aceite.

Os tickets 01 a 04 possuem suíte executável em `tests/` e configuração Playwright na raiz. Os resultados sanitizados ficam em `results/`. As demais histórias permanecem no [plano por agentes](../../../superpowers/plans/2026-09-29-geoalerta-core.md). A matriz acompanha [requirements.md](../requirements.md) e o [PRD](../PRD.md).

O Ticket 03 usa um proxy local de fixtures na porta 3102 que sobrescreve headers de origem para modelar o ingresso Vercel. A aplicação fica na porta 3100. Esse proxy não faz parte da aplicação publicada e não comprova a execução da plataforma Vercel. Ingestão, idempotência, contador, classificação espacial e rollback usam PostgreSQL/PostGIS real com role restrita `geoalerta_ingest`.

O Ticket 04 usa 125 ocorrências autorizadas, oito de outro grupo do mesmo município, quatro de outro município e três excluídas logicamente, com um tipo sintético exclusivo por execução. Nenhum histórico é apagado. A lista, total, SQL parametrizado e preferências por conta executam no banco real sob `geoalerta_runtime`; os testes antigos verificam seus IDs conhecidos sem pressupor banco vazio.

Para o ticket 02, conforme autorização de Cassiano, Auth é um servidor HTTP de fixtures local em 127.0.0.1:3101, usado pelo SDK real @supabase/ssr para emitir cookies e verificar identidades simuladas. A aplicação de teste recebe configurações injetadas; `.env` e o projeto Supabase oficial permanecem intactos. Perfil, grupos, grants, RLS, PostGIS e transações são reais no Docker TEST_DATABASE_URL. Uma role LOGIN gerada sem privilégios administrativos conecta como geoalerta_runtime. Credenciais de fixtures ficam em memória. Estes testes não comprovam disponibilidade ou funcionamento do Auth remoto.
