# 01: Preparar a base Core preservando o legado

**What to build:** Permitir preparar e testar a release Core em ambiente isolado, reproduzindo o banco existente sem perder código, registros ou arquivos do legado.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** RNF-007

**Natureza:** Pré-refatoração técnica

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Um histórico único Prisma Migrate reproduz a baseline observada e a expansão Core em banco vazio e em cópia sintética compatível do legado, com PostGIS e SQL complementar versionados.
- [ ] Ocorrências, dados privados, eventos, zonas versionadas, grupos, perfis, preferências, transições, idempotência e feed mínimo têm contratos definidos; o domínio permanece independente de Next.js, Prisma e Supabase.
- [ ] Os estados conhecidos Aberto, Em Atendimento, Resolvido e Recusado são mapeados respectivamente para NOVA, EM_ATENDIMENTO, RESOLVIDA e CANCELADA. Estados desconhecidos bloqueiam a imposição de restrições com relatório de saneamento; localização ausente permanece identificada, sem GPS inventado.
- [ ] IDs, contagens, registros e arquivos dos módulos legados são preservados por mudanças aditivas, sem DROP ou reset.
- [ ] Comandos locais de aplicação, Prisma e Playwright carregam exclusivamente sistema/.env; não criam, copiam ou versionam credenciais. Conexões de execução, migration e shadow database são separadas.
- [ ] O runner descobre testes de domínio, API, banco e navegador; fixtures sintéticas e uma guarda impedem escrita fora de alvos de teste explicitamente permitidos.
- [ ] As dependências novas são fixadas após verificar compatibilidade, e os guias locais da versão instalada de Next.js são lidos antes de escrever código do framework.
- [ ] Testes reais de baseline, expansão e preservação passam em alvos isolados; qualquer inventário ou credencial indisponível fica registrado como impedimento, sem alegar execução.

