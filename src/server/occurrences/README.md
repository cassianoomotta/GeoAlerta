# Ingestão pública Core

`intake.ts` coordena uma transação Prisma com INGEST_DATABASE_URL separada. current_user deve ser geoalerta_ingest; login e role não podem ter superuser/BYPASSRLS ou propriedade de tabelas públicas. Não existe fallback para DATABASE_URL/DIRECT_URL. RLS restringe ocorrências à tentativa e idempotência à chave corrente; não há SELECT de dados privados ou terceiros.

O lock transacional pela chave serializa reenvios. Replay com hash canônico igual retorna a confirmação anterior antes de consumir o contador; corpo diferente retorna 409. Novas entradas consomem o contador PostgreSQL de 20 por minuto civil UTC/origem. Contador e registros são atômicos; uma falha reverte toda a transação. GPS, grupo padrão, PostGIS, versões das zonas, abertura, auditoria, alerta e resposta idempotente são persistidos antes do 201.

`origin.ts` aceita apenas x-vercel-forwarded-for quando VERCEL=1 é uma variável do processo. Headers alternativos não são autoridade. IPs são normalizados e persistidos somente como hash no contador. Fora da Vercel ou com header inválido, a API falha fechada com 503. A Vercel foi confirmada por Cassiano em 30/09/2026: https://vercel.com/docs/headers/request-headers.

Testes HTTP/navegador usam um modelo local explícito do ingresso Vercel: o proxy de fixtures sobrescreve headers enviados pelo cliente. Não é execução da plataforma Vercel nem deploy. INGEST_DATABASE_URL de fixtures é gerada/injetada em memória; nenhuma credencial é criada no .env ou versionada. Ativação compartilhada depende de provisionamento da conexão restrita pelo responsável.
