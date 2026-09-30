# Suíte Core — fundação ticket 01

Playwright 1.63.0 configura projetos unit, api, database, chromium, firefox, webkit e dois projetos móveis. A fundação inclui domínio/guardas, migrations reais PostgreSQL/PostGIS, smoke HTTP e smoke de navegador. Jornadas Core e projetos móveis serão implementados nos próximos tickets. `--list` apenas descobre testes e não comprova sua execução.

`npm run test:unit` testa guardas e relatório/mapeamento puro do legado. `npm run test:db` verifica ambiente, operação PostGIS, baseline em cópia compatível, expansão e preservação. Cada execução de migrations usa namespaces sintéticos novos nos bancos permitidos, com adaptação apenas dos nomes de schemas/publicação; os SQL originais permanecem imutáveis. O primeiro ensaio aplicou o histórico canônico nos schemas públicos dos dois alvos isolados. Não há DROP/reset; namespaces de teste são retidos para inspeção.

`platform.sql` contém fixtures SQL mínimas de auth/storage/publicação para Docker PostgreSQL puro. Não é prova de funcionamento dos serviços Supabase. Preservação de arquivos cobre referências/metadata SQL e bytes de arquivo sintético local, sem alegar upload/backup de Storage remoto.

No `.env` existente da raiz, disponibilizar `TEST_DATABASE_URL`, `DIRECT_URL` e `SHADOW_DATABASE_URL`, além de `TEST_DATABASE_ALLOWLIST` como array JSON de URLs dos bancos descartáveis permitidos. O alvo de teste deve ser diferente de `DATABASE_URL` e de `PRODUCTION_DATABASE_URL` quando presente; migration e shadow devem ser bancos distintos. A operação é local/isolada; ambiente compartilhado permanece sob controle do usuário. Não enviar credenciais ao chat nem incluir valores reais em evidências.

Browsers ficam em `.cache/playwright` (ignorado). Instalação: `node scripts/with-env.mjs playwright install chromium firefox webkit`. Os scripts de testes de navegador iniciam um servidor local na porta 3100 sem reutilizar um processo externo.

Relatórios HTML/JUnit e traces ficam em pastas ignoradas. Um resumo sanitizado registra resultados reais em `docs/releases/core/testing/results/`.
