# 09: Reabrir e reclassificar com justificativa

**What to build:** Gestor ou Administrador reabre casos encerrados e reclassifica prioridade com justificativa e histórico verificável.

**Blocked by:** 08: Editar e transicionar sem perder alterações.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-011, RF-015

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f28197b7bfd4564df64ba8?pvs=204)

- [ ] RESOLVIDA ou CANCELADA pode voltar a EM_TRIAGEM apenas por Gestor ou Administrador, com justificativa.
- [ ] Reclassificação entre NORMAL e ALTA exige a mesma capacidade e justificativa, preservando a classificação original explicável.
- [ ] Consulta e Operador não executam essas ações pela interface, API ou banco; escopo, versão e regras habilitadas continuam obrigatórios.
- [ ] Motivo, ator, instante e mudança são auditados atomicamente; motivo ausente, conflito ou falha de auditoria deixa a ocorrência intacta.
- [ ] Testes de navegador, API e banco verificam concessões, negações, motivo obrigatório e concorrência.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de autorização e repositório cobrem reabertura/reclassificação permitida com motivo, motivo/versão inválidos e falha de gravação; Consulta/Operador são negados.
- [ ] Registrar **implementação concluída e validação básica aprovada** separadamente do aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No projeto de homologação, demonstrar negação real por perfil/grupo/RLS, motivo e evento persistidos atomicamente e conflito concorrente sem perda.
- [ ] Mocks de autorização não são prova de segurança no Supabase.
