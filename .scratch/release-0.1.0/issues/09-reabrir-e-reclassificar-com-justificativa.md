# 09: Reabrir e reclassificar com justificativa

**What to build:** Gestor ou Administrador reabre casos encerrados e reclassifica prioridade com justificativa e histórico verificável.

**Blocked by:** 08: Editar e transicionar sem perder alterações.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-011, RF-015

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] RESOLVIDA ou CANCELADA pode voltar a EM_TRIAGEM apenas por Gestor ou Administrador, com justificativa.
- [ ] Reclassificação entre NORMAL e ALTA exige a mesma capacidade e justificativa, preservando a classificação original explicável.
- [ ] Consulta e Operador não executam essas ações pela interface, API ou banco; escopo, versão e regras habilitadas continuam obrigatórios.
- [ ] Motivo, ator, instante e mudança são auditados atomicamente; motivo ausente, conflito ou falha de auditoria deixa a ocorrência intacta.
- [ ] Testes de navegador, API e banco verificam concessões, negações, motivo obrigatório e concorrência.

