# 08: Editar e transicionar sem perder alterações

**What to build:** O backoffice autorizado edita e conduz ocorrências pelas transições ordinárias com histórico atômico e conflito explícito entre operadores.

**Blocked by:** 05: Consultar detalhe e histórico autorizados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-011, RF-015, RNF-001, RNF-005

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Edição de tipo/descrição e reatribuição de grupo exigem capacidade e escopo autorizado, com ator, instante e diferenças na auditoria.
- [ ] São aplicadas as transições iniciais NOVA → EM_TRIAGEM/CANCELADA, EM_TRIAGEM → EM_ATENDIMENTO/CANCELADA e EM_ATENDIMENTO → RESOLVIDA/EM_TRIAGEM; reabertura e prioridade ficam reservadas às capacidades próprias.
- [ ] Cada alteração exige a versão atual, incrementa uma vez e grava ocorrência e evento na mesma transação.
- [ ] Duas alterações com a mesma versão produzem um sucesso e um 409; a interface apresenta o conflito e permite recuperar o estado atual sem sobrescrever silenciosamente.
- [ ] Transição proibida, desabilitada ou sobre ocorrência excluída falha sem alteração parcial; falha de auditoria reverte a mutação.
- [ ] Testes de domínio, navegador, API e banco comprovam todas as transições concedidas/negadas, reatribuição, concorrência e rollback.

