# Regras de domínio de ocorrências

Esta pasta contém regras que podem ser verificadas sem servidor, banco ou serviços externos:

- `mutation.ts`: valida comandos de edição, reatribuição, transição, reclassificação, exclusão e restauração; confere papel, escopo, motivo e versão esperada.
- `status-configuration.ts`: valida alterações permitidas nos rótulos e nas transições, preservando os códigos internos.
- `risk-zones.ts`: valida geometria, vigência e versão das zonas de risco.
- `dashboard-map.ts`: valida os filtros do mapa e limita marcadores sem reduzir as contagens agregadas.

Os testes unitários cobrem essas regras com dados em memória. Eles não comprovam as políticas RLS nem o comportamento do banco real.
