# Task 36 — validação do dashboard por evento

Data: 2026-10-07  
Branch: `feat/task-36-dashboard-eventos`, criada a partir de `geo-alerta-0-1-0` em `48adcfb74125af1edbf786d51c7d9af4bbbfd565`.

## Resultado

O dashboard `/painel` seleciona o evento em andamento por padrão e permite comparar dois eventos encerrados. Os agregados são calculados no servidor para todo o histórico autorizado, pelo vínculo persistido, sem devolver dados pessoais. Tipos históricos continuam legíveis; categorias e percentuais vazios retornam zero. Atualizar consulta juntos estado dos eventos e indicadores.

Durante a validação foram identificadas e corrigidas duas regressões preexistentes da integração das Tasks 34/35, necessárias ao contrato desta task:

- A persistência comum de ocorrências tinha deixado de gravar `needs_medical_support` ao incluir `climate_event_id`; a gravação agora preserva `true`, `false` e `null`.
- A exportação CSV exibiu booleanos crus para apoio médico; agora usa `Sim`, `Não` e `Não informado`, preservando também as colunas do evento climático.

## Evidências

Os testes de banco e API usam apenas o PostgreSQL isolado de Docker configurado em `TEST_DATABASE_URL`; não houve escrita no Supabase compartilhado.

| Verificação | Resultado |
| --- | ---: |
| `npm run test:unit` | 165/165 passaram |
| `npm run test:unit -- tests/unit/export-csv.spec.ts tests/unit/occurrence-persistence.spec.ts` | 7/7 passaram após as correções |
| `npm run test:api -- tests/api/dashboard-event-indicators.spec.ts` | 5/5 passaram; inclui papéis Consulta, Operador, Gestor e Administrador |
| `npm run test:api -- tests/api/public-occurrences.spec.ts` | 8/8 passaram, incluindo persistência de apoio médico verdadeiro/falso |
| `npm run test:db` | 34/34 passaram |
| `npm run test:e2e -- tests/e2e/dashboard-event-indicators.spec.ts` | 1/1 passou em desktop e viewport móvel, incluindo teclado e Atualizar |
| Lint focado dos arquivos alterados | passou sem avisos |
| `npm run build` | passou; compilação, TypeScript e geração das 36 páginas concluídos |
| `git diff --check` | passou |

As fixtures verificam as contagens determinísticas do evento A (6 registros; abertas 3, resolvidas 2, canceladas 1), categorias/tipos e percentuais, `null` separado de `false`, registros sintéticos de cidadão e Bombeiros, grupo oculto, exclusão lógica, falta de vínculo, evento vazio, tipo histórico inativo, 120 registros com data anterior à janela usual, seleção inválida e evento de outro município. A matriz de sessão verificou os limites reais de grupo/município. O E2E atualizou após criação, alteração de status, correção de vínculo, exclusão e encerramento do evento.

## Limitação operacional

O Supabase compartilhado da equipe não foi alterado. A inspeção anterior confirmou que nele ainda falta `public.occurrences.needs_medical_support` (migration `202610060003_public_occurrence_medical_support`) e o índice de auditoria da Task 30. Portanto, o código foi validado contra o schema atualizado no banco isolado; o banco compartilhado precisa receber suas migrations aprovadas antes de servir esta versão. Não foi alegada validação do runtime contra esse banco.

O build mostra um aviso conhecido: Next.js ignora `C:\Users\Cassiano\package-lock.json`, que está fora da raiz Git. Isso não impediu compilação ou geração.

## Escopo de alteração

Nenhum commit, push, merge, deploy ou migration remota foi executado.
