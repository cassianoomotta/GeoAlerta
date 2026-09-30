# Histórico Core

Fonte legada autorizada pelo usuário: `supabase.sql` e `supabase_migrations/`. Esses arquivos foram reproduzidos e observados no PostgreSQL/PostGIS isolado antes de criar a baseline `0_legacy`. A baseline preserva seu SQL, inclusive RLS, publicação e integração de Storage não representáveis pelo Prisma. Após adoção, o único histórico ativo é `prisma/migrations/`; não reaplicar scripts históricos.

`legacy.prisma` é o snapshot introspectado das tabelas de aplicação. PostGIS mantém `spatial_ref_sys` externamente; essa tabela não integra o modelo da aplicação. `schema.prisma` representa o estado após expansão, e `generated/` fica ignorado.

Em cópia legada compatível, usar `prisma migrate resolve --applied 0_legacy` e aplicar expansão sem reset. Em banco vazio, replay da baseline e expansão. Comandos exigem DIRECT_URL/SHADOW_DATABASE_URL na lista de teste; nenhuma migration é disparada por dev/build. Schemas auth/storage são pré-requisitos externos em Supabase. Docker puro usa `tests/fixtures/platform.sql` como fixture SQL declarada; isso não representa execução dos serviços Auth/Storage/Realtime.

Estados desconhecidos ou localização ausente interrompem a expansão antes de DDL. Não se inventa GPS, precisão ou contato; legado compatível recebe protocolo determinístico, mantém estado original em legacy_status e sinaliza saneamento de precisão/contato. Novos registros exigem localização e precisão.
