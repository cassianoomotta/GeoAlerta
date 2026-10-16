# Métricas locais

Use registros de missões e ledger como fonte. Métricas servem para melhorar o processo, não para ranquear agentes ou substituir qualidade.

| Indicador | Definição e limite |
| --- | --- |
| Entregas prontas | Missões distintas que alcançaram `awaiting_review`, com testes e QA aprovados. |
| Entregas aceitas | Missões distintas em `completed`, após aceite humano explícito; não contar cada linha do histórico como nova missão. |
| Retrabalho | Retorno a `in_progress` após revisão, com categoria e evidência. Reporte contagem e tamanho da amostra. |
| Tempo até revisão | `ready_for_review_at - started_at`, somente com instantes conhecidos. |
| Tempo até aceite | `completed_at - ready_for_review_at`; pode incluir espera, revisão e retrabalho. |
| Tokens e custo | Campos separados, opcionais e com fonte; sem fonte use `null`. Não converter tokens em dinheiro sem método e tarifa documentados. |

Estados: `in_progress`, `blocked`, `awaiting_review`, `completed`. `started_at` é o início observado; `ready_for_review_at` é a primeira prontidão local e deve ser preservada no retrabalho; `completed_at` é o aceite humano do resultado; `updated_at` é a atualização. Não invente datas faltantes. `duration_minutes` representa tempo até revisão, não duração total.

Use o estado mais recente de cada missão e preserve o histórico. Não misture registros importados arquivados com a linha de base local. Comece com análise descritiva, segmentando tipo e complexidade; amostras pequenas não sustentam metas nem inferência causal. Telemetria externa continua inativa.
