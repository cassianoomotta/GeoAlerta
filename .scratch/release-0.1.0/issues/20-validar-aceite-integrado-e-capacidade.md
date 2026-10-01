# 20: Validar aceite integrado e capacidade da 0.1.0

**What to build:** A equipe recebe evidências de que a release cumpre suas histórias, preserva permissões e suporta o cenário planejado, com limites conhecidos para decidir a publicação.

**Blocked by:** 06: Anexar e consultar foto privada; 07: Registrar ocorrência manualmente no painel; 09: Reabrir e reclassificar com justificativa; 10: Excluir e restaurar ocorrências logicamente; 11: Exportar conjunto filtrado completo em CSV; 13: Receber alertas in-app e recuperar reconexão; 14: Consultar e atualizar o próprio perfil; 15: Administrar usuários, grupos e acesso; 16: Configurar transições e rótulos de status; 17: Administrar zonas de risco versionadas; 18: Desativar módulos legados preservando dados; 19: Comprovar restauração em alvo descartável.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-01, US-02, US-03, US-04, US-05, US-06, US-07, RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013, RF-014, RF-015, RF-016, RF-017, RNF-001, RNF-002, RNF-003, RNF-004, RNF-005, RNF-006, RNF-007

**Natureza:** Verificação integrada da release

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281bfbbecff444bd7e6e0?pvs=204)

- [ ] **Validação básica de fechamento:** tipos, lint dos arquivos alterados e testes unitários passam; build executa neste marco de integração/fechamento, sem ser exigido a cada edição.
- [ ] **Aceite integrado:** matriz de US/RF/RNF liga cada requisito aos resultados reais, sem cenário crítico pulado ou teste instável considerado aprovado.
- [ ] Fluxos críticos passam em Chromium, Firefox, WebKit e viewports móveis pertinentes, com permissões, GPS, Storage, Realtime, concorrência e migrations verificados.
- [ ] A integração confirma suspensão com canal/sessão antiga, pool sem identidade residual, foto autorizada, grupos padrão/reatribuição, configuração de transições e zonas sem perda de histórico.
- [ ] O cenário executa uma hora com ao menos 50 mil ocorrências históricas, 100 novas ocorrências, rajada de 10 envios em um minuto e 10 sessões simultâneas usando lista, mapa e atualizações.
- [ ] São medidos p95 de confirmação sem foto e primeira página da lista até 3 segundos, alerta até 5 segundos, latência de fotos separada, erros, duplicações, conflitos esperados, atraso Realtime e crescimento de Storage.
- [ ] O CSV inclui o conjunto filtrado completo, inclusive cenário de 50 mil registros, sem truncamento e sem alterar os dados.
- [ ] Relatórios sanitizados registram resultados, ambiente, limitações e pendências; métricas/logs evitam dados pessoais desnecessários. Capacidade não é declarada comprovada sem executar a carga completa.
- [ ] Uma revisão integrada confere a cobertura e a preservação do legado; falha ou ambiente indisponível mantém o aceite pendente.
- [ ] A entrega é local e revisável; apenas o usuário executa commit, push, merge, aplicação em ambiente compartilhado e deploy.

### Pendências integradas consolidadas das histórias anteriores

- [ ] **Histórias 06–10:** Storage privado e links temporários; Auth, permissões por papel/grupo e transições; concorrência, auditoria atômica, exclusão/restauração e preservação de fotos/dados — conferir as listas integradas individuais e reportar resultado por ID.
- [ ] **Histórias 11–12:** CSV integral no escopo autorizado e sem truncamento; filtros de mapa/contagens com PostGIS e limites espaciais/temporais — reportar por história e RNF.
- [ ] **História 13:** feed Realtime mínimo, RLS/grupos, suspensão com canal aberto, reconexão e deduplicação reais.
- [ ] **Histórias 14–17:** identidade Auth e perfil, administração de usuários/grupos/grants, configuração de transições, zonas versionadas e geofencing PostGIS com autorização real.
- [ ] **História 18:** operações legadas desativadas e preservação de tabelas, IDs, registros, fotos e arquivos após migrations.
- [ ] **História 19:** preservar e anexar a evidência específica de restauração em alvo descartável descrita naquela história; não substituir por procedimento escrito nem absorver sem rastreabilidade.
- [ ] Confirmar que cada história 06–19 tem **implementação concluída e validação básica aprovada** antes do fechamento e que o campo/registro de **aceite integrado concluído** só é marcado com evidência real. Pendência ou simulação permanece pendente.
- [ ] Executar os cenários integrados aplicáveis de API e interface no projeto Supabase exclusivo de homologação, incluindo migrations, RLS/grants, permissões por perfil/grupo, PostGIS, Auth, Storage privado, Realtime e fluxos entre histórias; mocks não substituem nenhuma dessas provas.
- [ ] A suíte atual usa preparação de banco e serviços simulados em alguns projetos; adaptar fixtures e preparar contas, permissões e buckets para o Supabase real. Alterar somente a URL não torna a suíte integrada.
- [ ] Criar ou adaptar o executor e o comando de carga necessários como trabalho desta história; `test:load` não existe em `package.json` hoje. Não tratar comandos planejados como disponíveis até implementá-los e verificá-los.
