# Task 37 — Registro rápido do batalhão

Data: 2026-10-07  
Branch: `feat/task-37-fluxo-rapido-batalhao`  
Base: `geo-alerta-0-1-0` (`48adcfb74125af1edbf786d51c7d9af4bbbfd565`)

## Implementado

- Fluxo autenticado do batalhão em `/painel/ocorrencias/rapida`, restrito a perfis e escopo autorizados; tipo, grupo padrão, evento ativo, município, status, prioridade e origem são resolvidos no servidor.
- Formulário com endereço/referência e descrição curta, apoio médico Sim/Não sem opção pré-selecionada, nome/contato opcionais e ponto selecionado por marcador no mapa, com confirmação explícita.
- Persistência pelo Core existente, incluindo protocolo, classificação geográfica, vínculo ao evento ativo, histórico, auditoria, alerta in-app e idempotência. Sem contato, os campos privados ficam null.
- Colunas anuláveis de origem do registro e origem do ponto, precisão null para posição confirmada no mapa e compatibilidade com dados legados. As migrations são aditivas e incluem permissões RLS/grants necessários.
- Detalhe da ocorrência exibe origem e precisão; CSV distingue apoio médico Sim/Não/Não informado.
- Testes E2E cobrem clique/arraste do marcador, confirmação após mover e repetição após falha de rede mantendo a mesma chave/payload.

## Validação

| Comando | Resultado |
| --- | --- |
| `npm run test:unit` | 175 aprovados |
| `npm run test:db -- tests/database/migrations.spec.ts` | 3 aprovados em banco PostgreSQL/PostGIS local isolado |
| `npm run test:api -- tests/api/battalion-occurrence.spec.ts` | 3 aprovados |
| `npm run test:api -- tests/api/battalion-occurrence.spec.ts tests/api/manual-occurrence.spec.ts tests/api/public-occurrences.spec.ts` | 14 aprovados |
| `npm run test:e2e -- tests/e2e/battalion-occurrence.spec.ts` | 2 aprovados: Chromium desktop e Chromium com viewport móvel |
| `npm run lint -- <arquivos alterados>` | aprovado, sem saída de erro |
| `npm run build` | aprovado; compilação Next.js, TypeScript e geração de rotas concluídas |
| `git diff --check` | aprovado |

Os testes API confirmaram acesso negado para anônimo/CONSULTA/perfis sem vínculo ativo ao grupo padrão, rejeição de ponto não confirmado e campos derivados adulterados, ocorrência de operador no grupo padrão, classificação ALTA sobre mancha ativa, evento ativo, contato privado, origem MAPA/BATALHAO, precisão null, alerta, auditoria, histórico, consulta de detalhe/lista, retry idempotente e conflito para payload divergente. Também foi validado o caso sem contato e sem evento ativo.

O teste de migrations validou o banco vazio, as constraints de localização/proveniência e as políticas/grants incluídos nas migrations. O banco usado é local e descartável; nenhum banco compartilhado foi acessado.

## Limitações e critérios ainda pendentes

- Os testes de navegador usaram Playwright com Chromium e viewport móvel, não um dispositivo físico. Falta uma revisão manual integrada no navegador com uma sessão autenticada do ambiente de desenvolvimento.
- Falta exercitar explicitamente configuração ausente/inválida do grupo padrão e falha injetada no último passo para provar rollback de todos os efeitos; a cobertura atual valida os cenários autorizados, negados e sem evento ativo.
- Ainda falta cobrir explicitamente grupo/município divergentes além de sessão sem vínculo ao grupo padrão, e validar se o GPS do operador deve sugerir um ponto inicial; a localização só é enviada após confirmação manual no mapa.
- A Task 37 permanece **In progress**. Não marcar Done até revisar esses casos pendentes e atualizar os critérios/evidências no Notion.

Nenhum commit, push, merge ou deploy foi executado. Nenhuma credencial ou dado pessoal real foi incluído neste registro.

## Ajustes de interface — 2026-10-07

- Rótulos obrigatórios do formulário rápido agora mantêm o asterisco na mesma linha do texto.
- O mapa inicia nas coordenadas centrais já usadas pelo mapa municipal (`-29.8252, -50.5186`), em zoom 13.
- O marcador passou a usar um pin SVG próprio de localização, evitando a imagem padrão quebrada do Leaflet e sem reaproveitar o símbolo `!` do tipo “Outros”.

Validações desta correção: `npm run test:unit -- tests/unit/battalion-map.spec.ts` (1 aprovado); `node scripts/with-env.mjs playwright test --project=chromium --project=mobile-chromium tests/e2e/battalion-occurrence.spec.ts` (4 aprovados); lint dos arquivos alterados; `npm run build` aprovado. O primeiro build apontou incompatibilidade de tipo da coordenada; o tipo foi corrigido e a execução final passou.
