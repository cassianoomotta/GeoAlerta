# Qualidade e entrega local

## Verificação proporcional

Antes de implementar, associe cada critério de aceite a uma verificação. Use os comandos reais documentados no projeto. Mudanças de produto pedem testes dos fluxos afetados; amplie a verificação quando houver riscos de dados, acesso ou integração. Documentação e configuração pedem revisão de coerência, caminhos, formato e contratos aplicáveis; não exigem build ou testes de banco sem relação com a mudança.

Todos os testes requeridos devem passar. Diferencie falha nova, preexistente e verificação bloqueada; nenhuma pode ser omitida. Não invente execução nem enfraqueça testes para obter aprovação. Um teste necessário bloqueado impede prontidão até resolução ou revisão explícita de escopo pelo usuário.

## QA independente

Toda alteração exige QA independente: um agente que não implementou a alteração revisa o diff, critérios e evidências, executa as verificações pertinentes e registra achados. QA não corrige arquivos durante a revisão. Devolve problemas ao responsável, que corrige e solicita nova verificação das partes afetadas. Sem QA independente não há entrega pronta.

## Pronta para revisão — awaiting_review

- Objetivo e critérios de aceite atendidos dentro do escopo autorizado.
- Testes e verificações definidos passam, com comandos e resultados registrados na missão.
- QA independente aprovado, com referência à sua evidência local.
- Diff revisado, preservando trabalho do usuário; documentação necessária atualizada.
- Limitações e riscos materiais explícitos; nenhum critério impeditivo pendente.
- Missão local e ledger coerentes, sem dados sensíveis ou métricas inventadas.

Essa condição é o Definition of Done técnico (`definition_of_done=true`). Não exige issue, PR, publicação, commit ou merge. O coordenador entrega um resumo com arquivos, validação e limitações.

## Aceite humano — completed

Somente após o usuário aceitar explicitamente o resultado entregue, registre `human_review.approved_by_human=true`, referência local da evidência e `completed_at`. Aprovação de objetivo, plano ou execução não é aceite da entrega. Não inferir aprovação pelo silêncio ou passagem de tempo. Se houver ajustes, retorne a `in_progress`, mantenha o histórico e revalide o necessário. Consultas sem mudança são encerradas no registro local do resultado.

## Limites operacionais

A IA nunca executa `git commit`, `git push`, `git merge`, equivalentes por API nem deploys em produção/Vercel. Revisão humana, commits e publicação são exclusivos do usuário. Use apenas `.env` na raiz para variáveis locais, sem ler ou expor segredos em evidências. Não execute testes que alterem ambientes remotos por inferência de autorização local.
