# Fixtures isoladas

`database.ts` recusa destinos fora da allowlist e o banco operacional. `platform.sql` fornece somente pré-requisitos SQL sintéticos para reconstruir o legado autorizado, sem simular serviços externos como sucesso.

`access.ts` aplica migrations exclusivamente em TEST_DATABASE_URL, cria conexão LOGIN sem superuser/BYPASSRLS e dados sintéticos de papéis/estados/grupos. Credenciais são geradas em memória e injetadas no subprocesso Next. `auth-server.ts` simula explicitamente Auth HTTP local conforme autorização de Cassiano; `session.ts` usa @supabase/ssr real para gerar os cookies. Não há bypass de identidade, header de teste ou mock no código da aplicação.

Schemas e roles de teste são preservados para inspeção; não há DROP/reset. O servidor simulado existe apenas no runner. A conexão de aplicação deve ser provisionada pelo responsável no ambiente oficial; nenhuma migration/configuração compartilhada é aplicada automaticamente por dev/build.
