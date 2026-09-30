# 04: Listar ocorrências com filtros e colunas pessoais

**What to build:** O usuário encontra ocorrências de seu escopo em uma lista paginada, com atalhos por status, filtros compartilháveis pela URL e colunas pessoais.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-04, RF-008, RF-009, RNF-001, RNF-003

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

**Decisão de escopo/dependência:** Pode ser entregue com ocorrências sintéticas da base, sem aguardar o formulário público.

- [ ] Atalhos do menu e filtros de período, status, prioridade, tipo e grupo autorizado ficam na URL e permanecem ao ordenar, paginar e revisitar.
- [ ] Paginação e filtros ocorrem no servidor: página padrão 1, tamanho padrão 50 e máximo 100; ordenação por createdAt, priority ou status, padrão createdAt desc com ID como desempate.
- [ ] Preferências de colunas persistem por conta; colunas privadas nunca ficam disponíveis para Consulta, inclusive com parâmetros manipulados.
- [ ] Grupos, ordenação e tamanho de página manipulados não ampliam acesso; registros excluídos logicamente ficam fora da visão operacional.
- [ ] O acesso à tabela antiga redireciona para a lista Core preservando filtros compatíveis e mantendo sua implementação original arquivada.
- [ ] Estados vazios e erros são compreensíveis; a tela não busca o histórico inteiro por padrão.
- [ ] Testes de navegador e API verificam resultados, total, URL, preferências independentes e negações com fixtures maiores que uma página.

