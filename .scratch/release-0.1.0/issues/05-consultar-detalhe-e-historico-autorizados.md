# 05: Consultar detalhe e histórico autorizados

**What to build:** Um usuário abre o detalhe de uma ocorrência de seu escopo e consulta localização, classificação e histórico, com dados do cidadão limitados por capacidade.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-010, RF-015, RNF-001

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

**Decisão de escopo/dependência:** O detalhe inicial usa fixtures sem foto. A evidência opcional e seu acesso são entregues no ticket 06.

- [ ] O detalhe exibe protocolo, tipo, descrição, status, prioridade, grupo, localização, precisão e histórico pertinente ao usuário.
- [ ] Consulta não recebe nome, contato ou referência de foto na interface, resposta da API, acesso direto ao banco ou diferenças privadas do histórico.
- [ ] Operador e Gestor consultam apenas os grupos atribuídos; Administrador opera no município configurado; ID fora do escopo não revela existência nem conteúdo.
- [ ] A classificação informa as zonas e versões consideradas na abertura, sem recalcular silenciosamente registros antigos.
- [ ] Testes de navegador, API e banco verificam leitura autorizada, campos omitidos e tentativas de acesso cruzado.

