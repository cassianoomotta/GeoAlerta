# Operações da aplicação de ocorrências

Esta pasta coordena ações do usuário. Cada função recebe um ator autenticado e portas para consultar ou gravar dados; as regras de negócio ficam em `../domain/`, e a integração com PostgreSQL fica em `src/server/occurrences/`.

- `create-manual-occurrence.ts`: valida a criação manual, o grupo e a chave de idempotência antes de encaminhar a gravação.
- `mutate-occurrence.ts`: autoriza edição, reatribuição, transição, reclassificação, exclusão lógica e restauração; exige a versão esperada para evitar sobrescrita concorrente.
- `get-dashboard-map.ts`: verifica permissão e prepara o mapa com contagens completas e limite de marcadores.
- `configure-status.ts`: coordena a configuração de rótulos e transições de status.

Essas funções não acessam diretamente Next.js, Prisma ou SDKs externos. Os testes correspondentes estão em `tests/unit/`.
