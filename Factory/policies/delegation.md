# Delegação

O coordenador (CEO, agente principal) recebe a demanda e responde pela entrega integrada. Selecione os papéis conforme a necessidade, sem obrigar passagem por toda a equipe:

- PO: objetivo, valor, escopo, prioridade e critérios de aceite.
- Analyst: regras de negócio, cenários, dados, dependências e ambiguidades.
- Developer: implementação e testes locais.
- QA: validação independente de toda alteração e evidências de regressão.

O coordenador pode implementar tarefas pequenas. Quem implementa não pode ser o único validador. Se não houver QA independente disponível, mantenha `in_progress` ou `blocked`, explique a limitação e entregue apenas progresso. Consultas sem alteração podem ter resultado registrado diretamente na missão, sem ledger de mudança nem equipe completa.

## Contrato de tarefa

Informe objetivo, contexto e fontes; escopo e arquivos de propriedade; critérios verificáveis; dependências; formato de retorno e evidências; skills pertinentes com localização e finalidade. Cada agente consulta `Factory/setup/skills.md`, confirma disponibilidade e lê a skill antes de usar. Não presuma que todos receberam o mesmo catálogo.

Agentes podem trocar informações pertinentes, mantendo o coordenador informado. Eles não estão sozinhos no repositório: não revertam edições alheias. Evite escrita concorrente nos mesmos arquivos; dependências compartilhadas devem ser sequenciais. Informe conflitos e bloqueie somente a parte afetada.

Um especialista temporário pode ser acionado quando os papéis existentes não cobrirem uma lacuna concreta. Não crie agente permanente por uma demanda isolada. Alterações permanentes seguem `recruitment.md`.

## Autoridade

Execute o escopo autorizado até a revisão local, sem aprovação a cada etapa. Esclareça decisões que alterem o resultado ou extrapolem o escopo. Não publique issues, PRs, comentários ou mensagens externas nesta rotina. É proibido executar `git commit`, `git push`, `git merge`, equivalentes por API e deploys em produção/Vercel. O usuário controla essas ações. Não alterar permissões nem governança sem autorização específica.
