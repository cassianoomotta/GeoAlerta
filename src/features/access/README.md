# Contratos de acesso Core

Tipos independentes de Next.js, Prisma e Supabase para ator, papel, estado, perfil, grupos, vínculos e preferências. Não representam autorização implementada. A implementação dos casos de uso pertence aos próximos tickets após o aceite da fundação.

Ticket 02 iniciado: `domain/permissions.ts` implementa a matriz pura do PRD, com estado ativo, município, grupos e capacidades. Ainda não está conectado à identidade/Supabase/API/RLS; não substitui autenticação nem representa aceite do ticket 02. Verificação: `npm run test:unit`.

Verificação: `node node_modules/typescript/bin/tsc --noEmit`.
