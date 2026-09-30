# 11: Exportar conjunto filtrado completo em CSV

**What to build:** Gestor ou Administrador baixa um CSV local de todas as ocorrências filtradas autorizadas, além da página visível.

**Blocked by:** 04: Listar ocorrências com filtros e colunas pessoais.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-04, RF-016, RNF-001, RNF-003, RNF-006

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] O download usa o mesmo filtro e autorização da lista, percorre internamente todas as páginas e não usa o limite de pontos do mapa.
- [ ] Consulta e Operador são recusados também pela API; parâmetros manipulados não expõem grupos ou colunas privadas sem capacidade.
- [ ] UTF-8 preserva caracteres portugueses; fórmulas iniciadas por =, +, - ou @ são neutralizadas e aspas, separadores e quebras de linha são escapados.
- [ ] Mais de uma página é exportada integralmente, com contagem verificável e sem truncamento silencioso; falhas são apresentadas ao usuário.
- [ ] Não há sincronização com planilhas externas nem dependência de e-mail.
- [ ] Testes de unidade, navegador e API comparam linhas/filtros, caracteres especiais e negações; a prova com 50 mil registros integra o aceite de capacidade.

