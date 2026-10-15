# Resultados locais

Resumos sanitizados de verificações realmente executadas. Falhas, impedimentos e testes não executados permanecem explícitos. Relatórios detalhados ficam em `test-results/` e `playwright-report/`, ignorados pelo Git.

## Rodada atual — 12/10/2026

- [Relatório da bateria de testes — GeoAlerta](2026-10-12-test-battery-report.md): unitários 190/190, API 60/60, banco 34/34, migrations 4/4, design system 7/7, lint/TypeScript/build aprovados; matriz de navegadores 203 aprovados, 3 skips e um erro local `ERR_NO_BUFFER_SPACE` que passou na repetição isolada. Carga de 60 minutos aprovada em Docker local, 2.651 requisições e zero erros inesperados ([JSON sanitizado](2026-10-12-load-local.json)). Restauração adicional não executou por incompatibilidade de `pg_dump` 16.4 com servidor 17.11 ([relatório](2026-10-12-restore-local.json)).
- **Capacidade e verificações finais:** perfil autenticado de leitura sustentou 1.268 RPM por cinco minutos (76.080/h por projeção), com 17.732 respostas concluídas em 11 estágios, zero erros e p95 abaixo de 3 s no soak. Os quatro testes unitários novos, lint focado, TypeScript e validação visual do PDF passaram; a limpeza deixou zero usuários/perfis/papéis temporários e `.env` intacto. O alvo de 100 mil/h (1.667 RPM) falhou em latência e taxa ofertada; o soak de 1.325 RPM também falhou. Consulte a [evidência por estágio](2026-10-12-capacity-load.json), o [ensaio exploratório preservado](2026-10-12-capacity-load-exploratory.json), o [relatório completo](2026-10-12-test-battery-report.md) e o PDF gráfico em `output/pdf/geoalerta-capacity-report-2026-10-12.pdf`. Perfil local, somente leituras autenticadas; não representa Vercel/produção nem um SLO comercial.

## Verificações atuais — 06/10/2026

- [Task 34 — apoio médico nas ocorrências](ticket-34-medical-support-2026-10-06.md): formulário, persistência anulável, detalhe/listagem/CSV e regressões locais aprovados; suíte completa de banco 31/31.

- [Adequação preservadora do Supabase](database-adoption-2026-10-01.md), com [verificação remota](remote-core-verification-2026-10-01.json) e [integridade das onze fotos](legacy-private-photos-2026-10-01.json).
- [Ticket 19 — restauração Docker final aprovada](ticket-19-docker-current-2026-10-01.json): 30 migrations, 27 tabelas, hashes/esquema equivalentes, origem intacta; Auth/Storage/infraestrutura exigem recuperação própria.
- [Serviços reais Auth, Storage e Realtime](real-services-2026-10-01.json): oito verificações aprovadas em stack oficial Docker com histórico acima de 100 mil ocorrências sintéticas.
- [Triagem PostGIS versionada e recuperação Realtime](real-spatial-recovery-2026-10-01.json): classificação histórica preservada e recuperação por nova consulta após reconexão.
- [Upload público e leitura privada de fotos reais](real-public-photos-2026-10-01.json): associação à ocorrência aprovada; acesso anônimo e conteúdo inválido recusados.
- [Transições, reclassificação e exclusão/restauração com Auth real](real-mutations-2026-10-01.json): papéis, justificativas, auditoria e preservação de dados/foto aprovados.
- [Mudança de grupo com sessão antiga e isolamento Realtime](real-group-isolation-2026-10-01.json): acesso anterior revogado sem renovar JWT; assinatura inicializa autenticação antes de receber eventos.
- [Alertas visuais e recuperação no navegador com serviços reais](real-browser-alerts-2026-10-01.json): Chromium recebeu o evento e recuperou o alerta criado enquanto estava offline.
- [Recuperação periódica de alertas no navegador](real-alert-reconciliation-2026-10-01.json): entrega normal, reconexão, recuperação em menos de cinco segundos com WebSocket bloqueado e ausência de duplicação visual.
- [Ticket 20 — carga integrada aprovada](ticket-20-2026-10-01.md), com [relatório final](ticket-20-docker-2026-10-01.json): uma hora, dez sessões, 100 ocorrências/100 alertas, zero erros inesperados, CSV de 100.480 linhas e metas de latência atendidas. As três cargas anteriores reprovadas permanecem preservadas.

Os itens abaixo registram o estado histórico das entregas individuais; pendências de infraestrutura ali descritas devem ser lidas junto às evidências atuais acima.

- [Ticket 01 — concluído localmente](ticket-01-2026-09-30.md).
- [Ticket 02 — identidade e autorização](ticket-02-2026-09-30.md).
- [Ticket 03 — abertura pública, GPS e triagem](ticket-03-2026-09-30.md).
- [Ticket 04 — lista, filtros e colunas pessoais](ticket-04-2026-09-30.md).
- [Ticket 06 — foto privada, validação básica aprovada](ticket-06-2026-09-30.md): homologação de Storage real pendente na história 20.
- [Ticket 08 — edição, transições e concorrência, validação básica aprovada](ticket-08-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 09 — reabertura e reclassificação, validação básica aprovada](ticket-09-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 10 — exclusão lógica e restauração, validação básica aprovada](ticket-10-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 11 — exportação CSV, validação básica aprovada](ticket-11-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 12 — mapa e contagens delimitados, validação básica aprovada](ticket-12-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 13 — alertas in-app e reconexão, validação básica aprovada](ticket-13-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 14 — perfil próprio, validação básica aprovada](ticket-14-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 15 — administração de usuários, grupos e acesso, validação básica aprovada](ticket-15-2026-10-01.md): provisionamento Auth e aceite integrado pendentes na história 20.
- [Ticket 16 — transições e rótulos de status, validação básica aprovada](ticket-16-2026-10-01.md): aceite integrado pendente na história 20.
- [Ticket 17 — zonas de risco versionadas, validação básica aprovada](ticket-17-2026-10-01.md): validação PostGIS/browser/API pendente na história 20.
- [Ticket 18 — desativar módulos legados preservando dados, validação básica aprovada](ticket-18-2026-10-01.md): comprovação integrada de bloqueio e preservação pendente na história 20.
- [Ticket 19 — histórico e restauração real aprovada](ticket-19-2026-10-01.md): impedimento inicial substituído pela execução Docker autorizada; estado do card no Notion não alterado.
