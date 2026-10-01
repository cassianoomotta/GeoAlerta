# 16: Configurar transições e rótulos de status

**What to build:** O Administrador habilita ou desabilita transições e ajusta rótulos e ordem dos estados, mantendo os códigos e o histórico estáveis.

**Blocked by:** 08: Editar e transicionar sem perder alterações.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** Medium

**Rastreabilidade:** US-06, RF-014, RF-015

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f28106a3d8c5d2c8516e82?pvs=204)

- [ ] Somente Administrador configura transições permitidas, rótulos e ordem, com validação e auditoria.
- [ ] NOVA, EM_TRIAGEM, EM_ATENDIMENTO, RESOLVIDA e CANCELADA permanecem códigos internos fixos, não editáveis nem apagáveis.
- [ ] A próxima tentativa de mudança de status aplica a configuração atual; transições desabilitadas são recusadas em interface, API e banco sem alteração parcial.
- [ ] Configuração não reescreve eventos históricos nem concede reabertura/reclassificação a papéis sem a capacidade correspondente.
- [ ] Testes de navegador, API, domínio e banco verificam efeito posterior, imutabilidade, negações e auditoria.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários do domínio aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de repositório e autorização cobrem alteração válida, código/rótulo/transição inválidos e falha de gravação/auditoria; código interno e histórico permanecem estáveis.
- [ ] Registrar **implementação concluída e validação básica aprovada**, sem afirmar aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, provar alteração persistida e auditada, efeito da regra na operação seguinte, códigos fixos, histórico sem reescrita e negação por papel/RLS real.
- [ ] Mocks não provam persistência nem segurança no Supabase.
