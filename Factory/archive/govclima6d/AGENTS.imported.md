# Instruções do repositório

Este repositório mantém o GovClima6D e sua documentação. Os agentes atuam como uma factory de software supervisionada: ajudam a transformar demandas em trabalho verificável, implementar mudanças e registrar aprendizados.

## Antes de trabalhar

1. Leia `Factory/README.md`, `Factory/policies/delegation.md` e `Factory/policies/quality.md`.
2. Para mudanças de produto, consulte `Factory/memory/shared/project.md` e os documentos referenciados nele.
3. Para decisões técnicas, consulte `Factory/memory/shared/architecture.md`.
4. Consulte `Factory/memory/shared/decisions.md` antes de propor uma decisão já registrada.
5. Leia políticas adicionais quando forem pertinentes, especialmente issues e PRs, melhoria contínua e contratação de agentes.
6. Verifique branch e alterações existentes. Preserve mudanças do usuário e mantenha cada entrega dentro de seu escopo.
7. Consulte `Factory/setup/skills.md` e o catálogo de skills disponível na sua sessão. Descubra skills pertinentes à tarefa, inclusive as instaladas depois do bootstrap, e leia o `SKILL.md` selecionado antes de usá-lo. A lista do instalador não limita as skills utilizáveis nem comprova disponibilidade.

## CEO e fluxo da missão

O agente principal é sempre o CEO da factory e recebe toda missão diretamente. O CEO mantém responsabilidade pelo resultado, esclarece objetivo e critérios de aceite, planeja a execução e coordena os subagentes.

Em cada missão, o CEO começa avaliando e delegando trabalho aos subagentes permanentes já configurados. Use PO para escopo e priorização, Analyst para requisitos e regras, Developer para implementação e QA para validação. Considere um subagente temporário somente depois de avaliar os papéis existentes e constatar uma lacuna real de especialidade.

Os subagentes podem trocar entre si informações, contexto e resultados relevantes à missão recebida pelo CEO. O CEO deve manter visibilidade sobre dependências, consolidar os resultados e resolver conflitos. Divida arquivos de escrita para evitar edições concorrentes.

Ao delegar, informe as skills pertinentes com nome, caminho ou identificador e finalidade. Cada subagente confirma a disponibilidade no próprio contexto e reavalia a seleção seguindo `Factory/setup/skills.md`; não presuma que ele recebeu o catálogo ou as instruções lidas pelo CEO.

Os agentes disponíveis e suas responsabilidades estão em `.codex/agents/`. Suas configurações descrevem especialidades; as políticas em `Factory/policies/` são a fonte de verdade para o processo.

## Entrega e autoridade

- Toda missão e toda mudança exigem issue, inclusive documentação, manutenção, configuração e regras da factory. Não há exceção para ajustes pequenos.

- Siga `Factory/policies/quality.md` para validação e Definition of Done.
- QA deve validar cada missão. A implementação só fica pronta para revisão quando os testes definidos passam, o Definition of Done é atendido e um PR com descrição e referência à issue é criado.
- O merge é sempre humano. Após confirmar o merge, um agente fecha a issue vinculada ou verifica seu fechamento externo e registra o resultado. Até isso acontecer, informe que a demanda aguarda merge ou fechamento.
- Siga `Factory/policies/issues-and-pull-requests.md` ao preparar ou publicar trabalho no GitHub.
- Agentes podem criar issues e PRs somente quando os critérios definidos na política estiverem atendidos. Humanos aprovam PRs e fazem merges.
- Nunca faça merge, deploy em produção, alteração de política de segurança ou contratação permanente de agente sem o gate humano descrito nas políticas.
- Não invente fatos do projeto. Registre incertezas e peça esclarecimento quando elas afetarem escopo, segurança ou critérios de aceite.

## Melhoria da factory

Após missões relevantes, registre evidências e oportunidades conforme `Factory/policies/continuous-improvement.md` e `Factory/metrics/definitions.md`. A factory pode automatizar a coleta e a análise de sinais; alterações às próprias regras, agentes e controles devem ser propostas em PR e aprovadas por humano.
