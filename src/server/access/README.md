# Acesso Core

Supabase `getUser()` verifica identidade no servidor. `withSession` inicia uma transação Prisma restrita, instala somente o UUID verificado com `set_config(..., true)` e consulta perfil/grupos atuais. Metadados do navegador não autorizam. Cada operação protegida deve usar essa fronteira; o Proxy atualiza cookies e protege navegação legada, sem substituir a autorização da API.

DATABASE_URL deve conectar com current_user geoalerta_runtime (sem superuser, BYPASSRLS ou propriedade das tabelas). Credenciais administrativas são recusadas; não há fallback. RLS/grants estão na migration 202609300003. Testes usam conexão LOGIN restrita com essa role e Auth HTTP simulado exclusivamente no processo de teste.
