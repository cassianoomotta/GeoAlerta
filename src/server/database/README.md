# Adaptador Prisma Core

Cliente somente servidor com Prisma 7 e adapter pg. Usa exclusivamente DATABASE_URL de execução, sem fallback para credenciais de migration. Não é importado pelo domínio ou navegador. A geração do client é explícita: `node scripts/with-env.mjs prisma generate`.

O contexto transacional e a checagem de role/RLS estão em `../access/context.ts`. DATABASE_URL deve usar conexão restrita com current_user geoalerta_runtime; session_user também deve ser sem superuser/BYPASSRLS e não ser proprietário das tabelas. Este cliente não estabelece sessão Supabase: a fronteira `withSession` verifica Auth e perfil atual antes de acessar dados.
