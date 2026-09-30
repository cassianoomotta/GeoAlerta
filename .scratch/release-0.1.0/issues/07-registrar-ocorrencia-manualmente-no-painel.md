# 07: Registrar ocorrência manualmente no painel

**What to build:** Operador, Gestor ou Administrador registra uma ocorrência pelo painel com GPS nativo, triagem oficial e identificação do responsável pela abertura.

**Blocked by:** 03: Abrir ocorrência pública com GPS e triagem; 05: Consultar detalhe e histórico autorizados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-002, RF-003, RF-011, RF-015

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] A criação manual exige conta ativa, capacidade de escrita e grupo autorizado; Consulta e usuário fora do escopo são recusados também pela API e banco.
- [ ] GPS nativo e precisão são obrigatórios, com os mesmos limites e mensagens recuperáveis da entrada pública.
- [ ] A criação reutiliza validação, triagem PostGIS, idempotência e persistência atômica; estado inicial NOVA, protocolo e prioridade seguem a regra oficial.
- [ ] O evento registra o operador; o grupo escolhido é verificado no lado confiável e a ocorrência pode ser aberta no detalhe após confirmação.
- [ ] Testes de navegador, API e banco verificam criação, ausência de GPS, sobreposição e negações.

