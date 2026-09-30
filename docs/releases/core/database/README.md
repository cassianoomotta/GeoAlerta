# Banco de dados — Prisma e Supabase

**Estado:** fundação do ticket 01 implementada e testada localmente com Prisma 7.10.0 e PostgreSQL/PostGIS isolado. Fonte histórica autorizada pelo usuário: `supabase.sql` e `supabase_migrations/`. Baseline e expansão estão em `prisma/migrations/`; autorização operacional e integração dos serviços Supabase permanecem nos tickets posteriores. Ver [evidência de execução](../testing/results/ticket-01-2026-09-30.md).

Esta pasta define a organização dos dados e das migrations da [release Core](../PRD.md). Prisma será o ORM do servidor e Prisma Migrate será o histórico único de alterações do esquema da aplicação no PostgreSQL do Supabase. Auth, Storage, Realtime e PostGIS continuam sendo serviços/extensões do Supabase.

## Arquivos planejados e responsabilidades

Os caminhos abaixo são relativos à raiz; ainda serão criados pelos agentes.

| Caminho | Responsabilidade |
|---|---|
| `prisma/schema.prisma` | Modelo relacional Core e mapeamento das tabelas existentes que precisam ser preservadas. |
| `prisma/migrations/<identificador>/migration.sql` | Alterações geradas pelo Prisma e SQL complementar para PostGIS, RLS, grants, funções, Storage e Realtime. |
| `prisma.config.ts` | Caminhos do schema/migrations e conexão de migrations; carrega exclusivamente `.env` na raiz do repositório em desenvolvimento. |
| `src/server/database/prisma.ts` | Cliente Prisma apenas no servidor, com conexão de execução sem privilégios de migration. |
| `src/server/database/actor-transaction.ts` | Contexto de identidade restrito à transação, para RLS e isolamento de sessões. |
| `scripts/with-env.mjs` | Carregador comum de `.env` na raiz do repositório para comandos locais; não escreve credenciais. |
| `tests/database/` | Fixtures sintéticas e verificações de migrations, políticas e consultas espaciais. |

Usar a família Prisma ORM 7 e adapter PostgreSQL; antes da instalação, o agente valida compatibilidade de Node/TypeScript e fixa as versões exatas de `prisma`, `@prisma/client` e adapter, mantendo CLI e client alinhados. O lockfile registra a resolução. A versão instalada determina o formato de `prisma.config.ts` e a geração do client; não copiar configuração antiga sem conferir a documentação.

## Conexões e ambiente

| Variável em `.env` na raiz do repositório | Uso |
|---|---|
| `DATABASE_URL` | Execução do Prisma no servidor com usuário de privilégio mínimo; pooler apropriado ao ambiente. |
| `DIRECT_URL` | Conexão de migrations via conexão direta ou pooler em modo sessão, com role de migration. Não usar modo transação para migrations. |
| `SHADOW_DATABASE_URL` | Banco descartável e separado para o shadow database de desenvolvimento; nunca apontar ao banco de dados da aplicação. |
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint público do Supabase; no teste, instância isolada. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Nome legado usado no projeto; chave pública apropriada à versão adotada, nunca `service_role`/secret. |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente servidor e setup de testes/administração de Auth/Storage quando necessário; não é conexão Prisma nem vai ao navegador. |
| `TEST_DATABASE_URL` | Banco isolado da suíte; os scripts exigem alvo de teste explicitamente permitido antes de escrever fixtures. |

As URLs e senhas são fornecidas pelo usuário no ambiente, sem valores reais nos documentos. O código permanece na raiz; comandos locais carregam `.env` na raiz do repositório explicitamente. Não usar `.env.local`, `.env.test` ou outro arquivo de variáveis local. CI injeta variáveis na execução e não publica estado de autenticação, traces ou segredos.

