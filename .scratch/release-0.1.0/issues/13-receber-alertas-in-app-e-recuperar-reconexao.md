# 13: Receber alertas in-app e recuperar reconexão

**What to build:** Uma nova ocorrência confirmada gera alerta visual no painel autorizado, abre o detalhe e é recuperada após interrupção da conexão.

**Blocked by:** 03: Abrir ocorrência pública com GPS e triagem; 05: Consultar detalhe e histórico autorizados; 12: Mostrar mapa e contagens delimitados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-03, RF-007, RNF-001, RNF-006

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Somente o feed mínimo transacional de alertas Core é publicado, com eventId, occurrenceId, groupId, priority, status e at; sem nome, contato, foto, descrição livre ou coordenadas exatas.
- [ ] O alerta aparece após persistência confirmada, respeita grupo e conta ativa e permite abrir o detalhe autorizado.
- [ ] Outro grupo não recebe o evento; suspensão de conta com canal aberto impede novos eventos, e falha de autorização encerra a assinatura.
- [ ] Reconexão busca o estado corrente autorizado para recuperar ocorrências perdidas e evita alertas duplicados.
- [ ] Logout e desmontagem encerram a assinatura; alertas operacionais permanecem exclusivamente in-app.
- [ ] Testes de navegador em sessões distintas e Realtime/RLS reais verificam envio, privacidade, suspensão, reconexão e deduplicação; a meta de até 5 segundos é medida no aceite de capacidade.

