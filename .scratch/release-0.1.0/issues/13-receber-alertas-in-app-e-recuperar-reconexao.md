# 13: Receber alertas in-app e recuperar reconexão

**What to build:** Uma nova ocorrência confirmada gera alerta visual no painel autorizado, abre o detalhe e é recuperada após interrupção da conexão.

**Blocked by:** 03: Abrir ocorrência pública com GPS e triagem; 05: Consultar detalhe e histórico autorizados; 12: Mostrar mapa e contagens delimitados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-03, RF-007, RNF-001, RNF-006

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f28163a16af648ea8b01a3?pvs=204)

- [ ] Somente o feed mínimo transacional de alertas Core é publicado, com eventId, occurrenceId, groupId, priority, status e at; sem nome, contato, foto, descrição livre ou coordenadas exatas.
- [ ] O alerta aparece após persistência confirmada, respeita grupo e conta ativa e permite abrir o detalhe autorizado.
- [ ] Outro grupo não recebe o evento; suspensão de conta com canal aberto impede novos eventos, e falha de autorização encerra a assinatura.
- [ ] Reconexão busca o estado corrente autorizado para recuperar ocorrências perdidas e evita alertas duplicados.
- [ ] Logout e desmontagem encerram a assinatura; alertas operacionais permanecem exclusivamente in-app.
- [ ] Testes de navegador em sessões distintas e Realtime/RLS reais verificam envio, privacidade, suspensão, reconexão e deduplicação; a meta de até 5 segundos é medida no aceite de capacidade.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de fonte de eventos, consulta e autorização cobrem evento válido sem persistência antecipada, payload inválido/privado, duplicata, desconexão/reconexão e falha/negação; payload não inclui campos vedados.
- [ ] Registrar **implementação concluída e validação básica aprovada**; evento simulado não representa Realtime funcionando.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, verificar publicação Realtime, RLS e papéis/grupos reais, sessão suspensa com canal aberto, reconexão/deduplicação e abertura de detalhe autorizado.
- [ ] Medir o atraso no fluxo integrado conforme RNF-004; simulações não provam Realtime nem segurança.
