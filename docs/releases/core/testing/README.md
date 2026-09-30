# Testes automatizados

- [automated-tests.md](automated-tests.md): estratégia Playwright, matriz de histórias/requisitos, fixtures, cenários negativos, migrations, capacidade e critérios de aceite.

Os tickets 01 e 02 possuem suíte executável em `tests/` e configuração Playwright na raiz. Os resultados sanitizados ficam em `results/`. As demais histórias permanecem no [plano por agentes](../../../superpowers/plans/2026-09-29-geoalerta-core.md). A matriz acompanha [requirements.md](../requirements.md) e o [PRD](../PRD.md).

Para o ticket 02, conforme autorização de Cassiano, Auth é um servidor HTTP de fixtures local em 127.0.0.1:3101, usado pelo SDK real @supabase/ssr para emitir cookies e verificar identidades simuladas. A aplicação de teste recebe configurações injetadas; `.env` e o projeto Supabase oficial permanecem intactos. Perfil, grupos, grants, RLS, PostGIS e transações são reais no Docker TEST_DATABASE_URL. Uma role LOGIN gerada sem privilégios administrativos conecta como geoalerta_runtime. Credenciais de fixtures ficam em memória. Estes testes não comprovam disponibilidade ou funcionamento do Auth remoto.
