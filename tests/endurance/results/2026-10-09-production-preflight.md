# Relatório de testes do GeoAlerta — 2026-10-09

## Resultado geral

Foi concluída uma observação de 90 minutos do endpoint público de tipos de ocorrência em produção. O teste foi somente de leitura, com uma requisição sequencial por minuto. Não houve criação/alteração de ocorrências, envio de alertas, concorrência ou carga agressiva. Portanto, o resultado verifica disponibilidade sustentada em baixa frequência; não comprova capacidade sob carga ou comportamento de escrita.

## Produção

- Alvo observado: `https://geo-alerta.vercel.app/`.
- Endpoint: `GET /api/core/public/occurrence-types`.
- Duração: 5.400 segundos, de 2026-10-09 21:50:41 UTC a 23:20:41 UTC.
- Requisições: 90, sequenciais, intervalo de 60 segundos, concorrência 1.
- Resultado: 90 HTTP 200; 0 falhas, timeouts ou respostas não exitosas.
- Latência: p50 981 ms; p95 1.066 ms; máximo 2.568 ms.
- Checagem de fumaça anterior: a página pública `/` carregou os tipos de ocorrência e manteve o envio desabilitado sem geolocalização; `/painel` carregou na sessão já autenticada. Não foram solicitadas permissões de localização, enviados formulários, abertos registros individuais ou exportados dados.
- Nenhuma mudança de dados foi feita pelo teste.

O executor de carga existente (`npm run test:load`) foi tentado e bloqueou antes de fazer conexões ou requisições, com `DISPOSABLE_TARGET_CONFIRMATION_REQUIRED`. O fluxo do repositório foi projetado para alvo descartável e recusa `*.vercel.app`/Supabase compartilhado. Ele também é um cenário de escrita, portanto não foi contornado nem usado contra produção.

## Testes locais

- `npm run test:unit`: 190 testes aprovados.
- `npm run lint`: aprovado, sem diagnósticos.
- `node node_modules/typescript/bin/tsc --noEmit`: aprovado.
- `npm run test:design-system`: 5 aprovados, 2 falharam. A verificação de contraste obteve 3,106 onde exige pelo menos 4,5; a checagem do tema do formulário público esperava `dark`, mas recebeu `light`.
- `npm run test:api` e `npm run test:db`: bloqueados na migração isolada do Core em `tests/fixtures/access.ts`. A configuração aponta as URLs de teste direto/sombra para `localhost:5433`, mas a migração do ambiente isolado falhou. Nenhum teste foi direcionado ao banco operacional.
- Não foi executada a suíte E2E.

## Artefatos

- Log sanitizado das 90 respostas e resumo final: `tests/endurance/results/2026-10-09-production-readonly-soak.jsonl`.
- Este relatório: `tests/endurance/results/2026-10-09-production-preflight.md`.

## Conclusão

A rota pública testada permaneceu disponível durante 90 minutos de consultas leves, com todas as respostas em HTTP 200 e p95 de aproximadamente 1,07 s. Isso não equivale a um teste de estresse: não houve tráfego concorrente, escritas, testes de rotas protegidas nem medição de banco/infraestrutura. As falhas locais de design system e migração do banco isolado permanecem registradas acima.
