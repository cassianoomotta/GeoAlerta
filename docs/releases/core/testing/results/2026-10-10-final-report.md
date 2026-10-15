# Relatório final da rodada de testes — GeoAlerta (2026-10-10)

## Escopo e conclusão

Esta rodada combinou verificações locais, consultas leves em produção e verificações na homologação `Teste_GeoAlerta` (plano Free). Após a rodada, o usuário informou que preencheu a senha do gestor no `.env`; confirmei que a variável está preenchida e que a URL local aponta para o Supabase de teste. A cobertura ponta a ponta autenticada no domínio publicado ainda não foi concluída, porque o `.env` local não altera as variáveis da aplicação na Vercel e não há URL Vercel de teste identificada.

Produção permaneceu somente leitura. Não houve criação/edição de ocorrências, alteração de permissões ou carga concorrente em produção.

## Resultados

- **Observação de produção por 90 minutos (2026-10-09):** 90 requisições sequenciais `GET /api/core/public/occurrence-types`, uma por minuto; 90 HTTP 200, zero falhas; p50 981 ms, p95 1.066 ms, máximo 2.568 ms. É uma verificação sustentada de baixa frequência, não um teste de estresse.
- **Smoke Playwright em produção:** `/`, `/login` e `/api/core/public/occurrence-types` responderam HTTP 200.
- **Verificação visual ao vivo:** a página pública carregou os tipos; ao abrir /login, o Chrome reaproveitou uma sessão já autenticada e redirecionou para /painel. Não naveguei nos dados nem acionei controles; fechei a aba. O teste autenticado deve usar contexto Playwright isolado.
- **Suíte unitária:** `npm run test:unit` — 190 aprovados.
- **Qualidade local anterior:** lint e `tsc --noEmit` aprovados. Design system: 5 aprovados e 2 falhas (contraste 3,106 abaixo do mínimo 4,5; tema do formulário público esperava `dark`, recebeu `light`).
- **Homologação:** os cinco usuários `-teste@gmail.com` e seus perfis/escopos foram encontrados no projeto de teste. A matriz de capacidades de Administrador, Gestor, Operador e Consulta passou nas verificações SQL realizadas.
- **Playwright autenticado:** a tentativa anterior ocorreu antes da senha ser preenchida e parou com `Invalid login credentials`; esse resultado precisa ser reexecutado no alvo correto. Nenhum registro foi criado por essa execução.
- **Banco local de teste:** `localhost:5433` não respondeu. O Docker Desktop foi iniciado em segundo plano, mas o daemon não ficou pronto após 55 segundos. Não há arquivo Compose do projeto. As suítes API/DB e jornadas E2E locais não foram executadas.

## Achados que exigem correção/validação

1. **Possível acesso indevido a dados privados pelo Voluntário na homologação.** `core_has_access(group_id, 'privateData')` retorna `true` para Voluntário, embora `accessible_groups('privateData')` o exclua. A política `core_event_read` usa a primeira função para `occurrence_events`; isso pode expor `reason` e `changes`. Não havia eventos na homologação para demonstrar linhas expostas. Produção não foi consultada para esse achado.
2. **Migração incompleta em homologação.** `20261007151000_occurrence_lifecycle_auth_uid_security` não foi aplicada porque depende de `public.set_occurrence_lifecycle()`, função ausente no histórico disponível. A dependência não foi contornada.
3. **Autenticação técnica revalidada.** Uma senha técnica do papel `geoalerta_runtime` do projeto de teste apareceu na saída do diagnóstico. Ela foi rotacionada somente na homologação e o `.env` foi atualizado sem imprimir o novo valor. A primeira conexão após a rotação retornou `28P01`; uma repetição pelo usuário qualificado do pooler passou em `SELECT current_user,current_database()`. `CORE_ACCESS_RUNTIME_URL` foi preenchida no `.env` com essa conexão validada.
4. **A política de leitura de `spatial_ref_sys` não foi alterada.** A tentativa anterior foi recusada pelo banco por falta de propriedade da tabela; nenhuma mudança ocorreu.

## Limites e segurança

- Nenhum teste de carga ou escrita foi dirigido à produção; o plano Free foi respeitado.
- O teste `npm run test:load` foi bloqueado pelo guardião do repositório (`DISPOSABLE_TARGET_CONFIRMATION_REQUIRED`) antes de conectar ou enviar requisições. Não foi contornado.
- Uma consulta de diagnóstico a `pg_authid` foi rejeitada pela revisão automática por envolver leitura de hashes de credenciais. Não houve leitura de hash nem tentativa alternativa; somente metadados seguros de `pg_roles` foram consultados.
- A alteração de senha da conta humana do gestor não foi feita. A senha de gestor permanece sob controle do usuário.
- A produção não recebeu migrações, mudanças de permissão, criação de usuário ou dados de teste.

## O que falta para concluir

1. A senha do gestor já está preenchida em `TASK26_MANAGER_PASSWORD` no `.env`; não é necessário enviá-la no chat.
2. Para o E2E hospedado, disponibilize uma URL de Preview/staging da Vercel configurada com as variáveis do Supabase `Teste_GeoAlerta`. O endereço local do `.env` não altera o backend da Vercel. Docker só entra em cena se também forem desejadas as suítes locais de banco/API.
3. A conexão `geoalerta_runtime` de homologação foi validada e `CORE_ACCESS_RUNTIME_URL` foi preenchida. As suítes DB/API ainda dependem do Postgres descartável local em `localhost:5433`.

Com uma URL Vercel apontando para `Teste_GeoAlerta`, a próxima execução pode retomar o E2E Playwright hospedado com o usuário de teste. Relatório de base e log sanitizado: arquivos ao lado deste documento.