O guia oficial explica as opções de conexão e a configuração Prisma do Supabase. A separação entre credenciais de execução e migration é uma decisão deste projeto para preservar RLS: [Prisma no Supabase](https://supabase.com/docs/guides/database/prisma).

## Modelo e segurança

- Entidades Core: ocorrências, dados privados do cidadão, eventos, zonas de risco versionadas, perfis administrativos, grupos, vínculos, preferências, transições, auditoria, idempotência e feed de alertas. Os nomes e limites são os da [arquitetura](../architecture/README.md#4-persistência-e-consistência).
- Mapear tabelas/colunas legadas com `@@map`/`@map` quando necessário; não recriar dados apenas para renomear entidades no client.
- Geometrias/consultas PostGIS ficam no adaptador espacial; usar tipos suportados pela versão instalada ou `Unsupported` quando necessário, com SQL parametrizado para operações espaciais. O domínio recebe coordenadas/IDs, não tipos Prisma.
- A triagem considera ponto dentro ou na borda de zona ativa/vigente, guarda a versão das zonas correspondentes e ocorre na mesma transação da ocorrência, do protocolo, da idempotência, do evento e do alerta.
- A role de execução não é proprietária das tabelas e não tem `BYPASSRLS`. A aplicação valida a identidade Supabase e configura `request.jwt.claims`/role com escopo local à transação para operações autenticadas; `auth.uid()` e perfil/grupos atuais sustentam as políticas. Papel/grupo enviados pelo cliente não são fonte de autoridade.
- A conexão de servidor usa `geoalerta_runtime`, e a ingestão usa `geoalerta_ingest`; as políticas das tabelas operacionais são destinadas a essas roles restritas. As roles públicas `anon`/`authenticated` não recebem grants de escrita nas tabelas Core; para alertas, `authenticated` recebe apenas leitura do feed com RLS. O servidor não precisa trocar para `authenticated` para escrever pelo Prisma. Assim, o JWT do navegador não permite contornar os casos de uso via Data API.
- Entrada pública usa uma role de ingestão somente no servidor, com grants/policies restritos à criação e ao retorno da própria tentativa. Não conceder escrita anônima direta irrestrita via Data API. A role de ingestão não consulta ocorrências de terceiros nem administra o sistema.
- Dados pessoais têm tabela privada separada e regras próprias; RLS sozinho não mascara colunas. Auditar alterações sem publicar diferenças privadas no feed Realtime. Postgres Changes publica exclusivamente `occurrence_alerts` para os alertas Core.
- RLS, grants e políticas por operação protegem todas as tabelas expostas; Storage permanece privado com autorização temporária. Testar as permissões como usuário real de aplicação, além de fixtures administrativas. Referência: [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Baseline do legado e migrations

1. Inventariar o esquema real em cópia isolada e comparar com `supabase.sql` e `supabase_migrations/001_expansao_ecossistema.sql`. Os scripts antigos são evidência histórica, não um segundo histórico ativo.
2. Criar uma baseline Prisma que reproduza o estado legado observado, incluindo extensões/objetos SQL necessários. Schemas gerenciados pelo Supabase (`auth`, `storage`) não são recriados como tabelas da aplicação; registrar apenas integrações e políticas que pertencem à aplicação.
3. Validar a baseline tanto em banco vazio quanto em cópia com dados. Em cópia existente compatível, marcar a baseline como já aplicada usando Prisma Migrate; não reaplicar criação de tabelas. Reconciliação com ambiente compartilhado será feita pelo usuário.
4. Gerar a migration Core com `--create-only`, revisar o SQL e acrescentar objetos não representados no schema antes de aplicar. Após aplicada, uma migration não é reescrita: correções geram outra migration.
5. Mapear `Aberto → NOVA`, `Em Atendimento → EM_ATENDIMENTO`, `Resolvido → RESOLVIDA`, `Recusado → CANCELADA`. Valores como `Novo` ou outros encontrados no inventário entram no relatório de pré-migração e precisam de decisão explícita antes das restrições. Localização ausente e dados incompletos legados ficam identificados para saneamento, sem fabricação de GPS ou exclusão de registros.
6. Aplicar mudanças aditivas na cópia isolada, preencher campos Core e conferir contagens, IDs e arquivos do legado. Não executar `DROP`, reset ou exclusões em recursos, abrigos, equipes/GPS e voluntários.
7. Reaplicar todo o histórico em banco de teste vazio e executar testes de políticas, espacialidade, concorrência e restauração. Depois gerar evidência para revisão do usuário.

Baseline é o mecanismo oficial para adotar Prisma Migrate com dados existentes: [baselining](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining). Objetos não modelados são adicionados ao SQL antes da aplicação: [customização para recursos não suportados](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features).

## Comandos planejados

Executar a partir da raiz, depois da tarefa de fundação e somente contra o alvo local/descartável permitido:

```bash
node scripts/with-env.mjs prisma validate
node scripts/with-env.mjs prisma generate
node scripts/with-env.mjs prisma migrate dev --create-only --name core_foundation
node scripts/with-env.mjs prisma migrate dev
node scripts/with-env.mjs prisma migrate status
npm run test:db
```

O carregador resolve os executáveis instalados no projeto. `migrate dev` exige desenvolvimento e shadow database separados. Agentes podem criar, revisar e testar migrations locais; aplicação a ambiente compartilhado/produção e publicação pertencem ao usuário. Nenhum script de `dev`, `build` ou teste deve disparar migration em produção. Não usar `db push` como substituto do histórico versionado nem introduzir migrations paralelas do Supabase CLI para os mesmos objetos.

**Aceite:** esquema reproduzível a partir do histórico, preservação do legado, políticas comprovadas com identidades distintas, ausência de contexto residual no pool e evidência de restauração em banco de teste. O [plano de testes](../testing/automated-tests.md) define os cenários.
