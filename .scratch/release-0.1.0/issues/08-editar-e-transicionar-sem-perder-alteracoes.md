# 08: Editar e transicionar sem perder alterações

**What to build:** O backoffice autorizado edita e conduz ocorrências pelas transições ordinárias com histórico atômico e conflito explícito entre operadores.

**Blocked by:** 05: Consultar detalhe e histórico autorizados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-011, RF-015, RNF-001, RNF-005

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281188fcfe865c96f11c4?pvs=204)

- [ ] Edição de tipo/descrição e reatribuição de grupo exigem capacidade e escopo autorizado, com ator, instante e diferenças na auditoria.
- [ ] São aplicadas as transições iniciais NOVA → EM_TRIAGEM/CANCELADA, EM_TRIAGEM → EM_ATENDIMENTO/CANCELADA e EM_ATENDIMENTO → RESOLVIDA/EM_TRIAGEM; reabertura e prioridade ficam reservadas às capacidades próprias.
- [ ] Cada alteração exige a versão atual, incrementa uma vez e grava ocorrência e evento na mesma transação.
- [ ] Duas alterações com a mesma versão produzem um sucesso e um 409; a interface apresenta o conflito e permite recuperar o estado atual sem sobrescrever silenciosamente.
- [ ] Transição proibida, desabilitada ou sobre ocorrência excluída falha sem alteração parcial; falha de auditoria reverte a mutação.
- [ ] Testes de domínio, navegador, API e banco comprovam todas as transições concedidas/negadas, reatribuição, concorrência e rollback.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários de transições/versões aprovados; sem Docker, banco ou serviços Supabase locais e sem dependências novas.
- [ ] Falsos repositório, autenticação e auditoria cobrem edição/transição válida, versão obsoleta/transição proibida e falha de persistência/auditoria; validar conflito sem sobrescrita.
- [ ] Registrar **implementação concluída e validação básica aprovada** sem marcar aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, verificar transações, RLS/grants para papéis e grupos, conflito concorrente real e rollback integral quando auditoria falhar.
- [ ] Doubles não comprovam segurança, isolamento de conexão ou atomicidade no banco real.
