# 19: Comprovar restauração em alvo descartável

**What to build:** A equipe dispõe de procedimento testado e evidência de restauração dos dados Core e legados em um segundo alvo isolado.

**Blocked by:** 01: Preparar a base Core preservando o legado.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** RNF-007

**Natureza:** Verificação de recuperação

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Backup sintético é restaurado em segundo alvo descartável autorizado; a origem permanece intacta e a guarda recusa alvos ausentes ou não permitidos.
- [ ] IDs, contagens, integridade, histórico Core, dados legados e vínculos são conferidos após restauração.
- [ ] O esquema restaurado preserva objetos de aplicação, PostGIS e políticas esperados; dependências e limites de recuperação de Auth e arquivos privados são documentados explicitamente.
- [ ] O procedimento registra duração, resultado, verificações e limitações em relatório sanitizado, sem dados pessoais reais, sessões ou credenciais.
- [ ] Um procedimento escrito sem execução não conta como aprovado; evidência de teste real fica disponível para revisão do usuário.

