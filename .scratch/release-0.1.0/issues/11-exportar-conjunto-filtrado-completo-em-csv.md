# 11: Exportar conjunto filtrado completo em CSV

**What to build:** Gestor ou Administrador baixa um CSV local de todas as ocorrências filtradas autorizadas, além da página visível.

**Blocked by:** 04: Listar ocorrências com filtros e colunas pessoais.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-04, RF-016, RNF-001, RNF-003, RNF-006

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f28136afd5c07467c4600f?pvs=204)

- [ ] O download usa o mesmo filtro e autorização da lista, percorre internamente todas as páginas e não usa o limite de pontos do mapa.
- [ ] Consulta e Operador são recusados também pela API; parâmetros manipulados não expõem grupos ou colunas privadas sem capacidade.
- [ ] UTF-8 preserva caracteres portugueses; fórmulas iniciadas por =, +, - ou @ são neutralizadas e aspas, separadores e quebras de linha são escapados.
- [ ] Mais de uma página é exportada integralmente, com contagem verificável e sem truncamento silencioso; falhas são apresentadas ao usuário.
- [ ] Não há sincronização com planilhas externas nem dependência de e-mail.
- [ ] Testes de unidade, navegador e API comparam linhas/filtros, caracteres especiais e negações; a prova com 50 mil registros integra o aceite de capacidade.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Testes puros cobrem serialização UTF-8, aspas, separadores, quebras de linha e neutralização de fórmulas; falso repositório/autorização cobre todas as páginas, filtro inválido/fora do escopo e falha de leitura.
- [ ] Registrar **implementação concluída e validação básica aprovada** sem declarar segurança ou capacidade integradas.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, verificar papel/grupo/RLS reais, conjunto filtrado completo, dados e colunas permitidos; executar o caso de 50 mil registros e conferir ausência de truncamento e impacto no banco.
- [ ] O falso repositório não prova autorização real nem capacidade.
