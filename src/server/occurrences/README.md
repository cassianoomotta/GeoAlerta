# Acesso a ocorrências no servidor

Esta pasta contém os adaptadores que conectam as regras do Core ao PostgreSQL/Prisma. As rotas da API chamam estes módulos dentro da sessão e da transação autorizadas.

- `intake.ts` e `persist.ts`: recebem ocorrências públicas, classificam localização e gravam os registros relacionados de forma transacional e idempotente.
- `list.ts`: consulta ocorrências com filtros, permissões, paginação e projeção autorizada. A exportação CSV usa os mesmos filtros sem limite de página.
- `mutate.ts`: aplica alterações com controle de versão e registra evento/auditoria na transação.
- `dashboard-map.ts`: consulta contagens e marcadores no recorte geográfico e temporal autorizado.
- `origin.ts`: valida a origem usada pelo limite de envios públicos.

Os testes HTTP usam um proxy local que simula o encaminhamento de headers da Vercel; isso não equivale a executar ou publicar na Vercel. As consultas reais a PostgreSQL/PostGIS e as permissões integradas exigem ambiente de teste apropriado.
