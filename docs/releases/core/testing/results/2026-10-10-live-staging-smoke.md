# GeoAlerta — smoke em produção e homologação (2026-10-10)

## Escopo

- A produção foi consultada apenas por GET, sem autenticação e sem alterar dados.
- A homologação usada foi `Teste_GeoAlerta` (`uivqeioteftkbxygqqia`), no plano Free.
- Não foi executado teste de estresse ou concorrência na produção.

## Resultados

- Playwright em produção: `GET /`, `GET /login` e `GET /api/core/public/occurrence-types` — **HTTP 200** nas três rotas.
- `npm run test:unit` — **190 aprovados**.
- Conectividade PostgreSQL de `geoalerta_runtime` e `geoalerta_ingest` na homologação — **conectou**; `SELECT current_user, current_database()` confirmou cada role.
- Os cinco usuários `-teste@gmail.com` têm perfis ativos no município de teste. Consulta, Operador, Gestor e Voluntário receberam o grupo padrão; Administrador mantém escopo municipal.
- O teste Playwright hospedado de reconexão de alertas iniciou o app local conectado à homologação, mas parou no login com `Invalid login credentials`. `TASK26_MANAGER_PASSWORD` ainda contém um marcador, não a senha real. O caso parou antes de criar ocorrência; nenhuma escrita foi feita por esse teste.
- Suítes API/DB e demais jornadas E2E não foram executadas: a instância local PostgreSQL esperada em `localhost:5433` não estava disponível.

## Achados de autorização na homologação

- A matriz de `core_has_access` está correta para Administrador, Gestor, Operador e Consulta.
- Para Voluntário, `core_has_access(group_id, 'privateData')` retorna `true`, embora os testes unitários e a função `geoalerta_private.accessible_groups('privateData')` limitem esse perfil à leitura comum.
- A política `core_event_read` de `occurrence_events` usa `core_has_access(..., 'privateData')`. Portanto, a política pode permitir ao Voluntário ler eventos e os campos `reason`/`changes` das ocorrências do grupo. Não havia registros de evento na homologação para confirmar a exposição de linhas; o resultado comprova a divergência entre função e política.
- A migração `20261007151000_occurrence_lifecycle_auth_uid_security` permanece pendente: falhou porque `public.set_occurrence_lifecycle()` não existe no banco nem nas migrações anteriores. Não contornei a dependência.
- A migração `202610060002_audit_events_timeline_index` foi aplicada na homologação com `CREATE INDEX IF NOT EXISTS` transacional, sem `CONCURRENTLY`, compatível com o executor do MCP.

## Configuração e limites

- `.env` foi direcionado ao projeto de teste; chaves administrativas de produção ficaram vazias. `DIRECT_URL`, `TEST_DATABASE_URL` e `SHADOW_DATABASE_URL` permanecem isoladas em localhost.
- A senha real do gestor de teste não foi alterada nem armazenada por este teste. Para executar o cenário autenticado, preencha `TASK26_MANAGER_PASSWORD` localmente com a senha do gestor da homologação; não a envie pelo chat.
- A alteração de senha pela interface do Supabase não foi feita: a skill Computer Use exige que o usuário assuma a etapa final de mudança de credencial.
- Nenhuma migração, permissão, usuário ou dado foi alterado na produção.
