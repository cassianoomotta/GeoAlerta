# 12: Mostrar mapa e contagens delimitados

**What to build:** O usuário acompanha ocorrências autorizadas no dashboard com mapa por recorte e contagens por status e prioridade.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-03, RF-007, RNF-001, RNF-003

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281c98438df148385859d?pvs=204)

**Decisão de escopo/dependência:** Mapa inicial usa dados sintéticos e não depende do canal Realtime ou da abertura pública.

- [ ] O mapa consulta limites espaciais e temporais no servidor, com padrão de 7 dias, máximo de 31 dias e até 1.000 pontos.
- [ ] Quando há mais pontos, o painel indica a limitação; as contagens representam todo o recorte autorizado sem truncamento pelo teto de marcadores.
- [ ] Papel, grupo e estado ativo restringem mapa e contagens; filtros manipulados não ampliam acesso.
- [ ] Ocorrências excluídas ficam fora da visão operacional; nenhuma tela carrega todo o histórico por padrão.
- [ ] Testes de navegador e API verificam escopo, limites, indicador de limitação, contagens e histórico sintético extenso.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de consulta e autorização cobrem recorte padrão/máximo, limite de pontos, contagem, entrada inválida e falha de consulta; filtros adulterados não devem ampliar o resultado calculado.
- [ ] Registrar **implementação concluída e validação básica aprovada**, sem marcar aceite integrado.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, validar filtros espaciais/temporais e PostGIS, RLS/perfis/grupos reais, contagens sobre todo o recorte e ausência de registros excluídos.
- [ ] Dobles/simulações não comprovam PostGIS, isolamento ou desempenho real.
