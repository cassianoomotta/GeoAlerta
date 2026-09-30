# 16: Configurar transições e rótulos de status

**What to build:** O Administrador habilita ou desabilita transições e ajusta rótulos e ordem dos estados, mantendo os códigos e o histórico estáveis.

**Blocked by:** 08: Editar e transicionar sem perder alterações.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** Medium

**Rastreabilidade:** US-06, RF-014, RF-015

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Somente Administrador configura transições permitidas, rótulos e ordem, com validação e auditoria.
- [ ] NOVA, EM_TRIAGEM, EM_ATENDIMENTO, RESOLVIDA e CANCELADA permanecem códigos internos fixos, não editáveis nem apagáveis.
- [ ] A próxima tentativa de mudança de status aplica a configuração atual; transições desabilitadas são recusadas em interface, API e banco sem alteração parcial.
- [ ] Configuração não reescreve eventos históricos nem concede reabertura/reclassificação a papéis sem a capacidade correspondente.
- [ ] Testes de navegador, API, domínio e banco verificam efeito posterior, imutabilidade, negações e auditoria.

