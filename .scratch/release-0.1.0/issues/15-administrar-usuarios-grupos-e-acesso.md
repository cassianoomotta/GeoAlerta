# 15: Administrar usuários, grupos e acesso

**What to build:** O Administrador cadastra contas e grupos, atribui papéis e escopos e controla ativação, suspensão e desativação com auditoria.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-06, RF-013, RF-015, RNF-001

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Cadastro administrativo, papéis Consulta/Operador/Gestor/Administrador, grupos e estados PENDENTE/ATIVO/SUSPENSO/DESATIVADO são geridos somente pelo Administrador.
- [ ] Há um grupo público padrão único por município, e a configuração persiste; vínculos simples/múltiplos refletem o escopo efetivo.
- [ ] O provisionamento Auth ocorre no servidor; falha parcial deixa conta PENDENTE sem privilégios efetivos e permite retomada auditada, sem presumir transação distribuída.
- [ ] Ativação, suspensão, desativação, papel e grupos geram auditoria; suspensão/desativação bloqueia novas operações mesmo com JWT anterior.
- [ ] Usuários sem ADMIN não executam essas ações pela API ou banco; parâmetros do navegador não concedem privilégios.
- [ ] Testes de navegador, API e banco verificam concessões/negações, grupos, estados, auditoria e falha parcial de provisionamento.

