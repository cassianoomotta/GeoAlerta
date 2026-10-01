# 15: Administrar usuários, grupos e acesso

**What to build:** O Administrador cadastra contas e grupos, atribui papéis e escopos e controla ativação, suspensão e desativação com auditoria.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-06, RF-013, RF-015, RNF-001

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f28184812fc6353fc8b3e4?pvs=204)

- [ ] Cadastro administrativo, papéis Consulta/Operador/Gestor/Administrador, grupos e estados PENDENTE/ATIVO/SUSPENSO/DESATIVADO são geridos somente pelo Administrador.
- [ ] Há um grupo público padrão único por município, e a configuração persiste; vínculos simples/múltiplos refletem o escopo efetivo.
- [ ] O provisionamento Auth ocorre no servidor; falha parcial deixa conta PENDENTE sem privilégios efetivos e permite retomada auditada, sem presumir transação distribuída.
- [ ] Ativação, suspensão, desativação, papel e grupos geram auditoria; suspensão/desativação bloqueia novas operações mesmo com JWT anterior.
- [ ] Usuários sem ADMIN não executam essas ações pela API ou banco; parâmetros do navegador não concedem privilégios.
- [ ] Testes de navegador, API e banco verificam concessões/negações, grupos, estados, auditoria e falha parcial de provisionamento.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de administração, autenticação, repositório e auditoria cobrem provisionamento/atribuições permitidos, perfil/papel/grupo inválido e falha parcial deixando conta PENDENTE; conferir que cada transição de estado é auditável.
- [ ] Registrar **implementação concluída e validação básica aprovada**, não aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No projeto Supabase de homologação, testar Auth real, preparação de contas e grants/RLS com perfis e grupos distintos, conta suspensa com sessão antiga, revogação de acesso e auditoria.
- [ ] A validação integrada exige usuários reais de teste e configuração autorizada. Doubles não provam Auth, RLS ou permissões.
