# 19: Comprovar restauração em alvo descartável

**What to build:** A equipe dispõe de procedimento testado e evidência de restauração dos dados Core e legados em um segundo alvo isolado.

**Blocked by:** 01: Preparar a base Core preservando o legado.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** RNF-007

**Natureza:** Verificação de recuperação

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f2815e969be14645e8f194?pvs=204)

- [ ] Backup sintético é restaurado em segundo alvo descartável autorizado; a origem permanece intacta e a guarda recusa alvos ausentes ou não permitidos.
- [ ] IDs, contagens, integridade, histórico Core, dados legados e vínculos são conferidos após restauração.
- [ ] O esquema restaurado preserva objetos de aplicação, PostGIS e políticas esperados; dependências e limites de recuperação de Auth e arquivos privados são documentados explicitamente.
- [ ] O procedimento registra duração, resultado, verificações e limitações em relatório sanitizado, sem dados pessoais reais, sessões ou credenciais.
- [ ] Um procedimento escrito sem execução não conta como aprovado; evidência de teste real fica disponível para revisão do usuário.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de guarda/orquestração de backup cobrem origem/alvo permitido, alvo ausente ou inválido e falha de restauração/checagem; verificar que o relatório sanitizado não inclui segredos.
- [ ] Uma simulação só valida a lógica de guarda e relatório; nunca conta como restauração aprovada. Registrar **implementação concluída e validação básica aprovada** em separado.

### Recuperação integrada pendente — responsabilidade específica da história 19

- [ ] Implementar, adaptar e documentar os executores/fixtures de recuperação necessários como trabalho desta história; `test:restore` não é script disponível hoje. Não tratar o nome planejado como comando existente.
- [ ] Em procedimento autorizado posterior, restaurar backup sintético em segundo alvo descartável real, sem tocar a origem; verificar IDs, contagens, integridade, histórico Core/legado, PostGIS/políticas e documentar limites de Auth e arquivos privados.
- [ ] Registrar duração, resultado e limitações em evidência sanitizada. Esta validação real é específica da história 19 e deve continuar rastreável quando consolidada no aceite da história 20; procedimento escrito ou mock não a substitui.
