# 12: Mostrar mapa e contagens delimitados

**What to build:** O usuário acompanha ocorrências autorizadas no dashboard com mapa por recorte e contagens por status e prioridade.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-03, RF-007, RNF-001, RNF-003

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

**Decisão de escopo/dependência:** Mapa inicial usa dados sintéticos e não depende do canal Realtime ou da abertura pública.

- [ ] O mapa consulta limites espaciais e temporais no servidor, com padrão de 7 dias, máximo de 31 dias e até 1.000 pontos.
- [ ] Quando há mais pontos, o painel indica a limitação; as contagens representam todo o recorte autorizado sem truncamento pelo teto de marcadores.
- [ ] Papel, grupo e estado ativo restringem mapa e contagens; filtros manipulados não ampliam acesso.
- [ ] Ocorrências excluídas ficam fora da visão operacional; nenhuma tela carrega todo o histórico por padrão.
- [ ] Testes de navegador e API verificam escopo, limites, indicador de limitação, contagens e histórico sintético extenso.

