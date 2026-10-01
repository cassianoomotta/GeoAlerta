# 18: Desativar módulos legados preservando dados

**What to build:** Recursos, abrigos, equipes/GPS, voluntários e rastreio ficam inoperáveis na release Core, com código e dados preservados.

**Blocked by:** 01: Preparar a base Core preservando o legado.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-07, RF-017

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281ada21aed98d1e190d4?pvs=204)

**Decisão de escopo/dependência:** A compatibilidade da tabela antiga acompanha o ticket 04; esta desativação não depende das telas novas de ocorrência.

- [ ] A navegação remove os módulos, e rotas diretas de recursos, abrigos, equipes, voluntários e rastreio apresentam estado inativo sem montar componentes operacionais.
- [ ] Operações legadas são negadas na API/banco; ocultar o menu não é a única barreira.
- [ ] Nenhuma assinatura, heartbeat ou transmissão de GPS dos módulos inativos é iniciada pelo painel ou por acesso direto.
- [ ] Implementações substituídas ficam preservadas; tabelas, IDs, registros, fotos e arquivos permanecem íntegros, sem DROP/reset ou exclusão.
- [ ] Testes de navegador, API e banco comprovam bloqueio, ausência de atividade de GPS/assinaturas e preservação antes/depois.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Testes de configuração/rotas cobrem navegação inativa, acesso direto, registro de assinatura/GPS não iniciado, e entrada inválida ou falha do adaptador legado quando aplicável.
- [ ] Falsos e verificações de código não comprovam preservação de dados no banco. Registrar **implementação concluída e validação básica aprovada**, não aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, verificar bloqueio real de operações, ausência de canais/heartbeat/GPS e comparação de IDs, contagens, metadados e referências dos dados legados antes/depois.
- [ ] Confirmar migrations não destrutivas e integridade de Storage; mocks não são evidência de preservação real.
