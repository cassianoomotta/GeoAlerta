# 07: Registrar ocorrência manualmente no painel

**What to build:** Operador, Gestor ou Administrador registra uma ocorrência pelo painel com GPS nativo, triagem oficial e identificação do responsável pela abertura.

**Blocked by:** 03: Abrir ocorrência pública com GPS e triagem; 05: Consultar detalhe e histórico autorizados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-002, RF-003, RF-011, RF-015

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281f0b249d33ef95762b7?pvs=204)

- [ ] A criação manual exige conta ativa, capacidade de escrita e grupo autorizado; Consulta e usuário fora do escopo são recusados também pela API e banco.
- [ ] GPS nativo e precisão são obrigatórios, com os mesmos limites e mensagens recuperáveis da entrada pública.
- [ ] A criação reutiliza validação, triagem PostGIS, idempotência e persistência atômica; estado inicial NOVA, protocolo e prioridade seguem a regra oficial.
- [ ] O evento registra o operador; o grupo escolhido é verificado no lado confiável e a ocorrência pode ser aberta no detalhe após confirmação.
- [ ] Testes de navegador, API e banco verificam criação, ausência de GPS, sobreposição e negações.

### Validação básica durante a história

- [ ] Tipos conferidos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços Supabase locais ou dependências novas.
- [ ] Testes de regras cobrem coordenadas e precisão válidas/inválidas, GPS ausente, prioridade normal/alta e grupo padrão.
- [ ] Falsos repositório, autenticação e triagem cobrem sucesso, usuário/grupo inválido e falha de persistência sem confirmação enganosa.
- [ ] Registrar **implementação concluída e validação básica aprovada** separadamente do aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase real de homologação, conferir criação autenticada, dados e auditoria persistidos, papéis/grupos e negações reais, idempotência e triagem PostGIS com polígonos ativos.
- [ ] A simulação da triagem ou autorização unitária não comprova PostGIS, RLS ou permissões reais.
