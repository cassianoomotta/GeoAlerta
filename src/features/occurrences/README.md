# Funcionalidade de ocorrências

Esta pasta contém as regras e os contratos usados para registrar, consultar e administrar ocorrências. A interface fica em `ui/`; as operações da aplicação ficam em `application/`; o acesso ao banco fica em `src/server/occurrences/`.

## Arquivos principais

- `contracts.ts`, `public-input.ts` e `legacy.ts`: formatos compartilhados, validação de novas entradas e leitura controlada de dados legados.
- `list-input.ts` e `export-csv.ts`: filtros permitidos, paginação, seleção de colunas e geração segura do CSV.
- `alerts.ts`: formato mínimo dos alertas exibidos no painel.
- `photos/`: autorização e regras para anexar e consultar fotos privadas; detalhes em [`photos/README.md`](photos/README.md).
- `application/`: abertura manual, alterações autorizadas, configuração e consultas do mapa.
- `domain/`: validações puras de transições, zonas de risco e apresentação do mapa.
- `ui/`: lista, mapa, formulário, preferências de colunas, foto privada e notificações.

As regras de domínio não dependem do framework nem acessam o banco diretamente. As rotas e adaptadores do servidor aplicam as operações e permissões.

Verificações locais: `npm run test:unit` e `npx tsc --noEmit`. Os testes unitários não substituem a validação integrada contra banco e serviços reais.
