# 17: Administrar zonas de risco versionadas

**What to build:** O Administrador cadastra e mantém polígonos de inundação e risco, controla vigência e ativação e verifica o efeito em novas ocorrências.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo; 03: Abrir ocorrência pública com GPS e triagem.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-06, RF-003, RF-014, RF-015

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281b38bb6efaa365e3059?pvs=204)

- [ ] Cadastro e atualização aceitam Polygon/MultiPolygon válidos com tipo INUNDACAO ou RISCO, nome, estado e vigência; geometria inválida é recusada.
- [ ] Somente Administrador autorizado altera zonas; mudanças de geometria, vigência e ativação geram nova versão e auditoria.
- [ ] Uma nova ocorrência dentro/borda de zona ativa vigente recebe ALTA; após desativação ou fora da vigência recebe NORMAL quando não houver outra zona correspondente.
- [ ] Sobreposição de zonas registra todas as correspondências e versões; ocorrências anteriores mantêm prioridade e explicação da classificação original.
- [ ] Concorrência de atualização de zona não sobrescreve silenciosamente uma versão mais recente.
- [ ] Testes de navegador, API e PostGIS real demonstram cadastro, atualização, vigência, desativação, geometria inválida, privacidade e preservação histórica.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Testes de domínio validam geometria/formato, vigência e versões; falsos de autorização/repositório cobrem zona válida, inválida/fora de vigência e falha de gravação, inclusive concorrência.
- [ ] Testes unitários de triagem cobrem ponto dentro/fora/borda e sobreposição. Isso não substitui PostGIS real.
- [ ] Registrar **implementação concluída e validação básica aprovada**, com aceite integrado pendente.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, verificar PostGIS real, validação de geometria, interseção/borda/vigência, versões e classificação de novas ocorrências, além de Auth/RLS/grants por perfil.
- [ ] Mocks espaciais ou geometrias simuladas não provam PostGIS nem autorização real.
