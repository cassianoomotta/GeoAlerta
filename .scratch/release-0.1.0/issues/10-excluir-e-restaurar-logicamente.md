# 10: Excluir e restaurar ocorrências logicamente

**What to build:** O Administrador retira uma ocorrência da operação e a restaura com motivo, mantendo dados e trilha de auditoria.

**Blocked by:** 08: Editar e transicionar sem perder alterações.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-012, RF-015

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Somente Administrador exclui ou restaura logicamente, no município autorizado e com justificativa obrigatória.
- [ ] A exclusão preserva dados e eventos e remove o registro de lista, mapa, contagens e exportações operacionais; não remove arquivos privados.
- [ ] Uma visão administrativa permite localizar o registro excluído e restaurá-lo; a restauração o devolve às consultas permitidas.
- [ ] Registro excluído não aceita transições; versão, conflitos e rollback de auditoria obedecem ao contrato de mutação.
- [ ] Testes de navegador, API e banco comprovam ocultação, recuperação, preservação, motivos e negações.

