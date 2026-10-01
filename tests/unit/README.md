# Testes unitários

Esta pasta reúne testes de regras e fluxos que podem rodar sem Docker, banco de dados ou serviços externos. O comando `npm run test:unit` executa o projeto `unit` do Playwright; apesar do nome do executor, estes casos são testes unitários, não testes de navegador.

Os arquivos `.spec.ts` cobrem validação, permissões, regras de domínio, casos de uso, serialização CSV, fotos, concorrência e guardrails de ambiente. `load-workflow.spec.ts` valida o agendador e as proteções do teste de carga sem iniciar a carga nem fazer chamadas de rede.

Estes testes não comprovam migrations, RLS, PostGIS, autenticação Supabase, Storage, Realtime ou integração real entre API e navegador. Essas verificações pertencem às suítes integradas e dependem de um alvo de teste isolado.
