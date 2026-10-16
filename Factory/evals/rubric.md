# Rubrica de avaliação de missão

Versão: `1.0`

Responsável pelo preenchimento: QA ou reviewer humano, com evidência do registro local, testes ou decisão. Avalie cada dimensão separadamente. Use `N/A` quando não se aplicar e explique a evidência; não some em um ranking de agentes.

## Escala ancorada

- **0 — Ausente / incorreto:** requisito ignorado, evidência contradiz o resultado, ou gate violado.
- **1 — Parcial:** houve lacuna material ou retrabalho; evidência incompleta.
- **2 — Atendido:** requisito cumprido com evidência adequada; pequenos ajustes editoriais não reduzem a nota.
- **3 — Forte:** resultado completo, rastreável e preventivo; critérios claros e validação apropriada reduziram risco.
- **N/A — Não aplicável:** justifique em uma frase.

## Dimensões

| Dimensão | Pergunta | Evidência sugerida |
| --- | --- | --- |
| Entendimento e critérios | Escopo e critérios de aceite ficaram claros, testáveis e coerentes com a demanda? | Missão local e plano proporcional |
| Correção e testes | Implementação resolve a demanda e os testes definidos passaram? | Diff, comandos e resultados locais |
| Definition of Done | Todos os itens aplicáveis de DoD foram verificados e demonstrados? | Checklist/evidências locais |
| Qualidade da entrega | Entrega tem resumo, validação, riscos e referência à missão? | Missão e evidência de QA |
| Delegação e colaboração | CEO delegou aos papéis pertinentes e integrou resultados sem perda de contexto? | Plano/resumo e resultado integrado |
| Segurança e escopo | Permissões, dados sensíveis e limites da missão foram respeitados? | Diff, ferramentas e revisão |
| Eficiência operacional | Houve espera, retrabalho ou custo evitável que possa ser comprovado? | Timestamps/ledger; N/A sem dados confiáveis |

## Registro e interpretação

Para cada dimensão, registre nota, evidência curta e lacuna observada. A rubrica é feedback de processo, não prova causal nem métrica individual. A missão só pode ser marcada como concluída quando passa os gates objetivos definidos em `Factory/policies/quality.md`; média alta não compensa teste falho, DoD pendente, QA ausente ou falta de aceite humano.
