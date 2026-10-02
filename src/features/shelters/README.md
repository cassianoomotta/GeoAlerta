# Catálogo de abrigos

Contratos, validação de entrada, links de navegação e interface de administração do catálogo público de abrigos.

- A API de administração fica em `src/app/api/core/admin/shelters` e exige Administrador ativo via `withSession`/RLS.
- O catálogo público é servido por `src/app/api/core/public/shelters` com conexão de ingestão e somente abrigos ativos, abertos e com endereço/localização utilizáveis.
- Coordenadas podem ser informadas em latitude/longitude ou extraídas de link reconhecido do Google Maps/Waze. As rotas são geradas pelo domínio `domain/directions.ts`.
- Testes: `tests/unit/shelters.spec.ts`, `tests/database/shelters.spec.ts`, `tests/api/shelters.spec.ts` e os casos RF-004 em `tests/e2e/public-occurrence.spec.ts` e `tests/e2e/shelters-admin.spec.ts`.
