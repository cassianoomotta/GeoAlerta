# Testes automatizados

- [automated-tests.md](automated-tests.md): estratégia Playwright, matriz de histórias/requisitos, fixtures, cenários negativos, migrations, capacidade e critérios de aceite.

Os tickets 01 a 04 possuem suíte executável em `tests/` e configuração Playwright na raiz. Os resultados sanitizados ficam em `results/`. As demais histórias permanecem no [plano por agentes](../../../superpowers/plans/2026-09-29-geoalerta-core.md). A matriz acompanha [requirements.md](../requirements.md) e o [PRD](../PRD.md).

O Ticket 03 usa um proxy local de fixtures na porta 3102 que sobrescreve headers de origem para modelar o ingresso Vercel. A aplicação fica na porta 3100. Esse proxy não faz parte da aplicação publicada e não comprova a execução da plataforma Vercel. Ingestão, idempotência, contador, classificação espacial e rollback usam PostgreSQL/PostGIS real com role restrita `geoalerta_ingest`.

O Ticket 04 usa 125 ocorrências autorizadas, oito de outro grupo do mesmo município, quatro de outro município e três excluídas logicamente, com um tipo sintético exclusivo por execução. Nenhum histórico é apagado. A lista, total, SQL parametrizado e preferências por conta executam no banco real sob `geoalerta_runtime`; os testes antigos verificam seus IDs conhecidos sem pressupor banco vazio.

Os tickets 01–05 preservam seu escopo e histórico. As histórias 06–20 distinguem validação básica por história do aceite integrado no fechamento da release. O backlog de implementação está em `.scratch/release-0.1.0/issues/`; a matriz acompanha [requirements.md](../requirements.md) e o [PRD](../PRD.md).

O projeto Playwright `unit` executa sem banco e sem servidor. Os projetos `api` e de navegador preparam uma base PostgreSQL e um servidor HTTP de Auth de fixtures em `127.0.0.1:3101`; o projeto `database` também depende de base PostgreSQL. Portanto, somente os testes unitários existentes são adequados à validação básica sem infraestrutura. Os testes de integração atuais não são prova de funcionamento em Supabase real.

Na validação integrada final, a aplicação será configurada para um projeto Supabase exclusivo de homologação. A suíte existente ainda precisa de adaptação de fixtures e da preparação de contas, papéis, grupos, permissões e buckets nesse projeto; trocar somente a URL não basta. Não aplicar migrations remotas durante o desenvolvimento ou a atualização deste planejamento.