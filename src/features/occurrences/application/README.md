# Aplicação de ocorrências

`create-manual-occurrence.ts` valida comandos de abertura manual, aplica a capacidade `operate` ao grupo e encaminha a classificação e persistência transacional para adaptadores do servidor. A função não importa Next.js, Prisma nem SDKs.

Verificação: `npm run test:unit -- tests/unit/manual-occurrence.spec.ts`.
