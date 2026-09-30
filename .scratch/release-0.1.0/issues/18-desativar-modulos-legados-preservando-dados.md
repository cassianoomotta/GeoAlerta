# 18: Desativar módulos legados preservando dados

**What to build:** Recursos, abrigos, equipes/GPS, voluntários e rastreio ficam inoperáveis na release Core, com código e dados preservados.

**Blocked by:** 01: Preparar a base Core preservando o legado.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-07, RF-017

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

**Decisão de escopo/dependência:** A compatibilidade da tabela antiga acompanha o ticket 04; esta desativação não depende das telas novas de ocorrência.

- [ ] A navegação remove os módulos, e rotas diretas de recursos, abrigos, equipes, voluntários e rastreio apresentam estado inativo sem montar componentes operacionais.
- [ ] Operações legadas são negadas na API/banco; ocultar o menu não é a única barreira.
- [ ] Nenhuma assinatura, heartbeat ou transmissão de GPS dos módulos inativos é iniciada pelo painel ou por acesso direto.
- [ ] Implementações substituídas ficam preservadas; tabelas, IDs, registros, fotos e arquivos permanecem íntegros, sem DROP/reset ou exclusão.
- [ ] Testes de navegador, API e banco comprovam bloqueio, ausência de atividade de GPS/assinaturas e preservação antes/depois.

