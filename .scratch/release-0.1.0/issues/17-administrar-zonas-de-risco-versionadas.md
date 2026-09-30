# 17: Administrar zonas de risco versionadas

**What to build:** O Administrador cadastra e mantém polígonos de inundação e risco, controla vigência e ativação e verifica o efeito em novas ocorrências.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo; 03: Abrir ocorrência pública com GPS e triagem.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-06, RF-003, RF-014, RF-015

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Cadastro e atualização aceitam Polygon/MultiPolygon válidos com tipo INUNDACAO ou RISCO, nome, estado e vigência; geometria inválida é recusada.
- [ ] Somente Administrador autorizado altera zonas; mudanças de geometria, vigência e ativação geram nova versão e auditoria.
- [ ] Uma nova ocorrência dentro/borda de zona ativa vigente recebe ALTA; após desativação ou fora da vigência recebe NORMAL quando não houver outra zona correspondente.
- [ ] Sobreposição de zonas registra todas as correspondências e versões; ocorrências anteriores mantêm prioridade e explicação da classificação original.
- [ ] Concorrência de atualização de zona não sobrescreve silenciosamente uma versão mais recente.
- [ ] Testes de navegador, API e PostGIS real demonstram cadastro, atualização, vigência, desativação, geometria inválida, privacidade e preservação histórica.

